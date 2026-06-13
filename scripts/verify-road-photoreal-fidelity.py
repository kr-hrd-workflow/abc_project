#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
UE = ROOT / "renderer" / "unreal" / "SmartIntersection"
SOURCE = UE / "SourceAssets" / "PhotorealRoadKit"
GEN = UE / "Content" / "Python" / "generate_road_intersection.py"
CAPTURE = UE / "Content" / "Python" / "capture_road_only_render_target.py"
LONDON_MAP = UE / "Content" / "Maps" / "Generated" / "london_RoadOnly.umap"
SEOUL_MAP = UE / "Content" / "Maps" / "Generated" / "seoul_RoadOnly.umap"
NEW_YORK_MAP = UE / "Content" / "Maps" / "Generated" / "new_york_RoadOnly.umap"
PARIS_MAP = UE / "Content" / "Maps" / "Generated" / "paris_RoadOnly.umap"

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
    "Textures/T_london_zebra_crossing_worn.png",
    "Textures/T_london_lane_arrow_straight_worn.png",
    "Textures/T_london_lane_arrow_left_worn.png",
    "Textures/T_london_asphalt_crack_overlay.png",
    "Textures/T_london_grime_overlay.png",
    "Textures/T_london_target_cycle_box.png",
    "Textures/T_london_target_yellow_box.png",
    "Textures/T_london_target_wet_reflection.png",
    "Textures/T_london_target_facade_atlas.png",
    "Textures/T_london_target_sky_atlas.png",
    "Textures/T_london_target_full_road_atlas.png",
    "Textures/T_custom_imagegen_paris_wet_intersection_atlas.png",
    "Textures/T_custom_imagegen_paris_overcast_boulevard_backplate.png",
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
    "Meshes/london_streetlight_proxy.obj",
    "Meshes/london_pedestrian_railing_proxy.obj",
    "Meshes/cctv_camera_box.obj",
    "Meshes/signal_visor_box.obj",
    "Meshes/london_window_strip_high_fidelity.fbx",
    "Meshes/london_shopfront_high_fidelity.fbx",
    "Meshes/cctv_camera_high_fidelity.fbx",
    "Meshes/signal_head_uk_high_fidelity.fbx",
    "Meshes/london_pedestrian_railing_high_fidelity.fbx",
    "Meshes/london_streetlight_high_fidelity.fbx",
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
    "PhotorealScenePass2_london_worn_zebra_crossing_decal",
    "PhotorealScenePass2_london_streetlight_proxy",
    "PhotorealScenePass2_london_pedestrian_railing",
    "PhotorealScenePass2_london_cctv_camera_box",
    "FinalTargetMatch_london_dark_wet_road_full_frame",
    "FinalTargetMatch_london_center_yellow_box_junction_visible",
    "FinalTargetMatch_london_foreground_black_guard_railing",
    "FinalTargetMatch_london_continuous_facade",
    "london_shopfront_high_fidelity",
    "signal_head_uk_high_fidelity",
    "london_pedestrian_railing_high_fidelity",
    "london_streetlight_high_fidelity",
    "generate_high_quality_fbx_sources",
    "target_convergence_facade_atlas",
    "TargetConvergence_london_midground_facade_wall_card",
    "TargetConvergence_london_colored_signal_lens",
    "TargetHero_london_yellow_box_readability_overlay",
    "TargetHero2_london_left_continuous_street_wall",
    "TargetHero3_london_foreground_railing_contact_shadow",
    "TargetHero3_london_grounded_fbx_signal_pole_",
    "TargetHero3_london_grounded_fbx_signal_head_",
    "TargetHero3_london_long_wet_specular_glint",
    "TargetHero3_london_facade_module",
    "TargetHero4_facade_bay_pier",
    "TargetHero4_shop_awning_deep_red",
    "TargetHero4_asphalt_micro_specular_streak",
    "TargetHero4_yellow_box_scuffed_gap",
    "TargetHero4_soft_overcast_haze_card",
    "TargetHero5_muted_masonry_skin",
    "TargetHero5_arch_top_lintel",
    "TargetHero5_dark_wet_asphalt_irregular_plate",
    "TargetHero5_subtle_rain_sheen_line",
    "TargetHero5_left_edge_dark_occlusion_column",
    "TargetHero6_london_grounded_red_bus_lane_surface_visible",
    "TargetHero6_london_grounded_fbx_railing_",
    "TargetHero6_london_grounded_fbx_signal_pole_",
    "TargetHero6_london_grounded_fbx_signal_head_",
    "TargetHero2_london_right_masonry_corner_mass",
    "TargetHero2_london_grounded_fbx_dense_foreground_railing_",
    "TargetHero2_london_geometric_yellow_box_grid",
    "TargetHero_london_signal_lens_readable",
    "TargetHero_london_grounded_fbx_guardrail_",
    "TargetHero_london_fbx_signal_head_",
    "TargetHero_london_side_facade_canyon",
    "TargetHero_london_bright_wet_road_camera_readable",
    "TargetConvergence_london_white_lane_stud_near_row",
    "TargetConvergence_london_grounded_fbx_foreground_railing_",
    "TargetConvergence_london_overcast_sky_backdrop",
    "TargetHero4_fbx_keep_left_bollard_",
    "TargetHero4_fbx_bus_stop_pole_",
    "TargetHero7_london_upper_frame_overcast_fill",
    "TargetHero7_london_upper_frame_mist_facade_fill",
    "TargetHero7_london_upper_frame_soft_roof_mass_",
    "target_convergence_sky_atlas",
    "target_convergence_road_atlas",
    "TargetConvergence_london_textured_facade_card",
    "TargetConvergence_london_baked_wet_road_atlas_full_intersection",
]

