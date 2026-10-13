import React, { useEffect, useMemo, useRef, useState } from "react";
import { EASE_PRESETS, Ease, Key, applyEase } from "../src/motion";
import { FPS, ReelProps, TRACK_IDS, TrackId, evalTracks, zoomAtTime, flashAtTime } from "../src/schema";

const LANE_LABEL = 52;

export const TRACKS: Record<TrackId, { label: string; min: number; max: number; step: number; fmt: (v: number) => string }> = {
  zoom: { label: "زوم", min: 0.8, max: 1.8, step: 0.01, fmt: (v) => `×${v.toFixed(2)}` },
  x: { label: "X يمين/يسار", min: -400, max: 400, step: 1, fmt: (v) => `${Math.round(v)}px` },
  y: { label: "Y فوق/تحت", min: -400, max: 400, step: 1, fmt: (v) => `${Math.round(v)}px` },
  rot: { label: "دوران", min: -20, max: 20, step: 0.1, fmt: (v) => `${v.toFixed(1)}°` },
  flash: { label: "فلاش", min: 0, max: 1.2, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  glow: { label: "Glow", min: 0, max: 1, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
};

const presetOf = (e: Ease) => EASE_PRESETS.find((p) => JSON.stringify(p.ease) === JSON.stringify(e))?.id;

/* ---------------- bezier curve editor ---------------- */

export const CurveEditor: React.FC<{ id: string; ease: Ease; onChange: (e: Ease) => void }> = ({ id, ease, onChange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<0 | 1 | null>(null);
  const S = 150; // plot size
  const PAD = 14;
  const Y0 = -0.7; // value range shown (room for overshoot)
  const Y1 = 1.7;
  const px = (x: number) => PAD + x * S;
  const py = (y: number) => PAD + ((Y1 - y) / (Y1 - Y0)) * S;
  const bez = ease === "hold" ? null : ease;

  const path = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const x = i / 60;
      pts.push(`${i ? "L" : "M"}${px(x).toFixed(1)} ${py(applyEase(ease, x)).toFixed(1)}`);
    }
    return pts.join(" ");
  }, [ease]);

  const toVal = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * (S + PAD * 2);
    const sy = ((e.clientY - r.top) / r.height) * (S + PAD * 2);
    const x = Math.min(Math.max((sx - PAD) / S, 0), 1);
    const y = Math.min(Math.max(Y1 - ((sy - PAD) / S) * (Y1 - Y0), Y0), Y1);
    return [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
  };

  return (
    <div className="curve">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${S + PAD * 2} ${S + PAD * 2}`}
        className="curve-svg"
        aria-label="منحنى الحركة"
        onPointerMove={(e) => {
          if (drag.current === null || !bez) return;
          const [x, y] = toVal(e);
          const next: Ease = drag.current === 0 ? [x, y, bez[2], bez[3]] : [bez[0], bez[1], x, y];
          onChange(next);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <rect x={px(0)} y={py(1)} width={S} height={py(0) - py(1)} className="curve-box" />
        <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)} className="curve-diag" />
        <path d={path} className="curve-line" />
        {bez ? (
          <>
            <line x1={px(0)} y1={py(0)} x2={px(bez[0])} y2={py(bez[1])} className="curve-arm" />
            <line x1={px(1)} y1={py(1)} x2={px(bez[2])} y2={py(bez[3])} className="curve-arm" />
            {[0, 1].map((h) => (
              <circle
                key={h}
                cx={px(bez[h * 2])}
                cy={py(bez[h * 2 + 1])}
                r={7}
                className="curve-handle"
                onPointerDown={(e) => {
                  drag.current = h as 0 | 1;
                  try { svgRef.current!.setPointerCapture(e.pointerId); } catch {}
                  e.preventDefault();
                }}
              />
            ))}
          </>
        ) : null}
      </svg>
      <div className="curve-side">
        <label className="field" htmlFor={`${id}-preset`}>
          <span>نوع الحركة</span>
          <select
            id={`${id}-preset`}
            value={presetOf(ease) ?? "custom"}
            onChange={(e) => {
              const p = EASE_PRESETS.find((x) => x.id === e.target.value);
              if (p) onChange(p.ease);
            }}
          >
            {EASE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            {presetOf(ease) ? null : <option value="custom">مخصص</option>}
          </select>
        </label>
        <code className="mono curve-code" dir="ltr">
          {bez ? `cubic-bezier(${bez.join(", ")})` : "hold"}
        </code>
        <span className="note">جرّ النقط الورديين باش تبدل المنحنى.</span>
      </div>
    </div>
  );
};

/* ---------------- graph editor (keyframes over the reel timeline) ---------------- */

const bakeTrack = (p: ReelProps, track: TrackId, cuts: number[], dur: number): Key[] => {
  const B = [0, ...cuts, dur];
  const inout: Ease = [0.42, 0, 0.58, 1];
  if (track === "zoom") {
    const keys: Key[] = [];
    const trEase: Ease = p.punch > 0.005 ? [0.34, 1.56, 0.64, 1] : p.motion.transition.ease;
    for (let i = 0; i < B.length - 1; i++) {
      const a = i === 0 ? 0 : Math.min(B[i] + p.transition, B[i + 1] - 0.05);
      const e = i === B.length - 2 ? dur : B[i + 1] - 1 / FPS;
      keys.push({ t: a, v: +zoomAtTime(p, cuts, dur, a).toFixed(3), ease: inout });
      keys.push({ t: e, v: +zoomAtTime(p, cuts, dur, e).toFixed(3), ease: trEase });
    }
    return keys;
  }
  if (track === "flash") {
    const keys: Key[] = [{ t: 0, v: 0, ease: "hold" }];
    const m = p.motion.flash;
    for (const c of cuts) {
      keys.push({ t: Math.max(c - m.attack, 0), v: 0, ease: [0, 0, 1, 1] });
      keys.push({ t: c, v: +(p.flash * flashAtTime([c], c, m)).toFixed(3), ease: m.ease });
      keys.push({ t: Math.min(c + m.dur, dur), v: 0, ease: "hold" });
    }
    return keys;
  }
  const v = evalTracks({ ...p, keys: { ...p.keys, [track]: [] } }, cuts, dur, 0)[track];
  return [
    { t: 0, v, ease: inout },
    { t: dur, v, ease: inout },
  ];
};

export const GraphEditor: React.FC<{
  p: ReelProps;
  setP: (fn: (o: ReelProps) => ReelProps) => void;
  cuts: number[];
  joins: number[];
  dur: number;
  time: number;
  onSeek: (t: number) => void;
}> = ({ p, setP, cuts, joins, dur, time, onSeek }) => {
  const [track, setTrack] = useState<TrackId>("zoom");
  const [sel, setSel] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const H = 170;
  const drag = useRef<{ i: number; moved: boolean } | null>(null);
  const meta = TRACKS[track];
  const keys = p.keys[track];

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  useEffect(() => setSel(null), [track]);

  // value range: track range, widened to fit the keys
  const vals = keys.map((k) => k.v);
  const vmin = Math.min(meta.min, ...vals);
  const vmax = Math.max(meta.max, ...vals);
  const tx = (t: number) => (t / dur) * w;
  const vy = (v: number) => 8 + ((vmax - v) / (vmax - vmin || 1)) * (H - 16);
  const fromPt = (e: React.PointerEvent | React.MouseEvent) => {
    const r = plotRef.current!.getBoundingClientRect();
    const t = Math.min(Math.max(((e.clientX - r.left) / r.width) * dur, 0), dur);
    const v = vmax - ((e.clientY - r.top - 8) / (H - 16)) * (vmax - vmin);
    return { t: Math.round(t * FPS) / FPS, v: Math.min(Math.max(v, vmin), vmax) };
  };

  const curve = (useKeys: boolean) => {
    const n = Math.max(Math.floor(w / 2), 50);
    const pp = useKeys ? p : { ...p, keys: { ...p.keys, [track]: [] } };
    let d = "";
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * dur;
      const v = evalTracks(pp, cuts, dur, t)[track];
      d += `${i ? "L" : "M"}${tx(t).toFixed(1)} ${vy(v).toFixed(1)}`;
    }
    return d;
  };
  const autoPath = useMemo(() => curve(false), [p, track, w, dur, cuts]);
  const keyPath = useMemo(() => (keys.length ? curve(true) : ""), [p, track, w, dur, cuts]);

  const setKeys = (fn: (k: Key[]) => Key[]) => setP((o) => ({ ...o, keys: { ...o.keys, [track]: fn(o.keys[track]) } }));
  const sorted = keys.map((k, i) => ({ ...k, i })).sort((a, b) => a.t - b.t);
  const selKey = sel !== null ? keys[sel] : null;

  const addAt = (t: number, v?: number) => {
    const value = v ?? evalTracks(p, cuts, dur, t)[track];
    const prev = [...keys].sort((a, b) => a.t - b.t).filter((k) => k.t <= t).pop();
    const k: Key = { t: Math.round(t * FPS) / FPS, v: +value.toFixed(3), ease: prev?.ease ?? [0.42, 0, 0.58, 1] };
    setKeys((ks) => [...ks.filter((x) => Math.abs(x.t - k.t) > 1e-4), k]);
    setSel(keys.filter((x) => Math.abs(x.t - k.t) > 1e-4).length);
  };

  const ticks: number[] = [];
  for (let s = 0; s <= dur; s += 5) ticks.push(s);
  const vticks = [vmin, (vmin + vmax) / 2, vmax];

  return (
    <div className="graph">
      <div className="graph-head">
        <div className="chips" role="tablist" aria-label="الخاصية">
          {TRACK_IDS.map((id) => (
            <button key={id} role="tab" aria-selected={track === id} className={"chip" + (track === id ? " on" : "")} onClick={() => setTrack(id)}>
              {TRACKS[id].label}
              {p.keys[id].length ? <b className="kcount mono">{p.keys[id].length}</b> : null}
            </button>
          ))}
        </div>
        <span className="mode-pill">{keys.length ? "كيفريمات" : "أوتوماتيك"}</span>
      </div>

      <div className="graph-tools">
        <button className="tool" onClick={() => addAt(time)}>+ كيفريم فهاد البلاصة</button>
        <button className="tool" onClick={() => { setKeys(() => bakeTrack(p, track, cuts, dur)); setSel(null); }}>
          حوّل الأوتوماتيك لكيفريمات
        </button>
        <button className="tool danger" disabled={sel === null} onClick={() => { setKeys((ks) => ks.filter((_, i) => i !== sel)); setSel(null); }}>
          حيّد الكيفريم
        </button>
        <button className="tool danger" disabled={!keys.length} onClick={() => { setKeys(() => []); setSel(null); }}>
          رجّع أوتوماتيك
        </button>
      </div>

      <div className="graph-scroll" dir="ltr">
        <div className="graph-grid">
          <div className="graph-axis mono">
            {vticks.map((v, i) => (
              <span key={i} style={{ top: vy(v) - 7 }}>
                {meta.fmt(v)}
              </span>
            ))}
          </div>
          <div
            className="graph-plot"
            ref={plotRef}
            style={{ height: H }}
            onPointerDown={(e) => {
              const target = (e.target as Element).closest("[data-k]");
              if (target) {
                const i = +target.getAttribute("data-k")!;
                setSel(i);
                drag.current = { i, moved: false };
                try { plotRef.current!.setPointerCapture(e.pointerId); } catch {}
                e.preventDefault();
                return;
              }
              onSeek(fromPt(e).t);
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const { t, v } = fromPt(e);
              const i = drag.current.i;
              drag.current.moved = true;
              setKeys((ks) => ks.map((k, j) => (j === i ? { ...k, t, v: Math.round(v / meta.step) * meta.step } : k)));
              onSeek(t);
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onDoubleClick={(e) => {
              if ((e.target as Element).closest("[data-k]")) return;
              const { t, v } = fromPt(e);
              addAt(t, Math.round(v / meta.step) * meta.step);
            }}
          >
            <svg width={w} height={H} className="graph-svg">
              {ticks.map((s) => (
                <line key={s} x1={tx(s)} x2={tx(s)} y1={0} y2={H} className="g-grid" />
              ))}
              {vticks.map((v, i) => (
                <line key={"v" + i} x1={0} x2={w} y1={vy(v)} y2={vy(v)} className="g-grid" />
              ))}
              {cuts.map((c, i) => (
                <line key={"c" + i} x1={tx(c)} x2={tx(c)} y1={0} y2={H} className={joins.some((j) => Math.abs(j - c) < 0.01) ? "g-join" : "g-cut"} />
              ))}
              <path d={autoPath} className={keys.length ? "g-auto dim" : "g-auto"} />
              {keyPath ? <path d={keyPath} className="g-key" /> : null}
              {sorted.map((k) => (
                <g key={k.i} data-k={k.i} transform={`translate(${tx(k.t)} ${vy(k.v)})`} className={"g-kf" + (k.i === sel ? " sel" : "")}>
                  <rect x={-7} y={-7} width={14} height={14} transform="rotate(45)" />
                  <rect x={-14} y={-14} width={28} height={28} className="g-hit" />
                </g>
              ))}
              <line x1={tx(time)} x2={tx(time)} y1={0} y2={H} className="g-playhead" />
            </svg>
          </div>
        </div>
      </div>
      <p className="note">
        دوبل كليك فالمنحنى باش تزيد كيفريم، وجرّ المعين باش تبدل الوقت والقيمة. منين كيكون شي كيفريم فالخاصية، كتولي أنت اللي متحكم فيها بلاصة الأوتوماتيك.
      </p>

      {selKey ? (
        <div className="kf-inspector">
          <h3>
            كيفريم <span className="mono" dir="ltr">{selKey.t.toFixed(2)}s</span>
          </h3>
          <div className="kf-fields">
            <label className="field" htmlFor="kf-t">
              <span>الوقت (ثانية)</span>
              <input
                id="kf-t"
                type="number"
                step={1 / FPS}
                min={0}
                max={dur}
                dir="ltr"
                value={+selKey.t.toFixed(3)}
                onChange={(e) => setKeys((ks) => ks.map((k, j) => (j === sel ? { ...k, t: Math.min(Math.max(+e.target.value, 0), dur) } : k)))}
              />
            </label>
            <label className="field" htmlFor="kf-v">
              <span>القيمة ({meta.label})</span>
              <input
                id="kf-v"
                type="number"
                step={meta.step}
                dir="ltr"
                value={+selKey.v.toFixed(3)}
                onChange={(e) => setKeys((ks) => ks.map((k, j) => (j === sel ? { ...k, v: +e.target.value } : k)))}
              />
            </label>
          </div>
          <p className="note">المنحنى من هاد الكيفريم حتى للي موراه:</p>
          <CurveEditor id="kf-ease" ease={selKey.ease} onChange={(ease) => setKeys((ks) => ks.map((k, j) => (j === sel ? { ...k, ease } : k)))} />
        </div>
      ) : null}
    </div>
  );
};

/* ---------------- motion panel (animation curves for every element) ---------------- */

type Motion = ReelProps["motion"];

const Num: React.FC<{ id: string; label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }> = ({
  id,
  label,
  value,
  min,
  max,
  step,
  fmt,
  onChange,
}) => (
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

const sec = (v: number) => `${v.toFixed(2)}s`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const px = (v: number) => `${Math.round(v)}px`;
const deg = (v: number) => `${Math.round(v)}°`;

export const MotionPanel: React.FC<{ p: ReelProps; setP: (fn: (o: ReelProps) => ReelProps) => void }> = ({ p, setP }) => {
  const m = p.motion;
  const upd = <K extends keyof Motion>(k: K, patch: Partial<Motion[K]>) => setP((o) => ({ ...o, motion: { ...o.motion, [k]: { ...o.motion[k], ...patch } } }));
  const section = <K extends keyof Motion>(k: K, title: string, hint: string, body: React.ReactNode, durOverride?: { value: number; set: (v: number) => void; label?: string }) => (
    <details className="group motion-sec" key={k}>
      <summary>
        <span>{title}</span>
        <span className="mono sub" dir="ltr">
          {sec(durOverride?.value ?? m[k].dur)}
        </span>
      </summary>
      <p className="note">{hint}</p>
      <CurveEditor id={`m-${k}`} ease={m[k].ease} onChange={(ease) => upd(k, { ease } as Partial<Motion[K]>)} />
      {durOverride ? (
        <Num id={`m-${k}-dur`} label={durOverride.label ?? "المدة"} value={durOverride.value} min={0.05} max={1.5} step={0.01} fmt={sec} onChange={durOverride.set} />
      ) : (
        <Num id={`m-${k}-dur`} label="المدة" value={m[k].dur} min={0.03} max={1.5} step={0.01} fmt={sec} onChange={(v) => upd(k, { dur: v } as Partial<Motion[K]>)} />
      )}
      {body}
    </details>
  );

  return (
    <>
      <p className="note">كل حركة فالفيديو عندها المنحنى ديالها والمدة ديالها. حل أي قسم وبدّل، والمعاينة كتبدل مباشرة.</p>
      {section(
        "transition",
        "الزوم فالقطعات (أوتوماتيك)",
        "كيفاش كيتبدل الزوم فكل قطعة. إلا درتي كيفريمات للزوم، هاد الإعداد ما كيبقاش كيخدم.",
        <Num id="m-punch" label="ضربة الزوم" value={p.punch} min={0} max={0.15} step={0.005} fmt={pct} onChange={(v) => setP((o) => ({ ...o, punch: v }))} />,
        { value: p.transition, set: (v) => setP((o) => ({ ...o, transition: Math.max(v, 0.1) })) },
      )}
      {section(
        "flash",
        "الفلاش (أوتوماتيك)",
        "المنحنى ديال الطفيان ديال الفلاش من بعد كل قطعة.",
        <>
          <Num id="m-flash-attack" label="وقت الطلوع" value={m.flash.attack} min={0} max={0.3} step={0.01} fmt={sec} onChange={(v) => upd("flash", { attack: v })} />
          <Num id="m-flash-amt" label="القوة" value={p.flash} min={0} max={1} step={0.05} fmt={pct} onChange={(v) => setP((o) => ({ ...o, flash: v }))} />
        </>,
      )}
      {section(
        "caption",
        "دخول الترجمة",
        "كيفاش كيبانو الكلمات فكل مجموعة.",
        <>
          <Num id="m-cap-scale" label="الحجم فالبداية" value={m.caption.fromScale} min={0} max={1.6} step={0.01} fmt={pct} onChange={(v) => upd("caption", { fromScale: v })} />
          <Num id="m-cap-y" label="الطلعة من لتحت" value={m.caption.fromY} min={-200} max={200} step={1} fmt={px} onChange={(v) => upd("caption", { fromY: v })} />
          <Num id="m-cap-rot" label="الدوران فالبداية" value={m.caption.fromRot} min={-30} max={30} step={1} fmt={deg} onChange={(v) => upd("caption", { fromRot: v })} />
          <Num id="m-cap-blur" label="البلور فالبداية" value={m.caption.fromBlur} min={0} max={30} step={1} fmt={px} onChange={(v) => upd("caption", { fromBlur: v })} />
        </>,
      )}
      {section(
        "word",
        "الكلمة اللي كتنطق",
        "الحركة ديال الكلمة اللي كتضوي.",
        <>
          <Num id="m-word-scale" label="الكبر" value={m.word.scale} min={0} max={0.5} step={0.01} fmt={pct} onChange={(v) => upd("word", { scale: v })} />
          <Num id="m-word-lift" label="الطلعة لفوق" value={m.word.lift} min={0} max={40} step={1} fmt={px} onChange={(v) => upd("word", { lift: v })} />
        </>,
      )}
      {section(
        "icon",
        "الأيقونات",
        "الدخول ديال الأيقونة. الخروج كيكون فآخر الوقت ديالها.",
        <>
          <Num id="m-icon-scale" label="الحجم فالبداية" value={m.icon.fromScale} min={0} max={1.5} step={0.01} fmt={pct} onChange={(v) => upd("icon", { fromScale: v })} />
          <Num id="m-icon-rot" label="الدوران فالبداية" value={m.icon.fromRot} min={-90} max={90} step={1} fmt={deg} onChange={(v) => upd("icon", { fromRot: v })} />
          <Num id="m-icon-out" label="مدة الخروج" value={m.icon.outDur} min={0.05} max={1} step={0.01} fmt={sec} onChange={(v) => upd("icon", { outDur: v })} />
          <Num id="m-icon-float" label="الطفو (فوق/تحت)" value={m.icon.float} min={0} max={30} step={1} fmt={px} onChange={(v) => upd("icon", { float: v })} />
        </>,
      )}
      {section(
        "broll",
        "B-roll",
        "الدخول والخروج ديال الـ B-roll.",
        <>
          <Num id="m-broll-scale" label="الزوم فالبداية" value={m.broll.fromScale} min={0.6} max={1.6} step={0.01} fmt={pct} onChange={(v) => upd("broll", { fromScale: v })} />
          <Num id="m-broll-out" label="مدة الخروج" value={m.broll.outDur} min={0.05} max={1} step={0.01} fmt={sec} onChange={(v) => upd("broll", { outDur: v })} />
        </>,
      )}
      {section(
        "hook",
        "العنوان فالبداية",
        "الحروف كيدخلو وحدة بوحدة.",
        <>
          <Num id="m-hook-stagger" label="الفرق بين الحروف" value={m.hook.stagger} min={0} max={0.2} step={0.005} fmt={sec} onChange={(v) => upd("hook", { stagger: v })} />
          <Num id="m-hook-y" label="الطلعة من لتحت" value={m.hook.fromY} min={-300} max={300} step={1} fmt={px} onChange={(v) => upd("hook", { fromY: v })} />
        </>,
      )}
    </>
  );
};

