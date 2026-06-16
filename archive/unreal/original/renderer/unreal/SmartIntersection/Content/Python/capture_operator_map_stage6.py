from __future__ import annotations

import json
import math
import os
from pathlib import Path
import time

try:
    import unreal  # type: ignore
except Exception as exc:
    raise SystemExit(f"Unreal Python module unavailable: {exc}")


ROOT = Path(__file__).resolve().parents[5]
UE_ROOT = ROOT / "renderer" / "unreal" / "SmartIntersection"
SNAPSHOT_FIXTURE = ROOT / "apps" / "api" / "app" / "fixtures" / "stage4_renderer_snapshots.json"
MANIFEST = UE_ROOT / "GeneratedProof" / "smart_intersection_rebuild_operator_stage6_photoreal_manifest.json"
MAP_BEFORE = "/Game/Maps/Generated/smart_intersection_rebuild_stage3"
MAP_AFTER = "/Game/Maps/Generated/smart_intersection_rebuild_operator_stage6"
SNAPSHOT_ID = "stage4-fixture-a"


def set_editor_property_if_supported(obj, name: str, value) -> None:
    try:
        obj.set_editor_property(name, value)
    except Exception:
        pass


def look_at_rotation(origin, target):
    dx = target.x - origin.x
    dy = target.y - origin.y
    dz = target.z - origin.z
    yaw = math.degrees(math.atan2(dy, dx))
    horizontal = math.sqrt(dx * dx + dy * dy)
    pitch = math.degrees(math.atan2(dz, horizontal))
    return unreal.Rotator(0.0, pitch, yaw)


def describe_vector(vec) -> str:
    return f"({vec.x:.1f},{vec.y:.1f},{vec.z:.1f})"


def find_actor_by_label(label: str):
    for actor in unreal.EditorLevelLibrary.get_all_level_actors():
        try:
            if actor.get_actor_label() == label:
                return actor
        except Exception:
            continue
    return None


def related_actors_for_label(label: str) -> list:
    actors = []
    prefix = f"{label}_"
    for actor in unreal.EditorLevelLibrary.get_all_level_actors():
        try:
            actor_label = actor.get_actor_label()
        except Exception:
            continue
        if actor_label == label or actor_label.startswith(prefix):
            actors.append(actor)
    return actors


def set_actor_rotation(actor, heading_deg: float) -> None:
    rotation = unreal.Rotator(0.0, 0.0, heading_deg)
    try:
        actor.set_actor_rotation(rotation, False)
    except Exception:
        try:
            actor.set_actor_rotation(rotation)
        except Exception:
            pass


def set_actor_visible(actor, visible: bool) -> None:
    try:
        actor.set_actor_hidden_in_game(not visible)
    except Exception:
        pass
    try:
        actor.set_is_temporarily_hidden_in_editor(not visible)
    except Exception:
        pass
    component = actor.get_component_by_class(unreal.StaticMeshComponent)
    if component is not None:
        try:
            component.set_visibility(visible, True)
            component.set_hidden_in_game(not visible, True)
        except Exception:
            pass


def load_fixture_snapshot() -> dict:
    fixture = json.loads(SNAPSHOT_FIXTURE.read_text(encoding="utf-8"))
    snapshots = fixture.get("snapshots", {})
    if SNAPSHOT_ID not in snapshots:
        raise SystemExit(f"missing Stage 4 fixture snapshot: {SNAPSHOT_ID}")
    return snapshots[SNAPSHOT_ID]


def get_controller_actor():
    controller_class = unreal.load_class(
        None,
        "/Script/SmartIntersectionRuntime.TrafficSimulationController",
    )
    for actor in unreal.EditorLevelLibrary.get_all_level_actors():
        try:
            if "TrafficSimulationController" in actor.get_actor_label():
                return actor
        except Exception:
            continue
    if controller_class is None:
        raise SystemExit("TrafficSimulationController class unavailable")
    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
        controller_class,
        unreal.Vector(0, 0, 260),
        unreal.Rotator(0, 0, 0),
    )
    actor.set_actor_label("TrafficSimulationController_OperatorStage6_snapshot_receiver")
    return actor


def apply_vehicle_bindings(snapshot: dict) -> list[dict[str, object]]:
    evidence = []
    for vehicle in snapshot.get("vehicles", []):
        actor_label = vehicle["actor_label"]
        actor = find_actor_by_label(actor_label)
        if actor is None:
            raise SystemExit(f"Stage 6 vehicle actor missing: {actor_label}")
        current = actor.get_actor_location()
        target = unreal.Vector(vehicle["x_cm"], vehicle["y_cm"], vehicle["z_cm"])
        delta = target - current
        heading = float(vehicle["heading_deg"])
        for related_actor in related_actors_for_label(actor_label):
            location = related_actor.get_actor_location()
            related_actor.set_actor_location(location + delta, False, False)
            set_actor_rotation(related_actor, heading)
        evidence.append(
            {
                "actor_label": actor_label,
                "vehicle_id": vehicle["vehicle_id"],
                "to_cm": [vehicle["x_cm"], vehicle["y_cm"], vehicle["z_cm"]],
                "heading_deg": heading,
            }
        )
    return evidence


