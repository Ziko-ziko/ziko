import fs from "node:fs";
import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(null);

// In sandboxed/cloud machines Remotion can't download its own browser:
// fall back to the preinstalled Playwright headless shell if present.
const pwRoot = "/opt/pw-browsers";
if (fs.existsSync(pwRoot)) {
  const dir = fs.readdirSync(pwRoot).find((d) => d.startsWith("chromium_headless_shell-"));
  if (dir) {
    const exe = path.join(pwRoot, dir, "chrome-linux", "headless_shell");
    if (fs.existsSync(exe)) Config.setBrowserExecutable(exe);
  }
}
