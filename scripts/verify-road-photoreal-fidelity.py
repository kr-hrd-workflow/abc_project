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
    "Textures/T_custom_imagegen_london_overcast_street_backplate.png",
    "Textures/T_custom_imagegen_london_facade_road_backplate.png",
    "Textures/T_custom_imagegen_london_wet_yellow_box_atlas.png",
    "Textures/T_custom_imagegen_new_york_manhattan_backplate.png",
    "Textures/T_custom_imagegen_new_york_wet_intersection_atlas.png",
    "Textures/T_custom_imagegen_new_york_manhattan_backplate_balanced.png",
    "Textures/T_custom_imagegen_new_york_wet_intersection_atlas_balanced.png",
    "Textures/T_custom_imagegen_seoul_rainy_intersection_backplate.png",
    "Textures/T_custom_imagegen_seoul_wet_bus_lane_atlas.png",
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
    "_build_london_real_geometry_layer",
    "LondonRealGeometry_london_midground_shopfront_module_",
    "LondonRealGeometry_london_foreground_pavement_slab_",
    "LondonRealGeometry_london_traffic_cabinet_",
    "LondonRealGeometry_london_pedestrian_railing_mesh_",
    "LondonRealGeometry_london_streetlight_mesh_",
    "LondonRealGeometry_london_readable_vehicle_",
    "LondonRealGeometry_london_overcast_sky_volume",
    "LondonRealGeometry_london_upper_overcast_backdrop_geometry",
    "LondonRealGeometry_london_center_camera_visible_brick_frontage_mass",
    "LondonRealGeometry_london_center_camera_visible_window_column_",
    "LondonRealGeometry_london_midground_shop_sign_lit_band_",
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
    "ImageGenLondon_overcast_photo_backplate_plane_visible",
    "ImageGenLondon_left_overcast_photo_backplate_plane_visible",
    "custom_imagegen_london_overcast_street_backplate",
    "custom_imagegen_london_facade_road_backplate",
    "custom_imagegen_london_wet_yellow_box_atlas",
    "custom_imagegen_new_york_manhattan_backplate",
    "custom_imagegen_new_york_wet_intersection_atlas",
    "custom_imagegen_new_york_manhattan_backplate_balanced",
    "custom_imagegen_new_york_wet_intersection_atlas_balanced",
    "ImageGenNewYork_manhattan_backplate_plane_visible",
    "ImageGenNewYork_wet_intersection_atlas_surface_visible",
    "ImageGenSeoul_rainy_intersection_backplate_plane_visible",
    "ImageGenSeoul_wet_bus_lane_atlas_surface_visible",
    "custom_imagegen_seoul_rainy_intersection_backplate",
    "custom_imagegen_seoul_wet_bus_lane_atlas",
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
    b"LondonRealGeometry_london_midground_shopfront_module_0_brick_mass_3d",
    b"LondonRealGeometry_london_foreground_pavement_slab_0_0",
    b"LondonRealGeometry_london_traffic_cabinet_0",
    b"LondonRealGeometry_london_pedestrian_railing_mesh_0",
    b"LondonRealGeometry_london_streetlight_mesh_0",
    b"LondonRealGeometry_london_readable_vehicle_0_body",
    b"LondonRealGeometry_london_overcast_sky_volume",
    b"LondonRealGeometry_london_upper_overcast_backdrop_geometry",
    b"LondonRealGeometry_london_center_camera_visible_brick_frontage_mass",
    b"LondonRealGeometry_london_center_camera_visible_window_column_0",
    b"LondonRealGeometry_london_midground_shop_sign_lit_band_0",
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
    "_build_seoul_final_beauty_layer",
    "PhotorealRoadKit_seoul_wet_patched_asphalt_surface_visible",
    "PhotorealRoadKit_seoul_red_bus_priority_corridor_visible",
    "PhotorealRoadKit_seoul_hangul_bus_only_text_visible",
    "PhotorealRoadKit_seoul_median_bus_island_concrete_visible",
    "PhotorealRoadKit_seoul_overhead_mast_arm_signal",
    "PhotorealRoadKit_seoul_high_fidelity_signal_head_mesh",
    "PhotorealRoadKit_seoul_tactile_paving_tile_mesh",
    "PhotorealRoadKit_seoul_utility_cut_tar_seam",
    "ImageGenSeoul_rainy_intersection_backplate_plane_visible",
    "ImageGenSeoul_wet_bus_lane_atlas_surface_visible",
    "custom_imagegen_seoul_rainy_intersection_backplate",
    "custom_imagegen_seoul_wet_bus_lane_atlas",
    "SeoulRealGeometry_seoul_station_platform_curb_",
    "SeoulRealGeometry_seoul_midground_storefront_module_",
    "SeoulRealGeometry_seoul_traffic_cabinet_",
    "SeoulRealGeometry_seoul_bus_stop_sign_",
    "SeoulRealGeometry_seoul_median_platform_railing_",
    "SeoulRealGeometry_seoul_foreground_left_sidewalk_apron",
    "SeoulRealGeometry_seoul_screen_left_foreground_sidewalk_apron",
    "SeoulRealGeometry_seoul_readable_vehicle_",
    "SeoulRealGeometry_seoul_distant_sky_volume",
    "SeoulRealGeometry_seoul_distant_roofline_depth_band",
    "SeoulRealGeometry_seoul_camera_visible_overcast_sky_fill",
    "SeoulRealGeometry_seoul_camera_visible_mist_facade_fill",
    "SeoulRealGeometry_seoul_left_camera_edge_building_mass",
    "SeoulRealGeometry_seoul_left_edge_storefront_infill",
    "SeoulRealGeometry_seoul_left_capture_edge_facade_infill",
    "SeoulRealGeometry_seoul_screen_left_capture_edge_facade_infill",
    "SeoulRealGeometry_seoul_camera_frontage_block_",
    "SeoulRealGeometry_seoul_midground_facade_depth_mass_",
    "SeoulFinal_seoul_rainy_intersection_backplate_card",
    "SeoulFinal_seoul_wet_bus_lane_road_card",
    "SeoulFinal_seoul_foreground_black_railing_",
    "SeoulFinal_seoul_signal_head_mesh_",
    "SeoulFinal_seoul_signal_pole_mesh_",
    "SeoulFinal_seoul_streetlight_mesh_",
    "SeoulFinal_seoul_beveled_curb_mesh_",
    "SeoulFinal_seoul_drain_grate_mesh_",
    "SeoulFinal_seoul_tactile_tile_mesh_",
    "SeoulFinal_seoul_utility_cover_mesh_",
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
    b"ImageGenSeoul_rainy_intersection_backplate_plane_visible",
    b"ImageGenSeoul_wet_bus_lane_atlas_surface_visible",
    b"SeoulRealGeometry_seoul_station_platform_curb_0",
    b"SeoulRealGeometry_seoul_midground_storefront_module_0_brick_mass_3d",
    b"SeoulRealGeometry_seoul_traffic_cabinet_0",
    b"SeoulRealGeometry_seoul_bus_stop_sign_0",
    b"SeoulRealGeometry_seoul_median_platform_railing_0",
    b"SeoulRealGeometry_seoul_foreground_left_sidewalk_apron",
    b"SeoulRealGeometry_seoul_screen_left_foreground_sidewalk_apron",
    b"SeoulRealGeometry_seoul_readable_vehicle_0_body",
    b"SeoulRealGeometry_seoul_distant_sky_volume",
    b"SeoulRealGeometry_seoul_distant_roofline_depth_band",
    b"SeoulRealGeometry_seoul_camera_visible_overcast_sky_fill",
    b"SeoulRealGeometry_seoul_camera_visible_mist_facade_fill",
    b"SeoulRealGeometry_seoul_left_camera_edge_building_mass",
    b"SeoulRealGeometry_seoul_left_edge_storefront_infill_brick_mass_3d",
    b"SeoulRealGeometry_seoul_left_capture_edge_facade_infill_brick_mass_3d",
    b"SeoulRealGeometry_seoul_screen_left_capture_edge_facade_infill_brick_mass_3d",
    b"SeoulRealGeometry_seoul_camera_frontage_block_0_brick_mass_3d",
    b"SeoulRealGeometry_seoul_midground_facade_depth_mass_0",
    b"SeoulFinal_seoul_rainy_intersection_backplate_card",
    b"SeoulFinal_seoul_wet_bus_lane_road_card",
    b"SeoulFinal_seoul_foreground_black_railing_0",
    b"SeoulFinal_seoul_signal_head_mesh_0",
    b"SeoulFinal_seoul_signal_pole_mesh_0",
    b"SeoulFinal_seoul_streetlight_mesh_0",
    b"SeoulFinal_seoul_beveled_curb_mesh_0",
    b"SeoulFinal_seoul_drain_grate_mesh_0",
    b"SeoulFinal_seoul_tactile_tile_mesh_0",
    b"SeoulFinal_seoul_utility_cover_mesh_0",
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
    "custom_imagegen_new_york_manhattan_backplate_balanced",
    "custom_imagegen_new_york_wet_intersection_atlas_balanced",
    "NewYorkRealGeometry_new_york_manhattan_storefront_module_",
    "NewYorkRealGeometry_new_york_foreground_pavement_tile_",
    "NewYorkRealGeometry_new_york_traffic_cabinet_",
    "NewYorkRealGeometry_new_york_streetlight_mesh_",
    "NewYorkRealGeometry_new_york_pedestrian_railing_mesh_",
    "NewYorkRealGeometry_new_york_distant_sky_volume",
    "NewYorkRealGeometry_new_york_distant_roofline_depth_band",
    "NewYorkRealGeometry_new_york_camera_visible_overcast_sky_fill",
    "NewYorkRealGeometry_new_york_camera_visible_mist_facade_fill",
    "NewYorkRealGeometry_new_york_left_camera_edge_building_mass",
    "NewYorkRealGeometry_new_york_left_edge_storefront_infill",
    "NewYorkRealGeometry_new_york_left_capture_edge_facade_infill",
    "NewYorkRealGeometry_new_york_screen_left_capture_edge_facade_infill",
    "NewYorkRealGeometry_new_york_camera_frontage_block_",
    "NewYorkRealGeometry_new_york_midground_facade_depth_mass_",
    "NewYorkRealGeometry_new_york_readable_vehicle_",
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
    b"ImageGenNewYork_wet_intersection_atlas_surface_visible",
    b"ImageGenNewYork_manhattan_backplate_plane_visible",
    b"NewYorkRealGeometry_new_york_manhattan_storefront_module_0_brick_mass_3d",
    b"NewYorkRealGeometry_new_york_foreground_pavement_tile_0_0",
    b"NewYorkRealGeometry_new_york_traffic_cabinet_0",
    b"NewYorkRealGeometry_new_york_streetlight_mesh_0",
    b"NewYorkRealGeometry_new_york_pedestrian_railing_mesh_0",
    b"NewYorkRealGeometry_new_york_distant_sky_volume",
    b"NewYorkRealGeometry_new_york_distant_roofline_depth_band",
    b"NewYorkRealGeometry_new_york_camera_visible_overcast_sky_fill",
    b"NewYorkRealGeometry_new_york_camera_visible_mist_facade_fill",
    b"NewYorkRealGeometry_new_york_left_camera_edge_building_mass",
    b"NewYorkRealGeometry_new_york_left_edge_storefront_infill_brick_mass_3d",
    b"NewYorkRealGeometry_new_york_left_capture_edge_facade_infill_brick_mass_3d",
    b"NewYorkRealGeometry_new_york_screen_left_capture_edge_facade_infill_brick_mass_3d",
    b"NewYorkRealGeometry_new_york_camera_frontage_block_0_brick_mass_3d",
    b"NewYorkRealGeometry_new_york_midground_facade_depth_mass_0",
    b"NewYorkRealGeometry_new_york_readable_vehicle_0_body",
]

