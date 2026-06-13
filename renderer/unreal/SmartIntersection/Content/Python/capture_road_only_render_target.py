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
    # UE 5.7 Python constructor order is effectively Roll, Pitch, Yaw.
    return unreal.Rotator(0.0, pitch, yaw)


def log_actor_diagnostics(labels: set[str]) -> None:
    for actor in unreal.EditorLevelLibrary.get_all_level_actors():
        try:
            label = actor.get_actor_label()
        except Exception:
            continue
        if label not in labels:
            continue
        comp = actor.get_component_by_class(unreal.StaticMeshComponent)
        material_name = "none"
        if comp is not None:
            try:
                material = comp.get_material(0)
                if material is not None:
                    material_name = material.get_name()
            except Exception as exc:
                material_name = f"material_error:{exc}"
        try:
            loc = actor.get_actor_location()
            scale = actor.get_actor_scale3d()
            print(
                "ROAD_ONLY_RENDER_TARGET_ACTOR "
                f"label={label} material={material_name} "
                f"loc=({loc.x:.1f},{loc.y:.1f},{loc.z:.1f}) "
                f"scale=({scale.x:.3f},{scale.y:.3f},{scale.z:.3f})"
            )
        except Exception as exc:
            print(f"ROAD_ONLY_RENDER_TARGET_ACTOR label={label} material={material_name} transform_error={exc}")


def spawn_material_swatches(city: str) -> None:
    if os.environ.get("SMART_INTERSECTION_PROOF_SWATCHES") != "1":
        return
    mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube.Cube")
    specs = [
        ("asphalt", -840),
        ("target_shop_sign_cream", -560),
        ("target_yellow_box", -280),
        ("photoreal_sidewalk", 0),
        ("photoreal_brick", 280),
    ]
    for name, x in specs:
        loc = unreal.Vector(x, -760, 520)
        scale = unreal.Vector(1.45, 0.035, 0.95)
        actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.StaticMeshActor,
            loc,
            unreal.Rotator(0, 0, 0),
        )
        actor.set_actor_label(f"RoadOnlyRenderer_{city}_capture_material_swatch_{name}")
        actor.set_actor_scale3d(scale)
        comp = actor.get_component_by_class(unreal.StaticMeshComponent)
        material = unreal.EditorAssetLibrary.load_asset(f"/Game/Materials/RoadOnlyRenderer/M_{city}_{name}")
        if comp is not None and mesh is not None:
            comp.set_static_mesh(mesh)
            if material is not None:
                comp.set_material(0, material)
        print(
            "ROAD_ONLY_RENDER_TARGET_SWATCH "
            f"name={name} material={material.get_name() if material is not None else 'missing'} "
            f"loc=({loc.x:.1f},{loc.y:.1f},{loc.z:.1f}) "
            f"scale=({scale.x:.3f},{scale.y:.3f},{scale.z:.3f})"
        )


def apply_hero6_only_diagnostic() -> None:
    if os.environ.get("SMART_INTERSECTION_PROOF_ONLY_HERO6") != "1":
        return
    for actor in unreal.EditorLevelLibrary.get_all_level_actors():
        try:
            label = actor.get_actor_label()
        except Exception:
            continue
        if label.startswith("TargetHero6_"):
            continue
        try:
            actor.set_actor_hidden_in_game(True)
            actor.set_is_temporarily_hidden_in_editor(True)
        except Exception as exc:
            print(f"ROAD_ONLY_RENDER_TARGET_HIDE_DIAGNOSTIC label={label} error={exc}")
    print("ROAD_ONLY_RENDER_TARGET_HERO6_ONLY enabled=1")


