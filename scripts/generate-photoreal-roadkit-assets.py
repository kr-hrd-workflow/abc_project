#!/usr/bin/env python3
from __future__ import annotations

import math
import random
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "renderer" / "unreal" / "SmartIntersection" / "SourceAssets" / "PhotorealRoadKit"
TEXTURE_DIR = ASSET_ROOT / "Textures"
MESH_DIR = ASSET_ROOT / "Meshes"
CC0_DIR = ASSET_ROOT / "CC0AmbientCG"
MANIFEST = ASSET_ROOT / "photoreal_roadkit_manifest.md"

random.seed(42)


def noise_texture(path: Path, base: tuple[int, int, int], variance: int = 24, streaks: bool = False) -> None:
    size = 1024
    img = Image.new("RGB", (size, size), base)
    pix = img.load()
    for y in range(size):
        for x in range(size):
            n = random.randint(-variance, variance)
            if streaks:
                n += int(10 * math.sin((x + y * 0.18) / 31.0))
            pix[x, y] = tuple(max(0, min(255, c + n)) for c in base)
    draw = ImageDraw.Draw(img, "RGBA")
    if streaks:
        for _ in range(120):
            x = random.randint(0, size)
            y = random.randint(0, size)
            w = random.randint(40, 220)
            a = random.randint(10, 38)
            draw.line((x, y, x + w, y + random.randint(-5, 5)), fill=(15, 15, 15, a), width=random.randint(1, 5))
        for _ in range(28):
            x = random.randint(0, size - 120)
            y = random.randint(0, size - 40)
            draw.rectangle((x, y, x + random.randint(80, 240), y + random.randint(8, 36)), fill=(45, 44, 40, random.randint(30, 70)))
    img = img.filter(ImageFilter.GaussianBlur(radius=0.35))
    img.save(path)


def paint_wear(path: Path, color: tuple[int, int, int]) -> None:
    size = 1024
    img = Image.new("RGBA", (size, size), (*color, 255))
    draw = ImageDraw.Draw(img, "RGBA")
    for _ in range(900):
        x = random.randint(0, size)
        y = random.randint(0, size)
        r = random.randint(1, 8)
        draw.ellipse((x-r, y-r, x+r, y+r), fill=(40, 38, 35, random.randint(20, 95)))
    for _ in range(180):
        x = random.randint(0, size)
        y = random.randint(0, size)
        draw.line((x, y, x + random.randint(20, 160), y + random.randint(-8, 8)), fill=(70, 68, 60, random.randint(25, 80)), width=random.randint(1, 4))
    img = img.filter(ImageFilter.GaussianBlur(radius=0.25))
    img.convert("RGB").save(path)


def normalish(path: Path) -> None:
    size = 1024
    img = Image.new("RGB", (size, size), (128, 128, 255))
    pix = img.load()
    for y in range(size):
        for x in range(size):
            bump = random.randint(-34, 34)
            grain = int(18 * math.sin((x * 0.11) + (y * 0.07)))
            pix[x, y] = (max(70, min(185, 128 + bump + grain)), max(70, min(185, 128 + random.randint(-34, 34) - grain)), max(210, min(255, 242 + random.randint(-10, 10))))
    img = img.filter(ImageFilter.GaussianBlur(radius=0.45))
    img.save(path)


def road_text_texture(path: Path, text: str, color: tuple[int, int, int]) -> None:
    size = 1024
    img = Image.new("RGBA", (size, size), (54, 56, 54, 0))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 158)
    except Exception:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) / 2, (size - th) / 2), text, fill=(*color, 255), font=font)
    # Road paint wear: remove small alpha scratches from the lettering, not add a black rectangle.
    alpha = img.getchannel("A")
    adraw = ImageDraw.Draw(alpha)
    for _ in range(220):
        x = random.randint(0, size)
        y = random.randint(0, size)
        adraw.line((x, y, x + random.randint(20, 160), y + random.randint(-6, 6)), fill=0, width=random.randint(1, 4))
    img.putalpha(alpha.filter(ImageFilter.GaussianBlur(radius=0.15)))
    # Cube top-face UVs mirror this material in UE; pre-mirror the source so road text reads correctly in proof.
    img = ImageOps.mirror(img)
    img.save(path)


def obj_box(path: Path, name: str, sx: float, sy: float, sz: float, bevel: float = 0.0) -> None:
    # Simple cuboid OBJ. Bevel encoded through smaller top face when requested.
    bx = max(0.0, min(sx * 0.2, bevel))
    by = max(0.0, min(sy * 0.2, bevel))
    bottom = [(-sx, -sy, 0), (sx, -sy, 0), (sx, sy, 0), (-sx, sy, 0)]
    top = [(-sx + bx, -sy + by, sz), (sx - bx, -sy + by, sz), (sx - bx, sy - by, sz), (-sx + bx, sy - by, sz)]
    verts = bottom + top
    faces = [(1,2,3,4), (5,8,7,6), (1,5,6,2), (2,6,7,3), (3,7,8,4), (4,8,5,1)]
    with path.open("w", encoding="utf-8") as f:
        f.write(f"o {name}\n")
        for v in verts:
            f.write("v %.4f %.4f %.4f\n" % v)
        for face in faces:
            f.write("f %d %d %d %d\n" % face)