REQUIRED_PARIS_GENERATOR_TOKENS = [
    "_build_paris_photoreal_fidelity_layer",
    "_build_paris_final_beauty_layer",
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
    "PhotorealRoadKit_paris_single_imagegen_boulevard_backplate_plane_visible",
    "PhotorealRoadKit_paris_curb_bollard_mesh",
    "ParisRealGeometry_paris_midground_storefront_module_",
    "ParisRealGeometry_paris_left_capture_edge_facade_infill",
    "ParisRealGeometry_paris_foreground_sidewalk_slab_",
    "ParisRealGeometry_paris_traffic_cabinet_",
    "ParisRealGeometry_paris_readable_vehicle_",
    "ParisRealGeometry_paris_streetlight_mesh_",
    "ParisRealGeometry_paris_upper_overcast_backdrop_geometry",
    "ParisRealGeometry_paris_center_camera_visible_stone_frontage_mass",
    "ParisRealGeometry_paris_center_camera_visible_window_column_",
    "ParisFinal_paris_overcast_boulevard_backplate_card",
    "ParisFinal_paris_wet_intersection_road_card",
    "ParisFinal_paris_foreground_black_railing_",
    "ParisFinal_paris_signal_head_mesh_",
    "ParisFinal_paris_signal_pole_mesh_",
    "ParisFinal_paris_streetlight_mesh_",
    "ParisFinal_paris_curb_bollard_mesh_",
    "ParisFinal_paris_beveled_curb_mesh_",
    "ParisFinal_paris_drain_grate_mesh_",
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
    b"PhotorealRoadKit_paris_single_imagegen_boulevard_backplate_plane_visible",
    b"PhotorealRoadKit_paris_curb_bollard_mesh_0",
    b"ParisRealGeometry_paris_midground_storefront_module_0_brick_mass_3d",
    b"ParisRealGeometry_paris_left_capture_edge_facade_infill_brick_mass_3d",
    b"ParisRealGeometry_paris_foreground_sidewalk_slab_0_0",
    b"ParisRealGeometry_paris_traffic_cabinet_0",
    b"ParisRealGeometry_paris_readable_vehicle_0_body",
    b"ParisRealGeometry_paris_streetlight_mesh_0",
    b"ParisRealGeometry_paris_upper_overcast_backdrop_geometry",
    b"ParisRealGeometry_paris_center_camera_visible_stone_frontage_mass",
    b"ParisRealGeometry_paris_center_camera_visible_window_column_0",
    b"ParisFinal_paris_overcast_boulevard_backplate_card",
    b"ParisFinal_paris_wet_intersection_road_card",
    b"ParisFinal_paris_foreground_black_railing_0",
    b"ParisFinal_paris_signal_head_mesh_0",
    b"ParisFinal_paris_signal_pole_mesh_0",
    b"ParisFinal_paris_streetlight_mesh_0",
    b"ParisFinal_paris_curb_bollard_mesh_0",
    b"ParisFinal_paris_beveled_curb_mesh_0",
    b"ParisFinal_paris_drain_grate_mesh_0",
]

