import path from "node:path";
import { assertNoExtraArgs } from "../utils/cli";

export async function pdaShellHandoffCommand(args: string[], context: { repoRoot: string }): Promise<void> {
  assertNoExtraArgs(args);

  const artifacts = [
    "frontend/wms-pda/ANDROID-WEBVIEW-HANDOFF.md",
    "frontend/wms-pda/ANDROID-WEBVIEW-BRIDGE-SNIPPETS.md",
    "frontend/wms-pda/public/app-config.json",
    "frontend/wms-pda/public/app-config.android.example.json",
    "frontend/wms-pda/public/android-shell-contract.json",
    "frontend/wms-pda/public/android-shell-checklist.json",
    "frontend/wms-pda/src/services/nativeBridgeContract.ts",
    "frontend/wms-pda/src/services/nativeBridge.ts",
    "frontend/wms-pda/src/services/runtimeConfig.ts",
    "frontend/wms-pda/src/services/runtimeBootstrap.ts",
    "frontend/wms-pda/src/components/PdaShellBootstrap.tsx",
    "frontend/wms-pda/src/pages/About.tsx",
    "frontend/wms-pda/src/pages/Profile.tsx",
  ];

  console.log("PDA Android shell handoff artifacts:");
  const missing: string[] = [];
  for (const artifact of artifacts) {
    const fullPath = path.join(context.repoRoot, artifact);
    if (require("node:fs").existsSync(fullPath)) {
      console.log(`  OK  ${artifact}`);
    } else {
      console.log(`  MISS ${artifact}`);
      missing.push(artifact);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing handoff artifacts: ${missing.join(", ")}`);
  }

  console.log("");
  console.log("Verified routes for Android shell smoke:");
  for (const route of ["/login", "/workbench", "/profile", "/diagnostics", "/receiving", "/receiving/tasks/600000001002"]) {
    console.log(`  ${route}`);
  }
}
