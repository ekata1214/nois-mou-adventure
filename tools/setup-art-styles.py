#!/usr/bin/env python3
"""Split icons/scenery into hylics (喜・楽) and giger (怒・哀) folders."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ICON_SRC = ROOT / "assets" / "icons" / "_src"
ICON_GIGER_SRC = ROOT / "assets" / "icons"
SCENERY_GIGER_SRC = ROOT / "assets" / "scenery"
CURSOR_SRC = Path.home() / ".cursor/projects/Users-takaearasaki-Projects-jump-platformer/assets"

HYLICS_ICONS = ["apple", "hourglass", "puzzle", "lips", "book", "computer"]
GIGER_ICONS = ["tiger", "spike", "cigarette", "eyeball", "ear", "fingernail", "clock"]
GIGER_SCENERY = ["autumn_tree", "autumn_flower", "rain_tree", "rain_flower"]
HYLICS_SCENERY_SRC = {
    "hylics_summer_tree.png": "summer_tree.png",
    "hylics_summer_flower.png": "summer_flower.png",
    "hylics_sunset_tree.png": "sunset_tree.png",
    "hylics_sunset_flower.png": "sunset_flower.png",
}

TH = 42


def chroma(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r < TH and g < TH and b < TH:
                px[x, y] = (0, 0, 0, 0)
    return img


def fit_icon(img: Image.Image, size: int = 256) -> Image.Image:
    img.thumbnail((size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(img, ((size - img.width) // 2, (size - img.height) // 2), img)
    return canvas


def fit_scenery(img: Image.Image, size: int = 400) -> Image.Image:
    img.thumbnail((size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(img, ((size - img.width) // 2, size - img.height), img)
    return canvas


def main():
    hylics_icons = ROOT / "assets/icons/hylics"
    giger_icons = ROOT / "assets/icons/giger"
    hylics_scenery = ROOT / "assets/scenery/hylics"
    giger_scenery = ROOT / "assets/scenery/giger"
    for d in (hylics_icons, giger_icons, hylics_scenery, giger_scenery):
        d.mkdir(parents=True, exist_ok=True)

    for name in HYLICS_ICONS:
        src = ICON_SRC / f"{name}.png"
        if not src.exists():
            print(f"missing hylics src {src}")
            continue
        fit_icon(chroma(Image.open(src))).save(hylics_icons / f"{name}.png")
        print(f"hylics icon {name}")

    for name in GIGER_ICONS:
        src = ICON_GIGER_SRC / f"{name}.png"
        if not src.exists():
            print(f"missing giger icon {src}")
            continue
        dst = giger_icons / f"{name}.png"
        if src.resolve() != dst.resolve():
            dst.write_bytes(src.read_bytes())
        print(f"giger icon {name}")

    for name in GIGER_SCENERY:
        src = SCENERY_GIGER_SRC / f"{name}.png"
        if not src.exists():
            print(f"missing giger scenery {src}")
            continue
        dst = giger_scenery / f"{name}.png"
        if src.resolve() != dst.resolve():
            dst.write_bytes(src.read_bytes())
        print(f"giger scenery {name}")

    for src_name, dst_name in HYLICS_SCENERY_SRC.items():
        src = CURSOR_SRC / src_name
        if not src.exists():
            src = SCENERY_GIGER_SRC / dst_name
        if not src.exists():
            print(f"missing hylics scenery src {src_name}")
            continue
        fit_scenery(chroma(Image.open(src))).save(hylics_scenery / dst_name)
        print(f"hylics scenery {dst_name}")


if __name__ == "__main__":
    main()
