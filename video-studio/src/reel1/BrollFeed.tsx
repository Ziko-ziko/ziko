import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { M } from "./data";
import { FaceArt } from "./FaceArt";
import { INK, PINK, SANS } from "./theme";

const COLS = 3;
const CARD_W = 320;
const CARD_H = 430;
const GAP = 24;
const LEFT = (1080 - COLS * CARD_W - (COLS - 1) * GAP) / 2;

/** "Social feed" B-roll: endless identical faces; lips, cheeks, profiles light up on cue. */
export const BrollFeed: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < from - 0.01 || t > to + 0.01) return null;

  const enter = spring({ frame: frame - Math.round(from * fps), fps, config: { damping: 16, stiffness: 120 } });
  const exit = interpolate(t, [to - 0.18, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const on = (at: number) => spring({ frame: frame - Math.round(at * fps), fps, config: { damping: 20, stiffness: 160 } });
  const lips = on(M.levres);
  const cheeks = on(M.pommettes);
  const outline = on(M.profils);
  const scroll = (t - from) * 150;

  const labels = [
    { at: M.levres, text: "MÊMES LÈVRES", rot: -4 },
    { at: M.pommettes, text: "MÊMES POMMETTES", rot: 3 },
    { at: M.profils, text: "MÊMES PROFILS", rot: -2 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 30%, #2a1424 0%, ${INK} 65%)`,
        opacity: interpolate(enter, [0, 1], [0, 1]) * (1 - exit),
        transform: `scale(${interpolate(enter, [0, 1], [1.12, 1]) * (1 + exit * 0.15)})`,
        filter: `blur(${exit * 14}px)`,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${180 - scroll}px)` }}>
        {Array.from({ length: 7 * COLS }).map((_, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const delay = (row * COLS + col) * 0.035;
          const pop = spring({ frame: frame - Math.round((from + delay) * fps), fps, config: { damping: 14 } });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: LEFT + col * (CARD_W + GAP),
                top: row * (CARD_H + GAP) + (col === 1 ? 70 : 0),
                width: CARD_W,
                height: CARD_H,
                borderRadius: 30,
                background: "linear-gradient(160deg, #241c27, #151017)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${pop})`,
              }}
            >
              <FaceArt size={190} lips={lips} cheeks={cheeks} outline={outline} />
              <div style={{ marginTop: 18, fontFamily: SANS, fontWeight: 800, fontSize: 28, color: "rgba(255,255,255,0.8)" }}>
                <span style={{ color: PINK }}>♥</span> 24,5k
              </div>
            </div>
          );
        })}
      </div>
      {/* app header */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 200,
          background: `linear-gradient(180deg, ${INK} 55%, rgba(11,9,13,0))`,
          display: "flex",
          justifyContent: "center",
          gap: 50,
          paddingTop: 78,
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 36,
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.45)" }}>Abonnements</span>
        <span style={{ color: "#fff", borderBottom: "4px solid #fff", paddingBottom: 10, height: 40 }}>Pour toi</span>
      </div>
      {/* labels */}
      {labels.map((l, i) => {
        const p = spring({ frame: frame - Math.round(l.at * fps), fps, config: { damping: 11, stiffness: 200, mass: 0.6 } });
        if (t < l.at) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 640 + i * 120,
              left: 0,
              right: 0,
              textAlign: "center",
              transform: `scale(${p}) rotate(${l.rot}deg)`,
            }}
          >
            <span
              style={{
                display: "inline-block",
                background: i === labels.length - 1 ? PINK : "#fff",
                color: i === labels.length - 1 ? "#fff" : INK,
                fontFamily: SANS,
                fontWeight: 900,
                fontSize: 58,
                padding: "14px 34px",
                borderRadius: 18,
                boxShadow: "0 18px 50px rgba(0,0,0,0.5)",
              }}
            >
              {l.text}
            </span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
