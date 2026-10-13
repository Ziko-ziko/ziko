# Style "SALMA GLOW" ✨

The house style for **Salma**'s videos (aesthetic medicine / injections). It can also be used for other clients.
When the user says **"SALMA GLOW"** (or "ستايل سلمى" / "style Salma"), apply **every** rule below.
Reference implementation: `src/reel1/` (composition `Reel1`) with the default props in `src/Root.tsx`.

## 1. Timing (the most important rule)
- Every animation, sticker, B-roll and highlight **starts exactly on the word it illustrates**: never before, never after.
- Never trust estimated word times for animation cues. Measure them:
  1. `.venv/bin/python scripts/transcribe.py video.mp4 transcript.json fr` (rough chunks).
  2. For every cue word, find its onset with `scripts/asr_window.py video.mp4 START END`,
     sliding START until the text starts with the word.
  3. Put the measured boundaries in `CHUNKS` (`build_data.py`) and use them for markers.
- Caption words are highlighted while they are spoken.

## 2. Subtitles
- Small and clean: **Montserrat 700**, ~64 px on a 1080x1920 frame, uppercase, `y ≈ 1300` (chest level, clear of the Instagram UI).
- 3 words per page max. The active word gets a rounded **pink box** (`#ff3fa4`).
- **Key words** (product, result, emotion words) in the second font: **Playfair Display Italic**, lowercase, slightly larger.
- Animations: enter **PerCharacterRise**, exit **BlurOutUp**.
- Only show subtitles while she speaks.

## 3. Two fonts
| Role | Font |
|---|---|
| Body / subtitles / labels | **Montserrat** (600–800) |
| Key words, stickers, stamps, end card | **Playfair Display** Italic (classic, attractive) |

## 4. Colors and image
- Accent: **pink `#ff3fa4`**, gold `#f3d9b1` for line art, dark `#0b090d` backgrounds.
- **Original colors** of the footage, no grade.
- Never put text or graphics **on her head or face**.
- Graphics (face analysis, symmetry, etc.) go in **full-screen opaque B-rolls**, never over her.
- Line-art face (`FaceArt`) ~400 px in B-rolls.
- Punch-in zooms on cuts (1.0 → 1.3) to hide jump cuts.

## 5. Sound
- Voice: `scripts/enhance_voice.py` (AI denoise DPDFNet 48 kHz + EQ, de-esser, compression, -14 LUFS).
- SFX: whoosh on B-roll in/out, pop on stickers, glitch on stamps, chime on the end card.
- **No music in the export**: she adds a trending sound in Instagram/TikTok (original audio 100%, music 10–20%).

## 6. Export
- 4K 2160x3840 (`--scale=2`, footage upscaled with Lanczos), 30 fps.
- For chat delivery: HEVC ~6 Mbps (< 30 MB). The full 4K render stays in `out/`.

## 7. Video types
- **Talking head** (like `Reel1`): best takes, captions, motion-graphic B-rolls, end card.
- **Injection / procedure video**: keep the procedure footage clean (no captions there).
  Captions + light animations **only while she speaks**. Add a few product-value accents
  (product name/benefit stickers, subtle highlights) on the exact words.
  Reference implementation: `src/sub/SubEdit.tsx` (composition `SalmaGlowRRS`, approved by the client):
  white pills with a pink left border in the free wall area (top-left), product card under the
  captions on close-ups, small icons (heart, drop, skin layers, rising arrow), last frame held 1.2 s.

## 8. Names already confirmed by the client
- Protocol: **Spanish Glow**. Products: **Lola**, **RRS® HA Long Lasting** (skinbooster).
