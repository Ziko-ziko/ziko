import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { accentText, useStyle } from "./style";
import { SANS } from "./theme";

/** Opening hook at the top for the first seconds. */
export const HookTitle: React.FC<{ until: number }> = ({ until }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { hook: h, accent } = useStyle();
  const t = frame / fps;
  const out = interpolate(t, [until - 0.3, until], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (!h.show || out <= 0) return null;
  const line = (i: number) => spring({ frame: frame - 4 - i * 5, fps, config: { damping: 18, stiffness: 140 } });
  const chip = spring({ frame, fps, config: { damping: 20 } });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: h.y + h.fontSize * 2.6 + 300,
          background: "linear-gradient(180deg, rgba(8,6,10,0.85) 0%, rgba(8,6,10,0.55) 45%, rgba(8,6,10,0) 100%)",
        }}
      />
      <div style={{ position: "absolute", top: h.y, left: 40, right: 40, textAlign: "center", fontFamily: SANS }}>
        {h.label && (
          <div
            style={{
              display: "inline-block",
              fontWeight: 800,
              fontSize: h.labelSize,
              letterSpacing: "0.32em",
              color: "#fff",
              padding: `${h.labelSize * 0.45}px ${h.labelSize}px ${h.labelSize * 0.45}px ${h.labelSize * 1.2}px`,
              border: `2px solid ${accent}`,
              borderRadius: 999,
              background: `${accent}24`,
              opacity: chip,
              transform: `translateY(${(1 - chip) * -20}px)`,
              marginBottom: 34,
            }}
          >
            {h.label}
          </div>
        )}
        {[h.line1, h.line2].map((content, i) => (
          <div key={i} style={{ overflow: "hidden" }}>
            <div
              style={{
                fontWeight: Number(h.fontWeight),
                fontSize: h.fontSize,
                lineHeight: 1.14,
                color: "#fff",
                textShadow: "0 6px 30px rgba(0,0,0,0.5)",
                transform: `translateY(${(1 - line(i)) * 110}%)`,
              }}
            >
              {accentText(content, accent)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
