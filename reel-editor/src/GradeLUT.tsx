import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { GRADES, GradeId } from "./schema";

// Renders a HALD identity image through a colour grade (filters + tint layers, no vignette),
// so scripts/hald_to_cube.py can turn the result into a .cube LUT for DaVinci / Premiere.
export const GradeLUT: React.FC<{ grade: GradeId }> = ({ grade }) => {
  const g = GRADES[grade];
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ filter: g.filter }}>
        <Img src={staticFile("lut/hald6.png")} style={{ width: 216, height: 216, imageRendering: "pixelated" }} />
        {g.tint.map((t, i) => (
          <AbsoluteFill key={i} style={{ backgroundColor: t.color, mixBlendMode: t.mode, opacity: t.opacity }} />
        ))}
        {g.lift > 0 ? <AbsoluteFill style={{ backgroundColor: `rgba(60,42,25,${g.lift * 2})`, mixBlendMode: "lighten" }} /> : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
