"""Find the exact time a word starts being spoken (for SALMA GLOW cue timing).

Slides the start of a short ASR window forward in 40 ms steps; the onset is the last
start time at which the transcription still begins with the word.

Usage: .venv/bin/python scripts/find_onset.py video.mp4 "regex" SEARCH_FROM SEARCH_TO [window_s=1.6]
Example: find_onset.py clip.mp4 "^(le )?skin" 7.9 9.0
"""
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import sherpa_onnx

sys.path.insert(0, str(Path(__file__).resolve().parent))
from transcribe import MODEL, SR  # noqa: E402

name = MODEL.name.split("-")[-1]
REC = sherpa_onnx.OfflineRecognizer.from_whisper(
    encoder=str(MODEL / f"{name}-encoder.int8.onnx"), decoder=str(MODEL / f"{name}-decoder.int8.onnx"),
    tokens=str(MODEL / f"{name}-tokens.txt"), language="fr", task="transcribe", num_threads=4)


def load(src: str) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def text_at(x: np.ndarray, a: float, b: float) -> str:
    s = REC.create_stream()
    s.accept_waveform(SR, x[int(a * SR):int(b * SR)])
    REC.decode_stream(s)
    return s.result.text.strip().lower()


def find_onset(x: np.ndarray, pattern: str, t0: float, t1: float, win: float = 1.6) -> float | None:
    rx = re.compile(pattern, re.I)
    last_ok = None
    t = t0
    while t <= t1:
        txt = re.sub(r"^[^\w]+", "", text_at(x, t, t + win))
        if rx.search(txt):
            last_ok = t
        elif last_ok is not None:
            break  # word got cut: onset is the last start that still heard it
        t = round(t + 0.04, 3)
    return last_ok


if __name__ == "__main__":
    if len(sys.argv) < 5:
        sys.exit(__doc__)
    x = load(sys.argv[1])
    on = find_onset(x, sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), *(float(a) for a in sys.argv[5:6]))
    print(f"onset {sys.argv[2]!r}: {on}")
