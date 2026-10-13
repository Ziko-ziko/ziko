import { Easing } from "remotion";

// A cubic-bezier curve [x1, y1, x2, y2] (same as CSS), or "hold" (stepped).
// y can go outside 0..1 for overshoot / anticipation.
export type Ease = [number, number, number, number] | "hold";
export type Key = { t: number; v: number; ease: Ease };

export const EASE_PRESETS: { id: string; label: string; ease: Ease }[] = [
  { id: "linear", label: "خطي", ease: [0, 0, 1, 1] },
  { id: "in", label: "Ease in", ease: [0.42, 0, 1, 1] },
  { id: "out", label: "Ease out", ease: [0, 0, 0.58, 1] },
  { id: "inout", label: "Ease in-out", ease: [0.42, 0, 0.58, 1] },
  { id: "smooth", label: "ناعم (Expo)", ease: [0.16, 1, 0.3, 1] },
  { id: "back", label: "نطة (Back)", ease: [0.34, 1.56, 0.64, 1] },
  { id: "anticipate", label: "رجوع لور", ease: [0.36, 0, 0.66, -0.56] },
  { id: "hold", label: "ثابت (Hold)", ease: "hold" },
];

const cache = new Map<string, (t: number) => number>();

/** Maps linear progress 0..1 through an ease curve. */
export const applyEase = (ease: Ease, p: number) => {
  const c = Math.min(Math.max(p, 0), 1);
  if (ease === "hold") return c >= 1 ? 1 : 0;
  const k = ease.join(",");
  let f = cache.get(k);
  if (!f) {
    const [x1, y1, x2, y2] = ease;
    f = Easing.bezier(Math.min(Math.max(x1, 0), 1), y1, Math.min(Math.max(x2, 0), 1), y2);
    cache.set(k, f);
  }
  return f(c);
};

/** Progress of an animation that started `local` seconds ago and lasts `dur`. */
export const prog = (local: number, dur: number, ease: Ease) => (local <= 0 ? 0 : applyEase(ease, dur <= 0 ? 1 : local / dur));

/** Value of a keyframe track at time t, or null when the track has no keys (= automatic). */
export const trackAt = (keys: Key[], t: number): number | null => {
  if (!keys.length) return null;
  const ks = keys.length > 1 ? [...keys].sort((a, b) => a.t - b.t) : keys;
  if (t <= ks[0].t) return ks[0].v;
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i];
    const b = ks[i + 1];
    if (t < b.t) {
      const p = (t - a.t) / Math.max(b.t - a.t, 1e-6);
      return a.v + (b.v - a.v) * applyEase(a.ease, p);
    }
  }
  return ks[ks.length - 1].v;
};

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
