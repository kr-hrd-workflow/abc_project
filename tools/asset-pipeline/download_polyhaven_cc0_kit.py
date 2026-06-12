#!/usr/bin/env python3
"""Download selected Poly Haven CC0 city/road assets for SmartIntersection.

This script downloads only public CC0 assets via the official Poly Haven API.
It writes a machine-readable manifest with source URLs, md5 checksums, sizes,
and license metadata so the assets can be audited later.
"""
from __future__ import annotations

import hashlib
import json
import time
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "renderer" / "unreal" / "SmartIntersection" / "SourceAssets" / "ExternalLicensedKit" / "PolyHavenCC0"
MANIFEST = OUT / "polyhaven_cc0_manifest.json"
USER_AGENT = "Mozilla/5.0 abc_project non-commercial test asset pipeline"

MODEL_ASSETS = {
    "concrete_road_barrier": {"resolution": "1k", "role": "road_barrier"},
    "fire_hydrant": {"resolution": "1k", "role": "fire_hydrant"},
    "street_lamp_01": {"resolution": "1k", "role": "street_lamp"},
    "metal_trash_can": {"resolution": "1k", "role": "trash_can"},
    "water_manhole_cover": {"resolution": "1k", "role": "manhole_cover"},
    "modular_street_seating": {"resolution": "1k", "role": "street_seating"},
}

TEXTURE_ASSETS = {
    "asphalt_02": {"resolution": "1k", "role": "asphalt_material"},
    "brick_pavement": {"resolution": "1k", "role": "pavement_material"},
    "concrete_tile_facade": {"resolution": "1k", "role": "facade_material"},
}


def get_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def download(url: str, path: Path, expected_md5: str | None = None, expected_size: int | None = None) -> dict[str, Any]:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and expected_size and path.stat().st_size == expected_size:
        digest = hashlib.md5(path.read_bytes()).hexdigest()
        if expected_md5 and digest != expected_md5:
            path.unlink()
        else:
            return {"path": path.relative_to(ROOT).as_posix(), "size": path.stat().st_size, "md5": digest, "url": url, "cached": True}
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=180) as response, path.open("wb") as file:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            file.write(chunk)
    digest = hashlib.md5(path.read_bytes()).hexdigest()
    if expected_md5 and digest != expected_md5:
        raise RuntimeError(f"MD5 mismatch for {path}: expected {expected_md5}, got {digest}")
    if expected_size and path.stat().st_size != expected_size:
        raise RuntimeError(f"Size mismatch for {path}: expected {expected_size}, got {path.stat().st_size}")
    return {"path": path.relative_to(ROOT).as_posix(), "size": path.stat().st_size, "md5": digest, "url": url, "cached": False}


def file_record(asset_id: str, record: dict[str, Any], subdir: Path) -> dict[str, Any]:
    url = record["url"]
    filename = Path(url).name
    return download(url, subdir / filename, record.get("md5"), record.get("size"))


def download_model(asset_id: str, meta: dict[str, str]) -> dict[str, Any]:
    files = get_json(f"https://api.polyhaven.com/files/{asset_id}")
    resolution = meta["resolution"]
    fbx = files["fbx"][resolution]["fbx"]
    subdir = OUT / "Models" / asset_id
    downloads = [file_record(asset_id, fbx, subdir)]
    for relative, include in sorted(fbx.get("include", {}).items()):
        downloads.append(download(include["url"], subdir / relative, include.get("md5"), include.get("size")))
    return {
        "asset_id": asset_id,
        "type": "model",
        "role": meta["role"],
        "resolution": resolution,
        "source": f"https://polyhaven.com/a/{asset_id}",
        "license": "CC0-1.0",
        "api": f"https://api.polyhaven.com/files/{asset_id}",
        "main_file": downloads[0]["path"],
        "files": downloads,
    }


def choose_texture_files(files: dict[str, Any], resolution: str) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    for slot, preferred in [("Diffuse", "jpg"), ("nor_gl", "jpg"), ("Rough", "jpg"), ("arm", "jpg")]:
        if slot in files and resolution in files[slot]:
            choices = files[slot][resolution]
            if preferred in choices:
                selected.append(choices[preferred])
            elif choices:
                selected.append(next(iter(choices.values())))
    return selected


def download_texture(asset_id: str, meta: dict[str, str]) -> dict[str, Any]:
    files = get_json(f"https://api.polyhaven.com/files/{asset_id}")
    resolution = meta["resolution"]
    subdir = OUT / "Textures" / asset_id
    downloads = [file_record(asset_id, record, subdir) for record in choose_texture_files(files, resolution)]
    if not downloads:
        raise RuntimeError(f"No usable texture files for {asset_id}")
    return {
        "asset_id": asset_id,
        "type": "texture",
        "role": meta["role"],
        "resolution": resolution,
        "source": f"https://polyhaven.com/a/{asset_id}",
        "license": "CC0-1.0",
        "api": f"https://api.polyhaven.com/files/{asset_id}",
        "files": downloads,
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    entries = []
    for asset_id, meta in MODEL_ASSETS.items():
        print(f"MODEL {asset_id}")
        entries.append(download_model(asset_id, meta))
    for asset_id, meta in TEXTURE_ASSETS.items():
        print(f"TEXTURE {asset_id}")
        entries.append(download_texture(asset_id, meta))
    manifest = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "provider": "Poly Haven",
        "provider_url": "https://polyhaven.com",
        "license": "CC0-1.0",
        "license_url": "https://polyhaven.com/license",
        "usage_note": "Downloaded for non-commercial test project; assets are CC0 and may be used without attribution, but source URLs are preserved for audit.",
        "assets": entries,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    total = sum(file["size"] for entry in entries for file in entry["files"])
    print(f"POLYHAVEN_CC0_DOWNLOAD_PASS assets={len(entries)} bytes={total} manifest={MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
