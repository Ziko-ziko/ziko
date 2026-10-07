import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { faceAt, M, project } from "./data";
import { PINK, SANS } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Screen-space face box (follows the tracked face through the zoom). */
function useFaceBox(t: number) {
  const f = faceAt(t);
  const tl = project(t, f.cx - f.w / 2, f.cy - f.h / 2);
  const br = project(t, f.cx + f.w / 2, f.cy + f.h / 2);
  return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
}

const Label: React.FC<{ y: number; text: string; p: number; side: "l" | "r" }> = ({ y, text, p, side }) => (
  <div
    style={{
      position: "absolute",
      left: side === "l" ? 36 : undefined,
      right: side === "r" ? 36 : undefined,
      top: y - 22,
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexDirection: side === "l" ? "row-reverse" : "row",
      opacity: p,
      transform: `translateX(${(1 - p) * (side === "r" ? -30 : 30)}px)`,
    }}
  >
    <div style={{ width: 40 * p, height: 2, background: "rgba(255,255,255,0.85)" }} />
    <div
      style={{
        fontFamily: SANS,
        fontWeight: 800,
        fontSize: 31,
        letterSpacing: "0.2em",
        color: "#fff",
        background: "rgba(10,8,12,0.55)",
        border: `1.5px solid ${PINK}`,
        padding: "8px 14px 8px 18px",
        borderRadius: 8,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  </div>
);

/** "Analysis" overlay for: globalité / proportions / équilibre / unique. */
export const FaceAnalysis: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const box = useFaceBox(t);
  if (t < from || t > to) return null;

  const on = (at: number, d = 0.45) => interpolate(t, [at, at + d], [0, 1], clamp);
  const fadeOut = interpolate(t, [M.unique - 0.1, M.unique + 0.3], [1, 0], clamp);
  const brackets = on(from, 0.35) * fadeOut;
  const circle = on(M.globalite - 0.1, 0.7) * fadeOut;
  const thirds = on(M.proportions - 0.1, 0.6) * fadeOut;
  const center = on(M.equilibre - 0.1, 0.6) * fadeOut;

  const cx = box.x + box.w / 2;
  const top = box.y - box.h * 0.18;
  const bottom = box.y + box.h * 1.12;
  const R = box.h * 0.78;
  const circ = 2 * Math.PI * R;
  const lines = [0.4, 0.66, 0.86].map((k) => box.y + box.h * k);
  const br = 40;
  const corner = (x: number, y: number, sx: number, sy: number) => `M${x} ${y + sy * br} L${x} ${y} L${x + sx * br} ${y}`;
  const sparkle = spring({ frame: frame - Math.round(M.unique * fps), fps, config: { damping: 10, stiffness: 120 } });
  const sparkleOut = interpolate(t, [M.unique + 0.9, M.unique + 1.3], [1, 0], clamp);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <g stroke="#fff" strokeWidth={3} fill="none" opacity={brackets}>
          <path d={corner(box.x - 20, box.y - 30, 1, 1)} />
          <path d={corner(box.x + box.w + 20, box.y - 30, -1, 1)} />
          <path d={corner(box.x - 20, box.y + box.h + 50, 1, -1)} />
          <path d={corner(box.x + box.w + 20, box.y + box.h + 50, -1, -1)} />
        </g>
        <circle
          cx={cx}
          cy={box.y + box.h * 0.5}
          r={R}
          stroke={PINK}
          strokeWidth={2.5}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - circle)}
          transform={`rotate(-90 ${cx} ${box.y + box.h * 0.5})`}
          opacity={fadeOut}
        />
        {lines.map((y, i) => (
          <line
            key={i}
            x1={cx - (box.w * 0.75) * thirds}
            x2={cx + (box.w * 0.75) * thirds}
            y1={y}
            y2={y}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth={1.8}
            strokeDasharray="10 8"
          />
        ))}
        <line x1={cx} x2={cx} y1={top} y2={top + (bottom - top) * center} stroke={PINK} strokeWidth={2.5} />
        {[0, 1].map((side) => (
          <circle key={side} cx={cx + (side ? 1 : -1) * box.w * 0.42} cy={lines[0]} r={7 * center} fill={PINK} />
        ))}
      </svg>
      <Label y={lines[0] - 120} text="GLOBALITÉ" p={on(M.globalite, 0.3) * fadeOut} side="l" />
      <Label y={lines[1]} text="PROPORTIONS" p={on(M.proportions, 0.3) * fadeOut} side="r" />
      <Label y={lines[2] + 150} text="ÉQUILIBRE" p={on(M.equilibre, 0.3) * fadeOut} side="l" />
      {t >= M.unique && (
        <div style={{ position: "absolute", left: 0, right: 0, top: box.y - 170, textAlign: "center", opacity: sparkleOut }}>
          <span
            style={{
              display: "inline-block",
              fontFamily: SANS,
              fontWeight: 900,
              fontSize: 64,
              letterSpacing: "0.12em",
              color: "#fff",
              background: PINK,
              padding: "10px 30px 12px 38px",
              borderRadius: 16,
              transform: `scale(${sparkle}) rotate(-3deg)`,
              boxShadow: "0 0 60px rgba(255,63,164,0.7)",
            }}
          >
            ✦ UNIQUE
          </span>
        </div>
      )}
    </div>
  );
};

