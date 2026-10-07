import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { PINK, SANS, SERIF } from "./theme";

/** Opening hook at the top for the first ~2.8s. */
export const HookTitle: React.FC<{ until: number }> = ({ until }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const out = interpolate(t, [until - 0.3, until], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (out <= 0) return null;
  const line = (i: number) => spring({ frame: frame - 4 - i * 5, fps, config: { damping: 18, stiffness: 140 } });
  const chip = spring({ frame, fps, config: { damping: 20 } });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          height: 760,
          background: "linear-gradient(180deg, rgba(8,6,10,0.85) 0%, rgba(8,6,10,0.55) 45%, rgba(8,6,10,0) 100%)",
        }}
      />
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 26,
            letterSpacing: "0.32em",
            color: "#fff",
            padding: "12px 26px 12px 32px",
            border: `2px solid ${PINK}`,
            borderRadius: 999,
            background: "rgba(255,63,164,0.14)",
            opacity: chip,
            transform: `translateY(${(1 - chip) * -20}px)`,
          }}
        >
          MÉDECINE ESTHÉTIQUE
        </div>
        {[
          <>Pourquoi tout le monde</>,
          <>
            a le <span style={{ fontStyle: "italic", fontWeight: 600, color: PINK }}>même</span> visage ?
          </>,
        ].map((content, i) => (
          <div key={i} style={{ overflow: "hidden", marginTop: i === 0 ? 34 : 0 }}>
            <div
              style={{
                fontFamily: SERIF,
                fontWeight: 700,
                fontSize: 80,
                lineHeight: 1.12,
                color: "#fff",
                textShadow: "0 6px 30px rgba(0,0,0,0.5)",
                transform: `translateY(${(1 - line(i)) * 110}%)`,
              }}
            >
              {content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
