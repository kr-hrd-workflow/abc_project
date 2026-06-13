#!/usr/bin/env python3
"""Verify complete SmartIntersection simulation-renderer artifacts."""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageStat
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
UNREAL = ROOT / "renderer" / "unreal" / "SmartIntersection"
LANDING = ROOT / "apps" / "web" / "public" / "landing"
API = ROOT / "apps" / "api"

REQUIRED_SOURCE = [
    UNREAL / "Source" / "SmartIntersectionRuntime" / "SmartIntersectionRuntime.Build.cs",
    UNREAL / "Source" / "SmartIntersectionRuntime" / "Public" / "TrafficSimulationController.h",
    UNREAL / "Source" / "SmartIntersectionRuntime" / "Private" / "TrafficSimulationController.cpp",
    UNREAL / "Source" / "SmartIntersection.Target.cs",
    UNREAL / "Source" / "SmartIntersectionEditor.Target.cs",
]

LANDING_ASSETS = [
    "street-pressure-cinematic.png",
    "candidate-motion-cinematic.png",
    "human-review-cinematic.png",
    "chapter-sense-cinematic.png",
    "chapter-compare-cinematic.png",
    "chapter-brief-cinematic.png",
    "chapter-dashboard-cinematic.png",
    "proof-operator-room-wide.png",
    "proof-review-evidence-closeup.png",
    "proof-city-ops-monitor.png",
]

CITIES = ["seoul", "new_york", "paris", "london"]

SNAPSHOT_VISUAL_TOKENS = [
    "DEFAULT_RENDERER_SNAPSHOT_VISUAL",
    "_spawn_renderer_snapshot_visual_layer",
    "RendererSnapshotState_",
    "active_signal_group",
    "east_priority",
    "queue_vehicle_marker",
    "pedestrian_request",
    "emergency_vehicle_direction",
    "pixel_stream_status",
]


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    sys.exit(1)


