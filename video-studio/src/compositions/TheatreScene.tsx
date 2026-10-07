import { types } from "@theatre/core";
import { AbsoluteFill } from "remotion";
import { sheet } from "../theatre/project";
import { useTheatre } from "../theatre/useTheatre";

// Every prop below shows up in Theatre Studio, where you can keyframe it and
// shape its easing in the graph editor (like After Effects).
const titleObj = sheet.object("Title", {
  x: types.number(0, { nudgeMultiplier: 1 }),
  y: types.number(0, { nudgeMultiplier: 1 }),
  scale: types.number(1, { range: [0, 4], nudgeMultiplier: 0.01 }),
  rotation: types.number(0, { nudgeMultiplier: 0.5 }),
  opacity: types.number(1, { range: [0, 1], nudgeMultiplier: 0.01 }),
  blur: types.number(0, { range: [0, 60] }),
  letterSpacing: types.number(0.02, { range: [-0.1, 0.5], nudgeMultiplier: 0.005 }),
  color: types.rgba({ r: 1, g: 1, b: 1, a: 1 }),
});

const shapeObj = sheet.object("Shape", {
  x: types.number(0, { nudgeMultiplier: 1 }),
  y: types.number(0, { nudgeMultiplier: 1 }),
  size: types.number(520, { range: [0, 2000] }),
  rotation: types.number(0, { nudgeMultiplier: 0.5 }),
  borderRadius: types.number(6, { range: [0, 50] }),
  opacity: types.number(0.35, { range: [0, 1], nudgeMultiplier: 0.01 }),
  color: types.rgba({ r: 1, g: 0.24, b: 0.43, a: 1 }),
});

const css = (c: { r: number; g: number; b: number; a: number }) =>
  `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a})`;

export const TheatreScene: React.FC<{ title: string }> = ({ title }) => {
  const t = useTheatre(titleObj);
  const s = useTheatre(shapeObj);

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 45%, #1b1d38 0%, #06060c 75%)",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: s.size,
          height: s.size,
          borderRadius: `${s.borderRadius}%`,
          background: css(s.color),
          opacity: s.opacity,
          transform: `translate(${s.x}px, ${s.y}px) rotate(${s.rotation}deg)`,
        }}
      />
      <div
        style={{
          fontFamily: "Roboto, 'Noto Sans', sans-serif",
          fontWeight: 900,
          fontSize: 170,
          color: css(t.color),
          letterSpacing: `${t.letterSpacing}em`,
          opacity: t.opacity,
          filter: t.blur > 0.01 ? `blur(${t.blur}px)` : undefined,
          transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale}) rotate(${t.rotation}deg)`,
          whiteSpace: "pre",
        }}
      >
        {title}
      </div>
    </AbsoluteFill>
  );
};
