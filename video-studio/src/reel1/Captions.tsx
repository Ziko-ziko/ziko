import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DATA, M } from "./data";
import { PINK, SANS } from "./theme";

/** Word-by-word captions: 1-3 words per page, a pink box follows the spoken word. */
export const Captions: React.FC<{ y?: number }> = ({ y = 1300 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t > M.speechEnd - 0.05 || t >= M.standardises - 0.05) return null;

  const pages = DATA.pages.map((idx) => idx.map((i) => DATA.words[i]));
  const pi = pages.findIndex((p, i) => {
    const next = pages[i + 1];
    return t >= p[0].start - 0.05 && (!next || t < next[0].start - 0.05);
  });
  if (pi < 0) return null;
  const page = pages[pi];
  if (t > page[page.length - 1].end + 0.6) return null;

  const enterFrame = Math.round((page[0].start - 0.05) * fps);
  const pop = spring({ frame: frame - enterFrame, fps, config: { damping: 14, stiffness: 220, mass: 0.6 } });

  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: y,
        transform: `translateY(-50%) scale(${interpolate(pop, [0, 1], [0.82, 1])})`,
        opacity: interpolate(pop, [0, 1], [0, 1]),
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "6px 18px",
        fontFamily: SANS,
        fontWeight: 900,
        fontSize: 82,
        lineHeight: 1.08,
        textTransform: "uppercase",
        letterSpacing: "-0.01em",
      }}
    >
      {page.map((w, i) => {
        const next = page[i + 1] ?? DATA.words[DATA.words.indexOf(w) + 1];
        const active = t >= w.start && t < (next ? Math.min(next.start, w.end + 0.25) : w.end + 0.25);
        const spoken = t >= w.start;
        const wf = Math.round(w.start * fps);
        const bump = spring({ frame: frame - wf, fps, config: { damping: 12, stiffness: 260, mass: 0.5 } });
        return (
          <span
            key={i}
            style={{
              position: "relative",
              padding: "2px 14px 6px",
              color: active ? "#fff" : spoken && w.emph ? PINK : "#fff",
              textShadow: active ? "none" : "0 4px 20px rgba(0,0,0,0.65), 0 0 2px rgba(0,0,0,0.5)",
              transform: `scale(${active ? interpolate(bump, [0, 1], [1, 1.08]) : 1}) rotate(${active ? -2 : 0}deg)`,
              display: "inline-block",
            }}
          >
            {active && (
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  background: PINK,
                  borderRadius: 14,
                  zIndex: -1,
                  boxShadow: "0 10px 30px rgba(255,63,164,0.45)",
                }}
              />
            )}
            {w.text.replace(/[.,]$/, "")}
          </span>
        );
      })}
    </div>
  );
};
