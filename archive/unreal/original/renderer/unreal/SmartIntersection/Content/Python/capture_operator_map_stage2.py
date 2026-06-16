from __future__ import annotations

import math
import os
from pathlib import Path
import time

try:
    import unreal  # type: ignore
except Exception as exc:
    raise SystemExit(f"Unreal Python module unavailable: {exc}")


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


def describe_rotator(rot) -> str:
    return f"(pitch={rot.pitch:.2f},yaw={rot.yaw:.2f},roll={rot.roll:.2f})"


def find_actor_by_label(label: str):
    for actor in unreal.EditorLevelLibrary.get_all_level_actors():
        try:
            if actor.get_actor_label() == label:
                return actor
        except Exception:
            continue
    return None


def log_actor_material(actor, label: str) -> None:
    comp = actor.get_component_by_class(unreal.StaticMeshComponent)
    if comp is None:
        print(f"OPERATOR_STAGE2_CAPTURE_MATERIAL label={label} material=none")
        return
    material = comp.get_material(0)
    print(
        "OPERATOR_STAGE2_CAPTURE_MATERIAL "
        f"label={label} material={material.get_name() if material else 'none'}"
    )


def log_stage2_scene_evidence() -> None:
    actors = list(unreal.EditorLevelLibrary.get_all_level_actors())
    labels = []
    for actor in actors:
        try:
            labels.append(actor.get_actor_label())
        except Exception:
            pass
    stage2_labels = [label for label in labels if "OperatorStage2" in label or "TrafficReadableQueueZone" in label]
    print(f"OPERATOR_STAGE2_CAPTURE_ACTORS total={len(actors)} stage2={len(stage2_labels)}")
    required_labels = [
        "OperatorStage2_Stage2ContextGeometry_facade_northwest_block",
        "OperatorStage2_Stage2ContextGeometry_curb_north_inner",
        "OperatorStage2_Stage2ContextGeometry_traffic_cabinet_cabinet_nw",
        "OperatorStage2_Stage2ContextGeometry_sign_plate_guide_sign_east",
        "TrafficReadableQueueZone_OperatorStage1_north_boundary",
    ]
    for label in required_labels:
        actor = find_actor_by_label(label)
        if actor is None:
            print(f"OPERATOR_STAGE2_CAPTURE_ACTOR_MISSING label={label}")
            raise SystemExit(f"required Stage 2 actor label missing: {label}")
        try:
            loc = actor.get_actor_location()
            scale = actor.get_actor_scale3d()
            print(
                "OPERATOR_STAGE2_CAPTURE_ACTOR "
                f"label={label} loc={describe_vector(loc)} scale={describe_vector(scale)}"
            )
        except Exception as exc:
            print(f"OPERATOR_STAGE2_CAPTURE_ACTOR label={label} bounds_error={exc}")
        log_actor_material(actor, label)


def main() -> None:
    output = os.environ.get("SMART_INTERSECTION_OPERATOR_STAGE2_PROOF_OUTPUT")
    if not output:
        raise SystemExit("SMART_INTERSECTION_OPERATOR_STAGE2_PROOF_OUTPUT is required")
    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        output_path.unlink()

    map_path = "/Game/Maps/Generated/smart_intersection_rebuild_stage2"
    if not unreal.EditorAssetLibrary.does_asset_exist(map_path):
        raise SystemExit(f"map asset missing: {map_path}")

    unreal.EditorLevelLibrary.load_level(map_path)
    world = unreal.EditorLevelLibrary.get_editor_world()
    if world is None:
        raise SystemExit("editor world unavailable")
    log_stage2_scene_evidence()

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
    sun.set_actor_label("OperatorStage2_capture_daylight")
    sun_comp = sun.get_component_by_class(unreal.DirectionalLightComponent)
    if sun_comp:
        sun_comp.set_editor_property("intensity", 1.1)
        set_editor_property_if_supported(sun_comp, "cast_shadows", False)
        set_editor_property_if_supported(sun_comp, "light_source_angle", 6.0)
        try:
            sun_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
        except Exception:
            pass

    sky = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 1400), unreal.Rotator(0, 0, 0))
    sky.set_actor_label("OperatorStage2_capture_skylight")
    sky_comp = sky.get_component_by_class(unreal.SkyLightComponent)
    if sky_comp:
        sky_comp.set_editor_property("intensity", 0.7)
        try:
            sky_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
            sky_comp.recapture_sky()
        except Exception:
            pass

    pp = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.PostProcessVolume, unreal.Vector(0, 0, 900), unreal.Rotator(0, 0, 0))
    pp.set_actor_label("OperatorStage2_capture_postprocess")
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

    origin = unreal.Vector(-2450, -4300, 2650)
    target = unreal.Vector(120, 120, 0)
    rotation = look_at_rotation(origin, target)
    print(
        "OPERATOR_STAGE2_CAPTURE_CAMERA "
        f"origin={describe_vector(origin)} target={describe_vector(target)} rotation={describe_rotator(rotation)}"
    )
    unreal.EditorLevelLibrary.set_level_viewport_camera_info(origin, rotation)

    automation = getattr(unreal, "AutomationLibrary", None)
    if automation is not None and hasattr(automation, "finish_loading_before_screenshot"):
        automation.finish_loading_before_screenshot()

    capture = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.SceneCapture2D, origin, rotation)
    capture.set_actor_label("OperatorStage2_scene_capture_operator_proof")
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
        try:
            comp.capture_source = unreal.SceneCaptureSource.SCS_SCENE_COLOR_HDR
        except Exception:
            pass

    for _ in range(4):
        comp.capture_scene()
        time.sleep(0.25)
    if automation is not None and hasattr(automation, "finish_loading_before_screenshot"):
        automation.finish_loading_before_screenshot()
    comp.capture_scene()

    ok = unreal.RenderingLibrary.export_render_target(world, rt, str(output_path.parent), output_path.name)
    print(f"OPERATOR_STAGE2_RENDER_TARGET_EXPORTED map={map_path} output={output_path} ok={ok}")


if __name__ == "__main__":
    main()
