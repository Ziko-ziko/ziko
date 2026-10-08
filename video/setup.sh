#!/usr/bin/env bash
# Motion as Code — setup check + install.
# Usage: bash video/setup.sh            (from the repo root)
# Expects the kit unzipped into video/motion-as-code/ (app/, audio/, data/, analysis/ ...)
set -u
cd "$(dirname "$0")"
KIT="motion-as-code"
ok=1

check() { # name, command
  if command -v "$2" >/dev/null 2>&1; then echo "  [ok]  $1"; else echo "  [!!]  $1 missing"; ok=0; fi
}

echo "== Tools =="
check "bun"     bun
check "ffmpeg"  ffmpeg
check "uv (python)" uv
if ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libx264; then echo "  [ok]  ffmpeg libx264"; else echo "  [!!]  ffmpeg has no libx264"; ok=0; fi

# Browser for the renderer: Chrome if present, otherwise the Playwright Chromium.
if command -v google-chrome >/dev/null 2>&1; then
  echo "  [ok]  Google Chrome"
elif [ -d "${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}" ]; then
  echo "  [ok]  Chromium (Playwright) — render with: BROWSER_CHANNEL=chromium bun run render"
else
  echo "  [!!]  no Chrome/Chromium found"; ok=0
fi

echo "== Kit =="
if [ ! -d "$KIT/app" ]; then
  echo "  [!!]  $KIT/app not found. Unzip Motion_as_kit.zip into video/$KIT/ first."
  exit 1
fi
for d in app audio data analysis; do
  [ -d "$KIT/$d" ] && echo "  [ok]  $d/" || { echo "  [!!]  $d/ missing"; ok=0; }
done

echo "== Install =="
(cd "$KIT/app" && bun install) || { echo "bun install failed"; exit 1; }

if [ "$ok" = 1 ]; then
  echo
  echo "Ready. Preview:  cd video/$KIT/app && bunx vite   -> http://localhost:5173"
else
  echo
  echo "Installed, but fix the [!!] lines above before rendering."
fi
