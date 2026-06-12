#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
UE = ROOT / "renderer" / "unreal" / "SmartIntersection"
SOURCE = UE / "SourceAssets" / "PhotorealRoadKit"
GEN = UE / "Content" / "Python" / "generate_road_intersection.py"
LONDON_MAP = UE / "Content" / "Maps" / "Generated" / "london_RoadOnly.umap"

REQUIRED_SOURCE = [
    "Textures/T_london_asphalt_albedo.png",
    "Textures/T_london_asphalt_normal.png",
    "Textures/T_london_asphalt_albedo.jpg",
    "Textures/T_london_asphalt_normal.jpg",
    "Textures/T_london_asphalt_roughness.jpg",
    "Textures/T_london_curb_concrete.png",
    "Textures/T_london_red_bus_lane_worn.png",
    "Textures/T_london_yellow_thermoplastic_worn.png",
    "Textures/T_london_white_road_text_worn.png",
    "Textures/T_london_text_bus_lane.png",
    "Textures/T_london_text_look_left.png",
    "Textures/T_london_text_look_right.png",
    "Textures/T_london_text_keep_clear.png",
    "Textures/T_london_drain_grate_metal.png",
    "Textures/T_london_wet_puddle_reflection.png",
    "Textures/T_london_sidewalk_stone.png",
    "Textures/T_london_brick_facade.png",
    "Textures/T_london_brick_facade.jpg",
    "Textures/T_london_brick_normal.jpg",
    "Textures/T_london_glass_windows.png",
    "Textures/T_london_regulatory_sign_plate.png",
    "Meshes/curb_beveled_module.obj",
    "Meshes/paint_worn_strip.obj",
    "Meshes/signal_head_uk_black.obj",
    "Meshes/signal_pole_slim.obj",
    "Meshes/utility_cover_round.obj",
    "Meshes/drain_grate_rect.obj",
    "Meshes/keep_left_bollard.obj",
    "Meshes/tactile_paving_tile.obj",
    "Meshes/london_shopfront_module.obj",
    "Meshes/london_window_strip.obj",
    "Meshes/regulatory_sign_plate.obj",
    "CC0AmbientCG/Road007_1K-JPG_Color.jpg",
    "CC0AmbientCG/Road007_1K-JPG_NormalGL.jpg",
    "CC0AmbientCG/Bricks097_1K-JPG_Color.jpg",
]

REQUIRED_GENERATOR_TOKENS = [
    "PhotorealRoadKit",
    "paint_edge_breakup",
    "utility_cover_mesh",
    "curb_profile_mesh",
    "signal_pole_mesh",
    "uk_black_signal_head_mesh",
    "keep_left_bollard_mesh",
    "tactile_paving_tile_mesh",
    "LOOK LEFT",
    "LOOK RIGHT",
    "BUS LANE",
    "KEEP CLEAR",
    "road_text_BUS_LANE_texture_plane",
    "road_text_LOOK_LEFT_texture_plane",
    "PhotorealScene_london_wet_asphalt_puddle_reflection",
    "PhotorealScene_london_brick_shopfront",
    "PhotorealScene_london_sidewalk_stone",
    "PhotorealScene_london_color_grade_postprocess",
    "CC0AmbientCG",
    "install_cc0_texture_sources",
]

REQUIRED_MAP_TOKENS = [
    b"PhotorealRoadKit_london_worn_asphalt_surface_texture_visible",
    b"PhotorealRoadKit_london_red_bus_lane_worn_surface_texture_visible",
    b"PhotorealRoadKit_london_paint_edge_breakup_yellow_box_a_0",
    b"PhotorealRoadKit_london_curb_profile_mesh_0_525",
    b"PhotorealRoadKit_london_utility_cover_mesh_0",
    b"PhotorealRoadKit_london_keep_left_bollard_mesh_0",
    b"PhotorealRoadKit_london_uk_black_signal_head_mesh_0",
    b"PhotorealRoadKit_london_road_text_LOOK_LEFT_visible",
    b"PhotorealRoadKit_london_road_text_BUS_LANE_visible",
    b"PhotorealRoadKit_london_road_text_BUS_LANE_texture_plane_visible",
    b"PhotorealRoadKit_london_road_text_KEEP_CLEAR_texture_plane_visible",
    b"PhotorealScene_london_wet_asphalt_puddle_reflection_foreground_0",
    b"PhotorealScene_london_sidewalk_stone_left_context",
    b"PhotorealScene_london_brick_shopfront_left_0",
    b"PhotorealScene_london_regulatory_sign_plate_0",
    b"PhotorealScene_london_color_grade_postprocess",
]

FORBIDDEN = ["spawn_vehicle", "spawn_pedestrian", "traffic_ai_controller", "drivable_car", "gameplay_mode"]


def fail(message: str) -> None:
    print(f"PHOTOREAL_FIDELITY_FAIL: {message}")
    raise SystemExit(1)


def check_image(path: Path) -> None:
    if not path.exists():
        fail(f"missing texture: {path}")
    im = Image.open(path).convert("RGB")
    if im.size[0] < 512 or im.size[1] < 512:
        fail(f"texture too small: {path} {im.size}")
    stat = ImageStat.Stat(im)
    if sum(stat.stddev) / 3 < 4:
        fail(f"texture has too little variation: {path} stddev={stat.stddev}")


def main() -> int:
    if not SOURCE.exists():
        fail(f"missing source asset root: {SOURCE}")
    for rel in REQUIRED_SOURCE:
        path = SOURCE / rel
        if not path.exists():
            fail(f"missing source asset: {rel}")
        if path.suffix.lower() in {".png", ".jpg", ".jpeg"}:
            check_image(path)
        elif path.stat().st_size < 200:
            fail(f"mesh source too small: {rel}")
    text = GEN.read_text(encoding="utf-8")
    lower = text.lower()
    for token in REQUIRED_GENERATOR_TOKENS:
        if token not in text:
            fail(f"generator missing token: {token}")
    for token in FORBIDDEN:
        if token in lower:
            fail(f"forbidden implementation token: {token}")
    if not LONDON_MAP.exists() or LONDON_MAP.stat().st_size < 200_000:
        fail(f"london map missing or too small: {LONDON_MAP}")
    map_bytes = LONDON_MAP.read_bytes()
    for token in REQUIRED_MAP_TOKENS:
        if token not in map_bytes:
            fail(f"london map missing fidelity actor token: {token.decode('utf-8')}")
    print("PHOTOREAL_FIDELITY_PASS city=london")
    print(f"source_assets={len(REQUIRED_SOURCE)}")
    print(f"generator_tokens={len(REQUIRED_GENERATOR_TOKENS)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
