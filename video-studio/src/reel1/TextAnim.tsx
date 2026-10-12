import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** PerCharacterRise: each character rises in with a small stagger. */
export const PerCharacterRise: React.FC<{ text: string; at: number; stagger?: number; style?: React.CSSProperties }> = ({
  text, at, stagger = 0.025, style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <span style={{ display: "inline-block", whiteSpace: "pre", ...style }}>
      {Array.from(text).map((ch, i) => {
        const p = spring({ frame: frame - Math.round((at + i * stagger) * fps), fps, config: { damping: 16, stiffness: 200, mass: 0.6 } });
        return (
          <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 0.55}em)` }}>
            {ch}
          </span>
        );
      })}
    </span>
  );
};

/** LineByLineSlide: each line slides in from the left, staggered. */
export const LineByLineSlide: React.FC<{ lines: React.ReactNode[]; at: number; stagger?: number; lineStyle?: React.CSSProperties }> = ({
  lines, at, stagger = 0.14, lineStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {lines.map((l, i) => {
        const p = spring({ frame: frame - Math.round((at + i * stagger) * fps), fps, config: { damping: 18, stiffness: 130 } });
        return (
          <div key={i} style={{ opacity: p, transform: `translateX(${(1 - p) * -120}px)`, ...lineStyle }}>
            {l}
          </div>
        );
      })}
    </>
  );
};

/** BlurOutUp: returns a style that blurs + lifts + fades text out between `start` and `end` (seconds). */
export function blurOutUp(t: number, start: number, end: number): React.CSSProperties {
  const p = interpolate(t, [start, end], [0, 1], clamp);
  if (p <= 0) return {};
  return { opacity: 1 - p, filter: `blur(${p * 12}px)`, transform: `translateY(${-p * 40}px)` };
}