REQUIRED_CAPTURE_TOKENS = [
    "apply_beauty_capture_filter",
    "apply_london_imagegen_beauty_filter",
    "apply_new_york_imagegen_beauty_filter",
    "apply_new_york_final_beauty_filter",
    "apply_paris_final_beauty_filter",
    "apply_seoul_final_beauty_filter",
    "apply_seoul_imagegen_beauty_filter",
    "apply_paris_imagegen_beauty_filter",
    "def oblique_camera_pose(",
    'city == "london" and lit_capture',
    "target = unreal.Vector(-55, -95, 35)",
    "default_oblique_fov = 36.0",
    'city == "new_york" and lit_capture',
    "target = unreal.Vector(-80, 80, 520)",
    "default_oblique_fov = 36.0",
    'city == "seoul" and lit_capture',
    "ROAD_ONLY_RENDER_TARGET_SEOUL_IMAGEGEN_FILTER",
    "ROAD_ONLY_RENDER_TARGET_SEOUL_FINAL_FILTER",
    "ROAD_ONLY_RENDER_TARGET_NEW_YORK_IMAGEGEN_FILTER",
    "ROAD_ONLY_RENDER_TARGET_NEW_YORK_FINAL_FILTER",
    "ROAD_ONLY_RENDER_TARGET_PARIS_FINAL_FILTER",
    "ROAD_ONLY_RENDER_TARGET_PARIS_IMAGEGEN_FILTER",
    "RendererSnapshotState_",
    "SCS_FINAL_COLOR_LDR",
    "lit_postprocess = lit_capture",
    'city == "paris" and lit_capture',
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
        "photoreal_brick",
        "photoreal_glass",
        "photoreal_warm_window",
    ]:
        if token not in paris_block:
            fail(f"Paris material set missing token: {token}")