REQUIRED_IMPORTED_MESHES = [
    "Content/PhotorealRoadKit/Meshes/london_streetlight_high_fidelity.uasset",
    "Content/PhotorealRoadKit/Meshes/london_pedestrian_railing_high_fidelity.uasset",
    "Content/PhotorealRoadKit/Meshes/signal_head_uk_high_fidelity.uasset",
    "Content/PhotorealRoadKit/Meshes/cctv_camera_high_fidelity.uasset",
    "Content/PhotorealRoadKit/Meshes/london_shopfront_high_fidelity.uasset",
    "Content/PhotorealRoadKit/Meshes/london_window_strip_high_fidelity.uasset",
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
    b"PhotorealScenePass2_london_worn_zebra_crossing_decal_0",
    b"PhotorealScenePass2_london_asphalt_crack_overlay_visible_0",
    b"PhotorealScenePass2_london_streetlight_proxy_0",
    b"PhotorealScenePass2_london_pedestrian_railing_0",
    b"PhotorealScenePass2_london_cctv_camera_box_0",
    b"FinalTargetMatch_london_dark_wet_road_full_frame",
    b"FinalTargetMatch_london_left_red_bus_lane_long_wet",
    b"FinalTargetMatch_london_center_yellow_box_junction_visible",
    b"FinalTargetMatch_london_foreground_cycle_box_visible",
    b"FinalTargetMatch_london_foreground_black_guard_railing_0",
    b"FinalTargetMatch_london_black_signal_head_cluster_0",
    b"FinalTargetMatch_london_continuous_facade_row0_0",
    b"london_shopfront_high_fidelity",
    b"cctv_camera_high_fidelity",
    b"signal_head_uk_high_fidelity",
    b"london_pedestrian_railing_high_fidelity",
    b"london_streetlight_high_fidelity",
    b'TargetConvergence_london_foreground_fbx_guard_railing_0',
    b'TargetConvergence_london_left_perspective_facade_strip',
    b'TargetConvergence_london_colored_signal_lens_0',
    b'TargetHero_london_yellow_box_readability_overlay',
    b'TargetHero2_london_left_continuous_street_wall_0',
    b'TargetHero3_london_foreground_railing_contact_shadow',
    b'TargetHero3_london_grounded_fbx_signal_pole_0',
    b'TargetHero3_london_grounded_fbx_signal_head_0',
    b'TargetHero3_london_long_wet_specular_glint_0',
    b'TargetHero3_london_facade_module_0_brick_mass_3d',
    b'TargetHero4_facade_bay_pier_0_0',
    b'TargetHero4_shop_awning_deep_red_0',
    b'TargetHero4_asphalt_micro_specular_streak_0',
    b'TargetHero4_yellow_box_scuffed_gap_0',
    b'TargetHero4_soft_overcast_haze_card_0',
    b'TargetHero5_muted_masonry_skin_0',
    b'TargetHero5_arch_top_lintel_0_0',
    b'TargetHero5_dark_wet_asphalt_irregular_plate_0',
    b'TargetHero5_subtle_rain_sheen_line_0',
    b'TargetHero5_left_edge_dark_occlusion_column',
    b'TargetHero6_london_grounded_red_bus_lane_surface_visible',
    b'TargetHero6_london_grounded_fbx_railing_0',
    b'TargetHero6_london_grounded_fbx_signal_pole_0',
    b'TargetHero6_london_grounded_fbx_signal_head_0',
    b'TargetHero2_london_right_masonry_corner_mass',
    b'TargetHero2_london_grounded_fbx_dense_foreground_railing_0',
    b'TargetHero2_london_geometric_yellow_box_grid_a_0',
    b'TargetHero_london_signal_lens_readable_0',
    b'TargetHero_london_grounded_fbx_guardrail_0',
    b'TargetHero_london_fbx_signal_head_0',
    b'TargetHero_london_side_facade_canyon_0',
    b'TargetHero_london_bright_wet_road_camera_readable',
    b'TargetConvergence_london_white_lane_stud_near_row_0',
    b'TargetConvergence_london_grounded_fbx_foreground_railing_0',
    b'TargetConvergence_london_midground_facade_wall_card_0',
    b'TargetConvergence_london_overcast_sky_backdrop',
    b'TargetConvergence_london_visible_fbx_signal_head_0',
    b'TargetHero4_fbx_keep_left_bollard_0',
    b'TargetHero4_fbx_bus_stop_pole_0',
    b'TargetHero7_london_upper_frame_overcast_fill',
    b'TargetHero7_london_upper_frame_mist_facade_fill',
    b'TargetHero7_london_upper_frame_soft_roof_mass_0',
    b'TargetConvergence_london_textured_facade_card_0',
    b'TargetConvergence_london_baked_wet_road_atlas_full_intersection',
]

