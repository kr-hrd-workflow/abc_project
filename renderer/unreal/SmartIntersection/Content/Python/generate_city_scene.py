"""Generate deterministic city intersection scenes from JSON profiles.

The generator intentionally uses built-in Unreal primitives and generated
materials only. This keeps city scenes source-controlled and reproducible before
we replace blockout geometry with curated photoreal assets.
"""

from __future__ import annotations

import json
import math
import os
import random
import sys
from pathlib import Path
from typing import Any

Color = tuple[float, float, float, float]


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


def make_material(unreal: Any, name: str, color: Color, roughness: float = 0.72) -> Any:
    """Create or load a simple colored material.

    If material authoring APIs change between UE versions, fall back to the
    built-in BasicShape material so generation never fails.
    """
    package_path = "/Game/Generated/Materials"
    asset_path = f"{package_path}/{name}"
    existing = unreal.EditorAssetLibrary.load_asset(asset_path)
    if existing:
        return existing

    if not hasattr(unreal, "MaterialEditingLibrary"):
        unreal.log_warning(
            "MaterialEditingLibrary is unavailable; using BasicShape material."
        )
        return unreal.EditorAssetLibrary.load_asset(
            "/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"
        )

    try:
        unreal.EditorAssetLibrary.make_directory(package_path)
        factory = unreal.MaterialFactoryNew()
        material = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
            name,
            package_path,
            unreal.Material,
            factory,
        )
        base = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionConstant3Vector, -420, -120
        )
        base.constant = unreal.LinearColor(color[0], color[1], color[2], 1.0)
        unreal.MaterialEditingLibrary.connect_material_property(
            base, "", unreal.MaterialProperty.MP_BASE_COLOR
        )
        rough = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionConstant, -420, 80
        )
        rough.r = roughness
        unreal.MaterialEditingLibrary.connect_material_property(
            rough, "", unreal.MaterialProperty.MP_ROUGHNESS
        )
        unreal.MaterialEditingLibrary.recompile_material(material)
        unreal.EditorAssetLibrary.save_loaded_asset(material)
        return material
    except Exception as exc:  # pragma: no cover - UE API fallback
        unreal.log_warning(f"Material creation failed for {name}: {exc}")
        return unreal.EditorAssetLibrary.load_asset(
            "/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"
        )


def mobility(unreal: Any) -> Any:
    if hasattr(unreal.ComponentMobility, "MOVABLE"):
        return unreal.ComponentMobility.MOVABLE
    if hasattr(unreal.ComponentMobility, "STATIC"):
        return unreal.ComponentMobility.STATIC
    raise RuntimeError("ComponentMobility enum has neither MOVABLE nor STATIC")


def spawn_cube(
    unreal: Any,
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: Any | None = None,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> Any:
    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(*location))
    actor.set_actor_label(name)
    actor.set_actor_rotation(unreal.Rotator(*rotation), False)
    actor.set_actor_scale3d(unreal.Vector(*scale))
    mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube.Cube")
    component = actor.static_mesh_component
    component.set_static_mesh(mesh)
    component.set_mobility(mobility(unreal))
    if mat:
        component.set_material(0, mat)
    return actor


def spawn_flat_marking(
    unreal: Any,
    name: str,
    x: float,
    y: float,
    z: float,
    length: float,
    width: float,
    mat: Any,
    yaw: float = 0,
) -> Any:
    return spawn_cube(unreal, name, (x, y, z), (length, width, 0.018), mat, rotation=(0, 0, yaw))


def look_at_rotation_deg(location: tuple[float, float, float], target: tuple[float, float, float]) -> tuple[float, float, float]:
    dx = target[0] - location[0]
    dy = target[1] - location[1]
    dz = target[2] - location[2]
    horizontal = math.sqrt(dx * dx + dy * dy)
    pitch = math.degrees(math.atan2(dz, horizontal))
    yaw = math.degrees(math.atan2(dy, dx))
    return (pitch, yaw, 0.0)


def cctv_camera_location(city_id: str, fallback: list[float]) -> tuple[float, float, float]:
    locations = {
        "seoul": (3000, -2600, 1550),
        "new_york": (2800, -3000, 1500),
        "paris": (2600, -2400, 1350),
        "london": (3100, -2200, 1450),
    }
    return locations.get(city_id, tuple(fallback))


def cctv_focal_length(city_id: str, fallback: float) -> float:
    return {"seoul": 32, "new_york": 35, "paris": 40, "london": 32}.get(city_id, fallback)



