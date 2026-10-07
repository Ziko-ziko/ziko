import React from "react";
import { Composition, staticFile } from "remotion";
import { ReelEdit } from "./ReelEdit";
import { DURATION_FRAMES, FPS, defaultReel, reelSchema } from "./schema";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="ReelEdit"
    component={ReelEdit}
    schema={reelSchema}
    durationInFrames={DURATION_FRAMES}
    fps={FPS}
    width={1080}
    height={1920}
    defaultProps={{ ...defaultReel, src: staticFile("reel.mp4") }}
  />
);
