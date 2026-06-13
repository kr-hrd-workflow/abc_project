from __future__ import annotations

import json
import os
from pathlib import Path
import sys
import time

try:
    import unreal  # type: ignore
except Exception as exc:
    raise SystemExit(f"Unreal Python module required: {exc}")

EXPECTED_SIGNAL_HEAD_MESH_PATH = (
    "/Game/PhotorealRoadKit/Meshes/"
    "signal_head_uk_high_fidelity.signal_head_uk_high_fidelity"
)
EXPECTED_CCTV_MESH_PATH = (
    "/Game/PhotorealRoadKit/Meshes/"
    "cctv_camera_high_fidelity.cctv_camera_high_fidelity"
)
EXPECTED_QUEUE_VEHICLE_MATERIAL_PATH = (
    "/Game/Materials/RoadOnlyRenderer/"
    "M_london_queue_vehicle_body.M_london_queue_vehicle_body"
)
EXPECTED_EMERGENCY_VEHICLE_MATERIAL_PATH = (
    "/Game/Materials/RoadOnlyRenderer/"
    "M_london_emergency_vehicle_blue.M_london_emergency_vehicle_blue"
)


def result_path() -> Path:
    output = os.environ.get("SMART_INTERSECTION_HTTP_SMOKE_OUTPUT")
    if output:
        return Path(output)
    return (
        Path(__file__).resolve().parents[5]
        / "artifacts"
        / "unreal-http-snapshot-smoke.json"
    )


def write_result(passed: bool, **payload: object) -> None:
    path = result_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"passed": passed, **payload}, indent=2, sort_keys=True),
        encoding="utf-8",
    )


def fail(message: str) -> None:
    write_result(False, error=message)
    print(f"HTTP_SNAPSHOT_SMOKE_FAIL {message}")
    raise SystemExit(1)


def get_property(actor, property_name: str):
    try:
        return actor.get_editor_property(property_name)
    except Exception as exc:
        fail(f"missing_property={property_name} error={exc}")


def assert_vector_property(actor, property_name: str, expected: tuple[float, float, float]) -> None:
    vector = get_property(actor, property_name)
    actual = (round(float(vector.x), 1), round(float(vector.y), 1), round(float(vector.z), 1))
    rounded_expected = tuple(round(value, 1) for value in expected)
    if actual != rounded_expected:
        fail(f"{property_name}={actual} expected={rounded_expected}")


def component_static_mesh_path(actor, property_name: str) -> str:
    component = get_property(actor, property_name)
    mesh = component.get_editor_property("static_mesh") if component else None
    return mesh.get_path_name() if mesh else ""


def component_material_path(actor, property_name: str) -> str:
    component = get_property(actor, property_name)
    material = component.get_material(0) if component else None
    return material.get_path_name() if material else ""


def assert_runtime_component_assets(actor) -> dict[str, str]:
    paths = {
        "signal_visual_mesh": component_static_mesh_path(
            actor,
            "east_west_green_signal_visual",
        ),
        "pixel_stream_ready_visual_mesh": component_static_mesh_path(
            actor,
            "pixel_stream_ready_visual",
        ),
        "queue_marker_material": component_material_path(
            actor,
            "north_queue_visual_marker0",
        ),
        "emergency_beacon_material": component_material_path(
            actor,
            "emergency_vehicle_direction_visual",
        ),
    }
    expected_paths = {
        "signal_visual_mesh": EXPECTED_SIGNAL_HEAD_MESH_PATH,
        "pixel_stream_ready_visual_mesh": EXPECTED_CCTV_MESH_PATH,
        "queue_marker_material": EXPECTED_QUEUE_VEHICLE_MATERIAL_PATH,
        "emergency_beacon_material": EXPECTED_EMERGENCY_VEHICLE_MATERIAL_PATH,
    }
    for key, expected in expected_paths.items():
        if paths[key] != expected:
            fail(f"{key}={paths[key]} expected={expected}")
    return paths


