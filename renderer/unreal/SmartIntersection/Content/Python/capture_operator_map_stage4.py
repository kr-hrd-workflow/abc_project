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
BINDING_PROFILE = UE_ROOT / "SceneProfiles" / "operator_stage4_motion_bindings.json"
MANIFEST = UE_ROOT / "GeneratedProof" / "smart_intersection_rebuild_operator_stage4_motion_manifest.json"
MAP_PATH = "/Game/Maps/Generated/smart_intersection_rebuild_stage3"


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


def load_fixture_snapshots() -> dict[str, dict]:
    fixture = json.loads(SNAPSHOT_FIXTURE.read_text(encoding="utf-8"))
    snapshots = fixture.get("snapshots", {})
    missing = [snapshot_id for snapshot_id in ("stage4-fixture-a", "stage4-fixture-b") if snapshot_id not in snapshots]
    if missing:
        raise SystemExit(f"missing Stage 4 fixture snapshots: {missing}")
    return snapshots


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
    actor.set_actor_label("TrafficSimulationController_OperatorStage4_snapshot_receiver")
    return actor


def apply_vehicle_bindings(snapshot: dict) -> list[dict[str, object]]:
    evidence = []
    for vehicle in snapshot.get("vehicles", []):
        actor_label = vehicle["actor_label"]
        actor = find_actor_by_label(actor_label)
        if actor is None:
            raise SystemExit(f"Stage 4 vehicle actor missing: {actor_label}")
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
                "from_cm": [round(current.x, 1), round(current.y, 1), round(current.z, 1)],
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
            raise SystemExit(f"Stage 4 signal lens actor missing for: {actor_label}")
        set_actor_visible(red_actor, state == "red")
        set_actor_visible(green_actor, state == "green")
        evidence.append({"actor_label": actor_label, "state": state})
    return evidence


def apply_snapshot(controller, snapshot: dict) -> dict[str, object]:
    controller.apply_simulation_snapshot_json(json.dumps(snapshot, separators=(",", ":")))
    vehicle_evidence = apply_vehicle_bindings(snapshot)
    signal_evidence = apply_signal_bindings(snapshot)
    print(
        "OPERATOR_STAGE4_APPLY "
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


def configure_capture_world():
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
        unreal.Vector(-2200, -2600, 3600),
        unreal.Rotator(-50, -38, 0),
    )
    sun.set_actor_label("OperatorStage4_capture_daylight")
    sun_comp = sun.get_component_by_class(unreal.DirectionalLightComponent)
    if sun_comp:
        sun_comp.set_editor_property("intensity", 1.1)
        set_editor_property_if_supported(sun_comp, "cast_shadows", False)
        set_editor_property_if_supported(sun_comp, "light_source_angle", 6.0)
        try:
            sun_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
        except Exception:
            pass

    sky = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.SkyLight,
        unreal.Vector(0, 0, 1400),
        unreal.Rotator(0, 0, 0),
    )
    sky.set_actor_label("OperatorStage4_capture_skylight")
    sky_comp = sky.get_component_by_class(unreal.SkyLightComponent)
    if sky_comp:
        sky_comp.set_editor_property("intensity", 0.7)
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
    pp.set_actor_label("OperatorStage4_capture_postprocess")
    set_editor_property_if_supported(pp, "b_unbound", True)
    set_editor_property_if_supported(pp, "blend_weight", 1.0)
    settings = pp.get_editor_property("settings")
    for name, value in (
        ("override_auto_exposure_bias", True),
        ("auto_exposure_bias", 0.35),
        ("override_bloom_intensity", True),
        ("bloom_intensity", 0.04),
        ("override_vignette_intensity", True),
        ("vignette_intensity", 0.0),
    ):
        set_editor_property_if_supported(settings, name, value)
    pp.set_editor_property("settings", settings)
    return world


def build_scene_capture(origin, rotation):
    capture = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.SceneCapture2D, origin, rotation)
    capture.set_actor_label("OperatorStage4_scene_capture_motion_proof")
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
    print(f"OPERATOR_STAGE4_RENDER_TARGET_EXPORTED output={output_path} ok={ok}")


def main() -> None:
    output_a = Path(os.environ.get(
        "SMART_INTERSECTION_OPERATOR_STAGE4_PROOF_A_OUTPUT",
        ROOT / "artifacts" / "unreal-operator-map-stage4-snapshot-a.png",
    ))
    output_b = Path(os.environ.get(
        "SMART_INTERSECTION_OPERATOR_STAGE4_PROOF_B_OUTPUT",
        ROOT / "artifacts" / "unreal-operator-map-stage4-snapshot-b.png",
    ))
    if not unreal.EditorAssetLibrary.does_asset_exist(MAP_PATH):
        raise SystemExit(f"map asset missing: {MAP_PATH}")
    if not BINDING_PROFILE.exists():
        raise SystemExit(f"binding profile missing: {BINDING_PROFILE}")

    unreal.EditorLevelLibrary.load_level(MAP_PATH)
    world = configure_capture_world()
    controller = get_controller_actor()
    snapshots = load_fixture_snapshots()

    origin = unreal.Vector(-2450, -4300, 2650)
    target = unreal.Vector(120, 120, 0)
    rotation = look_at_rotation(origin, target)
    print(
        "OPERATOR_STAGE4_CAPTURE_CAMERA "
        f"origin={describe_vector(origin)} target={describe_vector(target)}"
    )
    unreal.EditorLevelLibrary.set_level_viewport_camera_info(origin, rotation)
    comp, rt = build_scene_capture(origin, rotation)

    evidence_a = apply_snapshot(controller, snapshots["stage4-fixture-a"])
    capture_png(world, comp, rt, output_a)
    evidence_b = apply_snapshot(controller, snapshots["stage4-fixture-b"])
    capture_png(world, comp, rt, output_b)

    manifest = {
        "schema": "operator-stage4-motion-proof-v1",
        "mode": "OperatorStage4",
        "base_stage": "OperatorStage3",
        "unreal_map": MAP_PATH,
        "fixture_snapshot_path": str(SNAPSHOT_FIXTURE.relative_to(ROOT)).replace("\\", "/"),
        "binding_profile": str(BINDING_PROFILE.relative_to(ROOT)).replace("\\", "/"),
        "simulation_source": "sumo_traci_fixture",
        "live_sumo_status": "deferred_until_real_sumo_traci_run_passes",
        "renderer_policy": "SUMO/TraCI is truth, FastAPI orchestrates, Unreal renders received state.",
        "controller": "ATrafficSimulationController",
        "motion_binding_version": "operator-stage4-motion-v1",
        "snapshots": [evidence_a, evidence_b],
        "proof_images": [
            str(output_a.relative_to(ROOT)).replace("\\", "/"),
            str(output_b.relative_to(ROOT)).replace("\\", "/"),
        ],
        "contact_sheet": "artifacts/unreal-operator-map-stage4-motion-contact-sheet.png",
        "preserved_stage_tokens": [
            "OperatorStage1",
            "SUMOReadyLargeIntersection",
            "TrafficReadableQueueZone",
            "OperatorStage2",
            "NoTrafficZoneBackplate",
            "OperatorStage3",
            "Stage3VehicleKit",
            "Stage3SignalKit",
            "SUMOReadyAssetPivot",
        ],
    }
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"OPERATOR_STAGE4_MANIFEST={MANIFEST}")


if __name__ == "__main__":
    main()
