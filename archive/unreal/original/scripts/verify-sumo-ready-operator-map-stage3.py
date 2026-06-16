#!/usr/bin/env python3
"""Verify Stage 3 SUMO-ready operator-map artifacts.

This is a semantic artifact check, not a substitute for human visual review.
It proves the city asset-kit contract exists, one Seoul Stage 3 map is built
on Stage 2, and generated Image Gen reference assets do not become runtime
map objects.
"""
from __future__ import annotations

from pathlib import Path
import json
import sys

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
UE = ROOT / "renderer" / "unreal" / "SmartIntersection"
GENERATOR = UE / "Content" / "Python" / "generate_road_intersection.py"
GENERATOR_PS1 = ROOT / "scripts" / "generate-unreal-city.ps1"
PACKAGE_JSON = ROOT / "package.json"
CAPTURE_PY = UE / "Content" / "Python" / "capture_operator_map_stage3.py"
CAPTURE_PS1 = ROOT / "scripts" / "capture-unreal-operator-map-stage3.ps1"
REFERENCE = ROOT / "artifacts" / "imagegen" / "sumo-ready-operator-map-stage3-asset-reference.png"
KIT_PROFILE = UE / "SceneProfiles" / "operator_stage3_asset_kits.json"
MAP = UE / "Content" / "Maps" / "Generated" / "smart_intersection_rebuild_stage3.umap"
MANIFEST = UE / "GeneratedProof" / "smart_intersection_rebuild_operator_stage3_manifest.json"
PROOF = ROOT / "artifacts" / "unreal-operator-map-stage3-proof.png"

MIN_STAGE3_REFERENCE_BYTES = 500_000
MIN_STAGE3_MAP_BYTES = 820_000
MIN_STAGE3_PROOF_BYTES = 450_000

REQUIRED_CITIES = ["seoul", "new_york", "paris", "london"]
REQUIRED_VARIANTS = ["passenger_car", "bus", "taxi", "emergency_vehicle"]
ASSET_KIT_SCHEMA = "operator-stage3-city-asset-kit-v1"

REQUIRED_GENERATOR_TOKENS = [
    "SMART_INTERSECTION_OPERATOR_STAGE3",
    "OperatorStage3",
    "Stage3CityAssetKit",
    "Stage3SignalKit",
    "Stage3VehicleKit",
    "SUMOReadyAssetPivot",
    "_build_operator_stage3_scene",
]

REQUIRED_MAP_TOKENS = [
    b"OperatorStage3",
    b"Stage3CityAssetKit",
    b"Stage3SignalKit",
    b"Stage3VehicleKit",
    b"SUMOReadyAssetPivot",
    b"OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_seoul_north_passenger_car_00",
    b"OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_seoul_north_taxi_01",
    b"OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_seoul_north_bus_02",
    b"OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_seoul_south_emergency_vehicle_01",
    b"OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_seoul_east_passenger_car_00",
    b"OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_seoul_east_bus_01",
    b"OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_seoul_west_taxi_00",
    b"OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_seoul_west_emergency_vehicle_02",
    b"OperatorStage3_Stage3SignalKit_SUMOReadyAssetPivot_seoul_northwest_pole",
    b"OperatorStage3_Stage3SignalKit_SUMOReadyAssetPivot_seoul_northeast_pole",
    b"OperatorStage3_Stage3SignalKit_SUMOReadyAssetPivot_seoul_southwest_pole",
    b"OperatorStage3_Stage3SignalKit_SUMOReadyAssetPivot_seoul_southeast_pole",
    b"OperatorStage3_Stage3SignalKit_seoul_overhead_mast_arm_compact_seoul_northwest_head",
    b"operator_stage3_vehicle_dark",
    b"operator_stage3_vehicle_taxi_yellow",
    b"operator_stage3_vehicle_bus_green",
    b"operator_stage3_vehicle_emergency_blue",
    b"operator_stage3_vehicle_emergency_red",
    b"operator_stage3_vehicle_glass",
    b"operator_stage3_signal_black",
    b"operator_stage3_signal_lens_red",
    b"operator_stage3_signal_lens_green",
    b"OperatorStage2",
    b"Stage2ContextGeometry",
    b"NoTrafficZoneBackplate",
    b"TrafficReadableQueueZone",
    b"SUMOReadyLargeIntersection",
]

