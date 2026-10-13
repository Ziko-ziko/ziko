import React, { useMemo } from "react";
import { lerp, prog } from "./motion";
import { ReelProps, Word, chunksOf, wordsOf } from "./schema";

export const CAPTION_FONT = "'Montserrat', 'Arial Black', 'Helvetica Neue', sans-serif";

const OUTLINE =
  "0 0 2px #000, 3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000, 0 4px 0 #000, 0 -4px 0 #000, 4px 0 0 #000, -4px 0 0 #000, 0 10px 24px rgba(0,0,0,.55)";

/** `s` = current SOURCE time. */
export const Captions: React.FC<{ p: ReelProps; s: number }> = ({ p, s }) => {
  const chunks = useMemo(() => wordsOf(p.captions).flatMap(chunksOf), [p.captions]);
  const chunk = chunks.find((c) => s >= c[0].start - 0.02 && s < c[c.length - 1].end + 0.12);
  if (!chunk) return null;

  const mc = p.motion.caption;
  const mw = p.motion.word;
  const enter = prog(s - chunk[0].start, mc.dur, mc.ease);
  const size = p.captionSize;

  const wordEl = (w: Word, i: number) => {
    const active = s >= w.start && s < w.end;
    const spoken = s >= w.start;
    const wPop = prog(s - w.start, mw.dur, mw.ease);
    const lift = active ? `translateY(${-mw.lift * wPop}px) ` : "";
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
            transform: active ? `${lift}scale(${1 + mw.scale * wPop}) rotate(-2deg)` : "none",
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
            transform: active ? `${lift}scale(${1 + mw.scale * 0.7 * wPop})` : "none",
          }}
        >
          {w.text}
        </span>
      );
    }
    return (
      <span key={i} style={{ ...base, color: active ? "#0f8f8a" : "#111", transform: active ? `${lift}scale(${1 + mw.scale * 0.5 * wPop})` : "none" }}>
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
        transform: `translateY(-50%) translateY(${lerp(mc.fromY, 0, enter)}px) scale(${lerp(mc.fromScale, 1, enter)}) rotate(${lerp(mc.fromRot, 0, enter)}deg)`,
        opacity: Math.min(Math.max(enter, 0) * 1.5, 1),
        filter: mc.fromBlur > 0 && enter < 1 ? `blur(${mc.fromBlur * (1 - Math.min(enter, 1))}px)` : undefined,
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
  const mh = p.motion.hook;
  const subIn = prog(s - 0.45, mh.dur, mh.ease);
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
          const k = prog(s - i * mh.stagger, mh.dur, mh.ease);
          return (
            <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - k) * mh.fromY}px) scale(${k})`, opacity: Math.min(Math.max(k, 0), 1) }}>
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
