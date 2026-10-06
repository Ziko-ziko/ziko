#!/usr/bin/env bash
# Quick ffmpeg editing helpers.  Usage: scripts/edit.sh <command> [args...]
set -euo pipefail

usage() {
  cat <<'USAGE'
Commands:
  cut      <in> <start> <end> <out>        Trim clip (times: 00:00:05 or 5.2)
  concat   <out> <in1> <in2> [in3...]      Join clips (re-encodes, any formats)
  overlay  <bg> <fg.mov> <out> [start_s]   Put transparent overlay (lower third) on video
  vertical <in> <out>                      16:9 -> 9:16 (blurred background, Reels/TikTok)
  subs     <in> <subs.srt> <out>           Burn subtitles into video
  music    <in> <music> <out> [vol=0.25]   Add background music under original audio
  speed    <in> <factor> <out>             Speed up/slow down (2 = 2x faster, 0.5 = slow-mo)
  fade     <in> <out> [secs=0.5]           Fade in/out video + audio
  gif      <in> <out.gif> [fps=15] [w=640] High quality GIF
  thumb    <in> <time> <out.png>           Extract one frame
  info     <in>                            Show resolution, fps, duration, codecs
USAGE
}

enc=(-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart)
dur() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }
has_audio() { [ -n "$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$1")" ]; }

cmd=${1:-}; shift || true
case "$cmd" in
  cut)      ffmpeg -y -ss "$2" -to "$3" -i "$1" "${enc[@]}" "$4" ;;
  concat)
    out=$1; shift; inputs=(); filter=""; i=0
    for f in "$@"; do
      inputs+=(-i "$f")
      if has_audio "$f"; then a="[$i:a]"; else
        filter+="anullsrc=r=48000:cl=stereo,atrim=0:$(dur "$f")[s$i];"; a="[s$i]"; fi
      filter+="[$i:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v$i];"
      filter+="${a}aresample=48000,aformat=channel_layouts=stereo[a$i];"
      i=$((i+1))
    done
    for ((j=0;j<i;j++)); do filter+="[v$j][a$j]"; done
    filter+="concat=n=$i:v=1:a=1[v][a]"
    ffmpeg -y "${inputs[@]}" -filter_complex "$filter" -map "[v]" -map "[a]" "${enc[@]}" "$out" ;;
  overlay)  ffmpeg -y -i "$1" -itsoffset "${4:-0}" -i "$2" \
              -filter_complex "[0:v][1:v]overlay=0:0:eof_action=pass" -map 0:a? "${enc[@]}" "$3" ;;
  vertical) ffmpeg -y -i "$1" -filter_complex \
              "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2" \
              -map 0:a? "${enc[@]}" "$2" ;;
  subs)     ffmpeg -y -i "$1" -vf "subtitles='$2':force_style='FontName=Roboto,FontSize=22,Bold=1,Outline=2'" "${enc[@]}" "$3" ;;
  music)    ffmpeg -y -i "$1" -stream_loop -1 -i "$2" -filter_complex \
              "[1:a]volume=${4:-0.25}[m];$(has_audio "$1" && echo '[0:a][m]amix=inputs=2:duration=first[a]' || echo '[m]anull[a]')" \
              -map 0:v -map "[a]" -shortest "${enc[@]}" "$3" ;;
  speed)    ffmpeg -y -i "$1" -filter_complex "[0:v]setpts=PTS/$2[v];[0:a]atempo=$2[a]" -map "[v]" -map "[a]" "${enc[@]}" "$3" 2>/dev/null \
              || ffmpeg -y -i "$1" -vf "setpts=PTS/$2" -an "${enc[@]}" "$3" ;;
  fade)     d=$(dur "$1"); f=${3:-0.5}; st=$(echo "$d - $f" | bc -l)
            ffmpeg -y -i "$1" -vf "fade=t=in:d=$f,fade=t=out:st=$st:d=$f" -af "afade=t=in:d=$f,afade=t=out:st=$st:d=$f" "${enc[@]}" "$2" ;;
  gif)      ffmpeg -y -i "$1" -filter_complex \
              "fps=${3:-15},scale=${4:-640}:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" "$2" ;;
  thumb)    ffmpeg -y -ss "$2" -i "$1" -frames:v 1 "$3" ;;
  info)     ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,width,height,r_frame_rate -of compact "$1" ;;
  *)        usage; exit 1 ;;
esac