def check_source() -> None:
    project = json.loads((UNREAL / "SmartIntersection.uproject").read_text())
    if project.get("Category") != "Simulation":
        fail("uproject Category is not Simulation")
    modules = project.get("Modules") or []
    if {"Name": "SmartIntersectionRuntime", "Type": "Runtime", "LoadingPhase": "Default"} not in modules:
        fail("SmartIntersectionRuntime module declaration missing")
    for path in REQUIRED_SOURCE:
        if not path.exists():
            fail(f"missing source file: {path}")
    header = (UNREAL / "Source" / "SmartIntersectionRuntime" / "Public" / "TrafficSimulationController.h").read_text()
    for token in [
        "ATrafficSimulationController",
        "ETrafficSimulationPhase",
        "FTrafficSignalTiming",
        "BeginPlay",
        "EndPlay",
        "ApplySimulationSnapshotJson",
        "PollSimulationSnapshot",
        "HandleSnapshotResponse",
        "FetchSimulationSnapshotOnce",
        "bEnableSnapshotPolling = true",
        "SnapshotEndpointUrl",
        "SnapshotPollingIntervalSeconds",
        "LastSnapshotFetchStatus",
        "ActiveSignalGroup",
        "CycleSecond",
        "DirectionalQueues",
        "bPedestrianRequestActive",
        "bEmergencyVehicleApproaching",
        "EmergencyVehicleDirection",
        "bLastSnapshotParsed",
        "LastSnapshotJson",
        "LastSnapshotReceivedAtUtc",
        "bPixelStreamConnected",
        "PixelStreamStatus",
        "PixelStreamSignallingUrl",
        "EastWestGreenSignalVisual",
        "NorthSouthGreenSignalVisual",
        "PedestrianCrossingVisual",
        "NorthQueueVisualMarker0",
        "EastQueueVisualMarker0",
        "SouthQueueVisualMarker0",
        "WestQueueVisualMarker0",
        "RuntimeVisualSignalState",
        "RuntimeVisualNorthQueueMarkers",
        "RuntimeVisualEastQueueMarkers",
        "RuntimeVisualSouthQueueMarkers",
        "RuntimeVisualWestQueueMarkers",
        "RuntimeVisualEmergencyDirectionState",
        "RuntimeVisualEmergencyBeaconLocation",
        "RuntimeVisualAssetSet",
        "bRuntimeVisualPedestrianCrossingVisible",
        "bRuntimeVisualEmergencyBeaconVisible",
        "bRuntimeVisualPixelStreamReadyVisible",
        "UpdateRuntimeVisualState",
    ]:
        if token not in header:
            fail(f"controller header missing token: {token}")
    implementation = (UNREAL / "Source" / "SmartIntersectionRuntime" / "Private" / "TrafficSimulationController.cpp").read_text()
    for token in [
        "Super::BeginPlay",
        "SetTimer",
        "ClearTimer",
        "FHttpModule::Get",
        "CreateRequest",
        "void ATrafficSimulationController::FetchSimulationSnapshotOnce",
        "city_profile_id=%s",
        "SetURL(RequestUrl)",
        "SetVerb(TEXT(\"GET\"))",
        "HandleSnapshotResponse",
        "FJsonSerializer::Deserialize",
        "FDateTime::UtcNow().ToIso8601",
        "LastSnapshotJson = SnapshotJson",
        "activeSignalGroup",
        "signal_phase",
        "cycleSecond",
        "cycle_second",
        "queues",
        "pedestrian_request",
        "pedestrianRequest",
        "emergency_vehicle_approach",
        "emergency_priority",
        "pixelStreamConnected",
        "pixel_stream_connected",
        "pixelStreamStatus",
        "pixel_stream_status",
        "pixelStreamSignallingUrl",
        "pixel_stream_signalling_url",
        "CreateDefaultSubobject<UStaticMeshComponent>",
        "UpdateRuntimeVisualState();",
        "SetRuntimeQueueMarkerVisibility",
        "PedestrianCrossingVisual",
        "bRuntimeVisualPedestrianCrossingVisible = bPedestrianRequestActive",
        "RuntimeVisualSignalState = TEXT(\"east_west_green\")",
        "RuntimeVisualSignalState = TEXT(\"north_south_green\")",
        "RuntimeVisualEastQueueMarkers",
        "RuntimeVisualNorthQueueMarkers",
        "RuntimeVisualSouthQueueMarkers",
        "RuntimeVisualWestQueueMarkers",
        "EmergencyBeaconLocationForDirection",
        "RuntimeVisualEmergencyDirectionState = EmergencyVehicleDirection",
        "RuntimeVisualEmergencyBeaconLocation = EmergencyBeaconLocationForDirection",
        "SignalHeadRuntimeMesh",
        "/Game/PhotorealRoadKit/Meshes/signal_head_uk_high_fidelity.signal_head_uk_high_fidelity",
        "CctvRuntimeMesh",
        "/Game/PhotorealRoadKit/Meshes/cctv_camera_high_fidelity.cctv_camera_high_fidelity",
        "QueueVehicleRuntimeMaterial",
        "/Game/Materials/RoadOnlyRenderer/M_london_queue_vehicle_body.M_london_queue_vehicle_body",
        "EmergencyVehicleRuntimeMaterial",
        "/Game/Materials/RoadOnlyRenderer/M_london_emergency_vehicle_blue.M_london_emergency_vehicle_blue",
        "RuntimeVisualAssetSet = TEXT(\"photoreal_roadkit_runtime_assets\")",
    ]:
        if token not in implementation:
            fail(f"controller implementation missing token: {token}")

    build_rules = (UNREAL / "Source" / "SmartIntersectionRuntime" / "SmartIntersectionRuntime.Build.cs").read_text()
    if '"HTTP"' not in build_rules:
        fail("runtime Build.cs missing HTTP module dependency")

    generator = (UNREAL / "Content" / "Python" / "generate_road_intersection.py").read_text(encoding="utf-8")
    for token in [
        '"bEnableSnapshotPolling", True',
        '"SnapshotEndpointUrl"',
        '"http://127.0.0.1:8000/api/renderer/unreal/snapshot"',
        '"SnapshotPollingIntervalSeconds", 1.0',
    ]:
        if token not in generator:
            fail(f"road generator missing runtime polling token: {token}")
    print("SOURCE_CHECK_PASS")


