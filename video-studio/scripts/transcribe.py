"""Speech-to-text with timestamps (offline): Silero VAD + Whisper (sherpa-onnx).

Usage: .venv/bin/python scripts/transcribe.py input.mp4 out.json [language]
  language: "" = auto-detect (default), or en / fr / ar / es ...
Output JSON: {"language": ..., "segments": [{"start", "end", "text", "words": [{"start","end","text"}]}]}
Word times are spread across each speech segment by word length (good enough for
word-by-word captions on short VAD segments).
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import sherpa_onnx

ROOT = Path(__file__).resolve().parent.parent
# Best available model: turbo (large-v3-turbo) > small
for _name in ("turbo", "small"):
    MODEL = ROOT / "models" / f"sherpa-onnx-whisper-{_name}"
    if MODEL.exists():
        break
SR = 16000


def load_audio(path: str) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32)


def vad_segments(samples: np.ndarray):
    cfg = sherpa_onnx.VadModelConfig()
    cfg.silero_vad.model = str(ROOT / "models" / "silero_vad.onnx")
    cfg.silero_vad.min_silence_duration = 0.12
    cfg.silero_vad.min_speech_duration = 0.2
    cfg.silero_vad.max_speech_duration = 5
    cfg.sample_rate = SR
    vad = sherpa_onnx.VoiceActivityDetector(cfg, buffer_size_in_seconds=120)
    win = cfg.silero_vad.window_size
    out = []
    for i in range(0, len(samples), win):
        vad.accept_waveform(samples[i:i + win])
        while not vad.empty():
            out.append((vad.front.start / SR, np.array(vad.front.samples)))
            vad.pop()
    vad.flush()
    while not vad.empty():
        out.append((vad.front.start / SR, np.array(vad.front.samples)))
        vad.pop()
    return out


def split_long(start: float, seg: np.ndarray, max_len: float = 3.5):
    """Cut long speech chunks at their quietest 20 ms point (between words)."""
    if len(seg) / SR <= max_len:
        return [(start, seg)]
    hop = int(0.02 * SR)
    energy = np.array([np.sqrt(np.mean(seg[i:i + hop] ** 2)) for i in range(0, len(seg) - hop, hop)])
    lo, hi = int(1.5 / 0.02), int(max_len / 0.02)
    hi = min(hi, len(energy) - lo)
    if hi <= lo:
        return [(start, seg)]
    cut = (lo + int(np.argmin(energy[lo:hi]))) * hop
    return [(start, seg[:cut])] + split_long(start + cut / SR, seg[cut:], max_len)


def spread_words(text: str, start: float, end: float):
    words = text.split()
    if not words:
        return []
    weights = [len(w) + 2 for w in words]
    total, t, res = sum(weights), start, []
    for w, wt in zip(words, weights):
        d = (end - start) * wt / total
        res.append({"start": round(t, 3), "end": round(t + d, 3), "text": w})
        t += d
    return res


def main(src: str, dst: str, language: str = "") -> None:
    rec = sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=str(MODEL / f"{_name}-encoder.int8.onnx"),
        decoder=str(MODEL / f"{_name}-decoder.int8.onnx"),
        tokens=str(MODEL / f"{_name}-tokens.txt"),
        language=language,
        task="transcribe",
        num_threads=4,
    )
    samples = load_audio(src)
    segments, detected = [], language
    chunks = [c for start, seg in vad_segments(samples) for c in split_long(start, seg)]
    for start, seg in chunks:
        s = rec.create_stream()
        s.accept_waveform(SR, seg)
        rec.decode_stream(s)
        text = s.result.text.strip()
        detected = detected or getattr(s.result, "lang", "")
        if not text:
            continue
        end = start + len(seg) / SR
        segments.append({"start": round(start, 3), "end": round(end, 3), "text": text,
                         "words": spread_words(text, start, end)})
        print(f"[{start:6.2f} - {end:6.2f}] {text}", flush=True)
    Path(dst).write_text(json.dumps({"language": detected, "segments": segments}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(*sys.argv[1:4])
