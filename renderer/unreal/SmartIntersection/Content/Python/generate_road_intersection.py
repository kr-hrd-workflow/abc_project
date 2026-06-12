# RoadOnlyRenderer generator for SmartIntersection.
# Architecture: SUMO truth source; Python TraCI bridge streams state later; Unreal renders only.
# Scope: no vehicles, no pedestrians, no gameplay, no UE-side traffic simulation.
# Asset provenance: project procedural assets plus ambientCG CC0 sources under CC0AmbientCG; source refresh uses install_cc0_texture_sources.
from __future__ import annotations

import json
import os
from pathlib import Path

try:
    import unreal  # type: ignore
except Exception:  # normal when running verifier/dry tooling outside UE
    unreal = None


MATERIAL_COLORS = {
    # Deliberately brighter than real asphalt for proof screenshots: Telegram/mobile compression
    # made the physically darker first pass read as an empty black image.
    "background": (0.20, 0.23, 0.24, 1.0),
    "asphalt": (0.30, 0.32, 0.31, 1.0),
    "asphalt_patch": (0.40, 0.39, 0.34, 1.0),
    "paint": (1.00, 0.98, 0.86, 1.0),
    "yellow": (1.00, 0.86, 0.04, 1.0),
    "bus_lane": (0.86, 0.11, 0.07, 1.0),
    "bike_lane": (0.05, 0.70, 0.32, 1.0),
    "curb": (0.72, 0.70, 0.62, 1.0),
    "island": (0.58, 0.56, 0.48, 1.0),
    "tactile": (0.95, 0.72, 0.12, 1.0),
    "metal": (0.08, 0.085, 0.09, 1.0),
    "signal": (0.02, 0.022, 0.024, 1.0),
    "red_signal": (0.75, 0.02, 0.02, 1.0),
    "green_signal": (0.02, 0.65, 0.16, 1.0),
    "photoreal_asphalt": (0.21, 0.22, 0.21, 1.0),
    "photoreal_curb": (0.66, 0.64, 0.57, 1.0),
    "photoreal_bus_lane": (0.60, 0.08, 0.055, 1.0),
    "photoreal_yellow_worn": (0.92, 0.68, 0.07, 1.0),
    "photoreal_white_worn": (0.90, 0.88, 0.78, 1.0),
    "photoreal_metal": (0.08, 0.08, 0.075, 1.0),
    "photoreal_text_bus_lane": (0.90, 0.88, 0.78, 1.0),
    "photoreal_text_look_left": (0.90, 0.88, 0.78, 1.0),
    "photoreal_text_look_right": (0.90, 0.88, 0.78, 1.0),
    "photoreal_text_keep_clear": (0.92, 0.68, 0.07, 1.0),
    "photoreal_puddle": (0.05, 0.065, 0.07, 1.0),
    "photoreal_sidewalk": (0.50, 0.48, 0.43, 1.0),
    "photoreal_brick": (0.45, 0.24, 0.18, 1.0),
    "photoreal_glass": (0.05, 0.10, 0.13, 1.0),
    "photoreal_sign_plate": (0.88, 0.86, 0.76, 1.0),
    "photoreal_warm_window": (1.0, 0.62, 0.25, 1.0),
}

