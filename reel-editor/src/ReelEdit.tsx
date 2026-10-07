import React, { useMemo } from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { AnalysisOverlay, BrollFull } from "./Broll";
import { Captions, Hook } from "./Captions";
import { ICON_SHOW, IconBadge } from "./Icons";
import { GRADES, ReelProps, allCuts, clipsOf, flashAtTime, outDuration, outToSrc, srcToOut, zoomAtTime } from "./schema";

export const ReelEdit: React.FC<ReelProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const T = frame / fps; // output time
  const clips = useMemo(() => clipsOf(props), [props.takes]);
  const dur = outDuration(clips);
  const cuts = useMemo(() => allCuts(props, clips, dur), [props.cuts, clips, dur]);
  const s = outToSrc(clips, T); // source time

  const z = zoomAtTime(props, cuts, dur, T);
  const zPrev = zoomAtTime(props, cuts, dur, Math.max(T - 1 / fps, 0));
  const motionBlur = Math.min(Math.abs(z - zPrev) * 60, 4);
  const f = flashAtTime(cuts, T) * props.flash;
  const grade = GRADES[props.grade];

  const layer: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    transform: `scale(${z})`,
    transformOrigin: `50% ${props.anchorY * 100}%`,
  };

  const videos = (glow: boolean) =>
    clips.map((c, i) => (
      <Sequence key={i} from={Math.round(c.outStart * fps)} durationInFrames={Math.max(Math.round((c.to - c.from) * fps), 1)} premountFor={fps}>
        <OffthreadVideo
          src={props.src}
          startFrom={Math.round(c.from * fps)}
          muted={glow}
          style={
            glow
              ? {
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "blur(28px) brightness(1.15)",
                  mixBlendMode: "screen",
                  opacity: Math.min(props.glow * 0.32 + f * 0.75, 1),
                }
              : {
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: `brightness(${1 + f * 0.45})${motionBlur > 0.3 ? ` blur(${motionBlur}px)` : ""}`,
                }
          }
        />
      </Sequence>
    ));

  // b-roll items that land inside kept footage, placed on the output timeline
  const broll = props.brollOn
    ? props.broll
        .map((b) => ({ b, at: srcToOut(clips, b.t) }))
        .filter((x): x is { b: ReelProps["broll"][number]; at: number } => x.at !== null)
    : [];
  const activeAnalysis = broll.find(({ b, at }) => b.kind === "analysis" && T >= at && T < at + b.dur);

  const icons = props.iconsOn ? props.icons.map((ic, i) => ({ ...ic, i })).filter((ic) => s >= ic.t && s < ic.t + ICON_SHOW) : [];

  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <AbsoluteFill style={{ filter: grade.filter }}>
        <div style={layer}>
          {videos(false)}
          {props.glow + f > 0.01 ? videos(true) : null}
          {activeAnalysis ? <AnalysisOverlay local={T - activeAnalysis.at} dur={activeAnalysis.b.dur} /> : null}
        </div>
        {grade.tint.map((tint, i) => (
          <AbsoluteFill key={i} style={{ backgroundColor: tint.color, mixBlendMode: tint.mode, opacity: tint.opacity }} />
        ))}
        {grade.lift > 0 ? <AbsoluteFill style={{ backgroundColor: `rgba(60,42,25,${grade.lift * 2})`, mixBlendMode: "lighten" }} /> : null}
      </AbsoluteFill>
      {grade.vignette > 0 ? (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 65% at 50% 42%, transparent 55%, rgba(0,0,0,${grade.vignette}) 100%)` }} />
      ) : null}

      {broll
        .filter(({ b }) => b.kind !== "analysis")
        .map(({ b, at }, i) => (
          <Sequence key={i} from={Math.round(at * fps)} durationInFrames={Math.max(Math.round(b.dur * fps), 1)} premountFor={fps}>
            <BrollFull item={b} local={T - at} />
          </Sequence>
        ))}

      {icons.map((ic) => (
        <IconBadge key={ic.i} icon={ic.icon} local={s - ic.t} side={ic.i % 2 === 0 ? "right" : "left"} />
      ))}

      <Hook p={props} s={s} />
      {props.captionsOn ? <Captions p={props} s={s} /> : null}

      {f > 0.01 ? (
        <AbsoluteFill
          style={{
            background: "radial-gradient(circle at 50% 35%, #ffffff 0%, #fff4fa 45%, #ffe1ef 100%)",
            mixBlendMode: "screen",
            opacity: f * 0.6,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