REQUIRED_SEOUL_GENERATOR_TOKENS = [
    "_build_seoul_photoreal_fidelity_layer",
    "PhotorealRoadKit_seoul_wet_patched_asphalt_surface_visible",
    "PhotorealRoadKit_seoul_red_bus_priority_corridor_visible",
    "PhotorealRoadKit_seoul_hangul_bus_only_text_visible",
    "PhotorealRoadKit_seoul_median_bus_island_concrete_visible",
    "PhotorealRoadKit_seoul_overhead_mast_arm_signal",
    "PhotorealRoadKit_seoul_high_fidelity_signal_head_mesh",
    "PhotorealRoadKit_seoul_tactile_paving_tile_mesh",
    "PhotorealRoadKit_seoul_utility_cut_tar_seam",
]

REQUIRED_SEOUL_MAP_TOKENS = [
    b"PhotorealRoadKit_seoul_wet_patched_asphalt_surface_visible",
    b"PhotorealRoadKit_seoul_red_bus_priority_corridor_visible",
    b"PhotorealRoadKit_seoul_road_text_BUS_ONLY_visible",
    b"PhotorealRoadKit_seoul_hangul_bus_only_text_visible",
    b"PhotorealRoadKit_seoul_median_bus_island_concrete_visible",
    b"PhotorealRoadKit_seoul_overhead_mast_arm_signal_0",
    b"PhotorealRoadKit_seoul_high_fidelity_signal_head_mesh_0",
    b"PhotorealRoadKit_seoul_tactile_paving_tile_mesh_0",
    b"PhotorealRoadKit_seoul_utility_cut_tar_seam_0",
]

REQUIRED_NEW_YORK_GENERATOR_TOKENS = [
    "_build_new_york_photoreal_fidelity_layer",
    "PhotorealRoadKit_new_york_patched_asphalt_surface_visible",
    "PhotorealRoadKit_new_york_red_bus_only_lane_visible",
    "PhotorealRoadKit_new_york_green_bike_conflict_zone_visible",
    "PhotorealRoadKit_new_york_double_yellow_centerline_visible",
    "PhotorealRoadKit_new_york_road_text_ONLY_visible",
    "PhotorealRoadKit_new_york_yellow_signal_head",
    "PhotorealRoadKit_new_york_high_fidelity_signal_head_mesh",
    "PhotorealRoadKit_new_york_utility_plate_mesh",
    "PhotorealRoadKit_new_york_tar_seam",
]

