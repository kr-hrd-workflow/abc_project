#!/usr/bin/env python3
"""Verify Stage 6 photoreal Seoul operator-map proof artifacts.

This is a renderer-realism artifact check. It does not claim live SUMO unless
runtime metadata explicitly proves simulation_source=sumo_traci.
"""
from __future__ import annotations

from pathlib import Path
import json
import subprocess
import sys

from PIL import Image, ImageStat


ROOT = Path(__file__).resolve().parents[1]
UE = ROOT / "renderer" / "unreal" / "SmartIntersection"
GENERATOR = UE / "Content" / "Python" / "generate_road_intersection.py"
GENERATOR_PS1 = ROOT / "scripts" / "generate-unreal-city.ps1"
PACKAGE_JSON = ROOT / "package.json"
CAPTURE_PY = UE / "Content" / "Python" / "capture_operator_map_stage6.py"
CAPTURE_PS1 = ROOT / "scripts" / "capture-unreal-operator-map-stage6.ps1"
PROFILE = UE / "SceneProfiles" / "operator_stage6_photoreal_profile.json"
MANIFEST = UE / "GeneratedProof" / "smart_intersection_rebuild_operator_stage6_photoreal_manifest.json"
MAP = UE / "Content" / "Maps" / "Generated" / "smart_intersection_rebuild_operator_stage6.umap"
BEFORE = ROOT / "artifacts" / "unreal-operator-map-stage6-before.png"
AFTER = ROOT / "artifacts" / "unreal-operator-map-stage6-photoreal-proof.png"
CONTACT = ROOT / "artifacts" / "unreal-operator-map-stage6-before-after-contact-sheet.png"
IMAGEGEN_CONTACT = ROOT / "artifacts" / "imagegen" / "stage6" / "operator_stage6_imagegen_contact_sheet.png"
VISUAL_VERDICT = ROOT / "artifacts" / "unreal-operator-map-stage6-visual-verdict.json"
DEFAULT_ENGINE = UE / "Config" / "DefaultEngine.ini"

SCHEMA = "operator-stage6-photoreal-seoul-profile-v1"
MIN_MAP_BYTES = 900_000
MIN_PROOF_BYTES = 420_000
MIN_SOURCE_IMAGE_BYTES = 500_000

REQUIRED_SOURCE_TEXTURES = [
    (
        "stage6_seoul_photoreal_target",
        ROOT / "artifacts" / "imagegen" / "stage6" / "operator_stage6_photoreal_target.png",
        UE / "SourceAssets" / "PhotorealRoadKit" / "Textures" / "T_stage6_seoul_photoreal_target.png",
    ),
    (
        "stage6_seoul_material_study",
        ROOT / "artifacts" / "imagegen" / "stage6" / "operator_stage6_material_study.png",
        UE / "SourceAssets" / "PhotorealRoadKit" / "Textures" / "T_stage6_seoul_material_study.png",
    ),
    (
        "stage6_seoul_road_atlas",
        ROOT / "artifacts" / "imagegen" / "stage6" / "operator_stage6_road_atlas_source.png",
        UE / "SourceAssets" / "PhotorealRoadKit" / "Textures" / "T_stage6_seoul_road_atlas.png",
    ),
    (
        "stage6_seoul_surface_overlays",
        ROOT / "artifacts" / "imagegen" / "stage6" / "operator_stage6_surface_overlays_source.png",
        UE / "SourceAssets" / "PhotorealRoadKit" / "Textures" / "T_stage6_seoul_surface_overlays.png",
    ),
]

REQUIRED_GENERATOR_TOKENS = [
    "SMART_INTERSECTION_OPERATOR_STAGE6",
    "OperatorStage6",
    "SUMOReadyOperatorMapPhotoreal",
    "Stage6PhotorealSurface",
    "Stage6GeneratedTextureApplied",
    "Stage6DecalAtlasApplied",
    "Stage4ReadableRuntimeState",
    "NoImageCardTrafficZone",
    "_build_operator_stage6_scene",
]

