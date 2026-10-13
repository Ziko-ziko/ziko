import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Player, PlayerRef } from "@remotion/player";
import { ReelEdit } from "../src/ReelEdit";
import { defaultReel } from "../src/data";
import { ICON_PATHS } from "../src/Icons";
import {
  BROLL_KINDS,
  CAPTION_STYLES,
  Clip,
  FPS,
  GRADES,
  GRADE_IDS,
  ICON_IDS,
  IconId,
  ReelProps,
  SOURCE_SEC,
  allCuts,
  boundaries,
  chunksOf,
  clipsOf,
  outDuration,
  outToSrc,
  srcToOut,
  wordsOf,
} from "../src/schema";
import waveform from "../src/waveform.json";
import { GraphEditor, MotionPanel } from "./keyframes";

const STORE_KEY = "reel-edit-v3";
const OLD_KEYS = ["reel-edit-v2"];
const HISTORY_GAP = 450; // ms
const HISTORY_MAX = 200;
const TAB_KEY = "reel-edit-tab";
const LANE_LABEL = 52; // px, matches .track grid label column
const MIN_GAP = 0.4;
// caption lines Whisper heard badly — flagged in the list so they get checked
const GUESS_STARTS = new Set([5.15, 10.5, 51.75]);

const ZOOM_PRESETS = [
  { v: 1.0, label: "واسع" },
  { v: 1.07, label: "متوسط" },
  { v: 1.2, label: "قريب" },
  { v: 1.32, label: "الوجه" },
];
const ICON_NAMES: Record<IconId, string> = {
  face: "وجه",
  fingerprint: "بصمة",
  phone: "تيليفون",
  lips: "شفايف",
  alert: "تنبيه",
  message: "رسالة",
  syringe: "إبرة",
  balance: "ميزان",
  sparkle: "لمعة",
  heart: "قلب",
  copies: "نسخ",
};
const BROLL_NAMES: Record<(typeof BROLL_KINDS)[number], string> = {
  clones: "وجوه متشابهة",
  analysis: "تحليل الوجه",
  unique: "وجه فريد",
  user: "فيديو ديالك",
};
const CAPTION_STYLE_NAMES: Record<(typeof CAPTION_STYLES)[number], string> = {
  pop: "Pop وردي",
  karaoke: "كاراوكي",
  box: "صندوق أبيض",
};
const TABS = [
  { id: "takes", label: "اللقطات" },
  { id: "subs", label: "الترجمة" },
  { id: "icons", label: "الأيقونات" },
  { id: "broll", label: "B-roll" },
  { id: "motion", label: "الحركة" },
  { id: "look", label: "الستايل" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const tryGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const trySet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

const load = (): ReelProps => {
  const raw = tryGet(STORE_KEY) ?? OLD_KEYS.map(tryGet).find(Boolean) ?? null;
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      // nested groups merge with the defaults so older saves pick up new settings
      return {
        ...defaultReel,
        ...saved,
        src: defaultReel.src,
        keys: { ...defaultReel.keys, ...(saved.keys ?? {}) },
        motion: Object.fromEntries(
          Object.entries(defaultReel.motion).map(([k, v]) => [k, { ...v, ...(saved.motion?.[k] ?? {}) }]),
        ) as ReelProps["motion"],
      };
    } catch {}
  }
  return defaultReel;
};

const tc = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  return `${String(m).padStart(2, "0")}:${sec.toFixed(2).padStart(5, "0")}`;
};
const lanePos = (t: number, dur: number) => `calc(${LANE_LABEL}px + (100% - ${LANE_LABEL}px) * ${t / dur})`;
const laneWidth = (d: number, dur: number) => `calc((100% - ${LANE_LABEL}px) * ${d / dur})`;
const zoomColor = (z: number) => {
  const k = Math.min(Math.max((z - 1) / 0.35, 0), 1);
  return `hsl(${178 + (330 - 178) * k} 70% 46%)`;
};

const Slider: React.FC<{
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
  onChange: (v: number) => void;
}> = ({ id, label, value, min, max, step, fmt, onChange }) => (
  <label className="slider" htmlFor={id}>
    <span className="slider-head">
      <span>{label}</span>
      <output className="mono" dir="ltr">
        {fmt(value)}
      </output>
    </span>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
  </label>
);

