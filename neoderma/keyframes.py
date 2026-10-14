"""Keyframe graph of the intro animation (same curves as make_intro.py)."""
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt, numpy as np
def clamp(x): return np.clip(x, 0, 1)
def seg(t, a, b): return clamp((t - a) / (b - a))
eo = lambda t: 1 - (1 - t) ** 3
ei = lambda t: t ** 3
def back(t, k=1.9): t = t - 1; return t * t * ((k + 1) * t + k) + 1
t = np.linspace(0, 3.6, 361)
card = 680 + (1 - eo(seg(t, 0, .7))) * 640 + ei(seg(t, 3, 3.6)) * 640
badge = back(seg(t, .45, .95)) * (1 - ei(seg(t, 2.9, 3.3)))
blur = 1 - eo(seg(t, 3.0, 3.5))
rot = t * 40
fig, ax = plt.subplots(4, 1, figsize=(10, 9), sharex=True)
data = [(card, "Carte : position Y (px)", [(0, 1320), (.7, 680), (3, 680), (3.6, 1320)]),
        (badge, "Pastille ? : échelle", [(.45, 0), (.7, 1.1), (.95, 1), (2.9, 1), (3.3, 0)]),
        (blur, "Flou du fond (1 = max, sigma ~22)", [(0, 1), (3, 1), (3.5, 0)]),
        (rot, "Arcs : rotation (°)", [(0, 0), (3.6, 144)])]
for a, (y, lab, kf) in zip(ax, data):
    a.plot(t, y, color="#8a1a3d", lw=2)
    for kt, _ in kf:
        a.axvline(kt, color="#ccc", lw=.8, ls="--")
        a.plot(kt, np.interp(kt, t, y), "o", color="#e03a78")
    a.set_ylabel(lab, fontsize=9); a.grid(alpha=.2)
ax[-1].set_xlabel("temps (s)")
ax[0].invert_yaxis()
ax[0].set_title("Intro : courbes d'animation et keyframes (25 fps)")
plt.tight_layout(); plt.savefig("keyframes.png", dpi=110)
