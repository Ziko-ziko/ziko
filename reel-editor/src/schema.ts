import { z } from "zod";
import { applyEase, trackAt } from "./motion";

export const FPS = 24;
export const SOURCE_SEC = 58.218667;

export const GRADE_IDS = ["teal", "golden", "emerald", "none"] as const;
export type GradeId = (typeof GRADE_IDS)[number];

export const ICON_IDS = [
  "face",
  "fingerprint",
  "phone",
  "lips",
  "alert",
  "message",
  "syringe",
  "balance",
  "sparkle",
  "heart",
  "copies",
] as const;
export type IconId = (typeof ICON_IDS)[number];

export const BROLL_KINDS = ["clones", "analysis", "unique", "user"] as const;
export type BrollKind = (typeof BROLL_KINDS)[number];

export const CAPTION_STYLES = ["pop", "karaoke", "box"] as const;

export const TRACK_IDS = ["zoom", "x", "y", "rot", "flash", "glow"] as const;
export type TrackId = (typeof TRACK_IDS)[number];

const easeSchema = z.union([z.tuple([z.number(), z.number(), z.number(), z.number()]), z.literal("hold")]);
const keySchema = z.object({ t: z.number(), v: z.number(), ease: easeSchema });
const anim = <T extends z.ZodRawShape>(extra: T) => z.object({ dur: z.number().min(0.01).max(3), ease: easeSchema }).extend(extra);

// All times (`takes`, `cuts`, `captions`, `icons`, `broll`, `hook.until`) are SOURCE seconds (position in the
// raw video), so switching a take on/off keeps everything attached to the right words.
// `zooms` has one entry per zoom segment of the edited reel (user cuts + automatic cuts at take joins).
export const reelSchema = z.object({
  src: z.string(),
  takes: z.array(z.object({ from: z.number(), to: z.number(), label: z.string(), on: z.boolean() })),
  cuts: z.array(z.number().min(0)),
  zooms: z.array(z.number().min(1).max(1.6)),
  grade: z.enum(GRADE_IDS),
  flash: z.number().min(0).max(1),
  glow: z.number().min(0).max(1),
  transition: z.number().min(0.1).max(1),
  pushIn: z.number().min(0).max(0.15),
  punch: z.number().min(0).max(0.15),
  anchorY: z.number().min(0).max(1),
  hook: z.object({ on: z.boolean(), text: z.string(), sub: z.string(), until: z.number() }),
  captionsOn: z.boolean(),
  captionStyle: z.enum(CAPTION_STYLES),
  captionY: z.number().min(0.4).max(0.92),
  captionSize: z.number().min(40).max(110),
  captions: z.array(z.object({ start: z.number(), end: z.number(), text: z.string() })),
  iconsOn: z.boolean(),
  icons: z.array(
    z.object({
      t: z.number(),
      icon: z.enum(ICON_IDS),
      label: z.string(),
      // optional per-icon overrides
      show: z.number().min(0.4).max(6).optional(),
      size: z.number().min(80).max(420).optional(),
      x: z.number().min(0).max(1).optional(),
      y: z.number().min(0).max(1).optional(),
    }),
  ),
  brollOn: z.boolean(),
  broll: z.array(
    z.object({ t: z.number(), dur: z.number().min(0.5).max(6), kind: z.enum(BROLL_KINDS), src: z.string().optional() }),
  ),
  // Keyframe tracks in OUTPUT seconds. A track with no keys runs automatically.
  keys: z.object({
    zoom: z.array(keySchema),
    x: z.array(keySchema),
    y: z.array(keySchema),
    rot: z.array(keySchema),
    flash: z.array(keySchema),
    glow: z.array(keySchema),
  }),
  // Animation curves for every moving element
  motion: z.object({
    transition: anim({}), // automatic zoom change at each cut
    caption: anim({ fromScale: z.number(), fromY: z.number(), fromRot: z.number(), fromBlur: z.number() }),
    word: anim({ scale: z.number(), lift: z.number() }),
    icon: anim({ fromScale: z.number(), fromRot: z.number(), outDur: z.number(), float: z.number() }),
    broll: anim({ fromScale: z.number(), outDur: z.number() }),
    hook: anim({ stagger: z.number(), fromY: z.number() }),
    flash: anim({ attack: z.number() }), // automatic flash: attack = rise time, dur = fade time
  }),
});

