"""Studio-style voice enhancement (offline).

1. AI noise/room removal with DPDFNet 48 kHz (sherpa-onnx) - keeps full bandwidth.
2. ffmpeg polish: de-mud EQ, presence + air, de-esser, compression, -14 LUFS.

Usage: .venv/bin/python scripts/enhance_voice.py input(.mp4|.wav) output.wav [attenuation_db=30]
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
import sherpa_onnx

ROOT = Path(__file__).resolve().parent.parent
MODEL = ROOT / "models" / "dpdfnet2_48khz_hr.onnx"
SR = 48000
POLISH = ",".join([
    "highpass=f=75",
    "equalizer=f=160:t=q:w=1.0:g=1.5",    # warmth
    "equalizer=f=380:t=q:w=1.2:g=-2.5",   # remove mud / boxiness
    "equalizer=f=3200:t=q:w=1.4:g=2.5",   # presence / clarity
    "highshelf=f=10000:g=2",              # air
    "deesser=i=0.3:m=0.5:f=0.5",
    "acompressor=threshold=-22dB:ratio=3.5:attack=4:release=90:makeup=3",
    "alimiter=limit=0.89:level=false",
    "loudnorm=I=-14:TP=-1.5:LRA=7",
])


def main(src: str, dst: str, atten: float = 30.0) -> None:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    cfg = sherpa_onnx.OfflineSpeechDenoiserConfig(
        model=sherpa_onnx.OfflineSpeechDenoiserModelConfig(
            dpdfnet=sherpa_onnx.OfflineSpeechDenoiserDpdfNetModelConfig(model=str(MODEL), attenuation_limit_db=atten),
            num_threads=4,
        )
    )
    den = sherpa_onnx.OfflineSpeechDenoiser(cfg)
    out = den.run(x, SR)
    y = np.asarray(out.samples, dtype=np.float32)
    tmp = Path(dst).with_suffix(".denoised.f32")
    y.tofile(tmp)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(out.sample_rate), "-ac", "1", "-i", str(tmp),
                    "-af", POLISH, "-ar", "48000", "-ac", "2", dst], check=True)
    tmp.unlink()
    print(f"enhanced voice -> {dst}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], *(float(a) for a in sys.argv[3:4]))
