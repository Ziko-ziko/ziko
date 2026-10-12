import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { M } from "./data";
import { FaceArt } from "./FaceArt";
import { useStyle } from "./style";
import { GOLD, INK, SANS } from "./theme";
import { PerCharacterRise } from "./TextAnim";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Line-art face drawn full-screen; geometry in screen pixels (FaceArt viewBox is 200x260).
const CX = 540;
function geo(size: number) {
  const LEFT = CX - size / 2;
  const TOP = 760 - size * 0.65; // face centered around y=760
  const k = size / 200;
  const sy = (y: number) => TOP + y * k;
  return { SIZE: size, LEFT, TOP, k, sy, EYES: sy(116), NOSE: sy(162), LIPS: sy(192) };
}

/** Shared B-roll frame: dark background, enter/exit with zoom + blur. */
const Frame: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { accent } = useStyle();
  const t = frame / fps;
  if (t < from - 0.01 || t > to + 0.01) return null;
  const enter = spring({ frame: frame - Math.round(from * fps), fps, config: { damping: 16, stiffness: 120 } });
  const exit = interpolate(t, [to - 0.18, to], [0, 1], clamp);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 38%, ${accent}2e 0%, ${INK} 62%), ${INK}`,
        opacity: enter * (1 - exit),
        transform: `scale(${interpolate(enter, [0, 1], [1.12, 1]) * (1 + exit * 0.15)})`,
        filter: `blur(${exit * 14}px)`,
        fontFamily: SANS,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const Pill: React.FC<{ text: string; y: number; p: number; at: number; side: "l" | "r" | "c"; filled?: boolean }> = ({ text, y, p, at, side, filled }) => {
  const { accent, hud } = useStyle();
  return (
    <div
      style={{
        position: "absolute",
        top: y - hud.labelSize,
        left: side === "l" ? 40 : side === "c" ? 0 : undefined,
        right: side === "r" ? 40 : side === "c" ? 0 : undefined,
        textAlign: "center",
        opacity: p,
        transform: `translateX(${(1 - p) * (side === "l" ? -40 : side === "r" ? 40 : 0)}px)`,
      }}
    >
      <span
        style={{
          display: "inline-block",
          fontWeight: 800,
          fontSize: hud.labelSize,
          letterSpacing: "0.2em",
          color: "#fff",
          background: filled ? accent : "rgba(10,8,12,0.7)",
          border: `2px solid ${accent}`,
          padding: "10px 18px 10px 24px",
          borderRadius: 10,
          boxShadow: filled ? `0 0 50px ${accent}aa` : "none",
        }}
      >
        <PerCharacterRise text={text} at={at} stagger={0.02} />
      </span>
    </div>
  );
};

/** "Je l'analyse dans sa globalité, ses proportions, son équilibre ... unique" */
export const BrollAnalysis: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { accent, hud } = useStyle();
  const { SIZE, LEFT, TOP, k, sy, EYES, NOSE, LIPS } = geo(hud.brollFaceSize);
  const t = frame / fps;
  const on = (at: number, d = 0.5) => interpolate(t, [at, at + d], [0, 1], clamp);
  const draw = on(from, 0.9);
  const circle = on(M.globalite - 0.1, 0.7);
  const thirds = on(M.proportions - 0.1, 0.6);
  const center = on(M.equilibre - 0.1, 0.6);
  const unique = spring({ frame: frame - Math.round(M.unique * fps), fps, config: { damping: 10, stiffness: 120 } });
  const R = SIZE * 0.66;
  const circ = 2 * Math.PI * R;
  const midY = sy(133);

  return (
    <Frame from={from} to={to}>
      <div style={{ position: "absolute", left: LEFT, top: TOP, filter: `drop-shadow(0 0 ${40 * unique}px ${accent})` }}>
        <FaceArt size={SIZE} stroke={GOLD} strokeWidth={2.6} draw={draw} lips={unique} cheeks={unique * 0.7} accent={accent} />
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <circle cx={CX} cy={midY} r={R} stroke={accent} strokeWidth={3} fill="none" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - circle)} transform={`rotate(-90 ${CX} ${midY})`} />
        {[EYES, NOSE, LIPS].map((y, i) => (
          <line key={i} x1={CX - SIZE * 0.66 * thirds} x2={CX + SIZE * 0.66 * thirds} y1={y} y2={y}
            stroke="rgba(255,255,255,0.75)" strokeWidth={2} strokeDasharray="12 9" />
        ))}
        <line x1={CX} x2={CX} y1={TOP - 20} y2={TOP - 20 + SIZE * 1.42 * center} stroke={accent} strokeWidth={3} />
        {[-1, 1].map((s) => <circle key={s} cx={CX + s * 38 * k} cy={EYES} r={9 * center} fill={accent} />)}
      </svg>
      <Pill text="GLOBALITÉ" y={TOP - 60} p={on(M.globalite, 0.2)} at={M.globalite} side="c" />
      <Pill text="PROPORTIONS" y={NOSE + 10} p={on(M.proportions, 0.2)} at={M.proportions} side="r" />
      <Pill text="ÉQUILIBRE" y={EYES + 10} p={on(M.equilibre, 0.2)} at={M.equilibre} side="l" />
      {t >= M.unique && <Pill text={hud.uniqueText} y={sy(285)} p={Math.min(1, unique)} at={M.unique} side="c" filled />}
    </Frame>
  );
};

/** "Une toute petite correction suffit pour harmoniser le visage" */
export const BrollHarmony: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { accent, hud } = useStyle();
  const { SIZE, LEFT, TOP, sy } = geo(hud.brollFaceSize);
  const t = frame / fps;
  const on = (at: number, d = 0.5) => interpolate(t, [at, at + d], [0, 1], clamp);
  const draw = on(from, 0.7);
  const slider = on(from + 0.2, 0.3) * (1 - on(M.harmoniser - 0.4, 0.2));
  const knob = interpolate(t, [M.correction, M.correction + 0.5], [0.5, 0.56], clamp);
  const sym = on(M.harmoniser - 0.1, 0.5);

  return (
    <Frame from={from} to={to}>
      <div style={{ position: "absolute", left: LEFT, top: TOP }}>
        <FaceArt size={SIZE} stroke={GOLD} strokeWidth={2.6} draw={draw} lips={sym * 0.8} accent={accent} />
      </div>
      <div style={{ position: "absolute", left: 220, right: 220, top: sy(270), opacity: slider }}>
        <div style={{ height: 10, borderRadius: 10, background: "rgba(255,255,255,0.22)" }}>
          <div style={{ width: `${knob * 100}%`, height: 10, borderRadius: 10, background: accent }} />
        </div>
        <div style={{ position: "absolute", left: `calc(${knob * 100}% - 22px)`, top: -17, width: 44, height: 44, borderRadius: 44,
          background: "#fff", boxShadow: `0 0 0 7px ${accent}59` }} />
      </div>
      {sym > 0 && (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <line x1={CX} x2={CX} y1={TOP - 30} y2={TOP - 30 + SIZE * 1.45 * sym} stroke="#fff" strokeWidth={3} />
          {[-1, 1].map((s) => (
            <path key={s} d={`M${CX + s * SIZE * 0.12} ${sy(50)} Q ${CX + s * SIZE * 0.64} ${sy(140)} ${CX + s * SIZE * 0.12} ${sy(235)}`}
              stroke={accent} strokeWidth={4} fill="none" strokeDasharray={1200} strokeDashoffset={1200 * (1 - sym)} />
          ))}
        </svg>
      )}
      <Pill text="HARMONIE" y={TOP - 60} p={sym} at={M.harmoniser - 0.1} side="c" />
    </Frame>
  );
};
