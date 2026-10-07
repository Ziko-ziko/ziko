import { zColor } from "@remotion/zod-types";
import { createContext, useContext } from "react";
import { z } from "zod";

// Everything here shows up as editable controls in Remotion Studio (right panel → Props).
const weight = z.enum(["400", "500", "600", "700", "800", "900"]);

export const reelSchema = z.object({
  accent: zColor().describe("Main color (highlights, stickers, HUD, progress bar)"),
  captions: z.object({
    show: z.boolean(),
    y: z.number().min(200).max(1800).step(10).describe("Vertical position (px from top)"),
    fontSize: z.number().min(30).max(160).step(1),
    fontWeight: weight,
    italic: z.boolean(),
    uppercase: z.boolean(),
    letterSpacing: z.number().min(-0.1).max(0.3).step(0.005),
    maxWordsPerPage: z.number().int().min(1).max(6),
    textColor: zColor(),
    emphasisColor: zColor().describe("Color of key words once spoken"),
    highlightStyle: z.enum(["box", "color", "underline", "none"]),
    highlightTextColor: zColor().describe("Text color of the active word"),
    activeWordScale: z.number().min(1).max(1.5).step(0.01),
    activeWordRotation: z.number().min(-10).max(10).step(0.5),
    shadow: z.boolean(),
  }),
  hook: z.object({
    show: z.boolean(),
    label: z.string(),
    line1: z.string(),
    line2: z.string().describe("Use *word* to color a word with the accent"),
    y: z.number().min(40).max(1600).step(10),
    fontSize: z.number().min(30).max(160).step(1),
    fontWeight: weight,
    labelSize: z.number().min(14).max(60).step(1),
  }),
  feed: z.object({
    labels: z.array(z.string()).describe("Stickers on lèvres / pommettes / profils"),
    labelSize: z.number().min(24).max(110).step(1),
    labelY: z.number().min(200).max(1500).step(10),
  }),
  hud: z.object({
    show: z.boolean(),
    labelSize: z.number().min(14).max(60).step(1),
    uniqueText: z.string(),
  }),
  stamp: z.object({ text: z.string(), fontSize: z.number().min(40).max(200).step(1), rotation: z.number().min(-30).max(30).step(0.5) }),
  endCard: z.object({
    line1: z.string(),
    line2: z.string().describe("Use *word* to color a word with the accent"),
    subtitle: z.string(),
    titleSize: z.number().min(30).max(160).step(1),
    titleWeight: weight,
    titleItalic: z.boolean(),
    subtitleSize: z.number().min(14).max(70).step(1),
    y: z.number().min(0).max(1200).step(10).describe("Top of the face drawing"),
  }),
  progressBar: z.boolean(),
  musicVolume: z.number().min(0).max(1).step(0.05),
  sfxVolume: z.number().min(0).max(1.5).step(0.05),
});

export type ReelStyle = z.infer<typeof reelSchema>;


export const StyleContext = createContext<ReelStyle | null>(null);
export const useStyle = () => {
  const style = useContext(StyleContext);
  if (!style) throw new Error("useStyle() must be used inside <ReelEdit>");
  return style;
};

/** Render "a le *même* visage" with the *starred* part in the accent color. */
export function accentText(text: string, accent: string) {
  return text.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith("*") && part.endsWith("*") ? (
      <span key={i} style={{ color: accent }}>
        {part.slice(1, -1)}
      </span>
    ) : (
      part
    ),
  );
}
