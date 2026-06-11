"""Generate a deterministic city intersection blockout from a JSON profile.

Run inside Unreal Editor with PythonScriptPlugin enabled. The script uses only
built-in editor primitives and intentionally avoids external assets so the repo
can describe Seoul, New York, Paris, and London scenes without committing
copyrighted marketplace content.
"""

from __future__ import annotations

import json
import os
import random
import sys
from pathlib import Path
from typing import Any


def _arg_value(name: str) -> str | None:
    for index, value in enumerate(sys.argv):
        if value == name and index + 1 < len(sys.argv):
            return sys.argv[index + 1]
        if value.startswith(f"{name}="):
            return value.split("=", 1)[1]
    return None


def load_profile(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as profile_file:
        profile = json.load(profile_file)
    required = [
        "id",
        "display_name",
        "traffic_side",
        "intersection",
        "visual_style",
        "city_style",
        "traffic",
        "lighting",
        "camera",
    ]
    missing = [key for key in required if key not in profile]
    if missing:
        raise ValueError(f"City profile {path} is missing required keys: {', '.join(missing)}")
    return profile


def material(unreal: Any, name: str, color: tuple[float, float, float, float]) -> Any:
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    package_path = "/Game/Generated/Materials"
    existing = unreal.EditorAssetLibrary.load_asset(f"{package_path}/{name}")
    if existing:
        return existing
    factory = unreal.MaterialFactoryNew()
    mat = asset_tools.create_asset(name, package_path, unreal.Material, factory)
    unreal.MaterialEditingLibrary.set_material_instance_vector_parameter_value(
        mat, "BaseColor", unreal.LinearColor(*color)
    )
    return mat


def spawn_cube(
    unreal: Any,
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: Any | None = None,
) -> Any:
    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(*location))
    actor.set_actor_label(name)
    actor.set_actor_scale3d(unreal.Vector(*scale))
    mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube.Cube")
    component = actor.static_mesh_component
    component.set_static_mesh(mesh)
    if mat:
        component.set_material(0, mat)
    return actor


