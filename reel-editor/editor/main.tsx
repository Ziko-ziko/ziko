import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Player, PlayerRef } from "@remotion/player";
import { ReelEdit } from "../src/ReelEdit";
import {
  DURATION_FRAMES,
  DURATION_SEC,
  FPS,
  GRADES,
  GRADE_IDS,
  ReelProps,
  boundaries,
  defaultReel,
} from "../src/schema";
import waveform from "../src/waveform.json";

const STORE_KEY = "reel-edit-v1";
const MIN_GAP = 0.4;
const LANE_LABEL = 52; // px, matches .track grid label column
const lanePos = (t: number) => `calc(${LANE_LABEL}px + (100% - ${LANE_LABEL}px) * ${t / DURATION_SEC})`;
const ZOOM_PRESETS = [
  { v: 1.0, label: "واسع" },
  { v: 1.07, label: "متوسط" },
  { v: 1.2, label: "قريب" },
  { v: 1.32, label: "الوجه" },
];

const load = (): ReelProps => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...defaultReel, ...JSON.parse(raw), src: defaultReel.src };
  } catch {}
  return defaultReel;
};

const tc = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  return `${String(m).padStart(2, "0")}:${sec.toFixed(2).padStart(5, "0")}`;
};

const zoomColor = (z: number) => {
  // wide = teal, close = pink
  const k = Math.min(Math.max((z - 1) / 0.35, 0), 1);
  const h = 178 + (330 - 178) * k;
  return `hsl(${h} 70% 46%)`;
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
      <output className="mono" dir="ltr">{fmt(value)}</output>
    </span>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
  </label>
);

