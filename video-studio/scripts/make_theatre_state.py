"""Generate the starter Theatre.js state (keyframes + easing curves) for TheatreScene.

Only needed to reset src/theatre/state.json. After that, edit the animation
visually in Theatre Studio and export the JSON from there.
Run:  python3 scripts/make_theatre_state.py
"""
import json
from pathlib import Path

# cubic-bezier curves (same numbers as After Effects / CSS easing)
EASY_EASE = (0.33, 0.0, 0.67, 1.0)
EXPO_OUT = (0.16, 1.0, 0.3, 1.0)
BACK_OUT = (0.34, 1.56, 0.64, 1.0)
EXPO_IN = (0.7, 0.0, 0.84, 0.0)

_ids = iter(range(1, 10_000))


def track(obj: str, prop: str, keys: list[tuple[float, object, tuple]]):
    """keys: (time_s, value, curve to the NEXT keyframe)."""
    kfs = []
    for i, (t, v, curve) in enumerate(keys):
        prev_curve = keys[i - 1][2] if i else EASY_EASE
        kfs.append({
            "id": f"k{next(_ids)}",
            "position": t,
            "connectedRight": i < len(keys) - 1,
            "type": "bezier",
            # [in-handle x, y (from previous segment), out-handle x, y]
            "handles": [prev_curve[2], prev_curve[3], curve[0], curve[1]],
            "value": v,
        })
    return obj, prop, {"type": "BasicKeyframedTrack", "__debugName": f'{obj}:["{prop}"]', "keyframes": kfs}


def rgba(r, g, b, a=1.0):
    return {"r": r, "g": g, "b": b, "a": a}


TRACKS = [
    # Title: rises in with overshoot, slight rotation settle, blur -> sharp, then flies out
    track("Title", "y", [(0.0, 220, BACK_OUT), (0.9, 0, EASY_EASE), (4.0, 0, EXPO_IN), (4.7, -260, EASY_EASE)]),
    track("Title", "scale", [(0.0, 0.6, EXPO_OUT), (0.9, 1.0, EASY_EASE), (3.6, 1.08, EASY_EASE)]),
    track("Title", "rotation", [(0.0, -8, BACK_OUT), (1.0, 0, EASY_EASE)]),
    track("Title", "opacity", [(0.0, 0, EASY_EASE), (0.5, 1, EASY_EASE), (4.3, 1, EASY_EASE), (4.7, 0, EASY_EASE)]),
    track("Title", "blur", [(0.0, 24, EXPO_OUT), (0.7, 0, EASY_EASE), (4.2, 0, EXPO_IN), (4.7, 18, EASY_EASE)]),
    # Shape: pops in, spins, morphs square -> circle, changes color
    track("Shape", "size", [(0.2, 0, BACK_OUT), (1.1, 520, EASY_EASE), (4.2, 520, EXPO_IN), (4.8, 0, EASY_EASE)]),
    track("Shape", "rotation", [(0.2, -90, EXPO_OUT), (1.6, 45, EASY_EASE), (4.8, 135, EASY_EASE)]),
    track("Shape", "borderRadius", [(1.2, 6, EASY_EASE), (2.6, 50, EASY_EASE)]),
    track("Shape", "color", [(1.0, rgba(1.0, 0.24, 0.43), EASY_EASE), (3.0, rgba(0.36, 0.42, 1.0), EASY_EASE)]),
]

state = {
    "sheetsById": {
        "Scene": {
            "staticOverrides": {"byObject": {}},
            "sequence": {
                "subUnitsPerUnit": 30,
                "length": 5,
                "type": "PositionalSequence",
                "tracksByObject": {},
            },
        }
    },
    "definitionVersion": "0.4.0",
    "revisionHistory": ["starter"],
}
by_obj = state["sheetsById"]["Scene"]["sequence"]["tracksByObject"]
for i, (obj, prop, data) in enumerate(TRACKS):
    entry = by_obj.setdefault(obj, {"trackData": {}, "trackIdByPropPath": {}})
    tid = f"t{i}"
    entry["trackData"][tid] = data
    entry["trackIdByPropPath"][f'["{prop}"]'] = tid

out = Path(__file__).resolve().parent.parent / "src" / "theatre" / "state.json"
out.write_text(json.dumps(state, indent=2) + "\n")
print(f"wrote {out}")