const Toggle: React.FC<{ id: string; on: boolean; label: string; onChange: (v: boolean) => void }> = ({ id, on, label, onChange }) => (
  <label className="toggle" htmlFor={id}>
    <input id={id} type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
    <span className="knob" aria-hidden="true" />
    <span>{label}</span>
  </label>
);

const IconGlyph: React.FC<{ id: IconId; size?: number }> = ({ id, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    {ICON_PATHS[id]}
  </svg>
);

/* ---------------- timeline ---------------- */

const Timeline: React.FC<{
  p: ReelProps;
  clips: Clip[];
  dur: number;
  cuts: number[];
  time: number;
  selected: number;
  onSeek: (t: number) => void;
  onSelect: (seg: number) => void;
  onMoveCut: (srcIdx: number, srcT: number) => void;
}> = ({ p, clips, dur, cuts, time, selected, onSeek, onSelect, onMoveCut }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<number | null>(null);
  const B = boundaries(cuts, dur);
  const joins = clips.slice(1).map((c) => c.outStart);

  // user cuts with their output position (only the ones inside kept footage)
  const userCuts = p.cuts.map((c, i) => ({ i, src: c, out: srcToOut(clips, c) })).filter((c): c is { i: number; src: number; out: number } => c.out !== null);

  const textBlocks = useMemo(() => {
    if (!p.captionsOn) return [];
    return wordsOf(p.captions)
      .flatMap(chunksOf)
      .map((ch) => {
        const a = srcToOut(clips, ch[0].start);
        if (a === null) return null;
        return { a, d: ch[ch.length - 1].end - ch[0].start, text: ch.map((w) => w.text).join(" ") };
      })
      .filter((x): x is { a: number; d: number; text: string } => x !== null);
  }, [p.captions, p.captionsOn, clips]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const draw = () => {
      const w = c.clientWidth;
      const h = c.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      c.width = w * dpr;
      c.height = h * dpr;
      const ctx = c.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = getComputedStyle(c).color;
      const bars = Math.max(Math.floor(w / 2.2), 1);
      for (let i = 0; i < bars; i++) {
        const s = outToSrc(clips, ((i + 0.5) / bars) * dur);
        const v = waveform[Math.min(Math.floor(s * 10), waveform.length - 1)] ?? 0;
        const a = Math.max(v * h * 0.9, 1);
        ctx.fillRect((i * w) / bars, (h - a) / 2, Math.max(w / bars - 0.7, 0.6), a);
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, [clips, dur]);

  const timeFromX = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    const x = clientX - r.left - LANE_LABEL;
    return Math.min(Math.max((x / (r.width - LANE_LABEL)) * dur, 0), dur);
  };

  const segAt = (t: number) => {
    const i = B.findIndex((b, k) => k < B.length - 1 && t >= b && t < B[k + 1]);
    return i === -1 ? B.length - 2 : i;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const cutAttr = target.closest("[data-cut]")?.getAttribute("data-cut");
    if (cutAttr != null) {
      const uc = userCuts.find((u) => u.i === +cutAttr)!;
      drag.current = uc.i;
      trackRef.current!.setPointerCapture(e.pointerId);
      onSeek(uc.out);
      onSelect(segAt(uc.out + 0.01));
      e.preventDefault();
      return;
    }
    const t = timeFromX(e.clientX);
    onSeek(t);
    onSelect(segAt(t));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (drag.current == null) return;
    const i = drag.current;
    const me = userCuts.find((u) => u.i === i);
    if (!me) return;
    const others = cuts.filter((c) => Math.abs(c - me.out) > 1e-6);
    const lo = Math.max(0, ...others.filter((c) => c < me.out)) + MIN_GAP;
    const hi = Math.min(dur, ...others.filter((c) => c > me.out)) - MIN_GAP;
    const T = Math.min(Math.max(timeFromX(e.clientX), lo), hi);
    // stay inside the clip the cut belongs to
    const clip = clips.find((c) => me.src >= c.from && me.src < c.to)!;
    const Tc = Math.min(Math.max(T, clip.outStart + 0.05), clip.outStart + (clip.to - clip.from) - 0.05);
    onMoveCut(i, Math.round((clip.from + Tc - clip.outStart) * 100) / 100);
    onSeek(Tc);
  };

  const ticks: number[] = [];
  for (let s = 0; s <= dur; s += 5) ticks.push(s);

  const icons = p.iconsOn ? p.icons.map((ic) => ({ ...ic, at: srcToOut(clips, ic.t) })).filter((x) => x.at !== null) : [];
  const brolls = p.brollOn ? p.broll.map((b) => ({ ...b, at: srcToOut(clips, b.t) })).filter((x) => x.at !== null) : [];

  return (
    <div className="timeline" dir="ltr">
      <div className="track-wrap">
        <div className="ruler mono" aria-hidden="true">
          {ticks.map((s) => (
            <span key={s} style={{ left: `${(s / dur) * 100}%` }}>
              {s}s
            </span>
          ))}
        </div>
        <div
          className="track"
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          <div className="lane-label" style={{ gridRow: 1 }}>ZOOM</div>
          <div className="lane" style={{ gridRow: 1 }}>
            {B.slice(0, -1).map((b, i) => (
              <div
                key={i}
                className={"seg" + (i === selected ? " sel" : "")}
                style={{ left: `${(b / dur) * 100}%`, width: `${((B[i + 1] - b) / dur) * 100}%`, background: zoomColor(p.zooms[i] ?? 1) }}
              >
                <span className="mono">×{(p.zooms[i] ?? 1).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="lane-label" style={{ gridRow: 2 }}>TEXT</div>
          <div className="lane" style={{ gridRow: 2 }}>
            {textBlocks.map((tb, i) => (
              <div key={i} className="tblock" style={{ left: `${(tb.a / dur) * 100}%`, width: `${(tb.d / dur) * 100}%` }} title={tb.text}>
                <span>{tb.text}</span>
              </div>
            ))}
          </div>
          <div className="lane-label" style={{ gridRow: 3 }}>FX</div>
          <div className="lane" style={{ gridRow: 3 }}>
            {brolls.map((b, i) => (
              <div key={"b" + i} className={"bblock k-" + b.kind} style={{ left: `${(b.at! / dur) * 100}%`, width: `${(b.dur / dur) * 100}%` }}>
                <span>{BROLL_NAMES[b.kind]}</span>
              </div>
            ))}
            {icons.map((ic, i) => (
              <div key={"i" + i} className="iconmark" style={{ left: `${(ic.at! / dur) * 100}%` }} title={ic.label}>
                <IconGlyph id={ic.icon} size={14} />
              </div>
            ))}
          </div>
          <div className="lane-label" style={{ gridRow: 4 }}>AUDIO</div>
          <canvas className="wave" ref={canvasRef} style={{ gridRow: 4 }} />
          {joins.map((j, i) => (
            <div key={"j" + i} className="join" style={{ left: lanePos(j, dur) }} title="لصقة بين جوج لقطات" />
          ))}
          {userCuts.map((c) => (
            <div key={c.i} className="cut" data-cut={c.i} style={{ left: lanePos(c.out, dur) }} title={`flash @ ${tc(c.out)}`}>
              <span className="cut-handle" />
            </div>
          ))}
          <div className="playhead" style={{ left: lanePos(time, dur) }} />
        </div>
      </div>
    </div>
  );
};

/* ---------------- app ---------------- */

const App: React.FC = () => {
  const [p, setP] = useState<ReelProps>(load);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState("");
  const [tab, setTab] = useState<TabId>(() => (TABS.some((t) => t.id === tryGet(TAB_KEY)) ? (tryGet(TAB_KEY) as TabId) : "takes"));
  const playerRef = useRef<PlayerRef>(null);
  const jsonRef = useRef<HTMLTextAreaElement>(null);

  const clips = useMemo(() => clipsOf(p), [p.takes]);
  const dur = outDuration(clips);
  const frames = Math.max(Math.round(dur * FPS), 1);
  const cuts = useMemo(() => allCuts(p, clips, dur), [p.cuts, clips, dur]);
  const B = boundaries(cuts, dur);
  const segCount = B.length - 1;
  const sel = Math.min(selected, segCount - 1);
  const srcNow = outToSrc(clips, time);

  useEffect(() => {
    // blob: URLs from uploaded b-roll only live in this tab
    trySet(STORE_KEY, JSON.stringify({ ...p, broll: p.broll.map((b) => (b.src?.startsWith("blob:") ? { ...b, src: undefined, kind: "clones" } : b)) }));
  }, [p]);
  useEffect(() => trySet(TAB_KEY, tab), [tab]);

  /* undo / redo: changes less than HISTORY_GAP ms apart (a drag, a slider) count as one step */
  const past = useRef<ReelProps[]>([]);
  const future = useRef<ReelProps[]>([]);
  const prevP = useRef(p);
  const lastChange = useRef(0);
  const fromHistory = useRef(false);
  const [histTick, setHistTick] = useState(0);
  useEffect(() => {
    if (prevP.current === p) return;
    if (fromHistory.current) {
      fromHistory.current = false;
    } else {
      const now = Date.now();
      if (now - lastChange.current > HISTORY_GAP) {
        past.current.push(prevP.current);
        if (past.current.length > HISTORY_MAX) past.current.shift();
      }
      lastChange.current = now;
      future.current = [];
    }
    prevP.current = p;
    setHistTick((n) => n + 1);
  }, [p]);
  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(prevP.current);
    fromHistory.current = true;
    lastChange.current = 0;
    setP(prev);
  }, []);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(prevP.current);
    fromHistory.current = true;
    lastChange.current = 0;
    setP(next);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const isZ = e.code === "KeyZ" || e.key.toLowerCase() === "z";
      const isY = e.code === "KeyY" || e.key.toLowerCase() === "y";
      if (!isZ && !isY) return;
      // leave text fields their own undo
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && !["range", "checkbox", "file"].includes((t as HTMLInputElement).type)))) return;
      e.preventDefault();
      if (isY || e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);
  const canUndo = histTick >= 0 && past.current.length > 0;
  const canRedo = histTick >= 0 && future.current.length > 0;

  useEffect(() => {
    const pl = playerRef.current;
    if (!pl) return;
    const onFrame = (e: { detail: { frame: number } }) => setTime(e.detail.frame / FPS);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    pl.addEventListener("frameupdate", onFrame);
    pl.addEventListener("seeked", onFrame);
    pl.addEventListener("play", onPlay);
    pl.addEventListener("pause", onPause);
    return () => {
      pl.removeEventListener("frameupdate", onFrame);
      pl.removeEventListener("seeked", onFrame);
      pl.removeEventListener("play", onPlay);
      pl.removeEventListener("pause", onPause);
    };
  }, []);

  const set = <K extends keyof ReelProps>(k: K, v: ReelProps[K]) => setP((o) => ({ ...o, [k]: v }));

  const seek = useCallback(
    (t: number) => {
      const T = Math.min(Math.max(t, 0), dur);
      playerRef.current?.seekTo(Math.min(Math.round(T * FPS), frames - 1));
      setTime(T);
    },
    [dur, frames],
  );
  const seekSrc = (s: number) => {
    const T = srcToOut(clips, s);
    if (T !== null) seek(T);
  };

  /* cuts + zoom */
  const segOf = (T: number) => {
    const i = B.findIndex((b, k) => k < B.length - 1 && T >= b && T < B[k + 1]);
    return i === -1 ? B.length - 2 : i;
  };
  const addCut = () => {
    if (B.some((b) => Math.abs(b - time) < MIN_GAP)) return;
    const seg = segOf(time);
    const zooms = [...p.zooms];
    while (zooms.length < segCount) zooms.push(1);
    const cur = zooms[seg] ?? 1;
    zooms.splice(seg + 1, 0, ZOOM_PRESETS.map((z) => z.v).find((v) => Math.abs(v - cur) > 0.1) ?? 1.2);
    setP({ ...p, cuts: [...p.cuts, Math.round(srcNow * 100) / 100].sort((a, b) => a - b), zooms });
    setSelected(seg + 1);
  };
  const removeCut = () => {
    // the user cut that starts the selected segment
    const startT = B[sel];
    const idx = p.cuts.findIndex((c) => {
      const o = srcToOut(clips, c);
      return o !== null && Math.abs(o - startT) < 0.02;
    });
    if (idx === -1) return;
    const zooms = [...p.zooms];
    zooms.splice(sel, 1);
    setP({ ...p, cuts: p.cuts.filter((_, i) => i !== idx), zooms });
    setSelected(Math.max(sel - 1, 0));
  };
  const selIsUserCut = p.cuts.some((c) => {
    const o = srcToOut(clips, c);
    return o !== null && sel > 0 && Math.abs(o - B[sel]) < 0.02;
  });
  const moveCut = (i: number, srcT: number) => setP((o) => ({ ...o, cuts: o.cuts.map((c, k) => (k === i ? srcT : c)) }));
  const setZoom = (v: number) => {
    const zooms = [...p.zooms];
    while (zooms.length < segCount) zooms.push(1);
    zooms[sel] = v;
    set("zooms", zooms);
  };
  const segZoom = p.zooms[sel] ?? 1;

  /* export */
  const json = useMemo(() => {
    const { src, ...rest } = p;
    return JSON.stringify({ ...rest, broll: rest.broll.map(({ src: s, ...b }) => (s?.startsWith("blob:") ? { ...b, kind: "user", src: "PUT-YOUR-CLIP.mp4" } : { ...b, ...(s ? { src: s } : {}) })) }, null, 2);
  }, [p]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied("تنسخ ✓");
    } catch {
      jsonRef.current?.select();
      setCopied("ختار النص ونسخو");
    }
    setTimeout(() => setCopied(""), 2200);
  };

  const inClip = (s: number) => srcToOut(clips, s) !== null;

  /* panels */
  const takesPanel = (
    <div className="group">
      <h2>
        اللقطات اللي داخلين فالريل
        <span className="sub mono" dir="ltr">
          {dur.toFixed(1)}s / {SOURCE_SEC.toFixed(1)}s
        </span>
      </h2>
      <p className="note">كاين جمل عاودتيهم بزاف ديال المرات. خليت غير أحسن محاولة، والباقي طفيتو. شعل ولا طفي اللي بغيتي.</p>
      <ul className="rows">
        {p.takes.map((t, i) => (
          <li key={i} className={"row" + (t.on ? "" : " off")}>
            <Toggle
              id={`take-${i}`}
              on={t.on}
              label=""
              onChange={(v) => set("takes", p.takes.map((x, k) => (k === i ? { ...x, on: v } : x)))}
            />
            <button className="row-main" onClick={() => t.on && seekSrc(t.from + 0.01)} disabled={!t.on}>
              <span className="row-title">{t.label}</span>
              <span className="row-meta mono" dir="ltr">
                {tc(t.from)} → {tc(t.to)} · {(t.to - t.from).toFixed(1)}s
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const subsPanel = (
    <>
      <div className="group">
        <h2>الترجمة</h2>
        <Toggle id="caps-on" on={p.captionsOn} label="بيّن الترجمة" onChange={(v) => set("captionsOn", v)} />
        <div className="chips">
          {CAPTION_STYLES.map((s) => (
            <button key={s} className={"chip" + (p.captionStyle === s ? " on" : "")} onClick={() => set("captionStyle", s)}>
              {CAPTION_STYLE_NAMES[s]}
            </button>
          ))}
        </div>
        <Slider id="cap-size" label="حجم الكتابة" value={p.captionSize} min={40} max={110} step={1} fmt={(v) => `${v}px`} onChange={(v) => set("captionSize", v)} />
        <Slider id="cap-y" label="البلاصة (لفوق ← لتحت)" value={p.captionY} min={0.4} max={0.92} step={0.01} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set("captionY", v)} />
      </div>
      <div className="group">
        <h2>العنوان فالبداية</h2>
        <Toggle id="hook-on" on={p.hook.on} label="بيّن العنوان" onChange={(v) => set("hook", { ...p.hook, on: v })} />
        <label className="field" htmlFor="hook-text">
          <span>العنوان</span>
          <input id="hook-text" dir="ltr" value={p.hook.text} onChange={(e) => set("hook", { ...p.hook, text: e.target.value })} />
        </label>
        <label className="field" htmlFor="hook-sub">
          <span>الكتابة الصغيرة</span>
          <input id="hook-sub" dir="ltr" value={p.hook.sub} onChange={(e) => set("hook", { ...p.hook, sub: e.target.value })} />
        </label>
      </div>
      <div className="group">
        <h2>النص (عدّل أي جملة)</h2>
        <p className="note">
          النص خرج أوتوماتيكياً من الصوت. الجمل اللي فيهم <span className="flag">تأكد</span> ما كانوش واضحين، صححهم.
        </p>
        <ul className="rows">
          {p.captions.map((c, i) =>
            inClip(c.start) ? (
              <li key={i} className={"cap-row" + (srcNow >= c.start && srcNow < c.end ? " now" : "")}>
                <button className="mono time-btn" dir="ltr" onClick={() => seekSrc(c.start)}>
                  {tc(srcToOut(clips, c.start) ?? 0)}
                </button>
                {GUESS_STARTS.has(c.start) ? <span className="flag">تأكد</span> : null}
                <textarea
                  id={`cap-${i}`}
                  dir="ltr"
                  rows={2}
                  value={c.text}
                  onChange={(e) => set("captions", p.captions.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)))}
                />
              </li>
            ) : null,
          )}
        </ul>
      </div>
    </>
  );

  const iconsPanel = (
    <div className="group">
      <h2>الأيقونات</h2>
      <Toggle id="icons-on" on={p.iconsOn} label="بيّن الأيقونات" onChange={(v) => set("iconsOn", v)} />
      <button className="tool" onClick={() => set("icons", [...p.icons, { t: Math.round(srcNow * 100) / 100, icon: "sparkle" as IconId, label: "" }].sort((a, b) => a.t - b.t))}>
        + أيقونة فهاد البلاصة
      </button>
      <ul className="rows">
        {p.icons.map((ic, i) =>
          inClip(ic.t) ? (
            <li key={i} className="icon-row">
              <button className="mono time-btn" dir="ltr" onClick={() => seekSrc(ic.t)}>
                {tc(srcToOut(clips, ic.t) ?? 0)}
              </button>
              <span className="glyph">
                <IconGlyph id={ic.icon} size={22} />
              </span>
              <select
                id={`icon-${i}`}
                value={ic.icon}
                onChange={(e) => set("icons", p.icons.map((x, k) => (k === i ? { ...x, icon: e.target.value as IconId } : x)))}
              >
                {ICON_IDS.map((id) => (
                  <option key={id} value={id}>
                    {ICON_NAMES[id]}
                  </option>
                ))}
              </select>
              <span className="row-meta" dir="ltr">
                {ic.label}
              </span>
              <button className="x" aria-label="حيّد" onClick={() => set("icons", p.icons.filter((_, k) => k !== i))}>
                ×
              </button>
              <details className="icon-more">
                <summary>الوقت، الحجم والبلاصة</summary>
                {(() => {
                  const upd = (patch: Partial<ReelProps["icons"][number]>) => set("icons", p.icons.map((x, k) => (k === i ? { ...x, ...patch } : x)));
                  const side = i % 2 === 0 ? "right" : "left";
                  return (
                    <>
                      <Slider id={`icon-show-${i}`} label="مدة الظهور" value={ic.show ?? 1.6} min={0.4} max={6} step={0.1} fmt={(v) => `${v.toFixed(1)}s`} onChange={(v) => upd({ show: v })} />
                      <Slider id={`icon-size-${i}`} label="الحجم" value={ic.size ?? 200} min={80} max={420} step={5} fmt={(v) => `${v}px`} onChange={(v) => upd({ size: v })} />
                      <Slider id={`icon-x-${i}`} label="البلاصة X" value={ic.x ?? (side === "left" ? 0.18 : 0.82)} min={0} max={1} step={0.01} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => upd({ x: v })} />
                      <Slider id={`icon-y-${i}`} label="البلاصة Y" value={ic.y ?? 0.18} min={0} max={1} step={0.01} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => upd({ y: v })} />
                      <button className="tool" onClick={() => upd({ show: undefined, size: undefined, x: undefined, y: undefined })}>رجّع الأصل</button>
                    </>
                  );
                })()}
              </details>
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );

  const brollPanel = (
    <div className="group">
      <h2>B-roll</h2>
      <Toggle id="broll-on" on={p.brollOn} label="بيّن الـ B-roll" onChange={(v) => set("brollOn", v)} />
      <p className="note">
        هادو أنيماسيونات درتهم على حساب الكلام. تقدر تبدل أي واحد بفيديو من التلفون ديالك باش تشوفو هنا. الفيديو اللي كتزيد كيبقى غير فهاد الصفحة وما كيتحفظش.
      </p>
      <button className="tool" onClick={() => set("broll", [...p.broll, { t: Math.round(srcNow * 100) / 100, dur: 2.5, kind: "clones" as const }].sort((a, b) => a.t - b.t))}>
        + B-roll فهاد البلاصة
      </button>
      <ul className="rows">
        {p.broll.map((b, i) =>
          inClip(b.t) ? (
            <li key={i} className="broll-row">
              <div className="broll-head">
                <button className="mono time-btn" dir="ltr" onClick={() => seekSrc(b.t + 0.05)}>
                  {tc(srcToOut(clips, b.t) ?? 0)}
                </button>
                <select
                  id={`broll-kind-${i}`}
                  value={b.kind === "user" && !b.src ? "clones" : b.kind}
                  onChange={(e) =>
                    set("broll", p.broll.map((x, k) => (k === i ? { ...x, kind: e.target.value as (typeof BROLL_KINDS)[number] } : x)))
                  }
                >
                  {BROLL_KINDS.filter((k) => k !== "user" || b.src).map((k) => (
                    <option key={k} value={k}>
                      {BROLL_NAMES[k]}
                    </option>
                  ))}
                </select>
                <button className="x" aria-label="حيّد" onClick={() => set("broll", p.broll.filter((_, k) => k !== i))}>
                  ×
                </button>
              </div>
              <Slider
                id={`broll-dur-${i}`}
                label="المدة"
                value={b.dur}
                min={0.5}
                max={6}
                step={0.1}
                fmt={(v) => `${v.toFixed(1)}s`}
                onChange={(v) => set("broll", p.broll.map((x, k) => (k === i ? { ...x, dur: v } : x)))}
              />
              <label className="upload" htmlFor={`broll-file-${i}`}>
                <input
                  id={`broll-file-${i}`}
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    set("broll", p.broll.map((x, k) => (k === i ? { ...x, kind: "user" as const, src: url } : x)));
                  }}
                />
                <span>{b.kind === "user" && b.src ? "✓ فيديو ديالك · بدّل" : "حط فيديو ديالك"}</span>
              </label>
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );

  const lookPanel = (
    <>
      <div className="group">
        <h2>اللون</h2>
        <div className="grades">
          {GRADE_IDS.map((g) => (
            <button key={g} className={"grade" + (p.grade === g ? " on" : "")} onClick={() => set("grade", g)} aria-pressed={p.grade === g}>
              <span className="sw" style={{ background: `linear-gradient(135deg, ${GRADES[g].swatch[0]}, ${GRADES[g].swatch[1]})` }} />
              <span>{GRADES[g].label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="group">
        <h2>الإيفيكتات</h2>
        <Slider id="flash" label="قوة الفلاش" value={p.flash} min={0} max={1} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set("flash", v)} />
        <Slider id="glow" label="الضو (Glow)" value={p.glow} min={0} max={1} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set("glow", v)} />
        <Slider id="trans" label="سرعة الانتقال" value={p.transition} min={0.1} max={1} step={0.02} fmt={(v) => `${v.toFixed(2)}s`} onChange={(v) => set("transition", v)} />
        <Slider id="push" label="الحركة البطيئة" value={p.pushIn} min={0} max={0.15} step={0.005} fmt={(v) => `+${Math.round(v * 100)}%`} onChange={(v) => set("pushIn", v)} />
        <Slider id="punch" label="ضربة الزوم" value={p.punch} min={0} max={0.15} step={0.005} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set("punch", v)} />
      </div>
    </>
  );

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="rec" aria-hidden="true" />
          <h1>مونتاج الريل</h1>
          <span className="meta mono" dir="ltr">
            1080×1920 · 24fps · {tc(dur)}
          </span>
        </div>
        <div className="top-actions">
          <button className="ghost hist" onClick={undo} disabled={!canUndo} title="رجع (Ctrl+Z)" aria-label="رجع (Ctrl+Z)">
            <span aria-hidden="true">↶</span>
            <kbd className="mono">Ctrl Z</kbd>
          </button>
          <button className="ghost hist" onClick={redo} disabled={!canRedo} title="عاود (Ctrl+Shift+Z)" aria-label="عاود (Ctrl+Shift+Z)">
            <span aria-hidden="true">↷</span>
            <kbd className="mono">Ctrl ⇧ Z</kbd>
          </button>
          <button
            className="ghost"
            onClick={() => {
              setP(defaultReel);
              setSelected(0);
            }}
          >
            رجّع الأصل
          </button>
          <button className="primary" onClick={copy}>
            {copied || "نسخ الإعدادات"}
          </button>
        </div>
      </header>

      <main className="work">
        <section className="stage" aria-label="المعاينة">
          <div className="player-wrap" dir="ltr">
            <Player
              ref={playerRef}
              component={ReelEdit}
              inputProps={p}
              durationInFrames={frames}
              fps={FPS}
              compositionWidth={1080}
              compositionHeight={1920}
              style={{ width: "100%", height: "100%" }}
              controls
              clickToPlay
              acknowledgeRemotionLicense
            />
          </div>
        </section>

        <aside className="panel">
          <div className="segment-zoom group">
            <h2>
              الزوم ديال الجزء {sel + 1}
              <span className="mono sub" dir="ltr">
                {tc(B[sel])} → {tc(B[sel + 1])}
              </span>
            </h2>
            {p.keys.zoom.length ? <p className="note">الزوم دابا كيتحكم فيه بالكيفريمات (لتحت). هاد الأزرار ما كيخدموش حتى ترجع الزوم أوتوماتيك.</p> : null}
            <div className="chips">
              {ZOOM_PRESETS.map((z) => (
                <button key={z.v} className={"chip" + (Math.abs(segZoom - z.v) < 0.005 ? " on" : "")} onClick={() => setZoom(z.v)}>
                  <i style={{ background: zoomColor(z.v) }} />
                  {z.label}
                </button>
              ))}
            </div>
          </div>
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={"tab" + (tab === t.id ? " on" : "")} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="tab-body" role="tabpanel">
            {tab === "takes" && takesPanel}
            {tab === "subs" && subsPanel}
            {tab === "icons" && iconsPanel}
            {tab === "broll" && brollPanel}
            {tab === "motion" && <MotionPanel p={p} setP={setP} />}
            {tab === "look" && lookPanel}
          </div>
        </aside>
      </main>

      <section className="edit-bar" aria-label="التايملاين">
        <div className="bar-row">
          <button className="icon" onClick={() => (playing ? playerRef.current?.pause() : playerRef.current?.play())} aria-label={playing ? "وقف" : "شغّل"}>
            {playing ? "❚❚" : "▶"}
          </button>
          <span className="time mono" dir="ltr">
            {tc(time)}
          </span>
          <span className="spacer" />
          <button className="tool" onClick={addCut}>
            + قطعة هنا
          </button>
          <button className="tool danger" onClick={removeCut} disabled={!selIsUserCut}>
            حيّد القطعة
          </button>
        </div>
        <Timeline p={p} clips={clips} dur={dur} cuts={cuts} time={time} selected={sel} onSeek={seek} onSelect={setSelected} onMoveCut={moveCut} />
        <p className="hint">
          كليكي على أي بلاصة فالتايملاين باش تمشي ليها، وختار الجزء باش تبدل الزوم ديالو. جرّ الخطوط الوردية باش تبدل بلاصة الفلاش. الخطوط البيضاء المتقطعة هي اللصقات بين اللقطات، وكيتزاد فيهم فلاش بوحدهم.
        </p>
      </section>

      <section className="edit-bar" aria-label="الكيفريمات">
        <h2 className="section-title">الكيفريمات (Graph editor)</h2>
        <GraphEditor p={p} setP={setP} cuts={cuts} joins={clips.slice(1).map((c) => c.outStart)} dur={dur} time={time} onSeek={seek} />
      </section>

      <details className="export">
        <summary>الإعدادات بصيغة JSON</summary>
        <p>نسخ هاد النص وصيفطو ليا باش نخرج الفيديو بنفس المونتاج بجودة كاملة.</p>
        <textarea id="json-out" ref={jsonRef} readOnly value={json} dir="ltr" className="mono" rows={10} />
      </details>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
