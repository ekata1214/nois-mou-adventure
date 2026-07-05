#!/usr/bin/env python3
"""VOID 用の星空タイル画像を生成（星密度 35% = 65% カット）"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 1024
# フル密度の想定から 65% カット → 35% を残す
DIM_STAR_FULL = 600
FLARE_STAR_FULL = 25
KEEP_RATIO = 0.35
DIM_COUNT = int(DIM_STAR_FULL * KEEP_RATIO)
FLARE_COUNT = max(1, int(FLARE_STAR_FULL * KEEP_RATIO))
OUT = Path(__file__).resolve().parents[1] / "assets" / "void" / "void-stars.png"


def draw_flare(draw, x, y, size, alpha):
    core_r = size * 0.35
    for radius, color in (
        (core_r, (255, 255, 255, alpha)),
        (core_r * 0.55, (210, 235, 255, int(alpha * 0.65))),
    ):
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color)
    streak_a = int(alpha * 0.75)
    draw.ellipse((x - size, y - size * 0.08, x + size, y + size * 0.08), fill=(230, 245, 255, streak_a))
    draw.ellipse((x - size * 0.08, y - size, x + size * 0.08, y + size), fill=(230, 245, 255, streak_a))


def main():
    random.seed(20260703)
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)

    placed = []
    for _ in range(DIM_COUNT):
        x = random.randint(0, SIZE - 1)
        y = random.randint(0, SIZE - 1)
        alpha = random.randint(45, 160)
        radius = 1 if random.random() > 0.12 else 2
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(255, 255, 255, alpha))
        placed.append((x, y))

    for _ in range(FLARE_COUNT):
        x = random.randint(24, SIZE - 24)
        y = random.randint(24, SIZE - 24)
        size = random.uniform(8, 16)
        alpha = random.randint(90, 150)
        draw_flare(draw, x, y, size, alpha)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, optimize=True)
    print(f"Wrote {OUT} ({DIM_COUNT} dim stars, {FLARE_COUNT} flares, keep={KEEP_RATIO:.0%})")


if __name__ == "__main__":
    main()
