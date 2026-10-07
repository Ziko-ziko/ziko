import { Composition } from "remotion";
import { TitleIntro, titleIntroSchema } from "./compositions/TitleIntro";
import { LowerThird } from "./compositions/LowerThird";
import { TheatreScene } from "./compositions/TheatreScene";
import { ReelEdit } from "./reel1/ReelEdit";
import { reelSchema } from "./reel1/style";
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
        schema={reelSchema}
        // Edited from Remotion Studio (Props panel -> Save)
        defaultProps={{
          accent: "#ff3fa4",
          captions: {
            show: true,
            y: 1300,
            fontSize: 82,
            fontWeight: "900",
            italic: false,
            uppercase: true,
            letterSpacing: -0.01,
            maxWordsPerPage: 3,
            textColor: "#ffffff",
            emphasisColor: "#ff3fa4",
            highlightStyle: "box",
            highlightTextColor: "#ffffff",
            activeWordScale: 1.08,
            activeWordRotation: -2,
            shadow: true,
          },
          hook: {
            show: true,
            label: "MÉDECINE ESTHÉTIQUE",
            line1: "Pourquoi tout le monde",
            line2: "a le *même* visage ?",
            y: 150,
            fontSize: 74,
            fontWeight: "800",
            labelSize: 26,
          },
          feed: { labels: ["MÊMES LÈVRES", "MÊMES POMMETTES", "MÊMES PROFILS"], labelSize: 58, labelY: 640 },
          hud: { show: true, labelSize: 31, uniqueText: "✦ UNIQUE" },
          stamp: { text: "STANDARDISÉS", fontSize: 112, rotation: -9 },
          endCard: {
            line1: "Chaque visage",
            line2: "est *unique.*",
            subtitle: "SUBLIMER, PAS TRANSFORMER",
            titleSize: 88,
            titleWeight: "800",
            titleItalic: false,
            subtitleSize: 30,
            y: 360,
          },
          progressBar: true,
          musicVolume: 0.55,
          sfxVolume: 1,
        }}
      />
    </>
  );
};
