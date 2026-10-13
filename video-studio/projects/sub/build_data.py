"""SALMA GLOW edit data for the RRS HA clip (projects/sub/source.mp4) -> src/sub/data.json.

Chunk boundaries and CUES are measured word onsets (scripts/find_onset.py), not estimates.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "projects" / "reel1"))
from build_data import speech_bounds, syllables  # noqa: E402

SRC = HERE / "source.mp4"
DURATION = 14.229
HOLD = 1.2  # freeze the last frame so the final sticker can be read

# (start, end, text) - start of each chunk is a measured word onset
CHUNKS = [
    (0.12, 2.48, "Donc chez cette patiente, on va préconiser le protocole"),
    (2.48, 3.34, "Spanish Glow,"),
    (3.34, 5.04, "qui contient le Lola, le"),  # confirmed by the client
    (5.04, 6.84, "RRS HA Long Lasting."),
    (6.84, 7.48, "C'est un produit que"),
    (7.48, 8.14, "j'aime beaucoup."),
    (8.14, 8.64, "C'est un"),
    (8.64, 9.96, "skinbooster qu'on va"),
    (9.96, 10.38, "injecter en"),
    (10.38, 11.20, "profondeur"),
    (11.20, 11.80, "pour une"),
    (11.80, 13.70, "hydratation profonde et un effet"),
    (13.70, 14.21, "lifting."),
]
CUES = {"spanish": 2.48, "rrs": 5.04, "jaime": 7.48, "skinbooster": 8.64, "injecter": 9.96,
        "profondeur": 10.38, "hydratation": 11.80, "lifting": 13.70}
SHOT_CUTS = [4.958, 7.083, 10.208, 12.167]
EMPHASIS = {"spanish", "glow", "rrs", "ha", "long", "lasting", "j'aime", "skinbooster", "profondeur",
            "hydratation", "profonde", "lifting"}


def main():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(SRC), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    hop = 160
    env = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
    env = np.convolve(env, np.ones(5) / 5, mode="same")
    words = []
    for a, b, text in CHUNKS:
        _, b2 = speech_bounds(env, a, b)  # keep the measured onset, trim only trailing silence
        toks = text.split()
        wts = [syllables(t) for t in toks]
        t, total = a, sum(wts)
        for tok, wt in zip(toks, wts):
            d = (b2 - a) * wt / total
            key = re.sub(r"[^\wàâäéèêëîïôöùûüç']", "", tok.lower())
            words.append({"text": tok, "start": round(t, 3), "end": round(t + d, 3), "emph": key in EMPHASIS})
            t += d
    data = {"fps": 30, "duration": round(DURATION + HOLD, 3), "videoEnd": DURATION, "speechEnd": CHUNKS[-1][1],
            "words": words, "cues": CUES, "shotCuts": SHOT_CUTS}
    out = ROOT / "src" / "sub" / "data.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print(f"{len(words)} words -> {out}")


if __name__ == "__main__":
    main()