REQUIRED_NEW_YORK_MAP_TOKENS = [
    b"PhotorealRoadKit_new_york_patched_asphalt_surface_visible",
    b"PhotorealRoadKit_new_york_red_bus_only_lane_visible",
    b"PhotorealRoadKit_new_york_green_bike_conflict_zone_visible",
    b"PhotorealRoadKit_new_york_double_yellow_centerline_visible",
    b"PhotorealRoadKit_new_york_road_text_ONLY_visible",
    b"PhotorealRoadKit_new_york_yellow_signal_head_0",
    b"PhotorealRoadKit_new_york_high_fidelity_signal_head_mesh_0",
    b"PhotorealRoadKit_new_york_utility_plate_mesh_0",
    b"PhotorealRoadKit_new_york_tar_seam_0",
]

REQUIRED_PARIS_GENERATOR_TOKENS = [
    "_build_paris_photoreal_fidelity_layer",
    "PhotorealRoadKit_paris_worn_asphalt_boulevard_surface_visible",
    "PhotorealRoadKit_paris_granite_stone_curb_north_visible",
    "PhotorealRoadKit_paris_refuge_island_stone_visible",
    "PhotorealRoadKit_paris_bus_lane_text_BUS_visible",
    "PhotorealRoadKit_paris_bike_lane_glyph_strip_visible",
    "PhotorealRoadKit_paris_european_zebra_crossing_bar",
    "PhotorealRoadKit_paris_slim_signal_pole",
    "PhotorealRoadKit_paris_high_fidelity_signal_head_mesh",
    "PhotorealRoadKit_paris_imagegen_wet_intersection_atlas_plane_visible",
    "custom_imagegen_paris_wet_intersection_atlas",
    "custom_imagegen_paris_overcast_boulevard_backplate",
    "PhotorealRoadKit_paris_upper_frame_overcast_fill",
    "PhotorealRoadKit_paris_misty_boulevard_facade_fill",
    "PhotorealRoadKit_paris_low_horizon_overcast_fill",
    "PhotorealRoadKit_paris_curb_bollard_mesh",
]

REQUIRED_PARIS_MAP_TOKENS = [
    b"PhotorealRoadKit_paris_worn_asphalt_boulevard_surface_visible",
    b"PhotorealRoadKit_paris_granite_stone_curb_north_visible",
    b"PhotorealRoadKit_paris_refuge_island_stone_visible",
    b"PhotorealRoadKit_paris_bus_lane_text_BUS_visible",
    b"PhotorealRoadKit_paris_bike_lane_glyph_strip_visible",
    b"PhotorealRoadKit_paris_european_zebra_crossing_bar_0",
    b"PhotorealRoadKit_paris_slim_signal_pole_0",
    b"PhotorealRoadKit_paris_high_fidelity_signal_head_mesh_0",
    b"PhotorealRoadKit_paris_imagegen_wet_intersection_atlas_plane_visible",
    b"PhotorealRoadKit_paris_upper_frame_overcast_fill",
    b"PhotorealRoadKit_paris_misty_boulevard_facade_fill",
    b"PhotorealRoadKit_paris_low_horizon_overcast_fill",
    b"PhotorealRoadKit_paris_curb_bollard_mesh_0",
]

FORBIDDEN = ["spawn_vehicle", "spawn_pedestrian", "traffic_ai_controller", "drivable_car", "gameplay_mode"]
FORBIDDEN_LONDON_PROOF_TOKENS = [
    "TargetHero6_london_billboard",
    "TargetHero6_london_foreground_railing_top",
    "TargetHero6_london_foreground_railing_mid",
    "TargetHero6_london_foreground_signal_pole",
    "TargetHero6_london_foreground_signal_head",
    "TargetHero3_london_signal_pole_readable",
    "TargetHero3_london_signal_head_box_readable",
    "TargetConvergence_london_guaranteed_foreground_railing_toprail",
    "TargetConvergence_london_guaranteed_foreground_railing_midrail",
    "TargetConvergence_london_guaranteed_foreground_railing_post",
    "TargetHero_london_black_guardrail_top",
    "TargetHero_london_black_guardrail_mid",
    "TargetHero_london_black_guardrail_post",
    "TargetHero_london_signal_body",
    "TargetHero2_london_dense_foreground_railing_post",
    "TargetHero2_london_dense_foreground_railing_cap",
    "TargetHero2_london_dense_foreground_railing_toprail",
    "TargetHero2_london_dense_foreground_railing_lowerrail",
    "TargetHero4_slim_bollard_body",
    "TargetHero4_bus_stop_pole",
]


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