LONDON_TEXTURE_MATERIALS = {
    "photoreal_asphalt": "/Game/PhotorealRoadKit/Textures/T_london_asphalt_albedo",
    "photoreal_curb": "/Game/PhotorealRoadKit/Textures/T_london_curb_concrete",
    "photoreal_bus_lane": "/Game/PhotorealRoadKit/Textures/T_london_red_bus_lane_worn",
    "photoreal_yellow_worn": "/Game/PhotorealRoadKit/Textures/T_london_yellow_thermoplastic_worn",
    "photoreal_white_worn": "/Game/PhotorealRoadKit/Textures/T_london_white_road_text_worn",
    "photoreal_metal": "/Game/PhotorealRoadKit/Textures/T_london_drain_grate_metal",
    "photoreal_text_bus_lane": "/Game/PhotorealRoadKit/Textures/T_london_text_bus_lane",
    "photoreal_text_look_left": "/Game/PhotorealRoadKit/Textures/T_london_text_look_left",
    "photoreal_text_look_right": "/Game/PhotorealRoadKit/Textures/T_london_text_look_right",
    "photoreal_text_keep_clear": "/Game/PhotorealRoadKit/Textures/T_london_text_keep_clear",
    "photoreal_puddle": "/Game/PhotorealRoadKit/Textures/T_london_wet_puddle_reflection",
    "photoreal_sidewalk": "/Game/PhotorealRoadKit/Textures/T_london_sidewalk_stone",
    "photoreal_brick": "/Game/PhotorealRoadKit/Textures/T_london_brick_facade",
    "photoreal_glass": "/Game/PhotorealRoadKit/Textures/T_london_glass_windows",
    "photoreal_sign_plate": "/Game/PhotorealRoadKit/Textures/T_london_regulatory_sign_plate",
}


