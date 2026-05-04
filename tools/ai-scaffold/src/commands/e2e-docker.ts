import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { assertNoExtraArgs, requireOption, takeFlag, takeOption } from "../utils/cli";
import { copyDir, ensureDir } from "../utils/fs";
import { runCapture, runChecked } from "../utils/exec";
import { resolveRepoPath } from "../utils/paths";

type DockerAction = "Run" | "Start" | "Stop" | "Reset" | "Status";

export async function e2eDockerCommand(args: string[], context: { repoRoot: string }): Promise<void> {
  const action = (takeOption(args, "--action") ?? "Run") as DockerAction;
  const featureDirValue = takeOption(args, "--feature-dir");
  const spec = takeOption(args, "--spec");
  const project = takeOption(args, "--project") ?? "chromium";
  const workers = Number.parseInt(takeOption(args, "--workers") ?? "1", 10);
  const baseUrl = takeOption(args, "--base-url") ?? "http://127.0.0.1:4273";
  const username = takeOption(args, "--username") ?? "admin";
  const password = takeOption(args, "--password") ?? "Admin@123";
  const tenantCode = takeOption(args, "--tenant-code") ?? "default";
  const skipReset = takeFlag(args, "--skip-reset");
  const downAfterRun = takeFlag(args, "--down-after-run");
  assertNoExtraArgs(args);

  if (!["Run", "Start", "Stop", "Reset", "Status"].includes(action)) {
    throw new Error(`Invalid --action: ${action}`);
  }

  const backendDir = path.join(context.repoRoot, "backend");
  const frontendDir = path.join(context.repoRoot, "frontend", "wms-core");
  const composeFile = "docker-compose.yml";
  const composeOverride = path.join(backendDir, "docker-compose.e2e.override.yml");
  const dockerServices = ["postgres", "redis", "wms-core", "frontend"];
  const postgresContainer = "wms-postgres";
  const sqlFiles = [
    path.join(context.repoRoot, "scripts", "codex", "e2e", "fixtures", "all-migrations.sql"),
    path.join(
      context.repoRoot,
      "backend",
      "wms-parent",
      "wms-core",
      "src",
      "main",
      "resources",
      "db",
      "migration",
      "V1.0.55__add_barcode_rule_engine_and_print_job_center.sql",
    ),
    path.join(context.repoRoot, "scripts", "codex", "e2e-post-bootstrap.sql"),
  ];

  const resolvedFeatureDir = featureDirValue ? resolveRepoPath(context.repoRoot, featureDirValue) : undefined;

  switch (action) {
    case "Start":
      startEnvironment({ backendDir, composeFile, composeOverride, dockerServices, postgresContainer, sqlFiles });
      showStatus(postgresContainer);
      return;
    case "Stop":
      dockerCompose({ backendDir, composeFile, composeOverride, args: ["down"] });
      return;
    case "Reset":
      dockerCompose({ backendDir, composeFile, composeOverride, args: ["down", "-v"] });
      startEnvironment({ backendDir, composeFile, composeOverride, dockerServices, postgresContainer, sqlFiles });
      showStatus(postgresContainer);
      return;
    case "Status":
      showStatus(postgresContainer);
      return;
    case "Run":
      if (skipReset) {
        startEnvironment({ backendDir, composeFile, composeOverride, dockerServices, postgresContainer, sqlFiles });
      } else {
        dockerCompose({ backendDir, composeFile, composeOverride, args: ["down", "-v"] });
        startEnvironment({ backendDir, composeFile, composeOverride, dockerServices, postgresContainer, sqlFiles });
      }

      try {
        runPlaywright({
          frontendDir,
          spec,
          project,
          workers,
          baseUrl,
          username,
          password,
          tenantCode,
        });
        publishReport(frontendDir, resolvedFeatureDir);
      } finally {
        if (downAfterRun) {
          dockerCompose({ backendDir, composeFile, composeOverride, args: ["down"] });
        }
      }
      return;
    default:
      throw new Error(`Unsupported action: ${action satisfies never}`);
  }
}

function dockerCompose(input: { backendDir: string; composeFile: string; composeOverride: string; args: string[] }): void {
  const env = {
    ...process.env,
    DOCKER_BUILDKIT: "0",
    COMPOSE_DOCKER_CLI_BUILD: "0",
  };
  const dockerArgs = ["compose", "-f", input.composeFile];
  if (pathExists(input.composeOverride)) {
    dockerArgs.push("-f", input.composeOverride);
  }
  dockerArgs.push(...input.args);
  runChecked("docker", dockerArgs, {
    cwd: input.backendDir,
    env,
    errorMessage: `docker compose failed: ${input.args.join(" ")}`,
  });
}