/** "Une toute petite correction" + "harmoniser": tiny slider, then symmetry line. */
export const Harmony: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const box = useFaceBox(t);
  const startC = M.correction - 0.5;
  const endH = M.harmoniser + 1.25;
  if (t < startC || t > endH) return null;

  const slider = interpolate(t, [startC, startC + 0.3, M.correction + 0.2, M.correction + 0.6], [0, 1, 1, 1], clamp);
  const knob = interpolate(t, [M.correction, M.correction + 0.5], [0.5, 0.56], clamp);
  const sliderOut = interpolate(t, [M.harmoniser - 0.45, M.harmoniser - 0.3], [1, 0], clamp);
  const sym = interpolate(t, [M.harmoniser - 0.1, M.harmoniser + 0.4], [0, 1], clamp);
  const symOut = interpolate(t, [endH - 0.3, endH], [1, 0], clamp);
  const cx = box.x + box.w / 2;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* correction slider */}
      <div
        style={{
          position: "absolute",
          left: 190,
          right: 190,
          top: 1030,
          opacity: slider * sliderOut,
          transform: `translateY(${(1 - slider) * 30}px)`,
        }}
      >
        <div style={{ height: 8, borderRadius: 8, background: "rgba(255,255,255,0.25)" }}>
          <div style={{ width: `${knob * 100}%`, height: 8, borderRadius: 8, background: PINK }} />
        </div>
        <div
          style={{
            position: "absolute",
            left: `calc(${knob * 100}% - 20px)`,
            top: -16,
            width: 40,
            height: 40,
            borderRadius: 40,
            background: "#fff",
            boxShadow: `0 0 0 6px rgba(255,63,164,0.35)`,
          }}
        />
      </div>
      {/* symmetry */}
      {sym > 0 && (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: symOut }}>
          <line x1={cx} x2={cx} y1={box.y - box.h * 0.3} y2={box.y - box.h * 0.3 + box.h * 1.6 * sym} stroke="#fff" strokeWidth={2.5} />
          {[-1, 1].map((s) => (
            <path
              key={s}
              d={`M${cx + s * box.w * 0.15} ${box.y + box.h * 0.2} Q ${cx + s * box.w * 0.75} ${box.y + box.h * 0.55} ${cx + s * box.w * 0.15} ${box.y + box.h * 1.05}`}
              stroke={PINK}
              strokeWidth={3}
              fill="none"
              strokeDasharray={800}
              strokeDashoffset={800 * (1 - sym)}
            />
          ))}
        </svg>
      )}
      {sym > 0 && (
        <div style={{ position: "absolute", top: box.y - box.h * 0.45, left: 0, right: 0, textAlign: "center", opacity: sym * symOut }}>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 30, letterSpacing: "0.4em", color: "#fff", textShadow: "0 2px 14px rgba(0,0,0,0.6)" }}>
            HARMONIE
          </span>
        </div>
      )}
    </div>
  );
};