def _function_body(source: str, signature: str) -> str:
    try:
        body = source.split(signature, 1)[1]
    except IndexError:
        fail(f"generator missing function: {signature}")
    next_method = body.find("\n    def ")
    next_function = body.find("\ndef ")
    cut_points = [point for point in (next_method, next_function) if point >= 0]
    return body[: min(cut_points)] if cut_points else body


def check_material_expression_clear_guard(generator: str) -> None:
    if "def _clear_material_expressions(" not in generator:
        fail("generator missing guarded material-expression clear helper")
    if "rebuilt_material_names" not in generator:
        fail("generator does not track newly rebuilt materials before editing graphs")
    for signature in ("def _set_material_color(", "def _set_material_texture("):
        body = _function_body(generator, signature)
        if "delete_all_material_expressions" in body:
            fail(f"unsafe direct material-expression clear in {signature}")


def check_london_camera_road_materials(generator: str) -> None:
    required_actor_materials = {
        "FinalTargetMatch_london_dark_wet_road_full_frame": ("custom_imagegen_london_wet_yellow_box_atlas",),
        "TargetConvergence_london_baked_wet_road_atlas_full_intersection": ("custom_imagegen_london_wet_yellow_box_atlas",),
        "TargetConvergence_london_overcast_sky_backdrop": ("custom_imagegen_london_facade_road_backplate",),
        "TargetConvergence_london_guaranteed_visible_overcast_card": ("custom_imagegen_london_facade_road_backplate",),
        "TargetHero_london_bright_wet_road_camera_readable": ("custom_imagegen_london_wet_yellow_box_atlas",),
        "TargetHero_london_overcast_sky_filled_frame": ("custom_imagegen_london_facade_road_backplate",),
        "TargetHero6_london_camera_visible_overcast_backplate": ("custom_imagegen_london_facade_road_backplate",),
        "TargetHero6_london_camera_visible_wet_road_plate": ("custom_imagegen_london_wet_yellow_box_atlas",),
    }
    lines = generator.splitlines()
    for label, allowed_materials in required_actor_materials.items():
        actor_line = next((line for line in lines if f'"{label}"' in line and "self._cube(" in line), "")
        if not actor_line:
            fail(f"generator missing London camera-road actor: {label}")
        if not any(f'"{material}"' in actor_line for material in allowed_materials):
            allowed = ", ".join(allowed_materials)
            fail(f"London camera-road actor {label} must use road material: {allowed}")
    override_body = _function_body(generator, "def _texture_palette_override(")
    if "target_full_road_atlas" in override_body:
        fail("London target_full_road_atlas texture is flattened by palette override")


