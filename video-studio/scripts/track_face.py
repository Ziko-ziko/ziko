"""Track the main face in a video (OpenCV Haar cascade + smoothing).

Usage: .venv/bin/python scripts/track_face.py input.mp4 out.json [samples_per_sec=6]
Output: {"width", "height", "fps", "samples": [{"t", "cx", "cy", "w", "h"}]} (pixels, smoothed)
"""
import json
import sys

import cv2
import numpy as np


def main(src: str, dst: str, rate: float = 6.0) -> None:
    cap = cv2.VideoCapture(src)
    fps = cap.get(cv2.CAP_PROP_FPS)
    W, H = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    step = max(1, round(fps / rate))
    raw, last = [], None
    for idx in range(0, n, step):
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ok, frame = cap.read()
        if not ok:
            break
        small = cv2.resize(frame, (W // 3, H // 3))
        gray = cv2.equalizeHist(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY))
        faces = cascade.detectMultiScale(gray, 1.1, 6, minSize=(60, 60))
        if len(faces):
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3]) * 3
            last = (x + w / 2, y + h / 2, w, h)
        if last:
            raw.append((idx / fps, *last))
    arr = np.array(raw)
    k = 5  # moving-average smoothing
    sm = arr.copy()
    for c in range(1, 5):
        sm[:, c] = np.convolve(np.pad(arr[:, c], k // 2, mode="edge"), np.ones(k) / k, mode="valid")
    samples = [dict(t=round(r[0], 3), cx=round(r[1], 1), cy=round(r[2], 1), w=round(r[3], 1), h=round(r[4], 1)) for r in sm]
    json.dump({"width": W, "height": H, "fps": fps, "samples": samples}, open(dst, "w"))
    print(f"{len(samples)} samples, face ~{np.median(sm[:, 3]):.0f}px wide at ({np.median(sm[:, 1]):.0f},{np.median(sm[:, 2]):.0f})")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], *(float(a) for a in sys.argv[3:4]))