class RoadOnlyRenderer:
    """Static road/intersection renderer foundation; SUMO remains the truth source."""

    def __init__(self, profile_path: str):
        self.profile_path = Path(profile_path)
        self.profile = json.loads(self.profile_path.read_text(encoding="utf-8"))
        self.city = self.profile["city"]
        self.display_name = self.profile["display_name"]
        self.project_root = self.profile_path.parents[2]
        self.generated_dir = self.project_root / "GeneratedProof"
        self.generated_dir.mkdir(parents=True, exist_ok=True)
        self.materials = {}

    @property
    def package_path(self) -> str:
        return f"/Game/Maps/Generated/{self.city}_RoadOnly"

    def build_manifest(self) -> dict:
        return {
            "generator": "RoadOnlyRenderer",
            "city": self.city,
            "display_name": self.display_name,
            "simulation_truth_source": "SUMO truth source",
            "future_bridge": "TraCI bridge",
            "renderer_role": "Unreal renderer only",
            "scope": "road/intersection only; no vehicles; no pedestrians",
            "signature_scene": self.profile["signature_scene"],
            "road_features": self.profile["road_features"],
            "markings": self.profile["markings"],
            "palette": self.profile["palette"],
            "unreal_map": self.package_path,
        }

    def write_manifest(self) -> Path:
        path = self.generated_dir / f"{self.city}_road_only_manifest.json"
        path.write_text(json.dumps(self.build_manifest(), indent=2), encoding="utf-8")
        return path

    def run_unreal_generation(self) -> None:
        if unreal is None:
            print("UNREAL_UNAVAILABLE_MANIFEST_ONLY")
            return
        self._new_level()
        self._import_photoreal_roadkit()
        self._create_materials()
        self._build_scene()
        self._save_level()
        print(f"ROAD_ONLY_UNREAL_GENERATED city={self.city} package={self.package_path}")

    def _import_photoreal_roadkit(self) -> None:
        if self.city != "london":
            return
        source_root = self.project_root / "SourceAssets" / "PhotorealRoadKit"
        if not source_root.exists():
            print(f"PHOTOREAL_ROADKIT_SOURCE_MISSING path={source_root}")
            return
        asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
        tasks = []
        for src, dest in [
            (source_root / "Textures", "/Game/PhotorealRoadKit/Textures"),
            (source_root / "Meshes", "/Game/PhotorealRoadKit/Meshes"),
        ]:
            unreal.EditorAssetLibrary.make_directory(dest)
            for file_path in sorted(src.glob("*")):
                if file_path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".obj"}:
                    continue
                task = unreal.AssetImportTask()
                task.filename = str(file_path)
                task.destination_path = dest
                task.automated = True
                task.replace_existing = True
                task.save = True
                tasks.append(task)
        if tasks:
            asset_tools.import_asset_tasks(tasks)
        print(f"PHOTOREAL_ROADKIT_IMPORTED city={self.city} tasks={len(tasks)}")

    def _new_level(self) -> None:
        if hasattr(unreal.EditorLevelLibrary, "new_level"):
            unreal.EditorLevelLibrary.new_level(self.package_path)
            return
        if hasattr(unreal.EditorLoadingAndSavingUtils, "new_blank_map"):
            unreal.EditorLoadingAndSavingUtils.new_blank_map(False)
            return
        self._clear_level()

    def _save_level(self) -> None:
        if hasattr(unreal.EditorLevelLibrary, "save_current_level"):
            unreal.EditorLevelLibrary.save_current_level()
        unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)

    def _clear_level(self) -> None:
        actors = list(unreal.EditorLevelLibrary.get_all_level_actors())
        for actor in actors:
            unreal.EditorLevelLibrary.destroy_actor(actor)

    def _create_materials(self) -> None:
        # Best-effort material creation. If UE material APIs differ, generation still succeeds with default materials.
        asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
        material_dir = "/Game/Materials/RoadOnlyRenderer"
        unreal.EditorAssetLibrary.make_directory(material_dir)
        for name, rgba in MATERIAL_COLORS.items():
            asset_name = f"M_{self.city}_{name}"
            asset_path = f"{material_dir}/{asset_name}"
            mat = unreal.EditorAssetLibrary.load_asset(asset_path)
            if mat is None:
                try:
                    mat = asset_tools.create_asset(asset_name, material_dir, unreal.Material, unreal.MaterialFactoryNew())
                except Exception as exc:
                    print(f"ROAD_ONLY_MATERIAL_FALLBACK name={name} error={exc}")
                    mat = None
            if mat is not None:
                self._set_material_color(mat, rgba)
                unreal.EditorAssetLibrary.save_loaded_asset(mat)
            self.materials[name] = mat
        if self.city == "london":
            for name, texture_path in LONDON_TEXTURE_MATERIALS.items():
                mat = self.materials.get(name)
                texture = unreal.EditorAssetLibrary.load_asset(texture_path)
                if mat is not None and texture is not None:
                    self._set_material_texture(mat, texture)
                    unreal.EditorAssetLibrary.save_loaded_asset(mat)

    def _set_material_color(self, mat, rgba) -> None:
        try:
            color = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -420, 0)
            color.constant = unreal.LinearColor(*rgba)
            unreal.MaterialEditingLibrary.connect_material_property(color, "", unreal.MaterialProperty.MP_BASE_COLOR)
            # Photoreal scene captures must be lit, not emissive proof colors.
            black = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -420, 180)
            black.constant = unreal.LinearColor(0.0, 0.0, 0.0, 1.0)
            unreal.MaterialEditingLibrary.connect_material_property(black, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
            rough = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant, -420, 320)
            rough.r = 0.62
            unreal.MaterialEditingLibrary.connect_material_property(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)
            spec = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant, -420, 430)
            spec.r = 0.18
            unreal.MaterialEditingLibrary.connect_material_property(spec, "", unreal.MaterialProperty.MP_SPECULAR)
            if hasattr(unreal.MaterialEditingLibrary, "recompile_material"):
                unreal.MaterialEditingLibrary.recompile_material(mat)
        except Exception as exc:
            print(f"ROAD_ONLY_MATERIAL_COLOR_FALLBACK error={exc}")

    def _set_material_texture(self, mat, texture) -> None:
        try:
            sample = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionTextureSample, -740, 0)
            sample.texture = texture
            unreal.MaterialEditingLibrary.connect_material_property(sample, "RGB", unreal.MaterialProperty.MP_BASE_COLOR)
            black = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -740, 180)
            black.constant = unreal.LinearColor(0.0, 0.0, 0.0, 1.0)
            unreal.MaterialEditingLibrary.connect_material_property(black, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
            rough = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant, -740, 320)
            rough.r = 0.56 if "puddle" in mat.get_name().lower() else 0.72
            unreal.MaterialEditingLibrary.connect_material_property(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)
            if "T_london_text_" in texture.get_name():
                try:
                    mat.set_editor_property("blend_mode", unreal.BlendMode.BLEND_MASKED)
                    mat.set_editor_property("two_sided", True)
                    unreal.MaterialEditingLibrary.connect_material_property(sample, "A", unreal.MaterialProperty.MP_OPACITY_MASK)
                except Exception as mask_exc:
                    print(f"PHOTOREAL_TEXT_MASK_FALLBACK texture={texture.get_name()} error={mask_exc}")
            if hasattr(unreal.MaterialEditingLibrary, "recompile_material"):
                unreal.MaterialEditingLibrary.recompile_material(mat)
        except Exception as exc:
            print(f"PHOTOREAL_TEXTURE_MATERIAL_FALLBACK material={mat.get_name()} error={exc}")

    def _cube(self, label: str, loc, scale, material_name: str):
        actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.StaticMeshActor,
            unreal.Vector(float(loc[0]), float(loc[1]), float(loc[2])),
            unreal.Rotator(0, 0, 0),
        )
        actor.set_actor_label(label)
        actor.set_actor_scale3d(unreal.Vector(float(scale[0]), float(scale[1]), float(scale[2])))
        mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube.Cube")
        comp = actor.get_component_by_class(unreal.StaticMeshComponent)
        if comp and mesh:
            comp.set_static_mesh(mesh)
            mat = self.materials.get(material_name)
            if mat:
                comp.set_material(0, mat)
        return actor

    def _mesh_actor(self, label: str, asset_path: str, loc, scale, material_name: str = "photoreal_metal", rotation=(0, 0, 0)):
        mesh = unreal.EditorAssetLibrary.load_asset(asset_path)
        actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.StaticMeshActor,
            unreal.Vector(float(loc[0]), float(loc[1]), float(loc[2])),
            unreal.Rotator(float(rotation[0]), float(rotation[1]), float(rotation[2])),
        )
        actor.set_actor_label(label)
        actor.set_actor_scale3d(unreal.Vector(float(scale[0]), float(scale[1]), float(scale[2])))
        comp = actor.get_component_by_class(unreal.StaticMeshComponent)
        if comp and mesh:
            comp.set_static_mesh(mesh)
            mat = self.materials.get(material_name)
            if mat:
                comp.set_material(0, mat)
        return actor

    def _road_text(self, label: str, text: str, loc, size: float, rotation=(90, 0, 0), material_name: str = "photoreal_white_worn"):
        actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.TextRenderActor,
            unreal.Vector(float(loc[0]), float(loc[1]), float(loc[2])),
            unreal.Rotator(float(rotation[0]), float(rotation[1]), float(rotation[2])),
        )
        actor.set_actor_label(label)
        comp = actor.get_component_by_class(unreal.TextRenderComponent)
        if comp:
            comp.set_text(text)
            comp.set_editor_property("world_size", float(size))
            try:
                comp.set_editor_property("horizontal_alignment", unreal.HorizontalTextAligment.EHTA_CENTER)
            except Exception:
                pass
            mat = self.materials.get(material_name)
            if mat:
                comp.set_material(0, mat)
        return actor

    def _build_scene(self) -> None:
        features = set(self.profile["road_features"])
        # Proof background plate prevents the road from disappearing into a black editor clear color.
        self._cube(f"RoadOnlyRenderer_{self.city}_mobile_visible_proof_background", (0, 0, -35), (22, 18, 0.035), "background")

        # Main asphalt plates with subtle patch strips.
        self._cube(f"RoadOnlyRenderer_{self.city}_main_asphalt_roughness_variation", (0, 0, 0), (18, 4.6, 0.04), "asphalt")
        self._cube(f"RoadOnlyRenderer_{self.city}_cross_asphalt_patch_variation", (0, 0, 4), (5.4, 16, 0.04), "asphalt_patch")
        for idx, y in enumerate([-310, -155, 145, 315]):
            self._cube(f"RoadOnlyRenderer_{self.city}_asphalt_repair_seam_{idx}", (0, y, 9 + idx), (15.5, 0.035, 0.01), "asphalt_patch")

        # Curbs, medians, islands.
        self._cube(f"RoadOnlyRenderer_{self.city}_curb_north_reference_backed", (0, 500, 18), (18.5, 0.25, 0.12), "curb")
        self._cube(f"RoadOnlyRenderer_{self.city}_curb_south_reference_backed", (0, -500, 18), (18.5, 0.25, 0.12), "curb")
        self._cube(f"RoadOnlyRenderer_{self.city}_refuge_or_median_island", (0, 0, 24), (0.62, 2.3, 0.16), "island")

        # Lane separators / stop bars.
        for lane_y in [-310, -155, 155, 310]:
            for i in range(-6, 7, 2):
                self._cube(f"RoadOnlyRenderer_{self.city}_worn_lane_dash_{lane_y}_{i}", (i * 125, lane_y, 35), (0.55, 0.035, 0.012), "paint")
        self._cube(f"RoadOnlyRenderer_{self.city}_near_stop_bar", (0, -365, 37), (15.8, 0.06, 0.012), "paint")
        self._cube(f"RoadOnlyRenderer_{self.city}_far_stop_bar", (0, 365, 37), (15.8, 0.06, 0.012), "paint")

        # Crosswalks / city markings.
        if "yellow_box_junction" in features:
            for i in range(-4, 5):
                self._cube(f"RoadOnlyRenderer_london_yellow_box_junction_diag_a_{i}", (i * 92, i * 58, 42), (0.055, 4.35, 0.012), "yellow")
                self._cube(f"RoadOnlyRenderer_london_yellow_box_junction_diag_b_{i}", (i * 92, -i * 58, 43), (0.055, 4.35, 0.012), "yellow")
            self._cube("RoadOnlyRenderer_london_double_yellow_lines_reference_marker", (0, -455, 46), (17, 0.035, 0.012), "yellow")
            self._cube("RoadOnlyRenderer_london_green_cycle_box_reference_marker", (-250, -220, 48), (2.2, 1.2, 0.012), "bike_lane")
        if {"wide_zebra_crosswalk", "continental_crosswalk", "european_zebra_crossing"} & features:
            for i in range(-5, 6):
                self._cube(f"RoadOnlyRenderer_{self.city}_crosswalk_bar_near_{i}", (i * 80, -300, 50), (0.24, 1.15, 0.012), "paint")
                self._cube(f"RoadOnlyRenderer_{self.city}_crosswalk_bar_far_{i}", (i * 80, 300, 50), (0.24, 1.15, 0.012), "paint")
        if "bus_lane" in features:
            self._cube(f"RoadOnlyRenderer_{self.city}_bus_lane_surface_reference_marker", (0, -190, 44), (17, 0.65, 0.012), "bus_lane")
            self._cube(f"RoadOnlyRenderer_{self.city}_bus_lane_text_marker", (-500, -190, 55), (0.9, 0.12, 0.015), "paint")
        if "bike_lane" in features or "cycle_box" in features:
            self._cube(f"RoadOnlyRenderer_{self.city}_bike_or_cycle_lane_reference_marker", (0, 190, 44), (17, 0.42, 0.012), "bike_lane")
        if "tactile_paving" in features:
            self._cube(f"RoadOnlyRenderer_{self.city}_yellow_tactile_paving_reference_marker", (-720, 430, 60), (1.5, 0.28, 0.035), "tactile")

        # Utility covers and signal placeholders.
        for idx, (x, y) in enumerate([(-420, -80), (260, 140), (650, -260), (-680, 240)]):
            self._cube(f"RoadOnlyRenderer_{self.city}_utility_cover_{idx}", (x, y, 58), (0.28, 0.28, 0.018), "metal")
        for idx, (x, y) in enumerate([(-820, -430), (820, -430), (-820, 430), (820, 430)]):
            self._cube(f"RoadOnlyRenderer_{self.city}_signal_pole_placeholder_{idx}", (x, y, 165), (0.06, 0.06, 1.4), "signal")
            self._cube(f"RoadOnlyRenderer_{self.city}_signal_head_red_green_placeholder_{idx}", (x, y, 315), (0.28, 0.07, 0.16), "signal")

        if self.city == "london":
            self._build_london_photoreal_fidelity_layer()
            self._build_london_photoreal_scene_layer()

        # Lighting/camera proof. Use movable lights so the editor viewport is visible without a baked-lighting pass.
        light = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(-800, -900, 1200), unreal.Rotator(-48, -35, 0))
        light.set_actor_label(f"RoadOnlyRenderer_{self.city}_daylight_controlled_exposure")
        light_comp = light.get_component_by_class(unreal.DirectionalLightComponent)
        if light_comp:
            light_comp.set_editor_property("intensity", 7.5)
            light_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
        sky = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 700), unreal.Rotator(0, 0, 0))
        sky.set_actor_label(f"RoadOnlyRenderer_{self.city}_movable_skylight")
        sky_comp = sky.get_component_by_class(unreal.SkyLightComponent)
        if sky_comp:
            sky_comp.set_editor_property("intensity", 2.0)
            sky_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
        camera = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.CineCameraActor, unreal.Vector(-1250, -1150, 900), unreal.Rotator(0, -28, 42))
        camera.set_actor_label(f"RoadOnlyRenderer_{self.city}_proof_camera")
        unreal.EditorLevelLibrary.set_level_viewport_camera_info(camera.get_actor_location(), camera.get_actor_rotation())

    def _build_london_photoreal_fidelity_layer(self) -> None:
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        self._cube("PhotorealRoadKit_london_worn_asphalt_surface_texture_visible", (0, 0, 63), (17.6, 4.35, 0.018), "photoreal_asphalt")
        self._cube("PhotorealRoadKit_london_cross_asphalt_patch_texture_visible", (0, 0, 67), (5.2, 15.2, 0.016), "photoreal_asphalt")
        self._cube("PhotorealRoadKit_london_red_bus_lane_worn_surface_texture_visible", (0, -190, 72), (16.7, 0.58, 0.014), "photoreal_bus_lane")
        self._cube("PhotorealRoadKit_london_advanced_cycle_box_green_surface_visible", (-250, -220, 77), (2.15, 1.15, 0.014), "bike_lane")
        for i in range(-4, 5):
            self._cube(f"PhotorealRoadKit_london_paint_edge_breakup_yellow_box_a_{i}", (i * 92, i * 58, 83), (0.07, 4.3, 0.014), "photoreal_yellow_worn")
            self._cube(f"PhotorealRoadKit_london_paint_edge_breakup_yellow_box_b_{i}", (i * 92, -i * 58, 84), (0.07, 4.3, 0.014), "photoreal_yellow_worn")
        for y in [-470, -440, 440, 470]:
            self._mesh_actor(f"PhotorealRoadKit_london_double_yellow_curb_line_worn_{y}", f"{mesh_root}/paint_worn_strip", (0, y, 90), (7.4, 1.0, 1.0), "photoreal_yellow_worn")
        for y in [-525, 525]:
            for x in [-720, -360, 0, 360, 720]:
                self._mesh_actor(f"PhotorealRoadKit_london_curb_profile_mesh_{x}_{y}", f"{mesh_root}/curb_beveled_module", (x, y, 92), (1.35, 1.0, 1.0), "photoreal_curb")
        for idx, (x, y) in enumerate([(-520, -105), (310, 155), (650, -275), (-700, 260), (120, -365)]):
            self._mesh_actor(f"PhotorealRoadKit_london_utility_cover_mesh_{idx}", f"{mesh_root}/utility_cover_round", (x, y, 98), (1.0, 1.0, 1.0), "photoreal_metal")
        for idx, (x, y) in enumerate([(-790, -500), (790, 500), (-610, 420)]):
            self._mesh_actor(f"PhotorealRoadKit_london_drain_grate_mesh_{idx}", f"{mesh_root}/drain_grate_rect", (x, y, 98), (1.0, 1.0, 1.0), "photoreal_metal")
        for idx, (x, y) in enumerate([(-80, -70), (80, 70)]):
            self._mesh_actor(f"PhotorealRoadKit_london_keep_left_bollard_mesh_{idx}", f"{mesh_root}/keep_left_bollard", (x, y, 125), (1.0, 1.0, 1.0), "photoreal_white_worn")
        for idx, (x, y) in enumerate([(-820, -430), (820, -430), (-820, 430), (820, 430)]):
            self._mesh_actor(f"PhotorealRoadKit_london_signal_pole_mesh_{idx}", f"{mesh_root}/signal_pole_slim", (x, y, 100), (1.0, 1.0, 1.0), "photoreal_metal")
            self._mesh_actor(f"PhotorealRoadKit_london_uk_black_signal_head_mesh_{idx}", f"{mesh_root}/signal_head_uk_black", (x, y, 295), (1.15, 1.15, 1.15), "signal")
        for idx, (x, y) in enumerate([(-720, 430), (-600, 430), (-720, -430), (-600, -430)]):
            self._mesh_actor(f"PhotorealRoadKit_london_tactile_paving_tile_mesh_{idx}", f"{mesh_root}/tactile_paving_tile", (x, y, 100), (1.0, 1.0, 1.0), "tactile")
        # London road text required by the prompt. Use texture-backed road planes for reliable capture.
        self._cube("PhotorealRoadKit_london_road_text_BUS_LANE_texture_plane_visible", (-520, -190, 112), (2.2, 0.48, 0.012), "photoreal_text_bus_lane")
        self._cube("PhotorealRoadKit_london_road_text_LOOK_LEFT_texture_plane_visible", (-515, -335, 114), (1.85, 0.44, 0.012), "photoreal_text_look_left")
        self._cube("PhotorealRoadKit_london_road_text_LOOK_RIGHT_texture_plane_visible", (515, 335, 114), (2.05, 0.44, 0.012), "photoreal_text_look_right")
        self._cube("PhotorealRoadKit_london_road_text_KEEP_CLEAR_texture_plane_visible", (0, 0, 116), (2.6, 0.58, 0.012), "photoreal_text_keep_clear")
        self._road_text("PhotorealRoadKit_london_road_text_LOOK_LEFT_visible", "LOOK LEFT", (-515, -335, 124), 54, material_name="photoreal_white_worn")
        self._road_text("PhotorealRoadKit_london_road_text_LOOK_RIGHT_visible", "LOOK RIGHT", (515, 335, 124), 54, material_name="photoreal_white_worn")
        self._road_text("PhotorealRoadKit_london_road_text_BUS_LANE_visible", "BUS LANE", (-520, -190, 126), 62, material_name="photoreal_white_worn")
        self._road_text("PhotorealRoadKit_london_road_text_KEEP_CLEAR_visible", "KEEP CLEAR", (0, 0, 126), 58, material_name="photoreal_yellow_worn")

    def _build_london_photoreal_scene_layer(self) -> None:
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        # Scene-quality layer: visible urban depth, wet reflective accents, sidewalk context, street furniture.
        self._cube("PhotorealScene_london_wet_asphalt_puddle_reflection_foreground_0", (-280, -84, 129), (2.15, 0.42, 0.01), "photoreal_puddle")
        self._cube("PhotorealScene_london_wet_asphalt_puddle_reflection_foreground_1", (360, 112, 130), (1.55, 0.36, 0.01), "photoreal_puddle")
        self._cube("PhotorealScene_london_sidewalk_stone_left_context", (0, -615, 102), (18.0, 1.05, 0.04), "photoreal_sidewalk")
        self._cube("PhotorealScene_london_sidewalk_stone_right_context", (0, 615, 102), (18.0, 1.05, 0.04), "photoreal_sidewalk")
        self._cube("PhotorealScene_london_median_island_concrete_beveled", (0, 0, 120), (0.72, 1.85, 0.07), "photoreal_curb")
        # Mid/background London streetscape silhouettes: not gameplay, just renderer context.
        for idx, x in enumerate([-880, -520, -160, 240, 620, 980]):
            height = [2.8, 3.5, 2.9, 4.2, 3.2, 3.8][idx]
            self._mesh_actor(f"PhotorealScene_london_brick_shopfront_left_{idx}", f"{mesh_root}/london_shopfront_module", (x, -760, 110), (1.0, 1.0, height), "photoreal_brick")
            self._mesh_actor(f"PhotorealScene_london_window_strip_left_{idx}", f"{mesh_root}/london_window_strip", (x, -785, 285 + height * 25), (1.0, 1.0, 1.0), "photoreal_glass")
        for idx, x in enumerate([-760, -360, 80, 520, 900]):
            height = [3.1, 2.7, 3.9, 3.4, 2.9][idx]
            self._mesh_actor(f"PhotorealScene_london_brick_shopfront_right_{idx}", f"{mesh_root}/london_shopfront_module", (x, 760, 110), (1.05, 1.0, height), "photoreal_brick")
            self._mesh_actor(f"PhotorealScene_london_window_strip_right_{idx}", f"{mesh_root}/london_window_strip", (x, 785, 280 + height * 25), (1.0, 1.0, 1.0), "photoreal_glass")
        # Street furniture/readability props in camera frustum.
        for idx, (x, y) in enumerate([(-650, -535), (-250, -535), (220, 535), (680, 535)]):
            self._mesh_actor(f"PhotorealScene_london_bollard_curb_edge_{idx}", f"{mesh_root}/keep_left_bollard", (x, y, 130), (0.75, 0.75, 0.9), "photoreal_white_worn")
        for idx, (x, y) in enumerate([(-760, -475), (760, 475)]):
            self._mesh_actor(f"PhotorealScene_london_regulatory_sign_plate_{idx}", f"{mesh_root}/regulatory_sign_plate", (x, y, 255), (1.1, 1.1, 1.1), "photoreal_sign_plate")
        # Thin kerb shadow bands and grime patches make the road surface read less flat.
        for idx, y in enumerate([-505, 505, -340, 340]):
            self._cube(f"PhotorealScene_london_curb_contact_shadow_grime_{idx}", (0, y, 124 + idx), (16.5, 0.06, 0.01), "photoreal_metal")
        for idx, (x, y, sx, sy) in enumerate([(-620,-120,1.2,.18),(-120,225,1.6,.16),(520,-45,1.1,.14),(160,-315,1.35,.15)]):
            self._cube(f"PhotorealScene_london_oil_rubber_grime_patch_{idx}", (x, y, 128+idx), (sx, sy, 0.01), "photoreal_puddle")
        # Add visible atmospheric/cinematic actors where UE API supports them.
        try:
            fog = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.ExponentialHeightFog, unreal.Vector(0, 0, 230), unreal.Rotator(0, 0, 0))
            fog.set_actor_label("PhotorealScene_london_soft_morning_fog")
            comp = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
            if comp:
                comp.set_editor_property("fog_density", 0.006)
                comp.set_editor_property("fog_height_falloff", 0.25)
        except Exception as exc:
            print(f"PHOTOREAL_SCENE_FOG_FALLBACK error={exc}")
        try:
            pp = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.PostProcessVolume, unreal.Vector(0, 0, 260), unreal.Rotator(0, 0, 0))
            pp.set_actor_label("PhotorealScene_london_color_grade_postprocess")
            pp.set_editor_property("b_unbound", True)
        except Exception as exc:
            print(f"PHOTOREAL_SCENE_POSTPROCESS_FALLBACK error={exc}")


def main() -> None:
    profile_path = os.environ.get("SMART_INTERSECTION_CITY_PROFILE")
    if not profile_path:
        here = Path(__file__).resolve()
        profile_path = str(here.parents[2] / "SceneProfiles" / "cities" / "london.json")
    renderer = RoadOnlyRenderer(profile_path)
    manifest = renderer.write_manifest()
    print(f"ROAD_ONLY_MANIFEST_WRITTEN {manifest}")
    renderer.run_unreal_generation()


if __name__ == "__main__":
    main()
