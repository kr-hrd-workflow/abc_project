// buildingFootprints.ts
// Faithful metric building volumes for the REAL 강남역 사거리 skyline (P3).
// All positions are [x, y=height/2, z] in three.js world units (1 unit = 1 metre).
// Coordinate convention: +x = East, -x = West, -z = North, +z = South, +y = Up.
// Intersection centre at the origin; road corridors/box from roadGeometry.
//
// Real-world character (asymmetric — this is the key identity of 강남역):
//   • SW corner (-x,+z): 서초 삼성타운 glass-tower cluster — the landmark + skyline
//     PEAK: one dominant ~203 m tower (44 fl) + two ~151 m towers (32-34 fl).
//   • West along 서초대로 (-x): GT Tower ~130 m, a slender all-glass tower.
//   • SE frontage of 강남대로 (+x,+z): Meritz Tower ~120 m glass office.
//   • Corners NE/NW/SE: mid-rise commercial/retail (~40-80 m) — broad,
//     billboard-heavy blocks (메가박스 NW, 스타벅스/clinics/brand stores SE), NOT towers.
//   • Receding EAST along 테헤란로 (+x): progressively taller office towers
//     (Teheran Valley) growing into the distance.
//   • Distant ring fills the horizon silhouette.
//
// Safe-zone: every footprint's near edge sits beyond the carriageway + sidewalk
// clearance (|edge| ≥ BUILDING_SAFE on at least one axis), so vehicles are
// occluded by true 3D depth and never overlap the road.

import {
  INTERSECTION_BOX_X_METERS,
  INTERSECTION_BOX_Z_METERS,
  type Vector3Tuple
} from "./roadGeometry";

// Building form drives rendering: glass curtain-wall towers vs billboard-heavy
// mid-rise commercial blocks vs low-detail distant horizon massing.
export type BuildingForm = "glassTower" | "midriseCommercial" | "distant";

export type BuildingFootprint = {
  id: string;
  /** Geometric centre [x, y=h/2, z] so y_min=0 (ground) and y_max=size[1]. */
  position: Vector3Tuple;
  /** [width(x), height(y), depth(z)] in metres. */
  size: Vector3Tuple;
  form: BuildingForm;
  /** CSS hex for glass tint / facade colour. */
  tint: string;
  /** Mid-rise commercial frontage carries LED billboard/signage planes. */
  billboards?: boolean;
};

/** Minimum distance from centre to nearest building face on the E/W axis. */
export const BUILDING_SAFE_X = INTERSECTION_BOX_X_METERS / 2 + 7.95; // ≈ 25.95 m

/** Minimum distance from centre to nearest building face on the N/S axis. */
export const BUILDING_SAFE_Z = INTERSECTION_BOX_Z_METERS / 2 + 7.95; // ≈ 25.95 m

