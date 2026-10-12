import { AbsoluteFill, Audio, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { DATA, M, shotAt } from "./data";

const FPS = DATA.fps;
// 4K upscale of the footage (projects/reel1/make_assets.sh); drawn at 1080x1920 CSS px, sharp when rendering with --scale=2
const SRC = staticFile("reel1/source_clean_4k.mp4");
// AI-denoised + EQ'd voice (scripts/enhance_voice.py), same timeline as the source video
const VOICE = staticFile("reel1/voice_enhanced.wav");

const pulse = (t: number, at: number, inS: number, holdS: number, outS: number) =>
  interpolate(t, [at - inS, at, at + holdS, at + holdS + outS], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** The talking-head takes, cut together, with punch-in zooms and in-camera effects. */
export const Footage: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const shot = shotAt(t);

  // "ne plus se reconnaître" -> face goes soft and colorless for a beat
  const lost = pulse(t, M.reconnaitre + 0.1, 0.15, 0.35, 0.35);
  // "mettre en valeur" -> soft bloom
  const glow = pulse(t, M.valeur + 0.1, 0.25, 0.9, 0.6);
  // tiny punch on every cut (zoom settles in 6 frames)
  const sinceCut = t - shot.start;
  const punch = interpolate(sinceCut, [0, 0.2], [1.035, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${shot.scale * punch})`,
          transformOrigin: `${shot.ox}px ${shot.oy}px`,
          filter: `blur(${lost * 9}px) saturate(${1 - lost * 0.8}) brightness(${1 + glow * 0.1})`,
        }}
      >
        {DATA.segments.map((s, i) => {
          const from = Math.round(s.outStart * FPS);
          const to = Math.round((s.outStart + s.srcEnd - s.srcStart) * FPS);
          const dur = to - from;
          return (
            <Sequence key={i} from={from} durationInFrames={dur} layout="none">
              <OffthreadVideo src={SRC} trimBefore={Math.round(s.srcStart * FPS)} style={{ width: 1080, height: 1920 }} muted />
              <Audio
                src={VOICE}
                trimBefore={Math.round(s.srcStart * FPS)}
                volume={(f) => interpolate(f, [0, 3, dur - 3, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
              />
            </Sequence>
          );
        })}
      </AbsoluteFill>
      {/* bloom */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle at 50% 35%, rgba(255,214,235,0.45), rgba(255,255,255,0) 60%)",
          mixBlendMode: "screen",
          opacity: glow * 0.6,
        }}
      />
    </AbsoluteFill>
  );
};