function waitServiceReady(url: string, timeoutSeconds = 120): void {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    const result = runCapture(
      process.execPath,
      [
        "-e",
        "fetch(process.argv[1]).then(r=>r.json()).then(j=>{if(j.status==='UP'){process.exit(0)}process.exit(1)}).catch(()=>process.exit(1))",
        url,
      ],
      { cwd: process.cwd() },
    );
    if (result.status === 0) {
      return;
    }

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000);
  }

  throw new Error(`Timed out waiting for service health at ${url}`);
}

function ensureTestDatabase(postgresContainer: string): void {
  const check = runCapture("docker", ["exec", postgresContainer, "psql", "-U", "wms", "-d", "postgres", "-tAc", "SELECT 1 FROM pg_database WHERE datname='wms_test';"], {
    cwd: process.cwd(),
  });
  if (check.status !== 0) {
    throw new Error("Failed to query postgres for wms_test");
  }
  if (check.stdout.trim() !== "1") {
    runChecked("docker", ["exec", postgresContainer, "psql", "-U", "wms", "-d", "postgres", "-c", "CREATE DATABASE wms_test;"], {
      cwd: process.cwd(),
      errorMessage: "Failed to create wms_test database",
    });
  }
}

function applyPostBootstrapSql(postgresContainer: string, sqlFiles: string[]): void {
  for (const sqlPath of sqlFiles) {
    if (!pathExists(sqlPath)) {
      continue;
    }
    console.log(`Applying post-bootstrap E2E SQL -> ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, "utf8");
    const result = spawnSync("docker", ["exec", "-i", postgresContainer, "psql", "-U", "wms", "-d", "wms"], {
      cwd: process.cwd(),
      input: sql,
      stdio: ["pipe", "inherit", "inherit"],
      encoding: "utf8",
    });
    if (result.status !== 0) {
      throw new Error(`Failed to apply post-bootstrap SQL: ${sqlPath}`);
    }
  }
}

function startEnvironment(input: {
  backendDir: string;
  composeFile: string;
  composeOverride: string;
  dockerServices: string[];
  postgresContainer: string;
  sqlFiles: string[];
}): void {
  dockerCompose({
    backendDir: input.backendDir,
    composeFile: input.composeFile,
    composeOverride: input.composeOverride,
    args: ["up", "-d", "--build", ...input.dockerServices],
  });
  waitServiceReady("http://127.0.0.1:8080/actuator/health");
  ensureTestDatabase(input.postgresContainer);
  applyPostBootstrapSql(input.postgresContainer, input.sqlFiles);
}

function showStatus(postgresContainer: string): void {
  runChecked("docker", ["ps", "--format", "table {{.Names}}\t{{.Status}}\t{{.Ports}}"], {
    cwd: process.cwd(),
    errorMessage: "docker ps failed",
  });

  const health = runCapture(
    process.execPath,
    [
      "-e",
      "fetch('http://127.0.0.1:8080/actuator/health').then(r=>r.json()).then(j=>console.log(j.status)).catch(()=>process.exit(1))",
    ],
    { cwd: process.cwd() },
  );
  if (health.status === 0) {
    console.log("");
    console.log(`Backend health: ${health.stdout.trim()}`);
  } else {
    console.warn("Backend health endpoint is not ready.");
  }
}

function runPlaywright(input: {
  frontendDir: string;
  spec?: string;
  project?: string;
  workers: number;
  baseUrl: string;
  username: string;
  password: string;
  tenantCode: string;
}): void {
  if (input.username !== "admin") {
    throw new Error(`E2E must run with the admin account. Received Username='${input.username}'.`);
  }
  const env = {
    ...process.env,
    E2E_BASE_URL: input.baseUrl,
    E2E_USERNAME: input.username,
    E2E_PASSWORD: input.password,
    E2E_TENANT_CODE: input.tenantCode,
    E2E_WORKERS: String(input.workers),
  };
  const args = ["node_modules/@playwright/test/cli.js", "test"];
  if (input.spec) {
    args.push(input.spec);
  }
  if (input.project) {
    args.push(`--project=${input.project}`);
  }
  runChecked(process.execPath, args, {
    cwd: input.frontendDir,
    env,
    errorMessage: "Playwright failed",
  });
}

function publishReport(frontendDir: string, featureDir?: string): void {
  if (!featureDir) {
    return;
  }

  const sourceDir = path.join(frontendDir, "playwright-report");
  if (!pathExists(sourceDir)) {
    console.warn(`Playwright report directory not found: ${sourceDir}`);
    return;
  }

  const destinationRoot = path.join(featureDir, "reports", "e2e");
  ensureDir(destinationRoot);
  const timestamp = new Date().toISOString().replace(/[:T]/gu, "-").slice(0, 15);
  const destinationDir = path.join(destinationRoot, `${timestamp}-playwright-report`);
  copyDir(sourceDir, destinationDir);
  console.log(`Archived Playwright report -> ${destinationDir}`);
}

function pathExists(targetPath: string): boolean {
  return fs.existsSync(targetPath);
}