def check_paris_material_members(generator: str) -> None:
    try:
        paris_block = generator.split("PARIS_MATERIAL_NAMES = GENERIC_MATERIAL_NAMES | {", 1)[1].split("CITY_MATERIAL_NAMES", 1)[0]
    except IndexError:
        fail("generator missing PARIS_MATERIAL_NAMES block")
    for token in [
        "custom_imagegen_paris_wet_intersection_atlas",
        "custom_imagegen_paris_overcast_boulevard_backplate",
    ]:
        if token not in paris_block:
            fail(f"Paris material set missing token: {token}")


def check_map_tokens(city: str, path: Path, minimum_size: int, tokens: list[bytes]) -> None:
    if not path.exists() or path.stat().st_size < minimum_size:
        fail(f"{city} map missing or too small: {path}")
    map_bytes = path.read_bytes()
    for token in tokens:
        if token not in map_bytes:
            fail(f"{city} map missing fidelity actor token: {token.decode('utf-8')}")
    if city == "london":
        for token in FORBIDDEN_LONDON_PROOF_TOKENS:
            if token.encode("utf-8") in map_bytes:
                fail(f"{city} map contains camera-facing proof billboard token: {token}")


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
    for rel in REQUIRED_IMPORTED_MESHES:
        path = UE / rel
        if not path.exists() or path.stat().st_size < 1000:
            fail(f"missing imported high-fidelity mesh asset: {rel}")
    text = GEN.read_text(encoding="utf-8")
    lower = text.lower()
    for token in REQUIRED_GENERATOR_TOKENS:
        if token not in text:
            fail(f"generator missing token: {token}")
    for token in REQUIRED_SEOUL_GENERATOR_TOKENS:
        if token not in text:
            fail(f"generator missing Seoul token: {token}")
    for token in REQUIRED_NEW_YORK_GENERATOR_TOKENS:
        if token not in text:
            fail(f"generator missing New York token: {token}")
    for token in REQUIRED_PARIS_GENERATOR_TOKENS:
        if token not in text:
            fail(f"generator missing Paris token: {token}")
    check_paris_material_members(text)
    for token in FORBIDDEN:
        if token in lower:
            fail(f"forbidden implementation token: {token}")
    for token in FORBIDDEN_LONDON_PROOF_TOKENS:
        if token in text:
            fail(f"generator contains camera-facing proof billboard token: {token}")
    check_map_tokens("london", LONDON_MAP, 200_000, REQUIRED_MAP_TOKENS)
    check_map_tokens("seoul", SEOUL_MAP, 130_000, REQUIRED_SEOUL_MAP_TOKENS)
    check_map_tokens("new_york", NEW_YORK_MAP, 130_000, REQUIRED_NEW_YORK_MAP_TOKENS)
    check_map_tokens("paris", PARIS_MAP, 130_000, REQUIRED_PARIS_MAP_TOKENS)
    print("PHOTOREAL_FIDELITY_PASS city=london")
    print("PHOTOREAL_FIDELITY_PASS city=seoul")
    print("PHOTOREAL_FIDELITY_PASS city=new_york")
    print("PHOTOREAL_FIDELITY_PASS city=paris")
    print(f"source_assets={len(REQUIRED_SOURCE)}")
    print(f"generator_tokens={len(REQUIRED_GENERATOR_TOKENS) + len(REQUIRED_SEOUL_GENERATOR_TOKENS) + len(REQUIRED_NEW_YORK_GENERATOR_TOKENS) + len(REQUIRED_PARIS_GENERATOR_TOKENS)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
