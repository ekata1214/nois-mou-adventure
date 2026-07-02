#!/usr/bin/env python3
"""
Regenerate enemy icons with Google Gemini (Imagen).
Requires: pip install google-genai pillow
Usage:   GEMINI_API_KEY=... python3 tools/generate-icons-gemini.py
"""
import os
import time
from pathlib import Path

from PIL import Image
from io import BytesIO

try:
    from google import genai
    from google.genai import types
except ImportError:
    raise SystemExit("pip install google-genai pillow")

OUT_SRC = Path(__file__).resolve().parent.parent / "assets" / "icons" / "_src"
STYLE = (
    "Surrealist game enemy icon, Hylics-inspired clay pastel uncanny dreamlike aesthetic, "
    "bizarre floating object, soft weird lighting, centered composition, "
    "solid pure black background, no text, no border, single object only"
)

ICONS = {
    "lips": "glossy surreal human lips",
    "ear": "detached human ear",
    "eyeball": "floating eyeball with veins",
    "fingernail": "long uncanny fingernail",
    "hourglass": "melting hourglass with sand",
    "apple": "weird apple with subtle face",
    "book": "ancient floating book with strange eyes",
    "tiger": "bizarre stylized tiger head",
    "spike": "rusty iron nail spike",
    "clock": "melting pocket watch",
    "puzzle": "single jigsaw puzzle piece",
    "cigarette": "lit cigarette with orange ember",
    "computer": "old beige CRT computer",
}


def main():
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise SystemExit("Set GEMINI_API_KEY or GOOGLE_API_KEY")

    client = genai.Client(api_key=api_key)
    OUT_SRC.mkdir(parents=True, exist_ok=True)

    for name, subject in ICONS.items():
        prompt = f"{STYLE}. Subject: {subject}."
        print(f"generating {name}...")
        response = client.models.generate_images(
            model="imagen-3.0-generate-002",
            prompt=prompt,
            config=types.GenerateImagesConfig(number_of_images=1, aspect_ratio="1:1"),
        )
        img_bytes = response.generated_images[0].image.image_bytes
        path = OUT_SRC / f"{name}.png"
        Image.open(BytesIO(img_bytes)).save(path)
        print(f"  -> {path}")
        time.sleep(1)

    print("done. run: python3 tools/process-icons.py")


if __name__ == "__main__":
    main()