def check_landing() -> None:
    for name in LANDING_ASSETS:
        path = LANDING / name
        if not path.exists():
            fail(f"missing landing asset: {name}")
        im = Image.open(path).convert("RGB")
        stddev = sum(ImageStat.Stat(im).stddev) / 3
        if im.size != (1536, 1024):
            fail(f"unexpected landing asset dimensions: {name} {im.size}")
        if path.stat().st_size < 650_000 or stddev < 20:
            fail(f"landing asset looks stub-like: {name} bytes={path.stat().st_size} stddev={stddev:.2f}")
    print("LANDING_CHECK_PASS")


def check_maps() -> None:
    maps = UNREAL / "Content" / "Maps" / "Generated"
    for city in CITIES:
        path = maps / f"{city}_RoadOnly.umap"
        if not path.exists():
            fail(f"missing map: {path}")
        data = path.read_bytes()
        if len(data) < 100_000:
            fail(f"map too small: {path} {len(data)}")
        for token in [b"foreground proof", b"foreground plinth", b"PolyHaven CC0 VISIBLE"]:
            if token in data:
                fail(f"map still contains production proof-strip token {token!r}: {city}")
        if b"TrafficSimulationController" not in data and b"SmartIntersectionRuntime" not in data:
            fail(f"map missing runtime controller evidence: {city}")
        token_fragments = [(b"Security" + b"Token"), (b"PixelStreaming." + b"Security" + b"Token")]
        for token in token_fragments:
            if token in data:
                fail(f"secret-like token in map: {city}")
    print("MAP_CHECK_PASS")


def check_renderer_snapshot_visual_layer() -> None:
    generator = (UNREAL / "Content" / "Python" / "generate_road_intersection.py").read_text(
        encoding="utf-8"
    )
    for token in SNAPSHOT_VISUAL_TOKENS:
        if token not in generator:
            fail(f"road generator missing renderer snapshot visual token: {token}")

    for city in CITIES:
        manifest_path = UNREAL / "GeneratedProof" / f"{city}_road_only_manifest.json"
        if not manifest_path.exists():
            fail(f"missing generated manifest: {city}")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        snapshot = manifest.get("renderer_snapshot_visualization")
        if not isinstance(snapshot, dict):
            fail(f"manifest missing renderer_snapshot_visualization: {city}")
        if snapshot.get("source") != "FastAPI fixture renderer snapshot":
            fail(f"manifest has unexpected snapshot source: {city}")
        if snapshot.get("active_signal_group") != "east_priority":
            fail(f"manifest has unexpected active_signal_group: {city}")
        if snapshot.get("pedestrian_request") is not True:
            fail(f"manifest has unexpected pedestrian_request: {city}")
        if snapshot.get("emergency_vehicle_direction") != "east":
            fail(f"manifest has unexpected emergency_vehicle_direction: {city}")
        if snapshot.get("pixel_stream_status") != "ready":
            fail(f"manifest has unexpected pixel_stream_status: {city}")
        queues = snapshot.get("queues")
        if queues != {"north": 32, "south": 11, "east": 18, "west": 8}:
            fail(f"manifest has unexpected queues: {city} {queues!r}")

        data = (UNREAL / "Content" / "Maps" / "Generated" / f"{city}_RoadOnly.umap").read_bytes()
        for token in [
            f"RendererSnapshotState_{city}_active_signal_group_east_priority".encode(),
            f"RendererSnapshotState_{city}_queue_north_count_32".encode(),
            f"RendererSnapshotState_{city}_queue_south_count_11".encode(),
            f"RendererSnapshotState_{city}_queue_east_count_18".encode(),
            f"RendererSnapshotState_{city}_queue_west_count_8".encode(),
            f"RendererSnapshotState_{city}_pedestrian_request_active".encode(),
            f"RendererSnapshotState_{city}_emergency_vehicle_direction_east".encode(),
            f"RendererSnapshotState_{city}_pixel_stream_status_ready".encode(),
        ]:
            if token not in data:
                fail(f"map missing renderer snapshot visual token {token!r}: {city}")
    print("RENDERER_SNAPSHOT_VISUAL_LAYER_CHECK_PASS")


