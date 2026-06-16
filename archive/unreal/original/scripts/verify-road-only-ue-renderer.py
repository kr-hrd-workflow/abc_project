#!/usr/bin/env python3
"""Verify the approved road-only SmartIntersection UE renderer contract.

This verifier intentionally checks semantic source/artifact contracts that can be
run before opening Unreal. It is not a visual substitute; screenshot/rubric proof
is still required after UE generation.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UE_ROOT = ROOT / "renderer" / "unreal" / "SmartIntersection"
PROFILE_DIR = UE_ROOT / "SceneProfiles" / "cities"
GENERATOR = UE_ROOT / "Content" / "Python" / "generate_road_intersection.py"
README = UE_ROOT / "README.md"
UPROJECT = UE_ROOT / "SmartIntersection.uproject"
REF_PACKET = ROOT / "docs" / "references" / "city-road-intersection-image-reference-approval-packet.md"

CITY_REQUIREMENTS = {
    "seoul": ["bus_lane", "wide_zebra_crosswalk", "tactile_paving", "korean_road_text"],
    "new_york": ["continental_crosswalk", "bus_lane", "bike_lane", "utility_covers"],
    "paris": ["european_zebra_crossing", "bike_lane", "stone_curb", "refuge_island"],
    "london": ["yellow_box_junction", "left_hand_traffic", "double_yellow_lines", "cycle_box"],
}

FORBIDDEN_PATH_TOKENS = [
    "photorealkit",
    "commercialphotorealkit",
    "externallicensedkit",
]

IGNORED_UNREAL_DIRS = {
    "binaries",
    "deriveddatacache",
    "intermediate",
    "saved",
}

FORBIDDEN_IMPLEMENTATION_TOKENS = [
    "spawn_vehicle",
    "spawn_pedestrian",
    "traffic_ai_controller",
    "drivable_car",
    "gameplay_mode",
]

REQUIRED_GENERATOR_TOKENS = [
    "RoadOnlyRenderer",
    "SUMO truth source",
    "TraCI bridge",
    "yellow_box_junction",
    "wide_zebra_crosswalk",
    "continental_crosswalk",
    "european_zebra_crossing",
    "no vehicles",
    "no pedestrians",
]


def fail(message: str) -> None:
    print(f"ROAD_ONLY_VERIFY_FAIL: {message}")
    sys.exit(1)


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8-sig")


def main() -> None:
    if not UE_ROOT.exists():
        fail(f"UE root missing: {UE_ROOT}")
    for path in [UPROJECT, README, GENERATOR, REF_PACKET]:
        if not path.exists():
            fail(f"required file missing: {path.relative_to(ROOT)}")

    if not PROFILE_DIR.exists():
        fail(f"city profile dir missing: {PROFILE_DIR.relative_to(ROOT)}")

    generator_text = read_text(GENERATOR)
    readme_text = read_text(README)
    combined = f"{generator_text}\n{readme_text}".lower()

    for token in REQUIRED_GENERATOR_TOKENS:
        if token.lower() not in combined:
            fail(f"required renderer token missing: {token}")

    for path in UE_ROOT.rglob("*"):
        if not path.is_file():
            continue
        rel_path = path.relative_to(UE_ROOT)
        if any(part.lower() in IGNORED_UNREAL_DIRS for part in rel_path.parts):
            continue
        rel = rel_path.as_posix().lower()
        if any(token in rel for token in FORBIDDEN_PATH_TOKENS):
            fail(f"forbidden scope token in path: {rel}")
        if path.suffix.lower() in {".py", ".md", ".json", ".ini", ".uproject", ".cs"}:
            text = read_text(path).lower()
            for token in FORBIDDEN_IMPLEMENTATION_TOKENS:
                if token in text:
                    fail(f"forbidden implementation token `{token}` in {path.relative_to(ROOT)}")

    for city, required_features in CITY_REQUIREMENTS.items():
        profile_path = PROFILE_DIR / f"{city}.json"
        if not profile_path.exists():
            fail(f"city profile missing: {profile_path.relative_to(ROOT)}")
        profile = json.loads(read_text(profile_path))
        if profile.get("city") != city:
            fail(f"profile city mismatch in {profile_path.name}")
        if profile.get("renderer_role") != "unreal_renderer_only":
            fail(f"renderer_role mismatch in {profile_path.name}")
        if profile.get("simulation_truth_source") != "SUMO":
            fail(f"simulation truth source mismatch in {profile_path.name}")
        features = set(profile.get("road_features", []))
        missing = [feature for feature in required_features if feature not in features]
        if missing:
            fail(f"{city} profile missing road features: {', '.join(missing)}")
        exclusions = set(profile.get("excluded_scope", []))
        for excluded in ["vehicles", "pedestrians", "gameplay", "ue_side_traffic_simulation"]:
            if excluded not in exclusions:
                fail(f"{city} profile missing excluded scope: {excluded}")

    print("ROAD_ONLY_VERIFY_PASS")
    print(f"verified_cities={','.join(CITY_REQUIREMENTS)}")
    print(f"generator={GENERATOR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
