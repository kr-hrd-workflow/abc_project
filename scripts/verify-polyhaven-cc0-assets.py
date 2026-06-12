#!/usr/bin/env python3
"""Verify Poly Haven CC0 licensed assets are downloaded and wired into Unreal."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
UE = ROOT / "renderer" / "unreal" / "SmartIntersection"
SOURCE = UE / "SourceAssets" / "ExternalLicensedKit" / "PolyHavenCC0"
MANIFEST = SOURCE / "polyhaven_cc0_manifest.json"
MAPS = UE / "Content" / "Maps" / "Generated"
EXPECTED_ROLES = {
    "road_barrier",
    "fire_hydrant",
    "street_lamp",
    "trash_can",
    "manhole_cover",
    "street_seating",
    "asphalt_material",
    "pavement_material",
    "facade_material",
}
CITIES = ["seoul", "new_york", "paris", "london"]


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    sys.exit(1)


def check_manifest() -> None:
    if not MANIFEST.exists():
        fail(f"missing manifest {MANIFEST}")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if manifest.get("license") != "CC0-1.0":
        fail(f"manifest license is not CC0-1.0: {manifest.get('license')}")
    roles = {entry.get("role") for entry in manifest.get("assets", [])}
    missing = EXPECTED_ROLES - roles
    if missing:
        fail(f"manifest missing roles: {sorted(missing)}")
    for entry in manifest.get("assets", []):
        if entry.get("license") != "CC0-1.0":
            fail(f"asset {entry.get('asset_id')} is not CC0-1.0")
        for file in entry.get("files", []):
            path = ROOT / file["path"]
            if not path.exists():
                fail(f"missing downloaded file {path}")
            if path.stat().st_size != file["size"]:
                fail(f"size mismatch for {path}")
            if hashlib.md5(path.read_bytes()).hexdigest() != file["md5"]:
                fail(f"md5 mismatch for {path}")
    print("POLYHAVEN_MANIFEST_PASS")


def check_generator() -> None:
    script = (UE / "Content" / "Python" / "generate_city_scene.py").read_text()
    for token in [
        "POLYHAVEN_CC0_MODEL_KIT",
        "import_polyhaven_cc0_models",
        "spawn_polyhaven_cc0_city_pass",
        "/Game/ExternalLicensedKit/PolyHavenCC0",
    ]:
        if token not in script:
            fail(f"generator missing {token}")
    print("POLYHAVEN_GENERATOR_PASS")


def check_maps() -> None:
    for city in CITIES:
        path = MAPS / f"{city}_Intersection.umap"
        if not path.exists():
            fail(f"missing map {path}")
        data = path.read_bytes()
        for token in [
            b"PolyHaven CC0 concrete road barrier",
            b"PolyHaven CC0 street lamp",
            b"PolyHaven CC0 fire hydrant",
            b"PolyHaven CC0 water manhole cover",
            b"PolyHaven CC0 VISIBLE concrete road barrier foreground proof",
            b"PolyHaven CC0 VISIBLE fire hydrant foreground proof",
            b"PolyHaven CC0 VISIBLE modular street seating foreground proof",
            b"CC0 asset foreground plinth",
        ]:
            if token not in data:
                fail(f"map {city} missing token {token!r}")
    print("POLYHAVEN_MAP_PASS")


if __name__ == "__main__":
    check_manifest()
    check_generator()
    check_maps()
