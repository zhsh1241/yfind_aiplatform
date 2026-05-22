import fs from "node:fs";
import path from "node:path";

export function getRepoRoot(): string {
  const fromCwd = findRepoRoot(process.cwd());
  if (fromCwd) {
    return fromCwd;
  }
  return path.resolve(__dirname, "..", "..", "..", "..");
}

export function resolveRepoPath(repoRoot: string, value: string): string {
  if (path.isAbsolute(value)) {
    return path.resolve(value);
  }

  return path.resolve(repoRoot, value);
}

export function ensureExists(targetPath: string, label?: string): void {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Missing ${label ?? "path"}: ${targetPath}`);
  }
}

export function toPosixRelative(repoRoot: string, targetPath: string): string {
  return path.relative(repoRoot, targetPath).split(path.sep).join("/");
}

function findRepoRoot(start: string): string | null {
  let current = path.resolve(start);
  while (true) {
    if (isRepoRoot(current)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function isRepoRoot(candidate: string): boolean {
  return fs.existsSync(path.join(candidate, "ai-scaffold.config.json"))
    && fs.existsSync(path.join(candidate, "tools", "ai-scaffold", "package.json"));
}
