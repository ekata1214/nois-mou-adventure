#!/usr/bin/env python3
"""Chroma-key black backgrounds and export transparent PNG icons."""
from pathlib import Path
from PIL import Image

SRC = Path(__file__).resolve().parent.parent / "assets" / "icons" / "_src"
OUT = Path(__file__).resolve().parent.parent / "assets" / "icons"
THRESHOLD = 42
TARGET = 256

NAMES = [
    "lips", "ear", "eyeball", "fingernail", "hourglass", "apple", "book",
    "tiger", "spike", "clock", "puzzle", "cigarette", "computer",
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
    oy = (size - img.height) // 2
    canvas.paste(img, (ox, oy), img)
    return canvas


def main(src_dir: Path | None = None):
    src = src_dir or SRC
    OUT.mkdir(parents=True, exist_ok=True)
    for name in NAMES:
        path = src / f"{name}.png"
        if not path.exists():
            print(f"skip missing {path}")
            continue
        out = OUT / f"{name}.png"
        img = chroma_black(Image.open(path))
        fit(img).save(out, "PNG")
        print(f"wrote {out}")


if __name__ == "__main__":
    import sys
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else None)
