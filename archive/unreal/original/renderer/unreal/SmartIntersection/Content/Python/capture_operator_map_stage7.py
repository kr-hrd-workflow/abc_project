from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path
import time

try:
    import unreal  # type: ignore
except Exception as exc:
    raise SystemExit(f"Unreal Python module unavailable: {exc}")


BASE_PATH = Path(__file__).with_name("capture_operator_map_stage6.py")
spec = importlib.util.spec_from_file_location("capture_operator_map_stage6_base", BASE_PATH)
if spec is None or spec.loader is None:
    raise SystemExit(f"Unable to load Stage 6 capture base: {BASE_PATH}")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

ROOT = Path(__file__).resolve().parents[5]
UE_ROOT = ROOT / "renderer" / "unreal" / "SmartIntersection"
SNAPSHOT_FIXTURE = ROOT / "apps" / "api" / "app" / "fixtures" / "stage4_renderer_snapshots.json"
MANIFEST = UE_ROOT / "GeneratedProof" / "smart_intersection_rebuild_operator_stage7_production_photoreal_manifest.json"
MAP_BEFORE = "/Game/Maps/Generated/smart_intersection_rebuild_operator_stage6"
MAP_AFTER = "/Game/Maps/Generated/smart_intersection_rebuild_operator_stage7"
SNAPSHOT_ID = "stage4-fixture-a"
BEFORE_CAMERA_ORIGIN = unreal.Vector(0, -7200, 5200)
BEFORE_CAMERA_TARGET = unreal.Vector(0, 1800, -850)
BEFORE_CAMERA_FOV = 46.0
AFTER_CAMERA_ORIGIN = unreal.Vector(0, -7500, 4800)
AFTER_CAMERA_TARGET = unreal.Vector(0, 2800, 120)
AFTER_CAMERA_FOV = 49.0


def configure_stage7_capture_world(label: str):
    world = unreal.EditorLevelLibrary.get_editor_world()
    if world is None:
        raise SystemExit("editor world unavailable")
    for command in (
        "DisableAllScreenMessages",
        "r.DefaultFeature.AutoExposure 0",
        "r.EyeAdaptationQuality 0",
        "r.Tonemapper.Sharpen 0.12",
    ):
        try:
            unreal.SystemLibrary.execute_console_command(world, command)
        except Exception:
            pass

    for actor in unreal.EditorLevelLibrary.get_all_level_actors():
        try:
            actor_label = actor.get_actor_label()
        except Exception:
            continue
        if not actor_label.startswith("OperatorStage6_"):
            continue
        if not any(token in actor_label for token in ("key_light", "skylight", "postprocess")):
            continue
        try:
            actor.set_actor_hidden_in_game(True)
            actor.set_is_temporarily_hidden_in_editor(True)
        except Exception:
            pass
        for component_class in (
            getattr(unreal, "DirectionalLightComponent", None),
            getattr(unreal, "SkyLightComponent", None),
        ):
            if component_class is None:
                continue
            comp = actor.get_component_by_class(component_class)
            if comp is None:
                continue
            try:
                comp.set_editor_property("intensity", 0.0)
            except Exception:
                pass

    sun = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.DirectionalLight,
        unreal.Vector(-3300, -4200, 5000),
        unreal.Rotator(-48, -34, 0),
    )
    sun.set_actor_label(f"{label}_OPERATOR_STAGE7_CAPTURE_soft_overcast_key_light")
    sun_comp = sun.get_component_by_class(unreal.DirectionalLightComponent)
    if sun_comp:
        sun_comp.set_editor_property("intensity", 0.92)
        base.set_editor_property_if_supported(sun_comp, "cast_shadows", False)
        base.set_editor_property_if_supported(sun_comp, "light_source_angle", 46.0)
        try:
            sun_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
        except Exception:
            pass

    fill = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.DirectionalLight,
        unreal.Vector(-2600, -6100, 3000),
        unreal.Rotator(-18, 68, 0),
    )
    fill.set_actor_label(f"{label}_OPERATOR_STAGE7_CAPTURE_camera_side_fill")
    fill_comp = fill.get_component_by_class(unreal.DirectionalLightComponent)
    if fill_comp:
        fill_comp.set_editor_property("intensity", 1.82)
        base.set_editor_property_if_supported(fill_comp, "cast_shadows", False)
        base.set_editor_property_if_supported(fill_comp, "light_source_angle", 54.0)
        try:
            fill_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
        except Exception:
            pass

    sky = unreal.EditorLevelLibrary.spawn_actor_from_class(
        unreal.SkyLight,
        unreal.Vector(0, 0, 1900),
        unreal.Rotator(0, 0, 0),
    )
    sky.set_actor_label(f"{label}_OPERATOR_STAGE7_CAPTURE_wet_overcast_skylight")
    sky_comp = sky.get_component_by_class(unreal.SkyLightComponent)
    if sky_comp:
        sky_comp.set_editor_property("intensity", 4.85)
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
    pp.set_actor_label(f"{label}_OPERATOR_STAGE7_CAPTURE_POSTPROCESS_soft_traffic_camera_grade")
    base.set_editor_property_if_supported(pp, "b_unbound", True)
    base.set_editor_property_if_supported(pp, "blend_weight", 1.0)
    try:
        settings = pp.get_editor_property("settings")
        for name, value in (
            ("override_auto_exposure_bias", True),
            ("auto_exposure_bias", 1.45),
            ("override_bloom_intensity", True),
            ("bloom_intensity", 0.025),
            ("override_vignette_intensity", True),
            ("vignette_intensity", 0.02),
            ("override_color_saturation", True),
            ("color_saturation", unreal.Vector4(0.92, 0.94, 0.94, 1.0)),
            ("override_color_contrast", True),
            ("color_contrast", unreal.Vector4(0.96, 0.96, 0.95, 1.0)),
        ):
            base.set_editor_property_if_supported(settings, name, value)
        pp.set_editor_property("settings", settings)
    except Exception as exc:
        print(f"OPERATOR_STAGE7_CAPTURE_POSTPROCESS_FALLBACK error={exc}")
    return world


