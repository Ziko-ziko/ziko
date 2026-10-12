import { AbsoluteFill, Audio, Freeze, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ensureFont, hasItalic, heaviestWeight } from "../fonts";
import { Captions } from "../reel1/Captions";
import { type ReelStyle, StyleContext, useStyle } from "../reel1/style";
import { blurOutUp, PerCharacterRise } from "../reel1/TextAnim";
import raw from "./data.json";

const D = raw as unknown as {
  fps: number; duration: number; videoEnd: number; speechEnd: number;
  words: { text: string; start: number; end: number; emph: boolean }[];
  cues: Record<string, number>; shotCuts: number[];
};
const C = D.cues;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const TITLE: React.CSSProperties = { fontFamily: "var(--title-font)", fontWeight: "var(--title-weight)" as never, fontStyle: "var(--title-style)" as never };
const BODY: React.CSSProperties = { fontFamily: "var(--body-font)" };

/** Sticker in the free wall area (top-left), away from Salma's face. Starts exactly on its cue word. */
const Sticker: React.FC<{ at: number; until: number; children: (t: number) => React.ReactNode; top?: number; left?: number; center?: boolean }> = ({
  at, until, children, top = 300, left = 64, center,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < at || t > until) return null;
  const pop = spring({ frame: frame - Math.round(at * fps), fps, config: { damping: 13, stiffness: 210, mass: 0.6 } });
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: center ? 0 : left,
        right: center ? 0 : undefined,
        display: "flex",
        justifyContent: center ? "center" : "flex-start",
        transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])})`,
        transformOrigin: center ? "center" : "left center",
        opacity: Math.min(1, pop * 1.5),
        ...blurOutUp(t, until - 0.18, until),
      }}
    >
      <div>{children(t)}</div>
    </div>
  );
};

const Pill: React.FC<{ label?: string; title: string; at: number; icon?: React.ReactNode }> = ({ label, title, at, icon }) => {
  const { accent } = useStyle();
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 20,
        background: "rgba(255,255,255,0.94)",
        borderRadius: 26,
        padding: "18px 30px 20px 22px",
        boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
        borderLeft: `8px solid ${accent}`,
      }}
    >
      {icon}
      <div>
        {label && (
          <div style={{ ...BODY, fontWeight: 700, fontSize: 24, letterSpacing: "0.24em", color: "#7a6f76" }}>
            <PerCharacterRise text={label} at={at} stagger={0.015} />
          </div>
        )}
        <div style={{ ...TITLE, fontSize: 64, lineHeight: 1.05, color: accent }}>
          <PerCharacterRise text={title} at={at + 0.05} stagger={0.02} />
        </div>
      </div>
    </div>
  );
};

/** Heart that pops on "j'aime". */
const Heart: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { accent } = useStyle();
  const beat = spring({ frame: frame - Math.round((at + 0.35) * fps), fps, config: { damping: 6, stiffness: 300 } });
  return (
    <svg width={64} height={60} viewBox="0 0 24 22" style={{ transform: `scale(${1 + (1 - beat) * 0.25})` }}>
      <path d="M12 21s-8.5-5.4-10.6-10.3C-.3 6.6 2.6 2 6.8 2c2.3 0 4 1.3 5.2 3 1.2-1.7 2.9-3 5.2-3 4.2 0 7.1 4.6 5.4 8.7C20.5 15.6 12 21 12 21z" fill={accent} />
    </svg>
  );
};

/** Drop icon that fills on "hydratation". */
const Drop: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { accent } = useStyle();
  const fill = interpolate(frame / fps, [at + 0.1, at + 0.9], [0, 1], clamp);
  return (
    <svg width={56} height={72} viewBox="0 0 28 36">
      <defs>
        <clipPath id="drop"><path d="M14 1C14 1 2 15 2 23a12 12 0 0 0 24 0C26 15 14 1 14 1z" /></clipPath>
      </defs>
      <path d="M14 1C14 1 2 15 2 23a12 12 0 0 0 24 0C26 15 14 1 14 1z" fill="none" stroke={accent} strokeWidth={2.4} />
      <rect x={0} y={36 - 36 * fill} width={28} height={36} fill={accent} opacity={0.85} clipPath="url(#drop)" />
    </svg>
  );
};

/** Skin layers with a dot travelling down on "en profondeur". */
const Depth: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { accent } = useStyle();
  const p = interpolate(frame / fps, [at, at + 0.9], [0, 1], clamp);
  return (
    <svg width={70} height={76} viewBox="0 0 70 76">
      {[14, 36, 58].map((y, i) => (
        <path key={i} d={`M4 ${y} Q 20 ${y - 6} 35 ${y} T 66 ${y}`} stroke={i === 2 ? accent : "#c9b9c2"} strokeWidth={3} fill="none" />
      ))}
      <line x1={35} x2={35} y1={2} y2={2 + 56 * p} stroke={accent} strokeWidth={3} strokeDasharray="4 4" />
      <circle cx={35} cy={2 + 56 * p} r={6} fill={accent} />
    </svg>
  );
};

/** Arrow rising on "lifting". */
const Lift: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { accent } = useStyle();
  const p = spring({ frame: frame - Math.round(at * fps), fps, config: { damping: 12, stiffness: 160 } });
  return (
    <svg width={60} height={72} viewBox="0 0 30 36" style={{ transform: `translateY(${(1 - p) * 26}px)` }}>
      <path d="M15 34V4M4 14 15 3l11 11" stroke={accent} strokeWidth={3.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/** Product name card on "RRS HA Long Lasting" (close-up shot): below the captions, off her face. */
const ProductCard: React.FC<{ at: number; until: number }> = ({ at, until }) => {
  const { accent } = useStyle();
  return (
    <Sticker at={at} until={until} top={1470} center>
      {() => (
        <div style={{ textAlign: "center", background: "rgba(255,255,255,0.95)", borderRadius: 30, padding: "22px 46px 24px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <div style={{ ...TITLE, fontSize: 70, color: accent, lineHeight: 1 }}>
            <PerCharacterRise text="RRS® HA" at={at} stagger={0.03} />
          </div>
          <div style={{ ...BODY, fontWeight: 700, fontSize: 28, letterSpacing: "0.32em", color: "#3b3238", marginTop: 8 }}>
            <PerCharacterRise text="LONG LASTING" at={at + 0.2} stagger={0.02} />
          </div>
        </div>
      )}
    </Sticker>
  );
};

const SFX: [number, string, number][] = [
  [C.spanish, "pop", 0.6],
  [C.rrs - 0.12, "whoosh", 0.7],
  [C.jaime, "pop", 0.6],
  [C.skinbooster, "pop", 0.6],
  [C.profondeur, "pop", 0.5],
  [C.hydratation, "pop", 0.6],
  [C.lifting, "chime", 0.7],
];

export const SubEdit: React.FC<ReelStyle> = (style) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const { body, title, titleItalic } = style.fonts;
  ensureFont(body);
  ensureFont(title);
  const vars = {
    "--body-font": `"${body}"`,
    "--title-font": `"${title}"`,
    "--title-weight": String(heaviestWeight(title)),
    "--title-style": titleItalic && hasItalic(title) ? "italic" : "normal",
  } as React.CSSProperties;
  const videoFrames = Math.floor(D.videoEnd * fps);
  const end = D.duration;
  const nextCut = (t: number) => D.shotCuts.find((c) => c > t + 0.05) ?? end;

  return (
    <StyleContext.Provider value={style}>
      <AbsoluteFill style={{ background: "#000", ...vars }}>
        <Sequence durationInFrames={videoFrames} layout="none">
          <OffthreadVideo src={staticFile("sub/source_4k.mp4")} muted style={{ width: 1080, height: 1920 }} />
        </Sequence>
        {/* hold the last frame so the final sticker stays readable */}
        <Sequence from={videoFrames} layout="none">
          <Freeze frame={videoFrames - 1}>
            <OffthreadVideo src={staticFile("sub/source_4k.mp4")} muted style={{ width: 1080, height: 1920 }} />
          </Freeze>
        </Sequence>

        <Sticker at={C.spanish} until={nextCut(C.spanish)}>
          {() => <Pill label="PROTOCOLE" title="Spanish Glow" at={C.spanish} />}
        </Sticker>
        <ProductCard at={C.rrs} until={nextCut(C.rrs)} />
        <Sticker at={C.jaime} until={C.skinbooster}>
          {() => <Pill title="coup de cœur" at={C.jaime} icon={<Heart at={C.jaime} />} />}
        </Sticker>
        <Sticker at={C.skinbooster} until={C.profondeur}>
          {() => <Pill label="LE PRODUIT" title="Skinbooster" at={C.skinbooster} />}
        </Sticker>
        <Sticker at={C.profondeur} until={C.hydratation}>
          {() => <Pill label="INJECTION" title="en profondeur" at={C.profondeur} icon={<Depth at={C.profondeur} />} />}
        </Sticker>
        <Sticker at={C.hydratation} until={C.lifting}>
          {() => <Pill label="HYDRATATION" title="profonde" at={C.hydratation} icon={<Drop at={C.hydratation} />} />}
        </Sticker>
        <Sticker at={C.lifting} until={end + 1}>
          {() => <Pill label="EFFET" title="Lifting" at={C.lifting} icon={<Lift at={C.lifting} />} />}
        </Sticker>

        <Captions words={D.words} until={D.speechEnd + 0.4} />

        {style.progressBar && (
          <div style={{ position: "absolute", top: 0, left: 0, height: 8, width: `${(frame / (end * fps)) * 100}%`, background: style.accent }} />
        )}
        <Audio src={staticFile("sub/voice_enhanced.wav")} />
        {SFX.map(([at, name, vol], i) => (
          <Sequence key={i} from={Math.max(0, Math.round(at * fps))} layout="none">
            <Audio src={staticFile(`sub/${name}.wav`)} volume={Math.min(1, vol * style.sfxVolume)} />
          </Sequence>
        ))}
      </AbsoluteFill>
    </StyleContext.Provider>
  );
};
