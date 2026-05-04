import fs from "node:fs";
import path from "node:path";
import { assertNoExtraArgs, takeFlag } from "../utils/cli";
import { runChecked } from "../utils/exec";

type ManualState = {
  runtimeMode?: "local" | "docker";
  stoppedContainers?: string[];
  processes?: {
    backend?: { pid?: number };
    frontend?: { pid?: number };
  };
};

export async function stopManualTestCommand(args: string[], context: { repoRoot: string }): Promise<void> {
  const restartDockerApps = takeFlag(args, "--restart-docker-apps");
  assertNoExtraArgs(args);

  const stateFile = path.join(context.repoRoot, ".codex", "tasks", "tmp", "manual-test", "session.json");
  if (!fs.existsSync(stateFile)) {
    console.log("No prepared manual-test session state found.");
    return;
  }

  const state = JSON.parse(stripBom(fs.readFileSync(stateFile, "utf8"))) as ManualState;
  for (const processName of ["frontend", "backend"] as const) {
    const pid = state.processes?.[processName]?.pid;
    if (!pid) continue;
    try {
      process.kill(pid, "SIGKILL");
      console.log(`Stopping ${processName} process (${pid}) ...`);
    } catch {
      // already stopped
    }
  }

  if (state.runtimeMode === "docker") {
    console.log("Stopping Docker app containers (wms-core, wms-frontend) ...");
    runChecked("docker", ["stop", "wms-core", "wms-frontend"], {
      cwd: context.repoRoot,
      errorMessage: "Failed to stop Docker app containers.",
    });
  }

  if (restartDockerApps && state.stoppedContainers && state.stoppedContainers.length > 0) {
    const composeFile = path.join(context.repoRoot, "backend", "docker-compose.yml");
    console.log(`Restarting Docker app containers: ${state.stoppedContainers.join(", ")}`);
    runChecked("docker", ["compose", "-f", composeFile, "up", "-d", ...state.stoppedContainers], {
      cwd: path.join(context.repoRoot, "backend"),
      errorMessage: "Failed to restart Docker app containers.",
    });
  }

  fs.rmSync(stateFile, { force: true });
  console.log("Manual test environment stopped.");
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}
