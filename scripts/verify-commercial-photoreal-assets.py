#!/usr/bin/env python3
"""Verify commercial photoreal asset-fidelity layer."""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageStat
import sys

ROOT = Path(__file__).resolve().parents[1]
UE = ROOT / "renderer" / "unreal" / "SmartIntersection"
SOURCE = UE / "SourceAssets" / "CommercialPhotorealKit" / "Textures"
MAPS = UE / "Content" / "Maps" / "Generated"

TEXTURE_PREFIXES = [
    "CommercialWetAsphalt",
    "CommercialSidewalkSlab",
    "CommercialWornMarking",
    "CommercialWeatheredFacade",
    "CommercialCCTVGlass",
]
CITIES = ["seoul", "new_york", "paris", "london"]


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    sys.exit(1)


def check_source_textures() -> None:
    for prefix in TEXTURE_PREFIXES:
        for suffix in ["BaseColor", "Normal", "Roughness"]:
            path = SOURCE / f"{prefix}_{suffix}.png"
            if not path.exists():
                fail(f"missing commercial texture {path}")
            im = Image.open(path).convert("RGB")
            stddev = sum(ImageStat.Stat(im).stddev) / 3
            if im.size != (2048, 2048):
                fail(f"bad texture dimensions {path}: {im.size}")
            if path.stat().st_size < 50_000 or stddev < 2:
                fail(f"texture looks stub-like {path}: bytes={path.stat().st_size} stddev={stddev:.2f}")
    print("COMMERCIAL_TEXTURE_SOURCE_PASS")


def check_generator() -> None:
    script = (UE / "Content" / "Python" / "generate_city_scene.py").read_text()
    for token in [
        "COMMERCIAL_TEXTURE_SETS",
        "import_commercial_photoreal_kit",
        "spawn_commercial_fidelity_pass",
        "/Game/CommercialPhotorealKit",
    ]:
        if token not in script:
            fail(f"generator missing token {token}")
    print("COMMERCIAL_GENERATOR_PASS")


def check_maps() -> None:
    for city in CITIES:
        path = MAPS / f"{city}_Intersection.umap"
        if not path.exists():
            fail(f"missing map {path}")
        data = path.read_bytes()
        for token in [b"CommercialPhotorealKit", b"commercial worn lane marking", b"commercial reflective regulatory sign plate"]:
            if token not in data:
                fail(f"map {city} missing commercial token {token!r}")
    print("COMMERCIAL_MAP_PASS")


if __name__ == "__main__":
    check_source_textures()
    check_generator()
    check_maps()
