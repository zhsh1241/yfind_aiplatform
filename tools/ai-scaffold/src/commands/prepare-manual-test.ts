import fs from "node:fs";
import path from "node:path";
import { assertNoExtraArgs, takeFlag, takeOption } from "../utils/cli";
import { ensureDir, writeText } from "../utils/fs";
import { runCapture, runChecked, startDetachedProcess } from "../utils/exec";
import { ensureFrontendDependencies } from "../utils/frontend-deps";
import { sleep } from "../utils/time";

type AppMode = "auto" | "local" | "docker";
type FrontendMode = "preview" | "dev";

export async function prepareManualTestCommand(args: string[], context: { repoRoot: string }): Promise<void> {
  const appMode = (takeOption(args, "--app-mode") ?? "auto") as AppMode;
  const frontendMode = (takeOption(args, "--frontend-mode") ?? "preview") as FrontendMode;
  const skipPlaywrightInstall = takeFlag(args, "--skip-playwright-install");
  const skipSmokeCheck = takeFlag(args, "--skip-smoke-check");
  assertNoExtraArgs(args);

  if (!["auto", "local", "docker"].includes(appMode)) {
    throw new Error(`Invalid --app-mode: ${appMode}`);
  }
  if (!["preview", "dev"].includes(frontendMode)) {
    throw new Error(`Invalid --frontend-mode: ${frontendMode}`);
  }

  const repoRoot = context.repoRoot;
  const composeFile = path.join(repoRoot, "backend", "docker-compose.yml");
  const backendDir = path.join(repoRoot, "backend", "wms-parent");
  const frontendDir = path.join(repoRoot, "frontend", "wms-core");
  const stateDir = path.join(repoRoot, ".codex", "tasks", "tmp", "manual-test");
  const logsDir = path.join(stateDir, "logs");
  const stateFile = path.join(stateDir, "session.json");
  const backendPort = 8080;
  const frontendPort = frontendMode === "preview" ? 4173 : 5173;
  const backendBaseUrl = `http://127.0.0.1:${backendPort}`;
  const frontendBaseUrl = `http://127.0.0.1:${frontendPort}`;
  const backendHealthUrl = `${backendBaseUrl}/actuator/health`;
  const loginUrl = `${backendBaseUrl}/api/v1/auth/login`;
  const backendLog = path.join(logsDir, "backend.log");
  const backendErr = path.join(logsDir, "backend.err.log");
  const frontendLog = path.join(logsDir, "frontend.log");
  const frontendErr = path.join(logsDir, "frontend.err.log");
  const menuLocalizationSql = path.join(
    repoRoot,
    "backend",
    "wms-parent",
    "wms-core",
    "src",
    "main",
    "resources",
    "db",
    "migration",
    "V1.0.27__localize_permission_names_to_chinese.sql",
  );

  ensureDir(stateDir);
  ensureDir(logsDir);
  stopStalePreparedProcesses(stateFile);
  ensureInfra(composeFile, repoRoot);
  applyDatabasePatch(menuLocalizationSql);

  ensureFrontendDependencies(frontendDir, { label: "frontend/wms-core" });

  if (!skipPlaywrightInstall) {
    console.log("Ensuring Playwright browsers are installed ...");
    runChecked("npm", ["run", "e2e:install"], {
      cwd: frontendDir,
      errorMessage: "Playwright browser install failed.",
    });
  }

  const javaHomeCandidate = getPreferredJavaHome();
  let runtimeState:
    | {
        runtimeMode: "local" | "docker";
        frontendMode: FrontendMode | "preview";
        stoppedContainers: string[];
        dockerContainers?: string[];
        processes?: {
          backend: { pid: number; stdout: string; stderr: string };
          frontend: { pid: number; stdout: string; stderr: string };
        };
      };

  if (appMode === "local") {
    runtimeState = await startLocalApps({
      composeFile,
      backendDir,
      frontendDir,
      frontendMode,
      backendLog,
      backendErr,
      frontendLog,
      frontendErr,
      backendHealthUrl,
      frontendBaseUrl,
    });
  } else if (appMode === "docker") {
    runtimeState = await startDockerApps(composeFile, backendHealthUrl);
  } else if (javaHomeCandidate) {
    try {
      runtimeState = await startLocalApps({
        composeFile,
        backendDir,
        frontendDir,
        frontendMode,
        backendLog,
        backendErr,
        frontendLog,
        frontendErr,
        backendHealthUrl,
        frontendBaseUrl,
      });
    } catch (error) {
      console.warn(`Local app startup failed, falling back to Docker app mode. Reason: ${error instanceof Error ? error.message : String(error)}`);
      stopStalePreparedProcesses(stateFile);
      runtimeState = await startDockerApps(composeFile, backendHealthUrl);
    }
  } else {
    runtimeState = await startDockerApps(composeFile, backendHealthUrl);
  }

  if (!skipSmokeCheck) {
    console.log("Running smoke checks (backend health + admin login + frontend root) ...");
    await invokeLoginSmokeCheck(loginUrl);
    await waitHttpReady(frontendBaseUrl, 15);
  }

  const state = {
    preparedAt: new Date().toISOString(),
    runtimeMode: runtimeState.runtimeMode,
    frontendMode: runtimeState.frontendMode,
    urls: {
      frontend: frontendBaseUrl,
      backend: backendBaseUrl,
      health: backendHealthUrl,
      login: loginUrl,
    },
    credentials: {
      username: "admin",
      password: "Admin@123",
      tenantCode: "default",
    },
    ...(runtimeState.processes ? { processes: runtimeState.processes } : {}),
    ...(runtimeState.stoppedContainers ? { stoppedContainers: runtimeState.stoppedContainers } : {}),
    ...(runtimeState.dockerContainers ? { dockerContainers: runtimeState.dockerContainers } : {}),
  };

  writeText(stateFile, `${JSON.stringify(state, null, 2)}\n`);

  console.log("");
  console.log("Manual test environment is ready.");
  console.log(`Mode     : ${state.runtimeMode}`);
  console.log(`Frontend : ${frontendBaseUrl}`);
  console.log(`Backend  : ${backendBaseUrl}`);
  console.log(`Health   : ${backendHealthUrl}`);
  console.log("Login    : admin / Admin@123 / tenantCode=default");
  console.log(`State    : ${stateFile}`);
  console.log(`Logs     : ${logsDir}`);
  console.log("");
  console.log("When finished, run:");
  console.log("node tools/ai-scaffold/dist/cli.js stop-manual-test");
}

