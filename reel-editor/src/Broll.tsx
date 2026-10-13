import React from "react";
import { AbsoluteFill, OffthreadVideo, interpolate, spring } from "remotion";
import { CAPTION_FONT } from "./Captions";
import { lerp, prog } from "./motion";
import { FPS, ReelProps } from "./schema";

type Item = ReelProps["broll"][number];

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const PINK = "#ff3d9a";
const TEAL = "#1fb0aa";

/** Stylised face used in the "same faces" graphics. */
const FaceCard: React.FC<{ tone: string; lips: string; glow?: number; size: number }> = ({ tone, lips, glow = 0, size }) => (
  <svg width={size} height={size * 1.2} viewBox="0 0 100 120" style={{ overflow: "visible", filter: glow ? `drop-shadow(0 0 ${18 * glow}px ${PINK})` : undefined }}>
    <path d="M50 8C29 8 18 26 18 50c0 30 15 58 32 58s32-28 32-58C82 26 71 8 50 8z" fill={tone} />
    <path d="M18 48c2-26 16-40 32-40s30 14 32 40c-6-16-16-24-32-24S24 32 18 48z" fill="rgba(0,0,0,.35)" />
    <ellipse cx="38" cy="54" rx="5" ry="3" fill="#1b1b1b" />
    <ellipse cx="62" cy="54" rx="5" ry="3" fill="#1b1b1b" />
    <path d="M50 58v14h-4" stroke="rgba(0,0,0,.35)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M36 84c5-5 9-6 14-4 5-2 9-1 14 4-5 8-23 8-28 0z" fill={lips} />
    <path d="M24 66c4 5 9 6 12 5M76 66c-4 5-9 6-12 5" stroke="rgba(255,255,255,.35)" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

type BrollMotion = ReelProps["motion"]["broll"];

const enterExit = (local: number, dur: number, m: BrollMotion) => {
  const inK = prog(local, m.dur, m.ease);
  const outK = interpolate(local, [dur - m.outDur, dur], [1, 0], clamp);
  return { inK, outK };
};

const Backdrop: React.FC<{ children: React.ReactNode; local: number; dur: number; m: BrollMotion }> = ({ children, local, dur, m }) => {
  const { inK, outK } = enterExit(local, dur, m);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 35%, #173a3d 0%, #0b1416 60%, #06090a 100%)`,
        opacity: Math.min(Math.max(inK, 0) * 1.4, 1) * outK,
        transform: `scale(${lerp(m.fromScale, 1, inK)})`,
        overflow: "hidden",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const BigLabel: React.FC<{ top: number; children: React.ReactNode; k: number; color?: string; size?: number }> = ({ top, children, k, color = "#fff", size = 96 }) => (
  <div
    style={{
      position: "absolute",
      top,
      left: 0,
      right: 0,
      textAlign: "center",
      fontFamily: CAPTION_FONT,
      fontWeight: 900,
      fontSize: size,
      color,
      letterSpacing: "0.02em",
      transform: `translateY(${(1 - k) * 60}px)`,
      opacity: k,
      textShadow: "0 10px 30px rgba(0,0,0,.5)",
    }}
  >
    {children}
  </div>
);

/** "Les mêmes lèvres / pommettes / profils": a grid of identical faces. */
const Clones: React.FC<{ local: number; dur: number; m: BrollMotion }> = ({ local, dur, m }) => {
  const words = ["LÈVRES", "POMMETTES", "PROFILS"];
  const phase = Math.min(Math.floor((local / dur) * 3), 2);
  const phaseLocal = local - (phase * dur) / 3;
  const wK = spring({ frame: phaseLocal * FPS, fps: FPS, config: { damping: 12, stiffness: 220 } });
  const titleK = spring({ frame: local * FPS, fps: FPS, config: { damping: 14 } });
  return (
    <Backdrop local={local} dur={dur} m={m}>
      <BigLabel top={210} k={titleK} size={80} color="rgba(255,255,255,.75)">
        LES MÊMES
      </BigLabel>
      <BigLabel top={310} k={wK} size={124} color={PINK}>
        {words[phase]}
      </BigLabel>
      <div style={{ position: "absolute", top: 500, left: 110, right: 110, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", rowGap: 28, justifyItems: "center" }}>
        {Array.from({ length: 9 }).map((_, i) => {
          const k = spring({ frame: (local - 0.05 - i * 0.06) * FPS, fps: FPS, config: { damping: 11, stiffness: 200, mass: 0.6 } });
          const shake = Math.sin(local * 20 + i) * (phase === 2 ? 2 : 0);
          return (
            <div key={i} style={{ transform: `scale(${k}) translateX(${shake}px)`, opacity: k }}>
              <FaceCard size={190} tone="#d9a689" lips={phase === 0 ? "#ff5c9e" : "#c8566f"} glow={phase === 0 ? 0.4 : 0} />
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 300,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 34,
          color: "rgba(255,255,255,.55)",
          letterSpacing: "0.2em",
        }}
      >
        COPIER · COLLER · RÉPÉTER
      </div>
    </Backdrop>
  );
};

/** "Ne pas créer des visages standardisés": one face breaks out of the grid. */
const Unique: React.FC<{ local: number; dur: number; m: BrollMotion }> = ({ local, dur, m }) => {
  const reveal = interpolate(local, [0.9, 1.3], [0, 1], clamp);
  const revealK = spring({ frame: (local - 0.9) * FPS, fps: FPS, config: { damping: 10, stiffness: 160 } });
  const titleK = spring({ frame: local * FPS, fps: FPS, config: { damping: 14 } });
  return (
    <Backdrop local={local} dur={dur} m={m}>
      <BigLabel top={230} k={titleK} size={92} color={reveal > 0.5 ? "rgba(255,255,255,.35)" : "#fff"}>
        <span style={{ textDecoration: reveal > 0.5 ? `line-through ${PINK} 10px` : "none" }}>STANDARDISÉS</span>
      </BigLabel>
      <BigLabel top={350} k={revealK} size={140} color={PINK}>
        UNIQUE
      </BigLabel>
      <div style={{ position: "absolute", top: 560, left: 80, right: 80, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", rowGap: 28, justifyItems: "center" }}>
        {Array.from({ length: 12 }).map((_, i) => {
          const hero = i === 5;
          const k = spring({ frame: (local - i * 0.035) * FPS, fps: FPS, config: { damping: 12, stiffness: 200, mass: 0.6 } });
          const dim = hero ? 1 : 1 - 0.65 * reveal;
          return (
            <div
              key={i}
              style={{
                transform: `scale(${k * (hero ? 1 + 0.45 * revealK : 1)})`,
                opacity: k * dim,
                zIndex: hero ? 2 : 1,
                filter: hero ? "none" : `grayscale(${0.3 + 0.7 * reveal})`,
              }}
            >
              <FaceCard size={165} tone={hero ? "#e7b493" : "#b8a8a0"} lips={hero ? PINK : "#9c7f86"} glow={hero ? revealK : 0} />
            </div>
          );
        })}
      </div>
    </Backdrop>
  );
};

// Face landmarks in SOURCE pixels (1080×1920), measured on the frame at ~44s.
const FACE = { x0: 405, x1: 695, y0: 440, y1: 850 };
const LANDMARKS: [number, number][] = [
  [456, 598], // eye L
  [584, 598], // eye R
  [524, 697], // nose
  [474, 753], // mouth L
  [566, 753], // mouth R
  [530, 835], // chin
  [432, 677], // cheek L
  [640, 667], // cheek R
  [536, 465], // forehead
];
const LINKS: [number, number][] = [
  [0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5], [6, 0], [7, 1], [6, 3], [7, 4], [8, 0], [8, 1],
];

/** Face-scan HUD drawn over the real face. Rendered inside the zoomed layer so it follows the zoom. */
export const AnalysisOverlay: React.FC<{ local: number; dur: number }> = ({ local, dur }) => {
  const outK = interpolate(local, [dur - 0.25, dur], [1, 0], clamp);
  const brK = spring({ frame: local * FPS, fps: FPS, config: { damping: 14, stiffness: 200 } });
  const scan = interpolate(local, [0.15, 1.1], [0, 1], clamp);
  const lines = interpolate(local, [0.5, 1.4], [0, 1], clamp);
  const { x0, x1, y0, y1 } = FACE;
  const pad = 40 * (1 - brK);
  const c = 46;
  const stroke = { stroke: "#fff", strokeWidth: 5, fill: "none", strokeLinecap: "round" as const };
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, opacity: outK }}>
      <g opacity={brK} style={{ filter: `drop-shadow(0 0 8px ${PINK})` }}>
        <path d={`M${x0 - pad} ${y0 - pad + c}V${y0 - pad}H${x0 - pad + c}`} {...stroke} />
        <path d={`M${x1 + pad - c} ${y0 - pad}H${x1 + pad}V${y0 - pad + c}`} {...stroke} />
        <path d={`M${x0 - pad} ${y1 + pad - c}V${y1 + pad}H${x0 - pad + c}`} {...stroke} />
        <path d={`M${x1 + pad - c} ${y1 + pad}H${x1 + pad}V${y1 + pad - c}`} {...stroke} />
      </g>
      {scan > 0 && scan < 1 ? (
        <rect x={x0} y={y0 + (y1 - y0) * scan - 3} width={x1 - x0} height={6} fill={TEAL} opacity={0.9} style={{ filter: `drop-shadow(0 0 14px ${TEAL})` }} />
      ) : null}
      <g stroke={PINK} strokeWidth={2.5} opacity={0.85}>
        {LINKS.map(([a, b], i) => {
          const k = interpolate(lines, [i / LINKS.length, Math.min((i + 2) / LINKS.length, 1)], [0, 1], clamp);
          const [ax, ay] = LANDMARKS[a];
          const [bx, by] = LANDMARKS[b];
          return <line key={i} x1={ax} y1={ay} x2={ax + (bx - ax) * k} y2={ay + (by - ay) * k} />;
        })}
      </g>
      {LANDMARKS.map(([x, y], i) => {
        const k = spring({ frame: (local - 0.3 - i * 0.05) * FPS, fps: FPS, config: { damping: 10, stiffness: 240 } });
        return <circle key={i} cx={x} cy={y} r={9 * k} fill="#fff" stroke={PINK} strokeWidth={4} />;
      })}
      <g opacity={interpolate(local, [0.9, 1.2], [0, 1], clamp)} fontFamily="'JetBrains Mono', ui-monospace, monospace" fontSize={30} fill="#fff">
        <rect x={540 - 210} y={y1 + 50} width={420} height={70} rx={14} fill="rgba(8,12,14,.72)" stroke={PINK} strokeWidth={2} />
        <text x={540} y={y1 + 96} textAnchor="middle">
          <tspan>PROPORTIONS · </tspan>
          <tspan fill={PINK}>φ 1.618</tspan>
        </text>
      </g>
    </svg>
  );
};

/** Full-screen b-roll layer (everything except the face overlay). */
export const BrollFull: React.FC<{ item: Item; local: number; m: BrollMotion }> = ({ item, local, m }) => {
  if (item.kind === "clones") return <Clones local={local} dur={item.dur} m={m} />;
  if (item.kind === "unique") return <Unique local={local} dur={item.dur} m={m} />;
  if (item.kind === "user" && item.src) {
    const { inK, outK } = enterExit(local, item.dur, m);
    return (
      <AbsoluteFill style={{ opacity: Math.min(Math.max(inK, 0) * 1.4, 1) * outK, transform: `scale(${lerp(m.fromScale, 1, inK)})`, background: "#000" }}>
        <OffthreadVideo src={item.src} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
    );
  }
  return null;
};
