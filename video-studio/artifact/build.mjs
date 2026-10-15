// Bundle the SALMA GLOW studio (Remotion Player + controls) into artifact/studio/studio.js.
import { build } from "esbuild";
import path from "node:path";

const fontsWeb = path.resolve("artifact/fonts-web.ts");
await build({
  entryPoints: ["artifact/studio-entry.tsx"],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  outfile: "artifact/studio/studio.js",
  plugins: [{
    name: "web-fonts",
    setup(b) {
      // src/fonts.ts loads woff2 from public/; in the artifact use Google Fonts instead
      b.onResolve({ filter: /^\.\.\/fonts$/ }, () => ({ path: fontsWeb }));
    },
  }],
});
console.log("built artifact/studio/studio.js");
