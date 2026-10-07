import React from "react";
import { Composition, continueRender, delayRender, staticFile } from "remotion";
import { ReelEdit } from "./ReelEdit";
import { defaultReel } from "./data";
import { FPS, durationFrames, reelSchema } from "./schema";

// Fonts ship in public/fonts so renders work offline.
const FONTS: [string, string, string][] = [
  ["Montserrat", "800", "fonts/montserrat-latin-800-normal.woff2"],
  ["Montserrat", "900", "fonts/montserrat-latin-900-normal.woff2"],
  ["JetBrains Mono", "400", "fonts/jetbrains-mono-latin-400-normal.woff2"],
];
const fontHandle = delayRender("Loading fonts");
Promise.all(
  FONTS.map(([family, weight, file]) => {
    const face = new FontFace(family, `url(${staticFile(file)}) format("woff2")`, { weight });
    document.fonts.add(face);
    return face.load();
  }),
).then(() => continueRender(fontHandle));

export const RemotionRoot: React.FC = () => (
  <Composition
    id="ReelEdit"
    component={ReelEdit}
    schema={reelSchema}
    fps={FPS}
    width={1080}
    height={1920}
    durationInFrames={durationFrames(defaultReel)}
    calculateMetadata={({ props }) => ({ durationInFrames: durationFrames(props) })}
    defaultProps={{ ...defaultReel, src: staticFile("reel.mp4") }}
  />
);
