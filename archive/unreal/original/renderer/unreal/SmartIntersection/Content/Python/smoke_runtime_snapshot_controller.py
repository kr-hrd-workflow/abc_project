from __future__ import annotations

import json
import os
from pathlib import Path
import sys

try:
    import unreal  # type: ignore
except Exception as exc:
    raise SystemExit(f"Unreal Python module required: {exc}")


DEFAULT_SNAPSHOT = (
    '{"cityProfileId":"paris","activeSignalGroup":"east_priority",'
    '"cycleSecond":24,"queues":{"north":32,"south":11,"east":18,"west":8},'
    '"pedestrian_request":true,'
    '"emergency_vehicle_approach":true,"emergency_direction":"east",'
    '"pixelStreamStatus":"ready","pixelStreamSignallingUrl":"ws://127.0.0.1:8888"}'
)

SECOND_SNAPSHOT = (
    '{"cityProfileId":"paris","activeSignalGroup":"north_south_priority",'
    '"cycleSecond":41,"queues":{"north":4,"south":2,"east":0,"west":1},'
    '"pedestrian_request":false,'
    '"emergency_vehicle_approach":false,"emergency_direction":"none",'
    '"pixelStreamStatus":"disconnected","pixelStreamSignallingUrl":"ws://127.0.0.1:8888"}'
)

THIRD_SNAPSHOT = (
    '{"cityProfileId":"paris","activeSignalGroup":"all_red",'
    '"cycleSecond":52,"queues":{"north":0,"south":0,"east":0,"west":0},'
    '"pedestrian_request":false,'
    '"emergency_vehicle_approach":true,"emergency_direction":"west",'
    '"pixelStreamStatus":"connected","pixelStreamSignallingUrl":"ws://127.0.0.1:8888"}'
)

STAGE4_SNAPSHOT_A = (
    '{"snapshot_id":"stage4-fixture-a","cityProfileId":"seoul",'
    '"activeSignalGroup":"east_west_priority","cycleSecond":12,'
    '"motion_binding_version":"operator-stage4-motion-v1",'
    '"queues":{"north":28,"south":14,"east":6,"west":4},'
    '"pedestrian_request":true,'
    '"emergency_vehicle_approach":true,"emergency_direction":"east",'
    '"vehicles":[{"actor_label":"OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_seoul_north_passenger_car_00",'
    '"vehicle_id":"veh-north-00","lane_id":"north_inbound_0","direction":"north",'
    '"x_cm":-44.0,"y_cm":1540.0,"z_cm":86.0,"heading_deg":180.0,'
    '"speed_mps":2.8,"class":"passenger_car"}],'
    '"signals":[{"actor_label":"OperatorStage3_Stage3SignalKit_SUMOReadyAssetPivot_seoul_northwest_pole",'
    '"signal_group":"north_south","state":"red"}]}'
)

STAGE4_SNAPSHOT_B = (
    '{"snapshot_id":"stage4-fixture-b","cityProfileId":"seoul",'
    '"activeSignalGroup":"north_south_priority","cycleSecond":36,'
    '"motion_binding_version":"operator-stage4-motion-v1",'
    '"queues":{"north":8,"south":5,"east":24,"west":19},'
    '"pedestrian_request":false,'
    '"emergency_vehicle_approach":true,"emergency_direction":"north",'
    '"vehicles":[{"actor_label":"OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_seoul_north_passenger_car_00",'
    '"vehicle_id":"veh-north-00","lane_id":"north_inbound_0","direction":"north",'
    '"x_cm":-44.0,"y_cm":980.0,"z_cm":86.0,"heading_deg":168.0,'
    '"speed_mps":9.1,"class":"passenger_car"}],'
    '"signals":[{"actor_label":"OperatorStage3_Stage3SignalKit_SUMOReadyAssetPivot_seoul_northwest_pole",'
    '"signal_group":"north_south","state":"green"}]}'
)

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


def write_result(passed: bool, **payload: object) -> None:
    output = os.environ.get("SMART_INTERSECTION_RUNTIME_SMOKE_OUTPUT")
    path = Path(output) if output else (
        Path(__file__).resolve().parents[5]
        / "artifacts"
        / "unreal-runtime-snapshot-smoke.json"
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"passed": passed, **payload}, indent=2, sort_keys=True),
        encoding="utf-8",
    )


