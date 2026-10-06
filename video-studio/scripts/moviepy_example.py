"""MoviePy editing example: title card + clips + crossfades + music.

Run:  .venv/bin/python scripts/moviepy_example.py out/title-intro.mp4 out/hyperframes-demo.mp4
"""
import sys

from moviepy import (
    ColorClip,
    CompositeVideoClip,
    TextClip,
    VideoFileClip,
    concatenate_videoclips,
    vfx,
)

FONT = "/usr/share/fonts/truetype/roboto/unhinted/RobotoTTF/Roboto-Black.ttf"
SIZE = (1920, 1080)


def title_card(text: str, duration: float = 2.0):
    bg = ColorClip(SIZE, color=(10, 10, 20), duration=duration)
    txt = (
        TextClip(font=FONT, text=text, font_size=110, color="white")
        .with_duration(duration)
        .with_position("center")
        .with_effects([vfx.FadeIn(0.4), vfx.FadeOut(0.4)])
    )
    return CompositeVideoClip([bg, txt])


def main(paths: list[str], out: str = "out/moviepy-edit.mp4") -> None:
    clips = [title_card("MY EDIT")]
    for p in paths:
        clips.append(VideoFileClip(p).resized(SIZE).with_effects([vfx.CrossFadeIn(0.5)]))
    final = concatenate_videoclips(clips, method="compose", padding=-0.5)
    final.write_videofile(out, fps=30, codec="libx264", audio_codec="aac")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
