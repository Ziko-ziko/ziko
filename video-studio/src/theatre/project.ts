import { getProject } from "@theatre/core";
import { getRemotionEnvironment } from "remotion";
import state from "./state.json";

// Webpack resolves this synchronously, and only when it is called.
declare const require: (id: string) => { default: { initialize: () => void } };

// Theatre Studio (timeline, keyframes, graph editor) only loads inside Remotion
// Studio. Rendering never loads it, so renders always use state.json.
if (typeof window !== "undefined" && getRemotionEnvironment().isStudio) {
  require("@theatre/studio").default.initialize();
}

export const project = getProject("Ziko Motion", { state });
export const sheet = project.sheet("Scene");
