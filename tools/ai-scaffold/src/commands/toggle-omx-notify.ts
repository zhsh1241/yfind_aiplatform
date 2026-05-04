import fs from "node:fs";
import path from "node:path";
import { assertNoExtraArgs, takeOption } from "../utils/cli";

type NotifyAction = "status" | "enable" | "disable";

export async function toggleOmxNotifyCommand(args: string[], _context: { repoRoot: string }): Promise<void> {
  const action = (takeOption(args, "--action") ?? "status") as NotifyAction;
  assertNoExtraArgs(args);

  if (!["status", "enable", "disable"].includes(action)) {
    throw new Error(`Invalid --action: ${action}`);
  }

  const configPath = path.join(process.env.USERPROFILE ?? "", ".codex", "config.toml");
  const notifyLine =
    'notify = ["node", "C:\\\\Users\\\\zhangsheng\\\\AppData\\\\Roaming\\\\npm\\\\node_modules\\\\oh-my-codex\\\\dist\\\\scripts\\\\notify-hook.js"]';
  const disabledNotifyLine = `# ${notifyLine}`;

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const content = fs.readFileSync(configPath, "utf8");
  const status = getNotifyStatus(content);

  if (action === "status") {
    console.log(`notify: ${status}`);
    console.log(`config:  ${configPath}`);
    return;
  }

  if (action === "disable") {
    if (status === "disabled") {
      console.log("notify already disabled");
      return;
    }
    const backup = `${configPath}.bak-${timestamp()}`;
    fs.copyFileSync(configPath, backup);
    const updated = content.replace(/^notify\s*=\s*\[.*\]\s*$/mu, disabledNotifyLine);
    if (updated === content) {
      throw new Error("Failed to disable notify hook");
    }
    fs.writeFileSync(configPath, updated, "utf8");
    console.log("notify disabled");
    console.log(`backup: ${backup}`);
    return;
  }

  if (status === "enabled") {
    console.log("notify already enabled");
    return;
  }
  const backup = `${configPath}.bak-${timestamp()}`;
  fs.copyFileSync(configPath, backup);
  const updated =
    status === "disabled"
      ? content.replace(/^#\s*notify\s*=\s*\[.*\]\s*$/mu, notifyLine)
      : `${notifyLine}\n\n${content}`;
  fs.writeFileSync(configPath, updated, "utf8");
  console.log("notify enabled");
  console.log(`backup: ${backup}`);
}

function getNotifyStatus(content: string): "enabled" | "disabled" | "missing" {
  if (/^notify\s*=/mu.test(content)) {
    return "enabled";
  }
  if (/^#\s*notify\s*=/mu.test(content)) {
    return "disabled";
  }
  return "missing";
}

function timestamp(): string {
  return new Date().toISOString().replace(/[-:T]/gu, "").slice(0, 14);
}
