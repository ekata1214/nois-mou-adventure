#!/usr/bin/env python3
"""Chroma-key scenery PNGs for NOU map props."""
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "assets" / "scenery"
THRESHOLD = 42
TARGET = 320

NAMES = [
    "summer_tree", "summer_flower",
    "autumn_tree", "autumn_flower",
    "rain_tree", "rain_flower",
    "sunset_tree", "sunset_flower",
]


def chroma_black(img: Image.Image, threshold: int = THRESHOLD) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r < threshold and g < threshold and b < threshold:
                px[x, y] = (0, 0, 0, 0)
    return img


def fit(img: Image.Image, size: int = TARGET) -> Image.Image:
    img.thumbnail((size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ox = (size - img.width) // 2
    oy = size - img.height
    canvas.paste(img, (ox, oy), img)
    return canvas


def main(src_dir: Path):
    OUT.mkdir(parents=True, exist_ok=True)
    for name in NAMES:
        src = src_dir / f"{name}.png"
        if not src.exists():
            print(f"skip {src}")
            continue
        out = OUT / f"{name}.png"
        fit(chroma_black(Image.open(src))).save(out, "PNG")
        print(f"wrote {out}")


if __name__ == "__main__":
    import sys
    main(Path(sys.argv[1]))
