import { Player } from "@remotion/player";
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { SubEdit } from "../src/sub/SubEdit";
import subData from "../src/sub/data.json";
import type { ReelStyle } from "../src/reel1/style";
import { FONT_FAMILIES, ensureFont } from "./fonts-web";
import defaults from "./defaults.json";

// Map the composition's staticFile() names to the light preview files published next to this page.
(window as unknown as { remotion_staticFiles: { name: string; src: string }[] }).remotion_staticFiles = [
  { name: "sub/source_4k.mp4", src: "sub/source.mp4" },
  { name: "sub/voice_enhanced.wav", src: "sub/voice.mp3" },
  { name: "sub/pop.wav", src: "sub/pop.mp3" },
  { name: "sub/whoosh.wav", src: "sub/whoosh.mp3" },
  { name: "sub/chime.wav", src: "sub/chime.mp3" },
];

const KEY = "salma-glow-studio:v1";
const DEFAULTS = defaults as unknown as ReelStyle;

function load(): ReelStyle {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable: use defaults */
  }
  return DEFAULTS;
}

type Setter = (fn: (s: ReelStyle) => ReelStyle) => void;

const Field: React.FC<{ label: string; hint?: string; id: string; children: React.ReactNode }> = ({ label, hint, id, children }) => (
  <div className="field">
    <label htmlFor={id}>
      {label}
      {hint && <span className="hint">{hint}</span>}
    </label>
    {children}
  </div>
);

const Slider: React.FC<{ id: string; label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }> = ({
  id, label, value, min, max, step = 1, unit = "", onChange,
}) => (
  <Field id={id} label={label} hint={`${Number(value.toFixed(2))}${unit}`}>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </Field>
);

const Select: React.FC<{ id: string; label: string; value: string; options: [string, string][]; onChange: (v: string) => void }> = ({ id, label, value, options, onChange }) => (
  <Field id={id} label={label}>
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  </Field>
);

const Toggle: React.FC<{ id: string; label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ id, label, checked, onChange }) => (
  <label className="toggle" htmlFor={id}>
    <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span>{label}</span>
  </label>
);

