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


def decal_texture(path: Path, kind: str, color=(235, 232, 210)) -> None:
    size = 1024
    img = Image.new("RGBA", (size, size), (54, 56, 54, 0))
    draw = ImageDraw.Draw(img)
    if kind == "zebra":
        for i in range(7):
            y = 100 + i * 118
            draw.rounded_rectangle((120, y, 904, y + 54), radius=10, fill=(*color, 238))
    elif kind == "arrow_straight":
        draw.polygon([(512,110),(650,310),(580,310),(580,820),(444,820),(444,310),(374,310)], fill=(*color,240))
    elif kind == "arrow_left":
        draw.polygon([(190,520),(410,300),(410,430),(760,430),(760,590),(410,590),(410,724)], fill=(*color,240))
    elif kind == "cracks":
        for _ in range(55):
            x=random.randint(80,940); y=random.randint(80,940)
            pts=[]
            for k in range(random.randint(3,7)):
                pts.append((x+k*random.randint(15,55), y+random.randint(-45,45)))
            draw.line(pts, fill=(10,9,8,random.randint(120,220)), width=random.randint(2,5))
    elif kind == "grime":
        for _ in range(420):
            x=random.randint(0,size); y=random.randint(0,size); r=random.randint(3,22)
            draw.ellipse((x-r,y-r,x+r,y+r), fill=(12,10,8,random.randint(20,75)))
    elif kind == "target_cycle_box":
        draw.rectangle((70,80,954,944), fill=(36,74,70,210), outline=(225,230,220,235), width=28)
        draw.ellipse((345,535,470,660), outline=(225,230,220,245), width=18)
        draw.ellipse((575,535,700,660), outline=(225,230,220,245), width=18)
        draw.line((470,598,560,450,640,598,525,598,470,598), fill=(225,230,220,245), width=16)
    elif kind == "target_yellow_box":
        for off in range(-420,421,120):
            draw.line((0,512+off,1024,512-off), fill=(232,178,25,235), width=28)
            draw.line((0,512-off,1024,512+off), fill=(232,178,25,190), width=18)
    elif kind == "target_wet_reflection":
        for _ in range(180):
            x=random.randint(0,size); y=random.randint(0,size); w=random.randint(40,260)
            draw.line((x,y,x+w,y+random.randint(-5,5)), fill=(180,190,190,random.randint(25,90)), width=random.randint(2,8))
    # wear through road paint/decal
    alpha=img.getchannel('A'); ad=ImageDraw.Draw(alpha)
    for _ in range(120):
        x=random.randint(0,size); y=random.randint(0,size)
        ad.line((x,y,x+random.randint(20,170),y+random.randint(-10,10)), fill=0, width=random.randint(1,5))
    img.putalpha(alpha.filter(ImageFilter.GaussianBlur(radius=0.15)))
    img.save(path)


def obj_lamp_post(path: Path) -> None:
    # Simple multi-object proxy: pole + horizontal arm + lamp head as cuboids/cylinder-like blocks.
    with path.open('w', encoding='utf-8') as f:
        f.write('o london_streetlight_proxy\n')
        def box(cx,cy,cz,sx,sy,sz):
            base=len(verts)+1
            for x in [cx-sx,cx+sx]:
              for y in [cy-sy,cy+sy]:
                for z in [cz-sz,cz+sz]: verts.append((x,y,z))
            faces=[(base,base+1,base+3,base+2),(base+4,base+6,base+7,base+5),(base,base+4,base+5,base+1),(base+2,base+3,base+7,base+6),(base,base+2,base+6,base+4),(base+1,base+5,base+7,base+3)]
            return faces
        verts=[]; allfaces=[]
        allfaces += box(0,0,150,5,5,150)
        allfaces += box(45,0,295,45,4,4)
        allfaces += box(92,0,280,20,12,9)
        for v in verts: f.write('v %.3f %.3f %.3f\n'%v)
        for face in allfaces: f.write('f '+' '.join(map(str,face))+'\n')


def obj_rail_segment(path: Path) -> None:
    with path.open('w', encoding='utf-8') as f:
        f.write('o london_pedestrian_railing_proxy\n')
        verts=[]; faces=[]
        def add_box(cx,cy,cz,sx,sy,sz):
            b=len(verts)+1
            pts=[(cx-sx,cy-sy,cz-sz),(cx-sx,cy-sy,cz+sz),(cx-sx,cy+sy,cz-sz),(cx-sx,cy+sy,cz+sz),(cx+sx,cy-sy,cz-sz),(cx+sx,cy-sy,cz+sz),(cx+sx,cy+sy,cz-sz),(cx+sx,cy+sy,cz+sz)]
            verts.extend(pts); faces.extend([(b,b+1,b+3,b+2),(b+4,b+6,b+7,b+5),(b,b+4,b+5,b+1),(b+2,b+3,b+7,b+6),(b,b+2,b+6,b+4),(b+1,b+5,b+7,b+3)])
        for x in [-90,-45,0,45,90]: add_box(x,0,45,3,3,45)
        add_box(0,0,84,100,3,3); add_box(0,0,42,100,3,3)
        for v in verts: f.write('v %.3f %.3f %.3f\n'%v)
        for face in faces: f.write('f '+' '.join(map(str,face))+'\n')


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
    decal_texture(TEXTURE_DIR / "T_london_zebra_crossing_worn.png", "zebra")
    decal_texture(TEXTURE_DIR / "T_london_lane_arrow_straight_worn.png", "arrow_straight")
    decal_texture(TEXTURE_DIR / "T_london_lane_arrow_left_worn.png", "arrow_left")
    decal_texture(TEXTURE_DIR / "T_london_asphalt_crack_overlay.png", "cracks")
    decal_texture(TEXTURE_DIR / "T_london_grime_overlay.png", "grime")
    decal_texture(TEXTURE_DIR / "T_london_target_cycle_box.png", "target_cycle_box")
    decal_texture(TEXTURE_DIR / "T_london_target_yellow_box.png", "target_yellow_box")
    decal_texture(TEXTURE_DIR / "T_london_target_wet_reflection.png", "target_wet_reflection")
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
    obj_lamp_post(MESH_DIR / "london_streetlight_proxy.obj")
    obj_rail_segment(MESH_DIR / "london_pedestrian_railing_proxy.obj")
    obj_box(MESH_DIR / "cctv_camera_box.obj", "cctv_camera_box", 26, 10, 10, 2)
    obj_box(MESH_DIR / "signal_visor_box.obj", "signal_visor_box", 18, 10, 5, 1)
    install_cc0_texture_sources()
    MANIFEST.write_text("""# PhotorealRoadKit procedural source assets\n\nProject-owned procedural source assets for the London SmartIntersection photoreal fidelity pass.\n\nThese are project-owned procedural source assets plus committed ambientCG CC0 texture maps for road asphalt and brick facade detail. They replace the pure cube/flat-color blockout with visible asphalt wear, worn markings, curb material variation, signal/pole proxies, utility covers, drains, bollards, tactile paving, and urban scene context.\n""", encoding="utf-8")
    print(f"PHOTOREAL_ROADKIT_SOURCE_WRITTEN {ASSET_ROOT}")


if __name__ == "__main__":
    main()
