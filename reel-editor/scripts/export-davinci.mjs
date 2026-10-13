// One command for the DaVinci Resolve hand-off (Windows, macOS or Linux):
//
//   npm run export:davinci                    -> out/davinci/ with the default edit (src/data.ts)
//   npm run export:davinci -- settings.json   -> same, with settings copied from the web editor
//
// Writes: one ProRes 4444 (transparent) .mov per animation layer, camera.mp4 (the moving video,
// no grade), timeline.fcpxml, subtitles-*.srt and the three colour LUTs.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const settings = process.argv[2];
const out = path.resolve("out/davinci");
fs.mkdirSync(path.join(out, "LUTs"), { recursive: true });
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const props = (extra) => JSON.stringify({ ...(settings ? JSON.parse(fs.readFileSync(settings, "utf8")) : {}), ...extra });
const run = (cmd, args) => {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
};

const LAYERS = [
  ["captions", "2-subtitles"],
  ["icons", "3-icons"],
  ["broll", "4-broll"],
  ["hook", "5-title"],
  ["flash", "6-flash"],
];
for (const [layer, name] of LAYERS) {
  const file = path.join(out, `${name}.mov`);
  fs.writeFileSync(path.join(out, "props.json"), props({ layer }));
  run(npx, ["remotion", "render", "ReelEdit", file, "--codec=prores", "--prores-profile=4444", "--pixel-format=yuva444p10le", "--image-format=png", `--props=${path.join(out, "props.json")}`]);
}
fs.writeFileSync(path.join(out, "props.json"), props({ layer: "camera" }));
run(npx, ["remotion", "render", "ReelEdit", path.join(out, "1-camera.mp4"), "--codec=h264", "--crf=16", `--props=${path.join(out, "props.json")}`]);
fs.rmSync(path.join(out, "props.json"));

run(npx, ["esbuild", "scripts/davinci.ts", "--bundle", "--platform=node", "--format=cjs", "--outfile=scripts/dist/davinci.cjs", "--log-level=warning"]);
run("node", ["scripts/dist/davinci.cjs", out, settings ?? "-", path.resolve("public/reel.mp4")]);

for (const [grade, title] of [
  ["teal", "Teal Neon"],
  ["golden", "Golden Warm"],
  ["emerald", "Emerald Dark"],
]) {
  const png = path.join(out, `lut-${grade}.png`);
  const lutProps = path.join(out, "lut-props.json");
  fs.writeFileSync(lutProps, JSON.stringify({ grade }));
  run(npx, ["remotion", "still", "GradeLUT", png, `--props=${lutProps}`, "--image-format=png"]);
  fs.rmSync(lutProps);
  run(process.platform === "win32" ? "python" : "python3", ["scripts/hald_to_cube.py", png, path.join(out, "LUTs", `Reel - ${title}.cube`), `Reel ${title}`]);
  fs.rmSync(png);
}
console.log(`\nDone: ${out}`);
