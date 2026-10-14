"""Intro animation (burgundy card + '?' badge), transparent, no text.
Output: intro_notext.mov (ProRes 4444 + alpha), 720x1280 @25fps."""
import math, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, DUR = 720, 1280, 25, 3.6
S = 2  # supersample
TOP, BOT = (140, 24, 60), (66, 12, 32)
PINK = (235, 90, 130)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def ease_out(t): return 1 - (1 - t) ** 3
def ease_in(t): return t ** 3
def back(t, k=1.9): t -= 1; return t * t * ((k + 1) * t + k) + 1
def clamp(x): return max(0.0, min(1.0, x))
def seg(t, a, b): return clamp((t - a) / (b - a))

def frame(t):
    img = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    # card y: rises 0-0.7s to 680, holds, exits 3.0-3.6s
    rise = ease_out(seg(t, 0.0, 0.7)); exit_ = ease_in(seg(t, 3.0, 3.6))
    top = 680 + (1 - rise) * 640 + exit_ * 640
    if top >= H: return img.resize((W, H), Image.LANCZOS)
    # gradient card
    card = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    y0 = int(top * S)
    grad = Image.new("RGBA", (W * S, 1))
    for y in range(max(0, y0), H * S):
        k = clamp((y - y0) / (H * S - y0 + 1))
        c = tuple(int(TOP[i] + (BOT[i] - TOP[i]) * k) for i in range(3)) + (255,)
        ImageDraw.Draw(card).line([(0, y), (W * S, y)], fill=c)
    mask = Image.new("L", (W * S, H * S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, y0, W * S, H * S + 200], 28 * S, fill=255)
    img.paste(card, (0, 0), mask)
    d = ImageDraw.Draw(img)
    # pink highlight on top edge
    d.rounded_rectangle([0, y0, W * S, y0 + 5 * S], 28 * S, outline=PINK + (255,), width=3 * S)
    # decorative white arcs (slow rotation), clipped to card
    deco = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    dd = ImageDraw.Draw(deco)
    rot = t * 40
    dy = (top - 680) * S
    for cx, cy, r, w, a0 in [(-30, 1090, 190, 70, 200), (-40, 1280, 130, 55, 250), (735, 700, 70, 40, 110), (745, 560, 60, 40, 80)]:
        box = [(cx - r) * S, (cy - r) * S + dy, (cx + r) * S, (cy + r) * S + dy]
        dd.arc(box, a0 + rot, a0 + rot + 70, fill=(235, 235, 235, 235), width=w * S)
    img.paste(deco, (0, 0), Image.composite(mask, Image.new("L", mask.size, 0), deco.getchannel("A")))
    # badge
    p = back(seg(t, 0.45, 0.95)) * (1 - ease_in(seg(t, 2.9, 3.3)))
    r = 80 * max(p, 0.0)
    if r > 1:
        cx, cy = 360 * S, (top - 22) * S
        bad = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
        bd = ImageDraw.Draw(bad)
        bd.ellipse([cx - r * S, cy - r * S, cx + r * S, cy + r * S], fill=(205, 30, 85, 255), outline=(250, 140, 170, 255), width=4 * S)
        bd.ellipse([cx - r * S * .8, cy - r * S * .95, cx + r * S * .5, cy - r * S * .1], fill=(225, 60, 110, 90))
        f = ImageFont.truetype(FONT, int(120 * p * S))
        bd.text((cx, cy), "?", font=f, fill=(255, 255, 255, 255), anchor="mm")
        img.alpha_composite(bad)
    return img.resize((W, H), Image.LANCZOS)

n = int(DUR * FPS)
out = sys.argv[1] if len(sys.argv) > 1 else "intro_notext.mov"
pr = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS),
    "-i", "-", "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", "-vendor", "apl0", out], stdin=subprocess.PIPE)
for i in range(n):
    pr.stdin.write(frame(i / FPS).tobytes())
pr.stdin.close(); pr.wait()
