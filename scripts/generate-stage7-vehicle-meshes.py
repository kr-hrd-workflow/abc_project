#!/usr/bin/env python3
"""Generate project-owned Stage 7 vehicle OBJ source meshes.

These are intentionally simple, static traffic-renderer meshes. They are not
drivable vehicles and do not change SUMO/FastAPI/Unreal authority boundaries.
"""
from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MESH_DIR = ROOT / "renderer" / "unreal" / "SmartIntersection" / "SourceAssets" / "PhotorealRoadKit" / "Meshes"


def box(cx: float, cy: float, cz: float, sx: float, sy: float, sz: float):
    vertices = [
        (cx - sx, cy - sy, cz),
        (cx + sx, cy - sy, cz),
        (cx + sx, cy + sy, cz),
        (cx - sx, cy + sy, cz),
        (cx - sx, cy - sy, cz + sz),
        (cx + sx, cy - sy, cz + sz),
        (cx + sx, cy + sy, cz + sz),
        (cx - sx, cy + sy, cz + sz),
    ]
    faces = [(1, 2, 3, 4), (5, 8, 7, 6), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 8, 4), (4, 8, 5, 1)]
    return vertices, faces


def tapered_box(
    cx: float,
    cy: float,
    cz: float,
    sx: float,
    sy: float,
    sz: float,
    top_sx: float,
    top_sy: float,
    top_dx: float = 0.0,
):
    bottom = [
        (cx - sx, cy - sy, cz),
        (cx + sx, cy - sy, cz),
        (cx + sx, cy + sy, cz),
        (cx - sx, cy + sy, cz),
    ]
    top = [
        (cx + top_dx - top_sx, cy - top_sy, cz + sz),
        (cx + top_dx + top_sx, cy - top_sy, cz + sz),
        (cx + top_dx + top_sx, cy + top_sy, cz + sz),
        (cx + top_dx - top_sx, cy + top_sy, cz + sz),
    ]
    faces = [(1, 2, 3, 4), (5, 8, 7, 6), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 8, 4), (4, 8, 5, 1)]
    return bottom + top, faces


def cylinder_x(cx: float, cy: float, cz: float, radius: float, width: float, segments: int = 20):
    vertices = []
    for x in (cx - width / 2, cx + width / 2):
        for index in range(segments):
            # Small hand-rolled trig table keeps this script dependency-free.
            import math

            angle = 2 * math.pi * index / segments
            vertices.append((x, cy + math.cos(angle) * radius, cz + math.sin(angle) * radius))
    faces = []
    for index in range(segments):
        next_index = (index + 1) % segments
        faces.append((index + 1, next_index + 1, segments + next_index + 1, segments + index + 1))
    faces.append(tuple(range(1, segments + 1)))
    faces.append(tuple(reversed(range(segments + 1, segments * 2 + 1))))
    return vertices, faces


def combine(parts):
    vertices = []
    faces = []
    for part_vertices, part_faces in parts:
        offset = len(vertices)
        vertices.extend(part_vertices)
        faces.extend(tuple(index + offset for index in face) for face in part_faces)
    return vertices, faces


def write_obj(path: Path, name: str, parts) -> None:
    vertices, faces = combine(parts)
    with path.open("w", encoding="utf-8") as handle:
        handle.write(f"o {name}\n")
        for x, y, z in vertices:
            handle.write(f"v {x:.4f} {y:.4f} {z:.4f}\n")
        for face in faces:
            handle.write("f " + " ".join(str(index) for index in face) + "\n")


def sedan_parts():
    return [
        tapered_box(0, 0, 0, 205, 82, 58, 188, 72),
        tapered_box(-28, 0, 58, 82, 67, 62, 58, 50, 12),
        tapered_box(116, 0, 48, 68, 72, 28, 52, 58, 12),
        tapered_box(-150, 0, 46, 46, 70, 24, 34, 54, -10),
        box(208, -48, 34, 5, 16, 10),
        box(208, 48, 34, 5, 16, 10),
        box(-210, -45, 42, 5, 14, 9),
        box(-210, 45, 42, 5, 14, 9),
        cylinder_x(-112, -88, 34, 34, 28),
        cylinder_x(112, -88, 34, 34, 28),
        cylinder_x(-112, 88, 34, 34, 28),
        cylinder_x(112, 88, 34, 34, 28),
    ]


def bus_parts():
    parts = [
        tapered_box(0, 0, 0, 380, 104, 138, 360, 96),
        tapered_box(0, 0, 138, 360, 96, 34, 330, 80),
        box(354, -66, 42, 9, 28, 16),
        box(354, 66, 42, 9, 28, 16),
        box(-382, -62, 62, 8, 24, 12),
        box(-382, 62, 62, 8, 24, 12),
    ]
    for x in (-250, -120, 10, 140, 270):
        parts.append(box(x, -108, 92, 42, 4, 32))
        parts.append(box(x, 108, 92, 42, 4, 32))
    for x in (-240, 40, 270):
        parts.append(cylinder_x(x, -116, 36, 38, 30))
        parts.append(cylinder_x(x, 116, 36, 38, 30))
    return parts


def taxi_parts():
    parts = sedan_parts()
    parts.extend([box(-12, 0, 126, 42, 24, 12), box(212, -42, 36, 5, 12, 9), box(212, 42, 36, 5, 12, 9)])
    return parts


def emergency_van_parts():
    return [
        tapered_box(0, 0, 0, 236, 88, 88, 220, 78),
        tapered_box(52, 0, 88, 116, 76, 62, 92, 58),
        box(-40, 0, 154, 64, 28, 14),
        box(240, -52, 42, 6, 18, 12),
        box(240, 52, 42, 6, 18, 12),
        box(-236, -50, 48, 6, 16, 10),
        box(-236, 50, 48, 6, 16, 10),
        cylinder_x(-132, -96, 36, 36, 30),
        cylinder_x(132, -96, 36, 36, 30),
        cylinder_x(-132, 96, 36, 36, 30),
        cylinder_x(132, 96, 36, 36, 30),
    ]


def main() -> None:
    MESH_DIR.mkdir(parents=True, exist_ok=True)
    specs = {
        "stage7_seoul_passenger_sedan": sedan_parts(),
        "stage7_seoul_bus": bus_parts(),
        "stage7_seoul_taxi": taxi_parts(),
        "stage7_seoul_emergency_van": emergency_van_parts(),
    }
    for name, parts in specs.items():
        write_obj(MESH_DIR / f"{name}.obj", name, parts)
    print(f"STAGE7_VEHICLE_MESH_SOURCES_WRITTEN {MESH_DIR}")


if __name__ == "__main__":
    main()