def check_renderer_snapshot_capture_view() -> None:
    capture_script = (
        UNREAL / "Content" / "Python" / "capture_road_only_render_target.py"
    ).read_text(encoding="utf-8")
    for token in [
        "state_layout",
        "apply_state_layout_proof_filter",
        "RendererSnapshotState",
        "state proof",
        "CameraProjectionMode.ORTHOGRAPHIC",
    ]:
        if token not in capture_script:
            fail(f"capture script missing renderer snapshot state-view token: {token}")

    powershell = (ROOT / "scripts" / "capture-unreal-road-render-target.ps1").read_text(
        encoding="utf-8"
    )
    if "state_layout" not in powershell:
        fail("capture PowerShell wrapper missing state_layout view option")
    print("RENDERER_SNAPSHOT_CAPTURE_VIEW_CHECK_PASS")


def check_fastapi_snapshot_endpoint() -> None:
    routes = (API / "app" / "api" / "routes.py").read_text(encoding="utf-8")
    for token in [
        '"/api/renderer/unreal/snapshot"',
        "build_unreal_renderer_snapshot",
        "ensure_scenario_snapshot",
        "pixel_stream_status",
        "pixel_stream_signalling_url",
        'simulation_source=getattr(simulation_adapter, "source", "unknown")',
    ]:
        if token not in routes:
            fail(f"FastAPI renderer route missing token: {token}")

    snapshot = (API / "app" / "services" / "renderer_snapshot.py").read_text(
        encoding="utf-8"
    )
    for token in [
        "snapshot_type",
        "unreal_renderer_snapshot",
        "cityProfileId",
        "activeSignalGroup",
        "cycleSecond",
        "pedestrian_request",
        "pedestrianRequest",
        "emergencyVehicleDirection",
        "pixelStreamConnected",
        "pixelStreamSignallingUrl",
        "SAFETY_BOUNDARY",
        "CONNECTED_STREAM_STATUSES",
    ]:
        if token not in snapshot:
            fail(f"FastAPI renderer snapshot service missing token: {token}")

    tests = (API / "tests" / "test_api_flow.py").read_text(encoding="utf-8")
    if "test_unreal_renderer_snapshot_matches_runtime_controller_contract" not in tests:
        fail("FastAPI renderer snapshot contract test missing")

    print("FASTAPI_RENDERER_SNAPSHOT_CHECK_PASS")


def check_unreal_runtime_smoke_artifacts() -> None:
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    if package.get("scripts", {}).get("unreal:runtime-smoke") != (
        "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-unreal-runtime-snapshot.ps1"
    ):
        fail("package.json missing unreal:runtime-smoke script")
    if package.get("scripts", {}).get("unreal:http-smoke") != (
        "powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-unreal-http-snapshot.ps1"
    ):
        fail("package.json missing unreal:http-smoke script")

    powershell = (ROOT / "scripts" / "smoke-unreal-runtime-snapshot.ps1").read_text(encoding="utf-8")
    for token in [
        "smoke_runtime_snapshot_controller.py",
        "-nullrhi",
        "SMART_INTERSECTION_RUNTIME_SNAPSHOT_JSON",
        "SMART_INTERSECTION_RUNTIME_SMOKE_OUTPUT",
        "unreal-runtime-snapshot-smoke.json",
        "Start-Process",
        "-Wait",
        "ConvertFrom-Json",
    ]:
        if token not in powershell:
            fail(f"runtime smoke PowerShell missing token: {token}")

    python_script = (
        UNREAL / "Content" / "Python" / "smoke_runtime_snapshot_controller.py"
    ).read_text(encoding="utf-8")
    for token in [
        "EXPECTED_SIGNAL_HEAD_MESH_PATH",
        "EXPECTED_CCTV_MESH_PATH",
        "EXPECTED_QUEUE_VEHICLE_MATERIAL_PATH",
        "EXPECTED_EMERGENCY_VEHICLE_MATERIAL_PATH",
        "component_static_mesh_path",
        "component_material_path",
        "assert_runtime_component_assets",
        "/Script/SmartIntersectionRuntime.TrafficSimulationController",
        "get_default_object",
        "apply_simulation_snapshot_json",
        "new_blank_map",
        "SMART_INTERSECTION_RUNTIME_SMOKE_OUTPUT",
        "last_snapshot_parsed",
        "pixel_stream_connected",
        "runtime_visual_signal_state",
        "runtime_visual_east_queue_markers",
        "runtime_visual_north_queue_markers",
        "runtime_visual_south_queue_markers",
        "runtime_visual_west_queue_markers",
        "runtime_visual_emergency_direction_state",
        "runtime_visual_emergency_beacon_location",
        "runtime_visual_asset_set",
        "signal_visual_mesh",
        "pixel_stream_ready_visual_mesh",
        "queue_marker_material",
        "emergency_beacon_material",
        "runtime_visual_pedestrian_crossing_visible",
        "RUNTIME_SNAPSHOT_VISUAL_UPDATE_PASS",
        "RUNTIME_SNAPSHOT_SMOKE_PASS",
        "RUNTIME_SNAPSHOT_SMOKE_FAIL",
    ]:
        if token not in python_script:
            fail(f"runtime smoke Python missing token: {token}")

    print("UNREAL_RUNTIME_SMOKE_ARTIFACTS_CHECK_PASS")