export type ReelProps = z.infer<typeof reelSchema>;

export const GRADES: Record<
  GradeId,
  {
    label: string;
    swatch: [string, string];
    filter: string;
    tint: { color: string; mode: "soft-light" | "overlay" | "color"; opacity: number }[];
    lift: number;
    vignette: number;
  }
> = {
  teal: {
    label: "تيل ونيون",
    swatch: ["#0f6f73", "#ff3d9a"],
    filter: "contrast(1.08) saturate(1.2)",
    tint: [
      { color: "#00606b", mode: "soft-light", opacity: 0.45 },
      { color: "#ff9a62", mode: "soft-light", opacity: 0.16 },
    ],
    lift: 0.02,
    vignette: 0.45,
  },
  golden: {
    label: "ذهبي دافئ",
    swatch: ["#c98a3a", "#f3d9a4"],
    filter: "contrast(1.04) saturate(1.05) brightness(1.04) sepia(0.14)",
    tint: [{ color: "#ffb04a", mode: "soft-light", opacity: 0.32 }],
    lift: 0.07,
    vignette: 0.3,
  },
  emerald: {
    label: "أخضر غامق",
    swatch: ["#0b3d33", "#1f8a6d"],
    filter: "contrast(1.18) brightness(0.93) saturate(0.92)",
    tint: [{ color: "#08503f", mode: "soft-light", opacity: 0.45 }],
    lift: 0,
    vignette: 0.65,
  },
  none: { label: "الأصلي", swatch: ["#6b6b6b", "#d8d8d8"], filter: "none", tint: [], lift: 0, vignette: 0 },
};

/* ---------- source ↔ output mapping ---------- */

export type Clip = { from: number; to: number; outStart: number };

export const clipsOf = (p: Pick<ReelProps, "takes">): Clip[] => {
  const on = p.takes.filter((t) => t.on && t.to > t.from).sort((a, b) => a.from - b.from);
  // merge touching takes so they play as one continuous clip
  const merged: { from: number; to: number }[] = [];
  for (const t of on) {
    const last = merged[merged.length - 1];
    if (last && t.from - last.to < 0.05) last.to = Math.max(last.to, t.to);
    else merged.push({ from: t.from, to: t.to });
  }
  let acc = 0;
  return merged.map((m) => {
    const c = { ...m, outStart: acc };
    acc += m.to - m.from;
    return c;
  });
};

export const outDuration = (clips: Clip[]) =>
  clips.length ? clips[clips.length - 1].outStart + clips[clips.length - 1].to - clips[clips.length - 1].from : 1;

export const durationFrames = (p: Pick<ReelProps, "takes">) => Math.max(Math.round(outDuration(clipsOf(p)) * FPS), 1);

export const outToSrc = (clips: Clip[], T: number) => {
  for (const c of clips) if (T < c.outStart + (c.to - c.from)) return c.from + Math.max(T - c.outStart, 0);
  const l = clips[clips.length - 1];
  return l ? l.to : T;
};

export const srcToOut = (clips: Clip[], s: number): number | null => {
  for (const c of clips) if (s >= c.from && s < c.to) return c.outStart + (s - c.from);
  return null;
};

/** joins between clips, in output seconds — each one is a hidden jump cut */
export const joinsOf = (clips: Clip[]) => clips.slice(1).map((c) => c.outStart);

/* ---------- zoom + flash ---------- */

const ease = (x: number) => {
  const c = Math.min(Math.max(x, 0), 1);
  return c * c * (3 - 2 * c);
};

