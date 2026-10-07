import React from "react";
import { AbsoluteFill, OffthreadVideo, useCurrentFrame, useVideoConfig } from "remotion";
import { GRADES, ReelProps, flashAtTime, zoomAtTime } from "./schema";

export const ReelEdit: React.FC<ReelProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const z = zoomAtTime(props, t);
  const zPrev = zoomAtTime(props, Math.max(t - 1 / fps, 0));
  const motionBlur = Math.min(Math.abs(z - zPrev) * 60, 4);
  const f = flashAtTime(props, t) * props.flash;
  const grade = GRADES[props.grade];

  const layer: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    transform: `scale(${z})`,
    transformOrigin: `50% ${props.anchorY * 100}%`,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <AbsoluteFill style={{ filter: grade.filter }}>
        <div style={layer}>
          <OffthreadVideo
            src={props.src}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: `brightness(${1 + f * 0.45})${motionBlur > 0.3 ? ` blur(${motionBlur}px)` : ""}`,
            }}
          />
          {props.glow + f > 0.01 ? (
            <OffthreadVideo
              src={props.src}
              muted
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "blur(28px) brightness(1.15)",
                mixBlendMode: "screen",
                opacity: Math.min(props.glow * 0.32 + f * 0.75, 1),
              }}
            />
          ) : null}
        </div>
        {grade.tint.map((tint, i) => (
          <AbsoluteFill key={i} style={{ backgroundColor: tint.color, mixBlendMode: tint.mode, opacity: tint.opacity }} />
        ))}
        {grade.lift > 0 ? (
          <AbsoluteFill style={{ backgroundColor: `rgba(60,42,25,${grade.lift * 2})`, mixBlendMode: "lighten" }} />
        ) : null}
      </AbsoluteFill>
      {grade.vignette > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 75% 65% at 50% 42%, transparent 55%, rgba(0,0,0,${grade.vignette}) 100%)`,
          }}
        />
      ) : null}
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