FORBIDDEN_STAGE3_TOKENS = [
    b"photo_backplate",
    b"road_card",
    b"ImageGen",
    b"asset_lineup",
    b"proof_plinth",
    b"foreground proof",
    b"foreground plinth",
]


def fail(message: str) -> None:
    print(f"SUMO_READY_OPERATOR_STAGE3_FAIL: {message}")
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


def check_asset_kit_profile() -> dict:
    if not KIT_PROFILE.exists():
        fail(f"missing asset-kit profile: {KIT_PROFILE.relative_to(ROOT)}")
    try:
        profile = json.loads(KIT_PROFILE.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"asset-kit profile is not valid JSON: {KIT_PROFILE.relative_to(ROOT)} error={exc}")

    if profile.get("schema") != ASSET_KIT_SCHEMA:
        fail(f"asset-kit schema mismatch: expected={ASSET_KIT_SCHEMA!r} actual={profile.get('schema')!r}")
    if profile.get("base_stage") != "OperatorStage2":
        fail(f"asset-kit base_stage mismatch: actual={profile.get('base_stage')!r}")

    lane_fit = profile.get("lane_fit_cm", {})
    for variant in REQUIRED_VARIANTS:
        dimensions = lane_fit.get(variant)
        if not isinstance(dimensions, dict):
            fail(f"asset-kit lane_fit_cm missing variant: {variant}")
        for key in ["length", "width", "height"]:
            if not isinstance(dimensions.get(key), int | float) or dimensions[key] <= 0:
                fail(f"asset-kit lane_fit_cm {variant}.{key} invalid: {dimensions.get(key)!r}")

    cities = profile.get("cities", {})
    for city in REQUIRED_CITIES:
        if city not in cities:
            fail(f"asset-kit profile missing city: {city}")
        variants = cities[city].get("variants", [])
        for variant in REQUIRED_VARIANTS:
            if variant not in variants:
                fail(f"asset-kit profile {city} missing variant: {variant}")
        if not cities[city].get("signal_style"):
            fail(f"asset-kit profile {city} missing signal_style")
        if not cities[city].get("vehicle_palette"):
            fail(f"asset-kit profile {city} missing vehicle_palette")

    print(f"KIT_PROFILE_STAGE3_CHECK_PASS schema={ASSET_KIT_SCHEMA} cities={','.join(REQUIRED_CITIES)} variants={','.join(REQUIRED_VARIANTS)}")
    return profile


def check_routing() -> None:
    for path in [GENERATOR_PS1, PACKAGE_JSON, CAPTURE_PY, CAPTURE_PS1]:
        if not path.exists():
            fail(f"missing Stage 3 routing file: {path.relative_to(ROOT)}")
    package = PACKAGE_JSON.read_text(encoding="utf-8")
    for token in [
        "unreal:generate:operator-stage3",
        "unreal:capture:operator-stage3",
        "verify:operator-map-stage3",
        "-OperatorStage3",
    ]:
        if token not in package:
            fail(f"package.json missing Stage 3 routing token: {token}")
    generator_ps1 = GENERATOR_PS1.read_text(encoding="utf-8")
    for token in ["OperatorStage3", "SMART_INTERSECTION_OPERATOR_STAGE3"]:
        if token not in generator_ps1:
            fail(f"generate-unreal-city.ps1 missing Stage 3 routing token: {token}")
    capture_py = CAPTURE_PY.read_text(encoding="utf-8")
    for token in [
        "smart_intersection_rebuild_stage3",
        "OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_seoul_north_passenger_car_00",
        "OperatorStage3_Stage3SignalKit_SUMOReadyAssetPivot_seoul_northwest_pole",
    ]:
        if token not in capture_py:
            fail(f"capture script missing Stage 3 token: {token}")
    capture_ps1 = CAPTURE_PS1.read_text(encoding="utf-8")
    if "SMART_INTERSECTION_OPERATOR_STAGE3_PROOF_OUTPUT" not in capture_ps1:
        fail("capture-unreal-operator-map-stage3.ps1 missing proof output env var")
    print("ROUTING_STAGE3_CHECK_PASS")


