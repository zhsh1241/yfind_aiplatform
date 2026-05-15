import fs from "node:fs";
import path from "node:path";

export type CommandSpec = {
  command: string;
  args?: string[];
};

export type FrontendConfig = {
  name: string;
  path: string;
  changeRoot?: string;
  enabled?: boolean;
  commands?: {
    lint?: CommandSpec;
    test?: CommandSpec;
    build?: CommandSpec;
    e2e?: CommandSpec;
  };
};

export type BackendConfig = {
  path: string;
  changeRoot?: string;
  modulePathPrefix?: string;
  enabled?: boolean;
  commands?: {
    compile?: CommandSpec;
    test?: CommandSpec;
    verify?: CommandSpec;
    verifyWithoutIntegration?: CommandSpec;
  };
};

export type ServiceConfig = {
  name: string;
  path: string;
  changeRoot?: string;
  enabled?: boolean;
  commands?: {
    lint?: CommandSpec;
    compile?: CommandSpec;
    test?: CommandSpec;
    verify?: CommandSpec;
  };
};

export type TechnologyStackConfig = Record<string, unknown>;

export type ScaffoldConfig = {
  projectName: string;
  featureRoot: string;
  bugfixRoot: string;
  codeLikeRoots: string[];
  scaffoldRoots: string[];
  referenceRoots: string[];
  technologyStack?: TechnologyStackConfig;
  backend: BackendConfig;
  frontends: FrontendConfig[];
  services: ServiceConfig[];
  database: {
    testName: string;
    user: string;
    password: string;
    dockerContainer?: string;
  };
  e2e: {
    username: string;
    password?: string;
    tenantCode?: string;
  };
};

const DEFAULT_CONFIG: ScaffoldConfig = {
  projectName: "AI Scaffold",
  featureRoot: "docs/features",
  bugfixRoot: "docs/bugfix",
  codeLikeRoots: ["backend/", "frontend/", "docs/db/"],
  scaffoldRoots: ["tools/ai-scaffold/", "scripts/check-", "docs/features/", ".github/workflows/ci.yml"],
  referenceRoots: ["docs/business/", "docs/prototype/"],
  technologyStack: undefined,
  backend: {
    path: "backend",
    changeRoot: "backend/",
    modulePathPrefix: "backend/",
    commands: {
      compile: { command: "mvn", args: ["compile", "-q"] },
      test: { command: "mvn", args: ["test", "-q"] },
      verify: { command: "mvn", args: ["verify"] },
      verifyWithoutIntegration: { command: "mvn", args: ["verify", "-Dtest=!*IntegrationTest*"] },
    },
  },
  frontends: [
    {
      name: "frontend",
      path: "frontend",
      changeRoot: "frontend/",
      commands: {
        lint: { command: "npm", args: ["run", "lint"] },
        test: { command: "npm", args: ["run", "test:ci"] },
        build: { command: "npm", args: ["run", "build"] },
        e2e: { command: "npm", args: ["run", "e2e"] },
      },
    },
  ],
  services: [],
  database: {
    testName: "app_test",
    user: "app",
    password: "app",
    dockerContainer: "postgres",
  },
  e2e: {
    username: "admin",
    password: "Admin@123",
  },
};

export function loadScaffoldConfig(repoRoot: string): ScaffoldConfig {
  const configPath = findConfigPath(repoRoot);
  if (!configPath) {
    return DEFAULT_CONFIG;
  }

  const raw = JSON.parse(fs.readFileSync(configPath, "utf8")) as Partial<ScaffoldConfig>;
  return mergeConfig(DEFAULT_CONFIG, raw);
}

export function resolveConfigPath(repoRoot: string, relativePath: string): string {
  return path.resolve(repoRoot, relativePath);
}

export function normalizeRoot(value: string): string {
  const normalized = value.split(path.sep).join("/");
  return normalized.endsWith("/") || normalized.includes(".") ? normalized : `${normalized}/`;
}

export function commandOrDefault(candidate: CommandSpec | undefined, fallback: CommandSpec): CommandSpec {
  return candidate ?? fallback;
}

export function expandCommandArgs(args: string[] = [], replacements: Record<string, string>): string[] {
  return args.map((arg) => Object.entries(replacements).reduce((next, [key, value]) => next.split(`{${key}}`).join(value), arg));
}

export function resolveCommand(command: string): string {
  return command === "node" ? process.execPath : command;
}

function findConfigPath(repoRoot: string): string | undefined {
  const candidates = [
    process.env.AI_SCAFFOLD_CONFIG ? path.resolve(repoRoot, process.env.AI_SCAFFOLD_CONFIG) : undefined,
    path.join(repoRoot, "ai-scaffold.config.json"),
    path.join(repoRoot, "tools", "ai-scaffold", "scaffold.config.json"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function mergeConfig(base: ScaffoldConfig, override: Partial<ScaffoldConfig>): ScaffoldConfig {
  return {
    ...base,
    ...override,
    codeLikeRoots: override.codeLikeRoots ?? base.codeLikeRoots,
    scaffoldRoots: override.scaffoldRoots ?? base.scaffoldRoots,
    referenceRoots: override.referenceRoots ?? base.referenceRoots,
    technologyStack: override.technologyStack ?? base.technologyStack,
    backend: {
      ...base.backend,
      ...override.backend,
      commands: {
        ...base.backend.commands,
        ...override.backend?.commands,
      },
    },
    frontends: override.frontends ?? base.frontends,
    services: override.services ?? base.services,
    database: {
      ...base.database,
      ...override.database,
    },
    e2e: {
      ...base.e2e,
      ...override.e2e,
    },
  };
}