function ensureCommand(name: string): void {
  const result = runCapture(process.platform === "win32" ? "where" : "which", [name], { cwd: process.cwd() });
  if (result.status !== 0) {
    throw new Error(`Missing required command: ${name}`);
  }
}

function testContainerRunning(name: string): boolean {
  const result = runCapture("docker", ["ps", "--format", "{{.Names}}"], { cwd: process.cwd() });
  return result.status === 0 && result.stdout.split(/\r?\n/u).includes(name);
}

async function waitContainerHealthy(containerName: string, timeoutSeconds = 180): Promise<void> {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    const result = runCapture(
      "docker",
      ["inspect", "--format", "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}", containerName],
      { cwd: process.cwd() },
    );
    if (result.status === 0) {
      const status = result.stdout.trim();
      if (status === "healthy" || status === "running") {
        return;
      }
    }
    await sleep(2000);
  }
  throw new Error(`Container did not become ready in time: ${containerName}`);
}

function ensureInfra(composeFile: string, repoRoot: string): void {
  console.log("Ensuring Docker infrastructure services are running (postgres, redis) ...");
  runChecked("docker", ["compose", "-f", composeFile, "up", "-d", "postgres", "redis"], {
    cwd: path.join(repoRoot, "backend"),
    errorMessage: "Failed to start postgres/redis via docker compose.",
  });
}