def apply_signal_bindings(snapshot: dict) -> list[dict[str, str]]:
    evidence = []
    prefix = "OperatorStage3_Stage3SignalKit_SUMOReadyAssetPivot_"
    for signal in snapshot.get("signals", []):
        actor_label = signal["actor_label"]
        signal_base = actor_label
        if signal_base.startswith(prefix):
            signal_base = signal_base[len(prefix):]
        if signal_base.endswith("_pole"):
            signal_base = signal_base[:-len("_pole")]
        red_actor = find_actor_by_label(f"OperatorStage3_Stage3SignalKit_{signal_base}_lens_red")
        green_actor = find_actor_by_label(f"OperatorStage3_Stage3SignalKit_{signal_base}_lens_green")
        state = signal["state"]
        if red_actor is None or green_actor is None:
            raise SystemExit(f"Stage 6 signal lens actor missing for: {actor_label}")
        set_actor_visible(red_actor, state == "red")
        set_actor_visible(green_actor, state == "green")
        evidence.append({"actor_label": actor_label, "state": state})
    return evidence


def apply_snapshot(controller, snapshot: dict) -> dict[str, object]:
    controller.apply_simulation_snapshot_json(json.dumps(snapshot, separators=(",", ":")))
    vehicle_evidence = apply_vehicle_bindings(snapshot)
    signal_evidence = apply_signal_bindings(snapshot)
    print(
        "OPERATOR_STAGE6_APPLY "
        f"snapshot_id={snapshot['snapshot_id']} phase={snapshot['activeSignalGroup']} "
        f"vehicles={len(vehicle_evidence)} signals={len(signal_evidence)}"
    )
    return {
        "snapshot_id": snapshot["snapshot_id"],
        "activeSignalGroup": snapshot["activeSignalGroup"],
        "cycleSecond": snapshot["cycleSecond"],
        "queues": snapshot["queues"],
        "pedestrianRequest": snapshot["pedestrianRequest"],
        "emergencyVehicleDirection": snapshot["emergencyVehicleDirection"],
        "vehicles": vehicle_evidence,
        "signals": signal_evidence,
    }


def configure_capture_world(prefix: str):
    world = unreal.EditorLevelLibrary.get_editor_world()
    if world is None:
        raise SystemExit("editor world unavailable")
    for command in ("DisableAllScreenMessages", "r.DefaultFeature.AutoExposure 0", "r.EyeAdaptationQuality 0"):
        try:
            unreal.SystemLibrary.execute_console_command(world, command)
        except Exception:
            pass

    sun = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.DirectionalLight,
        unreal.Vector(-2500, -3150, 4200),
        unreal.Rotator(-48, -40, 0),
    )
    sun.set_actor_label(f"{prefix}_traffic_camera_key_light")
    sun_comp = sun.get_component_by_class(unreal.DirectionalLightComponent)
    if sun_comp:
        sun_comp.set_editor_property("intensity", 1.45)
        set_editor_property_if_supported(sun_comp, "cast_shadows", True)
        set_editor_property_if_supported(sun_comp, "light_source_angle", 7.5)
        try:
            sun_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
        except Exception:
            pass

    sky = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.SkyLight,
        unreal.Vector(0, 0, 1700),
        unreal.Rotator(0, 0, 0),
    )
    sky.set_actor_label(f"{prefix}_traffic_camera_skylight")
    sky_comp = sky.get_component_by_class(unreal.SkyLightComponent)
    if sky_comp:
        sky_comp.set_editor_property("intensity", 1.2)
        try:
            sky_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
            sky_comp.recapture_sky()
        except Exception:
            pass

    pp = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.PostProcessVolume,
        unreal.Vector(0, 0, 900),
        unreal.Rotator(0, 0, 0),
    )
    pp.set_actor_label(f"{prefix}_traffic_camera_postprocess")
    set_editor_property_if_supported(pp, "b_unbound", True)
    set_editor_property_if_supported(pp, "blend_weight", 1.0)
    try:
        settings = pp.get_editor_property("settings")
        for name, value in (
            ("override_auto_exposure_bias", True),
            ("auto_exposure_bias", -0.10),
            ("override_bloom_intensity", True),
            ("bloom_intensity", 0.06),
            ("override_vignette_intensity", True),
            ("vignette_intensity", 0.04),
        ):
            set_editor_property_if_supported(settings, name, value)
        pp.set_editor_property("settings", settings)
    except Exception as exc:
        print(f"OPERATOR_STAGE6_CAPTURE_POSTPROCESS_FALLBACK error={exc}")
    return world


