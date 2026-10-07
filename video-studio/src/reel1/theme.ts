import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const PINK = "#ff3fa4";
export const PINK_SOFT = "#ff9ccf";
export const GOLD = "#f3d9b1";
export const INK = "#0b090d";

export const SANS = "Montserrat";
export const SERIF = "Playfair Display";

const fonts: [string, string, string, string][] = [
  [SANS, "montserrat-latin-600-normal.woff2", "600", "normal"],
  [SANS, "montserrat-latin-800-normal.woff2", "800", "normal"],
  [SANS, "montserrat-latin-900-normal.woff2", "900", "normal"],
  [SERIF, "playfair-display-latin-700-normal.woff2", "700", "normal"],
  [SERIF, "playfair-display-latin-600-italic.woff2", "600", "italic"],
];
for (const [family, file, weight, style] of fonts) {
  loadFont({ family, url: staticFile(`fonts/${file}`), weight, style });
}
