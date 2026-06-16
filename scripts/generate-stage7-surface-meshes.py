#!/usr/bin/env python3
"""Generate Stage 7 image-derived surface OBJ meshes.

The meshes are deterministic visual-only source assets. They convert existing
Stage 7 ImageGen/source plates into shallow geometry for Unreal rendering; they
do not change SUMO/FastAPI/Unreal authority boundaries.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
TEXTURE_DIR = ROOT / "renderer" / "unreal" / "SmartIntersection" / "SourceAssets" / "PhotorealRoadKit" / "Textures"
MESH_DIR = ROOT / "renderer" / "unreal" / "SmartIntersection" / "SourceAssets" / "PhotorealRoadKit" / "Meshes"


def normalized_luma_grid(source: Path, cols: int, rows: int) -> list[list[float]]:
    image = Image.open(source).convert("L").resize((cols, rows), Image.Resampling.BICUBIC)
    values = [float(value) for value in image.tobytes()]
    ordered = sorted(values)
    low = ordered[int(len(ordered) * 0.12)]
    high = ordered[int(len(ordered) * 0.88)]
    span = max(1.0, high - low)
    grid: list[list[float]] = []
    for row in range(rows):
        line: list[float] = []
        for col in range(cols):
            raw = float(image.getpixel((col, row)))
            line.append(max(0.0, min(1.0, (raw - low) / span)))
        grid.append(line)
    return grid


def write_heightfield_obj(
    source: Path,
    out_path: Path,
    name: str,
    width_cm: float,
    depth_cm: float,
    height_cm: float,
    cols: int = 45,
    rows: int = 19,
) -> None:
    grid = normalized_luma_grid(source, cols, rows)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as handle:
        handle.write(f"o {name}\n")
        for row in range(rows):
            y = -depth_cm / 2.0 + depth_cm * row / (rows - 1)
            for col in range(cols):
                x = -width_cm / 2.0 + width_cm * col / (cols - 1)
                local = grid[row][col]
                # Keep relief shallow; it should break flat silhouettes, not become terrain.
                z = (local * 0.82 + ((row + col) % 3) * 0.03) * height_cm
                handle.write(f"v {x:.3f} {y:.3f} {z:.3f}\n")
        for row in range(rows):
            v = row / (rows - 1)
            for col in range(cols):
                u = col / (cols - 1)
                handle.write(f"vt {u:.5f} {v:.5f}\n")
        for row in range(rows - 1):
            for col in range(cols - 1):
                a = row * cols + col + 1
                b = a + 1
                c = a + cols + 1
                d = a + cols
                handle.write(f"f {a}/{a} {b}/{b} {c}/{c} {d}/{d}\n")


def main() -> None:
    specs = [
        (
            TEXTURE_DIR / "T_stage7_seoul_asphalt_marking_source.png",
            MESH_DIR / "stage7_seoul_asphalt_imagegen_heightfield.obj",
            "stage7_seoul_asphalt_imagegen_heightfield",
            5600.0,
            1550.0,
            4.6,
        ),
        (
            TEXTURE_DIR / "T_stage7_seoul_curb_sidewalk_source.png",
            MESH_DIR / "stage7_seoul_sidewalk_imagegen_heightfield.obj",
            "stage7_seoul_sidewalk_imagegen_heightfield",
            5200.0,
            760.0,
            7.2,
        ),
    ]
    for source, out_path, name, width_cm, depth_cm, height_cm in specs:
        if not source.exists():
            raise FileNotFoundError(f"Stage 7 surface source missing: {source}")
        write_heightfield_obj(source, out_path, name, width_cm, depth_cm, height_cm)
        print(f"STAGE7_IMAGEGEN_SURFACE_MESH_WRITTEN asset={name} path={out_path}")


if __name__ == "__main__":
    main()