def apply_state_layout_proof_filter() -> None:
    """Hide proof-convergence overlays so the state proof shows road-state actors."""
    hidden = 0
    proof_prefixes = (
        "FinalTargetMatch_",
        "TargetConvergence_",
        "TargetHero_",
        "TargetHero2_",
        "TargetHero3_",
        "TargetHero4_",
        "TargetHero5_",
        "TargetHero6_",
        "TargetHero7_",
        "PhotorealScenePass2_",
    )
    for actor in unreal.EditorLevelLibrary.get_all_level_actors():
        try:
            label = actor.get_actor_label()
        except Exception:
            continue
        if not label.startswith(proof_prefixes):
            continue
        try:
            actor.set_actor_hidden_in_game(True)
            actor.set_is_temporarily_hidden_in_editor(True)
            hidden += 1
        except Exception as exc:
            print(f"ROAD_ONLY_RENDER_TARGET_STATE_FILTER_HIDE_FAIL label={label} error={exc}")
    print(f"ROAD_ONLY_RENDER_TARGET_STATE_LAYOUT_FILTER hidden={hidden}")


def float_env(name: str, default: float) -> float:
    raw = os.environ.get(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        print(f"ROAD_ONLY_RENDER_TARGET_BAD_FLOAT name={name} value={raw!r} default={default}")
        return default


def set_editor_property_if_supported(obj, name: str, value) -> bool:
    try:
        obj.set_editor_property(name, value)
        return True
    except Exception:
        return False


def first_enum_value(enum_type, names: tuple[str, ...]):
    if enum_type is None:
        return None
    for name in names:
        if hasattr(enum_type, name):
            return getattr(enum_type, name)
    return None


def apply_lit_proof_post_process_settings(settings) -> list[str]:
    applied: list[str] = []

    def set_pp(name: str, value) -> None:
        if set_editor_property_if_supported(settings, name, value):
            applied.append(name)

    exposure_method = first_enum_value(
        getattr(unreal, "AutoExposureMethod", None),
        ("AEM_MANUAL", "AEM_BASIC", "AEM_HISTOGRAM"),
    )
    if exposure_method is not None:
        set_pp("override_auto_exposure_method", True)
        set_pp("auto_exposure_method", exposure_method)

    exposure_bias = float_env("SMART_INTERSECTION_LIT_EXPOSURE_BIAS", 2.35)
    set_pp("override_auto_exposure_bias", True)
    set_pp("auto_exposure_bias", exposure_bias)
    for min_name, max_name, min_value, max_value in (
        ("auto_exposure_min_brightness", "auto_exposure_max_brightness", 1.0, 1.0),
        ("auto_exposure_min_ev100", "auto_exposure_max_ev100", -1.0, -1.0),
    ):
        set_pp(f"override_{min_name}", True)
        set_pp(min_name, min_value)
        set_pp(f"override_{max_name}", True)
        set_pp(max_name, max_value)

    set_pp("override_indirect_lighting_intensity", True)
    set_pp("indirect_lighting_intensity", 3.0)
    set_pp("override_ambient_occlusion_intensity", True)
    set_pp("ambient_occlusion_intensity", 0.18)
    set_pp("override_bloom_intensity", True)
    set_pp("bloom_intensity", 0.12)
    set_pp("override_vignette_intensity", True)
    set_pp("vignette_intensity", 0.0)
    return applied


def configure_lit_capture_post_process(city: str, world) -> None:
    for command in (
        "r.DefaultFeature.AutoExposure 0",
        "r.EyeAdaptationQuality 0",
    ):
        try:
            unreal.SystemLibrary.execute_console_command(world, command)
        except Exception as exc:
            print(f"ROAD_ONLY_RENDER_TARGET_CONSOLE_FALLBACK command={command!r} error={exc}")

    try:
        pp = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.PostProcessVolume,
            unreal.Vector(0, 0, 520),
            unreal.Rotator(0, 0, 0),
        )
        pp.set_actor_label(f"RoadOnlyRenderer_{city}_lit_capture_postprocess")
        set_editor_property_if_supported(pp, "b_unbound", True)
        set_editor_property_if_supported(pp, "blend_weight", 1.0)
        set_editor_property_if_supported(pp, "priority", 1000.0)
        settings = pp.get_editor_property("settings")
        applied = apply_lit_proof_post_process_settings(settings)
        pp.set_editor_property("settings", settings)
        print(f"ROAD_ONLY_RENDER_TARGET_LIT_POSTPROCESS actor=volume applied={','.join(applied) if applied else 'none'}")
    except Exception as exc:
        print(f"ROAD_ONLY_RENDER_TARGET_LIT_POSTPROCESS_FALLBACK error={exc}")