REQUIRED_MANIFEST_ACTOR_EVIDENCE = [
    "OperatorStage6",
    "SUMOReadyOperatorMapPhotoreal",
    "Stage6PhotorealSurface",
    "Stage6GeneratedTextureApplied",
    "Stage6DecalAtlasApplied",
    "Stage4ReadableRuntimeState",
    "NoImageCardTrafficZone",
]

REQUIRED_MAP_TOKENS = [
    b"OperatorStage6",
    b"SUMOReadyOperatorMapPhotoreal",
    b"Stage6PhotorealSurface",
    b"Stage6GeneratedTextureApplied",
    b"Stage6DecalAtlasApplied",
    b"Stage4ReadableRuntimeState",
    b"NoImageCardTrafficZone",
    b"stage6_seoul_road_atlas",
    b"stage6_seoul_surface_overlays",
    b"OperatorStage1",
    b"TrafficReadableQueueZone",
    b"OperatorStage2",
    b"NoTrafficZoneBackplate",
    b"OperatorStage3",
    b"Stage3VehicleKit",
    b"Stage3SignalKit",
    b"SUMOReadyAssetPivot",
]

FORBIDDEN_MAP_TOKENS = [
    b"proof_plinth",
    b"foreground proof",
    b"foreground plinth",
    b"traffic_zone_image_card",
    b"dominant traffic-zone image card",
]

VISUAL_REQUIREMENTS = [
    "reality_like_asphalt",
    "readable_markings",
    "reality_like_curbs",
    "readable_signals",
    "readable_vehicles",
    "traffic_camera_lighting",
    "stage1_to_stage5_readability_preserved",
    "no_dominant_image_card",
]