def check_london_imagegen_capture_filter(capture_text: str) -> None:
    body = _function_body(capture_text, "def apply_london_imagegen_beauty_filter(")
    for token in [
        "ImageGenLondon_overcast_photo_backplate_plane_visible",
        "ImageGenLondon_left_overcast_photo_backplate_plane_visible",
        "LondonOperatorContext_lit_overcast_sky_continuous_backdrop",
        "LondonOperatorContext_lit_distant_mist_facade_band",
        "LondonOperatorContext_lit_low_horizon_mist_fill",
        "LondonOperatorContext_lit_far_right_context_fill",
    ]:
        if token not in body:
            fail(f"London ImageGen capture filter does not hide blockout backdrop: {token}")
    for token in [
        "PhotorealScene_london_",
        "PhotorealScenePass2_london_",
        "PhotorealRoadKit_london_",
        "RendererSnapshotState_",
    ]:
        if token in body:
            fail(f"London capture filter hides real final-visible geometry/state: {token}")


def check_final_visible_capture_policy(capture_text: str) -> None:
    body = _function_body(capture_text, "def apply_beauty_capture_filter(")
    for token in [
        '"RendererSnapshotState_"',
        '"PhotorealRoadKit_paris_',
        '"RoadOnlyRenderer_paris_',
        '"PhotorealScenePass2_',
    ]:
        if token in body:
            fail(f"beauty capture filter hides final-visible geometry/state: {token}")
    for token in [
        '"FinalTargetMatch_"',
        '"TargetConvergence_"',
        '"TargetHero_"',
        '"TargetHero2_"',
        '"TargetHero3_"',
        '"TargetHero4_"',
        '"TargetHero5_"',
        '"TargetHero6_"',
        '"TargetHero7_"',
    ]:
        if token not in body:
            fail(f"beauty capture filter does not hide target/proof layer: {token}")