def obj_cylinder(path: Path, name: str, radius: float, height: float, segments: int = 32) -> None:
    with path.open("w", encoding="utf-8") as f:
        f.write(f"o {name}\n")
        for z in [0, height]:
            for i in range(segments):
                a = 2 * math.pi * i / segments
                f.write("v %.4f %.4f %.4f\n" % (math.cos(a) * radius, math.sin(a) * radius, z))
        for i in range(segments):
            j = (i + 1) % segments
            f.write("f %d %d %d %d\n" % (i+1, j+1, segments+j+1, segments+i+1))
        f.write("f " + " ".join(str(i+1) for i in range(segments)) + "\n")
        f.write("f " + " ".join(str(segments+i+1) for i in reversed(range(segments))) + "\n")


def install_cc0_texture_sources() -> None:
    """Prefer committed ambientCG CC0 sources when present.

    They are kept under SourceAssets/PhotorealRoadKit/CC0AmbientCG and copied into the
    texture import directory after procedural fallback generation.
    """
    copies = {
        "Road007_1K-JPG_Color.jpg": "T_london_asphalt_albedo.jpg",
        "Road007_1K-JPG_NormalGL.jpg": "T_london_asphalt_normal.jpg",
        "Road007_1K-JPG_Roughness.jpg": "T_london_asphalt_roughness.jpg",
        "Bricks097_1K-JPG_Color.jpg": "T_london_brick_facade.jpg",
        "Bricks097_1K-JPG_NormalGL.jpg": "T_london_brick_normal.jpg",
    }
    if not CC0_DIR.exists():
        return
    for src_name, dest_name in copies.items():
        src = CC0_DIR / src_name
        if src.exists():
            shutil.copy2(src, TEXTURE_DIR / dest_name)



def main() -> None:
    TEXTURE_DIR.mkdir(parents=True, exist_ok=True)
    MESH_DIR.mkdir(parents=True, exist_ok=True)
    noise_texture(TEXTURE_DIR / "T_london_asphalt_albedo.png", (54, 56, 54), 26, True)
    normalish(TEXTURE_DIR / "T_london_asphalt_normal.png")
    noise_texture(TEXTURE_DIR / "T_london_curb_concrete.png", (158, 154, 139), 22, False)
    noise_texture(TEXTURE_DIR / "T_london_red_bus_lane_worn.png", (134, 36, 30), 30, True)
    paint_wear(TEXTURE_DIR / "T_london_yellow_thermoplastic_worn.png", (238, 184, 26))
    paint_wear(TEXTURE_DIR / "T_london_white_road_text_worn.png", (235, 231, 210))
    road_text_texture(TEXTURE_DIR / "T_london_text_bus_lane.png", "BUS LANE", (238, 235, 210))
    road_text_texture(TEXTURE_DIR / "T_london_text_look_left.png", "LOOK LEFT", (238, 235, 210))
    road_text_texture(TEXTURE_DIR / "T_london_text_look_right.png", "LOOK RIGHT", (238, 235, 210))
    road_text_texture(TEXTURE_DIR / "T_london_text_keep_clear.png", "KEEP CLEAR", (238, 184, 26))
    noise_texture(TEXTURE_DIR / "T_london_drain_grate_metal.png", (44, 45, 45), 18, True)
    noise_texture(TEXTURE_DIR / "T_london_wet_puddle_reflection.png", (35, 39, 40), 45, True)
    noise_texture(TEXTURE_DIR / "T_london_sidewalk_stone.png", (128, 124, 112), 26, True)
    noise_texture(TEXTURE_DIR / "T_london_brick_facade.png", (117, 65, 48), 32, True)
    noise_texture(TEXTURE_DIR / "T_london_glass_windows.png", (28, 42, 50), 36, True)
    noise_texture(TEXTURE_DIR / "T_london_regulatory_sign_plate.png", (222, 220, 205), 14, False)
    obj_box(MESH_DIR / "curb_beveled_module.obj", "curb_beveled_module", 120, 16, 18, 8)
    obj_box(MESH_DIR / "paint_worn_strip.obj", "paint_worn_strip", 110, 4, 1.3, 0.8)
    obj_box(MESH_DIR / "signal_head_uk_black.obj", "signal_head_uk_black", 16, 7, 22, 2)
    obj_cylinder(MESH_DIR / "signal_pole_slim.obj", "signal_pole_slim", 4, 180, 20)
    obj_cylinder(MESH_DIR / "utility_cover_round.obj", "utility_cover_round", 22, 2, 40)
    obj_box(MESH_DIR / "drain_grate_rect.obj", "drain_grate_rect", 36, 14, 2, 1)
    obj_cylinder(MESH_DIR / "keep_left_bollard.obj", "keep_left_bollard", 8, 58, 24)
    obj_box(MESH_DIR / "tactile_paving_tile.obj", "tactile_paving_tile", 60, 40, 3, 2)
    obj_box(MESH_DIR / "london_shopfront_module.obj", "london_shopfront_module", 180, 18, 130, 4)
    obj_box(MESH_DIR / "london_window_strip.obj", "london_window_strip", 150, 3, 35, 1)
    obj_box(MESH_DIR / "regulatory_sign_plate.obj", "regulatory_sign_plate", 28, 2, 38, 1)
    install_cc0_texture_sources()
    MANIFEST.write_text("""# PhotorealRoadKit procedural source assets\n\nProject-owned procedural source assets for the London SmartIntersection photoreal fidelity pass.\n\nThese are project-owned procedural source assets plus committed ambientCG CC0 texture maps for road asphalt and brick facade detail. They replace the pure cube/flat-color blockout with visible asphalt wear, worn markings, curb material variation, signal/pole proxies, utility covers, drains, bollards, tactile paving, and urban scene context.\n""", encoding="utf-8")
    print(f"PHOTOREAL_ROADKIT_SOURCE_WRITTEN {ASSET_ROOT}")


if __name__ == "__main__":
    main()