def build_scene_capture(origin, rotation, label: str, fov: float):
    capture = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.SceneCapture2D, origin, rotation)
    capture.set_actor_label(label)
    comp = capture.get_component_by_class(unreal.SceneCaptureComponent2D)
    if comp is None:
        raise SystemExit("SceneCaptureComponent2D unavailable")
    try:
        comp.hide_actor_components(capture)
    except Exception:
        try:
            comp.set_editor_property("hidden_actors", [capture])
        except Exception:
            pass
    rt = unreal.TextureRenderTarget2D()
    if hasattr(rt, "init_auto_format"):
        rt.init_auto_format(2400, 1350)
    elif hasattr(rt, "init_custom_format"):
        rt.init_custom_format(2400, 1350, unreal.PixelFormat.PF_B8G8R8A8, False)
    else:
        rt.set_editor_property("size_x", 2400)
        rt.set_editor_property("size_y", 1350)
        if hasattr(unreal, "TextureRenderTargetFormat"):
            rt.set_editor_property("render_target_format", unreal.TextureRenderTargetFormat.RTF_RGBA8)
    comp.texture_target = rt
    comp.fov_angle = fov
    try:
        comp.set_editor_property("capture_source", unreal.SceneCaptureSource.SCS_SCENE_COLOR_HDR)
    except Exception:
        pass
    return comp, rt


def capture_map(
    map_path: str,
    output_path: Path,
    label: str,
    camera_origin,
    camera_target,
    camera_fov: float,
) -> dict[str, object]:
    if not unreal.EditorAssetLibrary.does_asset_exist(map_path):
        raise SystemExit(f"map asset missing: {map_path}")
    unreal.EditorLevelLibrary.load_level(map_path)
    world = configure_stage7_capture_world(label)
    controller = base.get_controller_actor()
    snapshot = base.load_fixture_snapshot()
    rotation = base.look_at_rotation(camera_origin, camera_target)
    print(
        "OPERATOR_STAGE7_CAPTURE_CAMERA "
        f"map={map_path} origin={base.describe_vector(camera_origin)} target={base.describe_vector(camera_target)}"
    )
    unreal.EditorLevelLibrary.set_level_viewport_camera_info(camera_origin, rotation)
    comp, rt = build_scene_capture(camera_origin, rotation, f"{label}_scene_capture", camera_fov)
    snapshot_evidence = base.apply_snapshot(controller, snapshot)
    base.capture_png(world, comp, rt, output_path)
    return {
        "map": map_path,
        "proof_image": str(output_path.relative_to(ROOT)).replace("\\", "/"),
        "camera": {
            "origin_cm": [camera_origin.x, camera_origin.y, camera_origin.z],
            "target_cm": [camera_target.x, camera_target.y, camera_target.z],
            "fov_degrees": camera_fov,
        },
        "snapshot": snapshot_evidence,
    }