def build_scene_capture(origin, rotation, label: str):
    capture = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.SceneCapture2D, origin, rotation)
    capture.set_actor_label(label)
    comp = capture.get_component_by_class(unreal.SceneCaptureComponent2D)
    if comp is None:
        raise SystemExit("SceneCaptureComponent2D unavailable")
    rt = unreal.TextureRenderTarget2D()
    if hasattr(rt, "init_auto_format"):
        rt.init_auto_format(1600, 900)
    elif hasattr(rt, "init_custom_format"):
        rt.init_custom_format(1600, 900, unreal.PixelFormat.PF_B8G8R8A8, False)
    else:
        rt.set_editor_property("size_x", 1600)
        rt.set_editor_property("size_y", 900)
        if hasattr(unreal, "TextureRenderTargetFormat"):
            rt.set_editor_property("render_target_format", unreal.TextureRenderTargetFormat.RTF_RGBA8)
    comp.texture_target = rt
    comp.fov_angle = 44.0
    try:
        comp.set_editor_property("capture_source", unreal.SceneCaptureSource.SCS_SCENE_COLOR_HDR)
    except Exception:
        pass
    return comp, rt


def capture_png(world, comp, rt, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        output_path.unlink()
    automation = getattr(unreal, "AutomationLibrary", None)
    if automation is not None and hasattr(automation, "finish_loading_before_screenshot"):
        automation.finish_loading_before_screenshot()
    for _ in range(4):
        comp.capture_scene()
        time.sleep(0.25)
    ok = unreal.RenderingLibrary.export_render_target(world, rt, str(output_path.parent), output_path.name)
    print(f"OPERATOR_STAGE6_RENDER_TARGET_EXPORTED output={output_path} ok={ok}")


def capture_map(map_path: str, output_path: Path, label: str) -> dict[str, object]:
    if not unreal.EditorAssetLibrary.does_asset_exist(map_path):
        raise SystemExit(f"map asset missing: {map_path}")
    unreal.EditorLevelLibrary.load_level(map_path)
    world = configure_capture_world(label)
    controller = get_controller_actor()
    snapshot = load_fixture_snapshot()
    origin = unreal.Vector(-2450, -4300, 2650)
    target = unreal.Vector(120, 120, 0)
    rotation = look_at_rotation(origin, target)
    print(
        "OPERATOR_STAGE6_CAPTURE_CAMERA "
        f"map={map_path} origin={describe_vector(origin)} target={describe_vector(target)}"
    )
    unreal.EditorLevelLibrary.set_level_viewport_camera_info(origin, rotation)
    comp, rt = build_scene_capture(origin, rotation, f"{label}_scene_capture")
    snapshot_evidence = apply_snapshot(controller, snapshot)
    capture_png(world, comp, rt, output_path)
    return {
        "map": map_path,
        "proof_image": str(output_path.relative_to(ROOT)).replace("\\", "/"),
        "snapshot": snapshot_evidence,
    }


def update_manifest(before: dict[str, object], after: dict[str, object], before_path: Path, after_path: Path, contact_sheet: Path) -> None:
    if MANIFEST.exists():
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    else:
        manifest = {}
    manifest.update(
        {
            "capture_schema": "operator-stage6-unreal-before-after-proof-v1",
            "simulation_source": "sumo_traci_fixture",
            "live_sumo_status": "deferred_until_real_sumo_traci_runtime_metadata_proves_simulation_source_sumo_traci",
            "fixture_snapshot_path": str(SNAPSHOT_FIXTURE.relative_to(ROOT)).replace("\\", "/"),
            "proof_before_image": str(before_path.relative_to(ROOT)).replace("\\", "/"),
            "proof_after_image": str(after_path.relative_to(ROOT)).replace("\\", "/"),
            "proof_contact_sheet": str(contact_sheet.relative_to(ROOT)).replace("\\", "/"),
            "capture_camera": {
                "origin_cm": [-2450, -4300, 2650],
                "target_cm": [120, 120, 0],
                "fov_degrees": 44.0,
            },
            "captures": [before, after],
            "runtime_readiness_command": "npm run runtime:readiness",
            "renderer_policy": "SUMO/TraCI is truth; FastAPI orchestrates state; Unreal renders; Pixel Streaming transports frames only.",
            "human_visual_inspection": "recorded in artifacts/unreal-operator-map-stage6-visual-verdict.json",
        }
    )
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"OPERATOR_STAGE6_MANIFEST={MANIFEST}")


def main() -> None:
    before_path = Path(os.environ.get(
        "SMART_INTERSECTION_OPERATOR_STAGE6_BEFORE_OUTPUT",
        ROOT / "artifacts" / "unreal-operator-map-stage6-before.png",
    ))
    after_path = Path(os.environ.get(
        "SMART_INTERSECTION_OPERATOR_STAGE6_AFTER_OUTPUT",
        ROOT / "artifacts" / "unreal-operator-map-stage6-photoreal-proof.png",
    ))
    contact_sheet = Path(os.environ.get(
        "SMART_INTERSECTION_OPERATOR_STAGE6_CONTACT_SHEET",
        ROOT / "artifacts" / "unreal-operator-map-stage6-before-after-contact-sheet.png",
    ))

    before = capture_map(MAP_BEFORE, before_path, "OperatorStage6_before_stage3_readability")
    after = capture_map(MAP_AFTER, after_path, "OperatorStage6_after_photoreal_operator_view")
    update_manifest(before, after, before_path, after_path, contact_sheet)


if __name__ == "__main__":
    main()
