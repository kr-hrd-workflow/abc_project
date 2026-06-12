# RoadOnlyRenderer generator for SmartIntersection.
# Architecture: SUMO truth source; Python TraCI bridge streams state later; Unreal renders only.
# Scope: no vehicles, no pedestrians, no gameplay, no UE-side traffic simulation.
from __future__ import annotations

import json
import os
from pathlib import Path

try:
    import unreal  # type: ignore
except Exception:  # normal when running verifier/dry tooling outside UE
    unreal = None


MATERIAL_COLORS = {
    "asphalt": (0.025, 0.027, 0.026, 1.0),
    "asphalt_patch": (0.045, 0.044, 0.040, 1.0),
    "paint": (0.86, 0.84, 0.76, 1.0),
    "yellow": (1.00, 0.72, 0.08, 1.0),
    "bus_lane": (0.58, 0.08, 0.045, 1.0),
    "bike_lane": (0.03, 0.40, 0.18, 1.0),
    "curb": (0.45, 0.43, 0.38, 1.0),
    "island": (0.30, 0.29, 0.25, 1.0),
    "tactile": (0.95, 0.72, 0.12, 1.0),
    "metal": (0.08, 0.085, 0.09, 1.0),
    "signal": (0.02, 0.022, 0.024, 1.0),
    "red_signal": (0.75, 0.02, 0.02, 1.0),
    "green_signal": (0.02, 0.65, 0.16, 1.0),
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
        self._create_materials()
        self._build_scene()
        self._save_level()
        print(f"ROAD_ONLY_UNREAL_GENERATED city={self.city} package={self.package_path}")

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
                    self._set_material_color(mat, rgba)
                    unreal.EditorAssetLibrary.save_loaded_asset(mat)
                except Exception as exc:
                    print(f"ROAD_ONLY_MATERIAL_FALLBACK name={name} error={exc}")
                    mat = None
            self.materials[name] = mat

    def _set_material_color(self, mat, rgba) -> None:
        try:
            color = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -420, 0)
            color.constant = unreal.LinearColor(*rgba)
            unreal.MaterialEditingLibrary.connect_material_property(color, "", unreal.MaterialProperty.MP_BASE_COLOR)
            rough = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant, -420, 220)
            rough.r = 0.78
            unreal.MaterialEditingLibrary.connect_material_property(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)
            if hasattr(unreal.MaterialEditingLibrary, "recompile_material"):
                unreal.MaterialEditingLibrary.recompile_material(mat)
        except Exception as exc:
            print(f"ROAD_ONLY_MATERIAL_COLOR_FALLBACK error={exc}")

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

    def _build_scene(self) -> None:
        features = set(self.profile["road_features"])
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
        camera = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.CineCameraActor, unreal.Vector(-1250, -1150, 900), unreal.Rotator(-28, 42, 0))
        camera.set_actor_label(f"RoadOnlyRenderer_{self.city}_proof_camera")
        unreal.EditorLevelLibrary.set_level_viewport_camera_info(camera.get_actor_location(), camera.get_actor_rotation())


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