def city_palette(city_id: str) -> dict[str, Color]:
    palettes: dict[str, dict[str, Color]] = {
        "seoul": {
            "asphalt": (0.018, 0.020, 0.023, 1),
            "marking": (0.92, 0.95, 0.92, 1),
            "sidewalk": (0.46, 0.48, 0.48, 1),
            "accent": (0.62, 0.06, 0.035, 1),
            "facade": (0.31, 0.36, 0.40, 1),
            "glass": (0.08, 0.18, 0.22, 1),
            "warm": (0.95, 0.55, 0.18, 1),
            "dark": (0.025, 0.028, 0.03, 1),
            "green": (0.04, 0.38, 0.20, 1),
        },
        "new_york": {
            "asphalt": (0.040, 0.040, 0.038, 1),
            "marking": (0.92, 0.93, 0.88, 1),
            "sidewalk": (0.58, 0.56, 0.51, 1),
            "accent": (0.02, 0.36, 0.18, 1),
            "facade": (0.42, 0.18, 0.12, 1),
            "glass": (0.07, 0.14, 0.20, 1),
            "warm": (0.95, 0.72, 0.08, 1),
            "dark": (0.025, 0.026, 0.024, 1),
            "green": (0.02, 0.42, 0.22, 1),
        },
        "paris": {
            "asphalt": (0.050, 0.052, 0.055, 1),
            "marking": (0.88, 0.90, 0.86, 1),
            "sidewalk": (0.68, 0.64, 0.55, 1),
            "accent": (0.04, 0.09, 0.06, 1),
            "facade": (0.72, 0.63, 0.49, 1),
            "glass": (0.16, 0.18, 0.18, 1),
            "warm": (0.35, 0.18, 0.08, 1),
            "dark": (0.025, 0.024, 0.022, 1),
            "green": (0.08, 0.28, 0.15, 1),
        },
        "london": {
            "asphalt": (0.030, 0.032, 0.034, 1),
            "marking": (0.90, 0.91, 0.86, 1),
            "sidewalk": (0.50, 0.49, 0.45, 1),
            "accent": (0.92, 0.68, 0.04, 1),
            "facade": (0.47, 0.19, 0.13, 1),
            "glass": (0.12, 0.13, 0.14, 1),
            "warm": (0.55, 0.04, 0.035, 1),
            "dark": (0.018, 0.018, 0.017, 1),
            "green": (0.07, 0.22, 0.12, 1),
        },
    }
    return palettes.get(city_id, palettes["seoul"])


def make_materials(unreal: Any, city_id: str) -> dict[str, Any]:
    palette = city_palette(city_id)
    return {
        key: make_material(unreal, f"MI_{city_id}_{key}", color, roughness=0.45 if key in {"glass", "asphalt"} else 0.78)
        for key, color in palette.items()
    }


PHOTOREAL_KIT = {
    "sedan": "sedan_photoreal_proxy",
    "bus": "city_bus_photoreal_proxy",
    "cctv": "cctv_bullet_rig_photoreal_proxy",
    "signal": "traffic_signal_photoreal_proxy",
    "street_light": "street_light_photoreal_proxy",
    "tree": "urban_tree_photoreal_proxy",
    "bollard": "bollard_photoreal_proxy",
}


def source_assets_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "SourceAssets" / "PhotorealKit"


def photoreal_asset_path(name: str) -> str:
    return f"/Game/PhotorealKit/{name}.{name}"


def import_photoreal_kit(unreal: Any) -> dict[str, Any]:
    unreal.EditorAssetLibrary.make_directory("/Game/PhotorealKit")
    imported: dict[str, Any] = {}
    tasks = []
    for key, asset_name in PHOTOREAL_KIT.items():
        asset = unreal.EditorAssetLibrary.load_asset(photoreal_asset_path(asset_name))
        if asset:
            imported[key] = asset
            continue
        fbx = source_assets_dir() / f"{asset_name}.fbx"
        if not fbx.exists():
            unreal.log_warning(f"Missing photoreal source asset {fbx}")
            continue
        task = unreal.AssetImportTask()
        task.filename = str(fbx)
        task.destination_path = "/Game/PhotorealKit"
        task.automated = True
        task.replace_existing = True
        task.save = True
        try:
            options = unreal.FbxImportUI()
            options.import_mesh = True
            options.import_materials = True
            options.import_textures = False
            options.import_as_skeletal = False
            if hasattr(options, "static_mesh_import_data") and options.static_mesh_import_data:
                options.static_mesh_import_data.combine_meshes = True
            task.options = options
        except Exception as exc:
            unreal.log_warning(f"Could not configure FBX import options for {fbx}: {exc}")
        tasks.append(task)
    if tasks:
        unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks(tasks)
    for key, asset_name in PHOTOREAL_KIT.items():
        asset = unreal.EditorAssetLibrary.load_asset(photoreal_asset_path(asset_name))
        if asset:
            imported[key] = asset
        else:
            unreal.log_warning(f"Photoreal asset failed to load: {asset_name}")
    return imported


def spawn_static_mesh_asset(
    unreal: Any,
    name: str,
    asset: Any | None,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> Any | None:
    if not asset:
        return None
    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(*location))
    actor.set_actor_label(name)
    actor.set_actor_rotation(unreal.Rotator(*rotation), False)
    actor.set_actor_scale3d(unreal.Vector(*scale))
    component = actor.static_mesh_component
    component.set_static_mesh(asset)
    component.set_mobility(mobility(unreal))
    return actor