def fail(message: str) -> None:
    print(f"SUMO_READY_OPERATOR_STAGE6_FAIL: {message}")
    sys.exit(1)


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def load_json(path: Path, label: str) -> dict:
    if not path.exists():
        fail(f"missing {label}: {rel(path)}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"{label} is not valid JSON: {rel(path)} error={exc}")
    if not isinstance(value, dict):
        fail(f"{label} root is not an object: {rel(path)}")
    return value


def check_image(
    path: Path,
    label: str,
    min_bytes: int,
    min_width: int = 1024,
    min_height: int = 768,
    require_opaque: bool = False,
    min_mean: float = 12.0,
    max_mean: float = 235.0,
    min_stddev: float = 18.0,
) -> None:
    if not path.exists():
        fail(f"missing {label}: {rel(path)}")
    if path.stat().st_size < min_bytes:
        fail(f"{label} too small: {rel(path)} bytes={path.stat().st_size}")
    try:
        raw = Image.open(path)
    except Exception as exc:
        fail(f"{label} is not a readable image: {rel(path)} error={exc}")
    if require_opaque and "A" in raw.getbands():
        fail(f"{label} has alpha channel that can render black: mode={raw.mode}")
    image = raw.convert("RGB")
    if image.width < min_width or image.height < min_height:
        fail(f"{label} dimensions too small: {image.size}")
    stat = ImageStat.Stat(image)
    mean = sum(stat.mean) / 3.0
    stddev = sum(stat.stddev) / 3.0
    if mean < min_mean or mean > max_mean:
        fail(f"{label} brightness out of range: mean={mean:.2f}")
    if stddev < min_stddev:
        fail(f"{label} lacks visible variation: stddev={stddev:.2f}")
    print(f"{label.upper()}_CHECK_PASS size={image.size} bytes={path.stat().st_size} mean={mean:.2f} stddev={stddev:.2f}")


def require_tokens(path: Path, tokens: list[str], label: str) -> None:
    if not path.exists():
        fail(f"missing {label}: {rel(path)}")
    text = path.read_text(encoding="utf-8")
    for token in tokens:
        if token not in text:
            fail(f"{label} missing token: {token}")


def check_source_tokens() -> None:
    source_expectations = {
        GENERATOR: REQUIRED_GENERATOR_TOKENS,
        GENERATOR_PS1: ["OperatorStage6", "SMART_INTERSECTION_OPERATOR_STAGE6"],
        PACKAGE_JSON: [
            "unreal:generate:operator-stage6",
            "unreal:capture:operator-stage6",
            "verify:operator-map-stage6",
            "-OperatorStage6",
        ],
        CAPTURE_PY: [
            "smart_intersection_rebuild_operator_stage6",
            "operator-stage6-unreal-before-after-proof-v1",
            "stage4-fixture-a",
            "simulation_source",
        ],
        CAPTURE_PS1: [
            "SMART_INTERSECTION_OPERATOR_STAGE6_BEFORE_OUTPUT",
            "SMART_INTERSECTION_OPERATOR_STAGE6_AFTER_OUTPUT",
            "OPERATOR_STAGE6_CONTACT_SHEET",
        ],
    }
    for path, tokens in source_expectations.items():
        require_tokens(path, tokens, rel(path))
    print("STAGE6_SOURCE_TOKEN_CHECK_PASS")


def check_profile() -> dict:
    profile = load_json(PROFILE, "Stage 6 profile")
    if profile.get("schema") != SCHEMA:
        fail(f"profile schema mismatch: {profile.get('schema')!r}")
    if profile.get("city") != "seoul":
        fail(f"profile city mismatch: {profile.get('city')!r}")
    targets = profile.get("imagegen_targets", [])
    if len(targets) < 4:
        fail("profile must record four Image Gen targets/source plates")
    materials = {target.get("material") for target in targets if isinstance(target, dict)}
    for material, artifact, texture in REQUIRED_SOURCE_TEXTURES:
        if material not in materials:
            fail(f"profile imagegen_targets missing material: {material}")
        check_image(artifact, f"imagegen_{material}", MIN_SOURCE_IMAGE_BYTES, min_width=1000, min_height=900)
        check_image(texture, f"source_texture_{material}", MIN_SOURCE_IMAGE_BYTES, min_width=1000, min_height=900)
    check_image(IMAGEGEN_CONTACT, "imagegen_contact_sheet", MIN_SOURCE_IMAGE_BYTES, min_width=1200, min_height=760)
    source_materials = {item.get("material") for item in profile.get("source_textures", []) if isinstance(item, dict)}
    for material, _, _ in REQUIRED_SOURCE_TEXTURES:
        if material not in source_materials:
            fail(f"profile source_textures missing material: {material}")
    for material in ("stage6_seoul_material_study", "stage6_seoul_road_atlas", "stage6_seoul_surface_overlays"):
        items = [item for item in profile.get("source_textures", []) if item.get("material") == material]
        if not items or not items[0].get("consuming_actors"):
            fail(f"profile source texture lacks consuming actors: {material}")
    boundary = " ".join(str(value) for value in profile.get("simulation_boundary", {}).values())
    for token in ("SUMO/TraCI", "FastAPI", "Unreal", "Pixel Streaming"):
        if token not in boundary:
            fail(f"profile simulation boundary missing token: {token}")
    print("STAGE6_PROFILE_CHECK_PASS")
    return profile


def check_manifest(profile: dict) -> dict:
    manifest = load_json(MANIFEST, "Stage 6 manifest")
    expected = {
        "schema": "operator-stage6-photoreal-proof-v1",
        "mode": "OperatorStage6",
        "city": "seoul",
        "unreal_map": "/Game/Maps/Generated/smart_intersection_rebuild_operator_stage6",
        "base_stage": "OperatorStage3",
        "profile_schema": SCHEMA,
        "capture_schema": "operator-stage6-unreal-before-after-proof-v1",
        "simulation_source": "sumo_traci_fixture",
        "proof_before_image": rel(BEFORE),
        "proof_after_image": rel(AFTER),
        "proof_contact_sheet": rel(CONTACT),
    }
    for key, value in expected.items():
        if manifest.get(key) != value:
            fail(f"manifest {key} mismatch: expected={value!r} actual={manifest.get(key)!r}")
    policy = manifest.get("renderer_policy", "")
    for token in ("SUMO/TraCI is truth", "FastAPI orchestrates", "Unreal renders", "Pixel Streaming transports"):
        if token not in policy:
            fail(f"manifest renderer policy missing: {token}")
    if "sumo_traci_runtime_metadata" not in manifest.get("live_sumo_status", ""):
        fail("manifest must keep live SUMO deferred until real sumo_traci metadata")
    profile_targets = {item.get("material") for item in profile.get("imagegen_targets", []) if isinstance(item, dict)}
    manifest_targets = {item.get("material") for item in manifest.get("imagegen_targets", []) if isinstance(item, dict)}
    if profile_targets - manifest_targets:
        fail(f"manifest imagegen_targets missing profile materials: {sorted(profile_targets - manifest_targets)}")
    for token in REQUIRED_MANIFEST_ACTOR_EVIDENCE:
        if token not in manifest.get("actor_evidence", []):
            fail(f"manifest actor_evidence missing token: {token}")
    print("STAGE6_MANIFEST_CHECK_PASS")
    return manifest


def check_map() -> None:
    if not MAP.exists():
        fail(f"missing generated Stage 6 map: {rel(MAP)}")
    data = MAP.read_bytes()
    if len(data) < MIN_MAP_BYTES:
        fail(f"generated Stage 6 map too small: {rel(MAP)} bytes={len(data)}")
    for token in REQUIRED_MAP_TOKENS:
        if token not in data:
            fail(f"generated Stage 6 map missing token: {token.decode('utf-8', errors='replace')}")
    for token in FORBIDDEN_MAP_TOKENS:
        if token in data:
            fail(f"generated Stage 6 map contains forbidden token: {token.decode('utf-8', errors='replace')}")
    print(f"STAGE6_MAP_CHECK_PASS map={rel(MAP)} bytes={len(data)}")


def check_proof_images() -> None:
    check_image(BEFORE, "stage6_before_unreal_proof", MIN_PROOF_BYTES, require_opaque=True, min_stddev=18.0)
    check_image(AFTER, "stage6_after_unreal_photoreal_proof", MIN_PROOF_BYTES, require_opaque=True, min_stddev=18.0)
    check_image(CONTACT, "stage6_before_after_contact_sheet", MIN_PROOF_BYTES, min_width=3000, min_height=850, require_opaque=True, min_stddev=18.0)
    print("STAGE6_UNREAL_PROOF_IMAGE_CHECK_PASS")


def check_visual_verdict() -> None:
    verdict = load_json(VISUAL_VERDICT, "Stage 6 visual verdict")
    if verdict.get("schema") != "operator-stage6-human-visual-verdict-v1":
        fail(f"visual verdict schema mismatch: {verdict.get('schema')!r}")
    if verdict.get("proof_image") != rel(AFTER):
        fail(f"visual verdict proof_image mismatch: {verdict.get('proof_image')!r}")
    checks = verdict.get("checks", {})
    for key in VISUAL_REQUIREMENTS:
        if checks.get(key) is not True:
            fail(f"visual verdict check not approved: {key}")
    if not verdict.get("inspected_by"):
        fail("visual verdict missing inspected_by")
    print("STAGE6_VISUAL_VERDICT_CHECK_PASS")


def check_secret_boundaries() -> None:
    if DEFAULT_ENGINE.exists() and "SecurityToken=" in DEFAULT_ENGINE.read_text(encoding="utf-8", errors="ignore"):
        fail(f"Unreal config contains generated SecurityToken: {rel(DEFAULT_ENGINE)}")
    result = subprocess.run(
        ["git", "ls-files", "--", ".env.local", "tmp/PixelStreamingInfrastructure"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.stdout.strip():
        fail(f"forbidden tracked local/secrets path: {result.stdout.strip()}")
    print("STAGE6_SECRET_BOUNDARY_CHECK_PASS")


def main() -> None:
    check_source_tokens()
    profile = check_profile()
    check_manifest(profile)
    check_map()
    check_proof_images()
    check_visual_verdict()
    check_secret_boundaries()
    print("SUMO_READY_OPERATOR_STAGE6_PASS")


if __name__ == "__main__":
    main()