def apply_lit_capture_post_process(comp) -> None:
    try:
        set_editor_property_if_supported(comp, "post_process_blend_weight", 1.0)
        settings = comp.get_editor_property("post_process_settings")
        applied = apply_lit_proof_post_process_settings(settings)
        comp.set_editor_property("post_process_settings", settings)
        print(f"ROAD_ONLY_RENDER_TARGET_LIT_POSTPROCESS actor=capture applied={','.join(applied) if applied else 'none'}")
    except Exception as exc:
        print(f"ROAD_ONLY_RENDER_TARGET_LIT_CAPTURE_POSTPROCESS_FALLBACK error={exc}")


def configure_point_light_for_lit_proof(comp, intensity: float, radius: float) -> None:
    comp.set_editor_property("intensity", intensity)
    comp.set_editor_property("attenuation_radius", radius)
    for name, value in (
        ("use_inverse_squared_falloff", False),
        ("falloff_exponent", 0.45),
        ("source_radius", 950.0),
        ("soft_source_radius", 1300.0),
        ("cast_shadows", False),
    ):
        set_editor_property_if_supported(comp, name, value)
    try:
        comp.set_mobility(unreal.ComponentMobility.MOVABLE)
    except Exception:
        pass


def spawn_lit_capture_atmosphere(city: str) -> None:
    sky_class = getattr(unreal, "SkyAtmosphere", None)
    if sky_class is None:
        print("ROAD_ONLY_RENDER_TARGET_SKY_ATMOSPHERE unavailable=1")
        return
    try:
        sky = unreal.EditorLevelLibrary.spawn_actor_from_class(
            sky_class,
            unreal.Vector(0, 0, 0),
            unreal.Rotator(0, 0, 0),
        )
        sky.set_actor_label(f"RoadOnlyRenderer_{city}_lit_capture_sky_atmosphere")
        print("ROAD_ONLY_RENDER_TARGET_SKY_ATMOSPHERE spawned=1")
    except Exception as exc:
        print(f"ROAD_ONLY_RENDER_TARGET_SKY_ATMOSPHERE_FALLBACK error={exc}")


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
    log_actor_diagnostics(
        {
            "FinalTargetMatch_london_dark_wet_road_full_frame",
            "RendererSnapshotState_london_active_signal_group_east_priority",
            "RendererSnapshotState_london_queue_north_count_32_queue_vehicle_marker_0",
            "RendererSnapshotState_london_queue_east_count_18_queue_vehicle_marker_0",
            "RendererSnapshotState_london_emergency_vehicle_direction_east_beacon",
            "RendererSnapshotState_london_pixel_stream_status_ready_beacon",
            "TargetConvergence_london_baked_wet_road_atlas_full_intersection",
            "TargetConvergence_london_overcast_sky_backdrop",
            "TargetHero_london_bright_wet_road_camera_readable",
            "TargetHero_london_overcast_sky_filled_frame",
            "TargetHero_london_side_facade_canyon_0",
            "TargetHero6_london_camera_visible_overcast_backplate",
            "TargetHero6_london_camera_visible_wet_road_plate",
            "TargetHero6_london_lower_frame_pavement_fill",
        }
    )
    spawn_material_swatches(city)
    apply_hero6_only_diagnostic()
    proof_view = os.environ.get("SMART_INTERSECTION_PROOF_VIEW", "layout")
    if proof_view == "state_layout":
        apply_state_layout_proof_filter()

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
    lit_capture = proof_view == "lit_oblique"
    lit_postprocess = os.environ.get("SMART_INTERSECTION_LIT_POSTPROCESS") == "1"
    if lit_capture and lit_postprocess:
        configure_lit_capture_post_process(city, world)
    if lit_capture:
        spawn_lit_capture_atmosphere(city)

    if sun_comp:
        sun_comp.set_editor_property("intensity", float_env("SMART_INTERSECTION_LIT_SUN_INTENSITY", 2.0) if lit_capture else 1.15)
        try:
            sun_comp.set_editor_property("cast_shadows", False)
        except Exception:
            pass
        try:
            sun_comp.set_editor_property("light_source_angle", 7.5)
        except Exception:
            pass
        try:
            sun_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
        except Exception:
            pass

    fill = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.PointLight, unreal.Vector(0, 0, 850), unreal.Rotator(0, 0, 0))
    fill.set_actor_label(f"RoadOnlyRenderer_{city}_capture_fill_visible_proof")
    fill_comp = fill.get_component_by_class(unreal.PointLightComponent)
    if fill_comp:
        if lit_capture:
            configure_point_light_for_lit_proof(
                fill_comp,
                float_env("SMART_INTERSECTION_LIT_FILL_INTENSITY", 5.0),
                float_env("SMART_INTERSECTION_LIT_FILL_RADIUS", 9500.0),
            )
        else:
            fill_comp.set_editor_property("intensity", 760.0)
            fill_comp.set_editor_property("attenuation_radius", 8000.0)
            try:
                fill_comp.set_editor_property("cast_shadows", False)
            except Exception:
                pass
            try:
                fill_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
            except Exception:
                pass
    if lit_capture:
        sky = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 900), unreal.Rotator(0, 0, 0))
        sky.set_actor_label(f"RoadOnlyRenderer_{city}_capture_sky_visible_proof")
        sky_comp = sky.get_component_by_class(unreal.SkyLightComponent)
        if sky_comp:
            sky_comp.set_editor_property("intensity", float_env("SMART_INTERSECTION_LIT_SKY_INTENSITY", 1.0))
            try:
                sky_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
            except Exception:
                pass
            try:
                sky_comp.recapture_sky()
            except Exception:
                pass

    if proof_view == "state_layout":
        # RendererSnapshotState state proof: straight overhead framing so queue
        # markers, active phase lenses, and emergency beacons are inspectable.
        origin = unreal.Vector(0, 0, 2100)
        target = unreal.Vector(0, 0, 0)
        rotation = unreal.Rotator(0, -90, 0)
    elif proof_view in {"oblique", "lit_oblique"}:
        # Final-target framing: elevated corner camera in front of the near building row,
        # looking across the wet intersection rather than through facade meshes.
        # Closer target-like corner CCTV/elevated viewport. The wider isometric view makes
        # the scene read as a model. This crop gives road/facade/foreground rail more screen area.
        origin = unreal.Vector(-980, -1080, 650)
        target = unreal.Vector(-90, -120, 245)
        rotation = look_at_rotation(origin, target)
    else:
        # Top-down, near-orthographic proof view. The previous oblique proof left most pixels black
        # and was unreadable after Telegram/mobile compression.
        origin = unreal.Vector(0, -80, 2300)
        target = unreal.Vector(0, 0, 0)
        rotation = look_at_rotation(origin, target)
    if lit_capture:
        camera_fill = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.PointLight, origin, unreal.Rotator(0, 0, 0))
        camera_fill.set_actor_label(f"RoadOnlyRenderer_{city}_camera_fill_visible_proof")
        camera_fill_comp = camera_fill.get_component_by_class(unreal.PointLightComponent)
        if camera_fill_comp:
            configure_point_light_for_lit_proof(
                camera_fill_comp,
                float_env("SMART_INTERSECTION_LIT_CAMERA_FILL_INTENSITY", 2.8),
                float_env("SMART_INTERSECTION_LIT_CAMERA_FILL_RADIUS", 6500.0),
            )
        upper_fill = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.PointLight,
            unreal.Vector(-120, 320, 1120),
            unreal.Rotator(0, 0, 0),
        )
        upper_fill.set_actor_label(f"RoadOnlyRenderer_{city}_upper_context_fill_visible_proof")
        upper_fill_comp = upper_fill.get_component_by_class(unreal.PointLightComponent)
        if upper_fill_comp:
            configure_point_light_for_lit_proof(
                upper_fill_comp,
                float_env("SMART_INTERSECTION_LIT_UPPER_FILL_INTENSITY", 3.8),
                float_env("SMART_INTERSECTION_LIT_UPPER_FILL_RADIUS", 2200.0),
            )

    capture = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.SceneCapture2D, origin, rotation)
    capture.set_actor_label(f"RoadOnlyRenderer_{city}_scene_capture_visible_proof")
    comp = capture.get_component_by_class(unreal.SceneCaptureComponent2D)
    if comp is None:
        raise SystemExit("SceneCaptureComponent2D unavailable")
    if lit_capture and lit_postprocess:
        apply_lit_capture_post_process(comp)

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
        capture_source = None
        if lit_capture and hasattr(unreal.SceneCaptureSource, "SCS_FINAL_COLOR_LDR"):
            capture_source = unreal.SceneCaptureSource.SCS_FINAL_COLOR_LDR
        else:
            # Use base color for visual-acceptance proof. The generated materials are still being tuned,
            # so base-color proof remains the stable composition gate.
            capture_source = unreal.SceneCaptureSource.SCS_BASE_COLOR
        try:
            comp.set_editor_property("capture_source", capture_source)
        except Exception:
            comp.capture_source = capture_source
        try:
            print(f"ROAD_ONLY_RENDER_TARGET_CAPTURE_SOURCE city={city} source={comp.get_editor_property('capture_source')}")
        except Exception:
            print(f"ROAD_ONLY_RENDER_TARGET_CAPTURE_SOURCE city={city} source={capture_source}")
    except Exception:
        try:
            comp.set_editor_property("capture_source", unreal.SceneCaptureSource.SCS_BASE_COLOR)
        except Exception:
            try:
                comp.capture_source = unreal.SceneCaptureSource.SCS_BASE_COLOR
            except Exception:
                pass
    comp.fov_angle = 52.0
    if proof_view in {"oblique", "lit_oblique"}:
        default_oblique_fov = 36.0 if lit_capture else 47.0
        comp.fov_angle = float_env("SMART_INTERSECTION_PROOF_OBLIQUE_FOV", default_oblique_fov)
    else:
        try:
            comp.projection_type = unreal.CameraProjectionMode.ORTHOGRAPHIC
            comp.ortho_width = 1900.0 if proof_view == "state_layout" else 1600.0
        except Exception:
            pass

    def finish_loading_before_capture(phase: str) -> bool:
        automation = getattr(unreal, "AutomationLibrary", None)
        if automation is None or not hasattr(automation, "finish_loading_before_screenshot"):
            return False
        print(f"ROAD_ONLY_RENDER_TARGET_FINISH_LOADING city={city} phase={phase}")
        automation.finish_loading_before_screenshot()
        return True

    if finish_loading_before_capture("pre_capture"):
        warmup_frames = int(os.environ.get("SMART_INTERSECTION_PROOF_WARMUP_FRAMES", "4"))
        for _ in range(max(1, warmup_frames)):
            comp.capture_scene()
        finish_loading_before_capture("post_warmup")
        comp.capture_scene()
    else:
        warmup_seconds = float(os.environ.get("SMART_INTERSECTION_PROOF_WARMUP_SECONDS", "8.0"))
        if warmup_seconds > 0:
            comp.capture_scene()
            print(f"ROAD_ONLY_RENDER_TARGET_WARMUP city={city} seconds={warmup_seconds:.1f}")
            time.sleep(warmup_seconds)
            for _ in range(3):
                comp.capture_scene()
                time.sleep(0.35)
        comp.capture_scene()
        settle_seconds = float(os.environ.get("SMART_INTERSECTION_PROOF_SETTLE_SECONDS", "5.0"))
        if settle_seconds > 0:
            print(f"ROAD_ONLY_RENDER_TARGET_SETTLE city={city} seconds={settle_seconds:.1f}")
            time.sleep(settle_seconds)
            comp.capture_scene()
            post_capture_seconds = float(os.environ.get("SMART_INTERSECTION_PROOF_POST_CAPTURE_SECONDS", "4.0"))
            if post_capture_seconds > 0:
                print(f"ROAD_ONLY_RENDER_TARGET_POST_CAPTURE city={city} seconds={post_capture_seconds:.1f}")
                time.sleep(post_capture_seconds)

    out_dir = str(output_path.parent)
    out_file = output_path.name
    ok = unreal.RenderingLibrary.export_render_target(world, rt, out_dir, out_file)
    print(f"ROAD_ONLY_RENDER_TARGET_EXPORTED city={city} map={map_path} output={output_path} ok={ok}")


if __name__ == "__main__":
    main()