def spawn_city(unreal: Any, profile: dict[str, Any]) -> None:
    random.seed(profile.get("seed", 20260611))
    unreal.EditorLevelLibrary.new_level(f"/Game/Maps/Generated/{profile['id']}_Intersection")

    asphalt = material(unreal, "MI_Procedural_Asphalt", (0.025, 0.028, 0.03, 1.0))
    road_marking = material(unreal, "MI_Procedural_RoadMarking", (0.92, 0.95, 0.92, 1.0))
    sidewalk = material(unreal, "MI_Procedural_Sidewalk", (0.42, 0.42, 0.39, 1.0))
    accent = material(unreal, f"MI_{profile['id']}_Accent", city_accent_color(profile["id"]))
    facade = material(unreal, f"MI_{profile['id']}_Facade", facade_color(profile["id"]))

    lanes = profile["intersection"]["lanes_per_direction"]
    lane_width = profile["intersection"]["lane_width_cm"]
    road_width = lanes * lane_width * 2 + profile["intersection"].get("median_width_cm", 0)

    spawn_cube(unreal, "North South arterial asphalt", (0, 0, 0), (road_width / 100, 180, 0.04), asphalt)
    spawn_cube(unreal, "East West arterial asphalt", (0, 0, 2), (180, road_width / 100, 0.04), asphalt)

    # Sidewalk plates
    offset = road_width / 2 + profile["city_style"]["sidewalk_width_cm"] / 2
    for label, x, y, sx, sy in [
        ("Sidewalk north", 0, offset, 180, 5.2),
        ("Sidewalk south", 0, -offset, 180, 5.2),
        ("Sidewalk east", offset, 0, 5.2, 180),
        ("Sidewalk west", -offset, 0, 5.2, 180),
    ]:
        spawn_cube(unreal, label, (x, y, 8), (sx, sy, 0.08), sidewalk)

    crosswalk = profile["intersection"]["crosswalk_width_cm"] / 100
    for index, y in enumerate([-road_width / 2 - 380, road_width / 2 + 380]):
        for stripe in range(7):
            spawn_cube(unreal, f"Crosswalk NS {index}-{stripe}", (-300 + stripe * 100, y, 14), (0.42, crosswalk, 0.025), road_marking)
    for index, x in enumerate([-road_width / 2 - 380, road_width / 2 + 380]):
        for stripe in range(7):
            spawn_cube(unreal, f"Crosswalk EW {index}-{stripe}", (x, -300 + stripe * 100, 14), (crosswalk, 0.42, 0.025), road_marking)

    if profile["id"] == "london":
        for i in range(-4, 5):
            spawn_cube(unreal, f"London yellow box diagonal A {i}", (i * 120, i * 120, 16), (0.18, 8, 0.025), accent)
            spawn_cube(unreal, f"London yellow box diagonal B {i}", (i * 120, -i * 120, 16), (0.18, 8, 0.025), accent)
    if profile["id"] in {"seoul", "new_york", "london"}:
        spawn_cube(unreal, f"{profile['display_name']} transit lane accent", (0, road_width / 2 - 120, 18), (160, 1.1, 0.025), accent)

    # Traffic lights and street furniture placeholders
    for idx, (x, y) in enumerate([(-650, -650), (650, -650), (-650, 650), (650, 650)]):
        spawn_cube(unreal, f"Signal pole {idx}", (x, y, 180), (0.18, 0.18, 3.6), accent)
        spawn_cube(unreal, f"Signal head {idx}", (x, y, 370), (0.85, 0.18, 0.26), accent)

    # City block facades
    for idx, (x, y) in enumerate([(-2600, -2200), (2600, -2200), (-2600, 2200), (2600, 2200)]):
        height = random.randint(profile["city_style"]["building_height_min_cm"], profile["city_style"]["building_height_max_cm"])
        spawn_cube(unreal, f"{profile['display_name']} facade block {idx}", (x, y, height / 2), (8, 5, height / 100), facade)

    # CCTV camera
    cam_data = profile["camera"]
    camera = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.CineCameraActor, unreal.Vector(*cam_data["location_cm"]))
    camera.set_actor_label(f"CCTV {profile['display_name']}")
    camera.set_actor_rotation(unreal.Rotator(*cam_data["rotation_deg"]), False)
    camera.get_cine_camera_component().current_focal_length = cam_data["focal_length_mm"]

    light = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 7000))
    light.set_actor_label(f"{profile['display_name']} sun / sky key")
    unreal.EditorLevelLibrary.save_current_level()
    unreal.log(f"Generated city intersection: {profile['display_name']}")


def city_accent_color(city_id: str) -> tuple[float, float, float, float]:
    return {
        "seoul": (0.62, 0.08, 0.06, 1.0),
        "new_york": (0.02, 0.42, 0.22, 1.0),
        "paris": (0.06, 0.12, 0.09, 1.0),
        "london": (0.92, 0.72, 0.04, 1.0),
    }.get(city_id, (0.0, 0.55, 0.48, 1.0))


def facade_color(city_id: str) -> tuple[float, float, float, float]:
    return {
        "seoul": (0.42, 0.45, 0.47, 1.0),
        "new_york": (0.42, 0.18, 0.12, 1.0),
        "paris": (0.72, 0.62, 0.48, 1.0),
        "london": (0.48, 0.21, 0.14, 1.0),
    }.get(city_id, (0.42, 0.42, 0.42, 1.0))


def main() -> None:
    profile_arg = _arg_value("--profile") or os.getenv("SMART_INTERSECTION_CITY_PROFILE")
    if not profile_arg:
        raise SystemExit("Pass --profile <path> or SMART_INTERSECTION_CITY_PROFILE")
    profile = load_profile(Path(profile_arg))
    import unreal  # type: ignore

    spawn_city(unreal, profile)


if __name__ == "__main__":
    main()
