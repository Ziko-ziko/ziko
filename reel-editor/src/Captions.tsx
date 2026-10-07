import React, { useMemo } from "react";
import { spring } from "remotion";
import { FPS, ReelProps, Word, chunksOf, wordsOf } from "./schema";

export const CAPTION_FONT = "'Montserrat', 'Arial Black', 'Helvetica Neue', sans-serif";

const OUTLINE =
  "0 0 2px #000, 3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000, 0 4px 0 #000, 0 -4px 0 #000, 4px 0 0 #000, -4px 0 0 #000, 0 10px 24px rgba(0,0,0,.55)";

/** `s` = current SOURCE time. */
export const Captions: React.FC<{ p: ReelProps; s: number }> = ({ p, s }) => {
  const chunks = useMemo(() => wordsOf(p.captions).flatMap(chunksOf), [p.captions]);
  const chunk = chunks.find((c) => s >= c[0].start - 0.02 && s < c[c.length - 1].end + 0.12);
  if (!chunk) return null;

  const enter = spring({ frame: (s - chunk[0].start) * FPS, fps: FPS, config: { damping: 12, stiffness: 220, mass: 0.5 } });
  const size = p.captionSize;

  const wordEl = (w: Word, i: number) => {
    const active = s >= w.start && s < w.end;
    const spoken = s >= w.start;
    const wPop = spring({ frame: (s - w.start) * FPS, fps: FPS, config: { damping: 10, stiffness: 260, mass: 0.4 } });
    const base: React.CSSProperties = { display: "inline-block", margin: `0 ${size * 0.12}px`, whiteSpace: "nowrap" };

    if (p.captionStyle === "pop") {
      return (
        <span
          key={i}
          style={{
            ...base,
            color: "#fff",
            textShadow: active ? "none" : OUTLINE,
            background: active ? "#ff3d9a" : "transparent",
            borderRadius: size * 0.22,
            padding: `0 ${size * 0.16}px`,
            transform: active ? `scale(${1 + 0.12 * wPop}) rotate(-2deg)` : "none",
            boxShadow: active ? "0 8px 26px rgba(255,61,154,.55)" : "none",
          }}
        >
          {w.text}
        </span>
      );
    }
    if (p.captionStyle === "karaoke") {
      return (
        <span
          key={i}
          style={{
            ...base,
            color: spoken ? "#ffe14d" : "rgba(255,255,255,.9)",
            textShadow: OUTLINE,
            transform: active ? `translateY(${-8 * wPop}px) scale(${1 + 0.08 * wPop})` : "none",
          }}
        >
          {w.text}
        </span>
      );
    }
    return (
      <span key={i} style={{ ...base, color: active ? "#0f8f8a" : "#111", transform: active ? `scale(${1 + 0.06 * wPop})` : "none" }}>
        {w.text}
      </span>
    );
  };

  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: `${p.captionY * 100}%`,
        display: "flex",
        justifyContent: "center",
        transform: `translateY(-50%) translateY(${(1 - enter) * 40}px) scale(${0.75 + 0.25 * enter})`,
        opacity: Math.min(enter * 1.5, 1),
      }}
    >
      <div
        style={{
          fontFamily: CAPTION_FONT,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.25,
          textAlign: "center",
          letterSpacing: "-0.01em",
          ...(p.captionStyle === "box"
            ? { background: "#fff", borderRadius: 22, padding: "10px 22px", boxShadow: "0 14px 40px rgba(0,0,0,.4)" }
            : {}),
        }}
      >
        {chunk.map(wordEl)}
      </div>
    </div>
  );
};

/** Big animated title over the first seconds. */
export const Hook: React.FC<{ p: ReelProps; s: number }> = ({ p, s }) => {
  if (!p.hook.on || s >= p.hook.until) return null;
  const out = Math.min((p.hook.until - s) / 0.25, 1);
  const letters = [...p.hook.text];
  const subIn = spring({ frame: (s - 0.45) * FPS, fps: FPS, config: { damping: 14 } });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: "60%",
        textAlign: "center",
        fontFamily: CAPTION_FONT,
        opacity: out,
        transform: `scale(${0.9 + 0.1 * out})`,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 150, color: "#fff", letterSpacing: "0.02em", textShadow: "0 0 40px rgba(255,61,154,.8), 0 12px 30px rgba(0,0,0,.6)" }}>
        {letters.map((ch, i) => {
          const k = spring({ frame: (s - i * 0.04) * FPS, fps: FPS, config: { damping: 11, stiffness: 200, mass: 0.5 } });
          return (
            <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - k) * 80}px) scale(${k})`, opacity: k }}>
              {ch === " " ? " " : ch}
            </span>
          );
        })}
      </div>
      {p.hook.sub ? (
        <div
          style={{
            display: "inline-block",
            marginTop: 18,
            padding: "12px 30px",
            borderRadius: 999,
            background: "#ff3d9a",
            color: "#fff",
            fontWeight: 800,
            fontSize: 50,
            transform: `scale(${subIn})`,
            boxShadow: "0 10px 30px rgba(255,61,154,.5)",
          }}
        >
          {p.hook.sub}
        </div>
      ) : null}
    </div>
  );
};
