import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import manifest from "./fonts.json";

/** All installed font families (see scripts/collect_fonts.py). */
export const FONT_FAMILIES = Object.keys(manifest) as [string, ...string[]];

const loaded = new Set<string>();

/** Load every weight/style of a family once; rendering waits until the files are ready. */
export function ensureFont(family: string) {
  if (loaded.has(family)) return;
  loaded.add(family);
  for (const f of (manifest as Record<string, { weight: string; style: string; file: string }[]>)[family] ?? []) {
    loadFont({ family, url: staticFile(f.file), weight: f.weight, style: f.style });
  }
}

/** True if the family ships an italic face. */
export const hasItalic = (family: string) =>
  ((manifest as Record<string, { style: string }[]>)[family] ?? []).some((f) => f.style === "italic");

/** Heaviest weight a family ships (display fonts often only have 400). */
export const heaviestWeight = (family: string) =>
  Math.max(...((manifest as Record<string, { weight: string }[]>)[family] ?? [{ weight: "400" }]).map((f) => Number(f.weight)));
