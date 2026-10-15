// Browser (artifact) version of src/fonts.ts: loads families from Google Fonts instead of public/fonts.
import manifest from "../src/fonts.json";

type Face = { weight: string; style: string; file: string };
const M = manifest as Record<string, Face[]>;
export const FONT_FAMILIES = Object.keys(M) as [string, ...string[]];
const loaded = new Set<string>();

export function ensureFont(family: string) {
  if (loaded.has(family) || typeof document === "undefined") return;
  loaded.add(family);
  const faces = (M[family] ?? []).map((f) => `${f.style === "italic" ? 1 : 0},${f.weight}`);
  const axis = [...new Set(faces)].sort().join(";");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:ital,wght@${axis}&display=swap`;
  document.head.appendChild(link);
}
export const hasItalic = (family: string) => (M[family] ?? []).some((f) => f.style === "italic");
export const heaviestWeight = (family: string) => Math.max(...(M[family] ?? [{ weight: "400" }]).map((f) => Number(f.weight)));
