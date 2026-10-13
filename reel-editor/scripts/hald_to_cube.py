"""Turn a graded HALD level-6 PNG (216x216) into a 36-point .cube LUT.

    python3 scripts/hald_to_cube.py graded.png out.cube "Title"
"""
import sys
import numpy as np
from PIL import Image

src, out, title = sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "LUT"
L = 6
N = L * L
img = np.asarray(Image.open(src).convert("RGB"), dtype=np.float64) / 255.0
if img.shape[:2] != (L ** 3, L ** 3):
    raise SystemExit(f"expected a {L**3}x{L**3} HALD image, got {img.shape[1]}x{img.shape[0]}")
flat = img.reshape(-1, 3)  # index = r + g*N + b*N*N, which is .cube order (red changes fastest)
with open(out, "w") as fh:
    fh.write(f'TITLE "{title}"\nLUT_3D_SIZE {N}\nDOMAIN_MIN 0.0 0.0 0.0\nDOMAIN_MAX 1.0 1.0 1.0\n')
    for r, g, b in flat:
        fh.write(f"{r:.6f} {g:.6f} {b:.6f}\n")
print(out, N)
