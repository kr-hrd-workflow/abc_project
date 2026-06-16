#!/usr/bin/env python3
"""Verify Stage 7 production-photoreal Seoul operator-map proof artifacts.

This verifies visual-production evidence only. It does not claim live SUMO
unless runtime metadata explicitly proves simulation_source=sumo_traci.
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
CAPTURE_PY = UE / "Content" / "Python" / "capture_operator_map_stage7.py"
CAPTURE_PS1 = ROOT / "scripts" / "capture-unreal-operator-map-stage7.ps1"
PROFILE = UE / "SceneProfiles" / "operator_stage7_production_photoreal_profile.json"
MANIFEST = UE / "GeneratedProof" / "smart_intersection_rebuild_operator_stage7_production_photoreal_manifest.json"
MAP = UE / "Content" / "Maps" / "Generated" / "smart_intersection_rebuild_operator_stage7.umap"
BEFORE = ROOT / "artifacts" / "unreal-operator-map-stage7-before.png"
AFTER = ROOT / "artifacts" / "unreal-operator-map-stage7-production-photoreal-proof.png"
CONTACT = ROOT / "artifacts" / "unreal-operator-map-stage7-before-after-contact-sheet.png"
IMAGEGEN_CONTACT = ROOT / "artifacts" / "imagegen" / "stage7" / "operator_stage7_contact_sheet.png"
VISUAL_VERDICT = ROOT / "artifacts" / "unreal-operator-map-stage7-visual-verdict.json"
DEFAULT_ENGINE = UE / "Config" / "DefaultEngine.ini"

SCHEMA = "operator-stage7-production-photoreal-seoul-profile-v1"
MIN_MAP_BYTES = 1_000_000
MIN_PROOF_BYTES = 360_000
MIN_SOURCE_IMAGE_BYTES = 500_000

REQUIRED_STAGE7_TOKENS = [
    "OperatorStage7",
    "SUMOReadyOperatorMapProductionPhotoreal",
    "Stage7ProductionRoadUV",
    "Stage7RoadWearDecal",
    "Stage7CurbSidewalkUV",
    "Stage7SignalHardware",
    "Stage7VehicleDetail",
    "Stage7VehicleMeshReplacement",
    "Stage7StreetHardware",
    "Stage7LightingCameraPostProcess",
    "Stage7CameraBackgroundClosure",
    "Stage7IntegratedAsphaltBlend",
    "Stage7VehicleLocalYawDetail",
    "Stage7CurbOcclusionGrime",
    "Stage7BoundaryOcclusion",
    "Stage7LegacyLightingDisabled",
    "Stage7CameraVisibleProductionDetail",
    "Stage7ForegroundSurfaceBreakup",
    "Stage7ImageGenSurfaceGeometry",
    "Stage7SidewalkCoverageGeometry",
    "Stage1To6ReadableRuntimeState",
    "NoTrafficZoneImageCard",
]

REQUIRED_PROCEDURAL_MESHES = [
    (
        "stage7_seoul_passenger_sedan",
        UE / "SourceAssets" / "PhotorealRoadKit" / "Meshes" / "stage7_seoul_passenger_sedan.obj",
    ),
    (
        "stage7_seoul_bus",
        UE / "SourceAssets" / "PhotorealRoadKit" / "Meshes" / "stage7_seoul_bus.obj",
    ),
    (
        "stage7_seoul_taxi",
        UE / "SourceAssets" / "PhotorealRoadKit" / "Meshes" / "stage7_seoul_taxi.obj",
    ),
    (
        "stage7_seoul_emergency_van",
        UE / "SourceAssets" / "PhotorealRoadKit" / "Meshes" / "stage7_seoul_emergency_van.obj",
    ),
    (
        "stage7_seoul_asphalt_imagegen_heightfield",
        UE / "SourceAssets" / "PhotorealRoadKit" / "Meshes" / "stage7_seoul_asphalt_imagegen_heightfield.obj",
    ),
    (
        "stage7_seoul_sidewalk_imagegen_heightfield",
        UE / "SourceAssets" / "PhotorealRoadKit" / "Meshes" / "stage7_seoul_sidewalk_imagegen_heightfield.obj",
    ),
]

REQUIRED_SOURCE_TEXTURES = [
    (
        "traffic_camera_target",
        "stage7_seoul_traffic_camera_target",
        ROOT / "artifacts" / "imagegen" / "stage7" / "operator_stage7_traffic_camera_target.png",
        UE / "SourceAssets" / "PhotorealRoadKit" / "Textures" / "T_stage7_seoul_traffic_camera_target.png",
    ),
    (
        "asphalt_marking_source",
        "stage7_seoul_asphalt_marking_source",
        ROOT / "artifacts" / "imagegen" / "stage7" / "operator_stage7_asphalt_marking_source.png",
        UE / "SourceAssets" / "PhotorealRoadKit" / "Textures" / "T_stage7_seoul_asphalt_marking_source.png",
    ),
    (
        "curb_sidewalk_source",
        "stage7_seoul_curb_sidewalk_source",
        ROOT / "artifacts" / "imagegen" / "stage7" / "operator_stage7_curb_sidewalk_source.png",
        UE / "SourceAssets" / "PhotorealRoadKit" / "Textures" / "T_stage7_seoul_curb_sidewalk_source.png",
    ),
    (
        "signal_vehicle_source",
        "stage7_seoul_signal_vehicle_source",
        ROOT / "artifacts" / "imagegen" / "stage7" / "operator_stage7_signal_vehicle_source.png",
        UE / "SourceAssets" / "PhotorealRoadKit" / "Textures" / "T_stage7_seoul_signal_vehicle_source.png",
    ),
]

REQUIRED_SOURCE_MATERIALS = [
    "stage7_seoul_asphalt_marking_source",
    "stage7_seoul_curb_sidewalk_source",
    "stage7_seoul_signal_vehicle_source",
]

REQUIRED_APPLIED_MATERIALS = [
    *REQUIRED_SOURCE_MATERIALS,
    "stage7_textured_asphalt_base",
]

REQUIRED_GENERATOR_TOKENS = [
    "SMART_INTERSECTION_OPERATOR_STAGE7",
    "OperatorStage7",
    "SUMOReadyOperatorMapProductionPhotoreal",
    "Stage7ProductionRoadUV",
    "Stage7RoadWearDecal",
    "Stage7CurbSidewalkUV",
    "Stage7SignalHardware",
    "Stage7VehicleDetail",
    "Stage7VehicleMeshReplacement",
    "Stage7StreetHardware",
    "Stage7LightingCameraPostProcess",
    "Stage7CameraBackgroundClosure",
    "Stage7IntegratedAsphaltBlend",
    "Stage7VehicleLocalYawDetail",
    "Stage7CurbOcclusionGrime",
    "Stage7BoundaryOcclusion",
    "Stage7LegacyLightingDisabled",
    "Stage7CameraVisibleProductionDetail",
    "Stage7ForegroundSurfaceBreakup",
    "Stage7ImageGenSurfaceGeometry",
    "Stage7SidewalkCoverageGeometry",
    "stage7_textured_asphalt_base",
    "generate-stage7-surface-meshes.py",
    "_build_operator_stage7_scene",
]

REQUIRED_MANIFEST_ACTOR_EVIDENCE = [
    *REQUIRED_STAGE7_TOKENS,
    "OperatorStage6",
    "SUMOReadyOperatorMapPhotoreal",
    "Stage6PhotorealSurface",
    "Stage6GeneratedTextureApplied",
    "Stage6DecalAtlasApplied",
    "Stage4ReadableRuntimeState",
    "NoImageCardTrafficZone",
    "OperatorStage1",
    "TrafficReadableQueueZone",
    "OperatorStage2",
    "NoTrafficZoneBackplate",
    "OperatorStage3",
    "Stage3VehicleKit",
    "Stage3SignalKit",
    "SUMOReadyAssetPivot",
]

REQUIRED_MAP_TOKENS = [
    b"OperatorStage7",
    b"SUMOReadyOperatorMapProductionPhotoreal",
    b"Stage7ProductionRoadUV",
    b"Stage7RoadWearDecal",
    b"Stage7CurbSidewalkUV",
    b"Stage7SignalHardware",
    b"Stage7VehicleDetail",
    b"Stage7VehicleMeshReplacement",
    b"Stage7StreetHardware",
    b"Stage7LightingCameraPostProcess",
    b"Stage7CameraBackgroundClosure",
    b"Stage7IntegratedAsphaltBlend",
    b"Stage7VehicleLocalYawDetail",
    b"Stage7CurbOcclusionGrime",
    b"Stage7BoundaryOcclusion",
    b"Stage7LegacyLightingDisabled",
    b"Stage7CameraVisibleProductionDetail",
    b"Stage7ForegroundSurfaceBreakup",
    b"Stage7ImageGenSurfaceGeometry",
    b"Stage7SidewalkCoverageGeometry",
    b"Stage1To6ReadableRuntimeState",
    b"NoTrafficZoneImageCard",
    b"stage7_seoul_asphalt_marking_source",
    b"stage7_seoul_curb_sidewalk_source",
    b"stage7_seoul_signal_vehicle_source",
    b"stage7_textured_asphalt_base",
    b"OperatorStage7_Stage7ProductionRoadUV_asphalt_patch_main",
    b"OperatorStage7_Stage7RoadWearDecal_worn_stop_bar_north",
    b"OperatorStage7_Stage7CurbSidewalkUV_corner_ne",
    b"OperatorStage7_Stage7SignalHardware_signal_head_depth_0",
    b"OperatorStage7_Stage7VehicleDetail_bus_body_0",
    b"OperatorStage7_Stage7VehicleMeshReplacement_passenger_car_",
    b"OperatorStage7_Stage7VehicleLocalYawDetail_",
    b"OperatorStage7_Stage7CurbOcclusionGrime_",
    b"OperatorStage7_Stage7BoundaryOcclusion_",
    b"OperatorStage7_Stage7ForegroundSurfaceBreakup_camera_near_gutter_darkening_0",
    b"OperatorStage7_Stage7CameraVisibleProductionDetail_signal_lens_stack_0",
    b"stage7_seoul_passenger_sedan",
    b"stage7_seoul_bus",
    b"stage7_seoul_taxi",
    b"stage7_seoul_emergency_van",
    b"stage7_seoul_asphalt_imagegen_heightfield",
    b"stage7_seoul_sidewalk_imagegen_heightfield",
    b"OperatorStage7_Stage7ImageGenSurfaceGeometry_asphalt_heightfield_east_west",
    b"OperatorStage7_Stage7ImageGenSurfaceGeometry_sidewalk_heightfield_south_foreground",
    b"OperatorStage7_Stage7SidewalkCoverageGeometry_southwest_corner_panel",
    b"OperatorStage7_Stage7StreetHardware_cctv_camera_0",
    b"OperatorStage6",
    b"SUMOReadyOperatorMapPhotoreal",
    b"Stage6PhotorealSurface",
    b"Stage6GeneratedTextureApplied",
    b"Stage6DecalAtlasApplied",
    b"Stage4ReadableRuntimeState",
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
    b"Stage8MultiCityExpansion",
]

VISUAL_REQUIREMENTS = [
    "asphalt_surface",
    "lane_markings",
    "curbs_sidewalks",
    "signals",
    "vehicles",
    "street_hardware",
    "lighting_reflections",
    "camera_operator_view",
    "stage_1_6_readability_preserved",
]


def fail(message: str) -> None:
    print(f"SUMO_READY_OPERATOR_STAGE7_FAIL: {message}")
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
    min_mean: float = 10.0,
    max_mean: float = 242.0,
    min_stddev: float = 16.0,
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
        GENERATOR_PS1: ["OperatorStage7", "SMART_INTERSECTION_OPERATOR_STAGE7"],
        PACKAGE_JSON: [
            "unreal:generate:operator-stage7",
            "unreal:capture:operator-stage7",
            "verify:operator-map-stage7",
            "-OperatorStage7",
        ],
        CAPTURE_PY: [
            "smart_intersection_rebuild_operator_stage7",
            "operator-stage7-unreal-before-after-production-photoreal-proof-v1",
            "stage4-fixture-a",
            "simulation_source",
            "configure_stage7_capture_world",
            "OPERATOR_STAGE7_CAPTURE_POSTPROCESS",
        ],
        CAPTURE_PS1: [
            "SMART_INTERSECTION_OPERATOR_STAGE7_BEFORE_OUTPUT",
            "SMART_INTERSECTION_OPERATOR_STAGE7_AFTER_OUTPUT",
            "OPERATOR_STAGE7_CONTACT_SHEET",
        ],
    }
    for path, tokens in source_expectations.items():
        require_tokens(path, tokens, rel(path))
    capture_source = CAPTURE_PY.read_text(encoding="utf-8")
    if "base.configure_capture_world(label)" in capture_source:
        fail("Stage 7 capture must not reuse Stage 6 hard-shadow capture lighting")
    print("STAGE7_SOURCE_TOKEN_CHECK_PASS")


def check_profile() -> dict:
    profile = load_json(PROFILE, "Stage 7 profile")
    if profile.get("schema") != SCHEMA:
        fail(f"profile schema mismatch: {profile.get('schema')!r}")
    if profile.get("city") != "seoul":
        fail(f"profile city mismatch: {profile.get('city')!r}")
    boundary = profile.get("simulation_boundary", {})
    if boundary.get("visual_only") is not True or boundary.get("traffic_control_authority") is not False:
        fail("profile must keep Stage 7 visual-only with no traffic-control authority")
    sources = profile.get("imagegen_sources", [])
    source_ids = {source.get("id") for source in sources if isinstance(source, dict)}
    for source_id, _, artifact, texture in REQUIRED_SOURCE_TEXTURES:
        if source_id not in source_ids:
            fail(f"profile imagegen_sources missing source id: {source_id}")
        check_image(artifact, f"imagegen_{source_id}", MIN_SOURCE_IMAGE_BYTES, min_width=1000, min_height=900)
        check_image(texture, f"source_texture_{source_id}", MIN_SOURCE_IMAGE_BYTES, min_width=1000, min_height=900)
    for source in sources:
        if not isinstance(source, dict):
            fail("profile imagegen_sources entries must be objects")
        missing = [
            field
            for field in ("prompt", "original_imagegen_path", "artifact_path", "source_texture_path", "license", "consumer")
            if not source.get(field)
        ]
        if missing:
            fail(f"profile imagegen source missing fields: {source.get('id')} fields={missing}")
    check_image(IMAGEGEN_CONTACT, "imagegen_contact_sheet", MIN_SOURCE_IMAGE_BYTES, min_width=1200, min_height=700)
    source_materials = {item.get("material") for item in profile.get("source_textures", []) if isinstance(item, dict)}
    for material in REQUIRED_SOURCE_MATERIALS:
        if material not in source_materials:
            fail(f"profile source_textures missing material: {material}")
        items = [item for item in profile.get("source_textures", []) if item.get("material") == material]
        if not items or not items[0].get("consuming_actors"):
            fail(f"profile source texture lacks consuming actors: {material}")
    mesh_sources = profile.get("procedural_mesh_sources", [])
    if not isinstance(mesh_sources, list):
        fail("profile procedural_mesh_sources must be a list")
    mesh_by_asset = {item.get("asset") for item in mesh_sources if isinstance(item, dict)}
    for asset, source_path in REQUIRED_PROCEDURAL_MESHES:
        if asset not in mesh_by_asset:
            fail(f"profile procedural_mesh_sources missing asset: {asset}")
        if not source_path.exists() or source_path.stat().st_size < 1200:
            fail(f"procedural mesh source missing or too small: {rel(source_path)}")
        items = [item for item in mesh_sources if isinstance(item, dict) and item.get("asset") == asset]
        missing = [
            field
            for field in ("prompt", "source_path", "license", "consumer")
            if not items or not items[0].get(field)
        ]
        if missing:
            fail(f"profile procedural mesh source missing fields: {asset} fields={missing}")
    policy = profile.get("renderer_policy", "")
    for token in ("SUMO/TraCI", "FastAPI", "Unreal", "Pixel Streaming"):
        if token not in policy:
            fail(f"profile renderer policy missing token: {token}")
    print("STAGE7_PROFILE_CHECK_PASS")
    return profile


def check_manifest(profile: dict) -> dict:
    manifest = load_json(MANIFEST, "Stage 7 manifest")
    expected = {
        "schema": "operator-stage7-production-photoreal-proof-v1",
        "mode": "OperatorStage7",
        "city": "seoul",
        "unreal_map": "/Game/Maps/Generated/smart_intersection_rebuild_operator_stage7",
        "base_stage": "OperatorStage6",
        "profile_schema": SCHEMA,
        "capture_schema": "operator-stage7-unreal-before-after-production-photoreal-proof-v1",
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
    profile_source_ids = {item.get("id") for item in profile.get("imagegen_sources", []) if isinstance(item, dict)}
    manifest_source_ids = {item.get("id") for item in manifest.get("imagegen_sources", []) if isinstance(item, dict)}
    if profile_source_ids - manifest_source_ids:
        fail(f"manifest imagegen_sources missing profile ids: {sorted(profile_source_ids - manifest_source_ids)}")
    manifest_materials = set(manifest.get("applied_materials", []))
    for material in REQUIRED_APPLIED_MATERIALS:
        if material not in manifest_materials:
            fail(f"manifest applied_materials missing Stage 7 material: {material}")
    for token in REQUIRED_MANIFEST_ACTOR_EVIDENCE:
        if token not in manifest.get("actor_evidence", []):
            fail(f"manifest actor_evidence missing token: {token}")
    consumers = manifest.get("production_asset_consumers", {})
    for material in REQUIRED_SOURCE_MATERIALS:
        if not consumers.get(material):
            fail(f"manifest production_asset_consumers missing actors for: {material}")
    manifest_mesh_sources = manifest.get("procedural_mesh_sources", [])
    if not isinstance(manifest_mesh_sources, list):
        fail("manifest procedural_mesh_sources must be a list")
    manifest_mesh_assets = {item.get("asset") for item in manifest_mesh_sources if isinstance(item, dict)}
    for asset, _ in REQUIRED_PROCEDURAL_MESHES:
        if asset not in manifest_mesh_assets:
            fail(f"manifest procedural_mesh_sources missing asset: {asset}")
    print("STAGE7_MANIFEST_CHECK_PASS")
    return manifest


def check_map() -> None:
    if not MAP.exists():
        fail(f"missing generated Stage 7 map: {rel(MAP)}")
    data = MAP.read_bytes()
    if len(data) < MIN_MAP_BYTES:
        fail(f"generated Stage 7 map too small: {rel(MAP)} bytes={len(data)}")
    for token in REQUIRED_MAP_TOKENS:
        if token not in data:
            fail(f"generated Stage 7 map missing token: {token.decode('utf-8', errors='replace')}")
    for token in FORBIDDEN_MAP_TOKENS:
        if token in data:
            fail(f"generated Stage 7 map contains forbidden token: {token.decode('utf-8', errors='replace')}")
    print(f"STAGE7_MAP_CHECK_PASS map={rel(MAP)} bytes={len(data)}")


def check_proof_images() -> None:
    check_image(BEFORE, "stage7_before_stage6_unreal_proof", MIN_PROOF_BYTES, require_opaque=True, min_stddev=18.0)
    check_image(AFTER, "stage7_after_unreal_production_photoreal_proof", MIN_PROOF_BYTES, require_opaque=True, min_mean=62.0, min_stddev=18.0)
    check_image(CONTACT, "stage7_before_after_contact_sheet", MIN_PROOF_BYTES, min_width=3000, min_height=850, require_opaque=True, min_stddev=18.0)
    print("STAGE7_UNREAL_PROOF_IMAGE_CHECK_PASS")


def check_visual_verdict() -> None:
    verdict = load_json(VISUAL_VERDICT, "Stage 7 visual verdict")
    if verdict.get("schema") != "operator-stage7-production-photoreal-visual-verdict-v1":
        fail(f"visual verdict schema mismatch: {verdict.get('schema')!r}")
    if verdict.get("proof_image") != rel(AFTER):
        fail(f"visual verdict proof_image mismatch: {verdict.get('proof_image')!r}")
    if verdict.get("contact_sheet") != rel(CONTACT):
        fail(f"visual verdict contact_sheet mismatch: {verdict.get('contact_sheet')!r}")
    reviewer = verdict.get("reviewer_subagent", {})
    if not isinstance(reviewer, dict) or reviewer.get("verdict") not in {"APPROVED", "APPROVED_WITH_CONCERNS"}:
        fail(f"visual verdict reviewer_subagent not approved: {reviewer!r}")
    if reviewer.get("photo_realistic_enough") is not True:
        fail("reviewer_subagent must approve the Unreal proof as photo-realistic enough")
    inspection = verdict.get("human_inspection", {})
    if inspection.get("photo_realistic_enough") is not True:
        fail("human_inspection.photo_realistic_enough must be true")
    checks = verdict.get("checks", {})
    for key in VISUAL_REQUIREMENTS:
        if checks.get(key) not in {True, "pass"}:
            fail(f"visual verdict check not approved: {key}")
    if "after" not in str(verdict.get("freshness", "")).lower():
        fail("visual verdict must state it was performed after the Stage 7 Unreal capture")
    print("STAGE7_VISUAL_VERDICT_CHECK_PASS")


def check_secret_boundaries() -> None:
    if DEFAULT_ENGINE.exists() and "SecurityToken=" in DEFAULT_ENGINE.read_text(encoding="utf-8", errors="ignore"):
        fail(f"Unreal config contains generated SecurityToken: {rel(DEFAULT_ENGINE)}")
    result = subprocess.run(
        ["git", "ls-files", "--", ".env.local", "apps/web/.env.local", "tmp/PixelStreamingInfrastructure"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.stdout.strip():
        fail(f"forbidden tracked local/secrets path: {result.stdout.strip()}")
    print("STAGE7_SECRET_BOUNDARY_CHECK_PASS")


def main() -> None:
    check_source_tokens()
    profile = check_profile()
    check_manifest(profile)
    check_map()
    check_proof_images()
    check_visual_verdict()
    check_secret_boundaries()
    print("SUMO_READY_OPERATOR_STAGE7_PASS")


if __name__ == "__main__":
    main()
