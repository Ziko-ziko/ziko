import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const GOLD = "#f3d9b1";
export const INK = "#0b090d";
export const SANS = "Montserrat";

for (const weight of ["400", "500", "600", "700", "800", "900"]) {
  for (const style of ["normal", "italic"]) {
    loadFont({ family: SANS, url: staticFile(`fonts/montserrat-latin-${weight}-${style}.woff2`), weight, style });
  }
}
