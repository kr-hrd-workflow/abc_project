#!/usr/bin/env python3
from __future__ import annotations

import math
import random
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

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


def write_ascii_fbx_mesh(path: Path, name: str, vertices: list[tuple[float, float, float]], faces: list[tuple[int, ...]]) -> None:
    """Write a simple ASCII FBX 7.4 mesh as a durable source-asset seam."""
    coords = ",".join(f"{v:.6f}" for xyz in vertices for v in xyz)
    polygon_indices = []
    for face in faces:
        if len(face) < 3:
            continue
        *head, tail = face
        polygon_indices.extend(head)
        polygon_indices.append(-tail - 1)
    poly = ",".join(str(i) for i in polygon_indices)
    normals = ",".join(["0","0","1"] * len(polygon_indices))
    path.write_text(f"""; FBX 7.4.0 project-owned ASCII source generated for SmartIntersection
FBXHeaderExtension:  {{
    FBXHeaderVersion: 1003
    FBXVersion: 7400
    Creator: "SmartIntersection procedural FBX seam"
}}
GlobalSettings:  {{
    Version: 1000
    Properties70:  {{
        P: "UpAxis", "int", "Integer", "",1
        P: "UpAxisSign", "int", "Integer", "",1
        P: "FrontAxis", "int", "Integer", "",2
        P: "FrontAxisSign", "int", "Integer", "",1
        P: "CoordAxis", "int", "Integer", "",0
        P: "CoordAxisSign", "int", "Integer", "",1
        P: "UnitScaleFactor", "double", "Number", "",1
    }}
}}
Objects:  {{
    Geometry: 1000, "Geometry::{name}", "Mesh" {{
        Vertices: *{len(vertices)*3} {{ a: {coords} }}
        PolygonVertexIndex: *{len(polygon_indices)} {{ a: {poly} }}
        LayerElementNormal: 0 {{
            Version: 101
            Name: ""
            MappingInformationType: "ByPolygonVertex"
            ReferenceInformationType: "Direct"
            Normals: *{len(polygon_indices)*3} {{ a: {normals} }}
        }}
        Layer: 0 {{
            Version: 100
            LayerElement: {{ Type: "LayerElementNormal" TypedIndex: 0 }}
        }}
    }}
    Model: 2000, "Model::{name}", "Mesh" {{
        Version: 232
        Properties70:  {{
            P: "Lcl Translation", "Lcl Translation", "", "A",0,0,0
            P: "Lcl Rotation", "Lcl Rotation", "", "A",0,0,0
            P: "Lcl Scaling", "Lcl Scaling", "", "A",1,1,1
        }}
        Shading: T
        Culling: "CullingOff"
    }}
}}
Connections:  {{
    C: "OO",1000,2000
}}
""", encoding="utf-8")


