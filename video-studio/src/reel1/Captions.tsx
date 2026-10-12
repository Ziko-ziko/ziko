import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DATA, M, type Word } from "./data";
import { useStyle } from "./style";
import { blurOutUp } from "./TextAnim";

/** Group words into caption pages: up to `max` words / ~18 chars, break after punctuation. */
function buildPages(words: Word[], max: number): Word[][] {
  const pages: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    const chars = cur.reduce((n, x) => n + x.text.length + 1, 0);
    if (cur.length >= max || (max > 1 && chars > 6 * max) || /[,.]$/.test(w.text)) {
      pages.push(cur);
      cur = [];
    }
  }
  if (cur.length) pages.push(cur);
  return pages;
}

/** Word-by-word captions; the spoken word is highlighted. */
export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { captions: c, fonts } = useStyle();
  const t = frame / fps;
  if (!c.show || t > M.speechEnd - 0.05 || t >= M.standardises - 0.05) return null;

  const pages = buildPages(DATA.words, c.maxWordsPerPage);
  const pi = pages.findIndex((p, i) => {
    const next = pages[i + 1];
    return t >= p[0].start - 0.05 && (!next || t < next[0].start - 0.05);
  });
  if (pi < 0) return null;
  const page = pages[pi];
  if (t > page[page.length - 1].end + 0.6) return null;

  const enterAt = page[0].start - 0.05;
  const enterFrame = Math.round(enterAt * fps);
  const springPop = spring({ frame: frame - enterFrame, fps, config: { damping: 14, stiffness: 220, mass: 0.6 } });
  const pop = c.enterAnimation === "pop" ? springPop : 1;
  const nextPage = pages[pi + 1];
  const pageEnd = nextPage ? nextPage[0].start - 0.05 : page[page.length - 1].end + 0.6;
  const exit = c.exitAnimation === "blurOutUp" ? blurOutUp(t, pageEnd - 0.14, pageEnd) : {};
  let charIdx = 0;

  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: c.y,
        transform: `translateY(-50%) scale(${interpolate(pop, [0, 1], [0.82, 1])})`,
        opacity: interpolate(pop, [0, 1], [0, 1]),
        ...exit,
        ...(exit.transform ? { transform: `translateY(-50%) ${exit.transform}` } : {}),
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `${c.fontSize * 0.08}px ${c.fontSize * 0.2}px`,
        fontFamily: "var(--body-font)",
        fontWeight: Number(c.fontWeight),
        fontStyle: c.italic ? "italic" : "normal",
        fontSize: c.fontSize,
        lineHeight: 1.08,
        textTransform: c.uppercase ? "uppercase" : "none",
        letterSpacing: `${c.letterSpacing}em`,
      }}
    >
      {page.map((w, i) => {
        const next = page[i + 1] ?? DATA.words[DATA.words.indexOf(w) + 1];
        const active = t >= w.start && t < (next ? Math.min(next.start, w.end + 0.25) : w.end + 0.25);
        const spoken = t >= w.start;
        const bump = spring({ frame: frame - Math.round(w.start * fps), fps, config: { damping: 12, stiffness: 260, mass: 0.5 } });
        const box = active && c.highlightStyle === "box";
        const wordIdx = i;
        const chars = Array.from(w.text.replace(/[.,]$/, ""));
        const firstChar = charIdx;
        charIdx += chars.length;
        let color = spoken && w.emph ? c.emphasisColor : c.textColor;
        if (active && c.highlightStyle === "box") color = c.highlightTextColor;
        if (active && (c.highlightStyle === "color" || c.highlightStyle === "underline")) color = c.emphasisColor;
        const titleWord = fonts.emphasisInTitleFont && w.emph;
        return (
          <span
            key={i}
            style={{
              ...(titleWord ? { fontFamily: "var(--title-font)", fontWeight: "var(--title-weight)" as never, fontStyle: "var(--title-style)" as never, textTransform: "none", fontSize: "1.12em", lineHeight: 1 } : {}),
              position: "relative",
              display: "inline-block",
              padding: `${c.fontSize * 0.02}px ${c.fontSize * 0.17}px ${c.fontSize * 0.07}px`,
              color,
              textShadow: c.shadow && !box ? "0 4px 20px rgba(0,0,0,0.65), 0 0 2px rgba(0,0,0,0.5)" : "none",
              transform: active
                ? `scale(${interpolate(bump, [0, 1], [1, c.activeWordScale])}) rotate(${c.activeWordRotation}deg)`
                : "none",
            }}
          >
            {box && (
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  background: c.emphasisColor,
                  borderRadius: c.fontSize * 0.17,
                  zIndex: -1,
                  boxShadow: `0 10px 30px ${c.emphasisColor}73`,
                }}
              />
            )}
            {active && c.highlightStyle === "underline" && (
              <span
                style={{
                  position: "absolute",
                  left: c.fontSize * 0.17,
                  right: c.fontSize * 0.17,
                  bottom: 0,
                  height: c.fontSize * 0.08,
                  borderRadius: 4,
                  background: c.emphasisColor,
                }}
              />
            )}
            {c.enterAnimation === "perCharacterRise"
              ? chars.map((ch, ci) => {
                  const p = spring({ frame: frame - enterFrame - Math.round((firstChar + ci) * 0.6), fps, config: { damping: 16, stiffness: 240, mass: 0.5 } });
                  return (
                    <span key={ci} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 0.5}em)` }}>
                      {ch}
                    </span>
                  );
                })
              : c.enterAnimation === "lineByLineSlide"
                ? (() => {
                    const p = spring({ frame: frame - enterFrame - wordIdx * 3, fps, config: { damping: 18, stiffness: 160 } });
                    return <span style={{ display: "inline-block", opacity: p, transform: `translateX(${(1 - p) * -60}px)` }}>{chars.join("")}</span>;
                  })()
                : chars.join("")}
          </span>
        );
      })}
    </div>
  );
};
