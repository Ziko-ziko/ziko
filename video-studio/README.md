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
- `TheatreScene` — animation b keyframes dyal Theatre.js (chouf l-te7t)
- `LowerThird` — smiya + role b background transparent (ProRes 4444) bach t7tto fo9 ay video

Bdel text/colors f `src/Root.tsx` (`defaultProps`) ola mn Remotion Studio direct.

## Theatre.js — keyframes w graph editor b7al After Effects 🎛️

Composition `TheatreScene` kat7errek b **Theatre.js**: kol 7aja (position, scale, rotation, opacity, blur, color...) tqder t7ett liha keyframes b l-mouse w tbeddel l-easing f **graph editor**.

1. `npm run studio` w 7el `TheatreScene`.
2. F jenb l-issar, kliki 3la **Title** wla **Shape** → l-props kaybanou f limen, w timeline dyal Theatre kayban l-te7t.
3. **Keyframe:** kliki 3la l-icône `◆` 7da l-prop, w bdel l-9ima f wa9t akhor.
4. **Graph editor:** kliki 3la l-icône dyal curve 7da l-prop. Wla kliki 3la l-khat bin 2 keyframes bach tkhtar easing (ease-in, ease-out, back...).
5. L-playhead dyal Remotion kaykhdem m3a Theatre: ila tbeddel frame f Remotion, Theatre kaytba3o.
6. `Alt + \` (Mac: `Option + \`) bach t-khbi/tbyen interface dyal Theatre.

**Bach tsauvgardi l-animation l render:**
Theatre kaykhzen l-modifications f browser. Mli tsali, kliki 3la **Ziko Motion** (l-project f l-issar) → **Export Ziko Motion to JSON**, w 7ett l-fichier blast `src/theatre/state.json`. Mn ba3d: `npm run render:theatre`.

> Bach trja3 l-animation l-asliya: `python3 scripts/make_theatre_state.py`

## Montage dyal Reel (talking head) — `projects/reel1/`

Pipeline kamel li tsta3mel f `Reel1` (kat9der t3awdo l ay video jdida):

```bash
.venv/bin/python scripts/transcribe.py raw.mp4 projects/reel1/analysis/transcript.json fr   # transcription + timing
.venv/bin/python scripts/track_face.py raw.mp4 projects/reel1/analysis/face.json            # tracking dyal l-wjah
projects/reel1/make_assets.sh raw.mp4        # color grade + n9a l-sout + SFX + music
.venv/bin/python projects/reel1/build_data.py   # takes, captions, zooms, markers -> src/reel1/data.json
npx remotion render src/index.ts Reel1 out/reel1.mp4
python3 projects/reel1/export_srt.py           # subtitles .srt
```

- Bach tbeddel text dyal subtitles wla les takes: `CHUNKS` w `SEGMENTS` f `projects/reel1/build_data.py`.
- Effects: `src/reel1/` (BrollFeed, FaceHUD, BrollStandard, Captions, EndCard...).

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