def spawn_roads(unreal: Any, profile: dict[str, Any], mats: dict[str, Any], road_width: float) -> None:
    asphalt, marking, sidewalk, accent = mats["asphalt"], mats["marking"], mats["sidewalk"], mats["accent"]
    city_id = profile["id"]
    spawn_cube(unreal, "North South wet asphalt arterial", (0, 0, 0), (road_width / 100, 190, 0.045), asphalt)
    spawn_cube(unreal, "East West wet asphalt arterial", (0, 0, 2), (190, road_width / 100, 0.045), asphalt)

    offset = road_width / 2 + profile["city_style"]["sidewalk_width_cm"] / 2
    for label, x, y, sx, sy in [
        ("Sidewalk north stone slab", 0, offset, 190, 5.4),
        ("Sidewalk south stone slab", 0, -offset, 190, 5.4),
        ("Sidewalk east stone slab", offset, 0, 5.4, 190),
        ("Sidewalk west stone slab", -offset, 0, 5.4, 190),
    ]:
        spawn_cube(unreal, label, (x, y, 8), (sx, sy, 0.08), sidewalk)

    # Lane dividers and stop bars.
    for y in range(-8200, 8201, 1100):
        for x in [-road_width / 6, road_width / 6]:
            spawn_cube(unreal, f"NS dashed lane marker {x:.0f} {y}", (x, y, 16), (0.08, 4.0, 0.018), marking)
    for x in range(-8200, 8201, 1100):
        for y in [-road_width / 6, road_width / 6]:
            spawn_cube(unreal, f"EW dashed lane marker {x} {y:.0f}", (x, y, 17), (4.0, 0.08, 0.018), marking)
    for pos in [-road_width / 2 - 260, road_width / 2 + 260]:
        spawn_cube(unreal, f"Stop bar north south {pos}", (0, pos, 20), (road_width / 100, 0.12, 0.02), marking)
        spawn_cube(unreal, f"Stop bar east west {pos}", (pos, 0, 21), (0.12, road_width / 100, 0.02), marking)

    crosswalk = profile["intersection"]["crosswalk_width_cm"] / 100
    for index, y in enumerate([-road_width / 2 - 500, road_width / 2 + 500]):
        for stripe in range(9):
            spawn_cube(unreal, f"Photoreal zebra crosswalk NS {index}-{stripe}", (-400 + stripe * 100, y, 24), (0.45, crosswalk, 0.025), marking)
    for index, x in enumerate([-road_width / 2 - 500, road_width / 2 + 500]):
        for stripe in range(9):
            spawn_cube(unreal, f"Photoreal zebra crosswalk EW {index}-{stripe}", (x, -400 + stripe * 100, 24), (crosswalk, 0.45, 0.025), marking)

    if city_id == "london":
        for i in range(-6, 7):
            spawn_cube(unreal, f"London yellow box diagonal A {i}", (i * 120, i * 120, 28), (0.12, 10, 0.02), accent, rotation=(0, 0, 45))
            spawn_cube(unreal, f"London yellow box diagonal B {i}", (i * 120, -i * 120, 28), (0.12, 10, 0.02), accent, rotation=(0, 0, -45))
    if city_id in {"seoul", "london"}:
        spawn_cube(unreal, f"{profile['display_name']} red bus lane surface", (0, road_width / 2 - 160, 30), (168, 1.35, 0.02), mats["warm"])
    if city_id == "new_york":
        spawn_cube(unreal, "New York protected green bike lane", (road_width / 2 - 130, 0, 30), (1.25, 168, 0.02), mats["green"])
    if city_id == "paris":
        spawn_cube(unreal, "Paris subtle green bike buffer", (road_width / 2 - 140, 0, 30), (0.9, 158, 0.02), mats["green"])