const Timeline: React.FC<{
  props: ReelProps;
  time: number;
  selected: number;
  onSeek: (t: number) => void;
  onSelect: (seg: number) => void;
  onMoveCut: (idx: number, t: number) => void;
}> = ({ props, time, selected, onSeek, onSelect, onMoveCut }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<number | null>(null);
  const B = boundaries(props);
  const sorted = [...props.cuts].sort((a, b) => a - b);

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
      const n = waveform.length;
      const bw = w / n;
      for (let i = 0; i < n; i++) {
        const a = Math.max(waveform[i] * h * 0.9, 1);
        ctx.fillRect(i * bw, (h - a) / 2, Math.max(bw - 0.6, 0.6), a);
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  const timeFromX = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    const x = clientX - r.left - LANE_LABEL;
    return Math.min(Math.max((x / (r.width - LANE_LABEL)) * DURATION_SEC, 0), DURATION_SEC);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const cutAttr = target.closest("[data-cut]")?.getAttribute("data-cut");
    if (cutAttr != null) {
      drag.current = +cutAttr;
      trackRef.current!.setPointerCapture(e.pointerId);
      onSeek(sorted[+cutAttr]);
      onSelect(+cutAttr + 1);
      e.preventDefault();
      return;
    }
    const t = timeFromX(e.clientX);
    onSeek(t);
    const seg = B.findIndex((b, i) => i < B.length - 1 && t >= b && t < B[i + 1]);
    onSelect(seg === -1 ? B.length - 2 : seg);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (drag.current == null) return;
    const i = drag.current;
    const lo = (i === 0 ? 0 : sorted[i - 1]) + MIN_GAP;
    const hi = (i === sorted.length - 1 ? DURATION_SEC : sorted[i + 1]) - MIN_GAP;
    const t = Math.round(Math.min(Math.max(timeFromX(e.clientX), lo), hi) * 10) / 10;
    onMoveCut(i, t);
    onSeek(t);
  };

  const endDrag = () => {
    drag.current = null;
  };

  const ticks = [];
  for (let s = 0; s <= DURATION_SEC; s += 5) ticks.push(s);

  return (
    <div className="timeline" dir="ltr">
      <div className="ruler mono" aria-hidden="true">
        {ticks.map((s) => (
          <span key={s} style={{ left: `${(s / DURATION_SEC) * 100}%` }}>
            {s}s
          </span>
        ))}
      </div>
      <div
        className="track"
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="lane-label">ZOOM</div>
        <div className="segments">
          {B.slice(0, -1).map((b, i) => (
            <div
              key={i}
              className={"seg" + (i === selected ? " sel" : "")}
              style={{
                left: `${(b / DURATION_SEC) * 100}%`,
                width: `${((B[i + 1] - b) / DURATION_SEC) * 100}%`,
                background: zoomColor(props.zooms[i] ?? 1),
              }}
            >
              <span className="mono">×{(props.zooms[i] ?? 1).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="lane-label wave-label">AUDIO</div>
        <canvas className="wave" ref={canvasRef} />
        {sorted.map((c, i) => (
          <div key={i} className="cut" data-cut={i} style={{ left: lanePos(c) }} title={`flash @ ${tc(c)}`}>
            <span className="cut-handle" />
          </div>
        ))}
        <div className="playhead" style={{ left: lanePos(time) }} />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [props, setProps] = useState<ReelProps>(load);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState("");
  const playerRef = useRef<PlayerRef>(null);
  const jsonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(props));
    } catch {}
  }, [props]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => setTime(e.detail.frame / FPS);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("seeked", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("seeked", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
    };
  }, []);

  const set = <K extends keyof ReelProps>(k: K, v: ReelProps[K]) => setProps((p) => ({ ...p, [k]: v }));

  const seek = useCallback((t: number) => {
    playerRef.current?.seekTo(Math.min(Math.round(t * FPS), DURATION_FRAMES - 1));
    setTime(t);
  }, []);

  const B = boundaries(props);
  const segCount = B.length - 1;
  const sel = Math.min(selected, segCount - 1);

  const addCut = () => {
    const sorted = [...props.cuts].sort((a, b) => a - b);
    const t = Math.round(time * 10) / 10;
    if (B.some((b) => Math.abs(b - t) < MIN_GAP)) return;
    const seg = B.findIndex((b, i) => i < B.length - 1 && t >= b && t < B[i + 1]);
    const zooms = [...props.zooms];
    const cur = zooms[seg] ?? 1;
    const next = ZOOM_PRESETS.map((p) => p.v).find((v) => Math.abs(v - cur) > 0.1) ?? 1.2;
    zooms.splice(seg + 1, 0, next);
    setProps({ ...props, cuts: [...sorted, t].sort((a, b) => a - b), zooms });
    setSelected(seg + 1);
  };

  const removeCut = () => {
    // removes the cut that starts the selected segment (or the one after segment 0)
    if (props.cuts.length === 0) return;
    const sorted = [...props.cuts].sort((a, b) => a - b);
    const idx = sel === 0 ? 0 : sel - 1;
    sorted.splice(idx, 1);
    const zooms = [...props.zooms];
    zooms.splice(idx + 1, 1);
    setProps({ ...props, cuts: sorted, zooms });
    setSelected(Math.max(idx, 0));
  };

  const moveCut = (i: number, t: number) => {
    setProps((p) => {
      const sorted = [...p.cuts].sort((a, b) => a - b);
      sorted[i] = t;
      return { ...p, cuts: sorted };
    });
  };

  const setZoom = (v: number) => {
    const zooms = [...props.zooms];
    while (zooms.length < segCount) zooms.push(1);
    zooms[sel] = v;
    set("zooms", zooms);
  };

  const json = useMemo(() => {
    const { src, ...rest } = props;
    return JSON.stringify({ ...rest, cuts: [...rest.cuts].sort((a, b) => a - b) }, null, 2);
  }, [props]);

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

  const inputProps = useMemo(() => props, [props]);
  const segZoom = props.zooms[sel] ?? 1;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="rec" aria-hidden="true" />
          <h1>مونتاج الريل</h1>
          <span className="meta mono">1080×1920 · 24fps · {tc(DURATION_SEC)}</span>
        </div>
        <div className="top-actions">
          <button className="ghost" onClick={() => { setProps(defaultReel); setSelected(0); }}>رجّع الأصل</button>
          <button className="primary" onClick={copy}>{copied || "نسخ الإعدادات"}</button>
        </div>
      </header>

      <main className="work">
        <section className="stage" aria-label="المعاينة">
          <div className="player-wrap" dir="ltr">
            <Player
              ref={playerRef}
              component={ReelEdit}
              inputProps={inputProps}
              durationInFrames={DURATION_FRAMES}
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
          <div className="group">
            <h2>اللون</h2>
            <div className="grades">
              {GRADE_IDS.map((g) => (
                <button
                  key={g}
                  className={"grade" + (props.grade === g ? " on" : "")}
                  onClick={() => set("grade", g)}
                  aria-pressed={props.grade === g}
                >
                  <span className="sw" style={{ background: `linear-gradient(135deg, ${GRADES[g].swatch[0]}, ${GRADES[g].swatch[1]})` }} />
                  <span>{GRADES[g].label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="group">
            <h2>
              الزوم ديال الجزء {sel + 1}
              <span className="mono sub" dir="ltr">{tc(B[sel])} → {tc(B[sel + 1])}</span>
            </h2>
            <div className="chips">
              {ZOOM_PRESETS.map((z) => (
                <button key={z.v} className={"chip" + (Math.abs(segZoom - z.v) < 0.005 ? " on" : "")} onClick={() => setZoom(z.v)}>
                  <i style={{ background: zoomColor(z.v) }} />
                  {z.label}
                </button>
              ))}
            </div>
            <Slider id="seg-zoom" label="زوم بالضبط" value={segZoom} min={1} max={1.6} step={0.01} fmt={(v) => `×${v.toFixed(2)}`} onChange={setZoom} />
          </div>

          <div className="group">
            <h2>الإيفيكتات</h2>
            <Slider id="flash" label="قوة الفلاش" value={props.flash} min={0} max={1} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set("flash", v)} />
            <Slider id="glow" label="الضو (Glow)" value={props.glow} min={0} max={1} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set("glow", v)} />
            <Slider id="trans" label="سرعة الانتقال" value={props.transition} min={0.1} max={1} step={0.02} fmt={(v) => `${v.toFixed(2)}s`} onChange={(v) => set("transition", v)} />
            <Slider id="push" label="الحركة البطيئة" value={props.pushIn} min={0} max={0.15} step={0.005} fmt={(v) => `+${Math.round(v * 100)}%`} onChange={(v) => set("pushIn", v)} />
            <Slider id="punch" label="ضربة الزوم" value={props.punch} min={0} max={0.15} step={0.005} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set("punch", v)} />
          </div>
        </aside>
      </main>

      <section className="edit-bar" aria-label="التايملاين">
        <div className="bar-row">
          <button className="icon" onClick={() => (playing ? playerRef.current?.pause() : playerRef.current?.play())} aria-label={playing ? "وقف" : "شغّل"}>
            {playing ? "❚❚" : "▶"}
          </button>
          <span className="time mono" dir="ltr">{tc(time)}</span>
          <span className="spacer" />
          <button className="tool" onClick={addCut}>+ قطعة هنا</button>
          <button className="tool danger" onClick={removeCut} disabled={props.cuts.length === 0}>حيّد القطعة</button>
        </div>
        <Timeline props={props} time={time} selected={sel} onSeek={seek} onSelect={setSelected} onMoveCut={moveCut} />
        <p className="hint">
          كليكي على جزء باش تختارو وتبدل الزوم ديالو. جرّ الخطوط الوردية باش تبدل بلاصة الفلاش. الموجة كتبين فين كتسكت فالهضرة، والقطعة كتجي أحسن فداك البلاصة.
        </p>
      </section>

      <details className="export">
        <summary>الإعدادات بصيغة JSON</summary>
        <p>نسخ هاد النص وصيفطو ليا، ولا حطو فـ Remotion Studio باش تخرج الفيديو بنفس المونتاج.</p>
        <textarea id="json-out" ref={jsonRef} readOnly value={json} dir="ltr" className="mono" rows={10} />
      </details>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
