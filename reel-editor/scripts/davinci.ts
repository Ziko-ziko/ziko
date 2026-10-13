// Writes the DaVinci Resolve hand-off files for the current edit (src/data.ts, or a settings JSON
// copied from the web editor):
//   timeline.fcpxml       V1: the raw reel cut into its parts, with the zoom / pan / rotation as keyframes
//   subtitles-lines.srt   one subtitle per sentence (editable text in a subtitle track)
//   subtitles-words.srt   the same short word groups the animated captions show
//
// Usage: node scripts/dist/davinci.cjs <outDir> [settings.json | -] [mediaPath]
import fs from "node:fs";
import path from "node:path";
import { defaultReel } from "../src/data";
import {
  FPS,
  ReelProps,
  SOURCE_SEC,
  allCuts,
  boundaries,
  chunksOf,
  clipsOf,
  evalTracks,
  outDuration,
  outToSrc,
  srcToOut,
  wordsOf,
} from "../src/schema";

const [outDir = "out/davinci", settingsPath, mediaPath = "reel.mp4"] = process.argv.slice(2);
const saved = settingsPath && settingsPath !== "-" ? JSON.parse(fs.readFileSync(settingsPath, "utf8")) : {};
const p: ReelProps = {
  ...defaultReel,
  ...saved,
  keys: { ...defaultReel.keys, ...(saved.keys ?? {}) },
  motion: { ...defaultReel.motion, ...(saved.motion ?? {}) },
};
fs.mkdirSync(outDir, { recursive: true });

const clips = clipsOf(p);
const dur = outDuration(clips);
const cuts = allCuts(p, clips, dur);
const W = 1080;
const H = 1920;

/* ---------------- SRT ---------------- */