function applyDatabasePatch(sqlFile: string): void {
  if (!fs.existsSync(sqlFile)) {
    throw new Error(`Missing SQL patch file: ${sqlFile}`);
  }
  console.log(`Applying database patch: ${path.basename(sqlFile)}`);
  const containerPath = `/tmp/${path.basename(sqlFile)}`;
  runChecked("docker", ["cp", sqlFile, `wms-postgres:${containerPath}`], {
    cwd: process.cwd(),
    errorMessage: `Failed to copy database patch into container: ${sqlFile}`,
  });
  runChecked("docker", ["exec", "wms-postgres", "psql", "-U", "wms", "-d", "wms", "-f", containerPath], {
    cwd: process.cwd(),
    errorMessage: `Failed to apply database patch: ${sqlFile}`,
  });
}

function stopAppContainers(): string[] {
  const stopped: string[] = [];
  for (const name of ["wms-core", "wms-frontend"]) {
    if (testContainerRunning(name)) {
      console.log(`Stopping Docker app container to free local ports: ${name}`);
      runChecked("docker", ["stop", name], {
        cwd: process.cwd(),
        errorMessage: `Failed to stop container: ${name}`,
      });
      stopped.push(name);
    }
  }
  return stopped;
}

function stopStalePreparedProcesses(stateFile: string): void {
  if (!fs.existsSync(stateFile)) return;
  let state: {
    processes?: { backend?: { pid?: number }; frontend?: { pid?: number } };
  };
  try {
    state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  } catch {
    return;
  }
  for (const processName of ["backend", "frontend"] as const) {
    const pid = state.processes?.[processName]?.pid;
    if (!pid) continue;
    try {
      process.kill(pid, "SIGKILL");
      console.log(`Stopping stale prepared process: ${processName} (${pid})`);
    } catch {
      // ignore
    }
  }
}

async function waitHttpReady(url: string, timeoutSeconds = 240): Promise<void> {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch {
      // ignore
    }
    await sleep(2000);
  }
  throw new Error(`HTTP endpoint did not become ready in time: ${url}`);
}

async function invokeLoginSmokeCheck(loginUrl: string): Promise<void> {
  const response = await fetch(loginUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "admin",
      password: "Admin@123",
      tenantCode: "default",
    }),
  });
  const payload = (await response.json()) as { code?: string | number; success?: boolean };
  const codeValue = payload.code !== undefined ? String(payload.code) : "";
  if (!payload || (!payload.success && !["0", "200"].includes(codeValue))) {
    throw new Error("Login smoke check failed.");
  }
}

function getJavaMajorVersion(javaExe: string): number {
  if (!fs.existsSync(javaExe)) return 0;
  const result = runCapture(javaExe, ["-version"], { cwd: process.cwd() });
  if (result.status !== 0) return 0;
  const line = result.stderr.split(/\r?\n/u)[0] || result.stdout.split(/\r?\n/u)[0] || "";
  const match = /"(?<version>\d+(?:\.\d+)*)/u.exec(line);
  if (!match?.groups?.version) return 0;
  const raw = match.groups.version;
  if (raw.startsWith("1.")) {
    return Number.parseInt(raw.split(".")[1]!, 10);
  }
  return Number.parseInt(raw.split(".")[0]!, 10);
}

function getPreferredJavaHome(): string | null {
  const candidates = new Set<string>();
  if (process.env.JAVA_HOME) candidates.add(process.env.JAVA_HOME);
  const patterns = ["C:\\java", "C:\\Program Files\\Java", "C:\\Program Files\\Eclipse Adoptium"];
  for (const base of patterns) {
    if (!fs.existsSync(base)) continue;
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.toLowerCase().startsWith("jdk")) {
        candidates.add(path.join(base, entry.name));
      }
    }
  }
  const userJdks = path.join(process.env.USERPROFILE ?? "", ".jdks");
  if (fs.existsSync(userJdks)) {
    for (const entry of fs.readdirSync(userJdks, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        candidates.add(path.join(userJdks, entry.name));
      }
    }
  }
  const infos = [...candidates]
    .map((candidate) => {
      const javaExe = path.join(candidate, "bin", "java.exe");
      const javacExe = path.join(candidate, "bin", "javac.exe");
      if (!fs.existsSync(javaExe) || !fs.existsSync(javacExe)) return undefined;
      const major = getJavaMajorVersion(javaExe);
      return major >= 17 ? { candidate, major } : undefined;
    })
    .filter((value): value is { candidate: string; major: number } => Boolean(value))
    .sort((left, right) => right.major - left.major);
  return infos[0]?.candidate ?? null;
}

