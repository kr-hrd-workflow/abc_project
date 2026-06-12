from __future__ import annotations

import math
import os
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
    # UE 5.7 Python constructor order is effectively Roll, Pitch, Yaw.
    return unreal.Rotator(0.0, pitch, yaw)


def main() -> None:
    city = os.environ.get("SMART_INTERSECTION_CITY", "london")
    output = os.environ.get("SMART_INTERSECTION_PROOF_OUTPUT")
    if not output:
        raise SystemExit("SMART_INTERSECTION_PROOF_OUTPUT is required")
    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    map_path = f"/Game/Maps/Generated/{city}_RoadOnly"
    if not unreal.EditorAssetLibrary.does_asset_exist(map_path):
        raise SystemExit(f"map asset missing: {map_path}")

    unreal.EditorLevelLibrary.load_level(map_path)
    world = unreal.EditorLevelLibrary.get_editor_world()
    if world is None:
        raise SystemExit("editor world unavailable")

    try:
        unreal.SystemLibrary.execute_console_command(world, "DisableAllScreenMessages")
    except Exception:
        pass

    # Add very explicit temporary capture lighting in the loaded map. These are saved only if caller saves dirty packages.
    sun = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.DirectionalLight,
        unreal.Vector(-600, -650, 1400),
        unreal.Rotator(-55, 35, 0),
    )
    sun.set_actor_label(f"RoadOnlyRenderer_{city}_capture_sun_visible_proof")
    sun_comp = sun.get_component_by_class(unreal.DirectionalLightComponent)
    if sun_comp:
        sun_comp.set_editor_property("intensity", 1.8)
        try:
            sun_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
        except Exception:
            pass

    fill = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.PointLight, unreal.Vector(0, 0, 850), unreal.Rotator(0, 0, 0))
    fill.set_actor_label(f"RoadOnlyRenderer_{city}_capture_fill_visible_proof")
    fill_comp = fill.get_component_by_class(unreal.PointLightComponent)
    if fill_comp:
        fill_comp.set_editor_property("intensity", 850.0)
        fill_comp.set_editor_property("attenuation_radius", 5000.0)
        try:
            fill_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
        except Exception:
            pass

    proof_view = os.environ.get("SMART_INTERSECTION_PROOF_VIEW", "layout")
    if proof_view == "oblique":
        origin = unreal.Vector(-1650, -1260, 920)
        target = unreal.Vector(80, 20, 120)
    else:
        # Top-down, near-orthographic proof view. The previous oblique proof left most pixels black
        # and was unreadable after Telegram/mobile compression.
        origin = unreal.Vector(0, -80, 2300)
        target = unreal.Vector(0, 0, 0)
    rotation = look_at_rotation(origin, target)

    capture = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.SceneCapture2D, origin, rotation)
    capture.set_actor_label(f"RoadOnlyRenderer_{city}_scene_capture_visible_proof")
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
    try:
        comp.capture_source = unreal.SceneCaptureSource.SCS_BASE_COLOR
    except Exception:
        try:
            comp.capture_source = unreal.SceneCaptureSource.SCS_BASE_COLOR
        except Exception:
            pass
    comp.fov_angle = 55.0
    if proof_view == "oblique":
        comp.fov_angle = 38.0
    else:
        try:
            comp.projection_type = unreal.CameraProjectionMode.ORTHOGRAPHIC
            comp.ortho_width = 1600.0
        except Exception:
            pass
    comp.capture_scene()

    out_dir = str(output_path.parent)
    out_file = output_path.name
    ok = unreal.RenderingLibrary.export_render_target(world, rt, out_dir, out_file)
    print(f"ROAD_ONLY_RENDER_TARGET_EXPORTED city={city} map={map_path} output={output_path} ok={ok}")


if __name__ == "__main__":
    main()
