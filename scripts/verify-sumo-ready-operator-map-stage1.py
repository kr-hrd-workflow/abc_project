#!/usr/bin/env python3
"""Verify Stage 1 SUMO-ready operator-map artifacts.

This is a semantic artifact check, not a substitute for human visual review.
It proves the generated map/proof/reference exist and contain the tokens that
keep this slice scoped to Unreal-rendered, SUMO-ready operator geometry.
"""
from __future__ import annotations

from pathlib import Path
import sys

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
UE = ROOT / "renderer" / "unreal" / "SmartIntersection"
GENERATOR = UE / "Content" / "Python" / "generate_road_intersection.py"
REFERENCE = ROOT / "artifacts" / "imagegen" / "sumo-ready-operator-map-stage1-reference.png"
MAP = UE / "Content" / "Maps" / "Generated" / "smart_intersection_rebuild.umap"
MANIFEST = UE / "GeneratedProof" / "smart_intersection_rebuild_operator_stage1_manifest.json"
PROOF = ROOT / "artifacts" / "unreal-operator-map-stage1-proof.png"

MIN_REFERENCE_BYTES = 500_000
MIN_MAP_BYTES = 650_000
MIN_PROOF_BYTES = 350_000

REQUIRED_GENERATOR_TOKENS = [
    "SMART_INTERSECTION_OPERATOR_STAGE1",
    "OperatorStage1",
    "SUMOReadyLargeIntersection",
    "TrafficReadableQueueZone",
    "smart_intersection_rebuild",
    "_build_operator_stage1_scene",
    "_spawn_operator_stage1_queue",
    "_spawn_runtime_controller",
]

REQUIRED_MAP_TOKENS = [
    b"OperatorStage1",
    b"SUMOReadyLargeIntersection",
    b"TrafficReadableQueueZone",
    b"QueueCapacity_40",
    b"SUMOPlaceholderVehicleQueue",
    b"TrafficSimulationController",
]

FORBIDDEN_MAP_TOKENS = [
    b"foreground proof",
    b"foreground plinth",
    b"PolyHaven CC0 VISIBLE",
    b"photo_backplate",
    b"road_card",
    b"ImageGen",
]


def fail(message: str) -> None:
    print(f"SUMO_READY_OPERATOR_STAGE1_FAIL: {message}")
    sys.exit(1)


def check_image(path: Path, label: str, min_bytes: int, require_opaque: bool = False) -> None:
    if not path.exists():
        fail(f"missing {label}: {path.relative_to(ROOT)}")
    if path.stat().st_size < min_bytes:
        fail(f"{label} too small: {path.relative_to(ROOT)} bytes={path.stat().st_size}")

    try:
        raw_image = Image.open(path)
    except Exception as exc:
        fail(f"{label} is not a readable image: {path.relative_to(ROOT)} error={exc}")
    if require_opaque and "A" in raw_image.getbands():
        fail(f"{label} has alpha channel that can render black in some viewers: {path.relative_to(ROOT)} mode={raw_image.mode}")

    image = raw_image.convert("RGB")
    if image.width < 1024 or image.height < 768:
        fail(f"{label} dimensions too small: {image.size}")

    stat = ImageStat.Stat(image)
    mean = sum(stat.mean) / 3.0
    stddev = sum(stat.stddev) / 3.0
    if mean < 35.0:
        fail(f"{label} is too dark: mean={mean:.2f}")
    if stddev < 20.0:
        fail(f"{label} lacks visual variation: stddev={stddev:.2f}")
    print(f"{label.upper()}_CHECK_PASS size={image.size} bytes={path.stat().st_size} mean={mean:.2f} stddev={stddev:.2f}")


def check_generator() -> None:
    if not GENERATOR.exists():
        fail(f"missing generator: {GENERATOR.relative_to(ROOT)}")
    text = GENERATOR.read_text(encoding="utf-8")
    for token in REQUIRED_GENERATOR_TOKENS:
        if token not in text:
            fail(f"generator missing token: {token}")
    print("GENERATOR_STAGE1_TOKEN_CHECK_PASS")


def check_map() -> None:
    if not MANIFEST.exists():
        fail(f"missing manifest: {MANIFEST.relative_to(ROOT)}")
    manifest = MANIFEST.read_text(encoding="utf-8")
    for token in [
        '"mode": "OperatorStage1"',
        '"simulation_truth_source": "SUMO truth source"',
        '"queue_capacity_visible": 40',
        "separate Unreal cube/decal-like geometry layers",
    ]:
        if token not in manifest:
            fail(f"manifest missing token: {token}")

    if not MAP.exists():
        fail(f"missing generated map: {MAP.relative_to(ROOT)}")
    data = MAP.read_bytes()
    if len(data) < MIN_MAP_BYTES:
        fail(f"generated map is too small: {MAP.relative_to(ROOT)} bytes={len(data)}")
    for token in REQUIRED_MAP_TOKENS:
        if token not in data:
            fail(f"map missing token: {token!r}")
    for token in FORBIDDEN_MAP_TOKENS:
        if token in data:
            fail(f"map contains forbidden Stage 1 token: {token!r}")
    print(f"MAP_STAGE1_TOKEN_CHECK_PASS bytes={len(data)} manifest={MANIFEST.relative_to(ROOT)}")


def main() -> None:
    check_image(REFERENCE, "imagegen reference", MIN_REFERENCE_BYTES)
    check_generator()
    check_map()
    check_image(PROOF, "operator proof", MIN_PROOF_BYTES, require_opaque=True)
    print("SUMO_READY_OPERATOR_STAGE1_PASS")


if __name__ == "__main__":
    main()