def finish_if_ready(actor, tick_handle: object | None) -> bool:
    status = str(get_property(actor, "last_snapshot_fetch_status"))
    if status == "requesting":
        return False

    if tick_handle is not None:
        unreal.unregister_slate_post_tick_callback(tick_handle)

    if status != "received":
        fail(f"last_snapshot_fetch_status={status}")
    if not get_property(actor, "last_snapshot_parsed"):
        fail("last_snapshot_parsed=false")
    if get_property(actor, "city_profile_id") != "paris":
        fail(f"city_profile_id={get_property(actor, 'city_profile_id')}")
    if get_property(actor, "active_signal_group") != "east_priority":
        fail(f"active_signal_group={get_property(actor, 'active_signal_group')}")
    if get_property(actor, "runtime_visual_asset_set") != "photoreal_roadkit_runtime_assets":
        fail(f"runtime_visual_asset_set={get_property(actor, 'runtime_visual_asset_set')}")
    runtime_component_assets = assert_runtime_component_assets(actor)
    if not get_property(actor, "pixel_stream_connected"):
        fail("pixel_stream_connected=false")

    queues = get_property(actor, "directional_queues")
    if (
        int(queues.get("north", -1)) != 32
        or int(queues.get("south", -1)) != 11
        or int(queues.get("east", -1)) != 18
        or int(queues.get("west", -1)) != 8
    ):
        fail(f"directional_queues={queues}")
    if int(get_property(actor, "runtime_visual_south_queue_markers")) != 2:
        fail(
            "runtime_visual_south_queue_markers="
            f"{get_property(actor, 'runtime_visual_south_queue_markers')}"
        )
    if int(get_property(actor, "runtime_visual_west_queue_markers")) != 1:
        fail(
            "runtime_visual_west_queue_markers="
            f"{get_property(actor, 'runtime_visual_west_queue_markers')}"
        )
    if not get_property(actor, "pedestrian_request_active"):
        fail("pedestrian_request_active=false")
    if not get_property(actor, "runtime_visual_pedestrian_crossing_visible"):
        fail("runtime_visual_pedestrian_crossing_visible=false")
    if get_property(actor, "runtime_visual_emergency_direction_state") != "east":
        fail(
            "runtime_visual_emergency_direction_state="
            f"{get_property(actor, 'runtime_visual_emergency_direction_state')}"
        )
    assert_vector_property(
        actor,
        "runtime_visual_emergency_beacon_location",
        (210.0, 0.0, 105.0),
    )

    write_result(
        True,
        city="paris",
        active_signal_group="east_priority",
        fetch_status=status,
        north_queue=32,
        south_queue=11,
        east_queue=18,
        west_queue=8,
        south_queue_markers=2,
        west_queue_markers=1,
        pedestrian_request_active=True,
        emergency_direction_state="east",
        emergency_beacon_location=[210.0, 0.0, 105.0],
        runtime_visual_asset_set="photoreal_roadkit_runtime_assets",
        **runtime_component_assets,
    )
    print(
        "HTTP_SNAPSHOT_SMOKE_PASS "
        "city=paris phase=east_priority status=received queues=south:11,west:8 pedestrian=true"
    )
    unreal.SystemLibrary.execute_console_command(None, "QUIT_EDITOR")
    return True


def register_http_snapshot_wait(actor, deadline_seconds: float = 10.0) -> None:
    deadline = time.monotonic() + deadline_seconds
    tick_handle: object | None = None

    def on_tick(_delta_seconds: float) -> None:
        if finish_if_ready(actor, tick_handle):
            return
        if time.monotonic() > deadline:
            if tick_handle is not None:
                unreal.unregister_slate_post_tick_callback(tick_handle)
            fail(
                "timeout_waiting_for_http_snapshot "
                f"last_snapshot_fetch_status={get_property(actor, 'last_snapshot_fetch_status')}"
            )

    tick_handle = unreal.register_slate_post_tick_callback(on_tick)


def main() -> None:
    if hasattr(unreal.EditorLoadingAndSavingUtils, "new_blank_map"):
        unreal.EditorLoadingAndSavingUtils.new_blank_map(False)

    controller_class = unreal.load_class(
        None,
        "/Script/SmartIntersectionRuntime.TrafficSimulationController",
    )
    if controller_class is None:
        fail("controller_class_unavailable")

    actor = unreal.get_default_object(controller_class)
    if actor is None:
        fail("controller_default_object_unavailable")

    endpoint = os.environ.get(
        "SMART_INTERSECTION_HTTP_SMOKE_ENDPOINT",
        "http://127.0.0.1:8765/api/renderer/unreal/snapshot",
    )
    actor.set_editor_property("snapshot_endpoint_url", endpoint)
    actor.set_editor_property("city_profile_id", "paris")
    actor.fetch_simulation_snapshot_once()
    register_http_snapshot_wait(actor)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:
        write_result(False, error=f"unexpected={exc}")
        print(f"HTTP_SNAPSHOT_SMOKE_FAIL unexpected={exc}")
        sys.exit(1)
