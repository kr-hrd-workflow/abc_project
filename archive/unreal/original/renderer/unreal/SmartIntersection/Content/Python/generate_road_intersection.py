# RoadOnlyRenderer generator for SmartIntersection.
# Architecture: SUMO truth source; Python TraCI bridge streams state later; Unreal renders only.
# Scope: no autonomous vehicles, no pedestrians, no gameplay, no UE-side traffic simulation.
# Queue vehicle markers below are fixture renderer-state silhouettes; SUMO/FastAPI remains truth.
# Asset provenance: project procedural assets plus ambientCG CC0 sources under CC0AmbientCG; source refresh uses install_cc0_texture_sources.
# High-fidelity mesh seam: generate_high_quality_fbx_sources emits FBX replacements for visible target props.
# Target atlas seam: target_convergence_road_atlas, target_convergence_facade_atlas, and target_convergence_sky_atlas drive final-image convergence.
from __future__ import annotations

import json
import math
import os
from pathlib import Path

try:
    import unreal  # type: ignore
except Exception:  # normal when running verifier/dry tooling outside UE
    unreal = None


MATERIAL_COLORS = {
    # Deliberately brighter than real asphalt for proof screenshots: Telegram/mobile compression
    # made the physically darker first pass read as an empty black image.
    "background": (0.430, 0.500, 0.530, 1.0),
    "asphalt": (0.30, 0.32, 0.31, 1.0),
    "asphalt_patch": (0.40, 0.39, 0.34, 1.0),
    "paint": (1.00, 0.98, 0.86, 1.0),
    "yellow": (1.00, 0.86, 0.04, 1.0),
    "bus_lane": (0.86, 0.11, 0.07, 1.0),
    "bike_lane": (0.05, 0.70, 0.32, 1.0),
    "curb": (0.72, 0.70, 0.62, 1.0),
    "island": (0.58, 0.56, 0.48, 1.0),
    "tactile": (0.95, 0.72, 0.12, 1.0),
    "metal": (0.120, 0.125, 0.128, 1.0),
    "signal": (0.160, 0.165, 0.168, 1.0),
    "red_signal": (0.75, 0.02, 0.02, 1.0),
    "green_signal": (0.02, 0.65, 0.16, 1.0),
    "queue_vehicle_body": (0.46, 0.48, 0.46, 1.0),
    "queue_vehicle_glass": (0.105, 0.175, 0.220, 1.0),
    "emergency_vehicle_blue": (0.035, 0.210, 0.820, 1.0),
    "photoreal_asphalt": (0.21, 0.22, 0.21, 1.0),
    "photoreal_curb": (0.66, 0.64, 0.57, 1.0),
    "photoreal_bus_lane": (0.60, 0.08, 0.055, 1.0),
    "photoreal_yellow_worn": (0.92, 0.68, 0.07, 1.0),
    "photoreal_white_worn": (0.90, 0.88, 0.78, 1.0),
    "photoreal_metal": (0.135, 0.138, 0.135, 1.0),
    "photoreal_text_bus_lane": (0.90, 0.88, 0.78, 1.0),
    "photoreal_text_look_left": (0.90, 0.88, 0.78, 1.0),
    "photoreal_text_look_right": (0.90, 0.88, 0.78, 1.0),
    "photoreal_text_keep_clear": (0.92, 0.68, 0.07, 1.0),
    "photoreal_puddle": (0.085, 0.100, 0.105, 1.0),
    "photoreal_sidewalk": (0.50, 0.48, 0.43, 1.0),
    "photoreal_brick": (0.45, 0.24, 0.18, 1.0),
    "photoreal_glass": (0.180, 0.220, 0.240, 1.0),
    "photoreal_sign_plate": (0.88, 0.86, 0.76, 1.0),
    "photoreal_warm_window": (1.0, 0.62, 0.25, 1.0),
    "photoreal_decal_zebra": (0.92, 0.91, 0.82, 1.0),
    "photoreal_decal_arrow": (0.92, 0.91, 0.82, 1.0),
    "photoreal_crack_overlay": (0.105, 0.098, 0.088, 1.0),
    "photoreal_grime_overlay": (0.120, 0.110, 0.096, 1.0),
    "target_cycle_box": (0.03, 0.24, 0.22, 1.0),
    "target_yellow_box": (0.95, 0.68, 0.05, 1.0),
    "target_wet_reflection": (0.34, 0.38, 0.38, 1.0),
    "target_dark_wet_asphalt": (0.245, 0.265, 0.265, 1.0),
    "target_full_road_atlas": (0.225, 0.245, 0.245, 1.0),
    "target_facade_atlas": (0.42, 0.24, 0.18, 1.0),
    "target_sky_atlas": (0.58, 0.65, 0.70, 1.0),
    "target_mist_building": (0.500, 0.560, 0.580, 1.0),
    "custom_imagegen_london_wet_yellow_box_atlas": (0.20, 0.215, 0.210, 1.0),
    "custom_imagegen_london_overcast_street_backplate": (0.52, 0.53, 0.51, 1.0),
    "custom_imagegen_london_facade_road_backplate": (0.40, 0.40, 0.37, 1.0),
    "custom_imagegen_new_york_wet_intersection_atlas": (0.19, 0.205, 0.205, 1.0),
    "custom_imagegen_new_york_manhattan_backplate": (0.36, 0.34, 0.30, 1.0),
    "custom_imagegen_new_york_wet_intersection_atlas_balanced": (0.30, 0.32, 0.31, 1.0),
    "custom_imagegen_new_york_manhattan_backplate_balanced": (0.48, 0.46, 0.41, 1.0),
    "custom_imagegen_paris_wet_intersection_atlas": (0.235, 0.250, 0.250, 1.0),
    "custom_imagegen_paris_overcast_boulevard_backplate": (0.64, 0.66, 0.65, 1.0),
    "target_bright_reflection": (0.68, 0.74, 0.76, 1.0),
    "target_black_silhouette": (0.190, 0.198, 0.202, 1.0),
    "target_london_stone": (0.550, 0.530, 0.480, 1.0),
    "target_window_dark_recess": (0.115, 0.135, 0.145, 1.0),
    "target_window_warm_glass": (0.52, 0.34, 0.18, 1.0),
    "target_road_glint": (0.78, 0.86, 0.88, 1.0),
    "target_shadow_grime": (0.135, 0.125, 0.110, 1.0),
    "target_wet_micro_highlight": (0.48, 0.55, 0.58, 1.0),
    "target_bus_stop_amber": (0.88, 0.58, 0.18, 1.0),
    "target_shop_awning_deep_red": (0.250, 0.075, 0.060, 1.0),
    "target_shop_sign_cream": (0.48, 0.43, 0.34, 1.0),
    "target_fog_plane_soft": (0.30, 0.34, 0.35, 1.0),
    "target_masonry_shadow_red": (0.320, 0.180, 0.135, 1.0),
    "target_masonry_soot": (0.175, 0.150, 0.130, 1.0),
    "target_window_reflection_cool": (0.180, 0.220, 0.235, 1.0),
    "target_wet_asphalt_dark": (0.165, 0.180, 0.182, 1.0),
    "custom_imagegen_seoul_wet_bus_lane_atlas": (0.25, 0.26, 0.25, 1.0),
    "custom_imagegen_seoul_rainy_intersection_backplate": (0.46, 0.49, 0.48, 1.0),
    "stage6_seoul_photoreal_target": (0.32, 0.35, 0.34, 1.0),
    "stage6_seoul_material_study": (0.28, 0.29, 0.27, 1.0),
    "stage6_seoul_road_atlas": (0.19, 0.20, 0.195, 1.0),
    "stage6_seoul_surface_overlays": (0.16, 0.15, 0.135, 1.0),
    "stage7_seoul_traffic_camera_target": (0.42, 0.45, 0.44, 1.0),
    "stage7_seoul_asphalt_marking_source": (0.18, 0.19, 0.18, 1.0),
    "stage7_seoul_curb_sidewalk_source": (0.49, 0.48, 0.43, 1.0),
    "stage7_seoul_signal_vehicle_source": (0.12, 0.13, 0.13, 1.0),
    "stage7_seoul_facade_context_source": (0.32, 0.34, 0.33, 1.0),
    "stage7_textured_asphalt_base": (0.390, 0.405, 0.392, 1.0),
    "stage7_dark_wet_asphalt": (0.370, 0.385, 0.372, 1.0),
    "stage7_wet_asphalt_patch": (0.425, 0.438, 0.415, 1.0),
    "stage7_worn_white": (0.76, 0.75, 0.68, 1.0),
    "stage7_worn_yellow": (0.70, 0.52, 0.12, 1.0),
    "stage7_curb_concrete": (0.430, 0.425, 0.390, 1.0),
    "stage7_sidewalk_paver": (0.440, 0.445, 0.405, 1.0),
    "stage7_sidewalk_joint": (0.16, 0.17, 0.16, 1.0),
    "stage7_tactile": (0.56, 0.42, 0.12, 1.0),
    "stage7_signal_black": (0.072, 0.076, 0.074, 1.0),
    "stage7_vehicle_blue": (0.095, 0.135, 0.178, 1.0),
    "stage7_vehicle_bus_blue": (0.070, 0.130, 0.205, 1.0),
    "stage7_vehicle_bus_green": (0.060, 0.205, 0.135, 1.0),
    "stage7_vehicle_taxi_yellow": (0.520, 0.425, 0.160, 1.0),
    "stage7_vehicle_dark_body": (0.355, 0.360, 0.345, 1.0),
    "stage7_tire_black": (0.022, 0.022, 0.020, 1.0),
    "stage7_headlamp": (0.70, 0.66, 0.50, 1.0),
    "stage7_vehicle_glass": (0.105, 0.135, 0.145, 1.0),
    "stage7_contact_shadow": (0.105, 0.100, 0.090, 1.0),
    "stage7_puddle_reflection": (0.130, 0.150, 0.155, 1.0),
    "stage7_road_micro_highlight": (0.270, 0.300, 0.292, 1.0),
    "stage7_curb_wet_grime": (0.150, 0.145, 0.128, 1.0),
    "stage7_sidewalk_damp_edge": (0.360, 0.365, 0.330, 1.0),
    "stage7_facade_soft": (0.500, 0.510, 0.480, 1.0),
    "stage7_overcast_background": (0.74, 0.76, 0.72, 1.0),
    "stage7_window_glass": (0.170, 0.205, 0.215, 1.0),
    "stage7_roof_concrete": (0.520, 0.505, 0.465, 1.0),
    "stage7_roof_gravel": (0.385, 0.380, 0.340, 1.0),
    "stage7_parking_concrete": (0.335, 0.345, 0.325, 1.0),
    "stage7_pavement_fill": (0.410, 0.415, 0.375, 1.0),
    "stage7_rooftop_unit": (0.300, 0.310, 0.292, 1.0),
    "stage7_grass_verge": (0.135, 0.230, 0.115, 1.0),
    "stage7_tree_canopy": (0.085, 0.160, 0.080, 1.0),
    "stage7_tree_trunk": (0.160, 0.110, 0.070, 1.0),
    "operator_context_ground": (0.30, 0.34, 0.31, 1.0),
    "operator_asphalt": (0.44, 0.47, 0.43, 1.0),
    "operator_asphalt_patch": (0.36, 0.39, 0.36, 1.0),
    "operator_marking_white": (0.98, 0.96, 0.84, 1.0),
    "operator_marking_yellow": (1.00, 0.82, 0.10, 1.0),
    "operator_sidewalk": (0.61, 0.60, 0.54, 1.0),
    "operator_vehicle_body": (0.17, 0.19, 0.19, 1.0),
    "operator_vehicle_glass": (0.07, 0.12, 0.15, 1.0),
    "operator_signal_metal": (0.10, 0.11, 0.11, 1.0),
    "operator_median_concrete": (0.68, 0.66, 0.58, 1.0),
    "operator_context_concrete": (0.54, 0.56, 0.52, 1.0),
    "operator_context_curb": (0.76, 0.74, 0.66, 1.0),
    "operator_context_guardrail": (0.48, 0.50, 0.48, 1.0),
    "operator_context_facade_warm_gray": (0.46, 0.43, 0.38, 1.0),
    "operator_context_facade_cool_gray": (0.38, 0.42, 0.43, 1.0),
    "operator_context_window_dark": (0.075, 0.110, 0.130, 1.0),
    "operator_context_sign_blue": (0.045, 0.160, 0.420, 1.0),
    "operator_context_sign_green": (0.040, 0.300, 0.170, 1.0),
    "operator_context_traffic_cabinet": (0.40, 0.43, 0.38, 1.0),
    "operator_context_streetlight": (0.30, 0.31, 0.30, 1.0),
    "operator_stage3_signal_yellow": (0.95, 0.66, 0.08, 1.0),
    "operator_stage3_signal_black": (0.065, 0.072, 0.072, 1.0),
    "operator_stage3_signal_lens_red": (0.90, 0.025, 0.020, 1.0),
    "operator_stage3_signal_lens_green": (0.015, 0.72, 0.18, 1.0),
    "operator_stage3_vehicle_dark": (0.075, 0.088, 0.092, 1.0),
    "operator_stage3_vehicle_white": (0.86, 0.86, 0.78, 1.0),
    "operator_stage3_vehicle_taxi_yellow": (0.96, 0.72, 0.07, 1.0),
    "operator_stage3_vehicle_bus_green": (0.08, 0.44, 0.22, 1.0),
    "operator_stage3_vehicle_bus_red": (0.72, 0.06, 0.04, 1.0),
    "operator_stage3_vehicle_emergency_blue": (0.025, 0.19, 0.78, 1.0),
    "operator_stage3_vehicle_emergency_red": (0.90, 0.045, 0.035, 1.0),
    "operator_stage3_vehicle_glass": (0.045, 0.095, 0.120, 1.0),
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
    "photoreal_decal_zebra": "/Game/PhotorealRoadKit/Textures/T_london_zebra_crossing_worn",
    "photoreal_decal_arrow": "/Game/PhotorealRoadKit/Textures/T_london_lane_arrow_straight_worn",
    "photoreal_crack_overlay": "/Game/PhotorealRoadKit/Textures/T_london_asphalt_crack_overlay",
    "photoreal_grime_overlay": "/Game/PhotorealRoadKit/Textures/T_london_grime_overlay",
    "target_cycle_box": "/Game/PhotorealRoadKit/Textures/T_london_target_cycle_box",
    "target_yellow_box": "/Game/PhotorealRoadKit/Textures/T_london_target_yellow_box",
    "target_wet_reflection": "/Game/PhotorealRoadKit/Textures/T_london_target_wet_reflection",
    "target_full_road_atlas": "/Game/PhotorealRoadKit/Textures/T_london_target_full_road_atlas",
    "target_facade_atlas": "/Game/PhotorealRoadKit/Textures/T_london_target_facade_atlas",
    "target_sky_atlas": "/Game/PhotorealRoadKit/Textures/T_london_target_sky_atlas",
    "custom_imagegen_london_wet_yellow_box_atlas": "/Game/PhotorealRoadKit/Textures/T_custom_imagegen_london_wet_yellow_box_atlas",
    "custom_imagegen_london_overcast_street_backplate": "/Game/PhotorealRoadKit/Textures/T_custom_imagegen_london_overcast_street_backplate",
    "custom_imagegen_london_facade_road_backplate": "/Game/PhotorealRoadKit/Textures/T_custom_imagegen_london_facade_road_backplate",
}

SHARED_ROAD_TEXTURE_MATERIALS = {
    "photoreal_asphalt": "/Game/PhotorealRoadKit/Textures/T_london_asphalt_albedo",
    "photoreal_curb": "/Game/PhotorealRoadKit/Textures/T_london_curb_concrete",
    "photoreal_bus_lane": "/Game/PhotorealRoadKit/Textures/T_london_red_bus_lane_worn",
    "photoreal_yellow_worn": "/Game/PhotorealRoadKit/Textures/T_london_yellow_thermoplastic_worn",
    "photoreal_white_worn": "/Game/PhotorealRoadKit/Textures/T_london_white_road_text_worn",
    "photoreal_metal": "/Game/PhotorealRoadKit/Textures/T_london_drain_grate_metal",
    "photoreal_decal_zebra": "/Game/PhotorealRoadKit/Textures/T_london_zebra_crossing_worn",
    "photoreal_decal_arrow": "/Game/PhotorealRoadKit/Textures/T_london_lane_arrow_straight_worn",
    "photoreal_crack_overlay": "/Game/PhotorealRoadKit/Textures/T_london_asphalt_crack_overlay",
    "photoreal_grime_overlay": "/Game/PhotorealRoadKit/Textures/T_london_grime_overlay",
    "photoreal_sidewalk": "/Game/PhotorealRoadKit/Textures/T_london_sidewalk_stone",
    "photoreal_sign_plate": "/Game/PhotorealRoadKit/Textures/T_london_regulatory_sign_plate",
    "target_cycle_box": "/Game/PhotorealRoadKit/Textures/T_london_target_cycle_box",
    "target_road_glint": "/Game/PhotorealRoadKit/Textures/T_london_target_wet_reflection",
    "target_shadow_grime": "/Game/PhotorealRoadKit/Textures/T_london_grime_overlay",
}

PARIS_TEXTURE_MATERIALS = SHARED_ROAD_TEXTURE_MATERIALS | {
    "custom_imagegen_paris_wet_intersection_atlas": "/Game/PhotorealRoadKit/Textures/T_custom_imagegen_paris_wet_intersection_atlas",
    "custom_imagegen_paris_overcast_boulevard_backplate": "/Game/PhotorealRoadKit/Textures/T_custom_imagegen_paris_overcast_boulevard_backplate",
    "photoreal_brick": "/Game/PhotorealRoadKit/Textures/T_london_brick_facade",
    "photoreal_glass": "/Game/PhotorealRoadKit/Textures/T_london_glass_windows",
}

SEOUL_TEXTURE_MATERIALS = SHARED_ROAD_TEXTURE_MATERIALS | {
    "custom_imagegen_seoul_wet_bus_lane_atlas": "/Game/PhotorealRoadKit/Textures/T_custom_imagegen_seoul_wet_bus_lane_atlas",
    "custom_imagegen_seoul_rainy_intersection_backplate": "/Game/PhotorealRoadKit/Textures/T_custom_imagegen_seoul_rainy_intersection_backplate",
    "stage6_seoul_photoreal_target": "/Game/PhotorealRoadKit/Textures/T_stage6_seoul_photoreal_target",
    "stage6_seoul_material_study": "/Game/PhotorealRoadKit/Textures/T_stage6_seoul_material_study",
    "stage6_seoul_road_atlas": "/Game/PhotorealRoadKit/Textures/T_stage6_seoul_road_atlas",
    "stage6_seoul_surface_overlays": "/Game/PhotorealRoadKit/Textures/T_stage6_seoul_surface_overlays",
    "stage7_seoul_traffic_camera_target": "/Game/PhotorealRoadKit/Textures/T_stage7_seoul_traffic_camera_target",
    "stage7_seoul_asphalt_marking_source": "/Game/PhotorealRoadKit/Textures/T_stage7_seoul_asphalt_marking_source",
    "stage7_seoul_curb_sidewalk_source": "/Game/PhotorealRoadKit/Textures/T_stage7_seoul_curb_sidewalk_source",
    "stage7_seoul_signal_vehicle_source": "/Game/PhotorealRoadKit/Textures/T_stage7_seoul_signal_vehicle_source",
    "stage7_seoul_facade_context_source": "/Game/PhotorealRoadKit/Textures/T_stage7_seoul_facade_context_source",
    "stage7_textured_asphalt_base": "/Game/PhotorealRoadKit/Textures/T_london_asphalt_albedo",
    "stage7_curb_concrete": "/Game/PhotorealRoadKit/Textures/T_stage7_pavement_fill_noise",
    "stage7_sidewalk_paver": "/Game/PhotorealRoadKit/Textures/T_stage7_pavement_fill_noise",
    "stage7_roof_concrete": "/Game/PhotorealRoadKit/Textures/T_stage7_roof_gravel_noise",
    "stage7_roof_gravel": "/Game/PhotorealRoadKit/Textures/T_stage7_roof_gravel_noise",
    "stage7_parking_concrete": "/Game/PhotorealRoadKit/Textures/T_stage7_parking_concrete_noise",
    "stage7_pavement_fill": "/Game/PhotorealRoadKit/Textures/T_stage7_pavement_fill_noise",
    "stage7_rooftop_unit": "/Game/PhotorealRoadKit/Textures/T_stage7_rooftop_unit_noise",
    "photoreal_brick": "/Game/PhotorealRoadKit/Textures/T_london_brick_facade",
    "photoreal_glass": "/Game/PhotorealRoadKit/Textures/T_london_glass_windows",
}

NEW_YORK_TEXTURE_MATERIALS = SHARED_ROAD_TEXTURE_MATERIALS | {
    "custom_imagegen_new_york_wet_intersection_atlas": "/Game/PhotorealRoadKit/Textures/T_custom_imagegen_new_york_wet_intersection_atlas",
    "custom_imagegen_new_york_manhattan_backplate": "/Game/PhotorealRoadKit/Textures/T_custom_imagegen_new_york_manhattan_backplate",
    "custom_imagegen_new_york_wet_intersection_atlas_balanced": "/Game/PhotorealRoadKit/Textures/T_custom_imagegen_new_york_wet_intersection_atlas_balanced",
    "custom_imagegen_new_york_manhattan_backplate_balanced": "/Game/PhotorealRoadKit/Textures/T_custom_imagegen_new_york_manhattan_backplate_balanced",
    "photoreal_brick": "/Game/PhotorealRoadKit/Textures/T_london_brick_facade",
    "photoreal_glass": "/Game/PhotorealRoadKit/Textures/T_london_glass_windows",
}

CITY_TEXTURE_MATERIALS = {
    "london": LONDON_TEXTURE_MATERIALS,
    "seoul": SEOUL_TEXTURE_MATERIALS,
    "new_york": NEW_YORK_TEXTURE_MATERIALS,
    "paris": PARIS_TEXTURE_MATERIALS,
}

RECREATE_MATERIAL_NAMES = {
    "target_full_road_atlas",
    "target_facade_atlas",
    "target_sky_atlas",
    "target_mist_building",
    "custom_imagegen_london_facade_road_backplate",
    "custom_imagegen_paris_overcast_boulevard_backplate",
}

GENERIC_MATERIAL_NAMES = {
    "background",
    "asphalt",
    "asphalt_patch",
    "paint",
    "yellow",
    "bus_lane",
    "bike_lane",
    "curb",
    "island",
    "tactile",
    "metal",
    "signal",
    "red_signal",
    "green_signal",
    "queue_vehicle_body",
    "queue_vehicle_glass",
    "emergency_vehicle_blue",
}

OPERATOR_STAGE1_MATERIAL_NAMES = GENERIC_MATERIAL_NAMES | {
    "operator_context_ground",
    "operator_asphalt",
    "operator_asphalt_patch",
    "operator_marking_white",
    "operator_marking_yellow",
    "operator_sidewalk",
    "operator_vehicle_body",
    "operator_vehicle_glass",
    "operator_signal_metal",
    "operator_median_concrete",
}

OPERATOR_STAGE2_MATERIAL_NAMES = OPERATOR_STAGE1_MATERIAL_NAMES | {
    "operator_context_concrete",
    "operator_context_curb",
    "operator_context_guardrail",
    "operator_context_facade_warm_gray",
    "operator_context_facade_cool_gray",
    "operator_context_window_dark",
    "operator_context_sign_blue",
    "operator_context_sign_green",
    "operator_context_traffic_cabinet",
    "operator_context_streetlight",
}

OPERATOR_STAGE3_MATERIAL_NAMES = OPERATOR_STAGE2_MATERIAL_NAMES | {
    "operator_stage3_signal_yellow",
    "operator_stage3_signal_black",
    "operator_stage3_signal_lens_red",
    "operator_stage3_signal_lens_green",
    "operator_stage3_vehicle_dark",
    "operator_stage3_vehicle_white",
    "operator_stage3_vehicle_taxi_yellow",
    "operator_stage3_vehicle_bus_green",
    "operator_stage3_vehicle_bus_red",
    "operator_stage3_vehicle_emergency_blue",
    "operator_stage3_vehicle_emergency_red",
    "operator_stage3_vehicle_glass",
}

OPERATOR_STAGE2_TRAFFIC_ZONE_HALF_EXTENT = 1840
OPERATOR_STAGE2_CONTEXT_RING_INNER = 2100
OPERATOR_STAGE2_CONTEXT_RING_OUTER = 5200
OPERATOR_STAGE2_REQUIRED_TOKENS = [
    "OperatorStage2",
    "Stage2ContextGeometry",
    "NoTrafficZoneBackplate",
    "TrafficReadableQueueZone",
]
OPERATOR_STAGE2_FORBIDDEN_MAP_TOKENS = [
    "photo_backplate",
    "road_card",
    "ImageGen",
    "foreground proof",
    "foreground plinth",
    "PolyHaven CC0 VISIBLE",
]

OPERATOR_STAGE3_ACTIVE_CITY = "seoul"
OPERATOR_STAGE3_ASSET_KIT_SCHEMA = "operator-stage3-city-asset-kit-v1"
OPERATOR_STAGE3_CITY_KEYS = ["seoul", "new_york", "paris", "london"]
OPERATOR_STAGE3_REQUIRED_VARIANTS = ["passenger_car", "bus", "taxi", "emergency_vehicle"]
OPERATOR_STAGE3_REQUIRED_TOKENS = [
    "OperatorStage3",
    "Stage3CityAssetKit",
    "Stage3SignalKit",
    "Stage3VehicleKit",
    "SUMOReadyAssetPivot",
]
OPERATOR_STAGE3_FORBIDDEN_MAP_TOKENS = [
    "photo_backplate",
    "road_card",
    "ImageGen",
    "asset_lineup",
    "proof_plinth",
    "foreground proof",
    "foreground plinth",
]

OPERATOR_STAGE6_PROFILE_SCHEMA = "operator-stage6-photoreal-seoul-profile-v1"
OPERATOR_STAGE6_REQUIRED_TOKENS = [
    "OperatorStage6",
    "SUMOReadyOperatorMapPhotoreal",
    "Stage6PhotorealSurface",
    "Stage6GeneratedTextureApplied",
    "Stage6DecalAtlasApplied",
    "Stage4ReadableRuntimeState",
    "NoImageCardTrafficZone",
]
OPERATOR_STAGE6_FORBIDDEN_MAP_TOKENS = [
    "proof_plinth",
    "foreground proof",
    "foreground plinth",
    "traffic_zone_image_card",
    "dominant traffic-zone image card",
]

OPERATOR_STAGE7_PROFILE_SCHEMA = "operator-stage7-production-photoreal-seoul-profile-v1"
OPERATOR_STAGE7_REQUIRED_TOKENS = [
    "OperatorStage7",
    "SUMOReadyOperatorMapProductionPhotoreal",
    "Stage7ProductionRoadUV",
    "Stage7RoadWearDecal",
    "Stage7CurbSidewalkUV",
    "Stage7SignalHardware",
    "Stage7VehicleDetail",
    "Stage7VehicleMeshReplacement",
    "Stage7StreetHardware",
    "Stage7LightingCameraPostProcess",
    "Stage7CameraBackgroundClosure",
    "Stage7IntegratedAsphaltBlend",
    "Stage7VehicleLocalYawDetail",
    "Stage7CurbOcclusionGrime",
    "Stage7BoundaryOcclusion",
    "Stage7LegacyLightingDisabled",
    "Stage7CameraVisibleProductionDetail",
    "Stage7ForegroundSurfaceBreakup",
    "Stage7ImageGenSurfaceGeometry",
    "Stage7SidewalkCoverageGeometry",
    "Stage1To6ReadableRuntimeState",
    "NoTrafficZoneImageCard",
]
OPERATOR_STAGE7_SURFACE_MESH_SOURCE_SCRIPT = "scripts/generate-stage7-surface-meshes.py"
OPERATOR_STAGE7_VEHICLE_MESH_BY_VARIANT = {
    "passenger_car": "stage7_seoul_passenger_sedan",
    "bus": "stage7_seoul_bus",
    "taxi": "stage7_seoul_taxi",
    "emergency_vehicle": "stage7_seoul_emergency_van",
}
OPERATOR_STAGE7_VEHICLE_SCALE_BY_VARIANT = {
    "passenger_car": (1.00, 1.00, 1.00),
    "bus": (1.32, 1.32, 1.32),
    "taxi": (1.00, 1.00, 1.00),
    "emergency_vehicle": (1.00, 1.00, 1.00),
}
OPERATOR_STAGE7_VEHICLE_DETAIL_EXTENTS_BY_VARIANT = {
    "passenger_car": (2.05, 0.82, 0.58),
    "bus": (5.05, 1.38, 1.05),
    "taxi": (2.05, 0.82, 0.58),
    "emergency_vehicle": (2.36, 0.92, 0.78),
}
OPERATOR_STAGE7_FORBIDDEN_MAP_TOKENS = [
    "proof_plinth",
    "foreground proof",
    "foreground plinth",
    "traffic_zone_image_card",
    "dominant traffic-zone image card",
    "Stage8MultiCityExpansion",
]
OPERATOR_STAGE6_SURFACE_PATCHES = [
    ("main_east_west_mesh_uv_asphalt", (0, 0, 18), (58.0, 9.2, 1.0), "photoreal_asphalt", (0, 0, 0)),
    ("main_north_south_mesh_uv_asphalt", (0, 0, 20), (9.2, 58.0, 1.0), "photoreal_asphalt", (0, 0, 0)),
    ("red_bus_lane_northbound_uv_strip", (-520, 0, 26), (1.10, 55.0, 1.0), "custom_imagegen_seoul_wet_bus_lane_atlas", (0, 0, 0)),
    ("red_bus_lane_southbound_uv_strip", (520, 0, 27), (1.10, 55.0, 1.0), "custom_imagegen_seoul_wet_bus_lane_atlas", (0, 0, 0)),
    ("road_atlas_repair_patch_eastbound", (820, -310, 31), (3.2, 1.1, 1.0), "stage6_seoul_road_atlas", (0, 0, 0)),
    ("road_atlas_repair_patch_westbound", (-840, 310, 32), (3.0, 1.0, 1.0), "stage6_seoul_road_atlas", (0, 0, 180)),
    ("road_atlas_repair_patch_center_lane", (210, 140, 33), (2.1, 1.4, 1.0), "stage6_seoul_road_atlas", (0, 0, 8)),
    ("material_study_wet_puddle_patch", (-420, -180, 34), (1.8, 0.92, 1.0), "stage6_seoul_material_study", (0, 0, -6)),
]

OPERATOR_STAGE6_DECAL_PATCHES = [
    ("tire_polish_east_queue", (1130, 270, 36), (8.2, 0.42, 1.0), 0),
    ("tire_polish_west_queue", (-1130, -270, 37), (8.2, 0.42, 1.0), 180),
    ("tire_polish_north_queue", (-270, 1130, 38), (0.42, 8.2, 1.0), 90),
    ("tire_polish_south_queue", (270, -1130, 39), (0.42, 8.2, 1.0), -90),
    ("crosswalk_grime_north_edge", (0, 1220, 40), (12.8, 0.26, 1.0), 0),
    ("crosswalk_grime_south_edge", (0, -1220, 41), (12.8, 0.26, 1.0), 0),
    ("curb_grime_north", (0, 3050, 78), (56.0, 0.22, 1.0), 0),
    ("curb_grime_south", (0, -3050, 79), (56.0, 0.22, 1.0), 0),
    ("tar_crack_center_a", (-160, 0, 44), (0.06, 8.8, 1.0), 8),
    ("tar_crack_center_b", (170, 0, 45), (0.06, 8.8, 1.0), -7),
]

OPERATOR_STAGE3_VEHICLE_SLOTS = [
    ("north", "passenger_car", 0, -275, 1960, 90),
    ("north", "taxi", 1, -95, 2220, 90),
    ("north", "bus", 2, 110, 2580, 90),
    ("south", "passenger_car", 0, 275, -1960, -90),
    ("south", "emergency_vehicle", 1, 95, -2300, -90),
    ("east", "passenger_car", 0, 1960, 275, 180),
    ("east", "bus", 1, 2380, 95, 180),
    ("west", "taxi", 0, -1960, -275, 0),
    ("west", "passenger_car", 1, -2220, -95, 0),
    ("west", "emergency_vehicle", 2, -2580, 110, 0),
]

OPERATOR_STAGE3_SIGNAL_ASSEMBLIES = [
    ("seoul_northwest", "seoul", -1140, 1120, 0, "overhead_mast_arm_compact"),
    ("seoul_northeast", "seoul", 1140, 1120, 180, "overhead_mast_arm_compact"),
    ("seoul_southwest", "seoul", -1140, -1120, 0, "overhead_mast_arm_compact"),
    ("seoul_southeast", "seoul", 1140, -1120, 180, "overhead_mast_arm_compact"),
]

OPERATOR_STAGE2_FACADE_BLOCKS = [
    ("northwest_block", -3200, 3900, 920, 520, 560, "operator_context_facade_warm_gray"),
    ("northeast_block", 3100, 3820, 860, 480, 620, "operator_context_facade_cool_gray"),
    ("southwest_block", -3450, -3920, 980, 540, 520, "operator_context_facade_cool_gray"),
    ("southeast_block", 3300, -3760, 900, 500, 580, "operator_context_facade_warm_gray"),
    ("east_mid_block", 4550, 1750, 760, 420, 460, "operator_context_facade_warm_gray"),
    ("west_mid_block", -4520, -1700, 760, 420, 460, "operator_context_facade_cool_gray"),
]

OPERATOR_STAGE2_STREET_FURNITURE = [
    ("cabinet_nw", -1540, 1560, "traffic_cabinet"),
    ("cabinet_se", 1560, -1540, "traffic_cabinet"),
    ("cctv_ne", 1660, 1520, "cctv"),
    ("streetlight_north_1", -900, 2140, "streetlight"),
    ("streetlight_north_2", 900, 2140, "streetlight"),
    ("streetlight_south_1", -900, -2140, "streetlight"),
    ("streetlight_south_2", 900, -2140, "streetlight"),
    ("guide_sign_east", 2140, 920, "sign_green"),
    ("guide_sign_west", -2140, -920, "sign_blue"),
]

SEOUL_MATERIAL_NAMES = GENERIC_MATERIAL_NAMES | {
    "photoreal_asphalt",
    "photoreal_curb",
    "photoreal_bus_lane",
    "photoreal_yellow_worn",
    "photoreal_white_worn",
    "photoreal_metal",
    "photoreal_decal_zebra",
    "photoreal_crack_overlay",
    "photoreal_grime_overlay",
    "photoreal_sidewalk",
    "photoreal_brick",
    "photoreal_glass",
    "photoreal_warm_window",
    "photoreal_sign_plate",
    "target_sky_atlas",
    "target_mist_building",
    "target_road_glint",
    "target_shadow_grime",
    "custom_imagegen_seoul_wet_bus_lane_atlas",
    "custom_imagegen_seoul_rainy_intersection_backplate",
}

OPERATOR_STAGE6_MATERIAL_NAMES = OPERATOR_STAGE3_MATERIAL_NAMES | SEOUL_MATERIAL_NAMES | {
    "stage6_seoul_photoreal_target",
    "stage6_seoul_material_study",
    "stage6_seoul_road_atlas",
    "stage6_seoul_surface_overlays",
}

OPERATOR_STAGE7_MATERIAL_NAMES = OPERATOR_STAGE6_MATERIAL_NAMES | {
    "stage7_seoul_traffic_camera_target",
    "stage7_seoul_asphalt_marking_source",
    "stage7_seoul_curb_sidewalk_source",
    "stage7_seoul_signal_vehicle_source",
    "stage7_seoul_facade_context_source",
    "stage7_textured_asphalt_base",
    "stage7_dark_wet_asphalt",
    "stage7_wet_asphalt_patch",
    "stage7_worn_white",
    "stage7_worn_yellow",
    "stage7_curb_concrete",
    "stage7_sidewalk_paver",
    "stage7_sidewalk_joint",
    "stage7_tactile",
    "stage7_signal_black",
    "stage7_vehicle_blue",
    "stage7_vehicle_bus_blue",
    "stage7_vehicle_bus_green",
    "stage7_vehicle_taxi_yellow",
    "stage7_vehicle_dark_body",
    "stage7_tire_black",
    "stage7_headlamp",
    "stage7_vehicle_glass",
    "stage7_contact_shadow",
    "stage7_puddle_reflection",
    "stage7_road_micro_highlight",
    "stage7_curb_wet_grime",
    "stage7_sidewalk_damp_edge",
    "stage7_facade_soft",
    "stage7_overcast_background",
    "stage7_window_glass",
    "stage7_roof_concrete",
    "stage7_roof_gravel",
    "stage7_parking_concrete",
    "stage7_pavement_fill",
    "stage7_rooftop_unit",
    "stage7_grass_verge",
    "stage7_tree_canopy",
    "stage7_tree_trunk",
}

NEW_YORK_MATERIAL_NAMES = GENERIC_MATERIAL_NAMES | {
    "photoreal_asphalt",
    "photoreal_curb",
    "photoreal_bus_lane",
    "photoreal_yellow_worn",
    "photoreal_white_worn",
    "photoreal_metal",
    "photoreal_brick",
    "photoreal_glass",
    "photoreal_warm_window",
    "photoreal_decal_zebra",
    "photoreal_decal_arrow",
    "photoreal_crack_overlay",
    "photoreal_grime_overlay",
    "photoreal_sidewalk",
    "photoreal_sign_plate",
    "target_cycle_box",
    "target_road_glint",
    "target_shadow_grime",
    "target_sky_atlas",
    "target_mist_building",
    "custom_imagegen_new_york_wet_intersection_atlas",
    "custom_imagegen_new_york_manhattan_backplate",
    "custom_imagegen_new_york_wet_intersection_atlas_balanced",
    "custom_imagegen_new_york_manhattan_backplate_balanced",
}

PARIS_MATERIAL_NAMES = GENERIC_MATERIAL_NAMES | {
    "photoreal_asphalt",
    "photoreal_curb",
    "photoreal_bus_lane",
    "photoreal_yellow_worn",
    "photoreal_white_worn",
    "photoreal_metal",
    "photoreal_decal_zebra",
    "photoreal_decal_arrow",
    "photoreal_crack_overlay",
    "photoreal_grime_overlay",
    "photoreal_sidewalk",
    "target_cycle_box",
    "target_road_glint",
    "target_shadow_grime",
    "photoreal_brick",
    "photoreal_glass",
    "photoreal_warm_window",
    "custom_imagegen_paris_wet_intersection_atlas",
    "custom_imagegen_paris_overcast_boulevard_backplate",
}

CITY_MATERIAL_NAMES = {
    "seoul": SEOUL_MATERIAL_NAMES,
    "new_york": NEW_YORK_MATERIAL_NAMES,
    "paris": PARIS_MATERIAL_NAMES,
}


DEFAULT_RENDERER_SNAPSHOT_VISUAL = {
    "source": "FastAPI fixture renderer snapshot",
    "active_signal_group": "east_priority",
    "cycle_second": 24,
    "queues": {"north": 32, "south": 11, "east": 18, "west": 8},
    "pedestrian_request": True,
    "emergency_vehicle_direction": "east",
    "pixel_stream_status": "ready",
}



class RoadOnlyRenderer:
    """Static road/intersection renderer foundation; SUMO remains the truth source."""

    def __init__(self, profile_path: str):
        self.profile_path = Path(profile_path)
        self.profile = json.loads(self.profile_path.read_text(encoding="utf-8"))
        self.city = self.profile["city"]
        self.display_name = self.profile["display_name"]
        self.operator_stage1 = os.environ.get("SMART_INTERSECTION_OPERATOR_STAGE1") == "1"
        self.operator_stage2 = os.environ.get("SMART_INTERSECTION_OPERATOR_STAGE2") == "1"
        self.operator_stage3 = os.environ.get("SMART_INTERSECTION_OPERATOR_STAGE3") == "1"
        self.operator_stage7 = os.environ.get("SMART_INTERSECTION_OPERATOR_STAGE7") == "1"
        self.operator_stage6 = os.environ.get("SMART_INTERSECTION_OPERATOR_STAGE6") == "1"
        self.project_root = self.profile_path.parents[2]
        self.generated_dir = self.project_root / "GeneratedProof"
        self.generated_dir.mkdir(parents=True, exist_ok=True)
        self.materials = {}
        self.stage3_asset_kit_profile = None

    @property
    def package_path(self) -> str:
        if self.operator_stage7:
            return "/Game/Maps/Generated/smart_intersection_rebuild_operator_stage7"
        if self.operator_stage6:
            return "/Game/Maps/Generated/smart_intersection_rebuild_operator_stage6"
        if self.operator_stage3:
            return "/Game/Maps/Generated/smart_intersection_rebuild_stage3"
        if self.operator_stage2:
            return "/Game/Maps/Generated/smart_intersection_rebuild_stage2"
        if self.operator_stage1:
            return "/Game/Maps/Generated/smart_intersection_rebuild"
        return f"/Game/Maps/Generated/{self.city}_RoadOnly"

    def build_manifest(self) -> dict:
        if self.operator_stage7:
            stage7_profile = self._load_operator_stage7_profile()
            source_textures = stage7_profile.get("source_textures", [])
            return {
                "generator": "RoadOnlyRenderer",
                "schema": "operator-stage7-production-photoreal-proof-v1",
                "mode": "OperatorStage7",
                "city": self.city,
                "display_name": "SUMO-ready Seoul production photoreal operator viewport",
                "simulation_truth_source": "SUMO/TraCI is truth",
                "future_bridge": "TraCI bridge via FastAPI renderer snapshots",
                "renderer_role": "Unreal renders only",
                "scope": "Stage 7 production photoreal visual pass; no live SUMO motion and no real traffic-control integration",
                "unreal_map": self.package_path,
                "base_stage": "OperatorStage6",
                "base_motion_stage": "OperatorStage4 fixture renderer snapshots",
                "transport_stage": "OperatorStage5 Pixel Streaming dashboard transport remains frame-only",
                "profile_schema": stage7_profile.get("schema"),
                "profile_path": "renderer/unreal/SmartIntersection/SceneProfiles/operator_stage7_production_photoreal_profile.json",
                "imagegen_sources": stage7_profile.get("imagegen_sources", []),
                "reference_photo_sources": stage7_profile.get("reference_photo_sources", []),
                "source_textures": source_textures,
                "procedural_texture_sources": stage7_profile.get("procedural_texture_sources", []),
                "procedural_mesh_sources": stage7_profile.get("procedural_mesh_sources", []),
                "applied_materials": [
                    "stage7_seoul_asphalt_marking_source",
                    "stage7_seoul_curb_sidewalk_source",
                    "stage7_seoul_signal_vehicle_source",
                    "stage7_seoul_facade_context_source",
                    "stage7_textured_asphalt_base",
                    "stage7_dark_wet_asphalt",
                    "stage7_wet_asphalt_patch",
                    "stage7_worn_white",
                    "stage7_worn_yellow",
                    "stage7_curb_concrete",
                    "stage7_sidewalk_paver",
                    "stage7_sidewalk_joint",
                    "stage7_tactile",
                "stage7_signal_black",
                "stage7_vehicle_blue",
                "stage7_vehicle_bus_blue",
                "stage7_vehicle_bus_green",
                "stage7_vehicle_taxi_yellow",
                "stage7_vehicle_dark_body",
                "stage7_tire_black",
                "stage7_headlamp",
                "stage7_vehicle_glass",
                "stage7_contact_shadow",
                "stage7_puddle_reflection",
                "stage7_road_micro_highlight",
                "stage7_curb_wet_grime",
                "stage7_sidewalk_damp_edge",
                "stage7_facade_soft",
                "stage7_overcast_background",
                "stage7_window_glass",
                "stage7_roof_concrete",
                "stage7_roof_gravel",
                "stage7_parking_concrete",
                "stage7_pavement_fill",
                "stage7_rooftop_unit",
                "stage7_grass_verge",
                "stage7_tree_canopy",
                "stage7_tree_trunk",
                    "stage6_seoul_road_atlas",
                    "stage6_seoul_surface_overlays",
                ],
                "production_asset_consumers": {
                    item.get("material"): item.get("consuming_actors", [])
                    for item in source_textures
                    if isinstance(item, dict)
                },
                "actor_evidence": [
                    *OPERATOR_STAGE7_REQUIRED_TOKENS,
                    "OperatorStage6",
                    "SUMOReadyOperatorMapPhotoreal",
                    "Stage6PhotorealSurface",
                    "Stage6GeneratedTextureApplied",
                    "Stage6DecalAtlasApplied",
                    "Stage4ReadableRuntimeState",
                    "NoImageCardTrafficZone",
                    "OperatorStage1",
                    "TrafficReadableQueueZone",
                    "OperatorStage2",
                    "NoTrafficZoneBackplate",
                    "OperatorStage3",
                    "Stage3CityAssetKit",
                    "Stage3SignalKit",
                    "Stage3VehicleKit",
                    "SUMOReadyAssetPivot",
                ],
                "readability_requirements": stage7_profile.get("readability_requirements", []),
                "forbidden_map_tokens": OPERATOR_STAGE7_FORBIDDEN_MAP_TOKENS,
                "renderer_policy": "SUMO/TraCI is truth; FastAPI orchestrates state; Unreal renders; Pixel Streaming transports frames only.",
                "live_sumo_status": "deferred_until_real_sumo_traci_runtime_metadata_proves_simulation_source_sumo_traci",
                "runtime_controller": f"TrafficSimulationController SmartIntersectionRuntime {self.city}",
            }
        if self.operator_stage6:
            stage6_profile = self._load_operator_stage6_profile()
            return {
                "generator": "RoadOnlyRenderer",
                "schema": "operator-stage6-photoreal-proof-v1",
                "mode": "OperatorStage6",
                "city": self.city,
                "display_name": "SUMO-ready Seoul operator viewport with image-derived photoreal road materials",
                "simulation_truth_source": "SUMO/TraCI is truth",
                "future_bridge": "TraCI bridge via FastAPI renderer snapshots",
                "renderer_role": "Unreal renders only",
                "scope": "Stage 6 fixture-backed renderer realism proof; no live SUMO motion and no real traffic-control integration",
                "unreal_map": self.package_path,
                "base_stage": "OperatorStage3",
                "base_motion_stage": "OperatorStage4 fixture renderer snapshots",
                "transport_stage": "OperatorStage5 Pixel Streaming dashboard transport remains frame-only",
                "profile_schema": stage6_profile.get("schema"),
                "profile_path": "renderer/unreal/SmartIntersection/SceneProfiles/operator_stage6_photoreal_profile.json",
                "imagegen_targets": stage6_profile.get("imagegen_targets", []),
                "source_textures": stage6_profile.get("source_textures", []),
                "applied_materials": [
                    "stage6_seoul_photoreal_target",
                    "stage6_seoul_material_study",
                    "stage6_seoul_road_atlas",
                    "stage6_seoul_surface_overlays",
                    "custom_imagegen_seoul_wet_bus_lane_atlas",
                    "photoreal_curb",
                    "photoreal_white_worn",
                    "photoreal_metal",
                ],
                "actor_evidence": [
                    *OPERATOR_STAGE6_REQUIRED_TOKENS,
                    "OperatorStage1",
                    "TrafficReadableQueueZone",
                    "OperatorStage2",
                    "NoTrafficZoneBackplate",
                    "OperatorStage3",
                    "Stage3CityAssetKit",
                    "Stage3SignalKit",
                    "Stage3VehicleKit",
                    "SUMOReadyAssetPivot",
                ],
                "forbidden_map_tokens": OPERATOR_STAGE6_FORBIDDEN_MAP_TOKENS,
                "renderer_policy": "SUMO/TraCI is truth; FastAPI orchestrates state; Unreal renders; Pixel Streaming transports frames only.",
                "live_sumo_status": "deferred_until_real_sumo_traci_runtime_metadata_proves_simulation_source_sumo_traci",
                "runtime_controller": f"TrafficSimulationController SmartIntersectionRuntime {self.city}",
            }
        if self.operator_stage3:
            kit_profile = self._load_operator_stage3_asset_kits()
            return {
                "generator": "RoadOnlyRenderer",
                "mode": "OperatorStage3",
                "city": self.city,
                "display_name": "SUMO-ready operator intersection with city signal and vehicle asset kit",
                "simulation_truth_source": "SUMO truth source",
                "future_bridge": "TraCI bridge via FastAPI renderer snapshots",
                "renderer_role": "Unreal renderer only",
                "scope": "Stage 3 city asset-kit pass; no live SUMO motion and no real traffic-control integration",
                "imagegen_reference": "artifacts/imagegen/sumo-ready-operator-map-stage3-asset-reference.png",
                "unreal_map": self.package_path,
                "base_stage": "OperatorStage2",
                "asset_kit_schema": OPERATOR_STAGE3_ASSET_KIT_SCHEMA,
                "active_city": OPERATOR_STAGE3_ACTIVE_CITY,
                "city_kits": OPERATOR_STAGE3_CITY_KEYS,
                "required_variants": OPERATOR_STAGE3_REQUIRED_VARIANTS,
                "lane_fit_cm": kit_profile.get("lane_fit_cm", {}),
                "runtime_policy": kit_profile.get("runtime_policy"),
                "actor_evidence": [
                    *OPERATOR_STAGE3_REQUIRED_TOKENS,
                    "OperatorStage2",
                    "NoTrafficZoneBackplate",
                    "TrafficReadableQueueZone",
                ],
                "forbidden_map_tokens": OPERATOR_STAGE3_FORBIDDEN_MAP_TOKENS,
                "queue_capacity_visible": 40,
                "runtime_controller": f"TrafficSimulationController SmartIntersectionRuntime {self.city}",
            }
        if self.operator_stage2:
            return {
                "generator": "RoadOnlyRenderer",
                "mode": "OperatorStage2",
                "city": self.city,
                "display_name": "SUMO-ready operator intersection with 3D context geometry",
                "simulation_truth_source": "SUMO truth source",
                "future_bridge": "TraCI bridge via FastAPI renderer snapshots",
                "renderer_role": "Unreal renderer only",
                "scope": "Stage 2 context geometry pass; no live SUMO motion and no real traffic-control integration",
                "imagegen_reference": "artifacts/imagegen/sumo-ready-operator-map-stage2-context-reference.png",
                "unreal_map": self.package_path,
                "base_stage": "OperatorStage1",
                "context_policy": "3D geometry in and near traffic-reading zone; no traffic-zone backplates",
                "traffic_zone_half_extent_cm": OPERATOR_STAGE2_TRAFFIC_ZONE_HALF_EXTENT,
                "context_ring_inner_cm": OPERATOR_STAGE2_CONTEXT_RING_INNER,
                "context_ring_outer_cm": OPERATOR_STAGE2_CONTEXT_RING_OUTER,
                "actor_evidence": OPERATOR_STAGE2_REQUIRED_TOKENS,
                "forbidden_map_tokens": OPERATOR_STAGE2_FORBIDDEN_MAP_TOKENS,
                "queue_capacity_visible": 40,
                "runtime_controller": f"TrafficSimulationController SmartIntersectionRuntime {self.city}",
            }
        if self.operator_stage1:
            return {
                "generator": "RoadOnlyRenderer",
                "mode": "OperatorStage1",
                "city": self.city,
                "display_name": "SUMO-ready large operator intersection map",
                "simulation_truth_source": "SUMO truth source",
                "future_bridge": "TraCI bridge via FastAPI renderer snapshots",
                "renderer_role": "Unreal renderer only",
                "scope": "Stage 1 large operator map; no live SUMO motion and no real traffic-control integration",
                "imagegen_reference": "artifacts/imagegen/sumo-ready-operator-map-stage1-reference.png",
                "unreal_map": self.package_path,
                "actor_evidence": [
                    "OperatorStage1",
                    "SUMOReadyLargeIntersection",
                    "TrafficReadableQueueZone",
                    "SUMOPlaceholderVehicleQueue",
                    "QueueCapacity_40",
                ],
                "queue_capacity_visible": 40,
                "traffic_readable_queue_zone": {
                    "approaches": ["north", "south", "east", "west"],
                    "queue_markers_per_approach": 10,
                    "road_markings": "separate Unreal cube/decal-like geometry layers",
                },
                "runtime_controller": f"TrafficSimulationController SmartIntersectionRuntime {self.city}",
            }
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
            "runtime_controller": f"TrafficSimulationController SmartIntersectionRuntime {self.city}",
            "renderer_snapshot_visualization": DEFAULT_RENDERER_SNAPSHOT_VISUAL,
            "high_fidelity_mesh_seam": "FBX source meshes under SourceAssets/PhotorealRoadKit/Meshes replace proxy OBJ props",
        }

    def write_manifest(self) -> Path:
        if self.operator_stage7:
            path = self.generated_dir / "smart_intersection_rebuild_operator_stage7_production_photoreal_manifest.json"
            path.write_text(json.dumps(self.build_manifest(), indent=2) + "\n", encoding="utf-8")
            return path
        if self.operator_stage6:
            path = self.generated_dir / "smart_intersection_rebuild_operator_stage6_photoreal_manifest.json"
            path.write_text(json.dumps(self.build_manifest(), indent=2) + "\n", encoding="utf-8")
            return path
        if self.operator_stage3:
            path = self.generated_dir / "smart_intersection_rebuild_operator_stage3_manifest.json"
            path.write_text(json.dumps(self.build_manifest(), indent=2) + "\n", encoding="utf-8")
            return path
        if self.operator_stage2:
            path = self.generated_dir / "smart_intersection_rebuild_operator_stage2_manifest.json"
            path.write_text(json.dumps(self.build_manifest(), indent=2) + "\n", encoding="utf-8")
            return path
        if self.operator_stage1:
            path = self.generated_dir / "smart_intersection_rebuild_operator_stage1_manifest.json"
            path.write_text(json.dumps(self.build_manifest(), indent=2) + "\n", encoding="utf-8")
            return path
        path = self.generated_dir / f"{self.city}_road_only_manifest.json"
        path.write_text(json.dumps(self.build_manifest(), indent=2) + "\n", encoding="utf-8")
        return path

    def run_unreal_generation(self) -> None:
        if unreal is None:
            print("UNREAL_UNAVAILABLE_MANIFEST_ONLY")
            return
        self._new_level()
        # Existing generated maps can retain actors when regenerated into the same package;
        # clear explicitly so stale oversized proxy/FBX actors cannot survive a fidelity pass.
        self._clear_level()
        self._import_photoreal_roadkit()
        self._create_materials()
        self._build_scene()
        self._save_level()
        if self.operator_stage7:
            print(f"OPERATOR_STAGE7_UNREAL_GENERATED city={self.city} package={self.package_path}")
            return
        if self.operator_stage6:
            print(f"OPERATOR_STAGE6_UNREAL_GENERATED city={self.city} package={self.package_path}")
            return
        if self.operator_stage3:
            print(f"OPERATOR_STAGE3_UNREAL_GENERATED city={self.city} package={self.package_path}")
            return
        if self.operator_stage2:
            print(f"OPERATOR_STAGE2_UNREAL_GENERATED city={self.city} package={self.package_path}")
            return
        if self.operator_stage1:
            print(f"OPERATOR_STAGE1_UNREAL_GENERATED city={self.city} package={self.package_path}")
            return
        print(f"ROAD_ONLY_UNREAL_GENERATED city={self.city} package={self.package_path}")

    def _import_photoreal_roadkit(self) -> None:
        if self.city not in {"london", "seoul", "new_york", "paris"}:
            return
        source_root = self.project_root / "SourceAssets" / "PhotorealRoadKit"
        if not source_root.exists():
            print(f"PHOTOREAL_ROADKIT_SOURCE_MISSING path={source_root}")
            return
        asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
        tasks = []
        skipped_existing = 0
        for src, dest in [
            (source_root / "Textures", "/Game/PhotorealRoadKit/Textures"),
            (source_root / "Meshes", "/Game/PhotorealRoadKit/Meshes"),
        ]:
            unreal.EditorAssetLibrary.make_directory(dest)
            for file_path in sorted(src.glob("*")):
                if file_path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".obj", ".fbx"}:
                    continue
                asset_path = f"{dest}/{file_path.stem}"
                if os.environ.get("SMART_INTERSECTION_FORCE_ROADKIT_IMPORT") != "1" and unreal.EditorAssetLibrary.does_asset_exist(asset_path):
                    skipped_existing += 1
                    continue
                task = unreal.AssetImportTask()
                task.filename = str(file_path)
                task.destination_path = dest
                task.automated = True
                task.replace_existing = False
                task.save = True
                if file_path.suffix.lower() == ".fbx":
                    try:
                        options = unreal.FbxImportUI()
                        options.import_mesh = True
                        options.import_as_skeletal = False
                        options.import_materials = False
                        options.import_textures = False
                        if hasattr(options, "static_mesh_import_data") and options.static_mesh_import_data:
                            options.static_mesh_import_data.combine_meshes = True
                            options.static_mesh_import_data.generate_lightmap_u_vs = True
                            options.static_mesh_import_data.auto_generate_collision = True
                        task.options = options
                    except Exception as exc:
                        print(f"PHOTOREAL_FBX_IMPORT_OPTIONS_FALLBACK file={file_path.name} error={exc}")
                tasks.append(task)
        if tasks:
            asset_tools.import_asset_tasks(tasks)
        print(f"PHOTOREAL_ROADKIT_IMPORTED city={self.city} tasks={len(tasks)} skipped_existing={skipped_existing}")

    def _new_level(self) -> None:
        level_subsystem = None
        try:
            level_subsystem = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
        except Exception:
            level_subsystem = None
        if unreal.EditorAssetLibrary.does_asset_exist(self.package_path):
            if level_subsystem is not None and hasattr(level_subsystem, "load_level"):
                level_subsystem.load_level(self.package_path)
                print(f"ROAD_ONLY_LOADED_EXISTING_LEVEL package={self.package_path}")
                return
            if hasattr(unreal.EditorLevelLibrary, "load_level"):
                unreal.EditorLevelLibrary.load_level(self.package_path)
                print(f"ROAD_ONLY_LOADED_EXISTING_LEVEL package={self.package_path}")
                return
        if hasattr(unreal.EditorLevelLibrary, "new_level"):
            unreal.EditorLevelLibrary.new_level(self.package_path)
            return
        if level_subsystem is not None and hasattr(level_subsystem, "new_level"):
            level_subsystem.new_level(self.package_path)
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
        if self.operator_stage7:
            city_material_names = OPERATOR_STAGE7_MATERIAL_NAMES
        elif self.operator_stage6:
            city_material_names = OPERATOR_STAGE6_MATERIAL_NAMES
        elif self.operator_stage3:
            city_material_names = OPERATOR_STAGE3_MATERIAL_NAMES
        elif self.operator_stage2:
            city_material_names = OPERATOR_STAGE2_MATERIAL_NAMES
        elif self.operator_stage1:
            city_material_names = OPERATOR_STAGE1_MATERIAL_NAMES
        else:
            city_material_names = CITY_MATERIAL_NAMES.get(self.city)
        rebuilt_material_names = set()
        for name, rgba in MATERIAL_COLORS.items():
            if city_material_names is not None:
                if name not in city_material_names:
                    continue
            elif self.city != "london" and name not in GENERIC_MATERIAL_NAMES:
                continue
            asset_name = f"M_{self.city}_{name}"
            asset_path = f"{material_dir}/{asset_name}"
            mat = unreal.EditorAssetLibrary.load_asset(asset_path)
            rebuilt = False
            operator_mode = self.operator_stage1 or self.operator_stage2 or self.operator_stage3 or self.operator_stage6 or self.operator_stage7
            if self.operator_stage7:
                recreate_operator_material = name.startswith("stage7_") or name.startswith("stage6_")
            elif self.operator_stage6:
                recreate_operator_material = name.startswith("stage6_")
            elif self.operator_stage3:
                recreate_operator_material = name.startswith("operator_stage3_")
            else:
                recreate_operator_material = (self.operator_stage1 or self.operator_stage2) and name.startswith("operator_")
            if mat is not None and ((name in RECREATE_MATERIAL_NAMES and not operator_mode) or recreate_operator_material):
                try:
                    if unreal.EditorAssetLibrary.delete_asset(asset_path):
                        mat = None
                except Exception as exc:
                    print(f"ROAD_ONLY_MATERIAL_RECREATE_FALLBACK name={name} error={exc}")
            if mat is None:
                try:
                    mat = asset_tools.create_asset(asset_name, material_dir, unreal.Material, unreal.MaterialFactoryNew())
                    rebuilt = mat is not None
                except Exception as exc:
                    print(f"ROAD_ONLY_MATERIAL_FALLBACK name={name} error={exc}")
                    mat = None
            if mat is not None:
                if rebuilt:
                    rebuilt_material_names.add(name)
                if name in rebuilt_material_names:
                    self._set_material_color(mat, rgba, clear_expressions=True)
                    unreal.EditorAssetLibrary.save_loaded_asset(mat)
            self.materials[name] = mat
        for name, texture_path in CITY_TEXTURE_MATERIALS.get(self.city, {}).items():
            mat = self.materials.get(name)
            texture = unreal.EditorAssetLibrary.load_asset(texture_path)
            if mat is not None and texture is not None and name in rebuilt_material_names:
                self._set_material_texture(mat, texture, clear_expressions=True)
                unreal.EditorAssetLibrary.save_loaded_asset(mat)

    def _clear_material_expressions(self, mat) -> None:
        # UE 5.7 can assert on DeleteAllMaterialExpressions for rooted loaded assets.
        # The generator configures only newly-created/recreated blank materials instead.
        return

    def _set_material_color(self, mat, rgba, clear_expressions: bool = False) -> None:
        try:
            if clear_expressions:
                self._clear_material_expressions(mat)
            def connect_constant_property(expression, property_name, property_value) -> bool:
                for output_name in ("", "RGB"):
                    try:
                        if unreal.MaterialEditingLibrary.connect_material_property(expression, output_name, property_value):
                            return True
                    except Exception:
                        pass
                print(f"ROAD_ONLY_MATERIAL_CONNECT_FAILED material={mat.get_name()} property={property_name}")
                return False

            color = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -420, 0)
            color.set_editor_property("constant", unreal.LinearColor(*rgba))
            connect_constant_property(color, "base_color", unreal.MaterialProperty.MP_BASE_COLOR)
            # Sky and mist cards behave like atmospheric background, not road props.
            material_key = mat.get_name().lower()
            if "_operator_" in material_key:
                emissive_rgba = rgba
            elif any(key in material_key for key in (
                "target_sky_atlas",
                "target_mist_building",
                "target_fog_plane_soft",
                "stage7_seoul_traffic_camera_target",
                "stage7_overcast_background",
            )):
                emissive_rgba = rgba
            elif any(key in material_key for key in (
                "stage7_facade_soft",
                "stage7_roof_concrete",
                "stage7_roof_gravel",
                "stage7_parking_concrete",
                "stage7_pavement_fill",
                "stage7_rooftop_unit",
                "stage7_window_glass",
                "stage7_sidewalk_paver",
                "stage7_curb_concrete",
                "stage7_grass_verge",
                "stage7_tree_canopy",
                "photoreal_glass",
            )):
                emissive_rgba = tuple(min(1.0, channel * 0.22) for channel in rgba[:3]) + (rgba[3],)
            elif any(key in material_key for key in (
                "stage7_vehicle",
                "stage7_signal_black",
                "stage7_tire_black",
                "stage7_contact_shadow",
            )):
                emissive_rgba = tuple(min(1.0, channel * 0.18) for channel in rgba[:3]) + (rgba[3],)
            elif "stage7_headlamp" in material_key:
                emissive_rgba = tuple(min(1.0, channel * 0.34) for channel in rgba[:3]) + (rgba[3],)
            else:
                emissive_rgba = (0.0, 0.0, 0.0, 1.0)
            black = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -420, 180)
            black.set_editor_property("constant", unreal.LinearColor(*emissive_rgba))
            connect_constant_property(black, "emissive_color", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
            rough = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant, -420, 320)
            if "stage7_textured_asphalt_base" in material_key or "stage7_dark_wet_asphalt" in material_key or "stage7_wet_asphalt_patch" in material_key or "stage7_puddle_reflection" in material_key:
                rough_value = 0.46
            elif "stage7_curb_concrete" in material_key or "stage7_sidewalk_paver" in material_key:
                rough_value = 0.55
            elif "stage7_vehicle_glass" in material_key or "stage7_window_glass" in material_key:
                rough_value = 0.22
            elif "stage7_vehicle" in material_key or "stage7_signal_black" in material_key:
                rough_value = 0.42
            else:
                rough_value = 0.62
            rough.set_editor_property("r", rough_value)
            unreal.MaterialEditingLibrary.connect_material_property(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)
            spec = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant, -420, 430)
            if "stage7_textured_asphalt_base" in material_key or "stage7_dark_wet_asphalt" in material_key or "stage7_wet_asphalt_patch" in material_key or "stage7_puddle_reflection" in material_key:
                spec_value = 0.28
            elif "stage7_vehicle_glass" in material_key or "stage7_window_glass" in material_key:
                spec_value = 0.62
            elif "stage7_vehicle" in material_key or "stage7_signal_black" in material_key:
                spec_value = 0.32
            else:
                spec_value = 0.18
            spec.set_editor_property("r", spec_value)
            unreal.MaterialEditingLibrary.connect_material_property(spec, "", unreal.MaterialProperty.MP_SPECULAR)
            if hasattr(unreal.MaterialEditingLibrary, "recompile_material"):
                unreal.MaterialEditingLibrary.recompile_material(mat)
        except Exception as exc:
            print(f"ROAD_ONLY_MATERIAL_COLOR_FALLBACK error={exc}")

    def _texture_palette_override(self, mat_name: str):
        return None

    def _set_material_texture(self, mat, texture, clear_expressions: bool = False) -> None:
        try:
            if clear_expressions:
                self._clear_material_expressions(mat)
            mat_name = mat.get_name().lower()
            palette_override = self._texture_palette_override(mat_name)
            if palette_override is not None:
                self._set_material_color(mat, palette_override)
                return
            toned_backplates = {
                "m_london_custom_imagegen_london_facade_road_backplate": 0.85,
                "m_paris_custom_imagegen_paris_overcast_boulevard_backplate": 0.28,
            }
            stage7_texture_tones = {
                "m_seoul_stage7_textured_asphalt_base": 1.28,
                "m_seoul_stage7_seoul_asphalt_marking_source": 0.82,
                "m_seoul_stage7_seoul_curb_sidewalk_source": 0.78,
                "m_seoul_stage7_seoul_facade_context_source": 0.95,
                "m_seoul_stage7_curb_concrete": 0.86,
                "m_seoul_stage7_sidewalk_paver": 0.92,
                "m_seoul_stage7_roof_concrete": 0.82,
                "m_seoul_stage7_roof_gravel": 0.82,
                "m_seoul_stage7_parking_concrete": 0.92,
                "m_seoul_stage7_pavement_fill": 0.88,
                "m_seoul_stage7_rooftop_unit": 0.82,
            }
            stage7_context_texture_keys = (
                "stage7_roof_gravel",
                "stage7_parking_concrete",
                "stage7_pavement_fill",
                "stage7_rooftop_unit",
                "stage7_curb_concrete",
                "stage7_sidewalk_paver",
                "stage7_roof_concrete",
            )
            sample = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionTextureSample, -740, 0)
            sample.set_editor_property("texture", texture)
            texture_tone = toned_backplates.get(mat_name)
            if texture_tone is None:
                texture_tone = stage7_texture_tones.get(mat_name)
            if texture_tone is not None:
                tone = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionMultiply, -520, 0)
                tone.set_editor_property("const_b", texture_tone)
                unreal.MaterialEditingLibrary.connect_material_expressions(sample, "RGB", tone, "A")
                unreal.MaterialEditingLibrary.connect_material_property(tone, "", unreal.MaterialProperty.MP_BASE_COLOR)
            else:
                unreal.MaterialEditingLibrary.connect_material_property(sample, "RGB", unreal.MaterialProperty.MP_BASE_COLOR)
            if (
                "custom_imagegen" in mat_name
                or "stage6_seoul" in mat_name
                or "stage7_seoul" in mat_name
                or any(key in mat_name for key in stage7_context_texture_keys)
            ):
                try:
                    mat.set_editor_property("two_sided", True)
                except Exception:
                    pass
            if (
                ("custom_imagegen" in mat_name and "backplate" in mat_name and mat_name not in toned_backplates)
                or "stage7_seoul_traffic_camera_target" in mat_name
            ):
                unreal.MaterialEditingLibrary.connect_material_property(sample, "RGB", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
            elif "stage7_seoul_facade_context_source" in mat_name:
                facade_glow = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionMultiply, -520, 180)
                facade_glow.set_editor_property("const_b", 0.28)
                unreal.MaterialEditingLibrary.connect_material_expressions(sample, "RGB", facade_glow, "A")
                unreal.MaterialEditingLibrary.connect_material_property(facade_glow, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
            elif "stage7_seoul_signal_vehicle_source" in mat_name:
                hardware_glow = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionMultiply, -520, 180)
                hardware_glow.set_editor_property("const_b", 0.18)
                unreal.MaterialEditingLibrary.connect_material_expressions(sample, "RGB", hardware_glow, "A")
                unreal.MaterialEditingLibrary.connect_material_property(hardware_glow, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
            elif any(key in mat_name for key in stage7_context_texture_keys):
                soft = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -740, 180)
                soft.set_editor_property("constant", unreal.LinearColor(0.055, 0.056, 0.052, 1.0))
                unreal.MaterialEditingLibrary.connect_material_property(soft, "RGB", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
            else:
                black = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant3Vector, -740, 180)
                black.set_editor_property("constant", unreal.LinearColor(0.0, 0.0, 0.0, 1.0))
                unreal.MaterialEditingLibrary.connect_material_property(black, "RGB", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
            rough = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant, -740, 320)
            if "stage7_seoul_asphalt_marking_source" in mat_name or "stage7_textured_asphalt_base" in mat_name:
                rough_value = 0.44
            elif "stage7_seoul_curb_sidewalk_source" in mat_name:
                rough_value = 0.42
            elif "stage7_seoul_signal_vehicle_source" in mat_name:
                rough_value = 0.34
            elif "stage7_seoul_facade_context_source" in mat_name:
                rough_value = 0.34
            elif any(key in mat_name for key in stage7_context_texture_keys):
                rough_value = 0.46
            elif "stage6_seoul_road_atlas" in mat_name:
                rough_value = 0.28
            elif "stage6_seoul_surface_overlays" in mat_name:
                rough_value = 0.40
            elif "stage6_seoul_material_study" in mat_name:
                rough_value = 0.36
            elif "custom_imagegen" in mat_name and ("wet_intersection_atlas" in mat_name or "wet_yellow_box_atlas" in mat_name or "wet_bus_lane_atlas" in mat_name):
                rough_value = 0.34
            elif "target_full_road_atlas" in mat_name:
                rough_value = 0.22
            elif "target_facade_atlas" in mat_name:
                rough_value = 0.42
            elif "puddle" in mat_name:
                rough_value = 0.56
            else:
                rough_value = 0.72
            rough.set_editor_property("r", rough_value)
            unreal.MaterialEditingLibrary.connect_material_property(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)
            spec = unreal.MaterialEditingLibrary.create_material_expression(mat, unreal.MaterialExpressionConstant, -740, 430)
            if "stage7_seoul_asphalt_marking_source" in mat_name or "stage7_textured_asphalt_base" in mat_name:
                spec_value = 0.30
            elif "stage7_seoul" in mat_name:
                spec_value = 0.48
            elif any(key in mat_name for key in stage7_context_texture_keys):
                spec_value = 0.30
            elif "stage6_seoul_road_atlas" in mat_name:
                spec_value = 0.56
            elif "stage6_seoul" in mat_name:
                spec_value = 0.46
            elif "custom_imagegen" in mat_name and ("wet_intersection_atlas" in mat_name or "wet_yellow_box_atlas" in mat_name or "wet_bus_lane_atlas" in mat_name):
                spec_value = 0.48
            elif "target_full_road_atlas" in mat_name:
                spec_value = 0.62
            else:
                spec_value = 0.22
            spec.set_editor_property("r", spec_value)
            unreal.MaterialEditingLibrary.connect_material_property(spec, "", unreal.MaterialProperty.MP_SPECULAR)
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

    def _rotated_cube(self, label: str, loc, scale, material_name: str, rotation=(0, 0, 0)):
        actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.StaticMeshActor,
            unreal.Vector(float(loc[0]), float(loc[1]), float(loc[2])),
            unreal.Rotator(float(rotation[0]), float(rotation[1]), float(rotation[2])),
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

    def _plane_actor(self, label: str, loc, scale, material_name: str, rotation=(0, 0, 0)):
        actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.StaticMeshActor,
            unreal.Vector(float(loc[0]), float(loc[1]), float(loc[2])),
            unreal.Rotator(float(rotation[0]), float(rotation[1]), float(rotation[2])),
        )
        actor.set_actor_label(label)
        actor.set_actor_scale3d(unreal.Vector(float(scale[0]), float(scale[1]), float(scale[2])))
        mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Plane.Plane")
        if mesh is None:
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

    def _cylinder_actor(self, label: str, loc, scale, material_name: str, rotation=(0, 0, 0)):
        actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.StaticMeshActor,
            unreal.Vector(float(loc[0]), float(loc[1]), float(loc[2])),
            unreal.Rotator(float(rotation[0]), float(rotation[1]), float(rotation[2])),
        )
        actor.set_actor_label(label)
        actor.set_actor_scale3d(unreal.Vector(float(scale[0]), float(scale[1]), float(scale[2])))
        mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cylinder.Cylinder")
        comp = actor.get_component_by_class(unreal.StaticMeshComponent)
        if comp and mesh:
            comp.set_static_mesh(mesh)
            mat = self.materials.get(material_name)
            if mat:
                comp.set_material(0, mat)
        return actor

    def _sphere_actor(self, label: str, loc, scale, material_name: str, rotation=(0, 0, 0)):
        actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.StaticMeshActor,
            unreal.Vector(float(loc[0]), float(loc[1]), float(loc[2])),
            unreal.Rotator(float(rotation[0]), float(rotation[1]), float(rotation[2])),
        )
        actor.set_actor_label(label)
        actor.set_actor_scale3d(unreal.Vector(float(scale[0]), float(scale[1]), float(scale[2])))
        mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Sphere.Sphere")
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

    def _city_frontage_module(self, prefix: str, x: float, y: float, z: float, side: str, floors: int = 3, bays: int = 4) -> None:
        frontage_width = max(1.10, bays * 1.15)
        if side == "side":
            wall_scale = (0.20, frontage_width, 1.72 + floors * 0.25)
            band_scale = (0.22, frontage_width + 0.08, 0.080)
            glass_scale = (0.050, 0.18, 0.22)

            def loc(dx, dy, dz):
                return (x + dx, y + dy, z + dz)

        else:
            wall_scale = (frontage_width, 0.20, 1.72 + floors * 0.25)
            band_scale = (frontage_width + 0.08, 0.22, 0.080)
            glass_scale = (0.18, 0.050, 0.22)

            def loc(dx, dy, dz):
                return (x + dx, y + dy - 14, z + dz)

        self._cube(f"{prefix}_brick_mass_3d", (x, y, z), wall_scale, "photoreal_brick")
        self._cube(f"{prefix}_ground_floor_band", loc(0, 0, -180), band_scale, "photoreal_sign_plate")
        self._cube(f"{prefix}_roofline_cornice", loc(0, 0, 250), band_scale, "photoreal_curb")
        for floor in range(floors):
            dz = -40 + floor * 120
            for bay in range(bays):
                offset = (bay - (bays - 1) / 2) * 120
                if side == "side":
                    wx, wy = 0, offset
                    sill_scale = (0.056, 0.22, 0.024)
                else:
                    wx, wy = offset, 0
                    sill_scale = (0.22, 0.056, 0.024)
                mat = "photoreal_warm_window" if (floor + bay) % 4 == 0 else "photoreal_glass"
                self._cube(f"{prefix}_window_recess_{floor}_{bay}", loc(wx, wy, dz), glass_scale, mat)
                self._cube(f"{prefix}_window_sill_{floor}_{bay}", loc(wx, wy, dz - 30), sill_scale, "photoreal_curb")
        for bay in range(max(2, bays - 1)):
            offset = (bay - (max(2, bays - 1) - 1) / 2) * 145
            if side == "side":
                self._cube(f"{prefix}_shopfront_glass_{bay}", loc(0, offset, -275), (0.060, 0.28, 0.34), "photoreal_glass")
                self._cube(f"{prefix}_shop_sign_{bay}", loc(0, offset, -95), (0.064, 0.31, 0.055), "photoreal_sign_plate")
            else:
                self._cube(f"{prefix}_shopfront_glass_{bay}", loc(offset, 0, -275), (0.28, 0.060, 0.34), "photoreal_glass")
                self._cube(f"{prefix}_shop_sign_{bay}", loc(offset, 0, -95), (0.31, 0.064, 0.055), "photoreal_sign_plate")

    def _city_vehicle_proxy(self, prefix: str, x: float, y: float, z: float, material_name: str = "queue_vehicle_body") -> None:
        self._cube(f"{prefix}_body", (x, y, z), (0.86, 0.30, 0.15), material_name)
        self._cube(f"{prefix}_roof_glass", (x + 6, y, z + 13), (0.42, 0.23, 0.08), "queue_vehicle_glass")
        self._cube(f"{prefix}_front_headlight_pair", (x + 43, y, z + 3), (0.030, 0.22, 0.025), "photoreal_sign_plate")
        for idx, wheel_y in enumerate([y - 19, y + 19]):
            self._cube(f"{prefix}_wheel_shadow_{idx}", (x - 24, wheel_y, z - 10), (0.16, 0.035, 0.035), "photoreal_metal")
            self._cube(f"{prefix}_wheel_shadow_{idx + 2}", (x + 26, wheel_y, z - 10), (0.16, 0.035, 0.035), "photoreal_metal")

    def _set_actor_property(self, actor, property_name: str, value) -> None:
        try:
            actor.set_editor_property(property_name, value)
        except Exception:
            pass

    def _spawn_runtime_controller(self) -> None:
        """Add renderer-side simulation snapshot receiver evidence to every generated map."""
        class_path = "/Script/SmartIntersectionRuntime.TrafficSimulationController"
        controller_class = None
        try:
            controller_class = unreal.load_class(None, class_path)
        except Exception as exc:
            print(f"TRAFFIC_SIMULATION_CONTROLLER_CLASS_FALLBACK class={class_path} error={exc}")

        if controller_class is not None:
            actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
                controller_class,
                unreal.Vector(0, 0, 260),
                unreal.Rotator(0, 0, 0),
            )
            actor.set_actor_label(f"TrafficSimulationController_SmartIntersectionRuntime_{self.city}_SUMO_snapshot_receiver")
            self._set_actor_property(actor, "CityProfileId", self.city)
            self._set_actor_property(actor, "ActiveSignalGroup", "unknown")
            self._set_actor_property(actor, "bEnableSnapshotPolling", True)
            self._set_actor_property(
                actor,
                "SnapshotEndpointUrl",
                "http://127.0.0.1:8000/api/renderer/unreal/snapshot",
            )
            self._set_actor_property(actor, "SnapshotPollingIntervalSeconds", 1.0)
            return

        marker = self._cube(
            f"TrafficSimulationController fallback marker SmartIntersectionRuntime {self.city}",
            (0, 0, 260),
            (0.32, 0.32, 0.32),
            "signal",
        )
        self._set_actor_property(marker, "Tags", ["TrafficSimulationController", "SmartIntersectionRuntime"])
        self._road_text(
            f"TrafficSimulationController_fallback_text_SmartIntersectionRuntime_{self.city}",
            "SUMO SNAPSHOT RECEIVER",
            (0, 0, 335),
            34,
            material_name="paint",
        )

    def _tag_renderer_snapshot_actor(self, actor, *extra_tags: str) -> None:
        self._set_actor_property(
            actor,
            "Tags",
            ["RendererSnapshotState", "FastAPI fixture renderer snapshot", *extra_tags],
        )

    def _spawn_renderer_snapshot_visual_layer(self) -> None:
        """Render one API fixture snapshot as signal and queue state, without making UE the truth source."""
        snapshot = DEFAULT_RENDERER_SNAPSHOT_VISUAL
        prefix = f"RendererSnapshotState_{self.city}"
        active_signal_group = str(snapshot["active_signal_group"])
        queues = snapshot["queues"]
        state_surface_z = 540 if self.city == "london" else 118

        phase_marker = self._cube(
            f"{prefix}_active_signal_group_{active_signal_group}",
            (0, -72, state_surface_z + 22),
            (1.35, 0.045, 0.026),
            "green_signal",
        )
        self._tag_renderer_snapshot_actor(phase_marker, "active_signal_group", active_signal_group)

        signal_states = {
            "north": "red",
            "south": "red",
            "east": "green",
            "west": "green",
        }
        signal_locations = {
            "north": (-420, 322, 420),
            "south": (420, -322, 420),
            "east": (620, -170, 420),
            "west": (-620, 170, 420),
        }
        for direction, state in signal_states.items():
            actor = self._cube(
                f"{prefix}_signal_{direction}_{state}_lens",
                signal_locations[direction],
                (0.070, 0.018, 0.070),
                "green_signal" if state == "green" else "red_signal",
            )
            self._tag_renderer_snapshot_actor(actor, "signal_lens", direction, state)

        queue_specs = {
            "north": {
                "origin": (-245, 468, state_surface_z),
                "step": (0, -86, 2),
                "body_scale": (0.40, 0.78, 0.16),
                "glass_scale": (0.27, 0.20, 0.040),
                "glass_offset": (0, -13, 18),
            },
            "south": {
                "origin": (245, -468, state_surface_z),
                "step": (0, 86, 2),
                "body_scale": (0.40, 0.78, 0.16),
                "glass_scale": (0.27, 0.20, 0.040),
                "glass_offset": (0, 13, 18),
            },
            "east": {
                "origin": (650, -155, state_surface_z),
                "step": (-92, 0, 2),
                "body_scale": (0.88, 0.40, 0.16),
                "glass_scale": (0.25, 0.24, 0.040),
                "glass_offset": (-17, 0, 18),
            },
            "west": {
                "origin": (-650, 155, state_surface_z),
                "step": (92, 0, 2),
                "body_scale": (0.88, 0.40, 0.16),
                "glass_scale": (0.25, 0.24, 0.040),
                "glass_offset": (17, 0, 18),
            },
        }
        for direction, count in queues.items():
            marker_count = min(4, max(1, (int(count) + 7) // 8)) if int(count) > 0 else 0
            spec = queue_specs[direction]
            for idx in range(marker_count):
                origin = spec["origin"]
                step = spec["step"]
                body_loc = (
                    origin[0] + step[0] * idx,
                    origin[1] + step[1] * idx,
                    origin[2] + step[2] * idx,
                )
                body = self._cube(
                    f"{prefix}_queue_{direction}_count_{count}_queue_vehicle_marker_{idx}",
                    body_loc,
                    spec["body_scale"],
                    "queue_vehicle_body",
                )
                self._tag_renderer_snapshot_actor(body, "queue_vehicle_marker", direction, str(count))
                glass_offset = spec["glass_offset"]
                glass = self._cube(
                    f"{prefix}_queue_{direction}_count_{count}_queue_vehicle_glass_{idx}",
                    (
                        body_loc[0] + glass_offset[0],
                        body_loc[1] + glass_offset[1],
                        body_loc[2] + glass_offset[2],
                    ),
                    spec["glass_scale"],
                    "queue_vehicle_glass",
                )
                self._tag_renderer_snapshot_actor(glass, "queue_vehicle_marker", direction, "glass")

        pedestrian_state = "active" if snapshot.get("pedestrian_request") else "inactive"
        pedestrian = self._cube(
            f"{prefix}_pedestrian_request_{pedestrian_state}",
            (-170, -318, state_surface_z + 30),
            (0.80, 0.135, 0.026),
            "green_signal" if pedestrian_state == "active" else "red_signal",
        )
        self._tag_renderer_snapshot_actor(pedestrian, "pedestrian_request", pedestrian_state)

        emergency_direction = str(snapshot["emergency_vehicle_direction"])
        emergency = self._cube(
            f"{prefix}_emergency_vehicle_direction_{emergency_direction}_beacon",
            (430, -155, state_surface_z + 35),
            (0.42, 0.105, 0.045),
            "emergency_vehicle_blue",
        )
        self._tag_renderer_snapshot_actor(emergency, "emergency_vehicle_direction", emergency_direction)

        stream_status = str(snapshot["pixel_stream_status"])
        stream = self._cube(
            f"{prefix}_pixel_stream_status_{stream_status}_beacon",
            (-780, -520, state_surface_z + 52),
            (0.30, 0.055, 0.055),
            "green_signal" if stream_status == "ready" else "red_signal",
        )
        self._tag_renderer_snapshot_actor(stream, "pixel_stream_status", stream_status)

    def _spawn_operator_stage1_lane_dashes(self) -> None:
        for y in [-640, -320, 320, 640]:
            for idx, x in enumerate(range(-2600, 2800, 360)):
                self._cube(f"OperatorStage1_lane_dash_east_west_{y}_{idx}", (x, y, 25), (0.72, 0.030, 0.010), "operator_marking_white")
        for x in [-640, -320, 320, 640]:
            for idx, y in enumerate(range(-2600, 2800, 360)):
                self._cube(f"OperatorStage1_lane_dash_north_south_{x}_{idx}", (x, y, 26), (0.030, 0.72, 0.010), "operator_marking_white")
        self._cube("OperatorStage1_major_double_yellow_east_west_a", (0, -55, 29), (56.0, 0.030, 0.012), "operator_marking_yellow")
        self._cube("OperatorStage1_major_double_yellow_east_west_b", (0, 55, 30), (56.0, 0.030, 0.012), "operator_marking_yellow")
        self._cube("OperatorStage1_major_double_yellow_north_south_a", (-55, 0, 31), (0.030, 56.0, 0.012), "operator_marking_yellow")
        self._cube("OperatorStage1_major_double_yellow_north_south_b", (55, 0, 32), (0.030, 56.0, 0.012), "operator_marking_yellow")

    def _spawn_operator_stage1_crosswalk(self, label: str, loc, orientation: str) -> None:
        base_x, base_y, base_z = loc
        for idx in range(-8, 9):
            if orientation == "east_west":
                self._cube(f"OperatorStage1_{label}_crosswalk_bar_{idx}", (base_x + idx * 82, base_y, base_z), (0.28, 1.45, 0.012), "operator_marking_white")
            else:
                self._cube(f"OperatorStage1_{label}_crosswalk_bar_{idx}", (base_x, base_y + idx * 82, base_z), (1.45, 0.28, 0.012), "operator_marking_white")

    def _spawn_operator_stage1_arrow(self, label: str, loc, direction: str) -> None:
        x, y, z = loc
        if direction in {"north", "south"}:
            sign = 1 if direction == "north" else -1
            self._cube(f"OperatorStage1_{label}_arrow_shaft", (x, y, z), (0.055, 0.78, 0.012), "operator_marking_white")
            self._rotated_cube(f"OperatorStage1_{label}_arrow_head_left", (x - 34, y + sign * 58, z + 1), (0.045, 0.42, 0.012), "operator_marking_white", rotation=(0, 0, 35 * sign))
            self._rotated_cube(f"OperatorStage1_{label}_arrow_head_right", (x + 34, y + sign * 58, z + 2), (0.045, 0.42, 0.012), "operator_marking_white", rotation=(0, 0, -35 * sign))
        else:
            sign = 1 if direction == "east" else -1
            self._cube(f"OperatorStage1_{label}_arrow_shaft", (x, y, z), (0.78, 0.055, 0.012), "operator_marking_white")
            self._rotated_cube(f"OperatorStage1_{label}_arrow_head_left", (x + sign * 58, y - 34, z + 1), (0.42, 0.045, 0.012), "operator_marking_white", rotation=(0, 0, -35 * sign))
            self._rotated_cube(f"OperatorStage1_{label}_arrow_head_right", (x + sign * 58, y + 34, z + 2), (0.42, 0.045, 0.012), "operator_marking_white", rotation=(0, 0, 35 * sign))

    def _spawn_operator_stage1_signal_set(self) -> None:
        signal_specs = [
            ("northwest", -1080, 1080, 1),
            ("northeast", 1080, 1080, -1),
            ("southwest", -1080, -1080, 1),
            ("southeast", 1080, -1080, -1),
        ]
        for label, x, y, arm_sign in signal_specs:
            self._cube(f"OperatorStage1_signal_pole_{label}", (x, y, 210), (0.060, 0.060, 2.10), "operator_signal_metal")
            self._cube(f"OperatorStage1_signal_mast_arm_{label}", (x + arm_sign * 260, y, 405), (2.65, 0.035, 0.045), "operator_signal_metal")
            for idx, offset in enumerate([120, 260, 400]):
                self._cube(f"OperatorStage1_signal_head_{label}_{idx}", (x + arm_sign * offset, y, 365), (0.16, 0.060, 0.30), "signal")
                self._cube(f"OperatorStage1_signal_lens_red_{label}_{idx}", (x + arm_sign * offset, y - 4, 405), (0.055, 0.012, 0.055), "red_signal")
                self._cube(f"OperatorStage1_signal_lens_green_{label}_{idx}", (x + arm_sign * offset, y - 4, 330), (0.055, 0.012, 0.055), "green_signal")
        self._cube("OperatorStage1_CCTV_pole_operator_view", (-1420, -1260, 295), (0.065, 0.065, 2.95), "metal")
        self._cube("OperatorStage1_CCTV_camera_operator_view", (-1360, -1200, 570), (0.30, 0.10, 0.095), "metal")

    def _spawn_operator_stage1_queue(self) -> None:
        """Place 40 SUMO-placeholder vehicle actors with stable lane alignment."""
        specs = {
            "north": {"lane_x": [-520, -200, 200, 520], "start_y": 1480, "step": -360, "scale": (0.34, 0.74, 0.15), "glass": (0.22, 0.22, 0.050)},
            "south": {"lane_x": [-520, -200, 200, 520], "start_y": -1480, "step": 360, "scale": (0.34, 0.74, 0.15), "glass": (0.22, 0.22, 0.050)},
            "east": {"lane_y": [-520, -200, 200, 520], "start_x": 1480, "step": -360, "scale": (0.74, 0.34, 0.15), "glass": (0.22, 0.22, 0.050)},
            "west": {"lane_y": [-520, -200, 200, 520], "start_x": -1480, "step": 360, "scale": (0.74, 0.34, 0.15), "glass": (0.22, 0.22, 0.050)},
        }
        for direction, spec in specs.items():
            for idx in range(10):
                lane_index = idx % 4
                queue_index = idx // 4
                if direction in {"north", "south"}:
                    x = spec["lane_x"][lane_index]
                    y = spec["start_y"] + spec["step"] * queue_index
                else:
                    x = spec["start_x"] + spec["step"] * queue_index
                    y = spec["lane_y"][lane_index]
                z = 68 + idx * 0.25
                body = self._cube(
                    f"OperatorStage1_SUMOPlaceholderVehicleQueue_{direction}_{idx:02d}_QueueCapacity_40_body",
                    (x, y, z),
                    spec["scale"],
                "operator_vehicle_body",
                )
                self._set_actor_property(body, "Tags", ["OperatorStage1", "SUMOPlaceholderVehicleQueue", direction, "QueueCapacity_40"])
                self._cube(
                    f"OperatorStage1_SUMOPlaceholderVehicleQueue_{direction}_{idx:02d}_QueueCapacity_40_glass",
                    (x, y, z + 20),
                    spec["glass"],
                    "operator_vehicle_glass",
                )

    def _build_operator_stage1_context(self) -> None:
        for idx, (x, y, sx, sy, floors) in enumerate([
            (-2100, 1850, 5.8, 1.8, 3),
            (-1180, 2260, 4.2, 1.4, 2),
            (1980, 1840, 5.2, 1.7, 3),
            (2260, -1680, 3.8, 1.5, 2),
            (-2180, -1750, 4.6, 1.6, 2),
        ]):
            self._cube(f"OperatorStage1_context_low_rise_geometry_{idx}", (x, y, 245 + floors * 55), (sx, sy, 2.4 + floors * 0.55), "curb")
            self._cube(f"OperatorStage1_context_window_band_{idx}", (x, y - 4, 390 + floors * 55), (sx * 0.82, 0.030, 0.16), "photoreal_glass")
        for idx, (x, y) in enumerate([(-1740, -980), (-1540, 1020), (1650, -1040), (1740, 920)]):
            self._cube(f"OperatorStage1_traffic_cabinet_{idx}", (x, y, 96), (0.34, 0.22, 0.54), "metal")
        for idx, (x, y) in enumerate([(-1850, -1180), (-1820, 1180), (1850, -1180), (1820, 1180), (-430, 1900), (430, -1900)]):
            self._cube(f"OperatorStage1_street_light_pole_{idx}", (x, y, 245), (0.045, 0.045, 2.45), "metal")
            self._cube(f"OperatorStage1_street_light_head_{idx}", (x + 70, y, 475), (0.28, 0.055, 0.050), "photoreal_sign_plate")

    def _build_operator_stage1_scene(self) -> None:
        # Image Gen is reference only: layout grammar came from the saved bitmap,
        # while this traffic-reading zone is built from Unreal geometry actors.
        self._cube("OperatorStage1_context_ground_slab", (0, 0, -52), (72.0, 72.0, 0.050), "operator_context_ground")
        self._cube("OperatorStage1_SUMOReadyLargeIntersection_major_arterial_asphalt", (0, 0, 0), (58.0, 9.2, 0.055), "operator_asphalt")
        self._cube("OperatorStage1_SUMOReadyLargeIntersection_cross_arterial_asphalt", (0, 0, 2), (9.2, 58.0, 0.055), "operator_asphalt")
        self._cube("OperatorStage1_SUMOReadyLargeIntersection_center_wear_patch", (0, 0, 12), (10.4, 10.4, 0.018), "operator_asphalt_patch")
        self._cube("TrafficReadableQueueZone_OperatorStage1_north_boundary", (0, 1840, 38), (10.6, 0.060, 0.035), "operator_marking_yellow")
        self._cube("TrafficReadableQueueZone_OperatorStage1_south_boundary", (0, -1840, 38), (10.6, 0.060, 0.035), "operator_marking_yellow")
        self._cube("TrafficReadableQueueZone_OperatorStage1_east_boundary", (1840, 0, 39), (0.060, 10.6, 0.035), "operator_marking_yellow")
        self._cube("TrafficReadableQueueZone_OperatorStage1_west_boundary", (-1840, 0, 39), (0.060, 10.6, 0.035), "operator_marking_yellow")

        for y in [-1040, 1040]:
            self._cube(f"OperatorStage1_stop_bar_east_west_{y}", (0, y, 42), (9.6, 0.080, 0.012), "operator_marking_white")
        for x in [-1040, 1040]:
            self._cube(f"OperatorStage1_stop_bar_north_south_{x}", (x, 0, 43), (0.080, 9.6, 0.012), "operator_marking_white")
        self._spawn_operator_stage1_crosswalk("north", (0, 1220, 48), "east_west")
        self._spawn_operator_stage1_crosswalk("south", (0, -1220, 49), "east_west")
        self._spawn_operator_stage1_crosswalk("east", (1220, 0, 50), "north_south")
        self._spawn_operator_stage1_crosswalk("west", (-1220, 0, 51), "north_south")
        self._spawn_operator_stage1_lane_dashes()

        for idx, x in enumerate([-520, -200, 200, 520]):
            self._spawn_operator_stage1_arrow(f"southbound_lane_{idx}", (x, -720, 60 + idx), "north")
            self._spawn_operator_stage1_arrow(f"northbound_lane_{idx}", (x, 720, 64 + idx), "south")
        for idx, y in enumerate([-520, -200, 200, 520]):
            self._spawn_operator_stage1_arrow(f"westbound_lane_{idx}", (-720, y, 68 + idx), "east")
            self._spawn_operator_stage1_arrow(f"eastbound_lane_{idx}", (720, y, 72 + idx), "west")

        for label, x, y, sx, sy in [
            ("north_approach", 0, 2220, 0.24, 14.6),
            ("south_approach", 0, -2220, 0.24, 14.6),
            ("east_approach", 2220, 0, 14.6, 0.24),
            ("west_approach", -2220, 0, 14.6, 0.24),
        ]:
            self._cube(
                f"OperatorStage1_median_bus_island_{label}",
                (x, y, 62),
                (sx, sy, 0.055),
                "operator_median_concrete",
            )
        self._cube("OperatorStage1_median_center_splitter_marker", (0, 0, 59), (0.32, 0.32, 0.040), "operator_median_concrete")
        self._cube("OperatorStage1_sidewalk_north", (0, 3300, 34), (64.0, 4.0, 0.12), "operator_sidewalk")
        self._cube("OperatorStage1_sidewalk_south", (0, -3300, 34), (64.0, 4.0, 0.12), "operator_sidewalk")
        self._cube("OperatorStage1_sidewalk_east", (3300, 0, 35), (4.0, 64.0, 0.12), "operator_sidewalk")
        self._cube("OperatorStage1_sidewalk_west", (-3300, 0, 35), (4.0, 64.0, 0.12), "operator_sidewalk")

        self._spawn_operator_stage1_queue()
        self._spawn_operator_stage1_signal_set()
        self._build_operator_stage1_context()

        light = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(-1800, -2200, 3000), unreal.Rotator(-52, -35, 0))
        light.set_actor_label("OperatorStage1_daylight_controlled_exposure")
        light_comp = light.get_component_by_class(unreal.DirectionalLightComponent)
        if light_comp:
            light_comp.set_editor_property("intensity", 4.4)
            try:
                light_comp.set_editor_property("cast_shadows", False)
                light_comp.set_editor_property("light_source_angle", 5.0)
            except Exception:
                pass
            light_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
        sky = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 900), unreal.Rotator(0, 0, 0))
        sky.set_actor_label("OperatorStage1_movable_skylight")
        sky_comp = sky.get_component_by_class(unreal.SkyLightComponent)
        if sky_comp:
            sky_comp.set_editor_property("intensity", 3.8)
            sky_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
        camera = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.CineCameraActor, unreal.Vector(-2600, -4200, 2600), unreal.Rotator(0, -34, 58))
        camera.set_actor_label("OperatorStage1_CineCamera_operator_proof")
        unreal.EditorLevelLibrary.set_level_viewport_camera_info(camera.get_actor_location(), camera.get_actor_rotation())
        self._spawn_runtime_controller()

    def _tag_operator_stage2_context(self, actor, *extra_tags: str) -> None:
        self._set_actor_property(
            actor,
            "Tags",
            ["OperatorStage2", "Stage2ContextGeometry", "NoTrafficZoneBackplate", *extra_tags],
        )

    def _spawn_operator_stage2_facade_blocks(self) -> None:
        for label, x, y, sx, sy, height, material in OPERATOR_STAGE2_FACADE_BLOCKS:
            self._tag_operator_stage2_context(
                self._cube(
                    f"OperatorStage2_Stage2ContextGeometry_facade_{label}",
                    (x, y, height / 2),
                    (sx / 100.0, sy / 100.0, height / 100.0),
                    material,
                ),
                "facade",
            )
            for floor, z_factor in enumerate([0.42, 0.62, 0.82]):
                self._tag_operator_stage2_context(
                    self._cube(
                        f"OperatorStage2_Stage2ContextGeometry_window_band_{label}_{floor}",
                        (x, y - 8, height * z_factor),
                        (sx * 0.0075, 0.035, 0.16),
                        "operator_context_window_dark",
                    ),
                    "facade_window",
                )
            self._tag_operator_stage2_context(
                self._cube(
                    f"OperatorStage2_Stage2ContextGeometry_roofline_{label}",
                    (x, y, height + 16),
                    (sx / 98.0, sy / 98.0, 0.070),
                    "operator_context_curb",
                ),
                "facade_roofline",
            )

    def _spawn_operator_stage2_curbs_guardrails(self) -> None:
        curb_specs = [
            ("north_inner", 0, 1960, 42, 38.0, 0.10, 0.10),
            ("south_inner", 0, -1960, 42, 38.0, 0.10, 0.10),
            ("east_inner", 1960, 0, 43, 0.10, 38.0, 0.10),
            ("west_inner", -1960, 0, 43, 0.10, 38.0, 0.10),
        ]
        for label, x, y, z, sx, sy, sz in curb_specs:
            self._tag_operator_stage2_context(
                self._cube(f"OperatorStage2_Stage2ContextGeometry_curb_{label}", (x, y, z), (sx, sy, sz), "operator_context_curb"),
                "curb",
            )

        guardrails = [
            ("northwest", -1420, 2140, 120, 5.0, 0.045, 0.28),
            ("northeast", 1420, 2140, 120, 5.0, 0.045, 0.28),
            ("southwest", -1420, -2140, 120, 5.0, 0.045, 0.28),
            ("southeast", 1420, -2140, 120, 5.0, 0.045, 0.28),
        ]
        for label, x, y, z, sx, sy, sz in guardrails:
            self._tag_operator_stage2_context(
                self._cube(f"OperatorStage2_Stage2ContextGeometry_guardrail_{label}", (x, y, z), (sx, sy, sz), "operator_context_guardrail"),
                "guardrail",
            )

        for label, x, y, sx, sy in [
            ("north_context_walk", 0, 2820, 42.0, 2.80),
            ("south_context_walk", 0, -2820, 42.0, 2.80),
            ("east_context_walk", 2820, 0, 2.80, 42.0),
            ("west_context_walk", -2820, 0, 2.80, 42.0),
        ]:
            self._tag_operator_stage2_context(
                self._cube(f"OperatorStage2_Stage2ContextGeometry_sidewalk_{label}", (x, y, 36), (sx, sy, 0.075), "operator_context_concrete"),
                "sidewalk",
            )

    def _spawn_operator_stage2_street_furniture(self) -> None:
        for label, x, y, kind in OPERATOR_STAGE2_STREET_FURNITURE:
            if kind == "traffic_cabinet":
                self._tag_operator_stage2_context(
                    self._cube(f"OperatorStage2_Stage2ContextGeometry_traffic_cabinet_{label}", (x, y, 92), (0.42, 0.26, 0.58), "operator_context_traffic_cabinet"),
                    "traffic_cabinet",
                )
            elif kind == "cctv":
                self._tag_operator_stage2_context(
                    self._cube(f"OperatorStage2_Stage2ContextGeometry_cctv_pole_{label}", (x, y, 300), (0.055, 0.055, 3.00), "operator_context_streetlight"),
                    "cctv",
                )
                self._tag_operator_stage2_context(
                    self._cube(f"OperatorStage2_Stage2ContextGeometry_cctv_head_{label}", (x - 70, y + 45, 585), (0.30, 0.10, 0.10), "operator_context_streetlight"),
                    "cctv",
                )
            elif kind == "streetlight":
                self._tag_operator_stage2_context(
                    self._cube(f"OperatorStage2_Stage2ContextGeometry_streetlight_pole_{label}", (x, y, 285), (0.050, 0.050, 2.85), "operator_context_streetlight"),
                    "streetlight",
                )
                self._tag_operator_stage2_context(
                    self._cube(f"OperatorStage2_Stage2ContextGeometry_streetlight_head_{label}", (x + 70, y, 540), (0.34, 0.060, 0.055), "operator_context_streetlight"),
                    "streetlight",
                )
            elif kind in {"sign_blue", "sign_green"}:
                material = "operator_context_sign_blue" if kind == "sign_blue" else "operator_context_sign_green"
                self._tag_operator_stage2_context(
                    self._cube(f"OperatorStage2_Stage2ContextGeometry_sign_pole_{label}", (x, y, 185), (0.040, 0.040, 1.85), "operator_context_streetlight"),
                    "road_sign",
                )
                self._tag_operator_stage2_context(
                    self._cube(f"OperatorStage2_Stage2ContextGeometry_sign_plate_{label}", (x, y, 335), (0.50, 0.045, 0.26), material),
                    "road_sign",
                )

    def _load_operator_stage3_asset_kits(self) -> dict:
        path = self.project_root / "SceneProfiles" / "operator_stage3_asset_kits.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("schema") != OPERATOR_STAGE3_ASSET_KIT_SCHEMA:
            raise RuntimeError(f"Unexpected Stage 3 asset-kit schema: {data.get('schema')}")
        cities = data.get("cities", {})
        missing_cities = [city for city in OPERATOR_STAGE3_CITY_KEYS if city not in cities]
        if missing_cities:
            raise RuntimeError(f"Stage 3 asset-kit profile missing cities: {missing_cities}")
        lane_fit = data.get("lane_fit_cm", {})
        missing_dimensions = [variant for variant in OPERATOR_STAGE3_REQUIRED_VARIANTS if variant not in lane_fit]
        if missing_dimensions:
            raise RuntimeError(f"Stage 3 asset-kit profile missing lane-fit dimensions: {missing_dimensions}")
        for city, kit in cities.items():
            variants = kit.get("variants", [])
            missing_variants = [variant for variant in OPERATOR_STAGE3_REQUIRED_VARIANTS if variant not in variants]
            if missing_variants:
                raise RuntimeError(f"Stage 3 asset-kit profile {city} missing variants: {missing_variants}")
        return data

    def _load_operator_stage6_profile(self) -> dict:
        path = self.project_root / "SceneProfiles" / "operator_stage6_photoreal_profile.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("schema") != OPERATOR_STAGE6_PROFILE_SCHEMA:
            raise RuntimeError(f"Unexpected Stage 6 profile schema: {data.get('schema')}")
        if data.get("city") != "seoul":
            raise RuntimeError(f"Stage 6 profile must target seoul: {data.get('city')}")
        texture_materials = {item.get("material") for item in data.get("source_textures", []) if isinstance(item, dict)}
        missing_materials = [
            material
            for material in (
                "stage6_seoul_photoreal_target",
                "stage6_seoul_material_study",
                "stage6_seoul_road_atlas",
                "stage6_seoul_surface_overlays",
            )
            if material not in texture_materials
        ]
        if missing_materials:
            raise RuntimeError(f"Stage 6 profile missing source texture material evidence: {missing_materials}")
        return data

    def _load_operator_stage7_profile(self) -> dict:
        path = self.project_root / "SceneProfiles" / "operator_stage7_production_photoreal_profile.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("schema") != OPERATOR_STAGE7_PROFILE_SCHEMA:
            raise RuntimeError(f"Unexpected Stage 7 profile schema: {data.get('schema')}")
        if data.get("city") != "seoul":
            raise RuntimeError(f"Stage 7 profile must target seoul: {data.get('city')}")
        sources = data.get("imagegen_sources", [])
        if len(sources) < 4:
            raise RuntimeError("Stage 7 profile must record target plus three source plates")
        for source in sources:
            if not isinstance(source, dict):
                raise RuntimeError("Stage 7 imagegen_sources entries must be objects")
            missing_fields = [
                field
                for field in ("prompt", "original_imagegen_path", "artifact_path", "source_texture_path", "license", "consumer")
                if not source.get(field)
            ]
            if missing_fields:
                raise RuntimeError(f"Stage 7 image source missing fields: {source.get('id')} fields={missing_fields}")
        texture_materials = {
            item.get("material")
            for item in data.get("source_textures", [])
            if isinstance(item, dict) and item.get("consuming_actors")
        }
        missing_materials = [
            material
            for material in (
                "stage7_seoul_asphalt_marking_source",
                "stage7_seoul_curb_sidewalk_source",
                "stage7_seoul_signal_vehicle_source",
            )
            if material not in texture_materials
        ]
        if missing_materials:
            raise RuntimeError(f"Stage 7 profile missing source texture consumers: {missing_materials}")
        return data

    def _tag_operator_stage3_asset(self, actor, city: str, kit: str, *extra_tags: str) -> None:
        self._set_actor_property(
            actor,
            "Tags",
            ["OperatorStage3", "Stage3CityAssetKit", kit, "SUMOReadyAssetPivot", city, *extra_tags],
        )

    def _spawn_operator_stage3_vehicle(self, city: str, direction: str, variant: str, slot: int, x: float, y: float, yaw: float) -> None:
        dimensions = {
            "passenger_car": (4.30, 1.85, 1.45),
            "taxi": (4.55, 1.88, 1.50),
            "bus": (11.80, 2.55, 3.20),
            "emergency_vehicle": (5.20, 2.05, 2.30),
        }[variant]
        material = {
            "passenger_car": "operator_stage3_vehicle_dark",
            "taxi": "operator_stage3_vehicle_taxi_yellow",
            "bus": "operator_stage3_vehicle_bus_green" if city == "seoul" else "operator_stage3_vehicle_bus_red",
            "emergency_vehicle": "operator_stage3_vehicle_emergency_blue",
        }[variant]
        label = f"OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_{city}_{direction}_{variant}_{slot:02d}"
        body = self._rotated_cube(
            label,
            (x, y, 86),
            (dimensions[0] / 2.0, dimensions[1] / 2.0, dimensions[2] / 2.0),
            material,
            rotation=(0, 0, yaw),
        )
        glass = self._rotated_cube(
            f"{label}_glass",
            (x, y, 178),
            (dimensions[0] * 0.24, dimensions[1] * 0.38, 0.28),
            "operator_stage3_vehicle_glass",
            rotation=(0, 0, yaw),
        )
        for actor in (body, glass):
            self._tag_operator_stage3_asset(actor, city, "Stage3VehicleKit", direction, variant)
        if variant == "taxi":
            roof_light = self._rotated_cube(
                f"{label}_taxi_roof_light",
                (x, y, 234),
                (0.34, 0.12, 0.055),
                "operator_stage3_vehicle_white",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage3_asset(roof_light, city, "Stage3VehicleKit", direction, variant, "taxi_roof_light")
        if variant == "emergency_vehicle":
            beacon = self._rotated_cube(
                f"{label}_emergency_beacon",
                (x, y, 246),
                (0.52, 0.16, 0.075),
                "operator_stage3_vehicle_emergency_red",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage3_asset(beacon, city, "Stage3VehicleKit", direction, variant, "emergency_beacon")

    def _spawn_operator_stage3_signal_assembly(self, label: str, city: str, x: float, y: float, yaw: float, style: str) -> None:
        metal = "operator_stage3_signal_yellow" if city == "new_york" else "operator_stage3_signal_black"
        pole = self._cube(
            f"OperatorStage3_Stage3SignalKit_SUMOReadyAssetPivot_{label}_pole",
            (x, y, 245),
            (0.060, 0.060, 2.45),
            metal,
        )
        arm = self._rotated_cube(
            f"OperatorStage3_Stage3SignalKit_{label}_mast_arm",
            (x + (230 if yaw == 0 else -230), y, 430),
            (2.35, 0.040, 0.045),
            metal,
            rotation=(0, 0, yaw),
        )
        head_x = x + (430 if yaw == 0 else -430)
        head = self._rotated_cube(
            f"OperatorStage3_Stage3SignalKit_{city}_{style}_{label}_head",
            (head_x, y, 390),
            (0.20, 0.070, 0.34),
            metal,
            rotation=(0, 0, yaw),
        )
        red = self._rotated_cube(
            f"OperatorStage3_Stage3SignalKit_{label}_lens_red",
            (head_x, y - 7, 430),
            (0.058, 0.018, 0.058),
            "operator_stage3_signal_lens_red",
            rotation=(0, 0, yaw),
        )
        green = self._rotated_cube(
            f"OperatorStage3_Stage3SignalKit_{label}_lens_green",
            (head_x, y - 7, 348),
            (0.058, 0.018, 0.058),
            "operator_stage3_signal_lens_green",
            rotation=(0, 0, yaw),
        )
        for actor in (pole, arm, head, red, green):
            self._tag_operator_stage3_asset(actor, city, "Stage3SignalKit", style)

    def _build_operator_stage2_scene(self) -> None:
        self._build_operator_stage1_scene()
        self._spawn_operator_stage2_curbs_guardrails()
        self._spawn_operator_stage2_facade_blocks()
        self._spawn_operator_stage2_street_furniture()

    def _build_operator_stage3_scene(self) -> None:
        self._build_operator_stage2_scene()
        kit_profile = self._load_operator_stage3_asset_kits()
        active_city = OPERATOR_STAGE3_ACTIVE_CITY
        for direction, variant, slot, x, y, yaw in OPERATOR_STAGE3_VEHICLE_SLOTS:
            self._spawn_operator_stage3_vehicle(active_city, direction, variant, slot, x, y, yaw)
        for label, city, x, y, yaw, style in OPERATOR_STAGE3_SIGNAL_ASSEMBLIES:
            self._spawn_operator_stage3_signal_assembly(label, city, x, y, yaw, style)
        self.stage3_asset_kit_profile = kit_profile

    def _tag_operator_stage6_asset(self, actor, *extra_tags: str) -> None:
        self._set_actor_property(
            actor,
            "Tags",
            ["OperatorStage6", "SUMOReadyOperatorMapPhotoreal", "Stage6GeneratedTextureApplied", *extra_tags],
        )

    def _tag_operator_stage7_asset(self, actor, *extra_tags: str) -> None:
        self._set_actor_property(
            actor,
            "Tags",
            [
                "OperatorStage7",
                "SUMOReadyOperatorMapProductionPhotoreal",
                "NoTrafficZoneImageCard",
                *extra_tags,
            ],
        )

    def _stage7_local_point(self, x: float, y: float, z: float, yaw: float, forward_cm: float = 0.0, lateral_cm: float = 0.0):
        radians = math.radians(float(yaw))
        return (
            x + math.cos(radians) * forward_cm - math.sin(radians) * lateral_cm,
            y + math.sin(radians) * forward_cm + math.cos(radians) * lateral_cm,
            z,
        )

    def _spawn_operator_stage7_vehicle_detail_overlays(
        self,
        base_label: str,
        x: float,
        y: float,
        yaw: float,
        variant: str,
        body_scale,
    ) -> None:
        length_cm = body_scale[0] * 100.0
        width_cm = body_scale[1] * 100.0
        is_bus = variant == "bus"
        roof_z = 220 if is_bus else 184
        side_z = 168 if is_bus else 150
        wheel_z = 98 if is_bus else 88
        detail_prefix = f"OperatorStage7_Stage7VehicleLocalYawDetail_{variant}_{base_label}"
        roof_actor = self._rotated_cube(
            f"{detail_prefix}_roof_glass_band",
            self._stage7_local_point(x, y, roof_z, yaw, -length_cm * 0.03, 0),
            (body_scale[0] * (0.34 if is_bus else 0.38), body_scale[1] * 0.54, 0.050),
            "stage7_vehicle_glass",
            rotation=(0, 0, yaw),
        )
        self._tag_operator_stage7_asset(roof_actor, "Stage7VehicleDetail", "Stage7VehicleLocalYawDetail", variant, "roof_glass")
        for side_label, lateral in (("near", -width_cm * 0.54), ("far", width_cm * 0.54)):
            side_actor = self._rotated_cube(
                f"{detail_prefix}_{side_label}_side_window_strip",
                self._stage7_local_point(x, y, side_z, yaw, 0, lateral),
                (body_scale[0] * (0.42 if is_bus else 0.30), 0.020, 0.070),
                "stage7_vehicle_glass",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(side_actor, "Stage7VehicleDetail", "Stage7VehicleLocalYawDetail", variant, "side_glass")
        pane_offsets = (-0.34, -0.18, -0.02, 0.16, 0.32) if is_bus else (-0.18, 0.08)
        for pane_idx, forward_factor in enumerate(pane_offsets):
            for side_label, lateral in (("near", -width_cm * 0.555), ("far", width_cm * 0.555)):
                pane_actor = self._rotated_cube(
                    f"{detail_prefix}_{side_label}_separated_window_pane_{pane_idx}",
                    self._stage7_local_point(x, y, side_z + 2, yaw, length_cm * forward_factor, lateral),
                    (body_scale[0] * (0.055 if is_bus else 0.075), 0.018, 0.078),
                    "stage7_window_glass",
                    rotation=(0, 0, yaw),
                )
                self._tag_operator_stage7_asset(
                    pane_actor,
                    "Stage7VehicleDetail",
                    "Stage7VehicleLocalYawDetail",
                    variant,
                    "separated_window_pane",
                )
        for end_label, forward, material in (
            ("front_bumper", length_cm * 0.505, "stage7_signal_black"),
            ("rear_bumper", -length_cm * 0.505, "stage7_signal_black"),
            ("front_plate", length_cm * 0.512, "stage7_worn_white"),
            ("rear_plate", -length_cm * 0.512, "stage7_worn_white"),
        ):
            end_actor = self._rotated_cube(
                f"{detail_prefix}_{end_label}",
                self._stage7_local_point(x, y, 112 if is_bus else 98, yaw, forward, 0),
                (0.020 if "plate" in end_label else 0.030, body_scale[1] * (0.30 if "plate" in end_label else 0.58), 0.024),
                material,
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(end_actor, "Stage7VehicleDetail", "Stage7VehicleLocalYawDetail", variant, end_label)
        for wheel_idx, forward in enumerate((-length_cm * 0.34, length_cm * 0.34)):
            for side_label, lateral in (("near", -width_cm * 0.50), ("far", width_cm * 0.50)):
                wheel_actor = self._cylinder_actor(
                    f"{detail_prefix}_{side_label}_wheel_{wheel_idx}",
                    self._stage7_local_point(x, y, wheel_z, yaw, forward, lateral),
                    (0.082 if is_bus else 0.066, 0.082 if is_bus else 0.066, 0.026),
                    "stage7_tire_black",
                    rotation=(0, 90, yaw),
                )
                self._tag_operator_stage7_asset(wheel_actor, "Stage7VehicleDetail", "Stage7VehicleLocalYawDetail", variant, "local_wheel")
                arch_actor = self._rotated_cube(
                    f"{detail_prefix}_{side_label}_wheel_arch_shadow_{wheel_idx}",
                    self._stage7_local_point(x, y, wheel_z + 23, yaw, forward, lateral),
                    (0.17 if is_bus else 0.14, 0.020, 0.045),
                    "stage7_contact_shadow",
                    rotation=(0, 0, yaw),
                )
                self._tag_operator_stage7_asset(
                    arch_actor,
                    "Stage7VehicleDetail",
                    "Stage7VehicleLocalYawDetail",
                    variant,
                    "wheel_arch_shadow",
                )
        head_actor = self._rotated_cube(
            f"{detail_prefix}_headlamp_pair",
            self._stage7_local_point(x, y, 126 if is_bus else 112, yaw, length_cm * 0.48, 0),
            (0.026, body_scale[1] * 0.48, 0.024),
            "stage7_headlamp",
            rotation=(0, 0, yaw),
        )
        tail_actor = self._rotated_cube(
            f"{detail_prefix}_tail_lamp_pair",
            self._stage7_local_point(x, y, 123 if is_bus else 108, yaw, -length_cm * 0.48, 0),
            (0.020, body_scale[1] * 0.42, 0.022),
            "red_signal",
            rotation=(0, 0, yaw),
        )
        for actor in (head_actor, tail_actor):
            self._tag_operator_stage7_asset(actor, "Stage7VehicleDetail", "Stage7VehicleLocalYawDetail", variant, "lamp_detail")
        shadow_actor = self._rotated_cube(
            f"{detail_prefix}_grounded_wet_contact_shadow",
            self._stage7_local_point(x, y, 62, yaw, 0, 0),
            (body_scale[0] * 1.04, body_scale[1] * 1.10, 0.010),
            "stage7_contact_shadow",
            rotation=(0, 0, yaw),
        )
        self._tag_operator_stage7_asset(shadow_actor, "Stage7VehicleDetail", "Stage7VehicleLocalYawDetail", variant, "vehicle_contact_shadow")
        if variant == "taxi":
            roof_sign = self._rotated_cube(
                f"{detail_prefix}_muted_taxi_roof_sign",
                self._stage7_local_point(x, y, 225, yaw, -length_cm * 0.02, 0),
                (0.32, 0.10, 0.045),
                "stage7_worn_yellow",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(roof_sign, "Stage7VehicleDetail", "Stage7VehicleLocalYawDetail", variant, "taxi_roof_sign")
        if variant == "emergency_vehicle":
            beacon = self._rotated_cube(
                f"{detail_prefix}_muted_emergency_lightbar",
                self._stage7_local_point(x, y, 234, yaw, -length_cm * 0.04, 0),
                (0.40, 0.13, 0.055),
                "red_signal",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(beacon, "Stage7VehicleDetail", "Stage7VehicleLocalYawDetail", variant, "emergency_lightbar")

    def _build_operator_stage6_surface_materials(self) -> None:
        for label, loc, scale, material, rotation in OPERATOR_STAGE6_SURFACE_PATCHES:
            actor = self._plane_actor(
                f"OperatorStage6_SUMOReadyOperatorMapPhotoreal_Stage6PhotorealSurface_{label}",
                loc,
                scale,
                material,
                rotation=rotation,
            )
            self._tag_operator_stage6_asset(actor, "Stage6PhotorealSurface", "mesh_uv_material", material)
        for label, loc, scale, yaw in OPERATOR_STAGE6_DECAL_PATCHES:
            actor = self._plane_actor(
                f"OperatorStage6_Stage6DecalAtlasApplied_{label}",
                loc,
                scale,
                "stage6_seoul_surface_overlays",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage6_asset(actor, "Stage6DecalAtlasApplied", "surface_overlay_decal")

    def _build_operator_stage6_geometry_details(self) -> None:
        for idx, (x, y) in enumerate([(-1095, 1095), (1095, 1095), (-1095, -1095), (1095, -1095)]):
            curb = self._cube(
                f"OperatorStage6_reality_like_curbs_tactile_corner_{idx}",
                (x, y, 78),
                (1.05, 0.30, 0.070),
                "photoreal_curb",
            )
            tactile = self._cube(
                f"OperatorStage6_reality_like_tactile_paving_corner_{idx}",
                (x - (80 if x > 0 else -80), y, 84),
                (0.46, 0.30, 0.018),
                "tactile",
            )
            for actor in (curb, tactile):
                self._tag_operator_stage6_asset(actor, "reality_like_curbs", "tactile_paving")
        for idx, (x, y) in enumerate([(-780, -330), (780, 330), (-330, 780), (330, -780)]):
            cover = self._cube(
                f"OperatorStage6_reality_like_utility_cover_drain_grime_{idx}",
                (x, y, 58),
                (0.34, 0.24, 0.010),
                "photoreal_metal",
            )
            self._tag_operator_stage6_asset(cover, "utility_cover", "road_furniture")
        for idx, (x, y, yaw) in enumerate([(-1140, 1120, 0), (1140, 1120, 180), (-1140, -1120, 0), (1140, -1120, 180)]):
            hood = self._rotated_cube(
                f"OperatorStage6_reality_like_signal_head_hood_shadow_{idx}",
                (x + (430 if yaw == 0 else -430), y - 11, 390),
                (0.24, 0.022, 0.38),
                "operator_stage3_signal_black",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage6_asset(hood, "reality_like_signals", "Stage3SignalKit")
        for idx, (x, y, sx, sy) in enumerate([
            (-275, 1960, 0.86, 0.20),
            (110, 2580, 1.65, 0.32),
            (275, -1960, 0.86, 0.20),
            (1960, 275, 0.86, 0.20),
            (-1960, -275, 0.86, 0.20),
        ]):
            shadow = self._rotated_cube(
                f"OperatorStage6_reality_like_vehicle_wet_contact_shadow_{idx}",
                (x, y, 57),
                (sx, sy, 0.008),
                "stage6_seoul_surface_overlays",
                rotation=(0, 0, 90 if abs(y) > abs(x) else 0),
            )
            self._tag_operator_stage6_asset(shadow, "reality_like_vehicles", "wet_contact_shadow")

    def _configure_operator_stage6_lighting_camera(self) -> None:
        world = unreal.EditorLevelLibrary.get_editor_world()
        if world is not None:
            for command in ("DisableAllScreenMessages", "r.DefaultFeature.AutoExposure 0", "r.EyeAdaptationQuality 0"):
                try:
                    unreal.SystemLibrary.execute_console_command(world, command)
                except Exception:
                    pass
        sun = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.DirectionalLight,
            unreal.Vector(-2500, -3150, 4200),
            unreal.Rotator(-48, -40, 0),
        )
        sun.set_actor_label("OperatorStage6_late_afternoon_overcast_key_light")
        sun_comp = sun.get_component_by_class(unreal.DirectionalLightComponent)
        if sun_comp:
            sun_comp.set_editor_property("intensity", 1.45)
            self._set_actor_property(sun_comp, "cast_shadows", True)
            self._set_actor_property(sun_comp, "light_source_angle", 7.5)
            try:
                sun_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
            except Exception:
                pass
        sky = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.SkyLight,
            unreal.Vector(0, 0, 1700),
            unreal.Rotator(0, 0, 0),
        )
        sky.set_actor_label("OperatorStage6_soft_overcast_skylight")
        sky_comp = sky.get_component_by_class(unreal.SkyLightComponent)
        if sky_comp:
            sky_comp.set_editor_property("intensity", 1.4)
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
        pp.set_actor_label("OperatorStage6_unbound_postprocess_traffic_camera_tone")
        self._set_actor_property(pp, "b_unbound", True)
        self._set_actor_property(pp, "blend_weight", 1.0)
        try:
            settings = pp.get_editor_property("settings")
            for name, value in (
                ("override_auto_exposure_bias", True),
                ("auto_exposure_bias", -0.10),
                ("override_bloom_intensity", True),
                ("bloom_intensity", 0.06),
                ("override_vignette_intensity", True),
                ("vignette_intensity", 0.04),
                ("override_color_saturation", True),
                ("color_saturation", unreal.Vector4(0.92, 0.94, 0.96, 1.0)),
            ):
                self._set_actor_property(settings, name, value)
            pp.set_editor_property("settings", settings)
        except Exception as exc:
            print(f"OPERATOR_STAGE6_POSTPROCESS_FALLBACK error={exc}")
        camera = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.CineCameraActor,
            unreal.Vector(-2450, -4300, 2650),
            unreal.Rotator(0, -33, 58),
        )
        camera.set_actor_label("OperatorStage6_CineCamera_reality_like_operator_view")
        unreal.EditorLevelLibrary.set_level_viewport_camera_info(camera.get_actor_location(), camera.get_actor_rotation())

    def _build_operator_stage6_scene(self) -> None:
        if self.city != "seoul":
            raise RuntimeError(f"Operator Stage 6 is locked to seoul, got {self.city}")
        self._load_operator_stage6_profile()
        self._build_operator_stage3_scene()
        self._build_operator_stage6_surface_materials()
        self._build_operator_stage6_geometry_details()
        self._spawn_renderer_snapshot_visual_layer()
        marker = self._cube(
            "OperatorStage6_Stage4ReadableRuntimeState_NoImageCardTrafficZone_fixture_state_marker",
            (0, -172, 156),
            (1.20, 0.055, 0.022),
            "green_signal",
        )
        self._tag_operator_stage6_asset(marker, "Stage4ReadableRuntimeState", "NoImageCardTrafficZone")
        self._configure_operator_stage6_lighting_camera()

    def _build_operator_stage7_road_production_layer(self) -> None:
        road_surfaces = [
            (
                "OperatorStage7_Stage7ProductionRoadUV_asphalt_base_east_west",
                (0, 0, 69),
                (61.0, 18.0, 1.0),
                "stage7_textured_asphalt_base",
                0,
            ),
            (
                "OperatorStage7_Stage7ProductionRoadUV_asphalt_base_north_south",
                (0, 0, 72),
                (18.0, 61.0, 1.0),
                "stage7_textured_asphalt_base",
                0,
            ),
            (
                "OperatorStage7_Stage7ProductionRoadUV_asphalt_patch_main",
                (-1040, -260, 82),
                (0.20, 0.035, 1.0),
                "stage7_seoul_asphalt_marking_source",
                -2,
            ),
            (
                "OperatorStage7_Stage7ProductionRoadUV_wet_asphalt_patch_center",
                (420, 180, 81),
                (2.4, 1.15, 1.0),
                "stage7_dark_wet_asphalt",
                0,
            ),
            (
                "OperatorStage7_Stage7ProductionRoadUV_bus_lane_wet_source",
                (0, -1480, 78),
                (9.0, 0.55, 1.0),
                "stage7_dark_wet_asphalt",
                0,
            ),
        ]
        for label, loc, scale, material, yaw in road_surfaces:
            actor = self._rotated_cube(label, loc, (scale[0], scale[1], 0.014), material, rotation=(0, 0, yaw))
            self._tag_operator_stage7_asset(actor, "Stage7ProductionRoadUV", "Stage7IntegratedAsphaltBlend", material)

        integrated_wear = [
            ("source_scuffed_lane_transition_east", (840, -360, 84), (0.24, 0.022, 1.0), "stage7_seoul_asphalt_marking_source", 2),
            ("source_scuffed_lane_transition_west", (-840, 360, 85), (0.22, 0.022, 1.0), "stage7_seoul_asphalt_marking_source", -3),
            ("source_oil_shear_north_queue", (-310, 820, 86), (0.026, 0.24, 1.0), "stage7_seoul_asphalt_marking_source", 5),
            ("source_oil_shear_south_queue", (310, -820, 87), (0.026, 0.24, 1.0), "stage7_seoul_asphalt_marking_source", -5),
            ("subtle_wet_sheen_eastbound", (1040, -160, 88), (1.85, 0.060, 1.0), "stage7_road_micro_highlight", 1),
            ("subtle_wet_sheen_westbound", (-1040, 160, 89), (1.85, 0.060, 1.0), "stage7_road_micro_highlight", -1),
            ("wheel_path_shadow_northbound", (-210, 520, 90), (0.070, 2.0, 1.0), "stage7_contact_shadow", 4),
            ("wheel_path_shadow_southbound", (210, -520, 91), (0.070, 2.0, 1.0), "stage7_contact_shadow", -4),
        ]
        for label, loc, scale, material, yaw in integrated_wear:
            actor = self._rotated_cube(
                f"OperatorStage7_Stage7IntegratedAsphaltBlend_{label}",
                loc,
                (scale[0], scale[1], 0.007),
                material,
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(
                actor,
                "Stage7ProductionRoadUV",
                "Stage7RoadWearDecal",
                "Stage7IntegratedAsphaltBlend",
                material,
            )

        asphalt_breakup = [
            ("camera_near_wet_sheen_left", (-980, -2260, 96), (6.4, 0.050, 0.006), "stage7_road_micro_highlight", -2),
            ("camera_near_wet_sheen_right", (930, -2140, 97), (5.8, 0.045, 0.006), "stage7_road_micro_highlight", 2),
            ("eastbound_lane_grain_a", (1340, -520, 98), (2.6, 0.032, 0.006), "photoreal_grime_overlay", 1),
            ("eastbound_lane_grain_b", (420, -520, 99), (1.7, 0.026, 0.006), "stage7_contact_shadow", -3),
            ("westbound_lane_grain_a", (-1340, 520, 100), (2.4, 0.032, 0.006), "photoreal_grime_overlay", -1),
            ("westbound_lane_grain_b", (-360, 520, 101), (1.8, 0.026, 0.006), "stage7_contact_shadow", 4),
            ("northbound_lane_grain_a", (-520, 1320, 102), (0.032, 2.5, 0.006), "photoreal_grime_overlay", 2),
            ("southbound_lane_grain_a", (520, -1320, 103), (0.032, 2.5, 0.006), "photoreal_grime_overlay", -2),
            ("center_tar_repair_east", (520, 60, 104), (1.35, 0.020, 0.006), "photoreal_crack_overlay", -9),
            ("center_tar_repair_west", (-520, -60, 105), (1.35, 0.020, 0.006), "photoreal_crack_overlay", 8),
            ("stopline_scuff_north", (0, 1160, 106), (8.8, 0.030, 0.006), "stage7_contact_shadow", 0),
            ("stopline_scuff_south", (0, -1160, 107), (8.8, 0.030, 0.006), "stage7_contact_shadow", 0),
        ]
        for label, loc, scale, material, yaw in asphalt_breakup:
            actor = self._rotated_cube(
                f"OperatorStage7_Stage7IntegratedAsphaltBlend_microbreakup_{label}",
                loc,
                scale,
                material,
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(
                actor,
                "Stage7ProductionRoadUV",
                "Stage7RoadWearDecal",
                "Stage7IntegratedAsphaltBlend",
                "camera_distance_material_breakup",
                material,
            )

        for idx, y in enumerate([-520, -250, 250, 520]):
            for dash in range(-5, 6):
                if dash % 2 == 0:
                    actor = self._rotated_cube(
                        f"OperatorStage7_Stage7RoadWearDecal_worn_lane_dash_ew_{idx}_{dash}_stage7_worn_white",
                        (dash * 520, y, 91 + idx),
                        (1.45, 0.055, 0.010),
                        "stage7_worn_white",
                    )
                    self._tag_operator_stage7_asset(actor, "Stage7RoadWearDecal", "lane_marking_readable")
                    for chip_idx, offset in enumerate((-115, 118)):
                        chip = self._rotated_cube(
                            f"OperatorStage7_Stage7RoadWearDecal_lane_dash_ew_chip_{idx}_{dash}_{chip_idx}",
                            (dash * 520 + offset, y + (12 if chip_idx == 0 else -10), 112 + chip_idx),
                            (0.20, 0.020, 0.011),
                            "stage7_contact_shadow",
                            rotation=(0, 0, 1.5 if chip_idx == 0 else -2.5),
                        )
                        self._tag_operator_stage7_asset(chip, "Stage7RoadWearDecal", "lane_marking_wear_breakup")
        for idx, x in enumerate([-520, -250, 250, 520]):
            for dash in range(-5, 6):
                if dash % 2 == 0:
                    actor = self._rotated_cube(
                        f"OperatorStage7_Stage7RoadWearDecal_worn_lane_dash_ns_{idx}_{dash}_stage7_worn_white",
                        (x, dash * 520, 92 + idx),
                        (0.055, 1.45, 0.010),
                        "stage7_worn_white",
                    )
                    self._tag_operator_stage7_asset(actor, "Stage7RoadWearDecal", "lane_marking_readable")
                    for chip_idx, offset in enumerate((-115, 118)):
                        chip = self._rotated_cube(
                            f"OperatorStage7_Stage7RoadWearDecal_lane_dash_ns_chip_{idx}_{dash}_{chip_idx}",
                            (x + (10 if chip_idx == 0 else -12), dash * 520 + offset, 116 + chip_idx),
                            (0.020, 0.20, 0.011),
                            "stage7_contact_shadow",
                            rotation=(0, 0, -1.5 if chip_idx == 0 else 2.5),
                        )
                        self._tag_operator_stage7_asset(chip, "Stage7RoadWearDecal", "lane_marking_wear_breakup")

        stop_bars = [
            ("OperatorStage7_Stage7RoadWearDecal_worn_stop_bar_north", (0, 1210, 98), (15.8, 0.085, 0.012), 0),
            ("OperatorStage7_Stage7RoadWearDecal_worn_stop_bar_south", (0, -1210, 99), (15.8, 0.085, 0.012), 0),
            ("OperatorStage7_Stage7RoadWearDecal_worn_stop_bar_east", (1210, 0, 100), (0.085, 15.8, 0.012), 0),
            ("OperatorStage7_Stage7RoadWearDecal_worn_stop_bar_west", (-1210, 0, 101), (0.085, 15.8, 0.012), 0),
        ]
        for label, loc, scale, yaw in stop_bars:
            actor = self._rotated_cube(label, loc, scale, "stage7_worn_white", rotation=(0, 0, yaw))
            self._tag_operator_stage7_asset(actor, "Stage7RoadWearDecal", "stop_bar_readable")

        for idx, y in enumerate([-1415, 1415]):
            for x in range(-820, 821, 205):
                actor = self._rotated_cube(
                    f"OperatorStage7_Stage7RoadWearDecal_crosswalk_worn_bar_{idx}_{x}",
                    (x, y, 108 + idx),
                    (0.34, 1.35, 0.010),
                    "stage7_worn_white",
                )
                self._tag_operator_stage7_asset(actor, "Stage7RoadWearDecal", "crosswalk_readable")
                if (x // 205) % 2 == 0:
                    chip = self._rotated_cube(
                        f"OperatorStage7_Stage7RoadWearDecal_crosswalk_chip_ns_{idx}_{x}",
                        (x + 36, y, 120 + idx),
                        (0.060, 0.32, 0.011),
                        "stage7_contact_shadow",
                        rotation=(0, 0, 2 if idx == 0 else -2),
                    )
                    self._tag_operator_stage7_asset(chip, "Stage7RoadWearDecal", "crosswalk_wear_breakup")
        for idx, x in enumerate([-1415, 1415]):
            for y in range(-820, 821, 205):
                actor = self._rotated_cube(
                    f"OperatorStage7_Stage7RoadWearDecal_crosswalk_worn_bar_side_{idx}_{y}",
                    (x, y, 109 + idx),
                    (1.35, 0.34, 0.010),
                    "stage7_worn_white",
                )
                self._tag_operator_stage7_asset(actor, "Stage7RoadWearDecal", "crosswalk_readable")
                if (y // 205) % 2 == 0:
                    chip = self._rotated_cube(
                        f"OperatorStage7_Stage7RoadWearDecal_crosswalk_chip_ew_{idx}_{y}",
                        (x, y - 36, 122 + idx),
                        (0.32, 0.060, 0.011),
                        "stage7_contact_shadow",
                        rotation=(0, 0, -2 if idx == 0 else 2),
                    )
                    self._tag_operator_stage7_asset(chip, "Stage7RoadWearDecal", "crosswalk_wear_breakup")

        wear_decals = [
            ("OperatorStage7_Stage7RoadWearDecal_tire_polish_east_queue", (820, -170, 112), (3.4, 0.46, 1.0), "stage7_puddle_reflection", 0),
            ("OperatorStage7_Stage7RoadWearDecal_tire_polish_west_queue", (-820, 170, 113), (3.4, 0.46, 1.0), "stage7_puddle_reflection", 0),
            ("OperatorStage7_Stage7RoadWearDecal_oil_patch_north_queue", (-210, 850, 114), (0.72, 2.15, 1.0), "stage7_contact_shadow", 0),
            ("OperatorStage7_Stage7RoadWearDecal_oil_patch_south_queue", (210, -850, 115), (0.72, 2.15, 1.0), "stage7_contact_shadow", 0),
            ("OperatorStage7_Stage7RoadWearDecal_tar_crack_centerline_a", (-175, 0, 116), (0.055, 7.8, 1.0), "stage7_contact_shadow", 7),
            ("OperatorStage7_Stage7RoadWearDecal_tar_crack_centerline_b", (185, 0, 117), (0.055, 7.6, 1.0), "stage7_contact_shadow", -8),
        ]
        for label, loc, scale, material, yaw in wear_decals:
            actor = self._rotated_cube(label, loc, (scale[0], scale[1], 0.008), material, rotation=(0, 0, yaw))
            self._tag_operator_stage7_asset(actor, "Stage7RoadWearDecal", material)

    def _build_operator_stage7_imagegen_surface_geometry_layer(self) -> None:
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        surface_specs = [
            (
                "asphalt_heightfield_east_west",
                "stage7_seoul_asphalt_imagegen_heightfield",
                (-680, -260, 84),
                (0.14, 0.16, 0.20),
                "stage7_wet_asphalt_patch",
                (0, 0, 0),
                "Stage7ProductionRoadUV",
                "imagegen_luminance_heightfield",
            ),
            (
                "asphalt_heightfield_north_south",
                "stage7_seoul_asphalt_imagegen_heightfield",
                (260, 660, 85),
                (0.13, 0.16, 0.20),
                "stage7_wet_asphalt_patch",
                (0, 0, 90),
                "Stage7ProductionRoadUV",
                "imagegen_luminance_heightfield",
            ),
            (
                "sidewalk_heightfield_south_foreground",
                "stage7_seoul_sidewalk_imagegen_heightfield",
                (0, -3205, 120),
                (0.085, 0.110, 0.18),
                "stage7_seoul_curb_sidewalk_source",
                (0, 0, 0),
                "Stage7CurbSidewalkUV",
                "imagegen_luminance_heightfield",
            ),
            (
                "sidewalk_heightfield_north_foreground",
                "stage7_seoul_sidewalk_imagegen_heightfield",
                (0, 3205, 122),
                (0.085, 0.110, 0.18),
                "stage7_seoul_curb_sidewalk_source",
                (0, 0, 180),
                "Stage7CurbSidewalkUV",
                "imagegen_luminance_heightfield",
            ),
            (
                "sidewalk_heightfield_west_edge",
                "stage7_seoul_sidewalk_imagegen_heightfield",
                (-3205, 0, 124),
                (0.085, 0.110, 0.18),
                "stage7_seoul_curb_sidewalk_source",
                (0, 0, 90),
                "Stage7CurbSidewalkUV",
                "imagegen_luminance_heightfield",
            ),
            (
                "sidewalk_heightfield_east_edge",
                "stage7_seoul_sidewalk_imagegen_heightfield",
                (3205, 0, 126),
                (0.085, 0.110, 0.18),
                "stage7_seoul_curb_sidewalk_source",
                (0, 0, -90),
                "Stage7CurbSidewalkUV",
                "imagegen_luminance_heightfield",
            ),
            (
                "southwest_corner_panel",
                "stage7_seoul_sidewalk_imagegen_heightfield",
                (-2760, -3020, 128),
                (0.040, 0.095, 0.16),
                "stage7_seoul_curb_sidewalk_source",
                (0, 0, 0),
                "Stage7CurbSidewalkUV",
                "Stage7SidewalkCoverageGeometry",
            ),
            (
                "southeast_corner_panel",
                "stage7_seoul_sidewalk_imagegen_heightfield",
                (2760, -3020, 130),
                (0.040, 0.095, 0.16),
                "stage7_seoul_curb_sidewalk_source",
                (0, 0, 0),
                "Stage7CurbSidewalkUV",
                "Stage7SidewalkCoverageGeometry",
            ),
            (
                "northwest_corner_panel",
                "stage7_seoul_sidewalk_imagegen_heightfield",
                (-2760, 3020, 132),
                (0.040, 0.095, 0.16),
                "stage7_seoul_curb_sidewalk_source",
                (0, 0, 180),
                "Stage7CurbSidewalkUV",
                "Stage7SidewalkCoverageGeometry",
            ),
            (
                "northeast_corner_panel",
                "stage7_seoul_sidewalk_imagegen_heightfield",
                (2760, 3020, 134),
                (0.040, 0.095, 0.16),
                "stage7_seoul_curb_sidewalk_source",
                (0, 0, 180),
                "Stage7CurbSidewalkUV",
                "Stage7SidewalkCoverageGeometry",
            ),
        ]
        for label, asset, loc, scale, material, rotation, surface_role, geometry_role in surface_specs:
            actor = self._mesh_actor(
                f"OperatorStage7_Stage7ImageGenSurfaceGeometry_{label}",
                f"{mesh_root}/{asset}",
                loc,
                scale,
                material,
                rotation=rotation,
            )
            if geometry_role == "Stage7SidewalkCoverageGeometry":
                actor.set_actor_label(f"OperatorStage7_Stage7SidewalkCoverageGeometry_{label}")
            self._tag_operator_stage7_asset(
                actor,
                "Stage7ImageGenSurfaceGeometry",
                surface_role,
                geometry_role,
                asset,
                material,
                OPERATOR_STAGE7_SURFACE_MESH_SOURCE_SCRIPT,
            )

    def _build_operator_stage7_curb_sidewalk_layer(self) -> None:
        sidewalk_specs = [
            ("north", (0, 3190, 92), (60.0, 4.1, 0.055), "photoreal_sidewalk"),
            ("south", (0, -3190, 92), (60.0, 4.1, 0.055), "photoreal_sidewalk"),
            ("east", (3190, 0, 92), (4.1, 60.0, 0.055), "photoreal_sidewalk"),
            ("west", (-3190, 0, 92), (4.1, 60.0, 0.055), "photoreal_sidewalk"),
        ]
        for label, loc, scale, material in sidewalk_specs:
            actor = self._cube(f"OperatorStage7_Stage7CurbSidewalkUV_sidewalk_{label}_{material}", loc, scale, material)
            self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", material)

        curb_specs = [
            ("corner_ne", (1400, 1400, 116), (2.25, 0.32, 0.085), 0),
            ("corner_nw", (-1400, 1400, 116), (2.25, 0.32, 0.085), 0),
            ("corner_se", (1400, -1400, 116), (2.25, 0.32, 0.085), 0),
            ("corner_sw", (-1400, -1400, 116), (2.25, 0.32, 0.085), 0),
        ]
        for label, loc, scale, yaw in curb_specs:
            actor = self._rotated_cube(
                f"OperatorStage7_Stage7CurbSidewalkUV_{label}",
                loc,
                scale,
                "photoreal_curb",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "curb_edge")
        for idx, (x, y) in enumerate([(-1265, 1265), (1265, 1265), (-1265, -1265), (1265, -1265)]):
            actor = self._cube(
                f"OperatorStage7_Stage7TactilePavingUV_corner_{['nw', 'ne', 'sw', 'se'][idx]}",
                (x, y, 126),
                (0.74, 0.54, 0.020),
                "stage7_tactile",
            )
            self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "tactile_paving")
        actor = self._cube(
            "OperatorStage7_Stage7DrainUtilityDetail_center_south",
            (360, -1510, 118),
            (0.56, 0.30, 0.016),
            "stage7_seoul_curb_sidewalk_source",
        )
        self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "drain_utility_detail")
        for idx, (x, y) in enumerate([(-610, -980), (520, 910), (920, -430), (-840, 360)]):
            actor = self._cylinder_actor(
                f"OperatorStage7_Stage7DrainUtilityDetail_round_utility_cover_{idx}",
                (x, y, 120 + idx),
                (0.32, 0.32, 0.012),
                "stage7_signal_black",
            )
            self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "utility_cover")
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        for idx, (x, y, yaw) in enumerate([(-1260, 1325, 0), (1260, 1325, 180), (-1260, -1325, 0), (1260, -1325, 180)]):
            actor = self._mesh_actor(
                f"OperatorStage7_Stage7CurbSidewalkUV_tactile_tile_mesh_{idx}",
                f"{mesh_root}/tactile_paving_tile",
                (x, y, 132),
                (0.92, 0.92, 0.08),
                "stage7_tactile",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "tactile_mesh_detail")
        for idx, (x, y, yaw) in enumerate([(380, -1540, 0), (-380, 1540, 180), (1540, 380, 90), (-1540, -380, -90)]):
            actor = self._mesh_actor(
                f"OperatorStage7_Stage7DrainUtilityDetail_drain_grate_mesh_{idx}",
                f"{mesh_root}/drain_grate_rect",
                (x, y, 132),
                (0.000026, 0.000026, 0.000026),
                "stage7_signal_black",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "drain_mesh_detail")

    def _build_operator_stage7_sidewalk_slab_detail(self) -> None:
        for idx, y in enumerate([2960, 3420, -2960, -3420]):
            actor = self._cube(
                f"OperatorStage7_Stage7CurbSidewalkUV_sidewalk_longitudinal_joint_{idx}",
                (0, y, 126 + idx),
                (58.0, 0.018, 0.010),
                "stage7_sidewalk_joint",
            )
            self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "sidewalk_joint")
        for idx, x in enumerate([2960, 3420, -2960, -3420]):
            actor = self._cube(
                f"OperatorStage7_Stage7CurbSidewalkUV_sidewalk_lateral_joint_{idx}",
                (x, 0, 130 + idx),
                (0.018, 58.0, 0.010),
                "stage7_sidewalk_joint",
            )
            self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "sidewalk_joint")
        for idx, (x, y, sx, sy) in enumerate([
            (0, 1848, 54.0, 0.040),
            (0, -1848, 54.0, 0.040),
            (1848, 0, 0.040, 54.0),
            (-1848, 0, 0.040, 54.0),
        ]):
            actor = self._cube(
                f"OperatorStage7_Stage7CurbSidewalkUV_curb_contact_shadow_{idx}",
                (x, y, 133 + idx),
                (sx, sy, 0.010),
                "stage7_contact_shadow",
            )
            self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "Stage7CurbOcclusionGrime", "curb_contact_shadow")
        grime_edges = [
            ("north_inner", (0, 1785, 140), (54.0, 0.065, 0.010), 0),
            ("south_inner", (0, -1785, 141), (54.0, 0.065, 0.010), 0),
            ("east_inner", (1785, 0, 142), (0.065, 54.0, 0.010), 0),
            ("west_inner", (-1785, 0, 143), (0.065, 54.0, 0.010), 0),
            ("north_outer_damp", (0, 3005, 144), (55.5, 0.050, 0.010), 0),
            ("south_outer_damp", (0, -3005, 145), (55.5, 0.050, 0.010), 0),
            ("east_outer_damp", (3005, 0, 146), (0.050, 55.5, 0.010), 0),
            ("west_outer_damp", (-3005, 0, 147), (0.050, 55.5, 0.010), 0),
        ]
        for label, loc, scale, yaw in grime_edges:
            actor = self._rotated_cube(
                f"OperatorStage7_Stage7CurbOcclusionGrime_{label}",
                loc,
                scale,
                "stage7_curb_wet_grime" if "inner" in label else "stage7_sidewalk_damp_edge",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "Stage7CurbOcclusionGrime", "curb_grime")
        for idx, (x, y, sx, sy, material) in enumerate([
            (-2160, -3235, 4.2, 0.42, "stage7_sidewalk_paver"),
            (-1200, -3238, 3.8, 0.38, "photoreal_sidewalk"),
            (-240, -3232, 3.9, 0.40, "stage7_sidewalk_paver"),
            (760, -3237, 4.1, 0.36, "photoreal_sidewalk"),
            (1800, -3234, 4.0, 0.42, "stage7_sidewalk_paver"),
            (-1800, 3234, 4.0, 0.42, "stage7_sidewalk_paver"),
            (-760, 3238, 4.1, 0.36, "photoreal_sidewalk"),
            (240, 3233, 3.9, 0.40, "stage7_sidewalk_paver"),
            (1200, 3236, 3.8, 0.38, "photoreal_sidewalk"),
            (2160, 3235, 4.2, 0.42, "stage7_sidewalk_paver"),
        ]):
            actor = self._rotated_cube(
                f"OperatorStage7_Stage7CurbOcclusionGrime_sidewalk_slab_variation_{idx}",
                (x, y, 148 + idx),
                (sx, sy, 0.012),
                material,
            )
            self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "Stage7CurbOcclusionGrime", "sidewalk_slab_variation")
        for idx, x in enumerate(range(-2700, 2701, 540)):
            for side_label, y, z_base in (("south", -3190, 166), ("north", 3190, 172)):
                seam = self._cube(
                    f"OperatorStage7_Stage7CurbOcclusionGrime_sidewalk_panel_cross_seam_{side_label}_{idx}",
                    (x, y, z_base + idx),
                    (0.016, 3.55, 0.010),
                    "stage7_sidewalk_joint",
                )
                self._tag_operator_stage7_asset(
                    seam,
                    "Stage7CurbSidewalkUV",
                    "Stage7CurbOcclusionGrime",
                    "camera_distance_sidewalk_panel_seam",
                )
        for idx, y in enumerate(range(-2700, 2701, 540)):
            for side_label, x, z_base in (("west", -3190, 182), ("east", 3190, 188)):
                seam = self._cube(
                    f"OperatorStage7_Stage7CurbOcclusionGrime_sidewalk_panel_cross_seam_{side_label}_{idx}",
                    (x, y, z_base + idx),
                    (3.55, 0.016, 0.010),
                    "stage7_sidewalk_joint",
                )
                self._tag_operator_stage7_asset(
                    seam,
                    "Stage7CurbSidewalkUV",
                    "Stage7CurbOcclusionGrime",
                    "camera_distance_sidewalk_panel_seam",
                )
        sidewalk_stains = [
            ("south_near_tire_splash", (-980, -3020, 210), (1.65, 0.090, 0.010), "stage7_sidewalk_damp_edge", -4),
            ("south_near_utility_grime", (780, -2985, 211), (1.25, 0.070, 0.010), "stage7_curb_wet_grime", 6),
            ("north_bus_stop_grime", (-1320, 3020, 212), (1.55, 0.080, 0.010), "stage7_sidewalk_damp_edge", 3),
            ("east_corner_service_patch", (3020, -880, 213), (0.075, 1.25, 0.010), "stage7_curb_wet_grime", -5),
            ("west_corner_service_patch", (-3020, 920, 214), (0.075, 1.25, 0.010), "stage7_sidewalk_damp_edge", 5),
        ]
        for label, loc, scale, material, yaw in sidewalk_stains:
            actor = self._rotated_cube(
                f"OperatorStage7_Stage7CurbOcclusionGrime_sidewalk_camera_stain_{label}",
                loc,
                scale,
                material,
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(
                actor,
                "Stage7CurbSidewalkUV",
                "Stage7CurbOcclusionGrime",
                "sidewalk_camera_distance_stain",
            )

    def _build_operator_stage7_background_fill(self) -> None:
        for idx, (label, loc, scale, material) in enumerate([
            ("Stage7CameraBackgroundClosure_camera_visible_overcast_sky_scrim", (0, 11200, 3600), (190.0, 0.026, 42.0), "stage7_overcast_background"),
            ("Stage7CameraBackgroundClosure_camera_visible_near_sky_fill", (0, 8800, 3150), (150.0, 0.024, 27.0), "stage7_overcast_background"),
            ("Stage7CameraBackgroundClosure_camera_visible_low_horizon_fill", (0, 8200, 1360), (178.0, 0.022, 14.0), "stage7_overcast_background"),
            ("Stage7CameraBackgroundClosure_camera_visible_mist_horizon_band", (0, 9100, 1750), (120.0, 0.024, 4.2), "stage7_overcast_background"),
            ("Stage7CameraBackgroundClosure_north_overcast_context_mist_band", (0, 10600, 980), (92.0, 0.018, 1.2), "stage7_overcast_background"),
            ("Stage7CameraBackgroundClosure_east_overcast_context_wall", (7900, 0, 1260), (0.030, 112.0, 5.8), "stage7_overcast_background"),
            ("Stage7CameraBackgroundClosure_west_overcast_context_wall", (-7900, 0, 1260), (0.030, 112.0, 5.8), "stage7_overcast_background"),
            ("Stage7CameraBackgroundClosure_distant_ground_context_fill", (0, 0, -92), (112.0, 112.0, 0.020), "stage7_pavement_fill"),
            ("Stage7CameraBackgroundClosure_far_ground_city_plane", (0, 8800, 44), (130.0, 46.0, 0.020), "stage7_pavement_fill"),
        ]):
            actor = self._cube(
                f"OperatorStage7_Stage7LightingCameraPostProcess_{label}_{idx}",
                loc,
                scale,
                material,
            )
            self._tag_operator_stage7_asset(
                actor,
                "Stage7LightingCameraPostProcess",
                "Stage7CameraBackgroundClosure",
                "Stage7BoundaryOcclusion",
                "overcast_background_fill",
            )
        for idx, (label, loc, scale, material) in enumerate([
            ("camera_near_lower_shadow_wedge", (-1600, -4560, 95), (16.0, 0.035, 0.52), "stage7_curb_wet_grime"),
            ("camera_near_left_context_occluder", (-7600, -760, 620), (0.045, 52.0, 3.8), "stage7_facade_soft"),
            ("camera_near_right_context_occluder", (7600, 680, 620), (0.045, 52.0, 3.8), "stage7_facade_soft"),
            ("south_frame_ground_fill", (0, -6600, 35), (120.0, 0.040, 0.42), "stage7_sidewalk_damp_edge"),
            ("east_frame_ground_fill", (6600, 0, 35), (0.040, 120.0, 0.42), "stage7_sidewalk_damp_edge"),
            ("west_frame_ground_fill", (-6600, 0, 35), (0.040, 120.0, 0.42), "stage7_sidewalk_damp_edge"),
        ]):
            actor = self._cube(
                f"OperatorStage7_Stage7BoundaryOcclusion_{label}_{idx}",
                loc,
                scale,
                material,
            )
            self._tag_operator_stage7_asset(
                actor,
                "Stage7LightingCameraPostProcess",
                "Stage7CameraBackgroundClosure",
                "Stage7BoundaryOcclusion",
                "boundary_fill",
            )
        for idx, x in enumerate(range(-4300, 4301, 780)):
            height = 2.4 + (idx % 3) * 0.42
            actor = self._cube(
                f"OperatorStage7_Stage7CameraBackgroundClosure_distant_facade_mass_{idx}",
                (x, 5320, 540 + height * 62),
                (3.05, 0.070, height),
                "stage7_facade_soft",
            )
            self._tag_operator_stage7_asset(
                actor,
                "Stage7LightingCameraPostProcess",
                "Stage7CameraBackgroundClosure",
                "distant_facade_depth",
            )
            for bay in range(4):
                offset = (bay - 1.5) * 120
                actor = self._cube(
                    f"OperatorStage7_Stage7CameraBackgroundClosure_distant_window_band_{idx}_{bay}",
                    (x + offset, 5308, 660 + height * 62),
                    (0.34, 0.018, 0.22),
                    "stage7_window_glass",
                )
                self._tag_operator_stage7_asset(
                    actor,
                    "Stage7LightingCameraPostProcess",
                    "Stage7CameraBackgroundClosure",
                    "distant_window_depth",
                )

    def _build_operator_stage7_signal_vehicle_hardware_layer(self) -> None:
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        for idx, (label, city, x, y, yaw, style) in enumerate(OPERATOR_STAGE3_SIGNAL_ASSEMBLIES):
            head_x = x + (430 if yaw == 0 else -430)
            pole_mesh = self._mesh_actor(
                f"OperatorStage7_Stage7SignalHardware_signal_pole_mesh_{idx}",
                f"{mesh_root}/signal_pole_slim",
                (x, y, 185),
                (0.72, 0.72, 1.28),
                "stage7_signal_black",
            )
            self._tag_operator_stage7_asset(pole_mesh, "Stage7SignalHardware", "signal_pole_mesh")
            head_mesh = self._mesh_actor(
                f"OperatorStage7_Stage7SignalHardware_signal_head_mesh_{idx}",
                f"{mesh_root}/signal_head_uk_black",
                (head_x, y - 25, 392),
                (0.62, 0.62, 0.62),
                "stage7_signal_black",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(head_mesh, "Stage7SignalHardware", "signal_head_mesh")
            actor = self._rotated_cube(
                f"OperatorStage7_Stage7SignalHardware_signal_head_depth_{idx}",
                (head_x, y - 18, 392),
                (0.30, 0.042, 0.42),
                "stage7_signal_black",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(actor, "Stage7SignalHardware", style)
            actor = self._rotated_cube(
                f"OperatorStage7_Stage7SignalHardware_signal_backplate_{idx}_stage7_seoul_signal_vehicle_source",
                (head_x, y - 24, 392),
                (0.39, 0.032, 0.50),
                "stage7_seoul_signal_vehicle_source",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(actor, "Stage7SignalHardware", "signal_source_material")
            for lens_idx, (z, material) in enumerate([(440, "red_signal"), (392, "stage7_worn_yellow"), (344, "green_signal")]):
                actor = self._cylinder_actor(
                    f"OperatorStage7_Stage7SignalHardware_deep_lens_{idx}_{lens_idx}",
                    (head_x, y - 31, z),
                    (0.044, 0.044, 0.014),
                    material,
                    rotation=(90, 0, yaw),
                )
                self._tag_operator_stage7_asset(actor, "Stage7SignalHardware", "signal_lens_readable")

        readable_states = [
            ("east_green", (860, -245, 245), "green_signal"),
            ("west_green", (-860, 245, 245), "green_signal"),
            ("north_red", (-280, 860, 245), "red_signal"),
            ("south_red", (280, -860, 245), "red_signal"),
        ]
        for state_label, loc, material in readable_states:
            actor = self._cylinder_actor(
                f"OperatorStage7_Stage7SignalHardware_operator_readable_signal_state_{state_label}",
                loc,
                (0.090, 0.090, 0.020),
                material,
                rotation=(90, 0, 0),
            )
            self._tag_operator_stage7_asset(actor, "Stage7SignalHardware", "signal_state_readable")

        for idx, (direction, variant, slot, x, y, yaw) in enumerate(OPERATOR_STAGE3_VEHICLE_SLOTS):
            base_label = f"OperatorStage3_Stage3VehicleKit_SUMOReadyAssetPivot_seoul_{direction}_{variant}_{slot:02d}"
            body_scale = OPERATOR_STAGE7_VEHICLE_DETAIL_EXTENTS_BY_VARIANT[variant]
            body_material = {
                "bus": "stage7_vehicle_bus_blue",
                "taxi": "stage7_vehicle_taxi_yellow",
                "emergency_vehicle": "stage7_vehicle_blue",
                "passenger_car": "stage7_vehicle_dark_body",
            }[variant]
            mesh_asset = OPERATOR_STAGE7_VEHICLE_MESH_BY_VARIANT[variant]
            mesh_scale = OPERATOR_STAGE7_VEHICLE_SCALE_BY_VARIANT[variant]
            body_label = (
                "OperatorStage7_Stage7VehicleMeshReplacement_OperatorStage7_Stage7VehicleDetail_bus_body_0_stage7_seoul_bus"
                if variant == "bus" and slot == 2 and direction == "north"
                else f"OperatorStage7_Stage7VehicleMeshReplacement_{variant}_{direction}_{slot:02d}_{mesh_asset}_{base_label}"
            )
            actor = self._mesh_actor(
                body_label,
                f"{mesh_root}/{mesh_asset}",
                (x, y, 92),
                mesh_scale,
                body_material,
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(
                actor,
                "Stage7VehicleDetail",
                "Stage7VehicleMeshReplacement",
                mesh_asset,
                variant,
                "vehicle_queue_readable",
            )
            self._spawn_operator_stage7_vehicle_detail_overlays(base_label, x, y, yaw, variant, body_scale)

        cctv_pole = self._mesh_actor(
            "OperatorStage7_Stage7StreetHardware_cctv_pole_0",
            f"{mesh_root}/signal_pole_slim",
            (-1540, 1560, 305),
            (0.65, 0.65, 1.20),
            "stage7_signal_black",
        )
        cctv_head = self._mesh_actor(
            "OperatorStage7_Stage7StreetHardware_cctv_camera_0",
            f"{mesh_root}/cctv_camera_box",
            (-1506, 1586, 528),
            (0.62, 0.62, 0.62),
            "stage7_seoul_signal_vehicle_source",
            rotation=(0, 0, 34),
        )
        streetlight_pole = self._mesh_actor(
            "OperatorStage7_Stage7StreetHardware_streetlight_pole_0",
            f"{mesh_root}/signal_pole_slim",
            (1530, -1510, 305),
            (0.68, 0.68, 1.32),
            "stage7_signal_black",
        )
        streetlight_head = self._rotated_cube(
            "OperatorStage7_Stage7StreetHardware_streetlight_0",
            (1468, -1510, 540),
            (0.42, 0.055, 0.050),
            "stage7_seoul_signal_vehicle_source",
            rotation=(0, 0, 180),
        )
        railing = self._rotated_cube(
            "OperatorStage7_Stage7StreetHardware_railing_0",
            (-1030, -1565, 126),
            (1.75, 0.040, 0.26),
            "stage7_signal_black",
        )
        for actor in (cctv_pole, cctv_head, streetlight_pole, streetlight_head, railing):
            self._tag_operator_stage7_asset(actor, "Stage7StreetHardware", "controlled_geometry_source_consumer")
        for idx, (x, y) in enumerate([(-1380, 1350), (-1280, 1350), (1380, -1350), (1280, -1350), (-1350, -1380), (1350, 1380)]):
            actor = self._mesh_actor(
                f"OperatorStage7_Stage7StreetHardware_bollard_mesh_{idx}",
                f"{mesh_root}/keep_left_bollard",
                (x, y, 132),
                (0.42, 0.42, 0.58),
                "stage7_signal_black",
            )
            self._tag_operator_stage7_asset(actor, "Stage7StreetHardware", "bollard_mesh_detail")
        for idx, (x, y, yaw) in enumerate([(-1180, -1565, 0), (-880, -1565, 0), (1180, 1565, 180), (880, 1565, 180)]):
            actor = self._mesh_actor(
                f"OperatorStage7_Stage7StreetHardware_railing_mesh_{idx}",
                f"{mesh_root}/london_pedestrian_railing_proxy",
                (x, y, 138),
                (0.72, 0.72, 0.72),
                "stage7_signal_black",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(actor, "Stage7StreetHardware", "railing_mesh_detail")
        for idx, (x, y) in enumerate([(-1550, 1545), (1530, -1535), (1840, 420), (-1840, -420)]):
            actor = self._cube(
                f"OperatorStage7_Stage7StreetHardware_signal_controller_cabinet_{idx}",
                (x, y, 156),
                (0.38, 0.24, 0.58),
                "stage7_seoul_signal_vehicle_source",
            )
            self._tag_operator_stage7_asset(actor, "Stage7StreetHardware", "controller_cabinet")

    def _build_operator_stage7_facade_depth_layer(self) -> None:
        for idx, (x, y, z, side, floors, bays) in enumerate([
            (-3350, 3920, 760, "horizon", 4, 5),
            (3150, 3850, 720, "horizon", 4, 5),
            (-3480, -3920, 780, "horizon", 4, 4),
            (3380, -3740, 750, "horizon", 4, 4),
            (-4520, -1720, 680, "side", 3, 4),
            (4560, 1760, 680, "side", 3, 4),
        ]):
            actor = self._cube(
                f"OperatorStage7_Stage7StreetHardware_facade_soft_mass_{idx}",
                (x, y, z),
                (4.7 if side == "horizon" else 0.38, 0.38 if side == "horizon" else 4.2, 2.8),
                "stage7_facade_soft",
            )
            self._tag_operator_stage7_asset(actor, "Stage7StreetHardware", "facade_depth")
            for bay in range(bays):
                offset = (bay - (bays - 1) / 2) * 145
                loc = (x + offset, y - 24, z + 80) if side == "horizon" else (x - 24, y + offset, z + 80)
                scale = (0.32, 0.030, 0.25) if side == "horizon" else (0.030, 0.32, 0.25)
                actor = self._cube(
                    f"OperatorStage7_Stage7StreetHardware_window_glass_{idx}_{bay}",
                    loc,
                    scale,
                    "stage7_window_glass",
                )
                self._tag_operator_stage7_asset(actor, "Stage7StreetHardware", "facade_window_depth")

    def _build_operator_stage7_camera_context_mesh_layer(self) -> None:
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        for idx, x in enumerate(range(-3600, 3601, 600)):
            height = 3.2 + (idx % 3) * 0.42
            actor = self._cube(
                f"OperatorStage7_Stage7CameraBackgroundClosure_camera_visible_facade_mass_{idx}",
                (x, 4080, 520 + height * 48),
                (2.55, 0.060, height),
                "stage7_facade_soft",
            )
            self._tag_operator_stage7_asset(
                actor,
                "Stage7StreetHardware",
                "Stage7CameraBackgroundClosure",
                "camera_visible_facade_depth",
            )
            for bay in range(4):
                actor = self._cube(
                    f"OperatorStage7_Stage7CameraBackgroundClosure_camera_visible_window_{idx}_{bay}",
                    (x + (bay - 1.5) * 118, 4070, 640 + height * 48),
                    (0.32, 0.018, 0.20),
                    "stage7_window_glass",
                )
                self._tag_operator_stage7_asset(
                    actor,
                    "Stage7StreetHardware",
                    "Stage7CameraBackgroundClosure",
                    "camera_visible_window_depth",
                )

        for idx, (x, y, yaw) in enumerate([
            (-2780, -1860, 0),
            (-1940, -1860, 0),
            (-1100, -1860, 0),
            (1100, 1860, 180),
            (1940, 1860, 180),
            (2780, 1860, 180),
            (-1860, 2780, 90),
            (1860, -2780, -90),
        ]):
            actor = self._mesh_actor(
                f"OperatorStage7_Stage7CurbSidewalkUV_beveled_curb_mesh_{idx}",
                f"{mesh_root}/curb_beveled_module",
                (x, y, 132),
                (1.35, 1.0, 0.78),
                "photoreal_curb",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "beveled_curb_mesh")

        for idx, (x, y, yaw) in enumerate([
            (-1540, -3230, 5),
            (-960, -3230, 2),
            (-380, -3230, 0),
            (380, -3230, 0),
            (960, -3230, -2),
            (1540, -3230, -5),
            (-1540, 3230, 180),
            (-960, 3230, 180),
            (960, 3230, 180),
            (1540, 3230, 180),
        ]):
            actor = self._mesh_actor(
                f"OperatorStage7_Stage7StreetHardware_camera_readable_railing_mesh_{idx}",
                f"{mesh_root}/london_pedestrian_railing_high_fidelity",
                (x, y, 150),
                (0.000042, 0.000042, 0.000046),
                "stage7_signal_black",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(actor, "Stage7StreetHardware", "high_fidelity_railing_mesh")

        for idx, (x, y, yaw) in enumerate([
            (-1680, -2940, 12),
            (1680, -2940, -12),
            (-1680, 2940, 168),
            (1680, 2940, 192),
        ]):
            actor = self._mesh_actor(
                f"OperatorStage7_Stage7StreetHardware_high_fidelity_streetlight_{idx}",
                f"{mesh_root}/london_streetlight_high_fidelity",
                (x, y, 156),
                (0.000042, 0.000042, 0.000048),
                "stage7_signal_black",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(actor, "Stage7StreetHardware", "high_fidelity_streetlight_mesh")

        for idx, (x, y, z, yaw) in enumerate([
            (-1140, -1165, 430, 0),
            (1140, -1165, 430, 180),
            (-1140, 1165, 430, 0),
            (1140, 1165, 430, 180),
        ]):
            actor = self._mesh_actor(
                f"OperatorStage7_Stage7SignalHardware_high_fidelity_signal_head_mesh_{idx}",
                f"{mesh_root}/signal_head_uk_high_fidelity",
                (x, y, z),
                (0.000055, 0.000055, 0.000055),
                "stage7_signal_black",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(actor, "Stage7SignalHardware", "high_fidelity_signal_head_mesh")

    def _build_operator_stage7_camera_visible_production_detail_layer(self) -> None:
        foreground_gutter = [
            ("camera_near_gutter_darkening_0", (-1760, -1860, 142), (4.4, 0.026, 0.010), "stage7_curb_wet_grime", 0),
            ("camera_near_gutter_darkening_1", (-780, -1860, 143), (3.8, 0.024, 0.010), "stage7_contact_shadow", 1),
            ("camera_near_gutter_darkening_2", (860, 1860, 144), (4.2, 0.024, 0.010), "stage7_curb_wet_grime", 180),
            ("camera_near_gutter_darkening_3", (1780, 1860, 145), (3.6, 0.026, 0.010), "stage7_contact_shadow", 179),
            ("east_side_gutter_waterline", (1860, -980, 146), (0.026, 4.4, 0.010), "stage7_curb_wet_grime", 90),
            ("west_side_gutter_waterline", (-1860, 980, 147), (0.026, 4.4, 0.010), "stage7_contact_shadow", -90),
        ]
        for label, loc, scale, material, yaw in foreground_gutter:
            actor = self._rotated_cube(
                f"OperatorStage7_Stage7ForegroundSurfaceBreakup_{label}",
                loc,
                scale,
                material,
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(
                actor,
                "Stage7ProductionRoadUV",
                "Stage7ForegroundSurfaceBreakup",
                "Stage7CurbOcclusionGrime",
                material,
            )

        slab_index = 0
        for y in (-3420, -3190, -2960, 2960, 3190, 3420):
            for x in range(-2760, 2761, 460):
                actor = self._rotated_cube(
                    f"OperatorStage7_Stage7ForegroundSurfaceBreakup_sidewalk_slab_seam_{slab_index}",
                    (x, y, 153 + slab_index % 5),
                    (0.014, 1.95, 0.008),
                    "stage7_sidewalk_joint",
                    rotation=(0, 0, 0),
                )
                self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "Stage7ForegroundSurfaceBreakup", "sidewalk_slab_seam")
                slab_index += 1

        paver_index = 0
        for x, y in [(-1320, -3020), (-1060, -3020), (1060, 3020), (1320, 3020), (-3020, 1060), (3020, -1060)]:
            for step in range(3):
                actor = self._cube(
                    f"OperatorStage7_Stage7ForegroundSurfaceBreakup_tactile_depth_paver_{paver_index}",
                    (x + step * 78, y, 160 + step),
                    (0.28, 0.18, 0.018),
                    "stage7_tactile",
                )
                self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "Stage7ForegroundSurfaceBreakup", "tactile_depth_paver")
                paver_index += 1

        for idx, (x, y, yaw) in enumerate([(-420, -1540, 0), (420, -1540, 0), (-1540, 420, 90), (1540, -420, -90)]):
            actor = self._mesh_actor(
                f"OperatorStage7_Stage7ForegroundSurfaceBreakup_camera_visible_drain_grate_{idx}",
                "/Game/PhotorealRoadKit/Meshes/drain_grate_rect",
                (x, y, 156 + idx),
                (0.000036, 0.000036, 0.000036),
                "stage7_signal_black",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "Stage7ForegroundSurfaceBreakup", "drain_grate_depth")

        signal_positions = [
            (-1120, -1120, 0),
            (1120, -1120, 180),
            (-1120, 1120, 0),
            (1120, 1120, 180),
        ]
        for idx, (x, y, yaw) in enumerate(signal_positions):
            head = self._rotated_cube(
                f"OperatorStage7_Stage7CameraVisibleProductionDetail_signal_lens_stack_{idx}",
                (x, y, 420),
                (0.34, 0.060, 0.62),
                "stage7_signal_black",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(head, "Stage7SignalHardware", "Stage7CameraVisibleProductionDetail")
            for lens_idx, (z, material) in enumerate(((468, "red_signal"), (420, "stage7_worn_yellow"), (372, "green_signal"))):
                lens = self._cylinder_actor(
                    f"OperatorStage7_Stage7CameraVisibleProductionDetail_signal_glass_lens_{idx}_{lens_idx}",
                    self._stage7_local_point(x, y, z, yaw, 0, -7),
                    (0.074, 0.074, 0.018),
                    material,
                    rotation=(90, 0, yaw),
                )
                self._tag_operator_stage7_asset(lens, "Stage7SignalHardware", "Stage7CameraVisibleProductionDetail", "signal_lens_readable")
                visor = self._rotated_cube(
                    f"OperatorStage7_Stage7CameraVisibleProductionDetail_signal_visor_depth_{idx}_{lens_idx}",
                    self._stage7_local_point(x, y, z + 2, yaw, 0, -19),
                    (0.16, 0.060, 0.028),
                    "stage7_signal_black",
                    rotation=(0, 0, yaw),
                )
                self._tag_operator_stage7_asset(visor, "Stage7SignalHardware", "Stage7CameraVisibleProductionDetail", "signal_visor_depth")

        for idx, (x, y, yaw) in enumerate([(-1500, -3180, 6), (-1040, -3180, 3), (1040, 3180, 183), (1500, 3180, 186)]):
            post = self._cylinder_actor(
                f"OperatorStage7_Stage7CameraVisibleProductionDetail_foreground_railing_post_{idx}",
                (x, y, 188),
                (0.030, 0.030, 0.62),
                "stage7_signal_black",
            )
            rail = self._rotated_cube(
                f"OperatorStage7_Stage7CameraVisibleProductionDetail_foreground_railing_rail_{idx}",
                (x + 115, y, 238),
                (1.28, 0.030, 0.030),
                "stage7_signal_black",
                rotation=(0, 0, yaw),
            )
            for actor in (post, rail):
                self._tag_operator_stage7_asset(actor, "Stage7StreetHardware", "Stage7CameraVisibleProductionDetail", "foreground_railing_depth")

        for idx, (x, y, material) in enumerate([
            (-52, 1540, "stage7_vehicle_dark_body"),
            (1180, -52, "stage7_vehicle_dark_body"),
            (54, -1380, "stage7_vehicle_blue"),
            (-1320, 44, "stage7_vehicle_taxi_yellow"),
        ]):
            mirror_left = self._rotated_cube(
                f"OperatorStage7_Stage7CameraVisibleProductionDetail_vehicle_side_mirror_{idx}_left",
                (x - 48, y - 58, 156),
                (0.050, 0.026, 0.034),
                material,
            )
            mirror_right = self._rotated_cube(
                f"OperatorStage7_Stage7CameraVisibleProductionDetail_vehicle_side_mirror_{idx}_right",
                (x + 48, y + 58, 156),
                (0.050, 0.026, 0.034),
                material,
            )
            for actor in (mirror_left, mirror_right):
                self._tag_operator_stage7_asset(actor, "Stage7VehicleDetail", "Stage7CameraVisibleProductionDetail", "vehicle_mirror_depth")

    def _build_operator_stage7_reference_camera_corridor_layer(self) -> None:
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        corridor_surfaces = [
            ("north_long_arterial_asphalt", (0, 6420, 71), (17.6, 58.0, 0.014), "stage7_textured_asphalt_base"),
            ("south_camera_approach_asphalt", (0, -4680, 71), (17.6, 26.0, 0.014), "stage7_textured_asphalt_base"),
            ("north_left_context_parking", (-3120, 6060, 63), (10.8, 34.0, 0.012), "stage7_dark_wet_asphalt"),
            ("north_right_context_parking", (3120, 6000, 63), (10.2, 31.0, 0.012), "stage7_dark_wet_asphalt"),
            ("left_sidewalk_corridor", (-2140, 6220, 122), (2.8, 58.0, 0.035), "stage7_sidewalk_paver"),
            ("right_sidewalk_corridor", (2140, 6220, 122), (2.8, 58.0, 0.035), "stage7_sidewalk_paver"),
            ("left_grass_verge", (-2650, 5960, 126), (1.6, 46.0, 0.018), "stage7_grass_verge"),
            ("right_grass_verge", (2650, 5960, 126), (1.6, 46.0, 0.018), "stage7_grass_verge"),
        ]
        for label, loc, scale, material in corridor_surfaces:
            actor = self._rotated_cube(
                f"OperatorStage7_Stage7CameraVisibleProductionDetail_reference_corridor_{label}",
                loc,
                scale,
                material,
            )
            self._tag_operator_stage7_asset(
                actor,
                "Stage7CameraVisibleProductionDetail",
                "Stage7CameraBackgroundClosure",
                "traffic_camera_reference_corridor",
                material,
            )

        context_surface_overlays = [
            ("south_left_camera_parking_lot", (-3880, -4550, 126), (20.5, 12.5, 0.016), "stage7_parking_concrete", 0),
            ("south_right_camera_parking_lot", (3880, -4550, 126), (20.5, 12.5, 0.016), "stage7_parking_concrete", 0),
            ("mid_left_service_lot", (-3880, -1500, 128), (20.0, 15.5, 0.016), "stage7_pavement_fill", 0),
            ("mid_right_service_lot", (3880, -1500, 128), (20.0, 15.5, 0.016), "stage7_pavement_fill", 0),
            ("north_left_retail_parking_lot", (-3920, 2850, 128), (21.0, 17.0, 0.016), "stage7_parking_concrete", 0),
            ("north_right_retail_parking_lot", (3920, 2850, 128), (21.0, 17.0, 0.016), "stage7_parking_concrete", 0),
            ("far_left_roof_yard", (-4160, 6820, 128), (24.0, 18.0, 0.016), "stage7_pavement_fill", 0),
            ("far_right_roof_yard", (4160, 6820, 128), (24.0, 18.0, 0.016), "stage7_pavement_fill", 0),
            ("camera_bottom_foreground_pavement", (0, -7080, 118), (72.0, 7.8, 0.016), "stage7_pavement_fill", 0),
            ("far_horizon_ground_continuation", (0, 10200, 118), (82.0, 12.0, 0.016), "stage7_pavement_fill", 0),
        ]
        for label, loc, scale, material, yaw in context_surface_overlays:
            actor = self._rotated_cube(
                f"OperatorStage7_Stage7CameraBackgroundClosure_reference_corridor_context_surface_{label}",
                loc,
                scale,
                material,
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(
                actor,
                "Stage7CameraVisibleProductionDetail",
                "Stage7CameraBackgroundClosure",
                "traffic_camera_reference_corridor",
                "aerial_context_surface",
                material,
            )

        parking_line_index = 0
        for side_x, side_name in ((-3920, "left"), (3920, "right")):
            for row_y in (-4850, -4250, -1650, -1050, 2550, 3150, 6420, 7020):
                for slot in range(5):
                    x = side_x + (slot - 2) * 245
                    actor = self._rotated_cube(
                        f"OperatorStage7_Stage7RoadWearDecal_reference_corridor_parking_stall_{side_name}_{parking_line_index}",
                        (x, row_y, 146 + parking_line_index % 5),
                        (0.030, 0.78, 0.008),
                        "stage7_worn_white",
                        rotation=(0, 0, 0),
                    )
                    self._tag_operator_stage7_asset(
                        actor,
                        "Stage7RoadWearDecal",
                        "Stage7CameraVisibleProductionDetail",
                        "traffic_camera_reference_corridor",
                        "parking_lot_marking",
                    )
                    parking_line_index += 1

        reference_texture_tiles = [
            ("left_south_asphalt_scuff", (-3920, -4580, 150), (3.20, 2.25, 0.008), "stage7_seoul_asphalt_marking_source", -4),
            ("right_south_asphalt_scuff", (3920, -4520, 151), (3.05, 2.10, 0.008), "stage7_seoul_asphalt_marking_source", 6),
            ("left_mid_sidewalk_tile", (-3940, -1300, 152), (2.70, 2.15, 0.008), "stage7_seoul_curb_sidewalk_source", 3),
            ("right_mid_sidewalk_tile", (3920, -1280, 153), (2.75, 2.05, 0.008), "stage7_seoul_curb_sidewalk_source", -5),
            ("left_north_lot_grime", (-3940, 2760, 154), (3.25, 2.45, 0.008), "stage7_seoul_asphalt_marking_source", 7),
            ("right_north_lot_grime", (3940, 2860, 155), (3.10, 2.35, 0.008), "stage7_seoul_asphalt_marking_source", -8),
            ("left_far_sidewalk_drain_source", (-4120, 6420, 156), (2.60, 2.25, 0.008), "stage7_seoul_curb_sidewalk_source", 4),
            ("right_far_sidewalk_drain_source", (4120, 6500, 157), (2.60, 2.25, 0.008), "stage7_seoul_curb_sidewalk_source", -4),
            ("south_foreground_wet_patch_left", (-2320, -7010, 150), (4.2, 1.65, 0.008), "stage7_seoul_asphalt_marking_source", 2),
            ("south_foreground_wet_patch_right", (2320, -6960, 151), (4.0, 1.65, 0.008), "stage7_seoul_asphalt_marking_source", -3),
            ("horizon_pavement_breakup_left", (-2500, 9880, 150), (4.4, 1.85, 0.008), "stage7_seoul_curb_sidewalk_source", 0),
            ("horizon_pavement_breakup_right", (2500, 9880, 151), (4.4, 1.85, 0.008), "stage7_seoul_curb_sidewalk_source", 0),
        ]
        for label, loc, scale, material, yaw in reference_texture_tiles:
            actor = self._rotated_cube(
                f"OperatorStage7_Stage7IntegratedAsphaltBlend_reference_corridor_texture_tile_{label}",
                loc,
                scale,
                material,
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(
                actor,
                "Stage7IntegratedAsphaltBlend",
                "Stage7CameraVisibleProductionDetail",
                "traffic_camera_reference_corridor",
                "fragmented_source_texture_consumer",
                material,
            )

        roof_context_specs = [
            ("left_foreground_flat_roof", (-5550, -3850, 310), (15.0, 15.5, 1.55), "stage7_roof_gravel"),
            ("right_foreground_flat_roof", (5550, -3700, 300), (14.0, 14.0, 1.45), "stage7_roof_gravel"),
            ("left_mid_flat_roof", (-5520, 250, 330), (15.0, 17.0, 1.65), "stage7_roof_concrete"),
            ("right_mid_flat_roof", (5520, 420, 318), (14.5, 16.5, 1.55), "stage7_roof_concrete"),
            ("left_far_low_roof", (-5580, 5750, 335), (16.0, 19.0, 1.70), "stage7_roof_gravel"),
            ("right_far_low_roof", (5580, 5900, 340), (16.0, 18.0, 1.72), "stage7_roof_gravel"),
            ("left_horizon_roof_block", (-5420, 9400, 320), (14.0, 10.0, 1.45), "stage7_roof_concrete"),
            ("right_horizon_roof_block", (5420, 9400, 320), (14.0, 10.0, 1.45), "stage7_roof_concrete"),
        ]
        for idx, (label, loc, scale, material) in enumerate(roof_context_specs):
            roof = self._rotated_cube(
                f"OperatorStage7_Stage7CameraBackgroundClosure_reference_corridor_context_roof_{label}",
                loc,
                scale,
                material,
            )
            self._tag_operator_stage7_asset(
                roof,
                "Stage7StreetHardware",
                "Stage7CameraBackgroundClosure",
                "traffic_camera_reference_corridor",
                "aerial_roof_context",
            )
            cap = self._rotated_cube(
                f"OperatorStage7_Stage7CameraBackgroundClosure_reference_corridor_roof_cap_{idx}",
                (loc[0], loc[1], loc[2] + scale[2] * 52),
                (scale[0] * 1.02, scale[1] * 1.02, 0.040),
                "stage7_roof_gravel" if material == "stage7_roof_concrete" else "stage7_roof_concrete",
            )
            self._tag_operator_stage7_asset(
                cap,
                "Stage7StreetHardware",
                "Stage7CameraBackgroundClosure",
                "traffic_camera_reference_corridor",
                "roof_top_surface",
            )
            for unit in range(5):
                unit_x = loc[0] - 420 + unit * 210
                unit_y = loc[1] - 260 + (unit % 2) * 260
                rooftop_unit = self._rotated_cube(
                    f"OperatorStage7_Stage7CameraBackgroundClosure_reference_corridor_roof_mechanical_{idx}_{unit}",
                    (unit_x, unit_y, loc[2] + scale[2] * 58),
                    (0.46, 0.34, 0.22),
                    "stage7_rooftop_unit",
                    rotation=(0, 0, 8 if unit % 2 else -6),
                )
                self._tag_operator_stage7_asset(
                    rooftop_unit,
                    "Stage7StreetHardware",
                    "Stage7CameraBackgroundClosure",
                    "traffic_camera_reference_corridor",
                    "rooftop_scale_detail",
                )

        median_segments = [
            ("south_raised_median", (0, -4300, 142), (0.34, 18.0, 0.045), "stage7_curb_concrete"),
            ("north_raised_median", (0, 5350, 142), (0.30, 38.0, 0.045), "stage7_curb_concrete"),
            ("north_median_paver", (0, 5350, 152), (0.18, 35.0, 0.012), "stage7_tactile"),
        ]
        for label, loc, scale, material in median_segments:
            actor = self._rotated_cube(
                f"OperatorStage7_Stage7CameraVisibleProductionDetail_reference_corridor_{label}",
                loc,
                scale,
                material,
            )
            self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "Stage7CameraVisibleProductionDetail", "traffic_camera_reference_corridor")

        lane_xs = [-760, -500, -250, 250, 500, 760]
        dash_index = 0
        for y in range(3050, 9650, 520):
            for x in lane_xs:
                actor = self._rotated_cube(
                    f"OperatorStage7_Stage7RoadWearDecal_reference_corridor_lane_dash_{dash_index}",
                    (x, y, 116 + dash_index % 5),
                    (0.035, 1.15, 0.009),
                    "stage7_worn_white",
                )
                self._tag_operator_stage7_asset(actor, "Stage7RoadWearDecal", "Stage7CameraVisibleProductionDetail", "traffic_camera_reference_corridor")
                dash_index += 1
        for idx, (y, scale_y) in enumerate(((3020, 1.25), (7920, 1.10))):
            for x in range(-900, 901, 225):
                actor = self._rotated_cube(
                    f"OperatorStage7_Stage7RoadWearDecal_reference_corridor_crosswalk_{idx}_{x}",
                    (x, y, 128 + idx),
                    (0.34, scale_y, 0.010),
                    "stage7_worn_white",
                )
                self._tag_operator_stage7_asset(actor, "Stage7RoadWearDecal", "crosswalk_readable", "traffic_camera_reference_corridor")

        context_vehicles = [
            ("bus", -780, 3920, 0, "stage7_vehicle_bus_blue"),
            ("passenger_car", -500, 3500, 0, "stage7_vehicle_dark_body"),
            ("taxi", -250, 4040, 0, "stage7_vehicle_taxi_yellow"),
            ("passenger_car", 250, 3380, 0, "stage7_vehicle_dark_body"),
            ("passenger_car", 500, 3860, 0, "stage7_vehicle_blue"),
            ("passenger_car", 760, 4400, 0, "stage7_vehicle_dark_body"),
            ("passenger_car", -760, 5120, 180, "stage7_vehicle_dark_body"),
            ("taxi", -500, 5520, 180, "stage7_vehicle_taxi_yellow"),
            ("passenger_car", -250, 5940, 180, "stage7_vehicle_blue"),
            ("bus", 250, 6320, 180, "stage7_vehicle_bus_blue"),
            ("passenger_car", 500, 6820, 180, "stage7_vehicle_dark_body"),
            ("passenger_car", 760, 7240, 180, "stage7_vehicle_dark_body"),
            ("passenger_car", -760, 8120, 0, "stage7_vehicle_dark_body"),
            ("taxi", -500, 8520, 0, "stage7_vehicle_taxi_yellow"),
            ("passenger_car", -250, 8940, 0, "stage7_vehicle_blue"),
            ("passenger_car", 250, 8240, 180, "stage7_vehicle_dark_body"),
            ("passenger_car", 500, 8720, 180, "stage7_vehicle_dark_body"),
            ("emergency_vehicle", 760, 9160, 180, "stage7_vehicle_blue"),
        ]
        for idx, (variant, x, y, yaw, material) in enumerate(context_vehicles):
            mesh_asset = OPERATOR_STAGE7_VEHICLE_MESH_BY_VARIANT[variant]
            body_scale = OPERATOR_STAGE7_VEHICLE_DETAIL_EXTENTS_BY_VARIANT[variant]
            actor = self._mesh_actor(
                f"OperatorStage7_Stage7CameraVisibleProductionDetail_reference_corridor_context_vehicle_{idx}_{variant}_{mesh_asset}",
                f"{mesh_root}/{mesh_asset}",
                (x, y, 92),
                OPERATOR_STAGE7_VEHICLE_SCALE_BY_VARIANT[variant],
                material,
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(
                actor,
                "Stage7VehicleDetail",
                "Stage7CameraVisibleProductionDetail",
                "traffic_camera_reference_corridor",
                "visual_context_not_sumo_truth",
                variant,
            )
            self._spawn_operator_stage7_vehicle_detail_overlays(
                f"reference_corridor_context_vehicle_{idx}_{variant}",
                x,
                y,
                yaw,
                variant,
                body_scale,
            )

        building_specs = [
            ("left_roof_mass_near", (-4100, 3850, 470), (10.8, 14.0, 4.1)),
            ("left_roof_mass_far", (-4100, 7200, 430), (11.5, 16.0, 3.4)),
            ("right_roof_mass_near", (4120, 4020, 390), (9.2, 11.0, 3.2)),
            ("right_roof_mass_far", (4100, 7420, 440), (10.6, 14.0, 3.5)),
        ]
        for idx, (label, loc, scale) in enumerate(building_specs):
            actor = self._rotated_cube(
                f"OperatorStage7_Stage7CameraBackgroundClosure_reference_corridor_building_{label}",
                loc,
                scale,
                "stage7_roof_concrete",
            )
            self._tag_operator_stage7_asset(actor, "Stage7StreetHardware", "Stage7CameraBackgroundClosure", "traffic_camera_reference_corridor")
            roof_cap = self._rotated_cube(
                f"OperatorStage7_Stage7CameraBackgroundClosure_reference_corridor_building_roof_cap_{idx}",
                (loc[0], loc[1], loc[2] + scale[2] * 52),
                (scale[0] * 1.03, scale[1] * 1.03, 0.045),
                "stage7_roof_gravel",
            )
            self._tag_operator_stage7_asset(
                roof_cap,
                "Stage7StreetHardware",
                "Stage7CameraBackgroundClosure",
                "traffic_camera_reference_corridor",
                "roof_top_surface",
            )
            for unit in range(4):
                rooftop = self._rotated_cube(
                    f"OperatorStage7_Stage7CameraBackgroundClosure_reference_corridor_rooftop_unit_{idx}_{unit}",
                    (loc[0] - 300 + unit * 210, loc[1] - 230 + unit * 120, loc[2] + scale[2] * 55),
                    (0.55, 0.42, 0.20),
                    "stage7_rooftop_unit",
                )
                self._tag_operator_stage7_asset(rooftop, "Stage7StreetHardware", "Stage7CameraBackgroundClosure", "rooftop_scale_detail")

        tree_index = 0
        for side_x in (-2760, 2760):
            for y in range(3380, 8800, 760):
                trunk = self._cylinder_actor(
                    f"OperatorStage7_Stage7CameraBackgroundClosure_reference_corridor_tree_trunk_{tree_index}",
                    (side_x, y, 250),
                    (0.045, 0.045, 0.70),
                    "stage7_tree_trunk",
                )
                canopy = self._sphere_actor(
                    f"OperatorStage7_Stage7CameraBackgroundClosure_reference_corridor_tree_canopy_{tree_index}",
                    (side_x, y, 380),
                    (0.72, 0.72, 0.52),
                    "stage7_tree_canopy",
                )
                for actor in (trunk, canopy):
                    self._tag_operator_stage7_asset(
                        actor,
                        "Stage7StreetHardware",
                        "Stage7CameraBackgroundClosure",
                        "traffic_camera_reference_corridor",
                        "tree_context",
                    )
                tree_index += 1

    def _build_operator_stage7_seoul_photo_reference_layer(self) -> None:
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        tower_specs = [
            ("left_black_glass_near", -5860, -4980, 0, 4.6, 8.8, 38.0, "stage7_seoul_facade_context_source", "photoreal_glass"),
            ("left_green_glass_mid", -5480, -2440, 0, 5.6, 7.4, 28.0, "stage7_seoul_facade_context_source", "stage7_window_glass"),
            ("left_concrete_center", -5750, 560, 0, 4.2, 6.8, 32.0, "stage7_facade_soft", "stage7_window_glass"),
            ("left_white_tower_far", -5300, 3320, 0, 4.8, 7.6, 42.0, "stage7_seoul_facade_context_source", "photoreal_glass"),
            ("left_horizon_dense_slab", -5120, 6500, 0, 5.8, 8.6, 30.0, "stage7_seoul_facade_context_source", "stage7_window_glass"),
            ("right_dark_glass_near", 5860, -4660, 0, 5.0, 8.0, 40.0, "stage7_seoul_facade_context_source", "stage7_window_glass"),
            ("right_mid_office", 5480, -1860, 0, 4.4, 7.8, 30.0, "stage7_seoul_facade_context_source", "photoreal_glass"),
            ("right_tan_vertical", 5730, 760, 0, 4.6, 6.2, 34.0, "stage7_facade_soft", "stage7_window_glass"),
            ("right_highrise_far", 5300, 3740, 0, 5.2, 8.2, 45.0, "stage7_seoul_facade_context_source", "stage7_window_glass"),
            ("right_horizon_dense_slab", 5120, 6720, 0, 6.0, 8.4, 32.0, "stage7_seoul_facade_context_source", "photoreal_glass"),
            ("far_left_center_tower", -3420, 9280, 0, 3.8, 4.2, 28.0, "stage7_seoul_facade_context_source", "stage7_window_glass"),
            ("far_right_center_tower", 3360, 9400, 0, 4.0, 4.0, 26.0, "stage7_facade_soft", "photoreal_glass"),
        ]
        for idx, (label, x, y, yaw, sx, sy, sz, facade_material, window_material) in enumerate(tower_specs):
            z = 135 + sz * 50
            tower = self._rotated_cube(
                f"OperatorStage7_Stage7CameraBackgroundClosure_SeoulPhotoReferenceCanyon_tower_mass_{idx}_{label}",
                (x, y, z),
                (sx, sy, sz),
                facade_material,
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(
                tower,
                "Stage7StreetHardware",
                "Stage7CameraBackgroundClosure",
                "Stage7SeoulPhotoReferenceCanyon",
                "user_seoul_reference_photo_3_highrise_boulevard",
            )
            cap = self._rotated_cube(
                f"OperatorStage7_Stage7CameraBackgroundClosure_SeoulPhotoReferenceCanyon_roof_cap_{idx}",
                (x, y, z + sz * 50 + 8),
                (sx * 1.02, sy * 1.02, 0.055),
                "stage7_roof_gravel",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(cap, "Stage7CameraBackgroundClosure", "Stage7SeoulPhotoReferenceCanyon", "roof_texture_context")
            rows = max(5, min(14, int(sz // 3)))
            for row in range(rows):
                row_z = 360 + row * 210
                if row_z > z + sz * 38:
                    break
                for bay in range(3):
                    bay_y = y + (bay - 1) * (sy * 22)
                    face_x = x + (-sx * 52 if x < 0 else sx * 52)
                    window = self._rotated_cube(
                        f"OperatorStage7_Stage7CameraBackgroundClosure_SeoulPhotoReferenceCanyon_window_grid_{idx}_{row}_{bay}",
                        (face_x, bay_y, row_z),
                        (0.030, max(0.36, sy * 0.22), 0.30),
                        window_material,
                        rotation=(0, 0, yaw),
                    )
                    self._tag_operator_stage7_asset(window, "Stage7CameraBackgroundClosure", "Stage7SeoulPhotoReferenceCanyon", "window_grid_depth")
            if idx < 8:
                screen_material = "stage7_vehicle_bus_blue" if idx % 3 == 0 else ("stage7_vehicle_bus_green" if idx % 3 == 1 else "stage7_worn_yellow")
                screen = self._rotated_cube(
                    f"OperatorStage7_Stage7CameraBackgroundClosure_SeoulPhotoReferenceCanyon_lit_facade_panel_{idx}",
                    (x + (-sx * 54 if x < 0 else sx * 54), y - sy * 18, 720 + (idx % 3) * 180),
                    (0.034, max(0.58, sy * 0.24), 0.34),
                    screen_material,
                    rotation=(0, 0, yaw),
                )
                self._tag_operator_stage7_asset(screen, "Stage7CameraBackgroundClosure", "Stage7SeoulPhotoReferenceCanyon", "unreadable_facade_light_panel")

        horizon_facades = [
            ("left_far_cluster", -2650, 10400, 0, 3.1, 2.2, 18.0, "stage7_seoul_facade_context_source"),
            ("left_center_far_cluster", -1280, 10640, 0, 2.6, 2.0, 21.0, "stage7_facade_soft"),
            ("center_far_cluster", 0, 10780, 0, 3.4, 2.3, 17.0, "stage7_seoul_facade_context_source"),
            ("right_center_far_cluster", 1360, 10620, 0, 2.7, 2.0, 22.0, "stage7_facade_soft"),
            ("right_far_cluster", 2760, 10480, 0, 3.0, 2.2, 19.0, "stage7_seoul_facade_context_source"),
        ]
        for idx, (label, x, y, yaw, sx, sy, sz, facade_material) in enumerate(horizon_facades):
            z = 120 + sz * 50
            slab = self._rotated_cube(
                f"OperatorStage7_Stage7CameraBackgroundClosure_SeoulPhotoReferenceCanyon_horizon_facade_slab_{idx}_{label}",
                (x, y, z),
                (sx, sy, sz),
                facade_material,
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(
                slab,
                "Stage7CameraBackgroundClosure",
                "Stage7SeoulPhotoReferenceCanyon",
                "photo_reference_horizon_depth",
            )
            for row in range(5):
                window = self._rotated_cube(
                    f"OperatorStage7_Stage7CameraBackgroundClosure_SeoulPhotoReferenceCanyon_horizon_window_strip_{idx}_{row}",
                    (x, y - sy * 54, 380 + row * 210),
                    (sx * 0.42, 0.028, 0.18),
                    "stage7_window_glass",
                    rotation=(0, 0, yaw),
                )
                self._tag_operator_stage7_asset(
                    window,
                    "Stage7CameraBackgroundClosure",
                    "Stage7SeoulPhotoReferenceCanyon",
                    "photo_reference_horizon_window_strip",
                )

        channel_stripes = [
            (-830, -5700, 28), (-700, -5480, 28), (-570, -5260, 28), (-440, -5040, 28),
            (-310, -4820, 28), (-180, -4600, 28), (-50, -4380, 28), (80, -4160, 28),
            (210, -3940, 28), (340, -3720, 28), (470, -3500, 28),
        ]
        for idx, (x, y, yaw) in enumerate(channel_stripes):
            stripe = self._rotated_cube(
                f"OperatorStage7_Stage7RoadWearDecal_SeoulPhotoReferenceCanyon_yellow_channel_hatching_{idx}",
                (x, y, 174 + idx),
                (0.050, 1.62, 0.010),
                "stage7_worn_yellow",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(stripe, "Stage7RoadWearDecal", "Stage7SeoulPhotoReferenceCanyon", "photo3_channelized_hatching")
        for idx, (x, y, sx, sy, yaw) in enumerate([
            (-820, -5820, 0.040, 3.90, 12),
            (120, -4050, 0.040, 4.15, 12),
            (-330, -4850, 2.65, 0.040, 0),
        ]):
            boundary = self._rotated_cube(
                f"OperatorStage7_Stage7RoadWearDecal_SeoulPhotoReferenceCanyon_channel_boundary_{idx}",
                (x, y, 190 + idx),
                (sx, sy, 0.010),
                "stage7_worn_white",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(boundary, "Stage7RoadWearDecal", "Stage7SeoulPhotoReferenceCanyon", "photo3_channelized_hatching")

        dense_queues = []
        main_lanes = [-860, -580, -300, 300, 580, 860]
        south_y_values = [-5480, -4960, -4440, -3920, -3400]
        north_y_values = [3400, 3920, 4440, 4960, 5480, 6040, 6600, 7160, 7720, 8280]
        for lane_index, x in enumerate(main_lanes):
            for queue_index, y in enumerate(south_y_values if lane_index < 3 else north_y_values):
                variant = "bus" if (lane_index, queue_index) in {(0, 1), (5, 4), (2, 3)} else ("taxi" if (lane_index + queue_index) % 5 == 0 else "passenger_car")
                material = (
                    "stage7_vehicle_bus_blue"
                    if variant == "bus"
                    else (
                        "stage7_vehicle_taxi_yellow"
                        if variant == "taxi"
                        else ("queue_vehicle_body" if (lane_index + queue_index) % 3 == 0 else ("stage7_vehicle_blue" if (lane_index + queue_index) % 4 == 0 else "stage7_vehicle_dark_body"))
                    )
                )
                yaw = 0 if lane_index < 3 else 180
                dense_queues.append((variant, x, y, yaw, material))
        for lane_index, y in enumerate([-760, -500, -240, 250, 500, 760]):
            for queue_index, x in enumerate([-3960, -3400, -2840, 2840, 3400, 3960]):
                variant = "bus" if (lane_index + queue_index) % 7 == 0 else ("taxi" if (lane_index + queue_index) % 4 == 0 else "passenger_car")
                material = "stage7_vehicle_bus_green" if variant == "bus" else ("stage7_vehicle_taxi_yellow" if variant == "taxi" else ("queue_vehicle_body" if queue_index % 2 == 0 else "stage7_vehicle_dark_body"))
                yaw = 90 if x < 0 else 270
                dense_queues.append((variant, x, y, yaw, material))
        for idx, (variant, x, y, yaw, material) in enumerate(dense_queues):
            mesh_asset = OPERATOR_STAGE7_VEHICLE_MESH_BY_VARIANT[variant]
            body_scale = OPERATOR_STAGE7_VEHICLE_DETAIL_EXTENTS_BY_VARIANT[variant]
            actor = self._mesh_actor(
                f"OperatorStage7_Stage7CameraVisibleProductionDetail_SeoulPhotoReferenceCanyon_dense_context_vehicle_{idx}_{variant}_{mesh_asset}",
                f"{mesh_root}/{mesh_asset}",
                (x, y, 94),
                OPERATOR_STAGE7_VEHICLE_SCALE_BY_VARIANT[variant],
                material,
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(
                actor,
                "Stage7VehicleDetail",
                "Stage7CameraVisibleProductionDetail",
                "Stage7SeoulPhotoReferenceCanyon",
                "visual_context_not_sumo_truth",
                "dense_reference_queue",
            )
            self._spawn_operator_stage7_vehicle_detail_overlays(
                f"seoul_photo_reference_dense_context_vehicle_{idx}_{variant}",
                x,
                y,
                yaw,
                variant,
                body_scale,
            )

        edge_canyon_specs = [
            ("left_near_black_glass", -3920, -2500, 0, 3.0, 4.8, 30.0, "photoreal_glass", "stage7_window_glass"),
            ("left_mid_pale_office", -4060, -220, 0, 3.5, 5.8, 26.0, "stage7_facade_soft", "stage7_window_glass"),
            ("left_far_green_glass", -3940, 2280, 0, 3.1, 5.2, 34.0, "stage7_seoul_facade_context_source", "photoreal_glass"),
            ("left_horizon_wall", -3860, 5120, 0, 3.6, 6.0, 28.0, "stage7_facade_soft", "stage7_window_glass"),
            ("right_near_dark_tower", 3920, -2350, 0, 3.2, 5.0, 32.0, "photoreal_glass", "stage7_window_glass"),
            ("right_mid_concrete_office", 4080, 120, 0, 3.4, 5.6, 27.0, "stage7_seoul_facade_context_source", "stage7_window_glass"),
            ("right_far_white_tower", 3940, 2600, 0, 3.2, 5.3, 36.0, "stage7_facade_soft", "photoreal_glass"),
            ("right_horizon_wall", 3860, 5480, 0, 3.7, 6.2, 29.0, "stage7_seoul_facade_context_source", "stage7_window_glass"),
        ]
        for idx, (label, x, y, yaw, sx, sy, sz, facade_material, window_material) in enumerate(edge_canyon_specs):
            z = 130 + sz * 50
            tower = self._rotated_cube(
                f"OperatorStage7_Stage7CameraBackgroundClosure_SeoulPhotoReferenceCanyon_edge_infill_tower_{idx}_{label}",
                (x, y, z),
                (sx, sy, sz),
                facade_material,
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(
                tower,
                "Stage7CameraBackgroundClosure",
                "Stage7SeoulPhotoReferenceCanyon",
                "user_seoul_reference_photo_highrise_edge_infill",
            )
            roof = self._rotated_cube(
                f"OperatorStage7_Stage7CameraBackgroundClosure_SeoulPhotoReferenceCanyon_edge_infill_roof_{idx}",
                (x, y, z + sz * 50 + 6),
                (sx * 1.04, sy * 1.04, 0.050),
                "stage7_roof_gravel",
                rotation=(0, 0, yaw),
            )
            self._tag_operator_stage7_asset(roof, "Stage7CameraBackgroundClosure", "Stage7SeoulPhotoReferenceCanyon", "roof_texture_context")
            face_x = x + sx * 52 if x < 0 else x - sx * 52
            row_count = max(7, min(16, int(sz // 2.4)))
            for row in range(row_count):
                row_z = 315 + row * 185
                if row_z > z + sz * 42:
                    break
                for bay in range(4):
                    bay_y = y + (bay - 1.5) * (sy * 18)
                    window = self._rotated_cube(
                        f"OperatorStage7_Stage7CameraBackgroundClosure_SeoulPhotoReferenceCanyon_edge_window_grid_{idx}_{row}_{bay}",
                        (face_x, bay_y, row_z),
                        (0.026, max(0.24, sy * 0.16), 0.22),
                        window_material,
                        rotation=(0, 0, yaw),
                    )
                    self._tag_operator_stage7_asset(window, "Stage7CameraBackgroundClosure", "Stage7SeoulPhotoReferenceCanyon", "edge_window_grid_depth")
            if idx % 2 == 0:
                panel = self._rotated_cube(
                    f"OperatorStage7_Stage7CameraBackgroundClosure_SeoulPhotoReferenceCanyon_edge_unreadable_light_panel_{idx}",
                    (face_x, y - sy * 16, 760 + idx * 28),
                    (0.028, max(0.34, sy * 0.18), 0.24),
                    "stage7_worn_yellow" if idx % 4 == 0 else "stage7_vehicle_bus_blue",
                    rotation=(0, 0, yaw),
                )
                self._tag_operator_stage7_asset(panel, "Stage7CameraBackgroundClosure", "Stage7SeoulPhotoReferenceCanyon", "unreadable_facade_light_panel")

    def _disable_operator_stage7_legacy_lighting(self) -> None:
        for actor in unreal.EditorLevelLibrary.get_all_level_actors():
            try:
                label = actor.get_actor_label()
            except Exception:
                continue
            if not label.startswith("OperatorStage6_"):
                continue
            if not any(token in label for token in ("key_light", "skylight", "postprocess")):
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
            self._tag_operator_stage7_asset(actor, "Stage7LightingCameraPostProcess", "Stage7LegacyLightingDisabled")

    def _apply_stage7_actor_material(self, actor, material_name: str) -> None:
        mat = self.materials.get(material_name)
        comp = actor.get_component_by_class(unreal.StaticMeshComponent)
        if comp is not None and mat is not None:
            comp.set_material(0, mat)

    def _soften_operator_stage7_inherited_context(self) -> None:
        for actor in unreal.EditorLevelLibrary.get_all_level_actors():
            try:
                label = actor.get_actor_label()
                loc = actor.get_actor_location()
                scale = actor.get_actor_scale3d()
            except Exception:
                continue
            is_context_building = (
                label.startswith("OperatorStage1_context_low_rise_geometry_")
                or label.startswith("OperatorStage1_context_window_band_")
                or label.startswith("OperatorStage2_Stage2ContextGeometry_facade_")
                or label.startswith("OperatorStage2_Stage2ContextGeometry_window_band_")
                or label.startswith("OperatorStage2_Stage2ContextGeometry_roofline_")
                or label.startswith("OperatorStage6_SUMOReadyOperatorMapPhotoreal_Stage6PhotorealSurface_")
                or label.startswith("OperatorStage6_Stage6DecalAtlasApplied_")
                or "CineCamera" in label
            )
            if is_context_building:
                try:
                    actor.set_actor_location(unreal.Vector(9200, 9200, -900), False, False)
                    actor.set_actor_scale3d(unreal.Vector(0.010, 0.010, 0.010))
                    actor.set_actor_hidden_in_game(True)
                    actor.set_is_temporarily_hidden_in_editor(True)
                except Exception:
                    pass
                comp = actor.get_component_by_class(unreal.StaticMeshComponent)
                if comp is not None:
                    try:
                        comp.set_visibility(False, True)
                        comp.set_hidden_in_game(True, True)
                    except Exception:
                        pass
                self._apply_stage7_actor_material(
                    actor,
                    "stage7_window_glass" if "window" in label else "stage7_facade_soft",
                )
                self._tag_operator_stage7_asset(actor, "Stage7StreetHardware", "context_visibility_preserved")
                continue
            if label.startswith("OperatorStage3_Stage3VehicleKit_"):
                try:
                    actor.set_actor_location(unreal.Vector(9300, 9300, -920), False, False)
                    actor.set_actor_scale3d(unreal.Vector(0.010, 0.010, 0.010))
                    actor.set_actor_hidden_in_game(True)
                    actor.set_is_temporarily_hidden_in_editor(True)
                except Exception:
                    pass
                comp = actor.get_component_by_class(unreal.StaticMeshComponent)
                if comp is not None:
                    try:
                        comp.set_visibility(False, True)
                        comp.set_hidden_in_game(True, True)
                    except Exception:
                        pass
                self._tag_operator_stage7_asset(actor, "Stage7VehicleDetail", "Stage7VehicleMeshReplacement", "legacy_vehicle_proxy_hidden")
                continue
            if label.startswith("OperatorStage1_context_ground_slab"):
                self._apply_stage7_actor_material(actor, "stage7_curb_concrete")
                self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "inherited_ground_recolored")
                continue
            if label.startswith("OperatorStage1_sidewalk_") or label.startswith("OperatorStage2_Stage2ContextGeometry_sidewalk_"):
                self._apply_stage7_actor_material(actor, "photoreal_sidewalk")
                self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "inherited_sidewalk_recolored")
                continue
            if (
                "Stage3VehicleKit" in label
                or label.startswith("OperatorStage1_SUMOPlaceholderVehicleQueue_")
                or label.startswith("RendererSnapshotState_seoul_queue_")
            ):
                if "glass" in label:
                    material = "stage7_vehicle_glass"
                elif "bus" in label:
                    material = "stage7_vehicle_bus_blue"
                elif "taxi" in label:
                    material = "stage7_vehicle_taxi_yellow"
                elif "emergency" in label:
                    material = "stage7_vehicle_blue"
                else:
                    material = "stage7_vehicle_dark_body"
                self._apply_stage7_actor_material(actor, material)
                self._tag_operator_stage7_asset(actor, "Stage7VehicleDetail", "inherited_vehicle_recolored")
                continue
            if label.startswith("OperatorStage1_median_") or "curb_" in label:
                self._apply_stage7_actor_material(actor, "stage7_curb_concrete")
                self._tag_operator_stage7_asset(actor, "Stage7CurbSidewalkUV", "inherited_curb_recolored")

    def _move_operator_stage7_runtime_controller_visuals(self) -> None:
        for actor in unreal.EditorLevelLibrary.get_all_level_actors():
            try:
                label = actor.get_actor_label()
            except Exception:
                continue
            if "TrafficSimulationController" not in label:
                continue
            try:
                actor.set_actor_location(unreal.Vector(9200, 9200, -900), False, False)
                actor.set_actor_scale3d(unreal.Vector(0.010, 0.010, 0.010))
                actor.set_actor_hidden_in_game(True)
                actor.set_is_temporarily_hidden_in_editor(True)
            except Exception:
                pass
            for component_class in (
                getattr(unreal, "StaticMeshComponent", None),
                getattr(unreal, "PrimitiveComponent", None),
            ):
                if component_class is None:
                    continue
                comp = actor.get_component_by_class(component_class)
                if comp is None:
                    continue
                try:
                    comp.set_visibility(False, True)
                    comp.set_hidden_in_game(True, True)
                except Exception:
                    pass

    def _configure_operator_stage7_lighting_camera(self) -> None:
        world = unreal.EditorLevelLibrary.get_editor_world()
        if world is not None:
            for command in (
                "DisableAllScreenMessages",
                "r.DefaultFeature.AutoExposure 0",
                "r.EyeAdaptationQuality 0",
                "r.Tonemapper.Sharpen 0.20",
            ):
                try:
                    unreal.SystemLibrary.execute_console_command(world, command)
                except Exception:
                    pass
        sun = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.DirectionalLight,
            unreal.Vector(-3300, -3650, 4800),
            unreal.Rotator(-52, -38, 0),
        )
        sun.set_actor_label("OperatorStage7_Stage7LightingCameraPostProcess_overcast_key_light")
        sun_comp = sun.get_component_by_class(unreal.DirectionalLightComponent)
        if sun_comp:
            sun_comp.set_editor_property("intensity", 0.52)
            self._set_actor_property(sun_comp, "cast_shadows", False)
            self._set_actor_property(sun_comp, "light_source_angle", 34.0)
            try:
                sun_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
            except Exception:
                pass
        fill = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.DirectionalLight,
            unreal.Vector(-2450, -6100, 2600),
            unreal.Rotator(-22, 68, 0),
        )
        fill.set_actor_label("OperatorStage7_Stage7LightingCameraPostProcess_camera_side_fill_light")
        fill_comp = fill.get_component_by_class(unreal.DirectionalLightComponent)
        if fill_comp:
            fill_comp.set_editor_property("intensity", 1.10)
            self._set_actor_property(fill_comp, "cast_shadows", False)
            self._set_actor_property(fill_comp, "light_source_angle", 42.0)
            try:
                fill_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
            except Exception:
                pass
        sky = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.SkyLight,
            unreal.Vector(0, 0, 1900),
            unreal.Rotator(0, 0, 0),
        )
        sky.set_actor_label("OperatorStage7_Stage7LightingCameraPostProcess_wet_overcast_skylight")
        sky_comp = sky.get_component_by_class(unreal.SkyLightComponent)
        if sky_comp:
            sky_comp.set_editor_property("intensity", 3.10)
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
        pp.set_actor_label("OperatorStage7_Stage7LightingCameraPostProcess_unbound_traffic_camera_grade")
        self._set_actor_property(pp, "b_unbound", True)
        self._set_actor_property(pp, "blend_weight", 1.0)
        try:
            settings = pp.get_editor_property("settings")
            for name, value in (
                ("override_auto_exposure_bias", True),
                ("auto_exposure_bias", 0.78),
                ("override_bloom_intensity", True),
                ("bloom_intensity", 0.035),
                ("override_vignette_intensity", True),
                ("vignette_intensity", 0.03),
                ("override_color_saturation", True),
                ("color_saturation", unreal.Vector4(0.80, 0.82, 0.82, 1.0)),
                ("override_color_contrast", True),
                ("color_contrast", unreal.Vector4(0.98, 0.98, 0.96, 1.0)),
            ):
                self._set_actor_property(settings, name, value)
            pp.set_editor_property("settings", settings)
        except Exception as exc:
            print(f"OPERATOR_STAGE7_POSTPROCESS_FALLBACK error={exc}")
        camera = unreal.EditorLevelLibrary.spawn_actor_from_class(
            unreal.CineCameraActor,
            unreal.Vector(0, -7500, 4800),
            unreal.Rotator(0, -30, 90),
        )
        camera.set_actor_label("OperatorStage7_Stage7LightingCameraPostProcess_CineCamera_production_operator_view")
        try:
            camera.set_actor_hidden_in_game(True)
            camera.set_is_temporarily_hidden_in_editor(True)
        except Exception:
            pass
        unreal.EditorLevelLibrary.set_level_viewport_camera_info(camera.get_actor_location(), camera.get_actor_rotation())
        try:
            camera.set_actor_location(unreal.Vector(9200, 9200, -900), False, False)
            camera.set_actor_scale3d(unreal.Vector(0.010, 0.010, 0.010))
        except Exception:
            pass

    def _build_operator_stage7_scene(self) -> None:
        if self.city != "seoul":
            raise RuntimeError(f"Operator Stage 7 is locked to seoul, got {self.city}")
        self._load_operator_stage7_profile()
        self._build_operator_stage6_scene()
        self._build_operator_stage7_road_production_layer()
        self._build_operator_stage7_curb_sidewalk_layer()
        self._build_operator_stage7_imagegen_surface_geometry_layer()
        self._build_operator_stage7_sidewalk_slab_detail()
        self._build_operator_stage7_signal_vehicle_hardware_layer()
        self._build_operator_stage7_facade_depth_layer()
        self._build_operator_stage7_camera_context_mesh_layer()
        self._build_operator_stage7_camera_visible_production_detail_layer()
        self._build_operator_stage7_reference_camera_corridor_layer()
        self._build_operator_stage7_seoul_photo_reference_layer()
        self._build_operator_stage7_background_fill()
        self._soften_operator_stage7_inherited_context()
        self._disable_operator_stage7_legacy_lighting()
        marker = self._cube(
            "OperatorStage7_Stage1To6ReadableRuntimeState_NoTrafficZoneImageCard_fixture_state_marker",
            (0, -190, 172),
            (1.40, 0.050, 0.020),
            "green_signal",
        )
        self._tag_operator_stage7_asset(marker, "Stage1To6ReadableRuntimeState", "NoTrafficZoneImageCard")
        self._spawn_runtime_controller()
        self._move_operator_stage7_runtime_controller_visuals()
        self._configure_operator_stage7_lighting_camera()

    def _build_scene(self) -> None:
        if self.operator_stage7:
            self._build_operator_stage7_scene()
            return
        if self.operator_stage6:
            self._build_operator_stage6_scene()
            return
        if self.operator_stage3:
            self._build_operator_stage3_scene()
            return
        if self.operator_stage2:
            self._build_operator_stage2_scene()
            return
        if self.operator_stage1:
            self._build_operator_stage1_scene()
            return

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
            self._cube(f"RoadOnlyRenderer_{self.city}_signal_pole_placeholder_{idx}", (x, y, 125), (0.06, 0.06, 1.4), "signal")
            self._cube(f"RoadOnlyRenderer_{self.city}_signal_head_red_green_placeholder_{idx}", (x, y, 315), (0.28, 0.07, 0.16), "signal")

        if self.city == "london":
            self._build_london_photoreal_fidelity_layer()
            self._build_london_photoreal_scene_layer()
            self._build_london_photoreal_scene_pass2()
            self._build_london_real_geometry_layer()
            self._build_london_final_target_match_layer()
            self._build_london_target_convergence_atlas_layer()
            self._build_london_target_hero_depth_layer()
            self._build_london_target_hero3_pbr_geometry_layer()
            self._build_london_target_hero4_realism_layer()
            self._build_london_target_hero5_visual_acceptance_layer()
            self._build_london_target_hero6_camera_visible_tone_layer()
            self._build_london_final_beauty_layer()
        elif self.city == "seoul":
            self._build_seoul_photoreal_fidelity_layer()
            self._build_seoul_real_geometry_layer()
            self._build_seoul_final_beauty_layer()
        elif self.city == "new_york":
            self._build_new_york_photoreal_fidelity_layer()
            self._build_new_york_real_geometry_layer()
            self._build_new_york_final_beauty_layer()
        elif self.city == "paris":
            self._build_paris_photoreal_fidelity_layer()
            self._build_paris_real_geometry_layer()
            self._build_paris_final_beauty_layer()

        # Lighting/camera proof. Use movable lights so the editor viewport is visible without a baked-lighting pass.
        light = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(-800, -900, 1200), unreal.Rotator(-48, -35, 0))
        light.set_actor_label(f"RoadOnlyRenderer_{self.city}_daylight_controlled_exposure")
        light_comp = light.get_component_by_class(unreal.DirectionalLightComponent)
        if light_comp:
            light_comp.set_editor_property("intensity", 3.2)
            try:
                light_comp.set_editor_property("cast_shadows", False)
            except Exception:
                pass
            try:
                light_comp.set_editor_property("light_source_angle", 6.0)
            except Exception:
                pass
            light_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
        sky = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 700), unreal.Rotator(0, 0, 0))
        sky.set_actor_label(f"RoadOnlyRenderer_{self.city}_movable_skylight")
        sky_comp = sky.get_component_by_class(unreal.SkyLightComponent)
        if sky_comp:
            sky_comp.set_editor_property("intensity", 4.0)
            sky_comp.set_mobility(unreal.ComponentMobility.MOVABLE)
        camera = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.CineCameraActor, unreal.Vector(-1250, -1150, 900), unreal.Rotator(0, -28, 42))
        camera.set_actor_label(f"RoadOnlyRenderer_{self.city}_proof_camera")
        unreal.EditorLevelLibrary.set_level_viewport_camera_info(camera.get_actor_location(), camera.get_actor_rotation())
        self._spawn_renderer_snapshot_visual_layer()
        self._spawn_runtime_controller()

    def _build_new_york_photoreal_fidelity_layer(self) -> None:
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        self._cube(
            "ImageGenNewYork_wet_intersection_atlas_surface_visible",
            (-80, -220, 70),
            (25.0, 11.0, 0.012),
            "custom_imagegen_new_york_wet_intersection_atlas_balanced",
        )
        self._plane_actor(
            "ImageGenNewYork_manhattan_backplate_plane_visible",
            (320, 1450, 1040),
            (90.0, 16.0, 1.0),
            "custom_imagegen_new_york_manhattan_backplate_balanced",
            rotation=(90, 0, 0),
        )
        self._cube("PhotorealRoadKit_new_york_patched_asphalt_surface_visible", (0, 0, 63), (18.2, 4.85, 0.018), "photoreal_asphalt")
        self._cube("PhotorealRoadKit_new_york_cross_street_utility_patch_visible", (0, 0, 68), (5.7, 15.7, 0.014), "photoreal_asphalt")
        self._cube("PhotorealRoadKit_new_york_red_bus_only_lane_visible", (0, -190, 76), (17.3, 0.70, 0.014), "photoreal_bus_lane")
        self._cube("PhotorealRoadKit_new_york_green_bike_conflict_zone_visible", (0, 190, 78), (17.1, 0.48, 0.014), "target_cycle_box")
        self._cube("PhotorealRoadKit_new_york_double_yellow_centerline_visible", (0, 0, 94), (16.9, 0.055, 0.014), "photoreal_yellow_worn")
        self._cube("PhotorealRoadKit_new_york_double_yellow_centerline_shadow_visible", (0, -18, 95), (16.9, 0.045, 0.012), "target_shadow_grime")

        for idx, x in enumerate([-440, -320, -200, -80, 40, 160, 280, 400]):
            self._cube(f"PhotorealRoadKit_new_york_continental_crosswalk_near_bar_{idx}", (x, -318, 104 + idx), (0.30, 1.22, 0.012), "photoreal_decal_zebra")
            self._cube(f"PhotorealRoadKit_new_york_continental_crosswalk_far_bar_{idx}", (x, 318, 105 + idx), (0.30, 1.22, 0.012), "photoreal_decal_zebra")

        self._cube("PhotorealRoadKit_new_york_stop_bar_near_worn_visible", (0, -382, 116), (16.5, 0.075, 0.012), "photoreal_white_worn")
        self._cube("PhotorealRoadKit_new_york_stop_bar_far_worn_visible", (0, 382, 117), (16.5, 0.075, 0.012), "photoreal_white_worn")
        self._road_text("PhotorealRoadKit_new_york_road_text_ONLY_visible", "ONLY", (-470, -250, 128), 64, material_name="photoreal_white_worn")
        self._road_text("PhotorealRoadKit_new_york_road_text_BUS_ONLY_visible", "BUS ONLY", (455, -190, 128), 58, material_name="photoreal_white_worn")

        for idx, (x, y) in enumerate([(-620, -95), (-350, 115), (-110, -210), (210, 80), (495, -145), (680, 255)]):
            self._mesh_actor(f"PhotorealRoadKit_new_york_utility_plate_mesh_{idx}", f"{mesh_root}/utility_cover_round", (x, y, 124), (0.000024, 0.000024, 0.000024), "photoreal_metal")
        for idx, (x, y, sx, sy) in enumerate([(-520, -35, 2.6, 0.05), (-250, 165, 1.9, 0.045), (90, -135, 2.2, 0.04), (390, 210, 2.7, 0.05), (640, -270, 1.55, 0.04)]):
            self._cube(f"PhotorealRoadKit_new_york_tar_seam_{idx}", (x, y, 130 + idx), (sx, sy, 0.01), "photoreal_crack_overlay")
        for idx, (x, y, sx, sy) in enumerate([(-405, -180, 1.85, 0.26), (260, 135, 1.45, 0.24), (25, 330, 2.4, 0.18)]):
            self._cube(f"PhotorealRoadKit_new_york_asphalt_oil_polish_{idx}", (x, y, 137 + idx), (sx, sy, 0.01), "target_road_glint")

        self._cube("PhotorealRoadKit_new_york_concrete_slab_sidewalk_north_visible", (0, 612, 104), (18.6, 0.88, 0.035), "photoreal_sidewalk")
        self._cube("PhotorealRoadKit_new_york_concrete_slab_sidewalk_south_visible", (0, -612, 104), (18.6, 0.88, 0.035), "photoreal_sidewalk")
        for idx, (x, y, rot) in enumerate([(-850, -455, 0), (850, -455, 180), (-850, 455, 0), (850, 455, 180)]):
            signal_x = x + (95 if rot == 0 else -95)
            self._cube(f"PhotorealRoadKit_new_york_signal_pole_black_{idx}", (x, y, 212), (0.055, 0.055, 1.85), "photoreal_metal")
            self._cube(f"PhotorealRoadKit_new_york_yellow_signal_head_{idx}", (signal_x, y, 390), (0.22, 0.075, 0.34), "photoreal_yellow_worn")
            self._cube(f"PhotorealRoadKit_new_york_signal_head_dark_visor_{idx}", (signal_x, y - 7, 390), (0.24, 0.035, 0.38), "photoreal_metal")
            self._mesh_actor(
                f"PhotorealRoadKit_new_york_high_fidelity_signal_head_mesh_{idx}",
                f"{mesh_root}/signal_head_uk_high_fidelity",
                (signal_x, y - 12, 392),
                (0.000040, 0.000040, 0.000040),
                "signal",
            )

        for idx, x in enumerate([-720, -360, 0, 360, 720]):
            self._cube(f"PhotorealRoadKit_new_york_curb_grime_shadow_{idx}", (x, -560, 145 + idx), (1.75, 0.045, 0.01), "target_shadow_grime")

    def _build_new_york_real_geometry_layer(self) -> None:
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        self._cube("NewYorkRealGeometry_new_york_distant_sky_volume", (120, 1500, 980), (24.0, 0.050, 3.2), "background")
        self._cube("NewYorkRealGeometry_new_york_distant_roofline_depth_band", (120, 1080, 690), (18.0, 0.060, 0.72), "photoreal_sidewalk")
        self._plane_actor(
            "NewYorkRealGeometry_new_york_camera_visible_balanced_manhattan_backplate_fill",
            (-40, -520, 700),
            (74.0, -9.4, 1.0),
            "custom_imagegen_new_york_manhattan_backplate_balanced",
            rotation=(90, 0, 0),
        )
        self._cube(
            "NewYorkRealGeometry_new_york_upper_frame_overcast_sky_cap",
            (-40, -545, 1085),
            (22.0, 0.030, 1.70),
            "target_mist_building",
        )
        self._cube("NewYorkRealGeometry_new_york_camera_visible_overcast_sky_fill", (260, 455, 650), (36.0, 0.050, 1.45), "photoreal_sign_plate")
        self._cube("NewYorkRealGeometry_new_york_camera_visible_mist_facade_fill", (420, 430, 310), (1.2, 0.055, 0.34), "photoreal_curb")
        self._cube("NewYorkRealGeometry_new_york_left_camera_edge_building_mass", (-1185, -360, 520), (0.32, 3.20, 2.10), "photoreal_curb")
        self._cube("NewYorkRealGeometry_new_york_right_camera_edge_building_mass", (1185, -320, 530), (0.32, 3.00, 2.05), "photoreal_curb")
        self._city_frontage_module("NewYorkRealGeometry_new_york_left_edge_storefront_infill", -260, 330, 305, "horizon", floors=2, bays=4)
        self._city_frontage_module("NewYorkRealGeometry_new_york_left_capture_edge_facade_infill", -600, -200, 470, "horizon", floors=4, bays=3)
        self._city_frontage_module("NewYorkRealGeometry_new_york_screen_left_capture_edge_facade_infill", 600, -200, 470, "horizon", floors=4, bays=3)
        for idx, (x, z, floors, bays) in enumerate([(-1260, 392, 4, 4), (-780, 405, 4, 4), (-300, 430, 5, 5), (190, 410, 4, 4), (680, 435, 5, 4), (1100, 415, 4, 3)]):
            self._city_frontage_module(f"NewYorkRealGeometry_new_york_camera_frontage_block_{idx}", x, 470, z, "horizon", floors=floors, bays=bays)
        for idx, (x, z, sx, sz) in enumerate([(-820, 515, 1.55, 0.95), (-310, 560, 1.35, 1.12), (250, 535, 1.55, 0.98), (760, 575, 1.28, 1.18)]):
            self._cube(f"NewYorkRealGeometry_new_york_midground_facade_depth_mass_{idx}", (x, 525, z), (sx, 0.070, sz), "photoreal_sidewalk")
            self._cube(f"NewYorkRealGeometry_new_york_midground_warm_window_band_{idx}", (x, 510, z + 120), (sx * 0.62, 0.020, 0.12), "photoreal_warm_window")
        for idx, y in enumerate([-560, 560]):
            self._mesh_actor(f"NewYorkRealGeometry_new_york_beveled_curb_mesh_{idx}", f"{mesh_root}/curb_beveled_module", (-540, y, 162), (1.25, 1.0, 1.0), "photoreal_curb")
            self._mesh_actor(f"NewYorkRealGeometry_new_york_beveled_curb_mesh_{idx + 2}", f"{mesh_root}/curb_beveled_module", (0, y, 162), (1.25, 1.0, 1.0), "photoreal_curb")
            self._mesh_actor(f"NewYorkRealGeometry_new_york_beveled_curb_mesh_{idx + 4}", f"{mesh_root}/curb_beveled_module", (540, y, 162), (1.25, 1.0, 1.0), "photoreal_curb")
        for row, y in enumerate([-760, -690, -620]):
            for col, x in enumerate(range(-940, 941, 180)):
                mat = "photoreal_sidewalk" if (row + col) % 2 else "photoreal_curb"
                self._cube(f"NewYorkRealGeometry_new_york_foreground_pavement_tile_{row}_{col}", (x, y, 168 + row), (0.66, 0.25, 0.018), mat)
        for idx, (x, y, z, side, floors, bays) in enumerate([
            (-820, 690, 520, "horizon", 5, 4),
            (-300, 715, 555, "horizon", 6, 5),
            (260, 700, 535, "horizon", 5, 4),
            (820, 680, 575, "horizon", 7, 4),
            (-1110, -210, 520, "side", 5, 4),
            (1110, -120, 540, "side", 6, 4),
        ]):
            self._city_frontage_module(f"NewYorkRealGeometry_new_york_manhattan_storefront_module_{idx}", x, y, z, side, floors=floors, bays=bays)
        for idx, (x, y) in enumerate([(-760, -555), (710, -545), (-650, 545), (760, 535)]):
            self._cube(f"NewYorkRealGeometry_new_york_traffic_cabinet_{idx}", (x, y, 202), (0.24, 0.13, 0.42), "photoreal_metal")
            self._cube(f"NewYorkRealGeometry_new_york_cabinet_door_panel_{idx}", (x, y - 9, 204), (0.19, 0.018, 0.30), "photoreal_sign_plate")
        for idx, (x, y, rot) in enumerate([(-910, -585, 0), (-500, -590, 0), (460, -590, 180), (910, -580, 180)]):
            self._mesh_actor(f"NewYorkRealGeometry_new_york_pedestrian_railing_mesh_{idx}", f"{mesh_root}/london_pedestrian_railing_high_fidelity", (x, y, 178), (0.000030, 0.000030, 0.000034), "photoreal_metal", rotation=(0, 0, rot))
        for idx, (x, y, rot) in enumerate([(-980, -520, 0), (980, -520, 180), (-980, 520, 0), (980, 520, 180)]):
            self._mesh_actor(f"NewYorkRealGeometry_new_york_streetlight_mesh_{idx}", f"{mesh_root}/london_streetlight_high_fidelity", (x, y, 175), (0.000026, 0.000026, 0.000032), "photoreal_metal", rotation=(0, 0, rot))
            self._mesh_actor(f"NewYorkRealGeometry_new_york_signal_pole_mesh_{idx}", f"{mesh_root}/signal_pole_slim", (x + (-55 if rot else 55), y, 170), (0.90, 0.90, 1.30), "photoreal_metal")
        for idx, (x, y, sx, sy) in enumerate([(-520, -520, 2.6, 0.055), (-80, -612, 1.7, 0.045), (420, -540, 2.2, 0.05), (650, 548, 1.9, 0.05)]):
            self._cube(f"NewYorkRealGeometry_new_york_curb_contact_shadow_{idx}", (x, y, 184 + idx), (sx, sy, 0.012), "target_shadow_grime")
        for idx, (x, y) in enumerate([(-520, -235), (120, 150), (610, -70)]):
            self._city_vehicle_proxy(f"NewYorkRealGeometry_new_york_readable_vehicle_{idx}", x, y, 172)

    def _build_new_york_final_beauty_layer(self) -> None:
        """Final New York frame using the balanced photoreal atlases plus real props."""
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        self._cube(
            "NewYorkFinal_new_york_manhattan_backplate_card",
            (-90, 610, 655),
            (36.0, 0.010, 6.25),
            "custom_imagegen_new_york_manhattan_backplate_balanced",
        )
        self._cube(
            "NewYorkFinal_new_york_wet_intersection_road_card",
            (0, -250, 426),
            (25.6, 11.2, 0.002),
            "custom_imagegen_new_york_wet_intersection_atlas",
        )
        for idx, (x, y, rot) in enumerate([(-720, -690, 0), (-420, -690, 0), (-120, -690, 0), (220, -690, 0), (560, -690, 0)]):
            self._mesh_actor(
                f"NewYorkFinal_new_york_foreground_black_railing_{idx}",
                f"{mesh_root}/london_pedestrian_railing_high_fidelity",
                (x, y, 438),
                (0.000026, 0.000026, 0.000028),
                "photoreal_metal",
                rotation=(0, 0, rot),
            )
        for idx, (x, y, z) in enumerate([(-700, -530, 590), (-180, -480, 610), (420, -430, 600)]):
            self._mesh_actor(
                f"NewYorkFinal_new_york_signal_head_mesh_{idx}",
                f"{mesh_root}/signal_head_uk_high_fidelity",
                (x, y, z),
                (0.000036, 0.000036, 0.000036),
                "signal",
            )
            self._mesh_actor(
                f"NewYorkFinal_new_york_signal_pole_mesh_{idx}",
                f"{mesh_root}/signal_pole_slim",
                (x - 10, y + 8, 465),
                (0.000032, 0.000032, 0.000040),
                "photoreal_metal",
            )
        for idx, (x, y) in enumerate([(-650, -620), (650, -610), (-760, 365), (760, 370)]):
            self._mesh_actor(
                f"NewYorkFinal_new_york_streetlight_mesh_{idx}",
                f"{mesh_root}/london_streetlight_high_fidelity",
                (x, y, 438),
                (0.000024, 0.000024, 0.000030),
                "photoreal_metal",
            )

    def _build_paris_photoreal_fidelity_layer(self) -> None:
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        self._plane_actor("PhotorealRoadKit_paris_imagegen_wet_intersection_atlas_plane_visible", (-230, -300, 71), (34.0, 16.0, 1.0), "custom_imagegen_paris_wet_intersection_atlas")
        self._cube("PhotorealRoadKit_paris_worn_asphalt_boulevard_surface_visible", (0, 0, 63), (17.7, 4.55, 0.018), "photoreal_asphalt")
        self._cube("PhotorealRoadKit_paris_cross_boulevard_asphalt_patch_visible", (0, 0, 68), (5.35, 15.1, 0.014), "photoreal_asphalt")
        self._cube("PhotorealRoadKit_paris_granite_stone_curb_north_visible", (0, 535, 94), (18.2, 0.20, 0.09), "photoreal_curb")
        self._cube("PhotorealRoadKit_paris_granite_stone_curb_south_visible", (0, -535, 94), (18.2, 0.20, 0.09), "photoreal_curb")
        self._cube("PhotorealRoadKit_paris_refuge_island_stone_visible", (0, 0, 108), (0.78, 2.15, 0.08), "photoreal_curb")
        self._cube("PhotorealRoadKit_paris_red_bus_lane_context_visible", (0, -190, 82), (16.4, 0.54, 0.014), "photoreal_bus_lane")
        self._cube("PhotorealRoadKit_paris_muted_green_bike_lane_visible", (0, 190, 84), (16.4, 0.42, 0.014), "target_cycle_box")

        for idx, x in enumerate([-420, -280, -140, 0, 140, 280, 420]):
            self._cube(f"PhotorealRoadKit_paris_european_zebra_crossing_bar_{idx}", (x, -306, 112 + idx), (0.28, 1.10, 0.012), "photoreal_decal_zebra")
            self._cube(f"PhotorealRoadKit_paris_far_european_zebra_crossing_bar_{idx}", (x, 306, 113 + idx), (0.28, 1.10, 0.012), "photoreal_decal_zebra")

        self._road_text("PhotorealRoadKit_paris_bus_lane_text_BUS_visible", "BUS", (-480, -190, 132), 60, material_name="photoreal_white_worn")
        self._road_text("PhotorealRoadKit_paris_bike_lane_glyph_strip_visible", "VELO", (430, 190, 132), 52, material_name="photoreal_white_worn")
        self._cube("PhotorealRoadKit_paris_short_dashed_lane_line_near_visible", (0, -75, 126), (15.5, 0.035, 0.012), "photoreal_white_worn")
        self._cube("PhotorealRoadKit_paris_short_dashed_lane_line_far_visible", (0, 75, 127), (15.5, 0.035, 0.012), "photoreal_white_worn")

        for idx, (x, y) in enumerate([(-640, -470), (-510, -470), (510, 470), (640, 470)]):
            self._mesh_actor(f"PhotorealRoadKit_paris_curb_bollard_mesh_{idx}", f"{mesh_root}/keep_left_bollard", (x, y, 120), (0.72, 0.72, 0.88), "photoreal_metal")
        for idx, (x, y) in enumerate([(-835, -430), (835, -430), (-835, 430), (835, 430)]):
            self._cube(f"PhotorealRoadKit_paris_slim_signal_pole_{idx}", (x, y, 205), (0.045, 0.045, 1.65), "photoreal_metal")
            self._cube(f"PhotorealRoadKit_paris_compact_signal_head_{idx}", (x, y, 365), (0.19, 0.065, 0.28), "photoreal_metal")
            self._cube(f"PhotorealRoadKit_paris_green_signal_lens_{idx}", (x, y - 7, 365), (0.055, 0.018, 0.055), "green_signal")
            self._mesh_actor(
                f"PhotorealRoadKit_paris_high_fidelity_signal_head_mesh_{idx}",
                f"{mesh_root}/signal_head_uk_high_fidelity",
                (x, y - 12, 365),
                (0.000040, 0.000040, 0.000040),
                "signal",
            )

        for idx, (x, y, sx, sy) in enumerate([(-520, -95, 2.2, 0.045), (-210, 135, 1.65, 0.04), (140, -180, 2.0, 0.04), (485, 220, 1.75, 0.04)]):
            self._cube(f"PhotorealRoadKit_paris_worn_asphalt_tar_seam_{idx}", (x, y, 140 + idx), (sx, sy, 0.01), "photoreal_crack_overlay")
        for idx, (x, y, sx, sy) in enumerate([(-370, -210, 1.55, 0.22), (280, 155, 1.35, 0.20), (40, 330, 1.95, 0.16)]):
            self._cube(f"PhotorealRoadKit_paris_subtle_wet_road_glint_{idx}", (x, y, 146 + idx), (sx, sy, 0.01), "target_road_glint")
        for idx, y in enumerate([-580, 580]):
            self._cube(f"PhotorealRoadKit_paris_stone_curb_contact_grime_{idx}", (0, y, 150 + idx), (16.8, 0.045, 0.01), "target_shadow_grime")
        self._plane_actor(
            "PhotorealRoadKit_paris_single_imagegen_boulevard_backplate_plane_visible",
            (-40, 460, 455),
            (36.0, 10.5, 1.0),
            "custom_imagegen_paris_overcast_boulevard_backplate",
            rotation=(90, 0, 0),
        )

    def _build_paris_real_geometry_layer(self) -> None:
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        self._cube("ParisRealGeometry_paris_distant_roofline_depth_band", (120, 1080, 705), (17.8, 0.060, 0.68), "photoreal_sidewalk")
        self._cube("ParisRealGeometry_paris_upper_overcast_backdrop_geometry", (40, 430, 845), (24.5, 0.055, 2.30), "background")
        self._cube("ParisRealGeometry_paris_center_camera_visible_stone_frontage_mass", (0, 585, 545), (8.8, 0.090, 2.25), "photoreal_brick")
        self._cube("ParisRealGeometry_paris_center_camera_visible_ground_floor_sign_band", (0, 560, 355), (8.6, 0.040, 0.10), "photoreal_sign_plate")
        for idx, x in enumerate(range(-420, 421, 140)):
            self._cube(f"ParisRealGeometry_paris_center_camera_visible_window_column_{idx}", (x, 552, 540), (0.28, 0.040, 0.62), "photoreal_glass")
            self._cube(f"ParisRealGeometry_paris_center_camera_visible_window_lintel_{idx}", (x, 548, 655), (0.36, 0.035, 0.055), "photoreal_curb")
        self._cube("ParisRealGeometry_paris_left_camera_edge_building_mass", (-1185, -300, 520), (0.30, 2.85, 1.95), "photoreal_brick")
        self._cube("ParisRealGeometry_paris_right_camera_edge_building_mass", (1185, -270, 535), (0.30, 2.85, 2.05), "photoreal_brick")
        self._city_frontage_module("ParisRealGeometry_paris_left_capture_edge_facade_infill", -620, -160, 460, "horizon", floors=4, bays=4)
        self._city_frontage_module("ParisRealGeometry_paris_screen_left_capture_edge_facade_infill", 610, -170, 465, "horizon", floors=4, bays=4)
        for idx, (x, z, floors, bays) in enumerate([
            (-820, 520, 5, 4),
            (-320, 555, 6, 5),
            (240, 530, 5, 4),
            (790, 570, 6, 4),
        ]):
            self._city_frontage_module(f"ParisRealGeometry_paris_midground_storefront_module_{idx}", x, 705, z, "horizon", floors=floors, bays=bays)
        for row, y in enumerate([-760, -690, -620]):
            for col, x in enumerate(range(-900, 901, 180)):
                mat = "photoreal_sidewalk" if (row + col) % 2 else "photoreal_curb"
                self._cube(f"ParisRealGeometry_paris_foreground_sidewalk_slab_{row}_{col}", (x, y, 162 + row), (0.62, 0.24, 0.018), mat)
        for idx, (x, y) in enumerate([(-760, -545), (760, -545), (-700, 545), (720, 545)]):
            self._cube(f"ParisRealGeometry_paris_traffic_cabinet_{idx}", (x, y, 202), (0.22, 0.13, 0.40), "photoreal_metal")
            self._cube(f"ParisRealGeometry_paris_cabinet_label_plate_{idx}", (x, y - 9, 214), (0.17, 0.018, 0.10), "photoreal_sign_plate")
        for idx, (x, y, rot) in enumerate([(-980, -520, 0), (980, -520, 180), (-980, 520, 0), (980, 520, 180)]):
            self._mesh_actor(f"ParisRealGeometry_paris_streetlight_mesh_{idx}", f"{mesh_root}/london_streetlight_high_fidelity", (x, y, 172), (0.000025, 0.000025, 0.000030), "photoreal_metal", rotation=(0, 0, rot))
        for idx, (x, y) in enumerate([(-510, -235), (140, 150), (600, -70)]):
            self._city_vehicle_proxy(f"ParisRealGeometry_paris_readable_vehicle_{idx}", x, y, 172)

    def _build_paris_final_beauty_layer(self) -> None:
        """Final Paris frame using existing ImageGen Paris cards plus real mesh street props."""
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        self._cube(
            "ParisFinal_paris_overcast_boulevard_backplate_card",
            (-90, 610, 655),
            (36.0, 0.010, 6.25),
            "custom_imagegen_paris_overcast_boulevard_backplate",
        )
        self._cube(
            "ParisFinal_paris_left_boulevard_return_card",
            (-1280, 440, 640),
            (13.0, 0.010, 5.85),
            "custom_imagegen_paris_overcast_boulevard_backplate",
        )
        self._cube(
            "ParisFinal_paris_upper_overcast_sky_fill_card",
            (-90, 690, 1030),
            (42.0, 0.010, 2.20),
            "custom_imagegen_paris_overcast_boulevard_backplate",
        )
        self._cube(
            "ParisFinal_paris_wet_intersection_road_card",
            (0, -250, 426),
            (25.6, 11.2, 0.002),
            "custom_imagegen_paris_wet_intersection_atlas",
        )
        for idx, (x, y, rot) in enumerate([(-720, -690, 0), (-420, -690, 0), (-120, -690, 0), (220, -690, 0), (560, -690, 0)]):
            self._mesh_actor(
                f"ParisFinal_paris_foreground_black_railing_{idx}",
                f"{mesh_root}/london_pedestrian_railing_high_fidelity",
                (x, y, 438),
                (0.000017, 0.000017, 0.000019),
                "photoreal_metal",
                rotation=(0, 0, rot),
            )
        for idx, (x, y) in enumerate([(-720, -620), (690, -615)]):
            self._mesh_actor(
                f"ParisFinal_paris_streetlight_mesh_{idx}",
                f"{mesh_root}/london_streetlight_high_fidelity",
                (x, y, 420),
                (0.000012, 0.000012, 0.000016),
                "photoreal_metal",
            )
        for idx, (x, y, z) in enumerate([(-700, -530, 520), (420, -430, 520)]):
            self._mesh_actor(
                f"ParisFinal_paris_signal_head_mesh_{idx}",
                f"{mesh_root}/signal_head_uk_high_fidelity",
                (x, y, z),
                (0.000018, 0.000018, 0.000018),
                "signal",
            )
            self._mesh_actor(
                f"ParisFinal_paris_signal_pole_mesh_{idx}",
                f"{mesh_root}/signal_pole_slim",
                (x - 10, y + 8, 432),
                (0.000020, 0.000020, 0.000028),
                "photoreal_metal",
            )
        for idx, (x, y) in enumerate([(-620, -620), (-500, -620), (500, -615), (620, -615)]):
            self._mesh_actor(
                f"ParisFinal_paris_curb_bollard_mesh_{idx}",
                f"{mesh_root}/keep_left_bollard",
                (x, y, 438),
                (0.72, 0.72, 0.88),
                "photoreal_metal",
            )
        for idx, (x, y, rot) in enumerate([(-550, -610, 0), (0, -615, 0), (550, -610, 0), (-550, 385, 180), (550, 385, 180)]):
            self._mesh_actor(
                f"ParisFinal_paris_beveled_curb_mesh_{idx}",
                f"{mesh_root}/curb_beveled_module",
                (x, y, 430),
                (1.15, 1.0, 0.80),
                "photoreal_curb",
                rotation=(0, 0, rot),
            )
        for idx, (x, y) in enumerate([(-360, -245), (120, 75), (520, -95)]):
            self._mesh_actor(
                f"ParisFinal_paris_drain_grate_mesh_{idx}",
                f"{mesh_root}/drain_grate_rect",
                (x, y, 432),
                (0.34, 0.34, 0.42),
                "photoreal_grime_overlay",
            )
    def _build_seoul_photoreal_fidelity_layer(self) -> None:
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        self._cube(
            "ImageGenSeoul_wet_bus_lane_atlas_surface_visible",
            (-80, -220, 70),
            (18.0, 7.4, 0.012),
            "custom_imagegen_seoul_wet_bus_lane_atlas",
        )
        self._plane_actor(
            "ImageGenSeoul_rainy_intersection_backplate_plane_visible",
            (320, 1450, 1040),
            (14.0, 3.0, 1.0),
            "custom_imagegen_seoul_rainy_intersection_backplate",
            rotation=(90, 0, 0),
        )
        self._cube("PhotorealRoadKit_seoul_wet_patched_asphalt_surface_visible", (0, 0, 63), (18.1, 4.9, 0.018), "photoreal_asphalt")
        self._cube("PhotorealRoadKit_seoul_cross_asphalt_utility_patch_visible", (0, 0, 68), (5.6, 15.4, 0.014), "photoreal_asphalt")
        self._cube("PhotorealRoadKit_seoul_red_bus_priority_corridor_visible", (0, -190, 74), (17.2, 0.76, 0.014), "photoreal_bus_lane")
        self._cube("PhotorealRoadKit_seoul_center_bus_priority_lane_visible", (0, 190, 76), (17.2, 0.55, 0.014), "photoreal_bus_lane")
        self._cube("PhotorealRoadKit_seoul_median_bus_island_concrete_visible", (0, 0, 94), (0.92, 2.7, 0.095), "photoreal_curb")

        for idx, x in enumerate([-420, -280, -140, 0, 140, 280, 420]):
            self._cube(f"PhotorealRoadKit_seoul_wide_zebra_paint_edge_breakup_{idx}", (x, -315, 103 + idx), (0.33, 1.28, 0.012), "photoreal_decal_zebra")
            self._cube(f"PhotorealRoadKit_seoul_far_zebra_paint_edge_breakup_{idx}", (x, 315, 104 + idx), (0.33, 1.28, 0.012), "photoreal_decal_zebra")

        self._cube("PhotorealRoadKit_seoul_thick_stop_line_near_worn_visible", (0, -382, 112), (16.6, 0.09, 0.012), "photoreal_white_worn")
        self._cube("PhotorealRoadKit_seoul_thick_stop_line_far_worn_visible", (0, 382, 113), (16.6, 0.09, 0.012), "photoreal_white_worn")
        self._road_text("PhotorealRoadKit_seoul_road_text_BUS_ONLY_visible", "BUS ONLY", (-520, -190, 126), 62, material_name="photoreal_white_worn")
        self._road_text("PhotorealRoadKit_seoul_hangul_bus_only_text_visible", "\ubc84\uc2a4\uc804\uc6a9", (500, -190, 126), 58, material_name="photoreal_white_worn")

        for idx, (x, y) in enumerate([(-720, 430), (-590, 430), (590, -430), (720, -430)]):
            self._mesh_actor(f"PhotorealRoadKit_seoul_tactile_paving_tile_mesh_{idx}", f"{mesh_root}/tactile_paving_tile", (x, y, 116), (1.0, 1.0, 1.0), "tactile")
        for idx, (x, y) in enumerate([(-610, -130), (-260, 92), (180, -80), (570, 160), (690, -285)]):
            self._mesh_actor(f"PhotorealRoadKit_seoul_utility_cover_mesh_{idx}", f"{mesh_root}/utility_cover_round", (x, y, 118), (0.000022, 0.000022, 0.000022), "photoreal_metal")
        for idx, (x, y, sx, sy) in enumerate([(-460, -40, 2.4, 0.05), (-70, 125, 1.8, 0.04), (360, -205, 2.9, 0.045), (640, 255, 1.65, 0.04)]):
            self._cube(f"PhotorealRoadKit_seoul_utility_cut_tar_seam_{idx}", (x, y, 121 + idx), (sx, sy, 0.01), "photoreal_crack_overlay")
        for idx, (x, y, sx, sy) in enumerate([(-330, -95, 1.75, 0.32), (260, 120, 1.55, 0.28), (40, -350, 2.6, 0.18)]):
            self._cube(f"PhotorealRoadKit_seoul_tire_polish_wet_reflection_{idx}", (x, y, 126 + idx), (sx, sy, 0.01), "target_road_glint")

        for idx, (x, y, rot) in enumerate([(-850, -455, 0), (850, -455, 180), (-850, 455, 0), (850, 455, 180)]):
            self._cube(f"PhotorealRoadKit_seoul_overhead_mast_arm_signal_{idx}_pole", (x, y, 210), (0.055, 0.055, 1.9), "photoreal_metal")
            arm_x = x + (260 if rot == 0 else -260)
            self._cube(f"PhotorealRoadKit_seoul_overhead_mast_arm_signal_{idx}", ((x + arm_x) / 2, y, 405), (1.35, 0.035, 0.035), "photoreal_metal")
            self._cube(f"PhotorealRoadKit_seoul_overhead_mast_arm_signal_{idx}_head", (arm_x, y, 382), (0.22, 0.06, 0.16), "signal")
            self._cube(f"PhotorealRoadKit_seoul_overhead_mast_arm_green_lens_{idx}", (arm_x, y - 6, 390), (0.06, 0.016, 0.055), "green_signal")
            self._mesh_actor(
                f"PhotorealRoadKit_seoul_high_fidelity_signal_head_mesh_{idx}",
                f"{mesh_root}/signal_head_uk_high_fidelity",
                (arm_x, y - 10, 382),
                (0.000040, 0.000040, 0.000040),
                "signal",
            )

        self._cube("PhotorealRoadKit_seoul_concrete_sidewalk_north_context", (0, 610, 104), (18.4, 0.92, 0.035), "photoreal_sidewalk")
        self._cube("PhotorealRoadKit_seoul_concrete_sidewalk_south_context", (0, -610, 104), (18.4, 0.92, 0.035), "photoreal_sidewalk")
        for idx, x in enumerate([-900, -540, -180, 180, 540, 900]):
            self._cube(f"PhotorealRoadKit_seoul_dense_signal_signage_pole_{idx}", (x, 565, 230), (0.045, 0.045, 1.45), "photoreal_metal")
            self._cube(f"PhotorealRoadKit_seoul_bus_corridor_sign_plate_{idx}", (x, 545, 390), (0.18, 0.035, 0.13), "photoreal_white_worn")
        for idx, (x, y, sx, sy) in enumerate([(-520, 470, 2.3, 0.04), (-180, -470, 1.9, 0.035), (420, 472, 2.1, 0.04)]):
            self._cube(f"PhotorealRoadKit_seoul_curb_grime_shadow_{idx}", (x, y, 126 + idx), (sx, sy, 0.01), "target_shadow_grime")

    def _build_seoul_real_geometry_layer(self) -> None:
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        self._cube("SeoulRealGeometry_seoul_distant_sky_volume", (120, 1500, 980), (24.0, 0.050, 3.2), "background")
        self._cube("SeoulRealGeometry_seoul_distant_roofline_depth_band", (120, 1080, 690), (18.0, 0.060, 0.72), "photoreal_sidewalk")
        self._cube("SeoulRealGeometry_seoul_camera_visible_overcast_sky_fill", (260, 455, 650), (36.0, 0.050, 1.45), "photoreal_sign_plate")
        self._cube("SeoulRealGeometry_seoul_camera_visible_mist_facade_fill", (420, 430, 310), (1.2, 0.055, 0.34), "photoreal_curb")
        self._cube("SeoulRealGeometry_seoul_left_camera_edge_building_mass", (-1185, -360, 510), (0.32, 3.20, 2.02), "photoreal_curb")
        self._cube("SeoulRealGeometry_seoul_right_camera_edge_building_mass", (1185, -320, 520), (0.32, 3.00, 2.00), "photoreal_curb")
        self._city_frontage_module("SeoulRealGeometry_seoul_left_edge_storefront_infill", -260, 330, 300, "horizon", floors=2, bays=4)
        self._city_frontage_module("SeoulRealGeometry_seoul_left_capture_edge_facade_infill", -600, -200, 455, "horizon", floors=4, bays=3)
        self._city_frontage_module("SeoulRealGeometry_seoul_screen_left_capture_edge_facade_infill", 600, -200, 455, "horizon", floors=4, bays=3)
        for idx, (x, z, floors, bays) in enumerate([(-1250, 382, 4, 4), (-760, 395, 4, 4), (-290, 420, 5, 5), (210, 405, 4, 4), (690, 430, 5, 4), (1100, 400, 4, 3)]):
            self._city_frontage_module(f"SeoulRealGeometry_seoul_camera_frontage_block_{idx}", x, 470, z, "horizon", floors=floors, bays=bays)
        for idx, (x, z, sx, sz) in enumerate([(-820, 500, 1.55, 0.88), (-260, 545, 1.42, 1.05), (320, 520, 1.48, 0.92), (820, 560, 1.22, 1.10)]):
            self._cube(f"SeoulRealGeometry_seoul_midground_facade_depth_mass_{idx}", (x, 525, z), (sx, 0.070, sz), "photoreal_sidewalk")
            self._cube(f"SeoulRealGeometry_seoul_midground_warm_window_band_{idx}", (x, 510, z + 112), (sx * 0.62, 0.020, 0.12), "photoreal_warm_window")
        for idx, y in enumerate([-160, 160]):
            self._cube(f"SeoulRealGeometry_seoul_station_platform_curb_{idx}", (0, y, 154), (1.15, 0.26, 0.12), "photoreal_curb")
            self._cube(f"SeoulRealGeometry_seoul_station_platform_tactile_strip_{idx}", (0, y + (42 if y < 0 else -42), 166), (1.02, 0.055, 0.018), "tactile")
        for idx, (x, y) in enumerate([(-240, -165), (0, -165), (240, -165), (-240, 165), (0, 165), (240, 165)]):
            self._mesh_actor(f"SeoulRealGeometry_seoul_median_platform_railing_{idx}", f"{mesh_root}/london_pedestrian_railing_high_fidelity", (x, y, 170), (0.000024, 0.000024, 0.000028), "photoreal_metal")
        for row, y in enumerate([-760, -690, -620]):
            for col, x in enumerate(range(-900, 901, 180)):
                mat = "photoreal_sidewalk" if (row + col) % 2 else "photoreal_curb"
                self._cube(f"SeoulRealGeometry_seoul_foreground_sidewalk_slab_{row}_{col}", (x, y, 160 + row), (0.62, 0.25, 0.018), mat)
        self._cube("SeoulRealGeometry_seoul_foreground_left_sidewalk_apron", (-720, -835, 170), (3.8, 0.42, 0.025), "photoreal_curb")
        self._cube("SeoulRealGeometry_seoul_foreground_left_tactile_warning_strip", (-720, -800, 176), (3.2, 0.055, 0.016), "tactile")
        self._cube("SeoulRealGeometry_seoul_screen_left_foreground_sidewalk_apron", (220, -480, 162), (3.6, 0.48, 0.025), "photoreal_curb")
        self._cube("SeoulRealGeometry_seoul_screen_left_tactile_warning_strip", (220, -438, 168), (3.0, 0.055, 0.016), "tactile")
        for idx, (x, y, z, side, floors, bays) in enumerate([
            (-780, 700, 500, "horizon", 4, 4),
            (-220, 720, 540, "horizon", 5, 5),
            (360, 695, 515, "horizon", 4, 4),
            (910, 675, 555, "horizon", 5, 4),
            (-1115, -160, 500, "side", 4, 4),
            (1115, -100, 520, "side", 5, 4),
        ]):
            self._city_frontage_module(f"SeoulRealGeometry_seoul_midground_storefront_module_{idx}", x, y, z, side, floors=floors, bays=bays)
        for idx, (x, y) in enumerate([(-760, 545), (760, 545), (-720, -545), (720, -545)]):
            self._cube(f"SeoulRealGeometry_seoul_traffic_cabinet_{idx}", (x, y, 200), (0.24, 0.14, 0.40), "photoreal_metal")
            self._cube(f"SeoulRealGeometry_seoul_cabinet_label_plate_{idx}", (x, y - 10, 214), (0.18, 0.018, 0.10), "photoreal_sign_plate")
        for idx, (x, y) in enumerate([(-620, -575), (-120, -575), (420, -575), (860, 535)]):
            self._cube(f"SeoulRealGeometry_seoul_bus_stop_sign_{idx}", (x, y, 280), (0.16, 0.026, 0.34), "photoreal_sign_plate")
            self._mesh_actor(f"SeoulRealGeometry_seoul_bus_stop_pole_{idx}", f"{mesh_root}/signal_pole_slim", (x, y, 170), (0.65, 0.65, 1.05), "photoreal_metal")
        for idx, (x, y, rot) in enumerate([(-980, -520, 0), (980, -520, 180), (-980, 520, 0), (980, 520, 180)]):
            self._mesh_actor(f"SeoulRealGeometry_seoul_streetlight_mesh_{idx}", f"{mesh_root}/london_streetlight_high_fidelity", (x, y, 172), (0.000025, 0.000025, 0.000030), "photoreal_metal", rotation=(0, 0, rot))
        for idx, (x, y, sx, sy) in enumerate([(-580, -535, 2.5, 0.055), (-140, -615, 1.8, 0.045), (420, -540, 2.2, 0.05), (650, 548, 1.9, 0.05)]):
            self._cube(f"SeoulRealGeometry_seoul_curb_contact_shadow_{idx}", (x, y, 184 + idx), (sx, sy, 0.012), "target_shadow_grime")
        for idx, (x, y, mat) in enumerate([(-520, -235, "queue_vehicle_body"), (120, 150, "bus_lane"), (610, -70, "queue_vehicle_body")]):
            self._city_vehicle_proxy(f"SeoulRealGeometry_seoul_readable_vehicle_{idx}", x, y, 172, material_name=mat)

    def _build_seoul_final_beauty_layer(self) -> None:
        """Final Seoul frame using the rainy Seoul cards plus real mesh street props."""
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        self._plane_actor(
            "SeoulFinal_seoul_rainy_intersection_backplate_card",
            (-90, 610, 655),
            (-36.0, 6.25, 1.0),
            "custom_imagegen_seoul_rainy_intersection_backplate",
            rotation=(90, 0, 0),
        )
        self._plane_actor(
            "SeoulFinal_seoul_left_rainy_intersection_return_card",
            (-1280, 440, 640),
            (-13.0, 5.85, 1.0),
            "custom_imagegen_seoul_rainy_intersection_backplate",
            rotation=(90, 0, 0),
        )
        self._plane_actor(
            "SeoulFinal_seoul_upper_rainy_sky_fill_card",
            (-90, 690, 1030),
            (-42.0, 2.20, 1.0),
            "custom_imagegen_seoul_rainy_intersection_backplate",
            rotation=(90, 0, 0),
        )
        self._plane_actor(
            "SeoulFinal_seoul_wet_bus_lane_road_card",
            (0, -250, 426),
            (-25.6, 11.2, 1.0),
            "custom_imagegen_seoul_wet_bus_lane_atlas",
        )
        self._mesh_actor(
            "SeoulFinal_seoul_foreground_black_railing_0",
            f"{mesh_root}/london_pedestrian_railing_high_fidelity",
            (5000, 5000, -500),
            (0.000020, 0.000020, 0.000022),
            "signal",
        )
        self._mesh_actor(
            "SeoulFinal_seoul_signal_head_mesh_0",
            f"{mesh_root}/signal_head_uk_high_fidelity",
            (5050, 5000, -500),
            (0.000022, 0.000022, 0.000022),
            "signal",
        )
        self._mesh_actor(
            "SeoulFinal_seoul_signal_pole_mesh_0",
            f"{mesh_root}/signal_pole_slim",
            (5100, 5000, -500),
            (0.000024, 0.000024, 0.000032),
            "photoreal_metal",
        )
        for idx, (x, y) in enumerate([(-760, 365), (760, 370), (-420, 305), (420, 310)]):
            self._mesh_actor(
                f"SeoulFinal_seoul_streetlight_mesh_{idx}",
                f"{mesh_root}/london_streetlight_high_fidelity",
                (x, y, 430),
                (0.000010, 0.000010, 0.000014),
                "photoreal_metal",
            )
        for idx, (x, y) in enumerate([(-360, -245), (120, 75), (520, -95)]):
            self._mesh_actor(
                f"SeoulFinal_seoul_drain_grate_mesh_{idx}",
                f"{mesh_root}/drain_grate_rect",
                (x, y, 432),
                (0.92, 0.92, 1.0),
                "photoreal_metal",
            )
        self._mesh_actor(
            "SeoulFinal_seoul_beveled_curb_mesh_0",
            f"{mesh_root}/curb_beveled_module",
            (5150, 5000, -500),
            (1.15, 1.0, 0.80),
            "photoreal_curb",
        )
        for idx, (x, y) in enumerate([(-260, -165), (180, -80), (570, 160)]):
            self._mesh_actor(
                f"SeoulFinal_seoul_utility_cover_mesh_{idx}",
                f"{mesh_root}/utility_cover_round",
                (x, y, 432),
                (0.000026, 0.000026, 0.000026),
                "photoreal_metal",
            )
        self._mesh_actor(
            "SeoulFinal_seoul_tactile_tile_mesh_0",
            f"{mesh_root}/tactile_paving_tile",
            (5200, 5000, -500),
            (0.95, 0.95, 1.0),
            "tactile",
        )

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
            self._mesh_actor(f"PhotorealRoadKit_london_utility_cover_mesh_{idx}", f"{mesh_root}/utility_cover_round", (x, y, 98), (0.000022, 0.000022, 0.000022), "photoreal_metal")
        for idx, (x, y) in enumerate([(-790, -500), (790, 500), (-610, 420)]):
            self._mesh_actor(f"PhotorealRoadKit_london_drain_grate_mesh_{idx}", f"{mesh_root}/drain_grate_rect", (x, y, 98), (0.000022, 0.000022, 0.000022), "photoreal_metal")
        for idx, (x, y) in enumerate([(-80, -70), (80, 70)]):
            self._mesh_actor(f"PhotorealRoadKit_london_keep_left_bollard_mesh_{idx}", f"{mesh_root}/keep_left_bollard", (x, y, 125), (1.0, 1.0, 1.0), "photoreal_white_worn")
        for idx, (x, y) in enumerate([(-820, -430), (820, -430), (-820, 430), (820, 430)]):
            self._mesh_actor(f"PhotorealRoadKit_london_signal_pole_mesh_{idx}", f"{mesh_root}/signal_pole_slim", (x, y, 100), (0.000022, 0.000022, 0.000022), "photoreal_metal")
            self._mesh_actor(f"PhotorealRoadKit_london_uk_black_signal_head_mesh_{idx}", f"{mesh_root}/signal_head_uk_high_fidelity", (x, y, 295), (0.000022, 0.000022, 0.000022), "signal")
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
            self._mesh_actor(f"PhotorealScene_london_brick_shopfront_left_{idx}", f"{mesh_root}/london_shopfront_high_fidelity", (x, -1120, 100), (0.000062, 0.000062, 0.000062 + height * 0.000005), "photoreal_brick")
            self._mesh_actor(f"PhotorealScene_london_window_strip_left_{idx}", f"{mesh_root}/london_window_strip_high_fidelity", (x, -1145, 245 + height * 15), (0.000058, 0.000058, 0.000058), "photoreal_glass")
        for idx, x in enumerate([-760, -360, 80, 520, 900]):
            height = [3.1, 2.7, 3.9, 3.4, 2.9][idx]
            self._mesh_actor(f"PhotorealScene_london_brick_shopfront_right_{idx}", f"{mesh_root}/london_shopfront_high_fidelity", (x, 1120, 100), (0.000062, 0.000062, 0.000062 + height * 0.000005), "photoreal_brick")
            self._mesh_actor(f"PhotorealScene_london_window_strip_right_{idx}", f"{mesh_root}/london_window_strip_high_fidelity", (x, 1145, 245 + height * 15), (0.000058, 0.000058, 0.000058), "photoreal_glass")
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


    def _build_london_photoreal_scene_pass2(self) -> None:
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        # Scene pass 2: denser, camera-readable photoreal dressing with CC0 material seam.
        # Large decal planes are intentionally in the proof camera frustum so visual acceptance is meaningful.
        for idx, (x, y, sx, sy) in enumerate([(-520,-315,2.4,.62),(520,315,2.4,.62),(-310,330,1.7,.52),(310,-330,1.7,.52)]):
            self._cube(f"PhotorealScenePass2_london_worn_zebra_crossing_decal_{idx}", (x, y, 141 + idx), (sx, sy, 0.012), "photoreal_decal_zebra")
        for idx, (x, y, mat) in enumerate([(-220,-110,"photoreal_decal_arrow"),(260,128,"photoreal_decal_arrow")]):
            self._cube(f"PhotorealScenePass2_london_directional_lane_arrow_decal_{idx}", (x, y, 146 + idx), (1.2, 0.68, 0.012), mat)
        for idx, (x, y, sx, sy) in enumerate([(-690, -55, 1.7, .35),(-360, 210, 1.2, .25),(120,-245,1.55,.32),(540,50,1.25,.22),(720,-255,.9,.18)]):
            self._cube(f"PhotorealScenePass2_london_asphalt_crack_overlay_visible_{idx}", (x, y, 151 + idx), (sx, sy, 0.01), "photoreal_crack_overlay")
        for idx, (x, y, sx, sy) in enumerate([(-420,-420,1.4,.18),(0,420,1.7,.2),(430,-410,1.1,.16),(-710,390,1.3,.18)]):
            self._cube(f"PhotorealScenePass2_london_curb_grime_decal_visible_{idx}", (x, y, 153 + idx), (sx, sy, 0.01), "photoreal_grime_overlay")
        # Vertical detail: lamps, railings, CCTV and signal visors break the toy-block silhouette.
        for idx, (x, y, rot) in enumerate([(-850,-555,0),(50,-555,0),(850,-555,0),(-650,555,180),(280,555,180),(940,555,180)]):
            self._mesh_actor(f"PhotorealScenePass2_london_streetlight_proxy_{idx}", f"{mesh_root}/london_streetlight_high_fidelity", (x, y, 108), (0.000022, 0.000022, 0.000022), "photoreal_metal", rotation=(0,0,rot))
        for idx, (x, y) in enumerate([(-520,-575),(-250,-575),(40,-575),(330,-575),(620,-575),(-520,575),(-250,575),(40,575),(330,575),(620,575)]):
            self._mesh_actor(f"PhotorealScenePass2_london_pedestrian_railing_{idx}", f"{mesh_root}/london_pedestrian_railing_high_fidelity", (x, y, 107), (0.000022, 0.000022, 0.000022), "photoreal_metal")
        for idx, (x, y, z) in enumerate([(-820,-430,420),(820,430,420)]):
            self._mesh_actor(f"PhotorealScenePass2_london_cctv_camera_box_{idx}", f"{mesh_root}/cctv_camera_high_fidelity", (x, y, z), (0.000022, 0.000022, 0.000022), "photoreal_metal")
        for idx, (x, y, z) in enumerate([(-820,-430,315),(820,-430,315),(-820,430,315),(820,430,315)]):
            self._mesh_actor(f"PhotorealScenePass2_london_signal_visor_depth_{idx}", f"{mesh_root}/signal_visor_box", (x, y, z), (0.000025, 0.000025, 0.000025), "signal")
        # Window highlights: small warm panels improve urban depth without adding vehicles/pedestrians.
        for idx, (x, y, z) in enumerate([(-880,-790,360),(-520,-790,410),(-160,-790,340),(240,-790,440),(620,-790,380),(-760,790,360),(-360,790,330),(80,790,420),(520,790,390)]):
            self._cube(f"PhotorealScenePass2_london_warm_window_highlight_{idx}", (x, y, z), (0.48, 0.018, 0.17), "photoreal_warm_window")

    def _build_london_real_geometry_layer(self) -> None:
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        self._cube("LondonRealGeometry_london_distant_roofline_depth_band", (120, 1080, 705), (18.2, 0.060, 0.70), "photoreal_sidewalk")
        self._cube("LondonRealGeometry_london_overcast_sky_volume", (160, 1330, 1010), (27.0, 0.050, 3.20), "background")
        self._cube("LondonRealGeometry_london_upper_overcast_backdrop_geometry", (40, 430, 845), (24.5, 0.055, 2.30), "background")
        self._cube("LondonRealGeometry_london_midground_soft_roof_mass_left", (-760, 735, 650), (4.4, 0.080, 0.42), "photoreal_curb")
        self._cube("LondonRealGeometry_london_midground_soft_roof_mass_right", (720, 735, 665), (4.8, 0.080, 0.44), "photoreal_curb")
        self._cube("LondonRealGeometry_london_center_camera_visible_brick_frontage_mass", (0, 585, 545), (8.8, 0.090, 2.25), "photoreal_brick")
        self._cube("LondonRealGeometry_london_center_camera_visible_ground_floor_sign_band", (0, 560, 355), (8.6, 0.040, 0.10), "photoreal_sign_plate")
        for idx, x in enumerate(range(-420, 421, 140)):
            self._cube(f"LondonRealGeometry_london_center_camera_visible_window_column_{idx}", (x, 552, 540), (0.28, 0.040, 0.62), "photoreal_glass")
            self._cube(f"LondonRealGeometry_london_center_camera_visible_window_lintel_{idx}", (x, 548, 655), (0.36, 0.035, 0.055), "photoreal_curb")
        self._cube("LondonRealGeometry_london_left_camera_edge_brick_mass", (-1185, -315, 530), (0.32, 3.20, 2.08), "photoreal_brick")
        self._cube("LondonRealGeometry_london_right_camera_edge_brick_mass", (1185, -280, 535), (0.32, 3.05, 2.06), "photoreal_brick")
        self._city_frontage_module("LondonRealGeometry_london_left_capture_edge_facade_infill", -620, -175, 470, "horizon", floors=4, bays=4)
        self._city_frontage_module("LondonRealGeometry_london_screen_left_capture_edge_facade_infill", 620, -175, 470, "horizon", floors=4, bays=4)
        for idx, (x, z, floors, bays) in enumerate([
            (-980, 515, 4, 4),
            (-520, 550, 5, 4),
            (-50, 525, 4, 5),
            (430, 565, 5, 4),
            (890, 530, 4, 4),
        ]):
            self._city_frontage_module(f"LondonRealGeometry_london_midground_shopfront_module_{idx}", x, 705, z, "horizon", floors=floors, bays=bays)
            self._cube(f"LondonRealGeometry_london_midground_shop_sign_lit_band_{idx}", (x, 675, z - 160), (max(1.3, bays * 0.52), 0.035, 0.055), "photoreal_sign_plate")
        for row, y in enumerate([-770, -700, -630]):
            for col, x in enumerate(range(-930, 931, 180)):
                mat = "photoreal_sidewalk" if (row + col) % 2 else "photoreal_curb"
                self._cube(f"LondonRealGeometry_london_foreground_pavement_slab_{row}_{col}", (x, y, 164 + row), (0.62, 0.25, 0.018), mat)
        for idx, (x, y) in enumerate([(-760, -550), (760, -550), (-680, 550), (720, 550)]):
            self._cube(f"LondonRealGeometry_london_traffic_cabinet_{idx}", (x, y, 202), (0.24, 0.13, 0.42), "photoreal_metal")
            self._cube(f"LondonRealGeometry_london_cabinet_sign_plate_{idx}", (x, y - 9, 214), (0.19, 0.018, 0.10), "photoreal_sign_plate")
        for idx, (x, y, rot) in enumerate([(-930, -585, 0), (-520, -590, 0), (470, -590, 180), (920, -580, 180)]):
            self._mesh_actor(f"LondonRealGeometry_london_pedestrian_railing_mesh_{idx}", f"{mesh_root}/london_pedestrian_railing_high_fidelity", (x, y, 178), (0.000030, 0.000030, 0.000034), "photoreal_metal", rotation=(0, 0, rot))
        for idx, (x, y, rot) in enumerate([(-980, -520, 0), (980, -520, 180), (-980, 520, 0), (980, 520, 180)]):
            self._mesh_actor(f"LondonRealGeometry_london_streetlight_mesh_{idx}", f"{mesh_root}/london_streetlight_high_fidelity", (x, y, 174), (0.000026, 0.000026, 0.000032), "photoreal_metal", rotation=(0, 0, rot))
            self._mesh_actor(f"LondonRealGeometry_london_signal_pole_mesh_{idx}", f"{mesh_root}/signal_pole_slim", (x + (-55 if rot else 55), y, 172), (0.90, 0.90, 1.30), "photoreal_metal")
        for idx, (x, y, sx, sy) in enumerate([(-520, -520, 2.4, 0.055), (-80, -610, 1.7, 0.045), (420, -540, 2.1, 0.05), (650, 548, 1.9, 0.05)]):
            self._cube(f"LondonRealGeometry_london_curb_contact_shadow_{idx}", (x, y, 184 + idx), (sx, sy, 0.012), "target_shadow_grime")
        for idx, (x, y) in enumerate([(-520, -235), (120, 150), (610, -70)]):
            self._city_vehicle_proxy(f"LondonRealGeometry_london_readable_vehicle_{idx}", x, y, 172)


    def _build_london_final_target_match_layer(self) -> None:
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        # Final target-match layer based on artifacts/london-photoreal-final-target.png.
        # Goal: elevated London rainy-intersection composition with wet road, yellow box, red bus lane,
        # foreground railings, dense signals, and brick/stone urban depth.
        self._cube("FinalTargetMatch_london_dark_wet_road_full_frame", (0, 0, 158), (18.8, 7.2, 0.014), "custom_imagegen_london_wet_yellow_box_atlas")
        self._cube("FinalTargetMatch_london_left_red_bus_lane_long_wet", (-420, -305, 164), (12.8, 0.78, 0.012), "photoreal_bus_lane")
        self._cube("FinalTargetMatch_london_center_yellow_box_junction_visible", (120, 30, 171), (5.1, 2.6, 0.012), "target_yellow_box")
        self._cube("FinalTargetMatch_london_foreground_cycle_box_visible", (520, -420, 178), (2.55, 1.25, 0.012), "target_cycle_box")
        for idx, (x, y, sx, sy) in enumerate([(-610,-110,2.8,.32),(-140,140,2.1,.26),(380,-40,2.4,.3),(760,220,1.7,.22),(-880,330,1.8,.24)]):
            self._cube(f"FinalTargetMatch_london_wet_reflection_streak_{idx}", (x, y, 181+idx), (sx, sy, 0.01), "target_wet_reflection")
        # Foreground corner railings, matching the reference's lower-left/lower-center black guard rails.
        for idx, (x, y, rot) in enumerate([(-840,-600,0),(-620,-600,0),(-400,-600,0),(140,-600,0),(360,-600,0),(580,-600,0),(-920,555,180),(-700,555,180),(600,555,180),(820,555,180)]):
            self._mesh_actor(f"FinalTargetMatch_london_foreground_black_guard_railing_{idx}", f"{mesh_root}/london_pedestrian_railing_high_fidelity", (x, y, 175), (0.000022, 0.000022, 0.000024), "photoreal_metal", rotation=(0,0,rot))
        # Multiple black signal heads/poles in the same visual rhythm as the target image.
        for idx, (x, y, z) in enumerate([(-930,-450,350),(-520,-370,355),(-70,-285,360),(360,-250,360),(850,-220,355),(-760,370,355),(-250,430,360),(380,440,360),(870,410,355)]):
            self._mesh_actor(f"FinalTargetMatch_london_black_signal_head_cluster_{idx}", f"{mesh_root}/signal_head_uk_high_fidelity", (x, y, z), (0.000025, 0.000025, 0.000025), "signal")
        for idx, (x, y) in enumerate([(-930,-450),(-520,-370),(-70,-285),(360,-250),(850,-220),(-760,370),(-250,430),(380,440),(870,410)]):
            self._mesh_actor(f"FinalTargetMatch_london_slim_signal_pole_cluster_{idx}", f"{mesh_root}/signal_pole_slim", (x, y, 170), (0.9,0.9,1.45), "photoreal_metal")
        # Stronger background: two staggered rows so the proof reads like a London canyon rather than isolated boxes.
        for row, y in enumerate([-1180, 1180]):
            for idx, x in enumerate([-1050,-760,-470,-180,110,400,690,980]):
                height = 3.8 + ((idx + row) % 3) * 0.55
                mat = "photoreal_brick" if idx % 2 else "photoreal_sidewalk"
                self._mesh_actor(f"FinalTargetMatch_london_continuous_facade_row{row}_{idx}", f"{mesh_root}/london_shopfront_high_fidelity", (x, y, 125), (0.000062,0.000062,0.000062 + height * 0.000005), mat)
                self._mesh_actor(f"FinalTargetMatch_london_repeated_window_band_row{row}_{idx}", f"{mesh_root}/london_window_strip_high_fidelity", (x, y + (-25 if y < 0 else 25), 270 + height * 18), (0.00006,0.00006,0.000065), "photoreal_glass")
        # Reference-like curb/sidewalk slabs in foreground.
        for idx, (x, y, sx, sy) in enumerate([(-720,-695,4.0,.9),(120,-695,3.8,.9),(820,-695,2.6,.9),(-760,680,3.6,.75),(420,680,4.4,.75)]):
            self._cube(f"FinalTargetMatch_london_foreground_wet_pavement_slab_{idx}", (x, y, 188+idx), (sx, sy, 0.025), "photoreal_sidewalk")
        # Camera-visible CCTV mast and streetlights, matching the reference's infrastructure emphasis.
        for idx, (x, y, rot) in enumerate([(-760,-560,12),(-180,-540,0),(520,-520,-8),(-460,560,180),(420,560,180)]):
            self._mesh_actor(f"FinalTargetMatch_london_tall_streetlight_reference_{idx}", f"{mesh_root}/london_streetlight_high_fidelity", (x, y, 190), (0.000024,0.000024,0.000028), "photoreal_metal", rotation=(0,0,rot))
        for idx, (x, y, z) in enumerate([(-520,-470,470),(480,430,470)]):
            self._mesh_actor(f"FinalTargetMatch_london_visible_cctv_mast_camera_{idx}", f"{mesh_root}/cctv_camera_high_fidelity", (x, y, z), (0.000024,0.000024,0.000024), "photoreal_metal")


    def _build_london_target_convergence_atlas_layer(self) -> None:
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        # Target convergence layer: large baked atlases matching the approved target image composition.
        # This is intentionally above earlier procedural planes so the visible proof converges toward the target.
        self._cube("TargetConvergence_london_baked_wet_road_atlas_full_intersection", (160, -40, 236), (20.8, 11.6, 0.012), "custom_imagegen_london_wet_yellow_box_atlas")
        # Grey overcast backdrop + continuous London facade band to remove the black void in proof.
        self._cube("TargetConvergence_london_overcast_sky_backdrop", (220, 760, 700), (24.0, 0.055, 6.2), "custom_imagegen_london_facade_road_backplate")
        self._cube("TargetConvergence_london_guaranteed_visible_overcast_card", (180, 710, 610), (24.5, 0.045, 4.8), "custom_imagegen_london_facade_road_backplate")
        for idx, x in enumerate([-1180,-880,-580,-280,20,320,620,920,1220]):
            z = 360 + (idx % 3) * 28
            self._cube(f"TargetConvergence_london_midground_facade_wall_card_{idx}", (x, 650, z), (1.95, 0.038, 1.55), "photoreal_brick")
        for idx, x in enumerate([-980,-620,-260,100,460,820,1180]):
            self._cube(f"TargetConvergence_london_distant_mist_building_silhouette_{idx}", (x, 730, 495), (1.65, 0.03, 1.18), "photoreal_sidewalk")
        self._cube("TargetConvergence_london_left_perspective_facade_strip", (-1010, -140, 470), (0.038, 6.2, 2.1), "photoreal_brick")
        self._cube("TargetConvergence_london_right_corner_facade_strip", (1180, 520, 505), (0.038, 4.2, 2.35), "photoreal_brick")
        # Brighter wet curb/pavement edges, like the reference foreground.
        self._cube("TargetConvergence_london_foreground_left_pavement_edge", (-580, -720, 244), (6.2, 0.55, 0.018), "photoreal_sidewalk")
        self._cube("TargetConvergence_london_foreground_right_pavement_edge", (540, -720, 245), (5.4, 0.55, 0.018), "photoreal_sidewalk")
        # Large textured facade cards to create London depth without relying only on tiny FBX details.
        for idx, (x, y, z, sx, sz) in enumerate([(-760, 1040, 420, 3.2, 2.3), (-260, 1070, 445, 3.1, 2.45), (260, 1080, 420, 3.4, 2.25), (790, 1040, 455, 3.0, 2.55),
                                                     (-820, -1040, 390, 2.8, 2.1), (-250, -1080, 430, 3.3, 2.4), (360, -1080, 405, 3.0, 2.2), (900, -1040, 430, 2.8, 2.35)]):
            self._cube(f"TargetConvergence_london_textured_facade_card_{idx}", (x, y, z), (sx, 0.035, sz), "photoreal_brick")
        # Camera-readable black rails/signals over the atlas, with slightly larger scale so they read on Telegram.
        for idx, (x, y, rot) in enumerate([(-820,-610,0),(-620,-610,0),(-420,-610,0),(260,-610,0),(470,-610,0),(680,-610,0)]):
            self._mesh_actor(f"TargetConvergence_london_foreground_fbx_guard_railing_{idx}", f"{mesh_root}/london_pedestrian_railing_high_fidelity", (x, y, 252), (0.000038, 0.000038, 0.000042), "photoreal_metal", rotation=(0,0,rot))
        for idx, (x, y, z) in enumerate([(-900,-390,390),(-480,-330,392),(80,-270,395),(640,-250,390),(-620,410,392),(20,455,395),(700,430,390)]):
            self._mesh_actor(f"TargetConvergence_london_visible_fbx_signal_head_{idx}", f"{mesh_root}/signal_head_uk_high_fidelity", (x, y, z), (0.000040, 0.000040, 0.000040), "signal")
        for idx, (x, y, rot) in enumerate([(-730,-560,8),(-100,-550,0),(540,-540,-6),(-420,580,180),(420,580,180)]):
            self._mesh_actor(f"TargetConvergence_london_visible_fbx_streetlight_{idx}", f"{mesh_root}/london_streetlight_high_fidelity", (x, y, 265), (0.000036,0.000036,0.000042), "photoreal_metal", rotation=(0,0,rot))
        # Warm target-window accents layered over facade cards.
        for idx, (x, y, z) in enumerate([(-760,1035,520),(-260,1065,560),(260,1075,530),(790,1035,585),(-250,-1075,545),(360,-1075,520)]):
            self._cube(f"TargetConvergence_london_warm_window_reflection_{idx}", (x, y + (4 if y < 0 else -4), z), (0.55, 0.012, 0.20), "photoreal_warm_window")
        # Guaranteed readable target foreground: mesh-backed railings instead of camera-facing cube bars.
        for idx, (x0, x1, y) in enumerate([(-780, -280, -655), (-180, 360, -655), (470, 920, -655)]):
            cx = (x0 + x1) / 2
            self._mesh_actor(
                f"TargetConvergence_london_grounded_fbx_foreground_railing_{idx}",
                f"{mesh_root}/london_pedestrian_railing_high_fidelity",
                (cx, y, 252),
                (0.000040, 0.000040, 0.000044),
                "photoreal_metal",
            )
        # Target-like small dashed lane studs across the wet road.
        for idx, x in enumerate(range(-760, 1040, 150)):
            self._cube(f"TargetConvergence_london_white_lane_stud_near_row_{idx}", (x, -135, 254), (0.085, 0.035, 0.012), "photoreal_white_worn")
            self._cube(f"TargetConvergence_london_white_lane_stud_far_row_{idx}", (x, 205, 255), (0.085, 0.035, 0.012), "photoreal_white_worn")
        # Camera-readable traffic signal heads with colored lenses.
        for idx, (x, y, z, mat) in enumerate([(-780,-410,435,"green_signal"),(-410,-325,430,"red_signal"),(90,-270,432,"green_signal"),(610,-245,428,"green_signal"),(-560,410,430,"green_signal"),(180,455,432,"red_signal"),(760,425,428,"green_signal")]):
            self._cube(f"TargetConvergence_london_colored_signal_lens_{idx}", (x, y-6, z), (0.08, 0.016, 0.08), mat)
        # Wet foreground pavement tiles similar to the target lower-left sidewalk.
        for row, y in enumerate([-760, -690, -620]):
            for col, x in enumerate(range(-930, -260, 135)):
                mat = "photoreal_sidewalk" if (row + col) % 2 else "photoreal_curb"
                self._cube(f"TargetConvergence_london_foreground_pavement_tile_grid_{row}_{col}", (x, y, 258 + row), (0.55, 0.24, 0.018), mat)




    def _target_facade_module(self, prefix: str, x: float, y: float, z: float, side: str, floors: int = 4, bays: int = 4) -> None:
        """Build a camera-readable 3D London facade from cuboids, not a flat card.

        `side` controls which axis is thin: y-facing horizon cards use side='horizon';
        x-facing street walls use side='side'. Dimensions are deliberately chunky so they
        survive Telegram/mobile compression and base-color proof captures.
        """
        if side == "side":
            wall_scale = (0.22, 1.18, 2.1 + floors * 0.32)
            band_scale = (0.24, 1.22, 0.10)
            glass_scale = (0.055, 0.20, 0.26)
            def loc(dx, dy, dz): return (x + dx, y + dy, z + dz)
        else:
            wall_scale = (1.22, 0.22, 2.1 + floors * 0.32)
            band_scale = (1.26, 0.24, 0.10)
            glass_scale = (0.20, 0.055, 0.26)
            def loc(dx, dy, dz): return (x + dx, y + dy, z + dz)
        self._cube(f"{prefix}_brick_mass_3d", (x, y, z), wall_scale, "photoreal_brick")
        # Stone ground floor and cornices.
        self._cube(f"{prefix}_stone_ground_floor", loc(0, 0, -210), band_scale, "target_london_stone")
        self._cube(f"{prefix}_upper_cornice", loc(0, 0, 210), band_scale, "target_london_stone")
        self._cube(f"{prefix}_roof_cornice", loc(0, 0, 370), band_scale, "target_london_stone")
        # Recessed windows with small lintels/sills.
        for floor in range(floors):
            dz = -70 + floor * 145
            for bay in range(bays):
                offset = (bay - (bays - 1) / 2) * 135
                if side == "side":
                    wx, wy = 0, offset
                    sill_scale=(0.060,0.24,0.028)
                else:
                    wx, wy = offset, 0
                    sill_scale=(0.24,0.060,0.028)
                mat = "target_window_warm_glass" if (floor + bay) % 5 == 0 else "target_window_dark_recess"
                self._cube(f"{prefix}_window_recess_{floor}_{bay}", loc(wx, wy, dz), glass_scale, mat)
                self._cube(f"{prefix}_window_sill_{floor}_{bay}", loc(wx, wy, dz - 35), sill_scale, "target_london_stone")
                self._cube(f"{prefix}_window_lintel_{floor}_{bay}", loc(wx, wy, dz + 35), sill_scale, "target_london_stone")
        # Shopfront doors at road level.
        for bay in range(max(2, bays - 1)):
            offset = (bay - (max(2, bays - 1) - 1) / 2) * 160
            if side == "side":
                self._cube(f"{prefix}_shopfront_glass_{bay}", loc(0, offset, -320), (0.065, 0.31, 0.42), "photoreal_glass")
            else:
                self._cube(f"{prefix}_shopfront_glass_{bay}", loc(offset, 0, -320), (0.31, 0.065, 0.42), "photoreal_glass")

    def _build_london_target_hero_depth_layer(self) -> None:
        """Camera-readable 2.5D target hero layer.

        The previous scene had correct semantic assets but mobile proof still read as dark/flat.
        This layer deliberately fills the proof camera with bright wet road, London canyon cards,
        foreground rail silhouettes, and traffic-signal dots so visual acceptance is based on pixels,
        not actor-label tokens.
        """
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        # Bright road bands and reflection patches above the darker atlas.
        self._cube("TargetHero_london_bright_wet_road_camera_readable", (80, -80, 282), (16.5, 8.6, 0.014), "custom_imagegen_london_wet_yellow_box_atlas")
        for idx, (x, y, sx, sy) in enumerate([(-760,-420,2.8,.24),(-380,-220,2.2,.20),(120,-90,2.7,.22),(540,90,2.3,.20),(880,260,1.8,.18)]):
            self._cube(f"TargetHero_london_sky_reflection_on_wet_asphalt_{idx}", (x, y, 292+idx), (sx, sy, 0.012), "target_bright_reflection")
        # Foreground sidewalks/curbs take up enough pixels to match the target lower edge.
        for idx, (x, y, sx, sy) in enumerate([(-760,-830,4.9,.95),(-40,-820,3.6,.85),(650,-805,3.8,.82),(-980,620,2.6,.72),(520,665,4.8,.78)]):
            self._cube(f"TargetHero_london_bright_wet_pavement_mass_{idx}", (x, y, 300+idx), (sx, sy, 0.032), "target_london_stone")
        # Large, readable facades close to the camera frustum: side canyon + horizon row.
        for idx, (x, y, z, sx, sz) in enumerate([(-1080,-150,620,.10,3.5),(-1040,230,620,.10,3.2),(1180,70,660,.10,3.7),(1130,465,620,.10,3.2)]):
            self._cube(f"TargetHero_london_side_facade_canyon_{idx}", (x, y, z), (sx, 2.25, sz), "photoreal_brick")
        for idx, x in enumerate([-1080,-760,-440,-120,200,520,840,1160]):
            self._cube(f"TargetHero_london_horizon_facade_block_{idx}", (x, 820, 560 + (idx % 2) * 45), (1.65, 0.055, 2.25), "photoreal_brick")
        self._cube("TargetHero_london_overcast_sky_filled_frame", (100, 900, 840), (23.5, 0.04, 5.4), "custom_imagegen_london_facade_road_backplate")
        # Foreground guard rails as grounded mesh actors in the same frame position as target.
        for idx, (x0, x1, y) in enumerate([(-990,-520,-760),(-470,30,-760),(110,610,-760),(690,1030,-760)]):
            cx = (x0 + x1) / 2
            self._mesh_actor(
                f"TargetHero_london_grounded_fbx_guardrail_{idx}",
                f"{mesh_root}/london_pedestrian_railing_high_fidelity",
                (cx, y, 315),
                (0.000042, 0.000042, 0.000046),
                "photoreal_metal",
            )
        # Oversized signal assemblies and lens dots so intersections read immediately.
        for idx, (x, y, z, lens) in enumerate([(-760,-360,520,"green_signal"),(-420,-250,505,"red_signal"),(80,-195,515,"green_signal"),(580,-160,500,"green_signal"),(-610,385,510,"green_signal"),(130,435,520,"red_signal"),(760,395,505,"green_signal")]):
            self._mesh_actor(
                f"TargetHero_london_fbx_signal_head_{idx}",
                f"{mesh_root}/signal_head_uk_high_fidelity",
                (x, y, z),
                (0.000040, 0.000040, 0.000040),
                "signal",
            )
            self._cube(f"TargetHero_london_signal_lens_readable_{idx}", (x, y-8, z+15), (0.07,0.018,0.07), lens)
        # Road marking emphasis: yellow box and red bus lane must survive compression.
        self._cube("TargetHero_london_yellow_box_readability_overlay", (100, -10, 304), (4.2, 2.15, 0.012), "target_yellow_box")
        self._cube("TargetHero_london_red_bus_lane_readability_overlay", (-410, -420, 306), (6.2, 0.55, 0.012), "photoreal_bus_lane")
        self._cube("TargetHero_london_cycle_box_readability_overlay", (560, -520, 308), (1.9, 0.88, 0.012), "target_cycle_box")
        # TargetHero2: replace smeared texture-only markings with camera-readable geometric paint.
        # Yellow box grid as actual strips, not atlas distortion.
        for idx, off in enumerate([-320,-220,-120,-20,80,180,280]):
            self._cube(f"TargetHero2_london_geometric_yellow_box_grid_a_{idx}", (130 + off * 0.36, -35 + off * 0.20, 340+idx), (0.045, 3.35, 0.012), "target_yellow_box")
            self._cube(f"TargetHero2_london_geometric_yellow_box_grid_b_{idx}", (130 + off * 0.36, -35 - off * 0.20, 348+idx), (0.045, 3.35, 0.012), "target_yellow_box")
        for idx, y in enumerate([-615,-575,-535]):
            self._cube(f"TargetHero2_london_double_yellow_foreground_line_{idx}", (-260, y, 358+idx), (8.4, 0.028, 0.012), "target_yellow_box")
        # More target-like lane studs/white dashes across the lower road.
        for idx, x in enumerate(range(-780, 1080, 115)):
            self._cube(f"TargetHero2_london_bright_white_lane_stud_row_{idx}", (x, -260, 362), (0.07, 0.026, 0.012), "photoreal_white_worn")
        # Stronger foreground guard rail using repeated mesh sections instead of black cube bars.
        for idx, x in enumerate(range(-860, 760, 210)):
            self._mesh_actor(
                f"TargetHero2_london_grounded_fbx_dense_foreground_railing_{idx}",
                f"{mesh_root}/london_pedestrian_railing_high_fidelity",
                (x, -805, 352),
                (0.000040, 0.000040, 0.000044),
                "photoreal_metal",
            )
        # Large right-side masonry corner like the target's dominant building face.
        self._cube("TargetHero2_london_right_masonry_corner_mass", (1110, -210, 680), (0.26, 4.0, 4.2), "photoreal_brick")
        self._cube("TargetHero2_london_right_stone_ground_floor_band", (1098, -210, 405), (0.28, 4.05, 0.72), "target_london_stone")
        for idx, y in enumerate([-700,-450,-200,50,300]):
            self._cube(f"TargetHero2_london_right_arch_window_dark_{idx}", (1088, y, 420), (0.055, 0.34, 0.36), "photoreal_glass")
            self._cube(f"TargetHero2_london_right_upper_warm_window_{idx}", (1086, y, 690), (0.052, 0.26, 0.28), "photoreal_warm_window")
        # Continuous left street wall to remove black void and mimic the target canyon.
        for idx, y in enumerate([-780,-520,-260,0,260,520,780]):
            self._cube(f"TargetHero2_london_left_continuous_street_wall_{idx}", (-1125, y, 560 + (idx%2)*30), (0.22, 0.92, 2.65), "photoreal_brick")
            self._cube(f"TargetHero2_london_left_shopfront_glass_band_{idx}", (-1112, y, 330), (0.06, 0.55, 0.42), "photoreal_glass")
        # Wet pavement foreground made of larger visible slabs.
        for row, y in enumerate([-905,-815,-725]):
            for col, x in enumerate(range(-980, 480, 175)):
                self._cube(f"TargetHero2_london_foreground_large_paving_slab_{row}_{col}", (x, y, 372+row), (0.78,0.32,0.014), "target_london_stone")



    def _build_london_target_hero3_pbr_geometry_layer(self) -> None:
        """Next target pass: more genuine 3D facade depth and wet-road glints.

        This does not claim final photorealism; it removes the most obvious card/blockout feel by
        adding cuboid facade relief, window recesses, cornices, shopfront bands, and geometric road
        reflection details that remain visible in both base-color and balanced lit captures.
        """
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        # Replace the flattest visible street-wall cards with cuboid facade modules.
        for idx, (x, y, z, side, floors, bays) in enumerate([
            (1120, -520, 690, "side", 5, 4),
            (1120, 120, 710, "side", 5, 4),
            (-1120, -420, 650, "side", 4, 4),
            (-1120, 280, 670, "side", 5, 4),
            (-720, 820, 660, "horizon", 4, 5),
            (-120, 830, 690, "horizon", 5, 5),
            (520, 820, 665, "horizon", 4, 5),
        ]):
            self._target_facade_module(f"TargetHero3_london_facade_module_{idx}", x, y, z, side, floors=floors, bays=bays)
        # Wet-road PBR/readability cues: glints, puddle silhouettes, tire-wear bands.
        for idx, (x, y, sx, sy) in enumerate([(-760,-520,2.2,.12),(-520,-350,1.6,.10),(-210,-180,2.0,.11),(180,-60,2.5,.12),(540,130,2.0,.10),(840,310,1.4,.09)]):
            self._cube(f"TargetHero3_london_long_wet_specular_glint_{idx}", (x, y, 388+idx), (sx, sy, 0.010), "target_road_glint")
        for idx, (x, y, sx, sy) in enumerate([(-620,-610,1.4,.18),(-40,-390,1.9,.20),(420,-250,1.5,.16),(760,-80,1.1,.14)]):
            self._cube(f"TargetHero3_london_dark_puddle_reflection_shape_{idx}", (x, y, 396+idx), (sx, sy, 0.010), "target_shadow_grime")
        for idx, y in enumerate([-455, -340, -225, 105, 230]):
            self._cube(f"TargetHero3_london_subtle_tire_wear_band_{idx}", (0, y, 402+idx), (9.5, 0.035, 0.010), "target_shadow_grime")
        # More believable signal gantry/heads close to target rhythm.
        for idx, (x, y, z) in enumerate([(-760,-395,560),(-320,-270,545),(220,-205,555),(680,-170,540)]):
            self._mesh_actor(
                f"TargetHero3_london_grounded_fbx_signal_pole_{idx}",
                f"{mesh_root}/signal_pole_slim",
                (x, y, z - 135),
                (0.000030, 0.000030, 0.000034),
                "photoreal_metal",
            )
            self._mesh_actor(
                f"TargetHero3_london_grounded_fbx_signal_head_{idx}",
                f"{mesh_root}/signal_head_uk_high_fidelity",
                (x, y - 12, z),
                (0.000040, 0.000040, 0.000040),
                "signal",
            )
            self._cube(f"TargetHero3_london_signal_green_lens_readable_{idx}", (x, y-18, z+18), (0.055,0.016,0.055), "green_signal")
        # Foreground railing shadow/contact, so the rail sits on the pavement rather than floating.
        self._cube("TargetHero3_london_foreground_railing_contact_shadow", (-60, -812, 330), (9.8, 0.055, 0.018), "target_shadow_grime")


    def _build_london_target_hero4_realism_layer(self) -> None:
        """Visible realism pass for remaining target gaps.

        Adds facade articulation that reads beyond cuboids: window mullions, bay columns,
        shop awnings/signage, parapet depth, layered haze cards, and broken wet asphalt
        highlights. These are intentionally camera-readable large forms so visual proof improves
        instead of only adding hidden semantic tokens.
        """
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        # Facade articulation: mullions, side columns, awnings and signs on camera-facing modules.
        for module, (x, y, side, bays) in enumerate([
            (1128, -520, "side", 4), (1128, 120, "side", 4), (-1128, -420, "side", 4),
            (-1128, 280, "side", 4), (-720, 835, "horizon", 5), (-120, 838, "horizon", 5), (520, 836, "horizon", 5),
        ]):
            # Vertical bay piers and parapet depth.
            for bay in range(bays + 1):
                offset = (bay - bays / 2) * 135
                if side == "side":
                    self._cube(f"TargetHero4_facade_bay_pier_{module}_{bay}", (x - 4, y + offset, 710), (0.035, 0.035, 1.95), "target_london_stone")
                    self._cube(f"TargetHero4_window_black_mullion_{module}_{bay}", (x - 8, y + offset - 32, 675), (0.026, 0.020, 1.38), "target_black_silhouette")
                else:
                    self._cube(f"TargetHero4_facade_bay_pier_{module}_{bay}", (x + offset, y - 4, 705), (0.035, 0.035, 1.90), "target_london_stone")
                    self._cube(f"TargetHero4_window_black_mullion_{module}_{bay}", (x + offset - 32, y - 8, 670), (0.020, 0.026, 1.34), "target_black_silhouette")
            # Shopfront awning/sign band at pedestrian scale.
            if side == "side":
                self._cube(f"TargetHero4_shop_awning_deep_red_{module}", (x - 16, y, 385), (0.085, 1.05, 0.085), "target_shop_awning_deep_red")
                self._cube(f"TargetHero4_shop_sign_cream_band_{module}", (x - 20, y, 440), (0.060, 1.02, 0.075), "target_shop_sign_cream")
            else:
                self._cube(f"TargetHero4_shop_awning_deep_red_{module}", (x, y - 16, 385), (1.05, 0.085, 0.085), "target_shop_awning_deep_red")
                self._cube(f"TargetHero4_shop_sign_cream_band_{module}", (x, y - 20, 440), (1.02, 0.060, 0.075), "target_shop_sign_cream")
        # London street clutter that makes scale less toy-like.
        for idx, (x, y) in enumerate([(-930,-575),(-710,-535),(-480,-500),(760,-265),(950,-185),(1030,70)]):
            self._mesh_actor(
                f"TargetHero4_fbx_keep_left_bollard_{idx}",
                f"{mesh_root}/keep_left_bollard",
                (x, y, 390),
                (0.75, 0.75, 0.85),
                "photoreal_white_worn",
            )
            self._cube(f"TargetHero4_bollard_reflective_cap_{idx}", (x, y, 455), (0.040,0.040,0.030), "target_wet_micro_highlight")
        for idx, (x, y) in enumerate([(-1020, -715), (1010, -445), (-985, 650)]):
            self._mesh_actor(
                f"TargetHero4_fbx_bus_stop_pole_{idx}",
                f"{mesh_root}/signal_pole_slim",
                (x, y, 505),
                (0.75, 0.75, 1.05),
                "photoreal_metal",
            )
            self._cube(f"TargetHero4_bus_stop_amber_plate_{idx}", (x, y, 650), (0.10,0.028,0.13), "target_bus_stop_amber")
        # Break the road's procedural smoothness with many small glints and darker grime islands.
        for idx, (x, y, sx, sy) in enumerate([
            (-890,-455,.42,.035),(-740,-402,.55,.032),(-565,-355,.36,.03),(-410,-305,.62,.034),
            (-230,-245,.48,.028),(-40,-198,.70,.030),(155,-148,.52,.030),(320,-105,.62,.028),
            (515,-62,.44,.026),(690,-18,.58,.024),(835,32,.40,.022),(955,86,.32,.020),
        ]):
            self._cube(f"TargetHero4_asphalt_micro_specular_streak_{idx}", (x, y, 416 + idx * 0.3), (sx, sy, 0.008), "target_wet_micro_highlight")
        for idx, (x, y, sx, sy) in enumerate([
            (-800,-620,.68,.09),(-610,-498,.52,.07),(-315,-420,.75,.08),(-95,-322,.50,.06),
            (215,-256,.80,.075),(475,-185,.52,.06),(730,-132,.68,.065),(920,-70,.46,.055),
        ]):
            self._cube(f"TargetHero4_asphalt_irregular_grime_island_{idx}", (x, y, 414 + idx * 0.35), (sx, sy, 0.008), "target_shadow_grime")
        # Paint breakup on the hero yellow box: thin occluding scuffs to avoid toy-perfect striping.
        for idx, (x, y, rotish) in enumerate([(-260,-90,0),(0,-34,0),(255,24,0),(-140,72,0),(160,124,0)]):
            self._cube(f"TargetHero4_yellow_box_scuffed_gap_{idx}", (x, y, 425 + idx * 0.25), (0.58,0.035,0.008), "target_shadow_grime")
        # Soft distant haze cards near horizon/roofline to reduce harsh blockout silhouette in lit proof.
        for idx, (x, y, z, sx, sy) in enumerate([(-520,900,925,2.6,.035),(240,910,955,3.0,.035),(820,790,880,1.8,.035)]):
            self._cube(f"TargetHero4_soft_overcast_haze_card_{idx}", (x, y, z), (sx, sy, 0.26), "target_fog_plane_soft")


    def _build_london_target_hero5_visual_acceptance_layer(self) -> None:
        """Anti-toy visual acceptance pass: muted masonry, arches, and closer-view realism.

        The previous pass was visibly richer but too orange/isometric. This layer adds large muted
        facade skins, arch-window silhouettes, ground-floor colonnade rhythm, and darker wet-asphalt
        overlays that are obvious in the target proof camera.
        """
        # Muted masonry overlays on the largest camera-facing blocks to kill the bright orange toy look.
        for idx, (x, y, z, side, sx, sy) in enumerate([
            (1136,-520,710,"side",0.045,1.18),(1136,120,720,"side",0.045,1.18),(-1136,-420,675,"side",0.045,1.12),
            (-1136,280,690,"side",0.045,1.12),(-720,846,680,"horizon",1.18,0.045),(-120,848,700,"horizon",1.28,0.045),(520,846,675,"horizon",1.18,0.045)
        ]):
            if side == "side":
                self._cube(f"TargetHero5_muted_masonry_skin_{idx}", (x-3,y,z), (sx,sy,1.82), "photoreal_brick")
            else:
                self._cube(f"TargetHero5_muted_masonry_skin_{idx}", (x,y-3,z), (sx,sy,1.82), "photoreal_brick")
        # Ground-floor arches and cool glass recesses: closer to London civic/commercial facade language.
        for idx, (x, y, side, bays) in enumerate([(1130,-520,"side",4),(1130,120,"side",4),(-1130,-420,"side",4),(-720,842,"horizon",5),(-120,842,"horizon",5)]):
            for bay in range(bays):
                off=(bay-(bays-1)/2)*135
                if side=="side":
                    self._cube(f"TargetHero5_arch_left_pier_{idx}_{bay}", (x-11,y+off-42,420), (.045,.020,.42), "target_london_stone")
                    self._cube(f"TargetHero5_arch_right_pier_{idx}_{bay}", (x-11,y+off+42,420), (.045,.020,.42), "target_london_stone")
                    self._cube(f"TargetHero5_arch_top_lintel_{idx}_{bay}", (x-12,y+off,520), (.050,.090,.038), "target_london_stone")
                    self._cube(f"TargetHero5_cool_recessed_shop_glass_{idx}_{bay}", (x-16,y+off,445), (.035,.065,.30), "target_window_reflection_cool")
                else:
                    self._cube(f"TargetHero5_arch_left_pier_{idx}_{bay}", (x+off-42,y-11,420), (.020,.045,.42), "target_london_stone")
                    self._cube(f"TargetHero5_arch_right_pier_{idx}_{bay}", (x+off+42,y-11,420), (.020,.045,.42), "target_london_stone")
                    self._cube(f"TargetHero5_arch_top_lintel_{idx}_{bay}", (x+off,y-12,520), (.090,.050,.038), "target_london_stone")
                    self._cube(f"TargetHero5_cool_recessed_shop_glass_{idx}_{bay}", (x+off,y-16,445), (.065,.035,.30), "target_window_reflection_cool")
        # Dark, irregular wet asphalt overlay to remove gray-striped procedural road feel.
        for idx, (x,y,sx,sy) in enumerate([(-520,-300,2.2,.55),(-40,-170,2.9,.50),(470,-20,2.6,.48),(820,120,1.7,.40),(-760,-520,1.6,.38)]):
            self._cube(f"TargetHero5_dark_wet_asphalt_irregular_plate_{idx}", (x,y,409+idx*.2), (sx,sy,.006), "target_wet_asphalt_dark")
        # Thinner, less glowing road-reflection cues so lit proof doesn't look like neon stripes.
        for idx, (x,y,sx,sy) in enumerate([(-720,-410,.65,.018),(-360,-285,.82,.017),(20,-166,.72,.016),(375,-75,.58,.015),(720,20,.45,.014)]):
            self._cube(f"TargetHero5_subtle_rain_sheen_line_{idx}", (x,y,427+idx*.2), (sx,sy,.006), "target_wet_micro_highlight")
        # Foreground crop masks / dark columns to create target-like left-edge occlusion and reduce isometric-map feel.
        self._cube("TargetHero5_left_edge_dark_occlusion_column", (-1265,-720,760), (.12,.22,2.55), "target_black_silhouette")
        self._cube("TargetHero5_near_camera_shadow_wedge", (-680,-870,382), (2.6,.18,.020), "target_shadow_grime")


    def _build_london_target_hero6_camera_visible_tone_layer(self) -> None:
        """Final camera-visible tone pass for the approved proof camera.

        Earlier proof layers existed in the map, but the oblique render target still read as mostly
        black because dark foreground and texture layers consumed the frame. These simple planes sit
        in the same London road-only scene and intentionally occupy the proof camera with road, sky,
        masonry, and markings instead of leaving void pixels.
        """
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        self._cube("TargetHero6_london_camera_visible_overcast_backplate", (-220, 600, 760), (52.0, 0.050, 3.35), "custom_imagegen_london_facade_road_backplate")
        self._plane_actor(
            "ImageGenLondon_overcast_photo_backplate_plane_visible",
            (-80, 650, 535),
            (30.0, 6.6, 1.0),
            "custom_imagegen_london_facade_road_backplate",
            rotation=(90, 0, 0),
        )
        self._plane_actor(
            "ImageGenLondon_left_overcast_photo_backplate_plane_visible",
            (-1260, 650, 525),
            (18.0, 6.6, 1.0),
            "custom_imagegen_london_facade_road_backplate",
            rotation=(90, 0, 0),
        )
        self._cube("LondonOperatorContext_lit_low_horizon_mist_fill", (920, 610, 390), (22.0, 0.052, 1.45), "target_mist_building")
        self._cube("LondonOperatorContext_lit_far_right_context_fill", (2850, 630, 285), (16.0, 0.052, 1.85), "target_mist_building")
        for idx, (x, z, sx, sz) in enumerate([(1520, 420, 2.7, 1.25), (2060, 350, 2.4, 1.10), (2580, 300, 2.2, 0.95)]):
            self._cube(f"LondonOperatorContext_lit_right_horizon_mist_mass_{idx}", (x, 590, z), (sx, 0.050, sz), "target_mist_building")
        self._cube("LondonOperatorContext_lit_overcast_sky_continuous_backdrop", (-120, 1080, 930), (32.0, 0.060, 5.80), "target_sky_atlas")
        self._cube("LondonOperatorContext_lit_distant_mist_facade_band", (-260, 1010, 720), (18.5, 0.052, 1.42), "target_mist_building")
        for idx, (x, z, sx, sz) in enumerate([(-930, 745, 2.4, 1.55), (-560, 785, 2.9, 1.80), (-150, 740, 2.6, 1.48), (265, 790, 3.2, 1.95), (720, 735, 2.7, 1.52)]):
            self._cube(f"LondonOperatorContext_lit_roofline_mass_{idx}", (x, 930, z), (sx, 0.050, sz), "target_masonry_shadow_red")
        for idx, x in enumerate([-820, -470, -120, 230, 580, 910]):
            self._cube(f"LondonOperatorContext_lit_upper_window_reflection_{idx}", (x, 900, 835), (1.05, 0.044, 0.19), "target_window_reflection_cool")
        # Upper-frame operator context fills the remaining black capture band with overcast sky and misty London massing.
        self._cube("TargetHero7_london_upper_frame_overcast_fill", (360, 445, 720), (36.0, 0.046, 2.20), "target_sky_atlas")
        self._cube("TargetHero7_london_upper_frame_mist_facade_fill", (520, 420, 540), (28.0, 0.044, 1.15), "target_mist_building")
        for idx, (x, z, sx, sz) in enumerate([(-960, 560, 2.4, 1.00), (-560, 595, 2.8, 1.12), (-120, 570, 2.5, 0.95), (320, 610, 3.0, 1.20), (760, 575, 2.5, 1.02)]):
            self._cube(f"TargetHero7_london_upper_frame_soft_roof_mass_{idx}", (x, 398, z), (sx, 0.040, sz), "target_london_stone")
        self._cube("TargetHero6_london_camera_visible_wet_road_plate", (0, -320, 470), (22.5, 10.8, 0.012), "custom_imagegen_london_wet_yellow_box_atlas")
        self._cube("TargetHero6_london_lower_frame_pavement_fill", (-320, -900, 505), (18.8, 2.35, 0.012), "photoreal_sidewalk")
        for idx, (x, y, sx, sy) in enumerate([(-720, -690, 4.2, 0.10), (-360, -520, 5.2, 0.12), (180, -360, 5.8, 0.14), (640, -170, 3.8, 0.10)]):
            self._cube(f"TargetHero6_london_wet_road_overcast_reflection_{idx}", (x, y, 532 + idx), (sx, sy, 0.010), "photoreal_white_worn")
        for idx, (x, y, sx, sy) in enumerate([(-520, -760, 7.4, 0.42), (-40, -560, 9.2, 0.50), (420, -330, 8.0, 0.46), (760, -115, 4.8, 0.34)]):
            self._cube(f"TargetHero6_london_broad_wet_sky_reflection_{idx}", (x, y, 538 + idx), (sx, sy, 0.010), "photoreal_white_worn")
        self._cube("TargetHero6_london_grounded_red_bus_lane_surface_visible", (-460, -730, 527), (7.8, 0.52, 0.010), "photoreal_bus_lane")
        self._cube("TargetHero6_london_grounded_yellow_box_surface_visible", (-90, -605, 532), (4.6, 1.45, 0.010), "photoreal_yellow_worn")
        self._cube("TargetHero6_london_grounded_cycle_box_surface_visible", (470, -735, 529), (1.65, 0.62, 0.010), "target_cycle_box")
        for idx, y in enumerate([-760, -690, -620, -550]):
            self._cube(f"TargetHero6_london_grounded_yellow_grid_horizontal_{idx}", (-90, y, 536 + idx), (4.9, 0.026, 0.010), "photoreal_yellow_worn")
        for idx, x in enumerate([-250, -145, -40, 65]):
            self._cube(f"TargetHero6_london_grounded_yellow_grid_vertical_{idx}", (x, -655, 542 + idx), (0.060, 1.45, 0.010), "photoreal_yellow_worn")
        for idx, x in enumerate([-780, -560, -340, -120, 100, 320, 540]):
            self._cube(f"TargetHero6_london_grounded_white_lane_dash_{idx}", (x, -820, 526), (0.42, 0.035, 0.010), "photoreal_white_worn")
        for idx, x in enumerate([-920, -620, -320, -20, 280, 580, 880]):
            self._cube(f"TargetHero6_london_facade_vertical_pier_{idx}", (x, 585, 755), (0.050, 0.024, 1.45), "photoreal_brick")
        for row, z in enumerate([680, 760, 835]):
            for idx, x in enumerate([-760, -500, -240, 20, 280, 540, 800]):
                self._cube(f"TargetHero6_london_soft_window_row_{row}_{idx}", (x, 578, z + 35), (1.05, 0.022, 0.185), "photoreal_glass")
                self._cube(f"TargetHero6_london_window_lintel_row_{row}_{idx}", (x, 574, z + 82), (1.12, 0.020, 0.032), "photoreal_sidewalk")
        for idx, x in enumerate([-720, -300, 120, 540]):
            self._cube(f"TargetHero6_london_ground_floor_shop_sign_{idx}", (x, 570, 620), (2.20, 0.022, 0.095), "photoreal_sign_plate")
            self._cube(f"TargetHero6_london_deep_red_awning_{idx}", (x, 566, 575), (2.00, 0.024, 0.080), "photoreal_bus_lane")
        for idx, x in enumerate([-820, -520, -220, 80, 380, 680]):
            self._cube(f"TargetHero6_london_foreground_road_tar_seam_{idx}", (x, -932, 452), (0.90, 0.020, 0.012), "photoreal_crack_overlay")
        for idx, x in enumerate([-640, -80, 480]):
            self._mesh_actor(
                f"TargetHero6_london_grounded_fbx_signal_pole_{idx}",
                f"{mesh_root}/signal_pole_slim",
                (x, -940, 590),
                (0.000030, 0.000030, 0.000034),
                "photoreal_metal",
            )
            self._mesh_actor(
                f"TargetHero6_london_grounded_fbx_signal_head_{idx}",
                f"{mesh_root}/signal_head_uk_high_fidelity",
                (x + 24, -944, 690),
                (0.000040, 0.000040, 0.000040),
                "signal",
            )

        self._cube("TargetHero6_london_left_masonry_camera_wall", (-1115, -360, 680), (0.16, 3.6, 2.35), "photoreal_brick")
        self._cube("TargetHero6_london_right_masonry_camera_wall", (1120, -140, 700), (0.18, 3.8, 2.45), "photoreal_brick")
        self._cube("TargetHero6_london_horizon_masonry_band_left", (-600, 760, 680), (3.8, 0.045, 2.05), "photoreal_brick")
        self._cube("TargetHero6_london_horizon_masonry_band_right", (360, 760, 700), (4.2, 0.045, 2.15), "photoreal_brick")

        self._cube("TargetHero6_london_foreground_pavement_left", (-540, -760, 500), (6.6, 0.55, 0.020), "photoreal_sidewalk")
        self._cube("TargetHero6_london_foreground_pavement_right", (560, -760, 502), (5.8, 0.55, 0.020), "photoreal_sidewalk")
        self._cube("TargetHero6_london_red_bus_lane_visible", (-430, -420, 486), (8.4, 0.52, 0.010), "photoreal_bus_lane")
        self._cube("TargetHero6_london_cycle_box_visible", (560, -520, 488), (1.9, 0.88, 0.010), "target_cycle_box")
        self._cube("TargetHero6_london_yellow_box_core_visible", (120, -20, 490), (4.55, 2.20, 0.010), "photoreal_yellow_worn")
        for idx, off in enumerate([-380, -250, -120, 10, 140, 270, 400]):
            self._cube(f"TargetHero6_london_yellow_box_grid_a_{idx}", (120 + off * 0.22, -20 + off * 0.12, 502 + idx), (0.045, 3.35, 0.010), "photoreal_yellow_worn")
            self._cube(f"TargetHero6_london_yellow_box_grid_b_{idx}", (120 + off * 0.22, -20 - off * 0.12, 510 + idx), (0.045, 3.35, 0.010), "photoreal_yellow_worn")
        for idx, y in enumerate([-675, -640]):
            self._cube(f"TargetHero6_london_double_yellow_foreground_{idx}", (-180, y, 520 + idx), (8.8, 0.030, 0.010), "photoreal_yellow_worn")
        for idx, x in enumerate([-720, -520, -320, -120, 80, 280, 480, 680]):
            self._cube(f"TargetHero6_london_lane_stud_readable_{idx}", (x, -265, 524), (0.08, 0.026, 0.010), "photoreal_white_worn")
        for idx, (x0, x1, y) in enumerate([(-980, -470, -805), (-400, 120, -805), (190, 720, -805)]):
            cx = (x0 + x1) / 2
            self._mesh_actor(
                f"TargetHero6_london_grounded_fbx_railing_{idx}",
                f"{mesh_root}/london_pedestrian_railing_high_fidelity",
                (cx, y, 500),
                (0.000024, 0.000024, 0.000026),
                "photoreal_metal",
            )


    def _build_london_final_beauty_layer(self) -> None:
        """Human-inspected London final layer using existing photoreal texture assets.

        The earlier target/proof layers use cube cards, which show textured side faces in
        oblique capture. This layer keeps the proven wet-road and facade assets on planes,
        then adds real mesh furniture so the final frame is not just a disconnected photo card.
        """
        mesh_root = "/Game/PhotorealRoadKit/Meshes"
        self._cube(
            "LondonFinal_london_facade_road_backplate_card",
            (-90, 610, 655),
            (36.0, 0.010, 6.25),
            "custom_imagegen_london_facade_road_backplate",
        )
        self._cube(
            "LondonFinal_london_left_facade_return_card",
            (-1280, 440, 640),
            (13.0, 0.010, 5.85),
            "custom_imagegen_london_facade_road_backplate",
        )
        self._cube(
            "LondonFinal_london_wet_yellow_box_road_card",
            (0, -250, 426),
            (25.6, 11.2, 0.002),
            "custom_imagegen_london_wet_yellow_box_atlas",
        )
        for idx, (x, y, rot) in enumerate([(-720, -690, 0), (-420, -690, 0), (-120, -690, 0), (220, -690, 0), (560, -690, 0)]):
            self._mesh_actor(
                f"LondonFinal_london_foreground_black_railing_{idx}",
                f"{mesh_root}/london_pedestrian_railing_high_fidelity",
                (x, y, 438),
                (0.000026, 0.000026, 0.000028),
                "photoreal_metal",
                rotation=(0, 0, rot),
            )
        for idx, (x, y, z) in enumerate([(-700, -530, 590), (-180, -480, 610), (420, -430, 600)]):
            self._mesh_actor(
                f"LondonFinal_london_signal_head_mesh_{idx}",
                f"{mesh_root}/signal_head_uk_high_fidelity",
                (x, y, z),
                (0.000036, 0.000036, 0.000036),
                "signal",
            )
            self._mesh_actor(
                f"LondonFinal_london_signal_pole_mesh_{idx}",
                f"{mesh_root}/signal_pole_slim",
                (x - 10, y + 8, 465),
                (0.000032, 0.000032, 0.000040),
                "photoreal_metal",
            )
        for idx, (x, y) in enumerate([(-650, -620), (650, -610), (-760, 365), (760, 370)]):
            self._mesh_actor(
                f"LondonFinal_london_streetlight_mesh_{idx}",
                f"{mesh_root}/london_streetlight_high_fidelity",
                (x, y, 438),
                (0.000024, 0.000024, 0.000030),
                "photoreal_metal",
            )


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
