from __future__ import annotations

import math
import os
import time
from pathlib import Path

try:
    import unreal  # type: ignore
except Exception as exc:
    raise SystemExit(f"Unreal Python module required: {exc}")


def look_at_rotation(origin, target):
    dx = target.x - origin.x
    dy = target.y - origin.y
    dz = target.z - origin.z
    yaw = math.degrees(math.atan2(dy, dx))
    distance_xy = math.sqrt(dx * dx + dy * dy)
    pitch = math.degrees(math.atan2(dz, distance_xy))
    return unreal.Rotator(0.0, pitch, yaw)


def set_editor_property_if_supported(obj, name: str, value) -> None:
    try:
        obj.set_editor_property(name, value)
    except Exception:
        pass


def describe_vector(value) -> str:
    return f"({value.x:.1f},{value.y:.1f},{value.z:.1f})"


def describe_rotator(value) -> str:
    return f"(pitch={value.pitch:.2f},yaw={value.yaw:.2f},roll={value.roll:.2f})"


def actor_label(actor) -> str:
    try:
        return actor.get_actor_label()
    except Exception:
        return actor.get_name()


def describe_material_input(mat, material_property) -> str:
    try:
        node = unreal.MaterialEditingLibrary.get_material_property_input_node(mat, material_property)
        if node is None:
            return "none"
        constant = node.get_editor_property("constant")
        return (
            f"{node.get_class().get_name()}"
            f"({constant.r:.2f},{constant.g:.2f},{constant.b:.2f},{constant.a:.2f})"
        )
    except Exception as exc:
        return f"error={exc}"


def log_stage1_scene_evidence() -> None:
    actors = list(unreal.EditorLevelLibrary.get_all_level_actors())
    labels = [actor_label(actor) for actor in actors]
    stage1_labels = [label for label in labels if "OperatorStage1" in label or "TrafficReadableQueueZone" in label]
    print(f"OPERATOR_STAGE1_CAPTURE_ACTORS total={len(actors)} stage1={len(stage1_labels)}")
    for label in (
        "OperatorStage1_SUMOReadyLargeIntersection_major_arterial_asphalt",
        "OperatorStage1_SUMOReadyLargeIntersection_cross_arterial_asphalt",
        "TrafficReadableQueueZone_OperatorStage1_north_boundary",
        "OperatorStage1_SUMOPlaceholderVehicleQueue_north_00_QueueCapacity_40_body",
    ):
        matches = [actor for actor in actors if actor_label(actor) == label]
        if not matches:
            print(f"OPERATOR_STAGE1_CAPTURE_ACTOR_MISSING label={label}")
            continue
        actor = matches[0]
        loc = actor.get_actor_location()
        try:
            center, extent = actor.get_actor_bounds(False)
            print(
                "OPERATOR_STAGE1_CAPTURE_ACTOR "
                f"label={label} loc={describe_vector(loc)} center={describe_vector(center)} extent={describe_vector(extent)}"
            )
        except Exception as exc:
            print(f"OPERATOR_STAGE1_CAPTURE_ACTOR label={label} loc={describe_vector(loc)} bounds_error={exc}")
        comp = actor.get_component_by_class(unreal.StaticMeshComponent)
        if comp is None:
            continue
        mat = comp.get_material(0)
        if mat is None:
            print(f"OPERATOR_STAGE1_CAPTURE_MATERIAL label={label} material=none")
            continue
        print(
            "OPERATOR_STAGE1_CAPTURE_MATERIAL "
            f"label={label} material={mat.get_name()} "
            f"base={describe_material_input(mat, unreal.MaterialProperty.MP_BASE_COLOR)} "
            f"emissive={describe_material_input(mat, unreal.MaterialProperty.MP_EMISSIVE_COLOR)}"
        )


def main() -> None:
    output = os.environ.get("SMART_INTERSECTION_OPERATOR_STAGE1_PROOF_OUTPUT")
    if not output:
        raise SystemExit("SMART_INTERSECTION_OPERATOR_STAGE1_PROOF_OUTPUT is required")
    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        output_path.unlink()

    map_path = "/Game/Maps/Generated/smart_intersection_rebuild"
    if not unreal.EditorAssetLibrary.does_asset_exist(map_path):
        raise SystemExit(f"map asset missing: {map_path}")

    unreal.EditorLevelLibrary.load_level(map_path)
    world = unreal.EditorLevelLibrary.get_editor_world()
    if world is None:
        raise SystemExit("editor world unavailable")
    log_stage1_scene_evidence()

    for command in ("DisableAllScreenMessages", "r.DefaultFeature.AutoExposure 0", "r.EyeAdaptationQuality 0"):
        try:
            unreal.SystemLibrary.execute_console_command(world, command)
        except Exception:
            pass

    sun = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.DirectionalLight,
        unreal.Vector(-1800, -2200, 3200),
        unreal.Rotator(-52, -35, 0),
    )
    sun.set_actor_label("OperatorStage1_capture_daylight")
    sun_comp = sun.get_component_by_class(unreal.DirectionalLightComponent)
    if sun_comp:
        sun_comp.set_editor_property("intensity", 7.2)
        set_editor_property_if_supported(sun_comp, "cast_shadows", False)
        set_editor_property_if_supported(sun_comp, "light_source_angle", 6.0)
        try:
            sun_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
        except Exception:
            pass

    sky = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 1200), unreal.Rotator(0, 0, 0))
    sky.set_actor_label("OperatorStage1_capture_skylight")
    sky_comp = sky.get_component_by_class(unreal.SkyLightComponent)
    if sky_comp:
        sky_comp.set_editor_property("intensity", 5.0)
        try:
            sky_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
            sky_comp.recapture_sky()
        except Exception:
            pass

    pp = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.PostProcessVolume, unreal.Vector(0, 0, 900), unreal.Rotator(0, 0, 0))
    pp.set_actor_label("OperatorStage1_capture_postprocess")
    set_editor_property_if_supported(pp, "b_unbound", True)
    set_editor_property_if_supported(pp, "blend_weight", 1.0)
    settings = pp.get_editor_property("settings")
    for name, value in (
        ("override_auto_exposure_bias", True),
        ("auto_exposure_bias", 2.2),
        ("override_bloom_intensity", True),
        ("bloom_intensity", 0.05),
        ("override_vignette_intensity", True),
        ("vignette_intensity", 0.0),
    ):
        set_editor_property_if_supported(settings, name, value)
    pp.set_editor_property("settings", settings)

    origin = unreal.Vector(-2450, -4300, 2650)
    target = unreal.Vector(120, 120, 0)
    rotation = look_at_rotation(origin, target)
    print(
        "OPERATOR_STAGE1_CAPTURE_CAMERA "
        f"origin={describe_vector(origin)} target={describe_vector(target)} rotation={describe_rotator(rotation)}"
    )
    unreal.EditorLevelLibrary.set_level_viewport_camera_info(origin, rotation)

    automation = getattr(unreal, "AutomationLibrary", None)
    if automation is not None and hasattr(automation, "finish_loading_before_screenshot"):
        automation.finish_loading_before_screenshot()

    capture = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.SceneCapture2D, origin, rotation)
    capture.set_actor_label("OperatorStage1_scene_capture_operator_proof")
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
    comp.fov_angle = 42.0
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
    print(f"OPERATOR_STAGE1_RENDER_TARGET_EXPORTED map={map_path} output={output_path} ok={ok}")


if __name__ == "__main__":
    main()
