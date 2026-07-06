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
// Safe-zone: every footprint's near edge sits beyond the carriageway + a narrow
// (~4.5 m, realistic Seoul) sidewalk clearance (|edge| ≥ BUILDING_SAFE on the
// axis facing its road), so buildings line the streets tightly (dense canyon)
// yet still stay strictly OUTSIDE the carriageway, occluding vehicles by true 3D
// depth and never overlapping the road box / corridors.

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

// Sidewalk clearance from the carriageway edge to the nearest building face.
// ~4.5 m = a realistic Gangnam-daero sidewalk, so buildings front the street
// tightly (was 7.95 m, which read as wide empty plazas). Still > 0 so the
// near face is always OUTSIDE the carriageway box.
const SIDEWALK_CLEARANCE_M = 4.5;

/** Minimum distance from centre to nearest building face on the E/W axis. */
export const BUILDING_SAFE_X = INTERSECTION_BOX_X_METERS / 2 + SIDEWALK_CLEARANCE_M; // ≈ 22.5 m

/** Minimum distance from centre to nearest building face on the N/S axis. */
export const BUILDING_SAFE_Z = INTERSECTION_BOX_Z_METERS / 2 + SIDEWALK_CLEARANCE_M; // ≈ 22.5 m

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
  // Pulled to the 서초대로 south frontage (near-z ≈ 22.5 m).
  {
    id: "gt-tower",
    position: [-156, 65, 37],
    size: [24, 130, 30],
    form: "glassTower",
    tint: "#4a7060"
  },

  // ───── SE frontage of 강남대로 (+x,+z): Meritz Tower ~30 fl glass office ─────
  // Pulled to the 강남대로 east frontage (near-x ≈ 22.5 m).
  {
    id: "meritz-tower",
    position: [35, 60, 74],
    size: [26, 120, 30],
    form: "glassTower",
    tint: "#46627c"
  },

  // ───── Corner mid-rise commercial/retail (billboard-heavy, NOT towers) ─────
  // Pulled tight into each corner so near faces ≈ 22.5 m on BOTH axes (dense).
  // NW corner (-x,-z): 메가박스 cinema + retail block.
  {
    id: "nw-corner-megabox",
    position: [-42, 29, -41],
    size: [40, 58, 38],
    form: "midriseCommercial",
    tint: "#5a6470",
    billboards: true
  },
  // NE corner (+x,-z): commercial/office retail block.
  {
    id: "ne-corner-commercial",
    position: [41, 26, -40],
    size: [38, 52, 36],
    form: "midriseCommercial",
    tint: "#586470",
    billboards: true
  },
  // SE corner (+x,+z): 스타벅스 / clinics / fashion-cosmetic brand stores.
  {
    id: "se-corner-retail",
    position: [40, 24, 40],
    size: [34, 48, 34],
    form: "midriseCommercial",
    tint: "#606a74",
    billboards: true
  },
  // SW corner (-x,+z): brand/retail block fronting the intersection (the Samsung
  // towers sit set back, so this fills the SW street corner that was bare).
  {
    id: "sw-corner-retail",
    position: [-42, 27, 42],
    size: [36, 54, 34],
    form: "midriseCommercial",
    tint: "#5c6672",
    billboards: true
  },

  // 강남대로 retail canyon frontages (N) — mid-rise commercial, billboard signage.
  // Pulled to the carriageway edge (near-x ≈ 22.5 m) so they line 강남대로 tightly.
  {
    id: "gangnam-n-west-commercial",
    position: [-31, 23, -94],
    size: [18, 46, 44],
    form: "midriseCommercial",
    tint: "#556070",
    billboards: true
  },
  {
    id: "gangnam-n-east-commercial",
    position: [31, 26, -98],
    size: [18, 52, 46],
    form: "midriseCommercial",
    tint: "#586472",
    billboards: true
  },
  // 강남대로 south frontages — lower mixed retail.
  {
    id: "gangnam-s-west-commercial",
    position: [-31, 20, 96],
    size: [18, 40, 44],
    form: "midriseCommercial",
    tint: "#525c68",
    billboards: true
  },
  {
    id: "gangnam-s-east-commercial",
    position: [31, 22, 122],
    size: [18, 44, 42],
    form: "midriseCommercial",
    tint: "#54606c"
  },
  // 강남대로 frontage fillers — close the gaps between the corner blocks and the
  // set-back frontage blocks so the avenue reads as a continuous canyon wall.
  {
    id: "gangnam-n-west-fill",
    position: [-31, 21, -72],
    size: [18, 42, 30],
    form: "midriseCommercial",
    tint: "#54606e",
    billboards: true
  },
  {
    id: "gangnam-n-east-fill",
    position: [31, 24, -72],
    size: [18, 48, 30],
    form: "midriseCommercial",
    tint: "#566270",
    billboards: true
  },
  {
    id: "gangnam-s-west-fill",
    position: [-31, 22, 66],
    size: [18, 44, 34],
    form: "midriseCommercial",
    tint: "#525c6a",
    billboards: true
  },
  {
    id: "gangnam-s-east-fill",
    position: [31, 20, 100],
    size: [18, 40, 30],
    form: "midriseCommercial",
    tint: "#54606c"
  },

  // ───── Receding EAST along 테헤란로 (+x): progressively taller office towers ─────
  // Teheran Valley — glass towers grow taller into the distance (peaking far off).
  // Pulled to the 테헤란로 frontage (near-z ≈ 22.5 m), alternating N/S sides.
  // teheran-e1-near/e3 nudged +25/+16m east (2026-07-01) to open a clean gap for
  // teheran-frontage-n1's hero footprint below — was overlapping ne-corner-commercial.
  {
    id: "teheran-e1-near",
    position: [99, 36, -37],
    size: [30, 72, 30],
    form: "glassTower",
    tint: "#40607a"
  },
  {
    id: "teheran-e2",
    position: [118, 48, 38],
    size: [30, 96, 32],
    form: "glassTower",
    tint: "#3f5872"
  },
  {
    id: "teheran-e3",
    position: [192, 66, -38],
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
  // 테헤란로 frontage fillers — line both kerbs of the avenue (the previously bare
  // east plaza). Mid-rise near the junction, then receding glass towers eastward.
  // n1/s1 narrowed 30m->22m and nudged east (2026-07-01) — at 30m wide they
  // overlapped ne-corner-commercial/se-corner-retail's hero footprints by 12-15m;
  // n1 also needed teheran-e1-near/n2/n3/e3 nudged further out to open the gap.
  {
    id: "teheran-frontage-n1",
    position: [72, 27, -36],
    size: [22, 54, 26],
    form: "midriseCommercial",
    tint: "#586472",
    billboards: true
  },
  {
    id: "teheran-frontage-s1",
    position: [69, 30, 36],
    size: [22, 60, 26],
    form: "midriseCommercial",
    tint: "#566270",
    billboards: true
  },
  {
    id: "teheran-frontage-s2",
    position: [95, 42, 37],
    size: [28, 84, 28],
    form: "glassTower",
    tint: "#3f5a76"
  },
  {
    id: "teheran-frontage-n2",
    position: [130, 46, -37],
    size: [30, 92, 30],
    form: "glassTower",
    tint: "#425e78"
  },
  {
    id: "teheran-frontage-n3",
    position: [161, 55, -37],
    size: [30, 110, 30],
    form: "glassTower",
    tint: "#3f5872"
  },
  {
    id: "teheran-frontage-s3",
    position: [150, 60, 37],
    size: [30, 120, 30],
    form: "glassTower",
    tint: "#46607a"
  },

  // West along 서초대로 — mid-rise office filler beyond GT Tower. Pulled to the
  // 서초대로 north frontage (near-z ≈ 22.5 m).
  {
    id: "seocheo-w-mid",
    position: [-108, 33, -37],
    size: [34, 66, 30],
    form: "midriseCommercial",
    tint: "#566472"
  },
  // 서초대로 frontage fillers — line the avenue both sides so the west arm is a
  // continuous wall instead of isolated towers with bare ground between.
  // n1/s1 narrowed and nudged further from the intersection (2026-07-01) — at
  // their original width/position they overlapped nw-corner-megabox/sw-corner-retail's
  // hero footprints by 12-16m; now sit centered in the gap to seocheo-w-mid/s2.
  {
    id: "seocheo-n1",
    position: [-76.5, 28, -36],
    size: [27, 56, 28],
    form: "midriseCommercial",
    tint: "#586470",
    billboards: true
  },
  {
    id: "seocheo-s1",
    position: [-74.5, 29, 36],
    size: [27, 58, 28],
    form: "midriseCommercial",
    tint: "#5a6470",
    billboards: true
  },
  {
    id: "seocheo-s2",
    position: [-104, 36, 37],
    size: [30, 72, 30],
    form: "midriseCommercial",
    tint: "#54606e"
  },

  // Rear quadrant fill — simple off-carriageway massing behind the hero
  // frontage blocks, so the operator-wide camera reads as a denser city grid
  // without adding new facade assets or simulation truth.
  {
    id: "northwest-rear-fill",
    position: [-118, 32, -118],
    size: [42, 64, 36],
    form: "midriseCommercial",
    tint: "#525e6a"
  },
  {
    id: "northeast-rear-fill",
    position: [126, 34, -126],
    size: [44, 68, 38],
    form: "midriseCommercial",
    tint: "#566270"
  },
  {
    id: "southwest-rear-fill",
    position: [-132, 36, 126],
    size: [46, 72, 38],
    form: "midriseCommercial",
    tint: "#56606c"
  },
  {
    id: "southeast-rear-fill",
    position: [132, 30, 134],
    size: [42, 60, 36],
    form: "midriseCommercial",
    tint: "#54606c"
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
