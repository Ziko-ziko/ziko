"""Export the reel captions (src/reel1/data.json) as an .srt file for Instagram/TikTok/CapCut."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
d = json.load(open(ROOT / "src" / "reel1" / "data.json"))
W = d["words"]


def ts(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


out = []
for i, page in enumerate(d["pages"], 1):
    ws = [W[j] for j in page]
    nxt = d["pages"][i][0] if i < len(d["pages"]) else None
    end = min(ws[-1]["end"] + 0.25, W[nxt]["start"]) if nxt is not None else ws[-1]["end"] + 0.25
    out.append(f"{i}\n{ts(ws[0]['start'])} --> {ts(end)}\n{' '.join(w['text'] for w in ws)}\n")
dst = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "out" / "reel1.srt")
Path(dst).write_text("\n".join(out), encoding="utf-8")
print(f"{len(out)} subtitles -> {dst}")
