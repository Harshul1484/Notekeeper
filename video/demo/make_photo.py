"""Generates the image pasted into the notebook in the film: a soft layered landscape."""
import numpy as np
from PIL import Image, ImageFilter

W, H = 1200, 675
y, x = np.mgrid[0:H, 0:W].astype(float)
t = y / H
sky_top, sky_bot = np.array([236, 214, 196]), np.array([247, 233, 214])
img = sky_top * (1 - t[..., None]) + sky_bot * t[..., None]
# sun glow
d = np.hypot(x - W * 0.66, y - H * 0.42)
img += (np.clip(1 - d / 260, 0, 1) ** 2)[..., None] * np.array([18, 10, 0])
sun = d < 58
img[sun] = [252, 240, 222]
rng = np.random.default_rng(3)

def ridge(base, amp, freqs, color, seed):
    r = np.random.default_rng(seed)
    h = np.full(W, base, float)
    for f, a in freqs:
        h += a * amp * np.sin(np.arange(W) / W * np.pi * 2 * f + r.uniform(0, 6.28))
    mask = y > h[None, :]
    img[mask] = color
    return h

ridge(H * 0.60, 40, [(1.3, 1), (3.1, 0.35), (7.0, 0.12)], [196, 184, 176], 1)
ridge(H * 0.68, 46, [(0.9, 1), (2.4, 0.4), (6.3, 0.1)], [158, 162, 150], 2)
ridge(H * 0.78, 38, [(1.6, 1), (4.2, 0.3), (9.0, 0.08)], [112, 126, 114], 3)
ridge(H * 0.88, 30, [(1.1, 1), (3.7, 0.3), (11.0, 0.06)], [78, 92, 84], 4)
img += rng.normal(0, 2.2, img.shape)  # fine grain
im = Image.fromarray(np.clip(img, 0, 255).astype("uint8")).filter(ImageFilter.GaussianBlur(0.8))
im.save("launch-moodboard.jpg", quality=88)
print("launch-moodboard.jpg", im.size)
