#!/bin/bash
# Installs Agent Reach (https://github.com/Panniantong/Agent-Reach) at session start.
command -v agent-reach >/dev/null 2>&1 && exit 0
d=$(mktemp -d)
git clone --depth 1 https://github.com/Panniantong/Agent-Reach.git "$d/src" >/dev/null 2>&1 \
  && pip install --quiet --break-system-packages "$d/src" >/dev/null 2>&1
rm -rf "$d"
exit 0