async function startLocalApps(input: {
  composeFile: string;
  backendDir: string;
  frontendDir: string;
  frontendMode: FrontendMode;
  backendLog: string;
  backendErr: string;
  frontendLog: string;
  frontendErr: string;
  backendHealthUrl: string;
  frontendBaseUrl: string;
}): Promise<{
  runtimeMode: "local";
  frontendMode: FrontendMode;
  stoppedContainers: string[];
  processes: {
    backend: { pid: number; stdout: string; stderr: string };
    frontend: { pid: number; stdout: string; stderr: string };
  };
}> {
  const javaHome = getPreferredJavaHome();
  if (!javaHome) {
    throw new Error("No JDK 17+ installation was found for local Spring Boot startup.");
  }

  const stoppedContainers = stopAppContainers();
  if (input.frontendMode === "preview") {
    console.log("Building frontend preview assets ...");
    runChecked("npm", ["run", "build"], {
      cwd: input.frontendDir,
      errorMessage: "Frontend build failed.",
    });
  }

  const envBase = {
    ...process.env,
    JAVA_HOME: javaHome,
    Path: [path.join(javaHome, "bin"), ...(process.env.Path ?? process.env.PATH ?? "").split(";").filter(Boolean)].join(";"),
    DB_HOST: "localhost",
    DB_PORT: "5432",
    DB_NAME: "wms",
    DB_USER: "wms",
    DB_PASSWORD: "wms123",
    REDIS_HOST: "localhost",
    REDIS_PORT: "6379",
  };

  console.log("Starting local backend ...");
  const backendPid = startDetachedProcess(
    "mvn",
    ["-f", "wms-core/pom.xml", "spring-boot:run"],
    {
      cwd: input.backendDir,
      env: envBase,
      stdoutPath: input.backendLog,
      stderrPath: input.backendErr,
    },
  );
  await waitHttpReady(input.backendHealthUrl);

  console.log(`Starting local frontend (${input.frontendMode}) ...`);
  const frontendArgs =
    input.frontendMode === "preview"
      ? ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4173"]
      : ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"];
  const frontendPid = startDetachedProcess("npm", frontendArgs, {
    cwd: input.frontendDir,
    env: {
      ...process.env,
      VITE_API_PROXY_TARGET: "http://127.0.0.1:8080",
      VITE_WS_PROXY_TARGET: "ws://127.0.0.1:8080",
    },
    stdoutPath: input.frontendLog,
    stderrPath: input.frontendErr,
  });
  await waitHttpReady(input.frontendBaseUrl);

  return {
    runtimeMode: "local",
    frontendMode: input.frontendMode,
    stoppedContainers,
    processes: {
      backend: { pid: backendPid, stdout: input.backendLog, stderr: input.backendErr },
      frontend: { pid: frontendPid, stdout: input.frontendLog, stderr: input.frontendErr },
    },
  };
}

async function startDockerApps(composeFile: string, backendHealthUrl: string): Promise<{
  runtimeMode: "docker";
  frontendMode: "preview";
  stoppedContainers: string[];
  dockerContainers: string[];
}> {
  const coreRunning = testContainerRunning("wms-core");
  const frontendRunning = testContainerRunning("wms-frontend");
  if (coreRunning && frontendRunning) {
    console.log("Docker app containers are already running; reusing them for manual testing.");
  } else {
    console.log("Starting Docker app containers from current workspace ...");
    runChecked("docker", ["compose", "-f", composeFile, "up", "-d", "--build", "wms-core", "frontend"], {
      cwd: path.dirname(composeFile),
      errorMessage: "Failed to build/start Docker app containers.",
    });
  }
  await waitContainerHealthy("wms-core");
  await waitContainerHealthy("wms-frontend");
  await waitHttpReady(backendHealthUrl);
  await waitHttpReady("http://127.0.0.1:4173");
  return {
    runtimeMode: "docker",
    frontendMode: "preview",
    stoppedContainers: [],
    dockerContainers: ["wms-core", "wms-frontend"],
  };
}
