// buildingFootprints.ts
// Metric building volumes for 강남역 사거리 P2 photoreal building system.
// All positions are [x, y=height/2, z] in three.js world units (1 unit = 1 metre).
// Coordinate convention: +x = East, -z = North, +z = South, +y = Up.
//
// Buildings are placed OUTSIDE the road + sidewalk safe clearance zone:
//   강남대로 (N/S): half-carriageway 18 m + curb 0.45 m + sidewalk 5.5 m + 2 m margin ≈ 26 m
// Each entry's nearest footprint edge satisfies |x| ≥ BUILDING_SAFE_X OR |z| ≥ BUILDING_SAFE_Z.

import {
  INTERSECTION_BOX_X_METERS,
  INTERSECTION_BOX_Z_METERS,
  type Vector3Tuple
} from "./roadGeometry";

export type BuildingType = "glass-tower" | "glass-high-rise" | "mid-rise" | "low-rise";

export type BuildingFootprint = {
  id: string;
  /** Geometric centre [x, y=h/2, z] so y_min=0 (ground) and y_max=size[1]. */
  position: Vector3Tuple;
  /** [width(x), height(y), depth(z)] in metres. */
  size: Vector3Tuple;
  type: BuildingType;
  /** CSS hex for glass tint / facade colour. */
  tint: string;
};

/** Minimum distance from centre to nearest building face on the E/W axis (beyond road + sidewalk). */
export const BUILDING_SAFE_X = INTERSECTION_BOX_X_METERS / 2 + 7.95; // ≈ 25.95 m

/** Minimum distance from centre to nearest building face on the N/S axis (beyond road + sidewalk). */
export const BUILDING_SAFE_Z = INTERSECTION_BOX_Z_METERS / 2 + 7.95; // ≈ 25.95 m

