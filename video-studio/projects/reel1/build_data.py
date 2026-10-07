"""Build the edit decision data for the reel (cuts, captions, zoom shots, markers).

Run: .venv/bin/python projects/reel1/build_data.py   -> src/reel1/data.json
Edit CHUNKS below to fix caption text, SEGMENTS to change which takes are used.
"""
import json
import re
import subprocess
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SRC = ROOT / "public" / "reel1" / "source_clean.mp4"
FPS = 30

# Takes kept (source seconds). Everything else (repeated takes, slate) is cut.
SEGMENTS = [(2.38, 18.70), (30.52, 37.32), (47.78, 58.20)]

# Caption text per speech chunk (source times from scripts/transcribe.py, text corrected by hand)
CHUNKS = [
    (2.40, 5.24, "Chaque visage mérite de garder sa propre identité."),
    (5.24, 10.56, "Aujourd'hui, avec les réseaux sociaux, on voit les mêmes lèvres, les mêmes pommettes, les mêmes profils."),
    (10.56, 12.67, "Il y a beaucoup de gens qui ont peur de le faire,"),
    (12.76, 16.22, "par peur d'être transformé ou tout simplement de ne plus se reconnaître."),
    (16.22, 18.68, "Justement, c'est ça le message que je veux transmettre."),
    (30.58, 32.40, "Quand je veux injecter un visage,"),
    (32.40, 34.82, "je l'analyse dans sa globalité, ses proportions,"),
    (34.82, 37.28, "son équilibre et surtout ce qui va le rendre unique."),
    (47.83, 49.87, "Parfois, une toute petite correction"),
    (49.87, 51.73, "suffit pour harmoniser le visage."),
    (51.73, 54.49, "Le but n'est pas de les changer, mais plutôt"),
    (54.74, 58.21, "les mettre en valeur et ne pas créer des visages qui sont standardisés."),
]

EMPHASIS = {"identité", "réseaux", "sociaux", "lèvres", "pommettes", "profils", "peur", "transformé",
            "reconnaître", "message", "injecter", "globalité", "proportions", "équilibre", "unique",
            "petite", "correction", "harmoniser", "changer", "valeur", "standardisés"}


def to_out(t: float) -> float | None:
    off = 0.0
    for a, b in SEGMENTS:
        if a <= t <= b:
            return off + t - a
        off += b - a
    return None


def speech_bounds(env, a, b, hop=0.01):
    """Trim silence at chunk edges using the loudness envelope."""
    i, j = int(a / hop), min(int(b / hop), len(env) - 1)
    seg = env[i:j]
    if len(seg) == 0:
        return a, b
    thr = max(seg.max() * 0.12, 1e-4)
    idx = np.where(seg > thr)[0]
    return a + idx[0] * hop, a + (idx[-1] + 1) * hop


def syllables(w: str) -> float:
    core = re.sub(r"[^a-zàâäéèêëîïôöùûüç']", "", w.lower())
    n = len(re.findall(r"[aeiouyàâäéèêëîïôöùûü]+", core))
    if core.endswith("e") and n > 1:
        n -= 0.6  # mute final e
    return max(n, 0.8) + (0.6 if re.search(r"[,.]$", w) else 0)


def main():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(SRC), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    hop = 160
    env = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
    env = np.convolve(env, np.ones(5) / 5, mode="same")

    words = []
    for a, b, text in CHUNKS:
        a, b = speech_bounds(env, a, b)
        toks = text.split()
        wts = [syllables(t) for t in toks]
        t, total = a, sum(wts)
        for tok, wt in zip(toks, wts):
            d = (b - a) * wt / total
            s, e = to_out(t), to_out(min(t + d, b))
            if s is not None and e is not None:
                key = re.sub(r"[^\wàâäéèêëîïôöùûüç']", "", tok.lower())
                words.append({"text": tok, "start": round(s, 3), "end": round(e, 3), "emph": key in EMPHASIS})
            t += d

    # Caption pages: max 3 words / 18 chars, break after punctuation
    pages, cur = [], []
    for w in words:
        cur.append(w)
        chars = sum(len(x["text"]) + 1 for x in cur)
        if len(cur) >= 3 or chars > 18 or re.search(r"[,.]$", w["text"]):
            pages.append(cur)
            cur = []
    if cur:
        pages.append(cur)

    def word_time(word, nth=1):
        hits = [w for w in words if re.sub(r"[^\wàâäéèêëîïôöùûüç]", "", w["text"].lower()) == word]
        return hits[nth - 1]["start"]

    face = json.load(open(HERE / "analysis" / "face.json"))
    fs = face["samples"]
    used = [s for s in fs if to_out(s["t"]) is not None]
    face_out = [{"t": round(to_out(s["t"]), 3), "cx": s["cx"], "cy": s["cy"], "w": s["w"], "h": s["h"]} for s in used]

    segs, off = [], 0.0
    for a, b in SEGMENTS:
        segs.append({"srcStart": a, "srcEnd": b, "outStart": round(off, 3)})
        off += b - a

    markers = {
        "brollFeedIn": to_out(5.24), "brollFeedOut": to_out(10.56),
        "levres": word_time("lèvres"), "pommettes": word_time("pommettes"), "profils": word_time("profils"),
        "reseaux": word_time("réseaux"),
        "reconnaitre": word_time("reconnaître"),
        "globalite": word_time("globalité"), "proportions": word_time("proportions"),
        "equilibre": word_time("équilibre"), "unique": word_time("unique"),
        "correction": word_time("correction"), "harmoniser": word_time("harmoniser"),
        "valeur": word_time("valeur"), "standardIn": word_time("créer"),
        "standardises": word_time("standardisés"),
        "speechEnd": round(off, 3),
    }
    # Zoom shots on output timeline: [start, end, scaleFrom, scaleTo]
    M = markers
    cut = lambda t: round(to_out(t), 3)
    shots = [
        [0, cut(5.24), 1.28, 1.34],
        [cut(5.24), cut(10.56), 1.0, 1.0],          # under B-roll feed
        [cut(10.56), cut(12.76), 1.0, 1.04],
        [cut(12.76), cut(16.22), 1.2, 1.25],
        [cut(16.22), cut(18.70), 1.06, 1.12],
        [cut(30.52), cut(32.40), 1.0, 1.05],
        [cut(32.40), cut(37.32), 1.2, 1.26],         # face analysis HUD
        [cut(47.78), M["harmoniser"] - 0.35, 1.0, 1.04],
        [M["harmoniser"] - 0.35, cut(51.73), 1.18, 1.22],
        [cut(51.73), M["valeur"] - 0.45, 1.0, 1.04],
        [M["valeur"] - 0.45, off, 1.26, 1.32],
    ]
    data = {"fps": FPS, "segments": segs, "words": words, "pages": [[words.index(w) for w in p] for p in pages],
            "markers": {k: round(v, 3) for k, v in markers.items()}, "shots": shots, "face": face_out,
            "duration": round(off + 2.8, 3)}
    out = ROOT / "src" / "reel1" / "data.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print(f"{len(words)} words, {len(pages)} pages, speech {off:.2f}s -> {out}")
    for k, v in data["markers"].items():
        print(f"  {k:14} {v:6.2f}")


if __name__ == "__main__":
    main()
