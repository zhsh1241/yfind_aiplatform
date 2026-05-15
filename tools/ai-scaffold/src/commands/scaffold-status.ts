import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { assertNoExtraArgs } from "../utils/cli";
import { loadScaffoldConfig, normalizeRoot, resolveConfigPath, type ScaffoldConfig } from "../config/scaffold-config";

type PathStatus = {
  label: string;
  path: string;
  exists: boolean;
  trackedFiles: number;
  note?: string;
};

export async function scaffoldStatusCommand(args: string[], context: { repoRoot: string }): Promise<void> {
  assertNoExtraArgs(args);

  const config = loadScaffoldConfig(context.repoRoot);
  const statuses = buildStatuses(context.repoRoot, config);

  console.log("=== AI Scaffold Status ===");
  console.log(`Project: ${config.projectName}`);
  console.log("");
  console.log("Delivery roots:");
  for (const status of statuses.delivery) {
    printStatus(status);
  }
  console.log("");
  console.log("Runtime code roots:");
  for (const status of statuses.runtime) {
    printStatus(status);
  }
  console.log("");
  console.log("Reference roots:");
  for (const status of statuses.reference) {
    printStatus(status);
  }
  console.log("");
  console.log("Scaffold roots:");
  for (const status of statuses.scaffold) {
    printStatus(status);
  }
  if (config.technologyStack) {
    console.log("");
    console.log("Technology stack:");
    printTechnologyStack(config.technologyStack);
  }
}

function buildStatuses(repoRoot: string, config: ScaffoldConfig): {
  delivery: PathStatus[];
  runtime: PathStatus[];
  reference: PathStatus[];
  scaffold: PathStatus[];
} {
  return {
    delivery: [
      pathStatus(repoRoot, config.featureRoot, "featureRoot"),
      pathStatus(repoRoot, config.bugfixRoot, "bugfixRoot"),
    ],
    runtime: [
      pathStatus(repoRoot, config.backend.path, "backend", config.backend.enabled === false ? "disabled" : undefined),
      ...config.frontends.map((frontend) =>
        pathStatus(repoRoot, frontend.path, `frontend:${frontend.name}`, frontend.enabled === false ? "disabled" : undefined),
      ),
      ...config.services.map((service) =>
        pathStatus(repoRoot, service.path, `service:${service.name}`, service.enabled === false ? "disabled" : undefined),
      ),
    ],
    reference: config.referenceRoots.map((root) => pathStatus(repoRoot, root, "reference")),
    scaffold: config.scaffoldRoots.map((root) => pathStatus(repoRoot, root, "scaffold")),
  };
}

function pathStatus(repoRoot: string, relativePath: string, label: string, note?: string): PathStatus {
  const absolutePath = resolveConfigPath(repoRoot, relativePath);
  return {
    label,
    path: relativePath,
    exists: pathExists(repoRoot, relativePath, absolutePath),
    trackedFiles: countTrackedFiles(repoRoot, relativePath),
    note,
  };
}

function pathExists(repoRoot: string, relativePath: string, absolutePath: string): boolean {
  if (fs.existsSync(absolutePath)) {
    return true;
  }
  if (!relativePath.endsWith("-")) {
    return false;
  }
  const parent = path.dirname(absolutePath);
  const prefix = path.basename(relativePath);
  if (!fs.existsSync(parent)) {
    return false;
  }
  return fs.readdirSync(parent).some((entry) => entry.startsWith(prefix));
}

function countTrackedFiles(repoRoot: string, relativePath: string): number {
  const normalizedPath = normalizeRoot(relativePath).replace(/\/$/u, "");
  const globPath = normalizedPath.endsWith("-") ? `${normalizedPath}*` : normalizedPath;
  const gitArgs = ["ls-files", "--", globPath];
  const result = spawnSync("git", gitArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    return 0;
  }
  return result.stdout.split(/\r?\n/u).filter(Boolean).length;
}

function printStatus(status: PathStatus): void {
  const marker = status.exists ? "OK" : "MISSING";
  const suffix = status.note ? ` (${status.note})` : "";
  console.log(`- ${status.label}: ${status.path} -> ${marker}, tracked=${status.trackedFiles}${suffix}`);
}

function printTechnologyStack(stack: unknown): void {
  if (!isRecord(stack)) {
    console.log(`- ${String(stack)}`);
    return;
  }

  for (const [key, value] of Object.entries(stack)) {
    if (isRecord(value)) {
      const summary = Object.entries(value)
        .map(([childKey, childValue]) => `${childKey}=${formatStackValue(childValue)}`)
        .join(", ");
      console.log(`- ${key}: ${summary}`);
    } else {
      console.log(`- ${key}: ${formatStackValue(value)}`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatStackValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(formatStackValue).join(", ");
  }
  if (isRecord(value)) {
    return JSON.stringify(value);
  }
  return String(value);
}