export const BUILDING_FOOTPRINTS: BuildingFootprint[] = [
  // ───── SW QUADRANT: 3 Samsung-Town-style glass office towers (115–150 m) ─────
  // The tallest concentration matches the real-world Samsung C&T / GS Tower cluster
  // south-west of 강남역 사거리.  Heights 115–150 m, blue-green curtain-wall tints.
  {
    id: "sw-glass-tower-1",
    position: [-55, 75, 65],
    size: [30, 150, 42],
    type: "glass-tower",
    tint: "#3a5f7a"
  },
  {
    id: "sw-glass-tower-2",
    position: [-86, 65, 52],
    size: [26, 130, 36],
    type: "glass-tower",
    tint: "#4a7060"
  },
  {
    id: "sw-glass-tower-3",
    position: [-48, 57.5, 105],
    size: [22, 115, 30],
    type: "glass-tower",
    tint: "#3f5570"
  },

  // ───── 강남대로 N corridor: glass-and-steel canyon E + W frontage (45–80 m) ─────
  {
    id: "gangnam-n-east-near",
    position: [38, 40, -38],
    size: [18, 80, 40],
    type: "glass-high-rise",
    tint: "#4a6080"
  },
  {
    id: "gangnam-n-east-mid",
    position: [40, 32.5, -85],
    size: [16, 65, 38],
    type: "glass-high-rise",
    tint: "#3d5570"
  },
  {
    id: "gangnam-n-east-far",
    position: [44, 22.5, -132],
    size: [14, 45, 35],
    type: "glass-high-rise",
    tint: "#4a6878"
  },
  {
    id: "gangnam-n-west-near",
    position: [-40, 37.5, -36],
    size: [20, 75, 40],
    type: "glass-high-rise",
    tint: "#506070"
  },
  {
    id: "gangnam-n-west-mid",
    position: [-38, 27.5, -82],
    size: [16, 55, 36],
    type: "glass-high-rise",
    tint: "#455a6a"
  },
  {
    id: "gangnam-n-west-far",
    position: [-44, 22.5, -128],
    size: [14, 45, 35],
    type: "glass-high-rise",
    tint: "#3f5568"
  },

  // ───── 테헤란로 E corridor: mid-rise blocks N + S frontage (30–45 m) ─────
  {
    id: "teheran-e-north-near",
    position: [48, 20, -36],
    size: [32, 40, 18],
    type: "mid-rise",
    tint: "#405c72"
  },
  {
    id: "teheran-e-north-mid",
    position: [98, 17.5, -36],
    size: [40, 35, 18],
    type: "mid-rise",
    tint: "#5a6870"
  },
  {
    id: "teheran-e-north-far",
    position: [145, 15, -36],
    size: [38, 30, 18],
    type: "mid-rise",
    tint: "#485866"
  },
  {
    id: "teheran-e-south-near",
    position: [48, 17.5, 36],
    size: [32, 35, 18],
    type: "mid-rise",
    tint: "#405c72"
  },
  {
    id: "teheran-e-south-mid",
    position: [98, 15, 36],
    size: [40, 30, 18],
    type: "mid-rise",
    tint: "#485868"
  },
  {
    id: "teheran-e-south-far",
    position: [145, 12.5, 36],
    size: [38, 25, 18],
    type: "mid-rise",
    tint: "#4a5a68"
  },

  // ───── 서초대로 W corridor: mid-rise N + S frontage (22–35 m) ─────
  {
    id: "seocheo-w-north-near",
    position: [-48, 17.5, -36],
    size: [30, 35, 18],
    type: "mid-rise",
    tint: "#4a5866"
  },
  {
    id: "seocheo-w-north-mid",
    position: [-95, 15, -36],
    size: [38, 30, 18],
    type: "mid-rise",
    tint: "#485a62"
  },
  {
    id: "seocheo-w-north-far",
    position: [-140, 12.5, -36],
    size: [36, 25, 18],
    type: "mid-rise",
    tint: "#445862"
  },
  {
    id: "seocheo-w-south-near",
    position: [-48, 14, 38],
    size: [30, 28, 18],
    type: "mid-rise",
    tint: "#505a60"
  },
  {
    id: "seocheo-w-south-mid",
    position: [-90, 12.5, 40],
    size: [36, 25, 18],
    type: "low-rise",
    tint: "#4a5660"
  },
  {
    id: "seocheo-w-south-far",
    position: [-135, 11, 40],
    size: [36, 22, 18],
    type: "low-rise",
    tint: "#485060"
  },

  // ───── 강남대로 S corridor: canyon frontage E + W sides (35–55 m) ─────
  {
    id: "gangnam-s-east-near",
    position: [36, 22.5, 46],
    size: [16, 45, 38],
    type: "glass-high-rise",
    tint: "#4a6878"
  },
  {
    id: "gangnam-s-east-mid",
    position: [40, 17.5, 86],
    size: [16, 35, 36],
    type: "mid-rise",
    tint: "#556070"
  },
  {
    id: "gangnam-s-east-far",
    position: [38, 27.5, 116],
    size: [18, 55, 36],
    type: "mid-rise",
    tint: "#4a5c70"
  },
  {
    id: "gangnam-s-west-near",
    position: [-36, 20, 44],
    size: [16, 40, 30],
    type: "glass-high-rise",
    tint: "#3f5870"
  },
  {
    id: "gangnam-s-west-mid",
    position: [-38, 17.5, 78],
    size: [16, 35, 36],
    type: "mid-rise",
    tint: "#485a66"
  },

  // ───── Distant horizon ring: fills the far skyline beyond corridor ends ─────
  // Simple low-detail volumes at ~190–200 m from centre so the horizon is never empty.
  {
    id: "bg-north-east",
    position: [65, 30, -195],
    size: [85, 60, 28],
    type: "low-rise",
    tint: "#3a4a5a"
  },
  {
    id: "bg-north-west",
    position: [-65, 25, -195],
    size: [85, 50, 28],
    type: "low-rise",
    tint: "#404a58"
  },
  {
    id: "bg-south",
    position: [0, 18, 190],
    size: [115, 36, 28],
    type: "low-rise",
    tint: "#3a4a5a"
  },
  {
    id: "bg-east",
    position: [195, 22, 0],
    size: [28, 44, 90],
    type: "low-rise",
    tint: "#3f4a58"
  },
  {
    id: "bg-west",
    position: [-195, 18, 0],
    size: [28, 36, 90],
    type: "low-rise",
    tint: "#3a4858"
  }
];
