import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// System font so renders work offline. For a Google Font use:
//   import { loadFont } from "@remotion/google-fonts/Montserrat";
//   const { fontFamily } = loadFont();
const fontFamily = "Roboto, 'Noto Sans', sans-serif";

export const titleIntroSchema = {
  title: "ZIKO STUDIO",
  subtitle: "Motion Graphics",
  accent: "#ff3d6e",
};

type Props = typeof titleIntroSchema;

export const TitleIntro: React.FC<Props> = ({ title, subtitle, accent }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width } = useVideoConfig();

  const ring = spring({ frame, fps, config: { damping: 200 } });
  const exit = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fontSize = Math.round(width * 0.09);

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 40%, #1d1f3a 0%, #07070d 70%)",
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        fontWeight: 900,
        opacity: exit,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: width * 0.5,
          height: width * 0.5,
          borderRadius: "50%",
          border: `${Math.round(width * 0.006)}px solid ${accent}`,
          transform: `scale(${ring}) rotate(${frame * 1.5}deg)`,
          opacity: 0.35,
        }}
      />
      <div style={{ display: "flex", overflow: "hidden" }}>
        {title.split("").map((char, i) => {
          const s = spring({ frame: frame - 8 - i * 3, fps, config: { damping: 12 } });
          return (
            <span
              key={i}
              style={{
                fontSize,
                color: "white",
                display: "inline-block",
                whiteSpace: "pre",
                transform: `translateY(${interpolate(s, [0, 1], [fontSize * 1.2, 0])}px)`,
              }}
            >
              {char}
            </span>
          );
        })}
      </div>
      <div
        style={{
          marginTop: fontSize * 0.25,
          fontSize: fontSize * 0.32,
          letterSpacing: fontSize * 0.08,
          color: accent,
          textTransform: "uppercase",
          opacity: interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [40, 60], [20, 0], {
            extrapolateRight: "clamp",
          })}px)`,
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};