def update_manifest(before: dict[str, object], after: dict[str, object], before_path: Path, after_path: Path, contact_sheet: Path) -> None:
    if MANIFEST.exists():
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    else:
        manifest = {}
    manifest.update(
        {
            "capture_schema": "operator-stage7-unreal-before-after-production-photoreal-proof-v1",
            "simulation_source": "sumo_traci_fixture",
            "live_sumo_status": "deferred_until_real_sumo_traci_runtime_metadata_proves_simulation_source_sumo_traci",
            "fixture_snapshot_path": str(SNAPSHOT_FIXTURE.relative_to(ROOT)).replace("\\", "/"),
            "proof_before_image": str(before_path.relative_to(ROOT)).replace("\\", "/"),
            "proof_after_image": str(after_path.relative_to(ROOT)).replace("\\", "/"),
            "proof_contact_sheet": str(contact_sheet.relative_to(ROOT)).replace("\\", "/"),
            "capture_camera": {
                "before": {
                    "origin_cm": [BEFORE_CAMERA_ORIGIN.x, BEFORE_CAMERA_ORIGIN.y, BEFORE_CAMERA_ORIGIN.z],
                    "target_cm": [BEFORE_CAMERA_TARGET.x, BEFORE_CAMERA_TARGET.y, BEFORE_CAMERA_TARGET.z],
                    "fov_degrees": BEFORE_CAMERA_FOV,
                },
                "after": {
                    "origin_cm": [AFTER_CAMERA_ORIGIN.x, AFTER_CAMERA_ORIGIN.y, AFTER_CAMERA_ORIGIN.z],
                    "target_cm": [AFTER_CAMERA_TARGET.x, AFTER_CAMERA_TARGET.y, AFTER_CAMERA_TARGET.z],
                    "fov_degrees": AFTER_CAMERA_FOV,
                },
            },
            "captures": [before, after],
            "runtime_readiness_command": "npm run runtime:readiness",
            "renderer_policy": "SUMO/TraCI is truth; FastAPI orchestrates state; Unreal renders; Pixel Streaming transports frames only.",
            "human_visual_inspection": "recorded in artifacts/unreal-operator-map-stage7-visual-verdict.json",
            "visual_completion_rule": "references and loose textures are not completion evidence; the Unreal-rendered operator proof and reviewer verdict are required",
        }
    )
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"OPERATOR_STAGE7_MANIFEST={MANIFEST}")


def main() -> None:
    before_path = Path(os.environ.get(
        "SMART_INTERSECTION_OPERATOR_STAGE7_BEFORE_OUTPUT",
        ROOT / "artifacts" / "unreal-operator-map-stage7-before.png",
    ))
    after_path = Path(os.environ.get(
        "SMART_INTERSECTION_OPERATOR_STAGE7_AFTER_OUTPUT",
        ROOT / "artifacts" / "unreal-operator-map-stage7-production-photoreal-proof.png",
    ))
    contact_sheet = Path(os.environ.get(
        "SMART_INTERSECTION_OPERATOR_STAGE7_CONTACT_SHEET",
        ROOT / "artifacts" / "unreal-operator-map-stage7-before-after-contact-sheet.png",
    ))

    before = capture_map(
        MAP_BEFORE,
        before_path,
        "OperatorStage7_before_stage6_photoreal_proof",
        BEFORE_CAMERA_ORIGIN,
        BEFORE_CAMERA_TARGET,
        BEFORE_CAMERA_FOV,
    )
    time.sleep(0.5)
    after = capture_map(
        MAP_AFTER,
        after_path,
        "OperatorStage7_after_production_photoreal_operator_view",
        AFTER_CAMERA_ORIGIN,
        AFTER_CAMERA_TARGET,
        AFTER_CAMERA_FOV,
    )
    update_manifest(before, after, before_path, after_path, contact_sheet)


if __name__ == "__main__":
    main()
