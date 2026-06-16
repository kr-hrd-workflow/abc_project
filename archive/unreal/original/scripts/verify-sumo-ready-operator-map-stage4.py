#!/usr/bin/env python3
"""Verify Stage 4 SUMO-ready operator-map motion-binding artifacts.

This is a semantic artifact check, not a live SUMO/TraCI proof. It verifies
the deterministic fixture path, controller binding state, proof images, and
honest source metadata. Live SUMO remains open until a real local
sumo_traci run passes.
"""
from __future__ import annotations

from pathlib import Path
import json
import sys

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[1]
UE = ROOT / "renderer" / "unreal" / "SmartIntersection"
PACKAGE_JSON = ROOT / "package.json"
FIXTURE = ROOT / "apps" / "api" / "app" / "fixtures" / "stage4_renderer_snapshots.json"
BINDING_PROFILE = UE / "SceneProfiles" / "operator_stage4_motion_bindings.json"
MANIFEST = UE / "GeneratedProof" / "smart_intersection_rebuild_operator_stage4_motion_manifest.json"
CONTROLLER_H = UE / "Source" / "SmartIntersectionRuntime" / "Public" / "TrafficSimulationController.h"
CONTROLLER_CPP = UE / "Source" / "SmartIntersectionRuntime" / "Private" / "TrafficSimulationController.cpp"
ROUTES = ROOT / "apps" / "api" / "app" / "api" / "routes.py"
SNAPSHOT_SERVICE = ROOT / "apps" / "api" / "app" / "services" / "renderer_snapshot.py"
API_TESTS = ROOT / "apps" / "api" / "tests" / "test_api_flow.py"
CAPTURE_PY = UE / "Content" / "Python" / "capture_operator_map_stage4.py"
CAPTURE_PS1 = ROOT / "scripts" / "capture-unreal-operator-map-stage4.ps1"
RUNTIME_SMOKE = UE / "Content" / "Python" / "smoke_runtime_snapshot_controller.py"
HTTP_SMOKE = UE / "Content" / "Python" / "smoke_http_snapshot_controller.py"
HTTP_SERVER = ROOT / "scripts" / "smoke_http_snapshot_server.py"

STAGE1_MAP = UE / "Content" / "Maps" / "Generated" / "smart_intersection_rebuild.umap"
STAGE2_MAP = UE / "Content" / "Maps" / "Generated" / "smart_intersection_rebuild_stage2.umap"
STAGE3_MAP = UE / "Content" / "Maps" / "Generated" / "smart_intersection_rebuild_stage3.umap"
PROOF_A = ROOT / "artifacts" / "unreal-operator-map-stage4-snapshot-a.png"
PROOF_B = ROOT / "artifacts" / "unreal-operator-map-stage4-snapshot-b.png"
CONTACT_SHEET = ROOT / "artifacts" / "unreal-operator-map-stage4-motion-contact-sheet.png"

MIN_PROOF_BYTES = 450_000
MIN_CONTACT_BYTES = 800_000
MIN_DIFF_MEAN = 5.0

PRESERVED_KEYS = {
    "snapshot_type",
    "source",
    "simulation_source",
    "cityProfileId",
    "city_profile",
    "activeSignalGroup",
    "signal_phase",
    "cycleSecond",
    "cycle_second",
    "queues",
    "pedestrianRequest",
    "pedestrian_request",
    "emergency_vehicle_approach",
    "emergency_priority",
    "emergencyVehicleDirection",
    "emergency_direction",
    "pixelStreamConnected",
    "pixel_stream_connected",
    "pixelStreamStatus",
    "pixel_stream_status",
    "pixelStreamSignallingUrl",
    "pixel_stream_signalling_url",
    "safety_boundary",
}

STAGE_MAP_TOKEN_CHECKS = [
    (STAGE1_MAP, [b"OperatorStage1", b"SUMOReadyLargeIntersection", b"TrafficReadableQueueZone"]),
    (STAGE2_MAP, [b"OperatorStage2", b"Stage2ContextGeometry", b"NoTrafficZoneBackplate"]),
    (STAGE3_MAP, [b"OperatorStage3", b"Stage3VehicleKit", b"Stage3SignalKit", b"SUMOReadyAssetPivot"]),
]

