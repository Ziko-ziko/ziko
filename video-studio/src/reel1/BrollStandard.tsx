import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FaceArt } from "./FaceArt";
import { INK, PINK, SANS } from "./theme";

/** "Visages standardisés": a factory grid of identical faces + stamp. */
export const BrollStandard: React.FC<{ from: number; stampAt: number; to: number }> = ({ from, stampAt, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < from || t > to + 0.4) return null;

  const enter = interpolate(t, [from, from + 0.15], [0, 1], { extrapolateRight: "clamp" });
  const stamp = spring({ frame: frame - Math.round(stampAt * fps), fps, config: { damping: 9, stiffness: 200, mass: 0.7 } });
  const shakeAmt = interpolate(t, [stampAt, stampAt + 0.35], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shake = t >= stampAt ? shakeAmt * 18 : 0;
  const sx = (random(`x${frame}`) - 0.5) * shake;
  const sy = (random(`y${frame}`) - 0.5) * shake;
  const out = interpolate(t, [to, to + 0.4], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const COLS = 4;
  const ROWS = 6;
  const size = 200;
  return (
    <AbsoluteFill style={{ background: INK, opacity: enter * out, transform: `translate(${sx}px, ${sy}px)` }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${size + 30}px)`,
          justifyContent: "center",
          alignContent: "center",
          gap: 18,
        }}
      >
        {Array.from({ length: COLS * ROWS }).map((_, i) => {
          const d = Math.abs((i % COLS) - 1.5) * 0.02 + Math.floor(i / COLS) * 0.03;
          const p = spring({ frame: frame - Math.round((from + d) * fps), fps, config: { damping: 15, stiffness: 220 } });
          return (
            <div key={i} style={{ display: "flex", justifyContent: "center", transform: `scale(${p})`, opacity: 0.85 }}>
              <FaceArt size={size} stroke="#8d8693" strokeWidth={3.5} lips={0.35} accent="#8d8693" />
            </div>
          );
        })}
      </div>
      {t >= stampAt && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 900,
              fontSize: 112,
              color: PINK,
              border: `10px solid ${PINK}`,
              borderRadius: 22,
              padding: "6px 34px 12px",
              background: "rgba(11,9,13,0.82)",
              transform: `rotate(-9deg) scale(${interpolate(stamp, [0, 1], [2.2, 1])})`,
              opacity: interpolate(stamp, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
              letterSpacing: "0.02em",
              boxShadow: "0 0 80px rgba(255,63,164,0.35)",
            }}
          >
            STANDARDISÉS
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
