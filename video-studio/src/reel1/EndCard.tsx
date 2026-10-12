import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FaceArt } from "./FaceArt";
import { accentText, useStyle } from "./style";
import { GOLD, INK, SANS } from "./theme";
import { LineByLineSlide, PerCharacterRise } from "./TextAnim";

export const EndCard: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { endCard: e, accent } = useStyle();
  const t = frame / fps;
  if (t < from) return null;
  const local = t - from;
  const bg = interpolate(local, [0, 0.35], [0, 1], { extrapolateRight: "clamp" });
  const draw = interpolate(local, [0.1, 1.3], [0, 1], { extrapolateRight: "clamp" });
  const glow = interpolate(local, [1.0, 1.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 38%, ${accent}38 0%, ${INK} 62%)`,
        opacity: bg,
        alignItems: "center",
        fontFamily: SANS,
      }}
    >
      <div
        style={{
          marginTop: e.y,
          filter: `drop-shadow(0 0 ${30 * glow}px ${accent}cc)`,
          transform: `scale(${interpolate(draw, [0, 1], [0.92, 1])})`,
        }}
      >
        <FaceArt size={360} stroke={GOLD} draw={draw} strokeWidth={3.5} lips={glow} cheeks={glow * 0.6} accent={accent} />
      </div>
      <div
        style={{
          marginTop: 70,
          fontWeight: Number(e.titleWeight),
          fontStyle: e.titleItalic ? "italic" : "normal",
          fontSize: e.titleSize,
          color: "#fff",
          textAlign: "center",
          lineHeight: 1.12,
          letterSpacing: "-0.01em",
        }}
      >
        <LineByLineSlide at={from + 0.5} lines={[accentText(e.line1, accent), accentText(e.line2, accent)]} />
      </div>
      <div
        style={{
          marginTop: 46,
          fontWeight: 600,
          fontSize: e.subtitleSize,
          letterSpacing: "0.38em",
          color: GOLD,
        }}
      >
        <PerCharacterRise text={e.subtitle} at={from + 0.9} stagger={0.018} />
      </div>
    </AbsoluteFill>
  );
};
