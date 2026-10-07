# Reel editor (Remotion)

Talking-head reel edit: retakes removed, word-by-word animated subtitles, popping icons, motion-graphic B-roll,
zoom changes at each cut, a flash + glow on every transition, a slow push-in inside each part, and three color
grades (teal neon, golden warm, emerald dark).

All the edit settings live in `src/data.ts` (`defaultReel`). Times there are positions in the raw video, so
turning a take on or off keeps subtitles, icons and B-roll on the right words. Subtitle lines marked `GUESS`
were unclear in the audio and should be checked.

```bash
npm install
npm run studio        # opens Remotion Studio: timeline + live props editor
npm run render        # renders out/reel.mp4 with the current defaultProps
npm run build:editor  # bundles the web timeline editor (editor/) into editor/dist/editor.js
```

To render with settings copied from the web editor ("نسخ الإعدادات"), paste them into `defaultReel` in `src/data.ts`, or pass them directly:

```bash
npx remotion render ReelEdit out/reel.mp4 --props='{"grade":"golden", ...}'
```