def check_unreal_http_smoke_artifacts() -> None:
    powershell = (ROOT / "scripts" / "smoke-unreal-http-snapshot.ps1").read_text(encoding="utf-8")
    for token in [
        "Start-Process",
        "SMART_INTERSECTION_HTTP_SMOKE_ENDPOINT",
        "unreal-http-snapshot-smoke.json",
        "ConvertFrom-Json",
    ]:
        if token not in powershell:
            fail(f"HTTP smoke PowerShell missing token: {token}")

    server = (ROOT / "scripts" / "smoke_http_snapshot_server.py").read_text(encoding="utf-8")
    for token in [
        "http.server",
        "ThreadingHTTPServer",
        "HTTP_SNAPSHOT_SERVER_READY",
        "/api/renderer/unreal/snapshot",
        "pedestrian_request",
    ]:
        if token not in server:
            fail(f"HTTP smoke server missing token: {token}")

    python_script = (
        UNREAL / "Content" / "Python" / "smoke_http_snapshot_controller.py"
    ).read_text(encoding="utf-8")
    for token in [
        "EXPECTED_SIGNAL_HEAD_MESH_PATH",
        "EXPECTED_CCTV_MESH_PATH",
        "EXPECTED_QUEUE_VEHICLE_MATERIAL_PATH",
        "EXPECTED_EMERGENCY_VEHICLE_MATERIAL_PATH",
        "component_static_mesh_path",
        "component_material_path",
        "assert_runtime_component_assets",
        "fetch_simulation_snapshot_once",
        "register_slate_post_tick_callback",
        "last_snapshot_fetch_status",
        "runtime_visual_south_queue_markers",
        "runtime_visual_west_queue_markers",
        "runtime_visual_emergency_direction_state",
        "runtime_visual_emergency_beacon_location",
        "runtime_visual_asset_set",
        "signal_visual_mesh",
        "pixel_stream_ready_visual_mesh",
        "queue_marker_material",
        "emergency_beacon_material",
        "runtime_visual_pedestrian_crossing_visible",
        "HTTP_SNAPSHOT_SMOKE_PASS",
        "HTTP_SNAPSHOT_SMOKE_FAIL",
    ]:
        if token not in python_script:
            fail(f"HTTP smoke Python missing token: {token}")

    print("UNREAL_HTTP_SMOKE_ARTIFACTS_CHECK_PASS")


if __name__ == "__main__":
    check_source()
    check_landing()
    check_maps()
    check_renderer_snapshot_visual_layer()
    check_renderer_snapshot_capture_view()
    check_fastapi_snapshot_endpoint()
    check_unreal_runtime_smoke_artifacts()
    check_unreal_http_smoke_artifacts()
