"""Create local FBX assets for SmartIntersection Unreal photoreal kit.

Run with Blender:
  blender --background --python tools/asset-pipeline/create_photoreal_kit.py
"""
from __future__ import annotations

import math
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "renderer" / "unreal" / "SmartIntersection" / "SourceAssets" / "PhotorealKit"
OUT.mkdir(parents=True, exist_ok=True)


def clean() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def mat(name: str, color: tuple[float, float, float, float], metallic: float = 0.0, roughness: float = 0.45, alpha_blend: bool = False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    if alpha_blend or color[3] < 1:
        m.blend_method = "BLEND"
        m.use_screen_refraction = True
        m.show_transparent_back = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
    return m

MAT = {}

def init_mats() -> None:
    MAT.clear()
    MAT.update({
        "asphalt": mat("wet_charcoal_asphalt", (0.015, 0.016, 0.017, 1), 0, 0.18),
        "black": mat("powder_coated_black", (0.005, 0.005, 0.005, 1), 0, 0.28),
        "glass": mat("dark_cctv_glass", (0.015, 0.05, 0.07, 0.65), 0, 0.08),
        "chrome": mat("brushed_dark_metal", (0.30, 0.31, 0.30, 1), 0.65, 0.22),
        "white": mat("retroreflective_white", (0.88, 0.90, 0.86, 1), 0, 0.25),
        "red": mat("signal_red_lens", (0.80, 0.02, 0.01, 1), 0, 0.15),
        "amber": mat("signal_amber_lens", (0.95, 0.58, 0.02, 1), 0, 0.16),
        "green": mat("signal_green_lens", (0.02, 0.46, 0.16, 1), 0, 0.18),
        "taxi": mat("taxi_yellow_paint", (0.95, 0.66, 0.04, 1), 0, 0.32),
        "busred": mat("transit_red_paint", (0.65, 0.02, 0.02, 1), 0, 0.34),
        "blue": mat("utility_blue_paint", (0.02, 0.12, 0.36, 1), 0, 0.35),
        "stone": mat("warm_city_stone", (0.62, 0.55, 0.45, 1), 0, 0.58),
        "brick": mat("weathered_city_brick", (0.39, 0.12, 0.07, 1), 0, 0.62),
        "leaf": mat("dense_urban_leaf", (0.04, 0.24, 0.10, 1), 0, 0.55),
        "puddle": mat("cinematic_oil_slick_puddle", (0.005, 0.012, 0.018, 0.62), 0, 0.025, alpha_blend=True),
        "sheen": mat("thin_wet_road_sheen", (0.018, 0.020, 0.022, 0.40), 0, 0.035, alpha_blend=True),
        "headlight_pool": mat("warm_headlight_pool_reflection", (1.0, 0.78, 0.36, 0.42), 0, 0.05, alpha_blend=True),
    })


def cube(name, loc, scale, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    bevel = obj.modifiers.new(name="small_bevels", type="BEVEL")
    bevel.width = min(scale) * 0.08
    bevel.segments = 2
    obj.modifiers.new(name="weighted_normals", type="WEIGHTED_NORMAL")
    return obj


def cyl(name, loc, radius, depth, material, vertices=32, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    obj.modifiers.new(name="weighted_normals", type="WEIGHTED_NORMAL")
    return obj


def sphere(name, loc, radius, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=radius, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def export(name: str) -> None:
    path = OUT / f"{name}.fbx"
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.fbx(filepath=str(path), use_selection=True, apply_unit_scale=True, bake_space_transform=False)
    print(f"EXPORTED {path}")


def sedan() -> None:
    clean(); init_mats()
    cube("sedan_lower_body", (0, 0, 0.55), (2.05, 4.35, 0.65), MAT["blue"])
    cube("sedan_upper_cabin", (0, -0.25, 1.15), (1.42, 2.15, 0.70), MAT["glass"])
    cube("sedan_front_windshield", (0, 1.00, 1.18), (1.28, 0.08, 0.52), MAT["glass"])
    cube("sedan_rear_windshield", (0, -1.45, 1.10), (1.20, 0.08, 0.42), MAT["glass"])
    for x in (-0.93, 0.93):
        for y in (-1.55, 1.55):
            cyl("sedan_tire", (x, y, 0.36), 0.34, 0.22, MAT["black"], rot=(math.pi/2, 0, 0))
            cyl("sedan_wheel_hub", (x, y, 0.36), 0.17, 0.24, MAT["chrome"], rot=(math.pi/2, 0, 0))
    for x in (-0.45, 0.45):
        sphere("sedan_headlight", (x, 2.23, 0.62), 0.12, MAT["white"])
        sphere("sedan_tail_light", (x, -2.23, 0.62), 0.10, MAT["red"])
    cube("sedan_license_plate", (0, 2.27, 0.42), (0.55, 0.035, 0.18), MAT["white"])
    export("sedan_photoreal_proxy")


def city_bus() -> None:
    clean(); init_mats()
    cube("bus_body", (0, 0, 0.85), (2.45, 7.2, 1.55), MAT["busred"])
    cube("bus_window_ribbon_left", (-1.24, 0, 1.32), (0.035, 6.5, 0.42), MAT["glass"])
    cube("bus_window_ribbon_right", (1.24, 0, 1.32), (0.035, 6.5, 0.42), MAT["glass"])
    cube("bus_destination_sign", (0, 3.66, 1.55), (1.2, 0.06, 0.28), MAT["white"])
    for x in (-1.25, 1.25):
        for y in (-2.65, -0.75, 1.65, 2.85):
            cyl("bus_tire", (x, y, 0.38), 0.38, 0.25, MAT["black"], rot=(math.pi/2, 0, 0))
            cyl("bus_hub", (x, y, 0.38), 0.18, 0.27, MAT["chrome"], rot=(math.pi/2, 0, 0))
    export("city_bus_photoreal_proxy")


def cctv() -> None:
    clean(); init_mats()
    cyl("cctv_pole", (0, 0, 3.2), 0.075, 6.4, MAT["black"])
    cyl("cctv_mast_arm", (0.8, 0, 6.15), 0.055, 1.8, MAT["black"], rot=(0, math.pi/2, 0))
    cyl("cctv_bullet_housing", (1.75, 0, 6.15), 0.22, 0.72, MAT["black"], rot=(0, math.pi/2, 0))
    cube("cctv_sun_visor", (1.75, 0, 6.40), (0.86, 0.55, 0.055), MAT["black"])
    sphere("cctv_glass_lens", (2.12, 0, 6.15), 0.16, MAT["glass"])
    sphere("cctv_red_status_led", (1.55, -0.23, 6.32), 0.045, MAT["red"])
    export("cctv_bullet_rig_photoreal_proxy")


def traffic_signal() -> None:
    clean(); init_mats()
    cyl("signal_pole", (0, 0, 2.0), 0.07, 4.0, MAT["black"])
    cyl("signal_mast", (0.85, 0, 3.8), 0.05, 1.8, MAT["black"], rot=(0, math.pi/2, 0))
    cube("signal_head_housing", (1.8, 0, 3.55), (0.42, 0.25, 0.88), MAT["black"])
    sphere("signal_red_lens", (1.8, -0.14, 3.83), 0.095, MAT["red"])
    sphere("signal_amber_lens", (1.8, -0.14, 3.55), 0.095, MAT["amber"])
    sphere("signal_green_lens", (1.8, -0.14, 3.27), 0.095, MAT["green"])
    cube("ped_button_box", (0.11, -0.08, 1.35), (0.22, 0.10, 0.32), MAT["white"])
    export("traffic_signal_photoreal_proxy")


def street_light() -> None:
    clean(); init_mats()
    cyl("streetlight_pole", (0, 0, 2.8), 0.06, 5.6, MAT["black"])
    cyl("streetlight_arm", (0.65, 0, 5.25), 0.04, 1.3, MAT["black"], rot=(0, math.pi/2, 0))
    sphere("streetlight_globe", (1.35, 0, 5.12), 0.22, MAT["amber"])
    export("street_light_photoreal_proxy")


def urban_tree() -> None:
    clean(); init_mats()
    cyl("tree_trunk", (0, 0, 1.1), 0.18, 2.2, MAT["brick"])
    sphere("tree_lower_canopy", (0, 0, 2.65), 0.95, MAT["leaf"])
    sphere("tree_upper_canopy", (0.25, -0.15, 3.25), 0.72, MAT["leaf"])
    export("urban_tree_photoreal_proxy")


def bollard() -> None:
    clean(); init_mats()
    cyl("bollard_body", (0,0,0.48), 0.105, 0.96, MAT["black"])
    sphere("bollard_cap", (0,0,0.99), 0.115, MAT["chrome"])
    cube("bollard_reflective_band", (0, -0.108, 0.64), (0.18, 0.012, 0.08), MAT["white"])
    export("bollard_photoreal_proxy")


def wet_road_cinematic_decals() -> None:
    clean(); init_mats()
    # Use very thin meshes slightly above the road. Unreal places the whole kit on top of asphalt.
    for i, (x, y, rx, ry) in enumerate([
        (-1.25, -2.4, 0.95, 0.28), (0.95, -1.15, 0.55, 0.22), (1.85, 1.95, 0.75, 0.24),
        (-2.1, 2.35, 0.45, 0.18), (0.15, 2.75, 1.15, 0.30),
    ]):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=12, radius=1, location=(x, y, 0.018))
        obj = bpy.context.object
        obj.name = f"irregular_puddle_reflection_{i}"
        obj.scale = (rx, ry, 0.006)
        obj.data.materials.append(MAT["puddle"])
    for i, (x, y, sx, sy) in enumerate([
        (-1.8, -0.2, 0.10, 4.8), (-0.55, 0.35, 0.08, 5.7), (0.75, -0.10, 0.10, 5.4),
        (1.85, 0.28, 0.07, 4.2), (0.05, -2.95, 2.9, 0.05),
    ]):
        cube(f"subtle_wet_tire_sheen_{i}", (x, y, 0.026), (sx, sy, 0.012), MAT["sheen"])
    for i, (x, y) in enumerate([(-0.52, -3.05), (0.52, -3.05), (-0.45, 3.05), (0.45, 3.05)]):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=8, radius=1, location=(x, y, 0.032))
        obj = bpy.context.object
        obj.name = f"soft_headlight_reflection_pool_{i}"
        obj.scale = (0.32, 0.92, 0.004)
        obj.data.materials.append(MAT["headlight_pool"])
    for i, y in enumerate([-2.0, -1.1, -0.2, 0.7, 1.6, 2.5]):
        cube(f"worn_cinematic_lane_dash_{i}", (0, y, 0.04), (0.16, 0.58, 0.012), MAT["white"])
    export("wet_road_cinematic_decals_photoreal_proxy")


if __name__ == "__main__":
    for fn in [sedan, city_bus, cctv, traffic_signal, street_light, urban_tree, bollard, wet_road_cinematic_decals]:
        fn()
