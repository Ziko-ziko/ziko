"""Manim motion-graphics example (shapes, text, transforms).

Run:  .venv/bin/manim -qh scripts/manim_example.py LogoReveal -o logo-reveal --media_dir out/manim
      (-ql = fast preview, -qh = 1080p, -qk = 4K)
"""
from manim import BLUE, PINK, WHITE, Circle, Create, FadeOut, Scene, Square, Text, Transform, Write


class LogoReveal(Scene):
    def construct(self):
        circle = Circle(radius=2, color=PINK).set_fill(PINK, opacity=0.3)
        square = Square(side_length=3.5, color=BLUE).set_fill(BLUE, opacity=0.3)
        title = Text("ZIKO", font="Roboto", weight="BOLD", color=WHITE).scale(2)

        self.play(Create(circle))
        self.play(Transform(circle, square))
        self.play(Write(title))
        self.wait(0.5)
        self.play(FadeOut(circle), FadeOut(title))