def box_mesh(cx: float, cy: float, cz: float, sx: float, sy: float, sz: float):
    v = [(cx-sx,cy-sy,cz-sz),(cx+sx,cy-sy,cz-sz),(cx+sx,cy+sy,cz-sz),(cx-sx,cy+sy,cz-sz),
         (cx-sx,cy-sy,cz+sz),(cx+sx,cy-sy,cz+sz),(cx+sx,cy+sy,cz+sz),(cx-sx,cy+sy,cz+sz)]
    f = [(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
    return v, f


def combine_meshes(parts):
    vertices=[]; faces=[]
    for v, f in parts:
        offset=len(vertices)
        vertices.extend(v)
        faces.extend(tuple(i+offset for i in face) for face in f)
    return vertices, faces


def cylinder_mesh(cx: float, cy: float, cz: float, radius: float, height: float, segments: int = 32):
    vertices=[]
    for z in [cz, cz+height]:
        for i in range(segments):
            a=2*math.pi*i/segments
            vertices.append((cx+math.cos(a)*radius, cy+math.sin(a)*radius, z))
    faces=[]
    for i in range(segments):
        j=(i+1)%segments
        faces.append((i,j,segments+j,segments+i))
    faces.append(tuple(range(segments)))
    faces.append(tuple(reversed(range(segments,segments*2))))
    return vertices, faces


def generate_high_quality_fbx_sources() -> None:
    """Generate fallback FBX source replacements if Blender-authored binary FBX is absent.

    The preferred path is `scripts/generate-high-fidelity-fbx-blender.py`, which exports
    real binary FBX via Blender. This fallback never overwrites those larger authored FBX files.
    """
    preferred = [
        MESH_DIR / "london_streetlight_high_fidelity.fbx",
        MESH_DIR / "london_pedestrian_railing_high_fidelity.fbx",
        MESH_DIR / "signal_head_uk_high_fidelity.fbx",
        MESH_DIR / "cctv_camera_high_fidelity.fbx",
        MESH_DIR / "london_shopfront_high_fidelity.fbx",
        MESH_DIR / "london_window_strip_high_fidelity.fbx",
    ]
    if all(path.exists() and path.stat().st_size > 40_000 for path in preferred):
        return
    lamp_parts=[cylinder_mesh(0,0,0,4,300,40), cylinder_mesh(0,0,0,10,18,40)]
    for i in range(6):
        x=18+i*17; z=292 - i*3
        lamp_parts.append(box_mesh(x,0,z,12,3.2,3.2))
    lamp_parts.extend([box_mesh(124,0,270,26,12,8), box_mesh(124,0,260,20,8,3)])
    write_ascii_fbx_mesh(MESH_DIR / "london_streetlight_high_fidelity.fbx", "london_streetlight_high_fidelity", *combine_meshes(lamp_parts))

    rail_parts=[]
    for x in [-110,-70,-30,10,50,90,130]:
        rail_parts.append(cylinder_mesh(x,0,0,2.6,92,24))
    for z in [38,72,94]:
        rail_parts.append(box_mesh(10,0,z,138,2.8,2.8))
    write_ascii_fbx_mesh(MESH_DIR / "london_pedestrian_railing_high_fidelity.fbx", "london_pedestrian_railing_high_fidelity", *combine_meshes(rail_parts))

    sig_parts=[box_mesh(0,0,54,18,7,58), box_mesh(0,-9,94,15,13,8), box_mesh(0,-9,54,15,13,8), box_mesh(0,-9,14,15,13,8)]
    for z in [94,54,14]:
        sig_parts.append(cylinder_mesh(0,-16,z-6,7,12,32))
        sig_parts.append(box_mesh(0,-25,z+2,14,12,3))
    write_ascii_fbx_mesh(MESH_DIR / "signal_head_uk_high_fidelity.fbx", "signal_head_uk_high_fidelity", *combine_meshes(sig_parts))

    cctv_parts=[box_mesh(0,0,0,30,12,10), box_mesh(34,0,0,7,7,7), box_mesh(-20,0,14,34,15,3), box_mesh(-35,0,-16,4,4,22), cylinder_mesh(-35,0,-38,3,45,24)]
    write_ascii_fbx_mesh(MESH_DIR / "cctv_camera_high_fidelity.fbx", "cctv_camera_high_fidelity", *combine_meshes(cctv_parts))

    facade_parts=[box_mesh(0,0,170,145,14,170), box_mesh(0,-18,44,132,8,42), box_mesh(-70,-26,44,5,8,42), box_mesh(0,-26,44,5,8,42), box_mesh(70,-26,44,5,8,42)]
    for x in [-86,-43,0,43,86]:
        facade_parts.append(box_mesh(x,-26,160,16,6,42))
        facade_parts.append(box_mesh(x,-27,228,16,6,42))
    for z in [96,294,338]:
        facade_parts.append(box_mesh(0,-28,z,150,8,5))
    write_ascii_fbx_mesh(MESH_DIR / "london_shopfront_high_fidelity.fbx", "london_shopfront_high_fidelity", *combine_meshes(facade_parts))

    window_parts=[box_mesh(0,0,0,138,5,34)]
    for x in [-96,-48,0,48,96]:
        window_parts.append(box_mesh(x,-7,0,3,4,38))
    for z in [-18,18]:
        window_parts.append(box_mesh(0,-7,z,138,4,3))
    write_ascii_fbx_mesh(MESH_DIR / "london_window_strip_high_fidelity.fbx", "london_window_strip_high_fidelity", *combine_meshes(window_parts))


def target_convergence_road_atlas(path: Path) -> None:
    size = 2048
    img = Image.new("RGB", (size, size), (68, 75, 78))
    pix = img.load()
    # Wet asphalt grain, darker at edges, mild perspective-like streaking.
    for y in range(size):
        for x in range(size):
            vign = int(28 * (((x-size/2)**2 + (y-size/2)**2) ** 0.5) / (size*0.72))
            n = random.randint(-18, 18) + int(10 * math.sin((x * 0.015) + (y * 0.045)))
            base = max(58, min(150, 104 + n - int(vign * 0.42)))
            pix[x, y] = (base, max(18, base+2), max(18, base+3))
    draw = ImageDraw.Draw(img, "RGBA")
    # Red bus lane, near-left approach in target image.
    draw.polygon([(0,1250),(730,1170),(900,1455),(0,1640)], fill=(132,34,28,235))
    for _ in range(520):
        x=random.randint(0,900); y=random.randint(1130,1660); a=random.randint(18,70)
        draw.line((x,y,x+random.randint(40,190),y+random.randint(-6,6)), fill=(30,20,18,a), width=random.randint(1,6))
    # Yellow box junction, central.
    box=(700,700,1420,1260)
    draw.rectangle(box, outline=(190,145,35,210), width=18)
    for off in range(-540, 620, 105):
        draw.line((box[0], box[1]+off, box[2], box[1]+off+540), fill=(190,145,38,185), width=12)
        draw.line((box[0], box[3]-off, box[2], box[3]-off-540), fill=(180,135,35,145), width=8)
    # Foreground cycle box.
    cyc=(1240,1360,1840,1885)
    draw.rounded_rectangle(cyc, radius=18, fill=(38,104,96,220), outline=(232,238,226,235), width=16)
    draw.ellipse((1440,1585,1525,1670), outline=(225,230,220,235), width=9)
    draw.ellipse((1615,1585,1700,1670), outline=(225,230,220,235), width=9)
    draw.line((1525,1628,1588,1515,1668,1628,1582,1628,1525,1628), fill=(225,230,220,235), width=8)
    # Zebra/stop lines and worn white markings.
    for i in range(7):
        y=1320+i*54
        draw.rounded_rectangle((350,y,1075,y+24), radius=6, fill=(224,222,204,205))
    for i in range(6):
        y=430+i*44
        draw.rounded_rectangle((840,y,1510,y+20), radius=6, fill=(224,222,204,180))
    # Double yellow curb lines.
    for y in [1710, 1750, 345, 385]:
        draw.line((0,y,2048,y+random.randint(-8,8)), fill=(232,179,26,230), width=10)
    # Wet reflection streaks and puddles.
    for _ in range(240):
        x=random.randint(0,size); y=random.randint(0,size); w=random.randint(60,390)
        draw.line((x,y,x+w,y+random.randint(-4,4)), fill=(215,230,232,random.randint(34,105)), width=random.randint(1,7))
    for _ in range(32):
        x=random.randint(150,1900); y=random.randint(250,1800); rx=random.randint(50,230); ry=random.randint(8,38)
        draw.ellipse((x-rx,y-ry,x+rx,y+ry), fill=(32,42,45,random.randint(30,88)))
    # Cracks/grime/paint wear.
    for _ in range(120):
        x=random.randint(50,1990); y=random.randint(80,1970)
        pts=[]
        for k in range(random.randint(3,8)):
            pts.append((x+k*random.randint(15,60), y+random.randint(-35,35)))
        draw.line(pts, fill=(8,8,7,random.randint(80,170)), width=random.randint(1,4))
    for _ in range(600):
        x=random.randint(0,size); y=random.randint(0,size); r=random.randint(2,18)
        draw.ellipse((x-r,y-r,x+r,y+r), fill=(12,12,11,random.randint(5,24)))
    img = ImageEnhance.Brightness(img).enhance(1.18)
    img = ImageEnhance.Contrast(img).enhance(1.12)
    img.save(path, quality=95)


def target_convergence_facade_atlas(path: Path) -> None:
    size = 2048
    img = Image.new("RGB", (size, size), (122, 78, 60))
    draw = ImageDraw.Draw(img, "RGBA")
    # Brick courses.
    for y in range(0,size,34):
        draw.line((0,y,size,y), fill=(55,32,27,120), width=3)
        offset = 0 if (y//34)%2==0 else 54
        for x in range(-offset,size,108):
            draw.line((x,y,x,y+34), fill=(55,32,27,90), width=2)
    for _ in range(2000):
        x=random.randint(0,size-1); y=random.randint(0,size-1); c=random.randint(-24,24)
        r,g,b=img.getpixel((x,y)); draw.point((x,y), fill=(max(0,min(255,r+c)), max(0,min(255,g+c)), max(0,min(255,b+c)),255))
    # Shopfront glass and repeated warm/dark windows.
    for col,x in enumerate(range(120,1900,300)):
        draw.rounded_rectangle((x,1120,x+210,1760), radius=8, fill=(17,31,36,235), outline=(20,20,18,255), width=12)
        draw.rectangle((x+18,1180,x+192,1270), fill=(225,144,58,110))
    for y in [210,460,710,940]:
        for x in range(90,1930,235):
            warm = random.random() < 0.35
            fill=(32,55,64,230) if not warm else (230,142,55,180)
            draw.rectangle((x,y,x+145,y+105), fill=fill, outline=(18,19,18,255), width=8)
            draw.line((x+72,y,x+72,y+105), fill=(13,14,14,220), width=4)
            draw.line((x,y+52,x+145,y+52), fill=(13,14,14,220), width=4)
    # Stone cornices/ledges.
    for y in [1040,1800,80]:
        draw.rectangle((0,y,2048,y+42), fill=(128,122,108,220))
        draw.line((0,y+42,2048,y+42), fill=(58,56,50,160), width=5)
    img = ImageEnhance.Brightness(img).enhance(1.18)
    img = ImageEnhance.Contrast(img).enhance(1.18)
    img.save(path, quality=95)


def target_convergence_sky_atlas(path: Path) -> None:
    size = 1024
    img = Image.new("RGB", (size, size), (184, 196, 202))
    pix = img.load()
    for y in range(size):
        for x in range(size):
            grad = int((1 - y/size) * 34)
            n = random.randint(-8, 8) + int(9 * math.sin((x+y) * 0.018))
            c = max(145, min(232, 180 + grad + n))
            pix[x,y] = (c-3, c+3, c+7)
    draw=ImageDraw.Draw(img, "RGBA")
    for _ in range(70):
        x=random.randint(-100,size); y=random.randint(40,700); rx=random.randint(120,360); ry=random.randint(18,55)
        draw.ellipse((x-rx,y-ry,x+rx,y+ry), fill=(190,198,202,random.randint(15,42)))
    img=img.filter(ImageFilter.GaussianBlur(radius=2.2))
    img.save(path, quality=95)


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
    target_convergence_road_atlas(TEXTURE_DIR / "T_london_target_full_road_atlas.png")
    target_convergence_facade_atlas(TEXTURE_DIR / "T_london_target_facade_atlas.png")
    target_convergence_sky_atlas(TEXTURE_DIR / "T_london_target_sky_atlas.png")
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
    generate_high_quality_fbx_sources()
    install_cc0_texture_sources()
    MANIFEST.write_text("""# PhotorealRoadKit procedural source assets\n\nProject-owned procedural source assets for the London SmartIntersection photoreal fidelity pass.\n\nThese are project-owned procedural source assets plus committed ambientCG CC0 texture maps for road asphalt and brick facade detail. They replace the pure cube/flat-color blockout with visible asphalt wear, worn markings, curb material variation, signal/pole proxies, utility covers, drains, bollards, tactile paving, and urban scene context.\n""", encoding="utf-8")
    print(f"PHOTOREAL_ROADKIT_SOURCE_WRITTEN {ASSET_ROOT}")


if __name__ == "__main__":
    main()
