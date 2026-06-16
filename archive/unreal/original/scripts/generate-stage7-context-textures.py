#!/usr/bin/env python3
"""Generate deterministic Stage 7 context textures.

These are project-owned visual-only source textures for aerial roofs, parking
lots, and pavement context. They are not traffic truth and do not change the
SUMO/FastAPI/Unreal authority boundary.
"""
from __future__ import annotations

from pathlib import Path
import random

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
TEXTURE_DIR = ROOT / "renderer" / "unreal" / "SmartIntersection" / "SourceAssets" / "PhotorealRoadKit" / "Textures"
WIDTH = 1536
HEIGHT = 1024


def clamp(value: int) -> int:
    return max(0, min(255, value))


def noisy_base(seed: int, base: tuple[int, int, int], spread: int) -> Image.Image:
    rng = random.Random(seed)
    pixels = []
    for y in range(HEIGHT):
        row_bias = int(10 * (y / HEIGHT - 0.5))
        for x in range(WIDTH):
            grain = rng.randint(-spread, spread)
            fine = rng.randint(-spread // 3, spread // 3)
            pixels.append(tuple(clamp(channel + row_bias + grain + fine) for channel in base))
    image = Image.new("RGB", (WIDTH, HEIGHT))
    image.putdata(pixels)
    return image.filter(ImageFilter.GaussianBlur(radius=0.35))


def draw_cracks(draw: ImageDraw.ImageDraw, rng: random.Random, count: int, color: tuple[int, int, int]) -> None:
    for _ in range(count):
        x = rng.randint(40, WIDTH - 40)
        y = rng.randint(40, HEIGHT - 40)
        points = [(x, y)]
        for _step in range(rng.randint(3, 8)):
            x += rng.randint(-90, 90)
            y += rng.randint(-65, 65)
            points.append((max(0, min(WIDTH, x)), max(0, min(HEIGHT, y))))
        draw.line(points, fill=color, width=rng.randint(1, 3))


def roof_gravel() -> Image.Image:
    rng = random.Random(701)
    image = noisy_base(701, (106, 105, 96), 24)
    draw = ImageDraw.Draw(image, "RGBA")
    for y in range(95, HEIGHT, 132):
        draw.line([(0, y), (WIDTH, y + rng.randint(-8, 8))], fill=(62, 62, 58, 115), width=3)
    for x in range(120, WIDTH, 210):
        draw.line([(x, 0), (x + rng.randint(-12, 12), HEIGHT)], fill=(75, 74, 68, 80), width=2)
    for _ in range(95):
        cx = rng.randint(60, WIDTH - 60)
        cy = rng.randint(60, HEIGHT - 60)
        rx = rng.randint(15, 50)
        ry = rng.randint(8, 30)
        shade = rng.randint(50, 115)
        draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(shade, shade, shade - 6, rng.randint(35, 95)))
    for _ in range(36):
        x = rng.randint(40, WIDTH - 120)
        y = rng.randint(40, HEIGHT - 90)
        w = rng.randint(42, 120)
        h = rng.randint(25, 72)
        draw.rectangle((x, y, x + w, y + h), fill=(78, 82, 76, 150), outline=(43, 45, 42, 170), width=2)
        draw.line((x + 8, y + h // 2, x + w - 8, y + h // 2), fill=(130, 134, 126, 90), width=1)
    return image


def parking_concrete() -> Image.Image:
    rng = random.Random(911)
    image = noisy_base(911, (91, 94, 87), 28)
    draw = ImageDraw.Draw(image, "RGBA")
    for y in range(105, HEIGHT, 150):
        draw.line([(0, y), (WIDTH, y + rng.randint(-6, 6))], fill=(58, 60, 55, 125), width=3)
    for x in range(110, WIDTH, 170):
        draw.line([(x, 0), (x + rng.randint(-7, 7), HEIGHT)], fill=(58, 60, 55, 85), width=2)
    for x in range(80, WIDTH, 185):
        draw.line([(x, 90), (x + 18, HEIGHT - 85)], fill=(198, 196, 174, 160), width=5)
    for y in range(138, HEIGHT, 255):
        draw.line([(55, y), (WIDTH - 55, y + rng.randint(-4, 4))], fill=(196, 194, 172, 115), width=4)
    for _ in range(70):
        cx = rng.randint(20, WIDTH - 20)
        cy = rng.randint(20, HEIGHT - 20)
        rx = rng.randint(18, 74)
        ry = rng.randint(10, 38)
        draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(35, 39, 36, rng.randint(32, 86)))
    draw_cracks(draw, rng, 45, (35, 36, 33, 150))
    return image


def pavement_fill() -> Image.Image:
    rng = random.Random(1207)
    image = noisy_base(1207, (112, 113, 103), 20)
    draw = ImageDraw.Draw(image, "RGBA")
    for y in range(120, HEIGHT, 142):
        draw.line([(0, y), (WIDTH, y + rng.randint(-4, 4))], fill=(74, 75, 68, 100), width=2)
    for x in range(95, WIDTH, 156):
        draw.line([(x, 0), (x + rng.randint(-4, 4), HEIGHT)], fill=(78, 78, 70, 90), width=2)
    for _ in range(55):
        x = rng.randint(20, WIDTH - 120)
        y = rng.randint(20, HEIGHT - 90)
        w = rng.randint(65, 210)
        h = rng.randint(16, 55)
        draw.rectangle((x, y, x + w, y + h), fill=(82, 84, 77, rng.randint(40, 92)))
    draw_cracks(draw, rng, 34, (54, 55, 50, 115))
    return image


def rooftop_unit() -> Image.Image:
    rng = random.Random(1501)
    image = noisy_base(1501, (78, 83, 78), 18)
    draw = ImageDraw.Draw(image, "RGBA")
    for y in range(70, HEIGHT, 120):
        draw.rectangle((0, y, WIDTH, y + rng.randint(10, 18)), fill=(45, 48, 45, 130))
    for x in range(90, WIDTH, 150):
        draw.rectangle((x, 0, x + rng.randint(10, 18), HEIGHT), fill=(122, 128, 118, 65))
    for _ in range(90):
        x = rng.randint(30, WIDTH - 90)
        y = rng.randint(30, HEIGHT - 70)
        draw.rectangle((x, y, x + rng.randint(35, 90), y + rng.randint(20, 62)), fill=(48, 52, 49, rng.randint(55, 120)))
    return image


def main() -> None:
    TEXTURE_DIR.mkdir(parents=True, exist_ok=True)
    outputs = {
        "T_stage7_roof_gravel_noise.png": roof_gravel(),
        "T_stage7_parking_concrete_noise.png": parking_concrete(),
        "T_stage7_pavement_fill_noise.png": pavement_fill(),
        "T_stage7_rooftop_unit_noise.png": rooftop_unit(),
    }
    for filename, image in outputs.items():
        path = TEXTURE_DIR / filename
        image.save(path)
        print(f"STAGE7_CONTEXT_TEXTURE_WRITTEN path={path} size={image.size} bytes={path.stat().st_size}")


if __name__ == "__main__":
    main()
