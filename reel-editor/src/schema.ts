import { z } from "zod";

export const FPS = 24;
export const DURATION_SEC = 58.218667;
export const DURATION_FRAMES = Math.round(DURATION_SEC * FPS);

export const GRADE_IDS = ["teal", "golden", "emerald", "none"] as const;
export type GradeId = (typeof GRADE_IDS)[number];

export const reelSchema = z.object({
  src: z.string(),
  // cut points in seconds; each one gets a zoom change + flash
  cuts: z.array(z.number().min(0).max(DURATION_SEC)),
  // zoom level per segment (cuts.length + 1 entries)
  zooms: z.array(z.number().min(1).max(1.6)),
  grade: z.enum(GRADE_IDS),
  flash: z.number().min(0).max(1),
  glow: z.number().min(0).max(1),
  transition: z.number().min(0.1).max(1),
  pushIn: z.number().min(0).max(0.15),
  punch: z.number().min(0).max(0.15),
  anchorY: z.number().min(0).max(1),
});

export type ReelProps = z.infer<typeof reelSchema>;

export const defaultReel: ReelProps = {
  src: "reel.mp4",
  cuts: [3.3, 8.5, 12.7, 18.7, 24.3, 30.4, 34.8, 40.6, 45.2, 50.0, 54.6],
  zooms: [1.0, 1.2, 1.07, 1.32, 1.0, 1.2, 1.07, 1.32, 1.0, 1.2, 1.07, 1.32],
  grade: "teal",
  flash: 0.7,
  glow: 0.5,
  transition: 0.32,
  pushIn: 0.045,
  punch: 0.06,
  anchorY: 0.33,
};

export const GRADES: Record<
  GradeId,
  {
    label: string;
    swatch: [string, string];
    filter: string;
    tint: { color: string; mode: "soft-light" | "overlay" | "color"; opacity: number }[];
    lift: number; // faded blacks
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
  none: {
    label: "الأصلي",
    swatch: ["#6b6b6b", "#d8d8d8"],
    filter: "none",
    tint: [],
    lift: 0,
    vignette: 0,
  },
};

const ease = (x: number) => {
  const c = Math.min(Math.max(x, 0), 1);
  return c * c * (3 - 2 * c);
};

export const boundaries = (p: ReelProps) => [0, ...[...p.cuts].sort((a, b) => a - b), DURATION_SEC];

const zoomAt = (p: ReelProps, i: number) => p.zooms[i] ?? p.zooms[p.zooms.length - 1] ?? 1;

const segZoom = (p: ReelProps, B: number[], i: number, t: number) => {
  const prog = (t - B[i]) / Math.max(B[i + 1] - B[i], 0.01);
  return zoomAt(p, i) * (1 + p.pushIn * ease(prog));
};

export const zoomAtTime = (p: ReelProps, t: number) => {
  const B = boundaries(p);
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
    const k = ease((t - B[i]) / p.transition);
    const target = z * (1 + p.punch * Math.sin(Math.PI * k));
    z = prev + (target - prev) * k;
  }
  return z;
};

export const flashAtTime = (p: ReelProps, t: number) => {
  let f = 0;
  for (const b of p.cuts) {
    const d = t - b;
    if (d >= -0.06 && d < 0) f = Math.max(f, (d + 0.06) / 0.06);
    else if (d >= 0 && d < 0.35) f = Math.max(f, Math.exp(-d / 0.09));
  }
  return f;
};
