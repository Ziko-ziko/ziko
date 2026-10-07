#!/usr/bin/env bash
# Rebuild the reel's media assets: graded/cleaned footage, SFX and music bed.
# Usage: projects/reel1/make_assets.sh path/to/raw_reel.mp4
set -euo pipefail
cd "$(dirname "$0")/../.."
SRC=${1:-projects/reel1/source.mp4}
P=public/reel1
TMP=$(mktemp -d)
mkdir -p $P

# Color grade + voice cleanup (high-pass, denoise, compression, -14 LUFS)
ffmpeg -v error -y -i "$SRC" -map 0:v -map 0:a \
  -vf "eq=contrast=1.06:saturation=1.12:gamma=0.98,colorbalance=rs=0.02:bs=-0.025:rh=0.015:bh=-0.02,unsharp=5:5:0.35,vignette=PI/6" \
  -af "highpass=f=80,afftdn=nf=-25,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,loudnorm=I=-14:TP=-1.5:LRA=7" \
  -c:v libx264 -preset slow -crf 15 -g 12 -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -movflags +faststart $P/source_clean.mp4

# SFX
sox -n -r 48000 -c 2 $P/whoosh.wav synth 0.55 pinknoise band -n 1500 1200 fade q 0.22 0.55 0.3 gain -6
sox -n -r 48000 -c 2 $P/pop.wav synth 0.08 sine 1100:320 fade 0 0.08 0.06 gain -4
sox -n -r 48000 -c 2 $P/chime.wav synth 1.6 sine 1318.5 sine 1975.5 remix 1,2 1,2 fade 0.005 1.6 1.4 reverb 60 gain -n -10
sox -n -r 48000 -c 2 $P/glitch.wav synth 0.25 square 120 square 61 remix 1,2 1,2 tremolo 40 90 fade 0 0.25 0.1 gain -18

# Ambient music bed (Amaj7 - F#m7 - Dmaj7 - E7 - A) with a soft pulse
i=1
for c in "A3 C#4 E4 G#4" "F#3 A3 C#4 E4" "D3 F#3 A3 C#4" "E3 G#3 B3 D#4" "A3 C#4 E4 B4"; do
  set -- $c
  sox -n -r 48000 -c 2 $TMP/pad$i.wav synth 11 sine $1 sine $2 sine $3 sine $4 remix 1,2,3,4 1,2,3,4 gain -n -6 fade q 2.5 11 3
  i=$((i+1))
done
ffmpeg -v error -y -i $TMP/pad1.wav -i $TMP/pad2.wav -i $TMP/pad3.wav -i $TMP/pad4.wav -i $TMP/pad5.wav \
  -filter_complex "[0][1]acrossfade=d=3[a];[a][2]acrossfade=d=3[b];[b][3]acrossfade=d=3[c];[c][4]acrossfade=d=3" $TMP/padseq.wav
sox -n -r 48000 -c 2 $TMP/pulse.wav synth 0.15 sine 60:42 fade 0 0.15 0.12 gain -n -3 pad 0 0.35 repeat 79
sox -m -v 0.8 $TMP/padseq.wav -v 0.25 $TMP/pulse.wav $TMP/mix.wav
sox $TMP/mix.wav $P/music.wav tremolo 0.25 15 reverb 60 50 100 trim 0 37 gain -n -12 fade 1.5 37 2.5
rm -rf $TMP
echo "assets ready in $P"
