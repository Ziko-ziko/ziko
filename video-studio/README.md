# Ziko Video Studio 🎬

Toolkit kamel dyal **video editing, animation w motion graphics** — kolchi b code, kaykhdem f terminal.

## Installation (mra wa7da)

```bash
cd video-studio
./setup.sh
```

## Chno kayn

| Tool | L chno | Kifach |
|------|--------|--------|
| **Remotion** (React) | Motion graphics, titles, intros, lower thirds, animations | `npm run studio` (preview f browser), `npm run render:intro` |
| **Hyperframes** (HTML + GSAP) | Animations b HTML/CSS, sahla bzaf | `cd hyperframes && npx hyperframes preview` / `render` |
| **ffmpeg** | Cut, merge, music, subtitles, vertical, GIF... | `scripts/edit.sh` |
| **MoviePy** (Python) | Montage b Python (clips + text + transitions) | `.venv/bin/python scripts/moviepy_example.py a.mp4 b.mp4` |
| **Manim** (Python) | Animations dyal shapes, math, explainers | `.venv/bin/manim -qh scripts/manim_example.py LogoReveal` |
| **Blender** | 3D motion graphics (3D text, logos) | `blender -b --python scripts/blender_text3d.py -- "TEXT" out/x.mp4` |
| ImageMagick / Inkscape | Images, SVG, logos | `convert`, `inkscape` |
| sox / librosa / pydub | Audio editing, beat detection | |
| edge-tts / gTTS | Voiceover b AI (text → voice) | `.venv/bin/edge-tts --text "Salam" --write-media out/voice.mp3` |
| PySceneDetect | Detect cuts f video | `.venv/bin/scenedetect -i in.mp4 detect-content split-video` |

## Remotion compositions (`src/compositions/`)

- `TitleIntro` — intro animé 1920x1080 (w `TitleIntroVertical` 1080x1920 l Reels/TikTok)
- `LowerThird` — smiya + role b background transparent (ProRes 4444) bach t7tto fo9 ay video

Bdel text/colors f `src/Root.tsx` (`defaultProps`) ola mn Remotion Studio direct.

## `scripts/edit.sh` — ffmpeg sahel

```bash
scripts/edit.sh cut      in.mp4 00:00:05 00:00:12 out.mp4   # 9te3
scripts/edit.sh concat   out.mp4 a.mp4 b.mp4 c.mp4          # jme3
scripts/edit.sh overlay  video.mp4 out/lower-third.mov out.mp4 2   # lower third f second 2
scripts/edit.sh vertical in.mp4 out.mp4                     # 16:9 -> 9:16 (TikTok/Reels)
scripts/edit.sh subs     in.mp4 subs.srt out.mp4            # subtitles
scripts/edit.sh music    in.mp4 song.mp3 out.mp4 0.2        # musique f background
scripts/edit.sh speed    in.mp4 0.5 out.mp4                 # slow-motion
scripts/edit.sh fade     in.mp4 out.mp4 1                   # fade in/out
scripts/edit.sh gif      in.mp4 out.gif 15 640              # GIF
scripts/edit.sh info     in.mp4                             # ma3lomat
```

## Remotion Agent Skills (l Claude / AI agents)

F `.agents/skills/` (w symlinks f `.claude/skills/`) kaynin 12 skills rasmiyin dyal Remotion:
best-practices, create, captions, render, studio, multimedia, maps, interactivity, docs, upgrade...
Ila khdemti b Claude Code mn west `video-studio/`, kaybanou wa7dhom.
Update: `npx skills add remotion-dev/skills --yes`

## Notes

- Ila Remotion ma l9ach browser (server bla internet), `remotion.config.ts` kaykhdem b Playwright headless shell automatiquement.
- Blender f server bla GPU: kaykhdem b Cycles CPU. F PC dyalk b GPU, bdel `ENGINE` l `BLENDER_EEVEE` (asra3).
- Remotion: free l individuals w companies sghar; companies kbar khasshom license (remotion.dev/license).
