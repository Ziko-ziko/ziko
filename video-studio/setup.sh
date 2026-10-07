#!/usr/bin/env bash
# Install everything needed for video editing, animation & motion graphics.
# Tested on Ubuntu 24.04.  Usage: ./setup.sh   (run with sudo if not root)
set -euo pipefail
cd "$(dirname "$0")"

SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

echo "==> System packages (ffmpeg, Blender, ImageMagick, Inkscape, fonts...)"
$SUDO apt-get update
DEBIAN_FRONTEND=noninteractive $SUDO apt-get install -y \
  ffmpeg x264 imagemagick ghostscript inkscape potrace gifsicle webp \
  sox libsox-fmt-all mediainfo mkvtoolnix frei0r-plugins blender bc \
  libcairo2-dev libpango1.0-dev pkg-config python3-venv python3-dev \
  fonts-noto fonts-noto-color-emoji fonts-dejavu fonts-liberation \
  fonts-roboto fonts-open-sans fonts-arabeyes

echo "==> Python tools (.venv: MoviePy, Manim, OpenCV, librosa, edge-tts...)"
python3 -m venv .venv
.venv/bin/pip install --upgrade pip setuptools wheel
.venv/bin/pip install -r requirements.txt

echo "==> Node tools (Remotion, Hyperframes, GSAP, Lottie)"
if ! command -v node >/dev/null; then
  echo "Node.js 20+ is required: https://nodejs.org" >&2; exit 1
fi
npm install
mkdir -p hyperframes/assets out
cp node_modules/gsap/dist/gsap.min.js hyperframes/assets/

echo "==> Speech-to-text models (Whisper large-v3-turbo + Silero VAD, offline)"
mkdir -p models
if [ ! -d models/sherpa-onnx-whisper-turbo ]; then
  curl -L https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-turbo.tar.bz2 | tar xj -C models
fi
[ -f models/silero_vad.onnx ] || curl -L -o models/silero_vad.onnx \
  https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx

echo "==> Done. Try:  npm run render:intro   or   npm run studio"
