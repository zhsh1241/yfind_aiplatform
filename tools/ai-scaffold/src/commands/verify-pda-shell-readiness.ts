import path from "node:path";
import { assertNoExtraArgs } from "../utils/cli";
import { ensureDir, writeLines } from "../utils/fs";
import { runChecked } from "../utils/exec";
import { pdaShellHandoffCommand } from "./pda-shell-handoff";

export async function verifyPdaShellReadinessCommand(args: string[], context: { repoRoot: string }): Promise<void> {
  assertNoExtraArgs(args);

  const frontendDir = path.join(context.repoRoot, "frontend", "wms-pda");
  const reportDir = path.join(context.repoRoot, "docs", "features", "F023-pda-receiving", "reports");
  ensureDir(reportDir);
  const timestamp = new Date().toISOString().replace(/[:T]/gu, "").slice(0, 13);
  const reportPath = path.join(reportDir, `verify-pda-shell-readiness-${timestamp}.txt`);
  const reportLines: string[] = [`PDA shell readiness verification - ${timestamp}`, ""];

  console.log("Verifying PDA shell handoff artifacts...");
  reportLines.push("Verifying PDA shell handoff artifacts...");
  await pdaShellHandoffCommand([], context);

  console.log("");
  console.log("Running PDA frontend shell-readiness test suite...");
  reportLines.push("", "Running PDA frontend shell-readiness test suite...");
  runChecked("npx", [
    "vitest",
    "run",
    "src/services/runtimeBootstrap.test.ts",
    "src/services/runtimeConfig.test.ts",
    "src/services/nativeBridge.test.ts",
    "src/services/nativeBridgeContract.test.ts",
    "src/components/PdaShellBootstrap.test.tsx",
    "src/hooks/useAppLifecycle.test.tsx",
    "src/hooks/useBackHandler.test.tsx",
    "src/pages/Workbench.test.tsx",
    "src/pages/About.test.tsx",
    "src/pages/Profile.test.tsx",
    "src/pages/ReceivingTasks.test.tsx",
    "src/pages/ReceivingTaskExecution.test.tsx",
    "--testTimeout=10000",
    "--reporter=dot",
  ], {
    cwd: frontendDir,
    errorMessage: "vitest verification failed",
  });
  reportLines.push("Vitest: PASS");

  console.log("");
  console.log("Running TypeScript diagnostics...");
  reportLines.push("TypeScript diagnostics: running");
  runChecked("npx", ["tsc", "--noEmit", "--pretty", "false", "--project", "tsconfig.json"], {
    cwd: frontendDir,
    errorMessage: "TypeScript diagnostics failed",
  });
  reportLines.push("TypeScript diagnostics: PASS");

  console.log("");
  console.log("PDA shell readiness verification completed.");
  reportLines.push("", "Result: PASS", `Report path: ${reportPath}`);
  writeLines(reportPath, reportLines);
}