def spawn_buildings(unreal: Any, profile: dict[str, Any], mats: dict[str, Any]) -> None:
    city_id = profile["id"]
    min_h = profile["city_style"]["building_height_min_cm"]
    max_h = profile["city_style"]["building_height_max_cm"]
    lots = [
        (-3200, -2600), (-1700, -2750), (1700, -2750), (3200, -2600),
        (-3200, 2600), (-1700, 2750), (1700, 2750), (3200, 2600),
        (-2600, -1400), (2600, -1400), (-2600, 1400), (2600, 1400),
    ]
    for idx, (x, y) in enumerate(lots):
        height = random.randint(min_h, max_h)
        sx = random.uniform(5.5, 10.5)
        sy = random.uniform(4.0, 7.5)
        mat = mats["glass"] if city_id in {"seoul", "new_york"} and idx % 3 == 0 else mats["facade"]
        spawn_cube(unreal, f"{profile['display_name']} city facade block {idx}", (x, y, height / 2), (sx, sy, height / 100), mat)
        # Window rows and identity details.
        floors = max(3, min(16, height // 420))
        for floor in range(1, floors):
            z = floor * (height / floors)
            spawn_cube(unreal, f"Window ribbon {idx}-{floor}", (x, y - sy * 52, z), (sx * 0.78, 0.045, 0.18), mats["glass"])
        if city_id == "paris":
            spawn_cube(unreal, f"Paris mansard zinc roof {idx}", (x, y, height + 160), (sx * 0.9, sy * 0.92, 1.4), mats["dark"])
            for floor in range(2, min(floors, 7)):
                spawn_cube(unreal, f"Paris wrought-iron balcony {idx}-{floor}", (x, y - sy * 54, floor * 390), (sx * 0.86, 0.08, 0.08), mats["dark"])
        if city_id == "london" and idx % 2 == 0:
            spawn_cube(unreal, f"London stone cornice {idx}", (x, y - sy * 52, height - 120), (sx * 0.95, 0.12, 0.12), mats["sidewalk"])
        if city_id == "seoul" and idx % 3 == 1:
            spawn_cube(unreal, f"Seoul illuminated shop sign {idx}", (x, y - sy * 54, 380), (sx * 0.7, 0.06, 0.32), mats["warm"])
        if city_id == "new_york" and idx % 2 == 1:
            spawn_cube(unreal, f"NYC metal fire escape silhouette {idx}", (x + sx * 52, y, height * 0.45), (0.08, sy * 0.8, height / 240), mats["dark"])


def spawn_signals_and_street_furniture(unreal: Any, profile: dict[str, Any], mats: dict[str, Any], assets: dict[str, Any] | None = None) -> None:
    assets = assets or {}
    city_id = profile["id"]
    pole_mat = mats["dark"] if city_id in {"paris", "london"} else mats["accent"]
    for idx, (x, y) in enumerate([(-720, -720), (720, -720), (-720, 720), (720, 720)]):
        if spawn_static_mesh_asset(unreal, f"Photoreal traffic signal asset {idx}", assets.get("signal"), (x, y, 20), (1, 1, 1), rotation=(0, 0, 0)):
            continue
        spawn_cube(unreal, f"City signal pole {idx}", (x, y, 190), (0.14, 0.14, 3.8), pole_mat)
        spawn_cube(unreal, f"City signal head {idx}", (x, y, 390), (0.92, 0.16, 0.28), pole_mat)
        spawn_cube(unreal, f"Pedestrian button box {idx}", (x + 34, y, 130), (0.18, 0.10, 0.24), mats["marking"])
        if city_id in {"seoul", "new_york"}:
            spawn_cube(unreal, f"Overhead mast arm {idx}", (x * 0.65, y, 410), (3.2, 0.10, 0.10), pole_mat)

    # Furniture rows: bollards, trees, shelters, awnings.
    for i in range(-5, 6):
        for y in [-1550, 1550]:
            if not spawn_static_mesh_asset(unreal, f"Photoreal bollard asset {i} {y}", assets.get("bollard"), (i * 520, y, 14), (1, 1, 1)):
                spawn_cube(unreal, f"Bollard {i} {y}", (i * 520, y, 70), (0.10, 0.10, 0.55), mats["dark"])
    for i in range(-4, 5):
        for x, y in [(-1700, i * 520), (1700, i * 520)]:
            if not spawn_static_mesh_asset(unreal, f"Photoreal street tree asset {x} {i}", assets.get("tree"), (x, y, 20), (1, 1, 1)):
                spawn_cube(unreal, f"Tree trunk {x} {i}", (x, y, 160), (0.18, 0.18, 1.8), mats["warm"] if city_id == "paris" else mats["dark"])
                spawn_cube(unreal, f"Tree canopy {x} {i}", (x, y, 390), (0.85, 0.85, 0.85), mats["green"])
    if city_id == "seoul":
        spawn_cube(unreal, "Seoul subway entrance canopy", (-1450, 1650, 180), (3.4, 1.4, 1.2), mats["glass"])
        spawn_cube(unreal, "Seoul blue-green overhead wayfinding", (0, -1180, 520), (4.8, 0.10, 0.55), mats["green"])
    if city_id == "new_york":
        spawn_cube(unreal, "NYC green street sign", (0, -1320, 520), (3.8, 0.10, 0.45), mats["green"])
        spawn_cube(unreal, "NYC fire hydrant", (-1180, 1280, 70), (0.22, 0.22, 0.55), mats["warm"])
    if city_id == "paris":
        for i in range(-2, 3):
            spawn_cube(unreal, f"Paris cafe awning {i}", (i * 720, 1680, 310), (2.4, 0.34, 0.28), mats["warm"])
    if city_id == "london":
        spawn_cube(unreal, "London red bus stop totem", (-1320, 1500, 220), (0.28, 0.28, 2.0), mats["warm"])
        for i in range(-3, 4):
            spawn_cube(unreal, f"London black railing {i}", (i * 420, -1580, 120), (1.5, 0.06, 0.55), mats["dark"])


def spawn_vehicle(
    unreal: Any,
    name: str,
    location: tuple[float, float, float],
    yaw: float,
    mats: dict[str, Any],
    body_mat: Any,
    accent_mat: Any | None = None,
    roof_sign: bool = False,
    emergency: bool = False,
    assets: dict[str, Any] | None = None,
) -> None:
    if assets and spawn_static_mesh_asset(unreal, f"{name} imported sedan mesh", assets.get("sedan"), location, (1, 1, 1), rotation=(0, 0, yaw)):
        if roof_sign:
            x0, y0, z0 = location
            spawn_cube(unreal, f"{name} taxi roof sign", (x0, y0, z0 + 105), (0.28, 0.22, 0.08), mats["warm"], rotation=(0, 0, yaw))
        if emergency:
            x0, y0, z0 = location
            spawn_cube(unreal, f"{name} emergency lightbar", (x0, y0, z0 + 108), (0.42, 0.12, 0.08), mats["accent"], rotation=(0, 0, yaw))
        return
    x, y, z = location
    accent = accent_mat or mats["marking"]
    spawn_cube(unreal, f"{name} body shell", (x, y, z), (0.74, 1.55, 0.32), body_mat, rotation=(0, 0, yaw))
    spawn_cube(unreal, f"{name} cabin glass", (x, y, z + 34), (0.54, 0.78, 0.28), mats["glass"], rotation=(0, 0, yaw))
    spawn_cube(unreal, f"{name} windshield", (x, y + 48, z + 42), (0.44, 0.055, 0.18), mats["glass"], rotation=(0, 0, yaw))
    spawn_cube(unreal, f"{name} rear window", (x, y - 56, z + 40), (0.42, 0.055, 0.16), mats["glass"], rotation=(0, 0, yaw))
    for suffix, dx, dy in [("FL", -34, 58), ("FR", 34, 58), ("RL", -34, -58), ("RR", 34, -58)]:
        spawn_cube(unreal, f"{name} wheel {suffix}", (x + dx, y + dy, z - 26), (0.16, 0.30, 0.20), mats["dark"], rotation=(0, 0, yaw))
    spawn_cube(unreal, f"{name} headlight bar", (x, y + 83, z + 8), (0.50, 0.035, 0.065), mats["marking"], rotation=(0, 0, yaw))
    spawn_cube(unreal, f"{name} tail light bar", (x, y - 83, z + 8), (0.45, 0.035, 0.065), accent, rotation=(0, 0, yaw))
    if roof_sign:
        spawn_cube(unreal, f"{name} taxi roof sign", (x, y, z + 70), (0.28, 0.22, 0.08), mats["warm"], rotation=(0, 0, yaw))
    if emergency:
        spawn_cube(unreal, f"{name} emergency lightbar", (x, y, z + 73), (0.42, 0.12, 0.08), mats["accent"], rotation=(0, 0, yaw))


def spawn_bus(unreal: Any, name: str, location: tuple[float, float, float], yaw: float, mats: dict[str, Any], body_mat: Any, assets: dict[str, Any] | None = None) -> None:
    if assets and spawn_static_mesh_asset(unreal, f"{name} imported bus mesh", assets.get("bus"), location, (1, 1, 1), rotation=(0, 0, yaw)):
        return
    x, y, z = location
    spawn_cube(unreal, f"{name} long body", (x, y, z), (1.08, 3.35, 0.62), body_mat, rotation=(0, 0, yaw))
    spawn_cube(unreal, f"{name} black window ribbon", (x, y, z + 44), (0.92, 2.88, 0.22), mats["glass"], rotation=(0, 0, yaw))
    spawn_cube(unreal, f"{name} destination sign", (x, y + 170, z + 62), (0.66, 0.04, 0.14), mats["marking"], rotation=(0, 0, yaw))
    for i, dy in enumerate([-126, -42, 42, 126]):
        spawn_cube(unreal, f"{name} wheel pair {i} left", (x - 54, y + dy, z - 42), (0.18, 0.28, 0.24), mats["dark"], rotation=(0, 0, yaw))
        spawn_cube(unreal, f"{name} wheel pair {i} right", (x + 54, y + dy, z - 42), (0.18, 0.28, 0.24), mats["dark"], rotation=(0, 0, yaw))


def spawn_detail_row(unreal: Any, prefix: str, start_x: float, y: float, count: int, spacing: float, mats: dict[str, Any]) -> None:
    for i in range(count):
        x = start_x + i * spacing
        spawn_cube(unreal, f"{prefix} vertical post {i}", (x, y, 86), (0.07, 0.07, 0.62), mats["dark"])
        spawn_cube(unreal, f"{prefix} top rail {i}", (x, y, 130), (0.32, 0.045, 0.055), mats["dark"])


def spawn_bus_shelter(unreal: Any, label: str, location: tuple[float, float, float], mats: dict[str, Any], yaw: float = 0) -> None:
    x, y, z = location
    spawn_cube(unreal, f"{label} shelter glass back", (x, y, z + 72), (2.4, 0.07, 1.25), mats["glass"], rotation=(0, 0, yaw))
    spawn_cube(unreal, f"{label} shelter roof", (x, y, z + 145), (2.7, 0.55, 0.10), mats["dark"], rotation=(0, 0, yaw))
    spawn_cube(unreal, f"{label} shelter bench", (x, y + 18, z + 38), (1.4, 0.16, 0.18), mats["sidewalk"], rotation=(0, 0, yaw))
    spawn_cube(unreal, f"{label} lit ad panel", (x + 108, y - 8, z + 78), (0.36, 0.04, 0.82), mats["warm"], rotation=(0, 0, yaw))


def spawn_tactile_paving(unreal: Any, label: str, x: float, y: float, mats: dict[str, Any]) -> None:
    for ix in range(4):
        for iy in range(3):
            spawn_cube(unreal, f"{label} tactile dome {ix}-{iy}", (x + ix * 34, y + iy * 34, 38), (0.09, 0.09, 0.035), mats["accent"])


def spawn_city_specific_details(unreal: Any, profile: dict[str, Any], mats: dict[str, Any], road_width: float) -> None:
    city_id = profile["id"]
    display = profile["display_name"]
    # CCTV/traffic-control road annotation bars: intentionally geometric but readable from editor screenshots.
    if city_id == "seoul":
        spawn_bus_shelter(unreal, "Seoul glass bus", (-980, 1710, 42), mats)
        for i in range(5):
            spawn_cube(unreal, f"Seoul stacked Korean shop sign {i}", (-2360, -1770, 430 + i * 155), (0.56, 0.06, 0.34), mats["warm"] if i % 2 else mats["green"])
        for i in range(4):
            spawn_cube(unreal, f"Seoul smart kiosk screen {i}", (-1420 + i * 280, 1450, 122), (0.24, 0.08, 0.88), mats["glass"])
        spawn_flat_marking(unreal, "Seoul BUS lane word bar 1", -760, road_width / 2 - 160, 42, 2.0, 0.12, mats["marking"], 0)
        spawn_flat_marking(unreal, "Seoul BUS lane word bar 2", -420, road_width / 2 - 160, 42, 1.4, 0.12, mats["marking"], 90)
    elif city_id == "new_york":
        for i in range(5):
            spawn_cube(unreal, f"NYC parking regulation sign plate {i}", (-1320, -1540, 270 + i * 72), (0.42, 0.035, 0.20), mats["marking"])
        for i in range(7):
            spawn_cube(unreal, f"NYC scaffolding upright {i}", (-2520 + i * 180, -1850, 210), (0.055, 0.055, 2.35), mats["dark"])
            spawn_cube(unreal, f"NYC scaffolding rail {i}", (-2520 + i * 180, -1850, 270), (0.72, 0.04, 0.045), mats["dark"])
        for y in [-road_width / 2 - 690, road_width / 2 + 690]:
            spawn_flat_marking(unreal, f"NYC ladder crosswalk rail {y} A", -460, y, 46, 0.10, 6.4, mats["marking"], 0)
            spawn_flat_marking(unreal, f"NYC ladder crosswalk rail {y} B", 460, y, 46, 0.10, 6.4, mats["marking"], 0)
        spawn_cube(unreal, "NYC manhole utility plate", (620, -510, 42), (0.54, 0.54, 0.025), mats["dark"])
    elif city_id == "paris":
        for i in range(-2, 3):
            spawn_cube(unreal, f"Paris cafe table {i}", (i * 220, 1510, 58), (0.24, 0.24, 0.08), mats["dark"])
            spawn_cube(unreal, f"Paris cafe chair left {i}", (i * 220 - 58, 1510, 52), (0.16, 0.14, 0.22), mats["green"])
            spawn_cube(unreal, f"Paris cafe chair right {i}", (i * 220 + 58, 1510, 52), (0.16, 0.14, 0.22), mats["green"])
        for i in range(-4, 5):
            spawn_cube(unreal, f"Paris tree grate {i}", (-1700, i * 520, 34), (0.75, 0.75, 0.025), mats["dark"])
        for i in range(6):
            spawn_cube(unreal, f"Paris stone facade pilaster {i}", (-3200 + i * 240, 2530, 660), (0.08, 0.11, 4.2), mats["sidewalk"])
        spawn_bus_shelter(unreal, "Paris boulevard bus", (1120, -1580, 42), mats, yaw=180)
    elif city_id == "london":
        for i in range(-5, 6):
            spawn_flat_marking(unreal, f"London zig zag north {i}", i * 220, -road_width / 2 - 880, 46, 0.10, 1.7, mats["marking"], 32)
            spawn_flat_marking(unreal, f"London zig zag south {i}", i * 220, road_width / 2 + 880, 46, 0.10, 1.7, mats["marking"], -32)
        for x, y in [(-920, -940), (920, -940), (-920, 940), (920, 940)]:
            spawn_tactile_paving(unreal, f"London crossing {x} {y}", x, y, mats)
        spawn_cube(unreal, "London Belisha beacon pole", (1340, -1320, 180), (0.10, 0.10, 1.7), mats["dark"])
        spawn_cube(unreal, "London Belisha amber globe", (1340, -1320, 360), (0.24, 0.24, 0.24), mats["accent"])
        spawn_cube(unreal, "London signal control cabinet", (-1040, 1320, 96), (0.52, 0.32, 0.82), mats["green"])
        for y in [-road_width / 2 - 240, road_width / 2 + 240]:
            spawn_flat_marking(unreal, f"London double yellow curb {y} A", -1200, y, 44, 18.0, 0.055, mats["accent"], 0)
            spawn_flat_marking(unreal, f"London double yellow curb {y} B", -1200, y + 48, 44, 18.0, 0.055, mats["accent"], 0)
    spawn_cube(unreal, f"{display} CCTV municipal timestamp plate", (-1540, -1280, 260), (2.0, 0.04, 0.24), mats["dark"])
    for i in range(7):
        spawn_cube(unreal, f"{display} CCTV timestamp glyph {i}", (-1620 + i * 45, -1286, 270), (0.13, 0.02, 0.045), mats["marking"])


def spawn_traffic(unreal: Any, profile: dict[str, Any], mats: dict[str, Any], assets: dict[str, Any] | None = None) -> None:
    city_id = profile["id"]
    vehicle_count = min(28, profile["traffic"].get("vehicle_placeholders", 24))
    traffic_side = profile.get("traffic_side", "right")
    lane_sign = -1 if traffic_side == "left" else 1
    for i in range(vehicle_count):
        along = -6800 + i * 520
        if i % 2 == 0:
            x, y, rot = lane_sign * (250 + (i % 3) * 155), along, 0
        else:
            x, y, rot = along, -lane_sign * (250 + (i % 3) * 155), 90
        is_taxi = city_id == "new_york" and i % 4 == 0
        is_service = i in {3, 17}
        body = mats["warm"] if is_taxi else (mats["accent"] if is_service else mats["facade"] if i % 3 == 0 else mats["glass"])
        spawn_vehicle(unreal, f"CCTV tracked vehicle {i}", (x, y, 92), rot, mats, body, mats["accent"], roof_sign=is_taxi, emergency=is_service, assets=assets)
    for i in range(profile["traffic"].get("bus_placeholders", 2)):
        bus_mat = mats["warm"] if city_id in {"seoul", "london"} else mats["accent"]
        spawn_bus(unreal, f"City transit bus {i}", (-560 + i * 900, 1040 + i * 180, 128), 90, mats, bus_mat, assets=assets)
    for i in range(min(24, profile["traffic"].get("pedestrian_placeholders", 16))):
        angle = i * (math.tau / 24)
        x = math.cos(angle) * 1140
        y = math.sin(angle) * 1140
        spawn_cube(unreal, f"Pedestrian torso silhouette {i}", (x, y, 96), (0.16, 0.16, 0.72), mats["dark"])
        spawn_cube(unreal, f"Pedestrian head silhouette {i}", (x, y, 148), (0.18, 0.18, 0.18), mats["warm"] if i % 5 == 0 else mats["sidewalk"])


def light_component_from_actor(unreal: Any, actor: Any, component_class_name: str, property_names: list[str]) -> Any | None:
    component_class = getattr(unreal, component_class_name, None)
    if component_class:
        component = actor.get_component_by_class(component_class)
        if component:
            return component
    for property_name in property_names:
        if hasattr(actor, property_name):
            return getattr(actor, property_name)
        try:
            component = actor.get_editor_property(property_name)
            if component:
                return component
        except Exception:
            pass
    return None


def set_component_property(component: Any | None, name: str, value: Any) -> None:
    if not component:
        return
    try:
        component.set_editor_property(name, value)
    except Exception:
        pass


def spawn_cctv_rig(unreal: Any, profile: dict[str, Any], mats: dict[str, Any], cam_loc: tuple[float, float, float], assets: dict[str, Any] | None = None) -> None:
    assets = assets or {}
    city = profile["display_name"]
    if spawn_static_mesh_asset(unreal, f"{city} imported CCTV rig mesh", assets.get("cctv"), (cam_loc[0] - 135, cam_loc[1] - 95, 20), (1, 1, 1), rotation=(0, 0, 35)):
        return
    pole_x, pole_y = cam_loc[0] - 135, cam_loc[1] - 95
    pole_height = max(700, cam_loc[2] - 120)
    spawn_cube(unreal, f"{city} CCTV pole", (pole_x, pole_y, pole_height / 2), (0.13, 0.13, pole_height / 100), mats["dark"])
    spawn_cube(unreal, f"{city} CCTV mast arm", (cam_loc[0] - 62, cam_loc[1] - 42, cam_loc[2]), (1.55, 0.075, 0.075), mats["dark"], rotation=(0, 0, 35))
    spawn_cube(unreal, f"{city} CCTV camera housing", cam_loc, (0.44, 0.25, 0.20), mats["dark"], rotation=(0, 0, 35))
    spawn_cube(unreal, f"{city} CCTV sun visor", (cam_loc[0], cam_loc[1], cam_loc[2] + 18), (0.56, 0.31, 0.035), mats["dark"], rotation=(0, 0, 35))
    spawn_cube(unreal, f"{city} CCTV glass lens", (cam_loc[0] - 30, cam_loc[1] + 18, cam_loc[2] - 2), (0.16, 0.035, 0.12), mats["glass"], rotation=(0, 0, 35))
    spawn_cube(unreal, f"{city} CCTV red status LED", (cam_loc[0] + 18, cam_loc[1] - 11, cam_loc[2] + 12), (0.045, 0.035, 0.045), mats["accent"], rotation=(0, 0, 35))
    spawn_cube(unreal, f"{city} CCTV foreground bracket silhouette", (cam_loc[0] - 185, cam_loc[1] + 80, cam_loc[2] - 90), (0.08, 1.45, 0.08), mats["dark"], rotation=(0, 0, 35))


def spawn_lighting_and_camera(unreal: Any, profile: dict[str, Any], assets: dict[str, Any] | None = None) -> None:
    city_id = profile["id"]
    cam_data = profile["camera"]
    mats = make_materials(unreal, city_id)
    cam_loc = cctv_camera_location(city_id, cam_data["location_cm"])
    target = tuple(cam_data.get("target_cm", (0, 0, 165)))
    camera = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.CineCameraActor, unreal.Vector(*cam_loc))
    camera.set_actor_label(f"CCTV {profile['display_name']} Traffic Control View")
    camera.set_actor_rotation(unreal.Rotator(*look_at_rotation_deg(cam_loc, target)), False)
    cine = camera.get_cine_camera_component()
    cine.current_focal_length = cctv_focal_length(city_id, cam_data["focal_length_mm"])
    set_component_property(cine, "current_aperture", 8.0)

    spawn_cctv_rig(unreal, profile, mats, cam_loc, assets=assets)

    sun = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(-2400, -1800, 7000))
    sun.set_actor_label(f"{profile['display_name']} movable sun / sky key")
    sun_component = light_component_from_actor(unreal, sun, "DirectionalLightComponent", ["directional_light_component"])
    if sun_component:
        sun_component.set_mobility(mobility(unreal))
        set_component_property(sun_component, "intensity", 9.0 if city_id in {"seoul", "london"} else 7.5)
    else:
        unreal.log_warning("Could not find DirectionalLightComponent on spawned DirectionalLight")

    if hasattr(unreal, "SkyLight"):
        sky = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 3600))
        sky.set_actor_label(f"{profile['display_name']} bright ambient skylight")
        sky_component = light_component_from_actor(unreal, sky, "SkyLightComponent", ["sky_light_component"])
        if sky_component:
            sky_component.set_mobility(mobility(unreal))
            set_component_property(sky_component, "intensity", 3.0)

    light_positions = [
        (-1800, -1800, 620), (1800, -1800, 620), (-1800, 1800, 620), (1800, 1800, 620),
        (0, -2400, 760), (0, 2400, 760), (-2400, 0, 760), (2400, 0, 760),
    ]
    for index, position in enumerate(light_positions):
        spawn_static_mesh_asset(unreal, f"{profile['display_name']} imported street light mesh {index}", (assets or {}).get("street_light"), (position[0], position[1], 20), (1, 1, 1))
        point = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.PointLight, unreal.Vector(*position))
        point.set_actor_label(f"{profile['display_name']} street light {index}")
        point_component = light_component_from_actor(unreal, point, "PointLightComponent", ["point_light_component"])
        if point_component:
            point_component.set_mobility(mobility(unreal))
            set_component_property(point_component, "intensity", 2600.0)
            set_component_property(point_component, "attenuation_radius", 3900.0)