def check_new_york_seoul_capture_filters(capture_text: str) -> None:
    ny_body = _function_body(capture_text, "def apply_new_york_imagegen_beauty_filter(")
    seoul_body = _function_body(capture_text, "def apply_seoul_imagegen_beauty_filter(")
    paris_body = _function_body(capture_text, "def apply_paris_imagegen_beauty_filter(")

    for token in [
        "ImageGenNewYork_wet_intersection_atlas_surface_visible",
        "PhotorealRoadKit_new_york_signal_pole_black_",
        "PhotorealRoadKit_new_york_yellow_signal_head_",
        "PhotorealRoadKit_new_york_signal_head_dark_visor_",
        "PhotorealRoadKit_new_york_high_fidelity_signal_head_mesh_",
        "NewYorkRealGeometry_",
    ]:
        if token in ny_body:
            fail(f"New York capture filter hides real foreground/midground geometry: {token}")

    for token in [
        "ImageGenSeoul_wet_bus_lane_atlas_surface_visible",
        "PhotorealRoadKit_seoul_wet_patched_asphalt_surface_visible",
        "PhotorealRoadKit_seoul_cross_asphalt_utility_patch_visible",
        "PhotorealRoadKit_seoul_red_bus_priority_corridor_visible",
        "PhotorealRoadKit_seoul_center_bus_priority_lane_visible",
        "PhotorealRoadKit_seoul_median_bus_island_concrete_visible",
        "PhotorealRoadKit_seoul_wide_zebra_paint_edge_breakup_",
        "PhotorealRoadKit_seoul_far_zebra_paint_edge_breakup_",
        "PhotorealRoadKit_seoul_thick_stop_line_",
        "PhotorealRoadKit_seoul_road_text_BUS_ONLY_visible",
        "PhotorealRoadKit_seoul_hangul_bus_only_text_visible",
        "PhotorealRoadKit_seoul_tactile_paving_tile_mesh_",
        "PhotorealRoadKit_seoul_utility_cover_mesh_",
        "PhotorealRoadKit_seoul_utility_cut_tar_seam_",
        "PhotorealRoadKit_seoul_tire_polish_wet_reflection_",
        "PhotorealRoadKit_seoul_overhead_mast_arm_signal_",
        "PhotorealRoadKit_seoul_overhead_mast_arm_green_lens_",
        "PhotorealRoadKit_seoul_high_fidelity_signal_head_mesh_",
        "PhotorealRoadKit_seoul_concrete_sidewalk_",
        "PhotorealRoadKit_seoul_dense_signal_signage_pole_",
        "PhotorealRoadKit_seoul_bus_corridor_sign_plate_",
        "PhotorealRoadKit_seoul_curb_grime_shadow_",
        "SeoulRealGeometry_",
    ]:
        if token in seoul_body:
            fail(f"Seoul capture filter hides real foreground/midground geometry: {token}")

    for token in [
        "PhotorealRoadKit_paris_imagegen_wet_intersection_atlas_plane_visible",
        "PhotorealRoadKit_paris_single_imagegen_boulevard_backplate_plane_visible",
    ]:
        if token not in paris_body:
            fail(f"Paris capture filter does not hide dominant ImageGen plane: {token}")
    for token in [
        "ParisRealGeometry_",
        "PhotorealRoadKit_paris_worn_asphalt_boulevard_surface_visible",
        "PhotorealRoadKit_paris_compact_signal_head_",
    ]:
        if token in paris_body:
            fail(f"Paris capture filter hides real foreground/midground geometry: {token}")


