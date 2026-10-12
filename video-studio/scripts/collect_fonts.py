"""Copy latin woff2 files of the installed @fontsource packages into public/fonts/<slug>/
and write src/fonts.json (family -> files) so compositions can load any of them.

Run after `npm install`:  python3 scripts/collect_fonts.py
"""
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FS = ROOT / "node_modules" / "@fontsource"
OUT = ROOT / "public" / "fonts"
manifest = {}
for pkg in sorted(FS.iterdir()):
    meta = json.loads((pkg / "metadata.json").read_text())
    family = meta["family"]
    files = []
    for f in sorted((pkg / "files").glob("*-latin-*.woff2")):
        m = re.search(r"-latin-(\d+)-(normal|italic)\.woff2$", f.name)
        if not m:
            continue
        dst = OUT / pkg.name / f.name
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(f, dst)
        files.append({"weight": m[1], "style": m[2], "file": f"fonts/{pkg.name}/{f.name}"})
    if files:
        manifest[family] = files
(ROOT / "src" / "fonts.json").write_text(json.dumps(manifest, indent=1) + "\n")
print(f"{len(manifest)} families: {', '.join(manifest)}")
