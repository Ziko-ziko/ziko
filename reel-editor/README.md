# Reel editor (Remotion)

Talking-head reel edit: zoom changes at each cut, a flash + glow on every transition, a slow push-in inside each part, and three color grades (teal neon, golden warm, emerald dark).

All the edit settings live in `src/schema.ts` (`defaultReel`).

```bash
npm install
npm run studio        # opens Remotion Studio: timeline + live props editor
npm run render        # renders out/reel.mp4 with the current defaultProps
npm run build:editor  # bundles the web timeline editor (editor/) into editor/dist/editor.js
```

To render with settings copied from the web editor ("نسخ الإعدادات"), paste them into `defaultReel` in `src/schema.ts`, or pass them directly:

```bash
npx remotion render ReelEdit out/reel.mp4 --props='{"grade":"golden", ...}'
```
