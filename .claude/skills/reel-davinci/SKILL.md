---
name: reel-davinci
description: >-
  Edits a talking-head reel with the reel-editor Remotion project (cut retakes, animated subtitles,
  icons, B-roll, zoom/flash/glow, colour grades) and hands it off as a complete DaVinci Resolve
  project: per-element transparent layers, FCPXML timeline with camera keyframes, SRT, LUTs and a
  Resolve script that builds the project in one click. Use when the user sends a video to edit
  ("monti", "montage", "edit this reel"), asks for "DaVinci", "Resolve", "projet", "layers",
  "timeline", "LUT", "srt", or wants the edit in their Drive.
---

# reel-davinci

Project: `reel-editor/` (Remotion 4, React 19). Read its README first. The user writes Darija in Latin
letters; answer in Arabic script. Deliverables also go to their Drive (see `CLAUDE.md` at repo root).

## 1. Get the video

- An upload in chat lands under `/root/.claude/uploads/...`. Google Drive downloads are blocked by
  the network policy, and the Drive connector returns base64 inline, so a video over a few MB cannot
  come from Drive: ask for an upload.
- `ffprobe` it; make `public/reel.mp4` (stream copy, faststart) and a 720p ~1.5 Mbps copy for the
  web editor artifact.

## 2. Transcribe and find retakes

- Whisper small runs offline from npm: `@huggingface/transformers@3` + `sts-whisper-small`
  (install with `--ignore-scripts` in the scratchpad, `env.allowRemoteModels = false`,
  `localModelPath` = the package's `models/`). Feed 16 kHz mono float32; set `language`.
- Long audio: transcribe overlapping windows (<30 s) and keep words by ownership range; the
  built-in chunking drops a window.
- Repeated sentences = retakes. Put each as a `take` in `src/data.ts`; keep the cleanest one on.
- Mark unclear lines `// GUESS` and tell the user which to check. Never invent wording silently.

## 3. Edit

`src/data.ts` holds everything (times in SOURCE seconds; keyframes in output seconds). Pauses for
cuts: RMS dips in 0.1 s windows of the audio. Check with
`npx remotion still ReelEdit out.jpg --frame=N --browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`
(Google Fonts are blocked here; fonts ship in `public/fonts`).

Web editor: `npm run build:editor`, then publish `editor/index.html` with `editor.js` and the 720p
`reel.mp4` as files to the same artifact URL. Test it with Playwright from the scratchpad
(`executablePath: /opt/pw-browsers/chromium-1194/chrome-linux/chrome`; that Chromium has no H.264,
so test with a VP9 copy named reel.mp4).

## 4. DaVinci hand-off

Here (cloud): render each layer as a PNG sequence and package it:

```
npx remotion render ReelEdit <dir>/<layer> --sequence --image-format=png --props='{"layer":"<layer>"}' --concurrency=4 --browser-executable=<headless_shell>
```

layers: `captions icons broll hook flash` (transparent), `camera` (H.264, the moving video only).
Recompress frames with `ffmpeg -c:v png -pred mixed -compression_level 9` named
`<n>-<layer>_%04d.png` (`2-subtitles 3-icons 4-broll 5-title 6-flash`, `1-camera.mp4`).

Then `node scripts/dist/davinci.cjs <pkg> [settings.json|-]` (build it with esbuild from
`scripts/davinci.ts`) for `timeline.fcpxml` + SRTs, `npx remotion still GradeLUT` per grade +
`scripts/hald_to_cube.py` for LUTs, and copy `scripts/resolve/build_reel_project.py` and a
`README-DaVinci.txt` (Darija) into the package.

On the user's own machine `npm run export:davinci` does all of it with ProRes 4444 layers.

## 5. Deliver

- Chat: `SendUserFile` takes 30 MB per file. Split image sequences into several valid zips by frame
  range (each extracts into the same folder). Zips cannot be attached to artifacts.
- Drive: upload the text files (FCPXML, SRT, README, the Resolve script) with
  `mcp__Google_Drive__create_file` (`textContent`, `disableConversionToGoogleType: true`) into the
  folder named in `CLAUDE.md`. Binaries do not fit through the connector: say so.
- Commit and push the code changes on the working branch.

## Resolve script

`build_reel_project.py` runs from Resolve's Workspace > Scripts menu (copy it to
`%PROGRAMDATA%\Blackmagic Design\DaVinci Resolve\Fusion\Scripts\Utility\`). It asks for the export
folder, creates the 1080x1920 24 fps project, relinks the FCPXML to the local `reel.mp4`, imports the
layers on V2-V6, applies a LUT on V1 and adds the SRT track. Composite mode (flash = Screen) and Glow
are manual. It has only been tested against a mocked API: tell the user so until they confirm it.