def spawn_city(unreal: Any, profile: dict[str, Any]) -> None:
    random.seed(profile.get("seed", 20260611))
    map_asset = f"/Game/Maps/Generated/{profile['id']}_Intersection"
    unreal.EditorAssetLibrary.make_directory("/Game/Maps/Generated")
    if unreal.EditorAssetLibrary.does_asset_exist(map_asset):
        if hasattr(unreal, "EditorLoadingAndSavingUtils"):
            unreal.EditorLoadingAndSavingUtils.new_blank_map(False)
        if not unreal.EditorAssetLibrary.delete_asset(map_asset):
            raise RuntimeError(f"Failed to delete existing level asset {map_asset}")
    if not unreal.EditorLevelLibrary.new_level(map_asset):
        raise RuntimeError(f"Failed to create level {map_asset}")

    mats = make_materials(unreal, profile["id"])
    assets = import_photoreal_kit(unreal)
    lanes = profile["intersection"]["lanes_per_direction"]
    lane_width = profile["intersection"]["lane_width_cm"]
    road_width = lanes * lane_width * 2 + profile["intersection"].get("median_width_cm", 0)

    spawn_roads(unreal, profile, mats, road_width)
    spawn_buildings(unreal, profile, mats)
    spawn_signals_and_street_furniture(unreal, profile, mats, assets=assets)
    spawn_city_specific_details(unreal, profile, mats, road_width)
    spawn_traffic(unreal, profile, mats, assets=assets)
    spawn_lighting_and_camera(unreal, profile, assets=assets)

    if hasattr(unreal, "EditorLoadingAndSavingUtils"):
        saved = unreal.EditorLoadingAndSavingUtils.save_current_level()
    else:
        saved = unreal.EditorLevelLibrary.save_current_level()
    if not saved:
        raise RuntimeError(f"Failed to save generated level {map_asset}")
    unreal.log(f"Generated city intersection: {profile['display_name']}")


def main() -> None:
    profile_arg = _arg_value("--profile") or os.getenv("SMART_INTERSECTION_CITY_PROFILE")
    if not profile_arg:
        raise SystemExit("Pass --profile <path> or SMART_INTERSECTION_CITY_PROFILE")
    profile = load_profile(Path(profile_arg))
    import unreal  # type: ignore

    spawn_city(unreal, profile)


if __name__ == "__main__":
    main()
