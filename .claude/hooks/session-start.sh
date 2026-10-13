#!/bin/bash
# Refreshes the public-apis catalog (data/public-apis/apis.json) at the start of every cloud session.
# The committed snapshot stays in place if the refresh fails, so the session never breaks.
set -uo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if git clone --quiet --depth 1 https://github.com/public-apis/public-apis.git "$TMP/public-apis" 2>/dev/null; then
  python3 -I "$ROOT/tools/public-apis/parse.py" "$TMP/public-apis/README.md" "$TMP/apis.json" >/dev/null \
    && mv "$TMP/apis.json" "$ROOT/data/public-apis/apis.json"
fi

echo "export PUBLIC_APIS_JSON=\"$ROOT/data/public-apis/apis.json\"" >> "${CLAUDE_ENV_FILE:-/dev/null}"
exit 0