export const BUILDING_FOOTPRINTS: BuildingFootprint[] = [
  // ───── SW (-x,+z): 서초 삼성타운 — landmark glass-tower cluster + skyline PEAK ─────
  // One dominant ~203 m tower flanked by two ~151 m towers, clustered along the
  // 강남대로 west / 서초대로 south frontage, ~0–250 m SW of centre.
  {
    id: "samsung-town-main", // dominant 44-floor peak
    position: [-72, 101.5, 92],
    size: [40, 203, 40],
    form: "glassTower",
    tint: "#3a5f7a"
  },
  {
    id: "samsung-town-c2", // ~32 fl
    position: [-112, 75.5, 74],
    size: [32, 151, 34],
    form: "glassTower",
    tint: "#3f5570"
  },
  {
    id: "samsung-town-c3", // ~34 fl
    position: [-60, 75.5, 142],
    size: [30, 151, 32],
    form: "glassTower",
    tint: "#43607a"
  },

  // ───── West along 서초대로 (-x): GT Tower — slender distinctive all-glass ─────
  {
    id: "gt-tower",
    position: [-156, 65, 44],
    size: [24, 130, 30],
    form: "glassTower",
    tint: "#4a7060"
  },

  // ───── SE frontage of 강남대로 (+x,+z): Meritz Tower ~30 fl glass office ─────
  {
    id: "meritz-tower",
    position: [42, 60, 74],
    size: [26, 120, 30],
    form: "glassTower",
    tint: "#46627c"
  },

  // ───── Corner mid-rise commercial/retail (billboard-heavy, NOT towers) ─────
  // NW corner (-x,-z): 메가박스 cinema + retail block.
  {
    id: "nw-corner-megabox",
    position: [-46, 29, -46],
    size: [40, 58, 38],
    form: "midriseCommercial",
    tint: "#5a6470",
    billboards: true
  },
  // NE corner (+x,-z): commercial/office retail block.
  {
    id: "ne-corner-commercial",
    position: [46, 26, -46],
    size: [38, 52, 36],
    form: "midriseCommercial",
    tint: "#586470",
    billboards: true
  },
  // SE corner (+x,+z): 스타벅스 / clinics / fashion-cosmetic brand stores.
  {
    id: "se-corner-retail",
    position: [44, 24, 44],
    size: [34, 48, 34],
    form: "midriseCommercial",
    tint: "#606a74",
    billboards: true
  },

  // 강남대로 retail canyon frontages (N) — mid-rise commercial, billboard signage.
  {
    id: "gangnam-n-west-commercial",
    position: [-40, 23, -94],
    size: [18, 46, 44],
    form: "midriseCommercial",
    tint: "#556070",
    billboards: true
  },
  {
    id: "gangnam-n-east-commercial",
    position: [40, 26, -98],
    size: [18, 52, 46],
    form: "midriseCommercial",
    tint: "#586472",
    billboards: true
  },
  // 강남대로 south frontages — lower mixed retail.
  {
    id: "gangnam-s-west-commercial",
    position: [-40, 20, 96],
    size: [18, 40, 44],
    form: "midriseCommercial",
    tint: "#525c68",
    billboards: true
  },
  {
    id: "gangnam-s-east-commercial",
    position: [42, 22, 122],
    size: [18, 44, 42],
    form: "midriseCommercial",
    tint: "#54606c"
  },

  // ───── Receding EAST along 테헤란로 (+x): progressively taller office towers ─────
  // Teheran Valley — glass towers grow taller into the distance (peaking far off).
  {
    id: "teheran-e1-near",
    position: [74, 36, -42],
    size: [30, 72, 30],
    form: "glassTower",
    tint: "#40607a"
  },
  {
    id: "teheran-e2",
    position: [118, 48, 44],
    size: [30, 96, 32],
    form: "glassTower",
    tint: "#3f5872"
  },
  {
    id: "teheran-e3",
    position: [176, 66, -46],
    size: [30, 132, 32],
    form: "glassTower",
    tint: "#456078"
  },
  {
    id: "teheran-e4-far", // distant Teheran-Valley peak (GFC-scale, far off)
    position: [236, 92, 42],
    size: [32, 184, 34],
    form: "glassTower",
    tint: "#42587a"
  },

  // West along 서초대로 — mid-rise office filler beyond GT Tower.
  {
    id: "seocheo-w-mid",
    position: [-108, 33, -44],
    size: [34, 66, 30],
    form: "midriseCommercial",
    tint: "#566472"
  },

  // ───── Distant ring: low-detail horizon silhouette ─────
  // East ring is taller (Teheran Valley distance); other sides lower.
  {
    id: "bg-north-east",
    position: [70, 34, -210],
    size: [90, 68, 30],
    form: "distant",
    tint: "#3a4a5a"
  },
  {
    id: "bg-north-west",
    position: [-78, 28, -208],
    size: [92, 56, 30],
    form: "distant",
    tint: "#3c4656"
  },
  {
    id: "bg-east-far",
    position: [300, 70, 30],
    size: [40, 140, 120],
    form: "distant",
    tint: "#3a4a60"
  },
  {
    id: "bg-south",
    position: [0, 22, 205],
    size: [130, 44, 30],
    form: "distant",
    tint: "#3a4a5a"
  },
  {
    id: "bg-west",
    position: [-210, 24, -10],
    size: [30, 48, 110],
    form: "distant",
    tint: "#384656"
  }
];
