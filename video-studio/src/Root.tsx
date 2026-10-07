import { Composition } from "remotion";
import { TitleIntro, titleIntroSchema } from "./compositions/TitleIntro";
import { LowerThird } from "./compositions/LowerThird";
import { TheatreScene } from "./compositions/TheatreScene";
import { ReelEdit } from "./reel1/ReelEdit";
import reelData from "./reel1/data.json";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TitleIntro"
        component={TitleIntro}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={titleIntroSchema}
      />
      <Composition
        id="TitleIntroVertical"
        component={TitleIntro}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={titleIntroSchema}
      />
      <Composition
        id="LowerThird"
        component={LowerThird}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ name: "Ziko", role: "Motion Designer" }}
      />
      <Composition
        id="TheatreScene"
        component={TheatreScene}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ title: "ZIKO" }}
      />
      <Composition
        id="Reel1"
        component={ReelEdit}
        durationInFrames={Math.round(reelData.duration * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