FORBIDDEN_STAGE4_TOKENS = [
    b"photo_backplate",
    b"road_card",
    b"ImageGen",
    b"asset_lineup",
    b"proof_plinth",
    b"foreground proof",
    b"foreground plinth",
]


def fail(message: str) -> None:
    print(f"SUMO_READY_OPERATOR_STAGE4_FAIL: {message}")
    sys.exit(1)


def load_json(path: Path, label: str) -> dict:
    if not path.exists():
        fail(f"missing {label}: {path.relative_to(ROOT)}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"{label} is not valid JSON: {path.relative_to(ROOT)} error={exc}")
    if not isinstance(value, dict):
        fail(f"{label} root is not an object: {path.relative_to(ROOT)}")
    return value


def check_fixture() -> dict[str, dict]:
    fixture = load_json(FIXTURE, "Stage 4 fixture snapshots")
    if fixture.get("schema") != "operator-stage4-renderer-snapshots-v1":
        fail(f"fixture schema mismatch: {fixture.get('schema')!r}")
    if fixture.get("motion_binding_version") != "operator-stage4-motion-v1":
        fail("fixture motion_binding_version mismatch")
    snapshots = fixture.get("snapshots")
    if not isinstance(snapshots, dict):
        fail("fixture snapshots missing")
    snapshot_a = snapshots.get("stage4-fixture-a")
    snapshot_b = snapshots.get("stage4-fixture-b")
    if not isinstance(snapshot_a, dict) or not isinstance(snapshot_b, dict):
        fail("fixture snapshots A/B missing")
    for snapshot in (snapshot_a, snapshot_b):
        missing = sorted(PRESERVED_KEYS.difference(snapshot))
        if missing:
            fail(f"snapshot {snapshot.get('snapshot_id')} missing aggregate keys: {missing}")
        if snapshot.get("simulation_source") != "sumo_traci_fixture":
            fail(f"fixture snapshot mislabeled as live SUMO: {snapshot.get('simulation_source')!r}")
        if snapshot.get("motion_binding_version") != "operator-stage4-motion-v1":
            fail(f"snapshot motion version mismatch: {snapshot.get('snapshot_id')}")
        if not snapshot.get("vehicles"):
            fail(f"snapshot vehicles missing: {snapshot.get('snapshot_id')}")
        if not snapshot.get("signals"):
            fail(f"snapshot signals missing: {snapshot.get('snapshot_id')}")
    if snapshot_a["activeSignalGroup"] == snapshot_b["activeSignalGroup"]:
        fail("snapshot A/B activeSignalGroup did not change")
    if snapshot_a["cycleSecond"] == snapshot_b["cycleSecond"]:
        fail("snapshot A/B cycleSecond did not change")
    if snapshot_a["queues"] == snapshot_b["queues"]:
        fail("snapshot A/B queues did not change")
    vehicle_a = snapshot_a["vehicles"][0]
    vehicle_b = snapshot_b["vehicles"][0]
    if (
        vehicle_a.get("x_cm"),
        vehicle_a.get("y_cm"),
        vehicle_a.get("heading_deg"),
    ) == (
        vehicle_b.get("x_cm"),
        vehicle_b.get("y_cm"),
        vehicle_b.get("heading_deg"),
    ):
        fail("snapshot A/B first vehicle position and heading did not change")
    print("STAGE4_FIXTURE_CONTRACT_CHECK_PASS snapshots=stage4-fixture-a,stage4-fixture-b")
    return {"stage4-fixture-a": snapshot_a, "stage4-fixture-b": snapshot_b}


def check_binding_profile(snapshots: dict[str, dict]) -> None:
    profile = load_json(BINDING_PROFILE, "Stage 4 motion binding profile")
    expected = {
        "schema": "operator-stage4-motion-bindings-v1",
        "base_stage": "OperatorStage3",
        "motion_binding_version": "operator-stage4-motion-v1",
        "simulation_source": "sumo_traci_fixture",
    }
    for key, value in expected.items():
        if profile.get(key) != value:
            fail(f"binding profile {key} mismatch: expected={value!r} actual={profile.get(key)!r}")
    if profile.get("live_sumo_status") != "deferred_until_real_sumo_traci_run_passes":
        fail("binding profile live_sumo_status overclaims live SUMO")
    for snapshot_id in snapshots:
        if snapshot_id not in profile.get("snapshot_ids", []):
            fail(f"binding profile missing snapshot id: {snapshot_id}")
    vehicle_labels = set(profile.get("vehicle_actor_labels", []))
    for snapshot in snapshots.values():
        for vehicle in snapshot["vehicles"]:
            if vehicle["actor_label"] not in vehicle_labels:
                fail(f"vehicle label missing from binding profile: {vehicle['actor_label']}")
    print("STAGE4_BINDING_PROFILE_CHECK_PASS")


def check_source_tokens() -> None:
    source_expectations = {
        PACKAGE_JSON: ["unreal:capture:operator-stage4", "verify:operator-map-stage4"],
        ROUTES: ["stage4_fixture_id", "build_stage4_unreal_renderer_snapshot"],
        SNAPSHOT_SERVICE: ["STAGE4_FIXTURE_PATH", "build_stage4_unreal_renderer_snapshot"],
        API_TESTS: ["test_stage4_renderer_snapshot_fixture_snapshots_expose_motion_binding_contract"],
        CONTROLLER_H: [
            "FTrafficVehicleBindingState",
            "FTrafficSignalBindingState",
            "LastVehicleBindings",
            "LastSignalBindings",
            "Stage4MotionBindingVersion",
        ],
        CONTROLLER_CPP: ["vehicles", "signals", "UpdateStage4BindingVisualState"],
        CAPTURE_PY: ["apply_simulation_snapshot_json", "stage4-fixture-a", "stage4-fixture-b"],
        CAPTURE_PS1: ["OPERATOR_STAGE4_CONTACT_SHEET"],
        RUNTIME_SMOKE: ["stage4_motion_binding_version", "stage4_vehicle_binding_count"],
        HTTP_SMOKE: ["stage4_motion_binding_version", "stage4_vehicle_binding_count"],
        HTTP_SERVER: ["stage4-fixture-a", "sumo_traci_fixture"],
    }
    for path, tokens in source_expectations.items():
        if not path.exists():
            fail(f"missing source file: {path.relative_to(ROOT)}")
        text = path.read_text(encoding="utf-8")
        for token in tokens:
            if token not in text:
                fail(f"{path.relative_to(ROOT)} missing Stage 4 token: {token}")
    print("STAGE4_SOURCE_TOKEN_CHECK_PASS")


def check_stage_carryover_tokens() -> None:
    for path, tokens in STAGE_MAP_TOKEN_CHECKS:
        if not path.exists():
            fail(f"missing carryover map: {path.relative_to(ROOT)}")
        data = path.read_bytes()
        for token in tokens:
            if token not in data:
                fail(f"{path.relative_to(ROOT)} missing carryover token: {token!r}")
        if path == STAGE3_MAP:
            for token in FORBIDDEN_STAGE4_TOKENS:
                if token in data:
                    fail(f"Stage 3/4 map contains forbidden token: {token!r}")
    print("STAGE1_2_3_CARRYOVER_TOKEN_CHECK_PASS")


def check_manifest(snapshots: dict[str, dict]) -> dict:
    manifest = load_json(MANIFEST, "Stage 4 motion manifest")
    expected = {
        "schema": "operator-stage4-motion-proof-v1",
        "mode": "OperatorStage4",
        "base_stage": "OperatorStage3",
        "simulation_source": "sumo_traci_fixture",
        "controller": "ATrafficSimulationController",
        "motion_binding_version": "operator-stage4-motion-v1",
    }
    for key, value in expected.items():
        if manifest.get(key) != value:
            fail(f"manifest {key} mismatch: expected={value!r} actual={manifest.get(key)!r}")
    if manifest.get("live_sumo_status") != "deferred_until_real_sumo_traci_run_passes":
        fail("manifest overclaims live SUMO")
    manifest_snapshots = manifest.get("snapshots", [])
    if [item.get("snapshot_id") for item in manifest_snapshots] != list(snapshots):
        fail(f"manifest snapshot ids mismatch: {manifest_snapshots!r}")
    first, second = manifest_snapshots
    if first.get("activeSignalGroup") == second.get("activeSignalGroup"):
        fail("manifest A/B phase did not change")
    if first.get("queues") == second.get("queues"):
        fail("manifest A/B queues did not change")
    required_tokens = [
        "OperatorStage1",
        "SUMOReadyLargeIntersection",
        "TrafficReadableQueueZone",
        "OperatorStage2",
        "NoTrafficZoneBackplate",
        "OperatorStage3",
        "Stage3VehicleKit",
        "Stage3SignalKit",
        "SUMOReadyAssetPivot",
    ]
    for token in required_tokens:
        if token not in manifest.get("preserved_stage_tokens", []):
            fail(f"manifest missing preserved stage token: {token}")
    print(f"STAGE4_MANIFEST_CHECK_PASS manifest={MANIFEST.relative_to(ROOT)}")
    return manifest


def check_image(
    path: Path,
    label: str,
    min_bytes: int,
    min_mean: float,
    max_mean: float,
    min_stddev: float,
) -> Image.Image:
    if not path.exists():
        fail(f"missing {label}: {path.relative_to(ROOT)}")
    if path.stat().st_size < min_bytes:
        fail(f"{label} too small: {path.relative_to(ROOT)} bytes={path.stat().st_size}")
    try:
        raw = Image.open(path)
    except Exception as exc:
        fail(f"{label} is not readable: {path.relative_to(ROOT)} error={exc}")
    if "A" in raw.getbands():
        fail(f"{label} has alpha channel that can render black: {path.relative_to(ROOT)} mode={raw.mode}")
    image = raw.convert("RGB")
    if image.width < 1024 or image.height < 768:
        fail(f"{label} dimensions too small: {image.size}")
    stat = ImageStat.Stat(image)
    mean = sum(stat.mean) / 3.0
    stddev = sum(stat.stddev) / 3.0
    if mean < min_mean or mean > max_mean:
        fail(f"{label} brightness out of range: mean={mean:.2f}")
    if stddev < min_stddev:
        fail(f"{label} lacks readable geometry variation: stddev={stddev:.2f}")
    print(f"{label.upper()}_CHECK_PASS size={image.size} bytes={path.stat().st_size} mean={mean:.2f} stddev={stddev:.2f}")
    return image


def check_proof_images(manifest: dict) -> None:
    proof_paths = [ROOT / path for path in manifest.get("proof_images", [])]
    if proof_paths != [PROOF_A, PROOF_B]:
        fail(f"manifest proof_images mismatch: {manifest.get('proof_images')!r}")
    image_a = check_image(PROOF_A, "operator stage4 proof a", MIN_PROOF_BYTES, 60.0, 190.0, 25.0)
    image_b = check_image(PROOF_B, "operator stage4 proof b", MIN_PROOF_BYTES, 60.0, 190.0, 25.0)
    diff = ImageChops.difference(image_a, image_b)
    stat = ImageStat.Stat(diff)
    diff_mean = sum(stat.mean) / 3.0
    if diff_mean < MIN_DIFF_MEAN:
        fail(f"Stage 4 proof A/B images too similar: diff_mean={diff_mean:.2f}")
    if diff.getbbox() is None:
        fail("Stage 4 proof A/B images have no pixel difference")
    check_image(CONTACT_SHEET, "operator stage4 contact sheet", MIN_CONTACT_BYTES, 60.0, 190.0, 25.0)
    print(f"STAGE4_PROOF_DIFF_CHECK_PASS diff_mean={diff_mean:.2f}")


def main() -> None:
    snapshots = check_fixture()
    check_binding_profile(snapshots)
    check_source_tokens()
    check_stage_carryover_tokens()
    manifest = check_manifest(snapshots)
    check_proof_images(manifest)
    print("SUMO_READY_OPERATOR_STAGE4_PASS")


if __name__ == "__main__":
    main()