const Panel: React.FC<{ s: ReelStyle; set: Setter }> = ({ s, set }) => {
  const cap = (patch: Partial<ReelStyle["captions"]>) => set((x) => ({ ...x, captions: { ...x.captions, ...patch } }));
  const fonts = (patch: Partial<ReelStyle["fonts"]>) => set((x) => ({ ...x, fonts: { ...x.fonts, ...patch } }));
  const fam = FONT_FAMILIES.map((f) => [f, f] as [string, string]);
  return (
    <>
      <section>
        <h2>Couleur</h2>
        <Field id="accent" label="Couleur principale" hint={s.accent}>
          <input id="accent" type="color" value={s.accent} onChange={(e) => set((x) => ({ ...x, accent: e.target.value, captions: { ...x.captions, emphasisColor: e.target.value } }))} />
        </Field>
      </section>
      <section>
        <h2>Sous-titres</h2>
        <Slider id="cap-size" label="Taille" value={s.captions.fontSize} min={36} max={120} unit=" px" onChange={(v) => cap({ fontSize: v })} />
        <Slider id="cap-y" label="Position verticale" value={s.captions.y} min={800} max={1750} step={10} unit=" px" onChange={(v) => cap({ y: v })} />
        <Select id="cap-weight" label="Graisse" value={s.captions.fontWeight} options={[["500", "Medium 500"], ["600", "SemiBold 600"], ["700", "Bold 700"], ["800", "ExtraBold 800"], ["900", "Black 900"]]} onChange={(v) => cap({ fontWeight: v as ReelStyle["captions"]["fontWeight"] })} />
        <Slider id="cap-words" label="Mots par page" value={s.captions.maxWordsPerPage} min={1} max={5} onChange={(v) => cap({ maxWordsPerPage: v })} />
        <Select id="cap-hl" label="Mot actif" value={s.captions.highlightStyle} options={[["box", "Bloc couleur"], ["color", "Texte couleur"], ["underline", "Souligné"], ["none", "Aucun"]]} onChange={(v) => cap({ highlightStyle: v as ReelStyle["captions"]["highlightStyle"] })} />
        <Select id="cap-in" label="Entrée" value={s.captions.enterAnimation} options={[["perCharacterRise", "PerCharacterRise"], ["lineByLineSlide", "LineByLineSlide"], ["pop", "Pop"]]} onChange={(v) => cap({ enterAnimation: v as ReelStyle["captions"]["enterAnimation"] })} />
        <Select id="cap-out" label="Sortie" value={s.captions.exitAnimation} options={[["blurOutUp", "BlurOutUp"], ["none", "Aucune"]]} onChange={(v) => cap({ exitAnimation: v as ReelStyle["captions"]["exitAnimation"] })} />
        <div className="toggles">
          <Toggle id="cap-upper" label="Majuscules" checked={s.captions.uppercase} onChange={(v) => cap({ uppercase: v })} />
          <Toggle id="cap-shadow" label="Ombre" checked={s.captions.shadow} onChange={(v) => cap({ shadow: v })} />
        </div>
      </section>
      <section>
        <h2>Polices</h2>
        <Select id="font-body" label="Texte (sous-titres)" value={s.fonts.body} options={fam} onChange={(v) => fonts({ body: v as ReelStyle["fonts"]["body"] })} />
        <Select id="font-title" label="Mots clés et stickers" value={s.fonts.title} options={fam} onChange={(v) => fonts({ title: v as ReelStyle["fonts"]["title"] })} />
        <div className="toggles">
          <Toggle id="font-italic" label="Italique" checked={s.fonts.titleItalic} onChange={(v) => fonts({ titleItalic: v })} />
          <Toggle id="font-emph" label="Mots clés en 2e police" checked={s.fonts.emphasisInTitleFont} onChange={(v) => fonts({ emphasisInTitleFont: v })} />
        </div>
      </section>
      <section>
        <h2>Son et détails</h2>
        <Slider id="sfx" label="Volume des effets" value={s.sfxVolume} min={0} max={1.5} step={0.05} onChange={(v) => set((x) => ({ ...x, sfxVolume: v }))} />
        <div className="toggles">
          <Toggle id="bar" label="Barre de progression" checked={s.progressBar} onChange={(v) => set((x) => ({ ...x, progressBar: v }))} />
        </div>
      </section>
    </>
  );
};

const App: React.FC = () => {
  const [s, setS] = useState<ReelStyle>(load);
  const [copied, setCopied] = useState("");
  useEffect(() => {
    ensureFont(s.fonts.body);
    ensureFont(s.fonts.title);
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [s]);
  const json = useMemo(() => JSON.stringify(s), [s]);
  const copy = () => {
    const done = () => setCopied("Réglages copiés. Colle-les dans le chat pour le rendu 4K.");
    navigator.clipboard?.writeText(json).then(done, () => {
      (document.getElementById("settings-json") as HTMLTextAreaElement | null)?.select();
      setCopied("Sélectionne le texte ci-dessous et copie-le.");
    }) ?? setCopied("Sélectionne le texte ci-dessous et copie-le.");
  };
  return (
    <div className="studio">
      <div className="stage">
        <Player
          component={SubEdit}
          inputProps={s}
          durationInFrames={Math.round(subData.duration * 30)}
          compositionWidth={1080}
          compositionHeight={1920}
          fps={30}
          controls
          loop
          acknowledgeRemotionLicense
          style={{ width: "100%", aspectRatio: "9 / 16" }}
        />
        <p className="note">Aperçu en 720p. Le rendu final est en 4K.</p>
      </div>
      <aside className="panel">
        <header>
          <p className="eyebrow">Style SALMA GLOW</p>
          <h1>RRS HA · Spanish Glow</h1>
        </header>
        <Panel s={s} set={(fn) => setS((x) => fn(x))} />
        <div className="actions">
          <button className="primary" type="button" onClick={copy}>Copier les réglages</button>
          <button type="button" onClick={() => setS(DEFAULTS)}>Réinitialiser</button>
        </div>
        {copied && <p className="status" role="status">{copied}</p>}
        <textarea id="settings-json" readOnly value={json} rows={3} aria-label="Réglages au format JSON" />
      </aside>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
