#!/usr/bin/env python3
"""Generate project-owned commercial-fidelity texture sheets for Unreal.

These are procedural, legal-to-commit source assets. They are intended as a
replaceable fidelity layer until licensed Fab/Megascans/city packs are provided.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps
import random
import math

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "renderer" / "unreal" / "SmartIntersection" / "SourceAssets" / "CommercialPhotorealKit" / "Textures"
OUT.mkdir(parents=True, exist_ok=True)
SIZE = 2048


def noise(seed: int, base: tuple[int, int, int], spread: int, size: int = SIZE) -> Image.Image:
    rng = random.Random(seed)
    img = Image.new("RGB", (size, size), base)
    pix = img.load()
    for y in range(size):
        for x in range(size):
            n = rng.randint(-spread, spread)
            # low-frequency directional modulation
            n += int(math.sin((x + seed) * 0.031) * spread * 0.18)
            n += int(math.cos((y - seed) * 0.027) * spread * 0.16)
            pix[x, y] = tuple(max(0, min(255, c + n)) for c in base)
    return img.filter(ImageFilter.GaussianBlur(0.55))


def save_roughness(name: str, seed: int, base: int, spread: int) -> None:
    img = noise(seed, (base, base, base), spread).convert("L")
    img.save(OUT / f"{name}_Roughness.png")


def save_normal_from_height(name: str, height: Image.Image, strength: float = 8.0) -> None:
    gray = height.convert("L")
    px = gray.load()
    out = Image.new("RGB", gray.size, (128, 128, 255))
    opx = out.load()
    if px is None or opx is None:
        raise RuntimeError("Pillow pixel access failed")
    w, h = gray.size
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            dx = (int(px[x + 1, y]) - int(px[x - 1, y])) / 255.0  # type: ignore[arg-type]
            dy = (int(px[x, y + 1]) - int(px[x, y - 1])) / 255.0  # type: ignore[arg-type]
            nx = int(128 - dx * 127 * strength)
            ny = int(128 - dy * 127 * strength)
            opx[x, y] = (max(0, min(255, nx)), max(0, min(255, ny)), 255)
    out.filter(ImageFilter.GaussianBlur(0.35)).save(OUT / f"{name}_Normal.png")


def asphalt() -> None:
    img = noise(101, (30, 32, 33), 28)
    draw = ImageDraw.Draw(img, "RGBA")
    rng = random.Random(102)
    for _ in range(900):
        x, y = rng.randrange(SIZE), rng.randrange(SIZE)
        r = rng.randrange(1, 5)
        c = rng.choice([(8, 9, 10, 90), (76, 78, 76, 70), (18, 20, 22, 80)])
        draw.ellipse([x-r, y-r, x+r, y+r], fill=c)
    for _ in range(70):
        x = rng.randrange(SIZE)
        y = rng.randrange(SIZE)
        pts = [(x, y)]
        for _ in range(rng.randrange(3, 8)):
            x += rng.randrange(-80, 90)
            y += rng.randrange(40, 140)
            pts.append((x, y))
        draw.line(pts, fill=(7, 8, 8, 160), width=rng.randrange(2, 7))
        draw.line(pts, fill=(80, 82, 78, 45), width=1)
    for _ in range(36):
        x, y = rng.randrange(SIZE), rng.randrange(SIZE)
        rx, ry = rng.randrange(80, 260), rng.randrange(18, 80)
        draw.ellipse([x-rx, y-ry, x+rx, y+ry], fill=(14, 18, 21, 70), outline=(120, 130, 125, 28), width=2)
    img.save(OUT / "CommercialWetAsphalt_BaseColor.png")
    save_roughness("CommercialWetAsphalt", 103, 58, 35)
    save_normal_from_height("CommercialWetAsphalt", ImageOps.grayscale(img), 4.0)


def sidewalk() -> None:
    img = noise(201, (132, 128, 119), 24)
    draw = ImageDraw.Draw(img, "RGBA")
    tile = 256
    for x in range(0, SIZE, tile):
        draw.line([(x, 0), (x, SIZE)], fill=(70, 68, 62, 140), width=5)
    for y in range(0, SIZE, tile):
        draw.line([(0, y), (SIZE, y)], fill=(70, 68, 62, 140), width=5)
    rng = random.Random(202)
    for _ in range(420):
        x, y = rng.randrange(SIZE), rng.randrange(SIZE)
        r = rng.randrange(2, 10)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=(95, 92, 84, rng.randrange(40, 110)))
    img.save(OUT / "CommercialSidewalkSlab_BaseColor.png")
    save_roughness("CommercialSidewalkSlab", 203, 172, 20)
    save_normal_from_height("CommercialSidewalkSlab", ImageOps.grayscale(img), 2.6)


def road_marking() -> None:
    img = noise(301, (218, 218, 204), 16)
    draw = ImageDraw.Draw(img, "RGBA")
    rng = random.Random(302)
    for _ in range(480):
        x, y = rng.randrange(SIZE), rng.randrange(SIZE)
        draw.rectangle([x, y, x + rng.randrange(8, 42), y + rng.randrange(1, 7)], fill=(55, 57, 55, rng.randrange(40, 130)))
    for _ in range(120):
        x, y = rng.randrange(SIZE), rng.randrange(SIZE)
        draw.line([(x, y), (x + rng.randrange(-55, 56), y + rng.randrange(-20, 21))], fill=(250, 250, 238, 110), width=rng.randrange(1, 4))
    img.save(OUT / "CommercialWornMarking_BaseColor.png")
    save_roughness("CommercialWornMarking", 303, 138, 40)
    save_normal_from_height("CommercialWornMarking", ImageOps.grayscale(img), 1.3)


def facade() -> None:
    img = noise(401, (98, 78, 65), 32)
    draw = ImageDraw.Draw(img, "RGBA")
    rng = random.Random(402)
    for y in range(0, SIZE, 154):
        draw.line([(0, y), (SIZE, y)], fill=(42, 35, 31, 135), width=4)
    for row, y in enumerate(range(0, SIZE, 154)):
        offset = 78 if row % 2 else 0
        for x in range(-offset, SIZE, 312):
            draw.line([(x, y), (x, min(SIZE, y + 154))], fill=(42, 35, 31, 120), width=4)
    for _ in range(320):
        x, y = rng.randrange(SIZE), rng.randrange(SIZE)
        draw.rectangle([x, y, x+rng.randrange(8, 42), y+rng.randrange(2, 14)], fill=(150, 132, 112, rng.randrange(30, 90)))
    img.save(OUT / "CommercialWeatheredFacade_BaseColor.png")
    save_roughness("CommercialWeatheredFacade", 403, 185, 26)
    save_normal_from_height("CommercialWeatheredFacade", ImageOps.grayscale(img), 2.2)


def glass() -> None:
    img = Image.new("RGB", (SIZE, SIZE), (24, 44, 52))
    draw = ImageDraw.Draw(img, "RGBA")
    for y in range(SIZE):
        a = int(255 * y / SIZE)
        draw.line([(0, y), (SIZE, y)], fill=(10 + a // 15, 35 + a // 18, 48 + a // 12, 255))
    for i in range(22):
        x = i * 96 + 20
        draw.line([(x, 0), (x + 640, SIZE)], fill=(140, 210, 230, 38), width=8)
    img = img.filter(ImageFilter.GaussianBlur(0.3))
    img.save(OUT / "CommercialCCTVGlass_BaseColor.png")
    save_roughness("CommercialCCTVGlass", 503, 24, 12)
    height = ImageOps.grayscale(img)
    hdraw = ImageDraw.Draw(height, "L")
    for i in range(0, SIZE, 96):
        hdraw.line([(i, 0), (i + 640, SIZE)], fill=210, width=6)
    for i in range(0, SIZE, 220):
        hdraw.line([(0, i), (SIZE, i + 60)], fill=65, width=3)
    save_normal_from_height("CommercialCCTVGlass", height, 2.8)


if __name__ == "__main__":
    asphalt(); sidewalk(); road_marking(); facade(); glass()
    for path in sorted(OUT.glob("*.png")):
        print(f"TEXTURE {path} {path.stat().st_size}")