def check_seoul_final_capture_policy(capture_text: str) -> None:
    body = _function_body(capture_text, "def apply_seoul_final_beauty_filter(")
    for token in [
        'city != "seoul"',
        "SMART_INTERSECTION_DISABLE_SEOUL_FINAL_FILTER",
        'allowed_prefixes = ("SeoulFinal_",)',
        "ROAD_ONLY_RENDER_TARGET_SEOUL_FINAL_FILTER",
    ]:
        if token not in body:
            fail(f"Seoul final capture filter missing token: {token}")
    for token in [
        '"SeoulRealGeometry_',
        '"PhotorealRoadKit_seoul_',
        '"ImageGenSeoul_',
    ]:
        if token in body:
            fail(f"Seoul final capture filter allows non-final visual layer: {token}")


def check_seoul_lit_oblique_camera_policy(capture_text: str) -> None:
    pose_body = _function_body(capture_text, "def oblique_camera_pose(")
    try:
        seoul_pose = pose_body.split('if city == "seoul" and lit_capture:', 1)[1]
        seoul_pose = seoul_pose.split("\n    origin = unreal.Vector(-1040, -1180, 690)", 1)[0]
    except IndexError:
        fail("Seoul lit-oblique camera pose block missing")
    for token in [
        "origin = unreal.Vector(-1040, -1180, 690)",
        "target = unreal.Vector(-80, 80, 520)",
        'vector_env("SMART_INTERSECTION_CAMERA_ORIGIN") or origin',
        'vector_env("SMART_INTERSECTION_CAMERA_TARGET") or target',
    ]:
        if token not in seoul_pose:
            fail(f"Seoul lit-oblique camera policy missing token: {token}")

    try:
        seoul_fov = capture_text.split('elif city == "seoul" and lit_capture:', 1)[1]
        seoul_fov = seoul_fov.split('elif city == "paris" and lit_capture:', 1)[0]
    except IndexError:
        fail("Seoul lit-oblique FOV block missing")
    if "default_oblique_fov = 36.0" not in seoul_fov:
        fail("Seoul lit-oblique FOV must default to 36.0")


def check_new_york_seoul_image_plane_policy(generator: str) -> None:
    for token in [
        '"ImageGenNewYork_wet_intersection_atlas_surface_visible",\n            (-80, -220, 70),',
        '"ImageGenSeoul_wet_bus_lane_atlas_surface_visible",\n            (-80, -220, 70),',
        '"ImageGenNewYork_manhattan_backplate_plane_visible",\n            (320, 1450, 1040),',
        '"ImageGenSeoul_rainy_intersection_backplate_plane_visible",\n            (320, 1450, 1040),',
    ]:
        if token not in generator:
            fail(f"Image plane policy token missing: {token.splitlines()[0]}")
    for token in [
        '"ImageGenNewYork_wet_intersection_atlas_plane_visible",\n            (-80, -220, 164),',
        '"ImageGenSeoul_wet_bus_lane_atlas_plane_visible",\n            (-80, -220, 164),',
        '"ImageGenNewYork_manhattan_backplate_plane_visible",\n            (-520, 650, 585),',
        '"ImageGenSeoul_rainy_intersection_backplate_plane_visible",\n            (-520, 650, 585),',
        '"ImageGenNewYork_wet_intersection_atlas_plane_visible",',
        '"ImageGenSeoul_wet_bus_lane_atlas_plane_visible",',
    ]:
        if token in generator:
            fail(f"Image plane remains in foreground/midground position: {token.splitlines()[0]}")


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
    capture_text = CAPTURE.read_text(encoding="utf-8")
    for token in REQUIRED_CAPTURE_TOKENS:
        if token not in capture_text:
            fail(f"capture script missing token: {token}")
    check_london_imagegen_capture_filter(capture_text)
    check_final_visible_capture_policy(capture_text)
    check_new_york_seoul_capture_filters(capture_text)
    check_seoul_final_capture_policy(capture_text)
    check_seoul_lit_oblique_camera_policy(capture_text)
    check_new_york_seoul_image_plane_policy(text)
    check_paris_material_members(text)
    check_material_expression_clear_guard(text)
    check_london_camera_road_materials(text)
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
