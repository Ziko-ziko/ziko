#!/usr/bin/env python3
"""Search the public-apis catalog (data/public-apis/apis.json).

  python3 tools/public-apis/search.py weather            # keyword in name/description/category
  python3 tools/public-apis/search.py --category Video
  python3 tools/public-apis/search.py music --no-auth     # only APIs that need no key
  python3 tools/public-apis/search.py --categories        # list categories with counts
"""
import argparse, json, os
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "..", "data", "public-apis", "apis.json")

ap = argparse.ArgumentParser()
ap.add_argument("query", nargs="?", default="")
ap.add_argument("--category", default="")
ap.add_argument("--no-auth", action="store_true")
ap.add_argument("--categories", action="store_true")
ap.add_argument("--json", action="store_true")
a = ap.parse_args()

apis = json.load(open(DATA, encoding="utf-8"))
if a.categories:
    for c, n in sorted(Counter(x["category"] for x in apis).items()):
        print(f"{n:4}  {c}")
    raise SystemExit
q = a.query.lower()
hits = [
    x for x in apis
    if (not q or q in (x["name"] + " " + x["description"] + " " + x["category"]).lower())
    and (not a.category or a.category.lower() in x["category"].lower())
    and (not a.no_auth or x["auth"] == "none")
]
if a.json:
    print(json.dumps(hits, ensure_ascii=False, indent=1))
else:
    for x in hits:
        print(f"[{x['category']}] {x['name']} — {x['description']} (auth: {x['auth']}) {x['url']}")
    print(f"{len(hits)} result(s)")
