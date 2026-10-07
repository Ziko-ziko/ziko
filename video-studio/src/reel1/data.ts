import raw from "./data.json";

export type Word = { text: string; start: number; end: number; emph: boolean };
export type Face = { t: number; cx: number; cy: number; w: number; h: number };

export const DATA = raw as unknown as {
  fps: number;
  segments: { srcStart: number; srcEnd: number; outStart: number }[];
  words: Word[];
  pages: number[][];
  markers: Record<string, number>;
  shots: [number, number, number, number][];
  face: Face[];
  duration: number;
};
export const M = DATA.markers;

/** Face box (source pixels) at an output time, linearly interpolated. */
export function faceAt(t: number): Face {
  const f = DATA.face;
  if (t <= f[0].t) return f[0];
  for (let i = 1; i < f.length; i++) {
    if (f[i].t >= t) {
      const a = f[i - 1];
      const b = f[i];
      const k = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
      if (b.t - a.t > 0.5) return k < 0.5 ? a : b; // across a cut: no blending
      const mix = (x: number, y: number) => x + (y - x) * k;
      return { t, cx: mix(a.cx, b.cx), cy: mix(a.cy, b.cy), w: mix(a.w, b.w), h: mix(a.h, b.h) };
    }
  }
  return f[f.length - 1];
}

/** Zoom shot active at output time t, with a fixed origin (median face center). */
export type Shot = { start: number; end: number; s0: number; s1: number; ox: number; oy: number };
export const SHOTS: Shot[] = DATA.shots.map(([start, end, s0, s1]) => {
  const fs = DATA.face.filter((f) => f.t >= start && f.t < end);
  const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
  return {
    start, end, s0, s1,
    ox: fs.length ? med(fs.map((f) => f.cx)) : 540,
    oy: fs.length ? med(fs.map((f) => f.cy)) : 700,
  };
});
export function shotAt(t: number): Shot & { scale: number } {
  const s = SHOTS.find((x) => t >= x.start && t < x.end) ?? SHOTS[SHOTS.length - 1];
  const k = Math.min(1, Math.max(0, (t - s.start) / Math.max(0.001, s.end - s.start)));
  return { ...s, scale: s.s0 + (s.s1 - s.s0) * k };
}
/** Map a source-pixel point to the screen after the shot's zoom. */
export function project(t: number, x: number, y: number) {
  const s = shotAt(t);
  return { x: s.ox + (x - s.ox) * s.scale, y: s.oy + (y - s.oy) * s.scale, scale: s.scale };
}