/** user cuts (stored in source seconds) mapped to the output, plus an automatic cut at every join between takes */
export const allCuts = (p: Pick<ReelProps, "cuts">, clips: Clip[], dur: number) => {
  const out: number[] = [];
  const user = p.cuts.map((c) => srcToOut(clips, c)).filter((c): c is number => c !== null);
  for (const c of [...user, ...joinsOf(clips)].sort((a, b) => a - b)) {
    if (c <= 0.05 || c >= dur - 0.05) continue;
    if (out.length && c - out[out.length - 1] < 0.3) continue;
    out.push(c);
  }
  return out;
};

export const boundaries = (cuts: number[], dur: number) => [0, ...cuts, dur];

const zoomAt = (p: ReelProps, i: number) => p.zooms[i] ?? p.zooms[i % Math.max(p.zooms.length, 1)] ?? 1;

const segZoom = (p: ReelProps, B: number[], i: number, t: number) => {
  const prog = (t - B[i]) / Math.max(B[i + 1] - B[i], 0.01);
  return zoomAt(p, i) * (1 + p.pushIn * ease(prog));
};

export const zoomAtTime = (p: ReelProps, cuts: number[], dur: number, t: number) => {
  const B = boundaries(cuts, dur);
  let i = B.length - 2;
  for (let k = 0; k < B.length - 1; k++) {
    if (t < B[k + 1]) {
      i = k;
      break;
    }
  }
  let z = segZoom(p, B, i, t);
  if (i > 0 && t - B[i] < p.transition) {
    const prev = segZoom(p, B, i - 1, B[i] - 1e-6);
    const k = applyEase(p.motion.transition.ease, (t - B[i]) / p.transition);
    const target = z * (1 + p.punch * Math.sin(Math.PI * k));
    z = prev + (target - prev) * k;
  }
  return z;
};

export const flashAtTime = (cuts: number[], t: number, m: ReelProps["motion"]["flash"]) => {
  let f = 0;
  const attack = Math.max(m.attack, 0.001);
  for (const b of cuts) {
    const d = t - b;
    if (d >= -attack && d < 0) f = Math.max(f, (d + attack) / attack);
    else if (d >= 0 && d < m.dur) f = Math.max(f, 1 - applyEase(m.ease, d / m.dur));
  }
  return f;
};

/** Every keyframeable property at output time T: keyed value if the track has keys, else the automatic one. */
export const evalTracks = (p: ReelProps, cuts: number[], dur: number, T: number): Record<TrackId, number> => ({
  zoom: trackAt(p.keys.zoom, T) ?? zoomAtTime(p, cuts, dur, T),
  x: trackAt(p.keys.x, T) ?? 0,
  y: trackAt(p.keys.y, T) ?? 0,
  rot: trackAt(p.keys.rot, T) ?? 0,
  flash: trackAt(p.keys.flash, T) ?? flashAtTime(cuts, T, p.motion.flash) * p.flash,
  glow: trackAt(p.keys.glow, T) ?? p.glow,
});

/* ---------- captions: per-word timing ---------- */

export type Word = { text: string; start: number; end: number };

/** splits each caption line into words, timed proportionally to their length */
export const wordsOf = (captions: ReelProps["captions"]): Word[][] =>
  captions.map((c) => {
    const parts = c.text.split(/\s+/).filter(Boolean);
    const weights = parts.map((w) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 2);
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    let acc = c.start;
    return parts.map((w, i) => {
      const d = ((c.end - c.start) * weights[i]) / total;
      const word = { text: w, start: acc, end: acc + d };
      acc += d;
      return word;
    });
  });

/** groups words into short on-screen chunks (max 3 words / ~18 chars) */
export const chunksOf = (words: Word[]): Word[][] => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  let len = 0;
  for (const w of words) {
    if (cur.length && (cur.length >= 3 || len + w.text.length > 18)) {
      out.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(w);
    len += w.text.length + 1;
    if (/[.,!?;:]$/.test(w.text) && cur.length >= 2) {
      out.push(cur);
      cur = [];
      len = 0;
    }
  }
  if (cur.length) out.push(cur);
  return out;
};
