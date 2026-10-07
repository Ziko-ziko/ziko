import React from "react";
import { interpolate, spring } from "remotion";
import { FPS, IconId } from "./schema";

// Line icons on a 48×48 grid. Every shape uses pathLength=1 so it can be "drawn" in.
const P: React.FC<{ d: string }> = ({ d }) => <path d={d} pathLength={1} />;

export const ICON_PATHS: Record<IconId, React.ReactNode> = {
  face: (
    <>
      <P d="M24 6c-8.3 0-14 6.6-14 15.5C10 32 16.4 42 24 42s14-10 14-20.5C38 12.6 32.3 6 24 6z" />
      <P d="M17.5 20.5h4M26.5 20.5h4" />
      <P d="M24 22v6.5h-2" />
      <P d="M19.5 33c2.8 2 6.2 2 9 0" />
    </>
  ),
  fingerprint: (
    <>
      <P d="M14 36c-2-3.5-3-7.5-3-12a13 13 0 0 1 26 0" />
      <P d="M19 40c-1.8-3.6-2.8-7.8-2.8-12.6a7.8 7.8 0 0 1 15.6 0c0 3-.3 6-1 8.6" />
      <P d="M24 26.5c0 5 1 9.5 3 13.5" />
      <P d="M37 30c-.2 3.2-.8 6-1.8 8.5" />
    </>
  ),
  phone: (
    <>
      <P d="M15 5h18a3 3 0 0 1 3 3v32a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z" />
      <P d="M21 38h6" />
      <P d="M24 30s-7-4.2-7-9a3.8 3.8 0 0 1 7-2 3.8 3.8 0 0 1 7 2c0 4.8-7 9-7 9z" />
    </>
  ),
  lips: (
    <>
      <P d="M6 24c5-6 9-8 12-6l6 2 6-2c3-2 7 0 12 6" />
      <P d="M6 24c5 7 11 10 18 10s13-3 18-10" />
      <P d="M6 24h36" />
    </>
  ),
  alert: (
    <>
      <P d="M24 6 4 41h40L24 6z" />
      <P d="M24 19v11" />
      <P d="M24 35v.5" />
    </>
  ),
  message: (
    <>
      <P d="M8 10h32a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H22l-9 7v-7H8a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z" />
      <P d="M14 19h20M14 25h13" />
    </>
  ),
  syringe: (
    <>
      <P d="M33 5l10 10" />
      <P d="M38 10 18 30l-6-6 20-20" />
      <P d="M12 24l-4 4 6 6 4-4" />
      <P d="M8 34 3 39" />
      <P d="M23 17l3 3M27 13l3 3" />
    </>
  ),
  balance: (
    <>
      <P d="M24 6v34M14 42h20" />
      <P d="M8 12h32" />
      <P d="M8 12 3 26a6 6 0 0 0 10 0L8 12z" />
      <P d="M40 12l-5 14a6 6 0 0 0 10 0l-5-14z" />
    </>
  ),
  sparkle: (
    <>
      <P d="M22 6l3.5 10.5L36 20l-10.5 3.5L22 34l-3.5-10.5L8 20l10.5-3.5L22 6z" />
      <P d="M37 30l1.5 4.5L43 36l-4.5 1.5L37 42l-1.5-4.5L31 36l4.5-1.5L37 30z" />
    </>
  ),
  heart: (
    <>
      <P d="M24 41S6 30.5 6 18a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 12.5-18 23-18 23z" />
      <P d="M15 18a4 4 0 0 1 4-4" />
    </>
  ),
  copies: (
    <>
      <P d="M16 4h20a3 3 0 0 1 3 3v24a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z" />
      <P d="M9 12v26a3 3 0 0 0 3 3h20" />
      <P d="M21 14h10M21 20h10M21 26h6" />
    </>
  ),
};

export const ICON_SHOW = 1.6; // seconds on screen

/** One popping icon badge. `local` = seconds since the icon's start (source time). */
export const IconBadge: React.FC<{ icon: IconId; local: number; side: "left" | "right" }> = ({ icon, local, side }) => {
  const f = local * FPS;
  const pop = spring({ frame: f, fps: FPS, config: { damping: 9, stiffness: 160, mass: 0.6 } });
  const out = interpolate(local, [ICON_SHOW - 0.25, ICON_SHOW], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const draw = interpolate(local, [0.05, 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const float = Math.sin(local * 4) * 6;
  const size = 200;
  return (
    <div
      style={{
        position: "absolute",
        top: 250 + float,
        [side]: 90,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "radial-gradient(circle at 35% 30%, rgba(40,52,58,0.85), rgba(8,12,14,0.85))",
        border: "5px solid #ff3d9a",
        boxShadow: "0 0 40px rgba(255,61,154,0.65), 0 18px 40px rgba(0,0,0,0.45)",
        display: "grid",
        placeItems: "center",
        transform: `scale(${pop * out}) rotate(${(1 - pop) * (side === "left" ? -25 : 25)}deg)`,
      }}
    >
      <svg
        width={size * 0.56}
        height={size * 0.56}
        viewBox="0 0 48 48"
        fill="none"
        stroke="#ffffff"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      >
        {ICON_PATHS[icon]}
      </svg>
    </div>
  );
};
