"""Transcribe a short window of a video to find exactly when a word starts.

Usage: .venv/bin/python scripts/asr_window.py video.mp4 START END [max_chunk_s=5]
Slide START forward until the text begins with the word you want: that START is the word onset.
"""
import sys, numpy as np, sherpa_onnx, subprocess
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from transcribe import split_long, SR, MODEL
m = MODEL; n = m.name.split("-")[-1]
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=str(m/f"{n}-encoder.int8.onnx"), decoder=str(m/f"{n}-decoder.int8.onnx"), tokens=str(m/f"{n}-tokens.txt"), language="fr", task="transcribe", num_threads=4)
a, b, mx = float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
raw = subprocess.run(["ffmpeg","-v","error","-ss",str(a),"-to",str(b),"-i",sys.argv[1],"-ac","1","-ar","16000","-f","f32le","-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32)
for st, seg in split_long(0.0, x, mx):
    s = rec.create_stream(); s.accept_waveform(SR, seg); rec.decode_stream(s)
    print(f"[{a+st:6.2f} - {a+st+len(seg)/SR:6.2f}] {s.result.text.strip()}")