def fail(message: str) -> None:
    write_result(False, error=message)
    print(f"RUNTIME_SNAPSHOT_SMOKE_FAIL {message}")
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

    snapshot = os.environ.get(
        "SMART_INTERSECTION_RUNTIME_SNAPSHOT_JSON",
        DEFAULT_SNAPSHOT,
    )
    actor.apply_simulation_snapshot_json(snapshot)

    if not get_property(actor, "last_snapshot_parsed"):
        fail("last_snapshot_parsed=false")
    if get_property(actor, "city_profile_id") != "paris":
        fail(f"city_profile_id={get_property(actor, 'city_profile_id')}")
    if get_property(actor, "active_signal_group") != "east_priority":
        fail(f"active_signal_group={get_property(actor, 'active_signal_group')}")
    if get_property(actor, "emergency_vehicle_direction") != "east":
        fail(
            "emergency_vehicle_direction="
            f"{get_property(actor, 'emergency_vehicle_direction')}"
        )
    if get_property(actor, "runtime_visual_asset_set") != "photoreal_roadkit_runtime_assets":
        fail(f"runtime_visual_asset_set={get_property(actor, 'runtime_visual_asset_set')}")
    runtime_component_assets = assert_runtime_component_assets(actor)
    if not get_property(actor, "pixel_stream_connected"):
        fail("pixel_stream_connected=false")
    if get_property(actor, "pixel_stream_status") != "ready":
        fail(f"pixel_stream_status={get_property(actor, 'pixel_stream_status')}")
    if "ws://127.0.0.1:8888" not in get_property(actor, "pixel_stream_signalling_url"):
        fail(
            "pixel_stream_signalling_url="
            f"{get_property(actor, 'pixel_stream_signalling_url')}"
        )

    queues = get_property(actor, "directional_queues")
    if (
        int(queues.get("north", -1)) != 32
        or int(queues.get("south", -1)) != 11
        or int(queues.get("east", -1)) != 18
        or int(queues.get("west", -1)) != 8
    ):
        fail(f"directional_queues={queues}")

    if get_property(actor, "runtime_visual_signal_state") != "east_west_green":
        fail(
            "runtime_visual_signal_state="
            f"{get_property(actor, 'runtime_visual_signal_state')}"
        )
    if int(get_property(actor, "runtime_visual_east_queue_markers")) != 3:
        fail(
            "runtime_visual_east_queue_markers="
            f"{get_property(actor, 'runtime_visual_east_queue_markers')}"
        )
    if int(get_property(actor, "runtime_visual_north_queue_markers")) != 4:
        fail(
            "runtime_visual_north_queue_markers="
            f"{get_property(actor, 'runtime_visual_north_queue_markers')}"
        )
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
    if not get_property(actor, "runtime_visual_emergency_beacon_visible"):
        fail("runtime_visual_emergency_beacon_visible=false")
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
    if not get_property(actor, "runtime_visual_pixel_stream_ready_visible"):
        fail("runtime_visual_pixel_stream_ready_visible=false")

    actor.apply_simulation_snapshot_json(SECOND_SNAPSHOT)
    if get_property(actor, "runtime_visual_signal_state") != "north_south_green":
        fail(
            "second_runtime_visual_signal_state="
            f"{get_property(actor, 'runtime_visual_signal_state')}"
        )
    if int(get_property(actor, "runtime_visual_east_queue_markers")) != 0:
        fail(
            "second_runtime_visual_east_queue_markers="
            f"{get_property(actor, 'runtime_visual_east_queue_markers')}"
        )
    if int(get_property(actor, "runtime_visual_north_queue_markers")) != 1:
        fail(
            "second_runtime_visual_north_queue_markers="
            f"{get_property(actor, 'runtime_visual_north_queue_markers')}"
        )
    if int(get_property(actor, "runtime_visual_south_queue_markers")) != 1:
        fail(
            "second_runtime_visual_south_queue_markers="
            f"{get_property(actor, 'runtime_visual_south_queue_markers')}"
        )
    if int(get_property(actor, "runtime_visual_west_queue_markers")) != 1:
        fail(
            "second_runtime_visual_west_queue_markers="
            f"{get_property(actor, 'runtime_visual_west_queue_markers')}"
        )
    if get_property(actor, "pedestrian_request_active"):
        fail("second_pedestrian_request_active=true")
    if get_property(actor, "runtime_visual_pedestrian_crossing_visible"):
        fail("second_runtime_visual_pedestrian_crossing_visible=true")
    if get_property(actor, "runtime_visual_emergency_beacon_visible"):
        fail("second_runtime_visual_emergency_beacon_visible=true")
    if get_property(actor, "runtime_visual_emergency_direction_state") != "none":
        fail(
            "second_runtime_visual_emergency_direction_state="
            f"{get_property(actor, 'runtime_visual_emergency_direction_state')}"
        )
    if get_property(actor, "runtime_visual_pixel_stream_ready_visible"):
        fail("second_runtime_visual_pixel_stream_ready_visible=true")

    actor.apply_simulation_snapshot_json(THIRD_SNAPSHOT)
    if not get_property(actor, "runtime_visual_emergency_beacon_visible"):
        fail("third_runtime_visual_emergency_beacon_visible=false")
    if get_property(actor, "runtime_visual_emergency_direction_state") != "west":
        fail(
            "third_runtime_visual_emergency_direction_state="
            f"{get_property(actor, 'runtime_visual_emergency_direction_state')}"
        )
    assert_vector_property(
        actor,
        "runtime_visual_emergency_beacon_location",
        (-210.0, 0.0, 105.0),
    )

    actor.apply_simulation_snapshot_json(STAGE4_SNAPSHOT_A)
    if get_property(actor, "last_stage4_snapshot_id") != "stage4-fixture-a":
        fail(f"stage4_a_snapshot_id={get_property(actor, 'last_stage4_snapshot_id')}")
    if get_property(actor, "stage4_motion_binding_version") != "operator-stage4-motion-v1":
        fail(
            "stage4_motion_binding_version="
            f"{get_property(actor, 'stage4_motion_binding_version')}"
        )
    if int(get_property(actor, "runtime_visual_vehicle_binding_count")) != 1:
        fail(
            "stage4_a_vehicle_binding_count="
            f"{get_property(actor, 'runtime_visual_vehicle_binding_count')}"
        )
    if get_property(actor, "runtime_visual_first_vehicle_actor_label") != (
        "OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_seoul_north_passenger_car_00"
    ):
        fail(
            "stage4_a_first_vehicle_actor_label="
            f"{get_property(actor, 'runtime_visual_first_vehicle_actor_label')}"
        )
    assert_vector_property(
        actor,
        "runtime_visual_first_vehicle_location_cm",
        (-44.0, 1540.0, 86.0),
    )
    if round(float(get_property(actor, "runtime_visual_first_vehicle_heading_degrees")), 1) != 180.0:
        fail(
            "stage4_a_first_vehicle_heading="
            f"{get_property(actor, 'runtime_visual_first_vehicle_heading_degrees')}"
        )
    if int(get_property(actor, "runtime_visual_signal_binding_count")) != 1:
        fail(
            "stage4_a_signal_binding_count="
            f"{get_property(actor, 'runtime_visual_signal_binding_count')}"
        )
    if get_property(actor, "runtime_visual_first_signal_state") != "red":
        fail(
            "stage4_a_first_signal_state="
            f"{get_property(actor, 'runtime_visual_first_signal_state')}"
        )

    actor.apply_simulation_snapshot_json(STAGE4_SNAPSHOT_B)
    if get_property(actor, "last_stage4_snapshot_id") != "stage4-fixture-b":
        fail(f"stage4_b_snapshot_id={get_property(actor, 'last_stage4_snapshot_id')}")
    assert_vector_property(
        actor,
        "runtime_visual_first_vehicle_location_cm",
        (-44.0, 980.0, 86.0),
    )
    if round(float(get_property(actor, "runtime_visual_first_vehicle_heading_degrees")), 1) != 168.0:
        fail(
            "stage4_b_first_vehicle_heading="
            f"{get_property(actor, 'runtime_visual_first_vehicle_heading_degrees')}"
        )
    if get_property(actor, "runtime_visual_first_signal_state") != "green":
        fail(
            "stage4_b_first_signal_state="
            f"{get_property(actor, 'runtime_visual_first_signal_state')}"
        )

    write_result(
        True,
        city="paris",
        active_signal_group="east_priority",
        pixel_stream_status="ready",
        north_queue=32,
        south_queue=11,
        east_queue=18,
        west_queue=8,
        second_active_signal_group="north_south_priority",
        second_north_queue_markers=1,
        second_south_queue_markers=1,
        second_east_queue_markers=0,
        second_west_queue_markers=1,
        pedestrian_request_active=True,
        second_pedestrian_request_active=False,
        emergency_direction_state="east",
        third_emergency_direction_state="west",
        third_emergency_beacon_location=[-210.0, 0.0, 105.0],
        stage4_snapshot_id="stage4-fixture-b",
        stage4_motion_binding_version="operator-stage4-motion-v1",
        stage4_vehicle_binding_count=1,
        stage4_first_vehicle_actor_label=(
            "OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_seoul_north_passenger_car_00"
        ),
        stage4_first_vehicle_location_cm=[-44.0, 980.0, 86.0],
        stage4_first_vehicle_heading_degrees=168.0,
        stage4_signal_binding_count=1,
        stage4_first_signal_state="green",
        runtime_visual_asset_set="photoreal_roadkit_runtime_assets",
        **runtime_component_assets,
    )
    print(
        "RUNTIME_SNAPSHOT_VISUAL_UPDATE_PASS "
        "first=east_west_green/north:4/south:2/east:3/west:1/pedestrian:true "
        "second=north_south_green/north:1/south:1/east:0/west:1/pedestrian:false "
        "third=emergency_direction:west"
    )
    print(
        "RUNTIME_SNAPSHOT_SMOKE_PASS "
        "city=paris phase=east_priority stream=ready queues=north:32,south:11,east:18,west:8"
    )


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:
        write_result(False, error=f"unexpected={exc}")
        print(f"RUNTIME_SNAPSHOT_SMOKE_FAIL unexpected={exc}")
        sys.exit(1)
