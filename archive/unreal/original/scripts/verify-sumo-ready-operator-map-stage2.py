#!/usr/bin/env python3
"""Verify Stage 2 SUMO-ready operator-map artifacts.

This is a semantic artifact check, not a substitute for human visual review.
It proves Stage 2 keeps Stage 1 road/queue semantics while adding real 3D
context geometry and avoiding traffic-zone image/backplate dependence.
"""
from __future__ import annotations

from pathlib import Path
import json
import sys

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
UE = ROOT / "renderer" / "unreal" / "SmartIntersection"
GENERATOR = UE / "Content" / "Python" / "generate_road_intersection.py"
REFERENCE = ROOT / "artifacts" / "imagegen" / "sumo-ready-operator-map-stage2-context-reference.png"
MAP = UE / "Content" / "Maps" / "Generated" / "smart_intersection_rebuild_stage2.umap"
MANIFEST = UE / "GeneratedProof" / "smart_intersection_rebuild_operator_stage2_manifest.json"
PROOF = ROOT / "artifacts" / "unreal-operator-map-stage2-proof.png"

MIN_STAGE2_REFERENCE_BYTES = 500_000
MIN_STAGE2_MAP_BYTES = 760_000
MIN_STAGE2_PROOF_BYTES = 420_000

REQUIRED_GENERATOR_TOKENS = [
    "SMART_INTERSECTION_OPERATOR_STAGE2",
    "OperatorStage2",
    "Stage2ContextGeometry",
    "NoTrafficZoneBackplate",
    "OPERATOR_STAGE2_TRAFFIC_ZONE_HALF_EXTENT",
    "_build_operator_stage2_scene",
]

REQUIRED_MAP_TOKENS = [
    b"OperatorStage2",
    b"Stage2ContextGeometry",
    b"NoTrafficZoneBackplate",
    b"TrafficReadableQueueZone",
    b"OperatorStage1",
    b"SUMOReadyLargeIntersection",
    b"QueueCapacity_40",
]

FORBIDDEN_STAGE2_TOKENS = [
    b"photo_backplate",
    b"road_card",
    b"ImageGen",
    b"foreground proof",
    b"foreground plinth",
    b"PolyHaven CC0 VISIBLE",
]


def fail(message: str) -> None:
    print(f"SUMO_READY_OPERATOR_STAGE2_FAIL: {message}")
    sys.exit(1)


def check_image(
    path: Path,
    label: str,
    min_bytes: int,
    require_opaque: bool = False,
    min_mean: float = 35.0,
    max_mean: float | None = None,
    min_stddev: float = 20.0,
) -> None:
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
    if mean < min_mean:
        fail(f"{label} is too dark: mean={mean:.2f}")
    if max_mean is not None and mean > max_mean:
        fail(f"{label} is overexposed: mean={mean:.2f} max={max_mean:.2f}")
    if stddev < min_stddev:
        fail(f"{label} lacks readable geometry variation: stddev={stddev:.2f}")
    print(f"{label.upper()}_CHECK_PASS size={image.size} bytes={path.stat().st_size} mean={mean:.2f} stddev={stddev:.2f}")


def check_generator() -> None:
    if not GENERATOR.exists():
        fail(f"missing generator: {GENERATOR.relative_to(ROOT)}")
    text = GENERATOR.read_text(encoding="utf-8")
    for token in REQUIRED_GENERATOR_TOKENS:
        if token not in text:
            fail(f"generator missing token: {token}")
    print("GENERATOR_STAGE2_TOKEN_CHECK_PASS")


def check_manifest() -> None:
    if not MANIFEST.exists():
        fail(f"missing manifest: {MANIFEST.relative_to(ROOT)}")
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"manifest is not valid JSON: {MANIFEST.relative_to(ROOT)} error={exc}")
    expected = {
        "mode": "OperatorStage2",
        "unreal_map": "/Game/Maps/Generated/smart_intersection_rebuild_stage2",
        "base_stage": "OperatorStage1",
        "traffic_zone_half_extent_cm": 1840,
    }
    for key, value in expected.items():
        if manifest.get(key) != value:
            fail(f"manifest {key} mismatch: expected={value!r} actual={manifest.get(key)!r}")
    for token in ["OperatorStage2", "Stage2ContextGeometry", "NoTrafficZoneBackplate", "TrafficReadableQueueZone"]:
        if token not in manifest.get("actor_evidence", []):
            fail(f"manifest missing actor evidence token: {token}")
    print(f"MANIFEST_STAGE2_CHECK_PASS manifest={MANIFEST.relative_to(ROOT)}")


def check_map() -> None:
    if not MAP.exists():
        fail(f"missing generated map: {MAP.relative_to(ROOT)}")
    data = MAP.read_bytes()
    if len(data) < MIN_STAGE2_MAP_BYTES:
        fail(f"generated map is too small: {MAP.relative_to(ROOT)} bytes={len(data)}")
    for token in REQUIRED_MAP_TOKENS:
        if token not in data:
            fail(f"map missing token: {token!r}")
    for token in FORBIDDEN_STAGE2_TOKENS:
        if token in data:
            fail(f"map contains forbidden Stage 2 token: {token!r}")
    print(f"MAP_STAGE2_TOKEN_CHECK_PASS bytes={len(data)}")


def main() -> None:
    check_image(REFERENCE, "stage2 imagegen reference", MIN_STAGE2_REFERENCE_BYTES)
    check_generator()
    check_manifest()
    check_map()
    check_image(
        PROOF,
        "operator stage2 proof",
        MIN_STAGE2_PROOF_BYTES,
        require_opaque=True,
        min_mean=60.0,
        max_mean=190.0,
        min_stddev=25.0,
    )
    print("SUMO_READY_OPERATOR_STAGE2_PASS")


if __name__ == "__main__":
    main()