const srtTime = (t: number) => {
  const ms = Math.max(Math.round(t * 1000), 0);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(r, 3)}`;
};

const srt = (entries: { a: number; b: number; text: string }[]) =>
  entries.map((e, i) => `${i + 1}\n${srtTime(e.a)} --> ${srtTime(e.b)}\n${e.text}\n`).join("\n");

// a source span mapped to the output, or null if it is not in a kept take
const span = (s0: number, s1: number) => {
  const a = srcToOut(clips, s0);
  if (a === null) return null;
  const clip = clips.find((c) => s0 >= c.from && s0 < c.to)!;
  const b = clip.outStart + (Math.min(s1, clip.to) - clip.from);
  return { a, b };
};

// break a sentence into two lines of ~42 characters for the subtitle track
const twoLines = (t: string) => {
  if (t.length <= 42) return t;
  const words = t.split(" ");
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const d = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (d < bestDiff) {
      bestDiff = d;
      best = i;
    }
  }
  return `${words.slice(0, best).join(" ")}\n${words.slice(best).join(" ")}`;
};

const lineEntries = p.captions
  .map((c) => ({ ...span(c.start, c.end), text: twoLines(c.text) }))
  .filter((e): e is { a: number; b: number; text: string } => e.a !== undefined && e.a !== null);
const wordEntries = wordsOf(p.captions)
  .flatMap(chunksOf)
  .map((ch) => ({ ...span(ch[0].start, ch[ch.length - 1].end + 0.12), text: ch.map((w) => w.text).join(" ") }))
  .filter((e): e is { a: number; b: number; text: string } => e.a !== undefined && e.a !== null);
// subtitle tracks don't allow overlaps: end each entry where the next one starts
for (const list of [lineEntries, wordEntries]) {
  for (let i = 0; i < list.length - 1; i++) list[i].b = Math.min(list[i].b, list[i + 1].a);
}
fs.writeFileSync(path.join(outDir, "subtitles-lines.srt"), srt(lineEntries));
fs.writeFileSync(path.join(outDir, "subtitles-words.srt"), srt(wordEntries));

/* ---------------- FCPXML ---------------- */

const fr = (t: number) => Math.round(t * FPS);
const tm = (frames: number) => `${frames}/${FPS}s`;

// camera at output time T converted to FCP's transform (about the frame centre, y up, units = % of frame height)
const camAt = (T: number) => {
  const c = evalTracks(p, cuts, dur, T);
  const r = (c.rot * Math.PI) / 180;
  const oy = (p.anchorY - 0.5) * H; // our zoom pivots on the face, FCP pivots on the centre
  const dx = c.x + c.zoom * Math.sin(r) * oy;
  const dy = c.y + oy - c.zoom * Math.cos(r) * oy;
  return { scale: c.zoom, px: (dx / H) * 100, py: (-dy / H) * 100, rot: -c.rot };
};

// Ramer–Douglas–Peucker on (frame, value) so keyframes only land where the curve bends
const simplify = (pts: [number, number][], eps: number): [number, number][] => {
  if (pts.length < 3) return pts;
  const [x0, y0] = pts[0];
  const [x1, y1] = pts[pts.length - 1];
  let maxD = 0;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const yl = y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
    const d = Math.abs(y - yl);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD <= eps) return [pts[0], pts[pts.length - 1]];
  return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
};

const num = (v: number) => +v.toFixed(4);
const B = boundaries(cuts, dur);
const segs: string[] = [];
for (let i = 0; i < B.length - 1; i++) {
  const f0 = fr(B[i]);
  const f1 = fr(B[i + 1]);
  if (f1 <= f0) continue;
  const srcStart = fr(outToSrc(clips, (f0 + 0.5) / FPS) - 0.5 / FPS);
  const samples = Array.from({ length: f1 - f0 }, (_, k) => ({ k, c: camAt((f0 + k) / FPS) }));
  const param = (name: string, get: (c: ReturnType<typeof camAt>) => number, eps: number, fmt: (v: number) => string) => {
    const pts = simplify(
      samples.map((s) => [s.k, get(s.c)] as [number, number]),
      eps,
    );
    if (pts.length <= 2 && Math.abs(pts[0][1] - pts[pts.length - 1][1]) <= eps) return { attr: fmt(pts[0][1]), anim: "" };
    const keys = pts.map(([k, v]) => `            <keyframe time="${tm(srcStart + k)}" value="${fmt(v)}" interp="linear"/>`).join("\n");
    return { attr: fmt(pts[0][1]), anim: `          <param name="${name}">\n            <keyframeAnimation>\n${keys}\n            </keyframeAnimation>\n          </param>` };
  };
  const sc = param("scale", (c) => c.scale, 0.0015, (v) => `${num(v)} ${num(v)}`);
  const pos = { x: param("position", (c) => c.px, 0.03, (v) => `${num(v)}`), y: param("position", (c) => c.py, 0.03, (v) => `${num(v)}`) };
  // position is one 2D param: key it on the union of x and y key frames
  const posFrames = new Set<number>();
  const addFrames = (r: { anim: string }) => [...r.anim.matchAll(/time="(\d+)\/\d+s"/g)].forEach((m) => posFrames.add(+m[1] - srcStart));
  addFrames(pos.x);
  addFrames(pos.y);
  const posAttr = `${pos.x.attr} ${pos.y.attr}`;
  const posAnim = posFrames.size
    ? `          <param name="position">\n            <keyframeAnimation>\n${[...posFrames]
        .sort((a, b) => a - b)
        .map((k) => {
          const c = samples[Math.min(k, samples.length - 1)].c;
          return `            <keyframe time="${tm(srcStart + k)}" value="${num(c.px)} ${num(c.py)}" interp="linear"/>`;
        })
        .join("\n")}\n            </keyframeAnimation>\n          </param>`
    : "";
  const rt = param("rotation", (c) => c.rot, 0.05, (v) => `${num(v)}`);
  const anims = [posAnim, sc.anim, rt.anim].filter(Boolean).join("\n");
  segs.push(
    `      <asset-clip ref="r2" name="reel part ${i + 1}" offset="${tm(f0)}" start="${tm(srcStart)}" duration="${tm(f1 - f0)}" format="r1" tcFormat="NDF">
        <adjust-transform position="${posAttr}" scale="${sc.attr}" rotation="${rt.attr}">
${anims}
        </adjust-transform>
      </asset-clip>`,
  );
}

const mediaUrl = /^[a-zA-Z]:\\/.test(mediaPath)
  ? "file:///" + mediaPath.replace(/\\/g, "/").replace(/ /g, "%20")
  : "file://" + path.resolve(mediaPath).replace(/ /g, "%20");
const fcpxml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>
    <format id="r1" name="FFVideoFormat1080x1920p24" frameDuration="1/${FPS}s" width="${W}" height="${H}"/>
    <asset id="r2" name="reel" start="0s" duration="${tm(fr(SOURCE_SEC))}" hasVideo="1" hasAudio="1" format="r1" audioSources="1" audioChannels="2" audioRate="48000">
      <media-rep kind="original-media" src="${mediaUrl}"/>
    </asset>
  </resources>
  <library>
    <event name="Reel edit">
      <project name="Reel edit">
        <sequence format="r1" duration="${tm(fr(dur))}" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">
          <spine>
${segs.join("\n")}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
`;
fs.writeFileSync(path.join(outDir, "timeline.fcpxml"), fcpxml);

console.log(
  `parts ${segs.length}, length ${dur.toFixed(2)}s, subtitles ${lineEntries.length} lines / ${wordEntries.length} word groups -> ${outDir}`,
);
