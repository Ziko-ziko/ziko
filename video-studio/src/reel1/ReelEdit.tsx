import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ensureFont, hasItalic, heaviestWeight } from "../fonts";
import { BrollFeed } from "./BrollFeed";
import { BrollStandard } from "./BrollStandard";
import { Captions } from "./Captions";
import { M } from "./data";
import { EndCard } from "./EndCard";
import { BrollAnalysis, BrollHarmony } from "./BrollFace";
import { Footage } from "./Footage";
import { HookTitle } from "./HookTitle";
import { type ReelStyle, StyleContext } from "./style";

const SFX: [number, string, number][] = [
  [0, "whoosh", 0.45],
  [M.brollFeedIn - 0.18, "whoosh", 0.9],
  [M.levres, "pop", 0.7],
  [M.pommettes, "pop", 0.7],
  [M.profils, "pop", 0.8],
  [M.brollFeedOut - 0.2, "whoosh", 0.8],
  [M.reconnaitre + 0.05, "glitch", 0.8],
  [M.globalite - 1.05, "whoosh", 0.8],
  [M.globalite, "pop", 0.45],
  [M.proportions, "pop", 0.45],
  [M.equilibre, "pop", 0.45],
  [M.unique, "chime", 0.6],
  [M.correction - 0.45, "whoosh", 0.8],
  [M.harmoniser, "pop", 0.5],
  [M.standardIn - 0.2, "whoosh", 0.9],
  [M.standardises, "glitch", 1],
  [M.speechEnd - 0.1, "chime", 1],
];

const ProgressBar: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: "absolute", top: 0, left: 0, height: 8, width: `${(frame / durationInFrames) * 100}%`, background: color }} />
  );
};

export const ReelEdit: React.FC<ReelStyle> = (style) => {
  const { fps, durationInFrames } = useVideoConfig();
  const speechEndF = Math.round(M.speechEnd * fps);
  const { body, title, titleItalic } = style.fonts;
  ensureFont(body);
  ensureFont(title);
  const fontVars = {
    "--body-font": `"${body}"`,
    "--title-font": `"${title}"`,
    "--title-weight": String(heaviestWeight(title)),
    "--title-style": titleItalic && hasItalic(title) ? "italic" : "normal",
  } as React.CSSProperties;
  return (
    <StyleContext.Provider value={style}>
    <AbsoluteFill style={{ background: "#000", ...fontVars }}>
      <Footage />
      <BrollAnalysis from={M.globalite - 0.9} to={M.unique + 0.55} />
      <BrollHarmony from={M.correction - 0.3} to={M.harmoniser + 1.25} />
      <BrollFeed from={M.brollFeedIn} to={M.brollFeedOut} />
      <BrollStandard from={M.standardIn} stampAt={M.standardises} to={M.speechEnd - 0.1} />
      <HookTitle until={M.brollFeedIn} />
      <Captions />
      <EndCard from={M.speechEnd - 0.15} />
      {style.progressBar && <ProgressBar color={style.accent} />}

      <Audio
        src={staticFile("reel1/music.wav")}
        volume={(f) =>
          interpolate(f, [0, 10, speechEndF - 10, speechEndF + 5, durationInFrames - 20, durationInFrames], [0, style.musicVolume, style.musicVolume, Math.min(1, style.musicVolume * 1.8), Math.min(1, style.musicVolume * 1.8), 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      {SFX.map(([at, name, vol], i) => (
        <Sequence key={i} from={Math.max(0, Math.round(at * fps))} layout="none">
          <Audio src={staticFile(`reel1/${name}.wav`)} volume={Math.min(1, vol * style.sfxVolume)} />
        </Sequence>
      ))}
    </AbsoluteFill>
    </StyleContext.Provider>
  );
};