def check_generator() -> None:
    if not GENERATOR.exists():
        fail(f"missing generator: {GENERATOR.relative_to(ROOT)}")
    text = GENERATOR.read_text(encoding="utf-8")
    for token in REQUIRED_GENERATOR_TOKENS:
        if token not in text:
            fail(f"generator missing token: {token}")
    print("GENERATOR_STAGE3_TOKEN_CHECK_PASS")


def check_manifest(profile: dict) -> None:
    if not MANIFEST.exists():
        fail(f"missing manifest: {MANIFEST.relative_to(ROOT)}")
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"manifest is not valid JSON: {MANIFEST.relative_to(ROOT)} error={exc}")
    expected = {
        "mode": "OperatorStage3",
        "unreal_map": "/Game/Maps/Generated/smart_intersection_rebuild_stage3",
        "base_stage": "OperatorStage2",
        "asset_kit_schema": ASSET_KIT_SCHEMA,
        "active_city": "seoul",
    }
    for key, value in expected.items():
        if manifest.get(key) != value:
            fail(f"manifest {key} mismatch: expected={value!r} actual={manifest.get(key)!r}")
    if manifest.get("city_kits") != REQUIRED_CITIES:
        fail(f"manifest city_kits mismatch: actual={manifest.get('city_kits')!r}")
    if manifest.get("required_variants") != REQUIRED_VARIANTS:
        fail(f"manifest required_variants mismatch: actual={manifest.get('required_variants')!r}")
    for token in [
        "OperatorStage3",
        "Stage3CityAssetKit",
        "Stage3SignalKit",
        "Stage3VehicleKit",
        "SUMOReadyAssetPivot",
        "OperatorStage2",
        "NoTrafficZoneBackplate",
        "TrafficReadableQueueZone",
    ]:
        if token not in manifest.get("actor_evidence", []):
            fail(f"manifest missing actor evidence token: {token}")
    if sorted(manifest.get("city_kits", [])) != sorted(profile.get("cities", {}).keys()):
        fail("manifest city_kits do not match asset-kit profile cities")
    print(f"MANIFEST_STAGE3_CHECK_PASS manifest={MANIFEST.relative_to(ROOT)}")


def check_map() -> None:
    if not MAP.exists():
        fail(f"missing generated map: {MAP.relative_to(ROOT)}")
    data = MAP.read_bytes()
    if len(data) < MIN_STAGE3_MAP_BYTES:
        fail(f"generated map is too small: {MAP.relative_to(ROOT)} bytes={len(data)}")
    for token in REQUIRED_MAP_TOKENS:
        if token not in data:
            fail(f"map missing token: {token!r}")
    for token in FORBIDDEN_STAGE3_TOKENS:
        if token in data:
            fail(f"map contains forbidden Stage 3 token: {token!r}")
    print(f"MAP_STAGE3_TOKEN_CHECK_PASS bytes={len(data)}")


def main() -> None:
    check_image(REFERENCE, "stage3 imagegen reference", MIN_STAGE3_REFERENCE_BYTES)
    profile = check_asset_kit_profile()
    check_routing()
    check_generator()
    check_manifest(profile)
    check_map()
    check_image(
        PROOF,
        "operator stage3 proof",
        MIN_STAGE3_PROOF_BYTES,
        require_opaque=True,
        min_mean=60.0,
        max_mean=190.0,
        min_stddev=25.0,
    )
    print("SUMO_READY_OPERATOR_STAGE3_PASS")


if __name__ == "__main__":
    main()
