import type { Direction } from "../../lib/types";
import {
  INTERSECTION_LANE_WIDTH_METERS,
  INTERSECTION_TRUTH,
  getApproachHasCrosswalk,
  getApproachHasMedianBus,
  getApproachInboundLaneCount,
  getApproachOutboundLaneCount,
  getApproachRoadWidthMeters
} from "./intersectionTruth";

export type Vector3Tuple = [number, number, number];

export type CorridorOrientation = "north_south" | "east_west";

export type ApproachCorridorSpec = {
  direction: Direction;
  lengthMeters: number;
  inboundLanes: number;
  outboundLanes: number;
  orientation: CorridorOrientation;
  position: Vector3Tuple;
  size: [number, number];
};

export type BoxPrimitiveSpec = {
  id: string;
  direction: Direction;
  position: Vector3Tuple;
  size: Vector3Tuple;
};

export type CityEdgeBlockSpec = BoxPrimitiveSpec & {
  sourceBuildingId: string;
};

export type PlanePrimitiveSpec = {
  id: string;
  direction: Direction;
  position: Vector3Tuple;
  size: [number, number];
  rotationY?: number;
};

// Looser plane spec for batches not tied to a single approach direction
// (city-wide ground/apron planes) — same shape InstancedPlaneBatch consumes.
export type PlaneBatchSpec = {
  id: string;
  position: Vector3Tuple;
  size: [number, number];
  rotationY?: number;
};

export type TurnArrowPartKind = "shaft" | "head_left" | "head_right";

export type TurnArrowMarkingPart = PlanePrimitiveSpec & {
  kind: TurnArrowPartKind;
};

export type TurnArrowMarking = {
  id: string;
  direction: Direction;
  parts: TurnArrowMarkingPart[];
};

export const STAGE3_SCENE_UNITS = {
  unitScale: "1_three_unit_equals_1_meter",
  center: [0, 0, 0] as Vector3Tuple,
  roadPlane: "x_z",
  heightAxis: "y",
  northAxis: "negative_z"
} as const;

export const STAGE3_CAMERA = {
  position: [72, 62, 88] as Vector3Tuple,
  target: [0, 0, 0] as Vector3Tuple,
  fov: 38,
  near: 0.1,
  far: 500
} as const;

export const STAGE5_CAMERA = {
  position: [26, 82, 116] as Vector3Tuple,
  target: [0, 0, -34] as Vector3Tuple,
  fov: 50,
  near: 0.1,
  far: 520
} as const;

export const STAGE5_TALL_VIEWPORT_CAMERA = {
  position: [0, 54, 52] as Vector3Tuple,
  target: [0, 0, -8] as Vector3Tuple,
  fov: 76,
  near: STAGE5_CAMERA.near,
  far: STAGE5_CAMERA.far
} as const;

export function getStage5CameraForAspect(aspect: number) {
  if (!Number.isFinite(aspect) || aspect <= 0) {
    return STAGE5_CAMERA;
  }

  return aspect < 1.08 ? STAGE5_TALL_VIEWPORT_CAMERA : STAGE5_CAMERA;
}

export const LANE_WIDTH_METERS = INTERSECTION_LANE_WIDTH_METERS;

// Per-corridor carriageway helper (SSOT-derived).
function corridorWidth(direction: Direction): number {
  return getApproachRoadWidthMeters(direction);
}

// Axis-aware junction box: its E–W extent is the 강남대로 carriageway (the N–S
// road's width spans x); its N–S extent is the widest E–W road (테헤란로 vs 서초대로).
export const INTERSECTION_BOX_X_METERS = corridorWidth("north");
export const INTERSECTION_BOX_Z_METERS = Math.max(
  corridorWidth("east"),
  corridorWidth("west")
);
// Back-compat square footprint (used by ground-plane / proxy consumers).
export const INTERSECTION_BOX_METERS = Math.max(
  INTERSECTION_BOX_X_METERS,
  INTERSECTION_BOX_Z_METERS
);

// Axis-aware extent record for Section D consumers (.ew / .ns).
export const INTERSECTION_BOX_EXTENT_METERS = {
  ew: INTERSECTION_BOX_X_METERS, // 강남대로 carriageway width, spans x
  ns: INTERSECTION_BOX_Z_METERS  // max(테헤란로, 서초대로), spans z
} as const;

// Back-compat single-width scalar (= 강남대로 carriageway) for legacy consumers
// (LightingRig, WetRoadReflectors, WeatherAndAtmosphere, ProceduralIntersection).
export const ROAD_WIDTH_METERS = corridorWidth("north");

// Deprecated single-value lane counts kept as 강남대로 arterial defaults; real
// per-approach counts come from getApproachInboundLaneCount/OutboundLaneCount.
export const INBOUND_LANE_COUNT = getApproachInboundLaneCount("north");
export const OUTBOUND_LANE_COUNT = getApproachOutboundLaneCount("north");

// The SUMO-truth corridor (≈120–140 m) dead-ends mid-frame in the operator-wide
// view, so the imagegen plate walls the road off with buildings. Extend every
// corridor so the carriageway + all its derived markings/curbs/sidewalks/decals
// reach toward the frame edge and recede to the horizon. Tunable via env for the
// render harness (NEXT_PUBLIC_CORRIDOR_EXT_M).
const CORRIDOR_RENDER_EXTENSION_M =
  Number(process.env.NEXT_PUBLIC_CORRIDOR_EXT_M ?? "240") || 240;
export const CORRIDOR_LENGTH_METERS: Record<Direction, number> = {
  north: INTERSECTION_TRUTH.north.corridorLengthM + CORRIDOR_RENDER_EXTENSION_M,
  south: INTERSECTION_TRUTH.south.corridorLengthM + CORRIDOR_RENDER_EXTENSION_M,
  east: INTERSECTION_TRUTH.east.corridorLengthM + CORRIDOR_RENDER_EXTENSION_M,
  west: INTERSECTION_TRUTH.west.corridorLengthM + CORRIDOR_RENDER_EXTENSION_M
};

const HALF_BOX_X = INTERSECTION_BOX_X_METERS / 2;
const HALF_BOX_Z = INTERSECTION_BOX_Z_METERS / 2;
// Exported so the photoreal markings overlay (RoadSurfaceLayer, cmp=A) can build
// far-end lane-divider extension dashes with the exact same pitch/size/height as
// the committed dividers, without duplicating the magic numbers.
export const MARKING_HEIGHT = 0.018;
export const LANE_DIVIDER_MARKING_WIDTH = 0.46;
export const LANE_DIVIDER_SEGMENT_LENGTH = 7.8;
export const LANE_DIVIDER_SEGMENT_GAP = 5.2;
const CROSSWALK_STRIPE_WIDTH = 0.62;
const CURB_WIDTH = 0.45;
const CURB_HEIGHT = 0.22;
const SIDEWALK_WIDTH = 5.5;
const BUILDING_EDGE_WIDTH = 9;
const BUILDING_EDGE_HEIGHT = 5.5;
const ARROW_HEIGHT = MARKING_HEIGHT + 0.006;
const ARROW_SHAFT_LENGTH = 5.8;
const ARROW_SHAFT_WIDTH = 1.1;
const ARROW_HEAD_LENGTH = 3.4;
const ARROW_HEAD_WIDTH = 0.9;
const ARROW_HEAD_SPREAD = 0.92;
const ARROW_HEAD_OFFSET = 3.2;

export const APPROACH_CORRIDORS: ApproachCorridorSpec[] = [
  {
    direction: "north",
    lengthMeters: CORRIDOR_LENGTH_METERS.north,
    inboundLanes: getApproachInboundLaneCount("north"),
    outboundLanes: getApproachOutboundLaneCount("north"),
    orientation: "north_south",
    position: [0, 0, -HALF_BOX_Z - CORRIDOR_LENGTH_METERS.north / 2],
    size: [corridorWidth("north"), CORRIDOR_LENGTH_METERS.north]
  },
  {
    direction: "south",
    lengthMeters: CORRIDOR_LENGTH_METERS.south,
    inboundLanes: getApproachInboundLaneCount("south"),
    outboundLanes: getApproachOutboundLaneCount("south"),
    orientation: "north_south",
    position: [0, 0, HALF_BOX_Z + CORRIDOR_LENGTH_METERS.south / 2],
    size: [corridorWidth("south"), CORRIDOR_LENGTH_METERS.south]
  },
  {
    direction: "east",
    lengthMeters: CORRIDOR_LENGTH_METERS.east,
    inboundLanes: getApproachInboundLaneCount("east"),
    outboundLanes: getApproachOutboundLaneCount("east"),
    orientation: "east_west",
    position: [HALF_BOX_X + CORRIDOR_LENGTH_METERS.east / 2, 0, 0],
    size: [CORRIDOR_LENGTH_METERS.east, corridorWidth("east")]
  },
  {
    direction: "west",
    lengthMeters: CORRIDOR_LENGTH_METERS.west,
    inboundLanes: getApproachInboundLaneCount("west"),
    outboundLanes: getApproachOutboundLaneCount("west"),
    orientation: "east_west",
    position: [-HALF_BOX_X - CORRIDOR_LENGTH_METERS.west / 2, 0, 0],
    size: [CORRIDOR_LENGTH_METERS.west, corridorWidth("west")]
  }
];

export const LANE_DIVIDER_MARKINGS = APPROACH_CORRIDORS.flatMap((corridor) => {
  const dividers: PlanePrimitiveSpec[] = [];
  const laneCount = corridor.inboundLanes + corridor.outboundLanes;
  const widthM = corridorWidth(corridor.direction);
  const hasBus = getApproachHasMedianBus(corridor.direction);
  const usableLength = corridor.lengthMeters - 12;
  const segmentPitch = LANE_DIVIDER_SEGMENT_LENGTH + LANE_DIVIDER_SEGMENT_GAP;
  const segmentCount = Math.max(4, Math.floor(usableLength / segmentPitch));
  const firstSegmentOffset = -usableLength / 2 + LANE_DIVIDER_SEGMENT_LENGTH / 2;

  for (let laneIndex = 1; laneIndex < laneCount; laneIndex += 1) {
    const laneOffset = -widthM / 2 + laneIndex * LANE_WIDTH_METERS;

    // The road centre carries the yellow 중앙선; the median bus-lane borders
    // carry the blue 청색 복선. Skip white dashed dividers at those positions so
    // they don't double-paint over the colour lines.
    if (Math.abs(laneOffset) < 0.05) continue;
    if (hasBus && Math.abs(Math.abs(laneOffset) - LANE_WIDTH_METERS) < 0.05) {
      continue;
    }

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      const along = firstSegmentOffset + segmentIndex * segmentPitch;
      const wearPattern = (segmentIndex + laneIndex) % 4;
      const segmentLength =
        LANE_DIVIDER_SEGMENT_LENGTH * (wearPattern === 0 ? 0.72 : 0.92);
      const segmentWidth =
        LANE_DIVIDER_MARKING_WIDTH * (wearPattern === 1 ? 0.82 : 1);
      const laneWobble = (wearPattern - 1.5) * 0.035;

      if (corridor.orientation === "north_south") {
        dividers.push({
          id: `${corridor.direction}-lane-divider-${laneIndex}-segment-${segmentIndex}`,
          direction: corridor.direction,
          position: [
            laneOffset + laneWobble,
            MARKING_HEIGHT,
            corridor.position[2] + along
          ],
          size: [segmentWidth, segmentLength]
        });
      } else {
        dividers.push({
          id: `${corridor.direction}-lane-divider-${laneIndex}-segment-${segmentIndex}`,
          direction: corridor.direction,
          position: [
            corridor.position[0] + along,
            MARKING_HEIGHT,
            laneOffset + laneWobble
          ],
          size: [segmentLength, segmentWidth]
        });
      }
    }
  }

  return dividers;
});

export const QUEUE_ZONES = APPROACH_CORRIDORS.map((corridor) => {
  const length = Math.min(72, corridor.lengthMeters - 22);
  const offsetFromStopLine = 14 + length / 2;
  const widthM = corridorWidth(corridor.direction);

  if (corridor.direction === "north") {
    return {
      id: "north-queue-zone",
      direction: corridor.direction,
      position: [0, MARKING_HEIGHT + 0.004, -HALF_BOX_Z - offsetFromStopLine] as Vector3Tuple,
      size: [widthM - 1.6, length] as [number, number]
    };
  }
  if (corridor.direction === "south") {
    return {
      id: "south-queue-zone",
      direction: corridor.direction,
      position: [0, MARKING_HEIGHT + 0.004, HALF_BOX_Z + offsetFromStopLine] as Vector3Tuple,
      size: [widthM - 1.6, length] as [number, number]
    };
  }
  if (corridor.direction === "east") {
    return {
      id: "east-queue-zone",
      direction: corridor.direction,
      position: [HALF_BOX_X + offsetFromStopLine, MARKING_HEIGHT + 0.004, 0] as Vector3Tuple,
      size: [length, widthM - 1.6] as [number, number]
    };
  }

  return {
    id: "west-queue-zone",
    direction: corridor.direction,
    position: [-HALF_BOX_X - offsetFromStopLine, MARKING_HEIGHT + 0.004, 0] as Vector3Tuple,
    size: [length, widthM - 1.6] as [number, number]
  };
});

export const CURB_SEGMENTS = APPROACH_CORRIDORS.flatMap((corridor) => {
  const widthM = corridorWidth(corridor.direction);
  if (corridor.orientation === "north_south") {
    return [-1, 1].map((side) => ({
      id: `${corridor.direction}-curb-${side}`,
      direction: corridor.direction,
      position: [
        side * (widthM / 2 + CURB_WIDTH / 2),
        CURB_HEIGHT / 2,
        corridor.position[2]
      ] as Vector3Tuple,
      size: [CURB_WIDTH, CURB_HEIGHT, corridor.lengthMeters] as Vector3Tuple
    }));
  }

  return [-1, 1].map((side) => ({
    id: `${corridor.direction}-curb-${side}`,
    direction: corridor.direction,
    position: [
      corridor.position[0],
      CURB_HEIGHT / 2,
      side * (widthM / 2 + CURB_WIDTH / 2)
    ] as Vector3Tuple,
    size: [corridor.lengthMeters, CURB_HEIGHT, CURB_WIDTH] as Vector3Tuple
  }));
});

export const SIDEWALK_SLABS = APPROACH_CORRIDORS.flatMap((corridor) => {
  const widthM = corridorWidth(corridor.direction);
  if (corridor.orientation === "north_south") {
    return [-1, 1].map((side) => ({
      id: `${corridor.direction}-sidewalk-${side}`,
      direction: corridor.direction,
      position: [
        side * (widthM / 2 + CURB_WIDTH + SIDEWALK_WIDTH / 2),
        0.045,
        corridor.position[2]
      ] as Vector3Tuple,
      size: [SIDEWALK_WIDTH, 0.09, corridor.lengthMeters] as Vector3Tuple
    }));
  }

  return [-1, 1].map((side) => ({
    id: `${corridor.direction}-sidewalk-${side}`,
    direction: corridor.direction,
    position: [
      corridor.position[0],
      0.045,
      side * (widthM / 2 + CURB_WIDTH + SIDEWALK_WIDTH / 2)
    ] as Vector3Tuple,
    size: [corridor.lengthMeters, 0.09, SIDEWALK_WIDTH] as Vector3Tuple
  }));
});

// Orientation split for the Task 5 sidewalk paver atlas: the slabs share one
// instanced unit-box geometry, so a single texture repeat cannot be square in
// world space for both orientations (an EW slab transposes u/v vs an NS slab —
// one of them would smear the paver atlas ~70:1). Consumers batch these two
// groups with the sidewalk / sidewalkCross material pair (transposed repeats).
export const SIDEWALK_SLABS_NS = SIDEWALK_SLABS.filter(
  (slab) => slab.size[0] < slab.size[2]
);
export const SIDEWALK_SLABS_EW = SIDEWALK_SLABS.filter(
  (slab) => slab.size[0] >= slab.size[2]
);

const CITY_GROUND_HEIGHT = -0.012;

export const CITY_GROUND_APRON: PlaneBatchSpec[] = [
  {
    id: "stage5-wet-city-ground-apron",
    position: [0, CITY_GROUND_HEIGHT, -18],
    size: [260, 310]
  }
];

export const BUILDING_EDGE_BLOCKS = APPROACH_CORRIDORS.flatMap((corridor) => {
  const widthM = corridorWidth(corridor.direction);
  if (corridor.orientation === "north_south") {
    return [-1, 1].map((side) => ({
      id: `${corridor.direction}-building-edge-${side}`,
      direction: corridor.direction,
      position: [
        side * (widthM / 2 + CURB_WIDTH + SIDEWALK_WIDTH + BUILDING_EDGE_WIDTH / 2 + 1.4),
        BUILDING_EDGE_HEIGHT / 2,
        corridor.position[2]
      ] as Vector3Tuple,
      size: [BUILDING_EDGE_WIDTH, BUILDING_EDGE_HEIGHT, corridor.lengthMeters * 0.86] as Vector3Tuple
    }));
  }

  return [-1, 1].map((side) => ({
    id: `${corridor.direction}-building-edge-${side}`,
    direction: corridor.direction,
    position: [
      corridor.position[0],
      BUILDING_EDGE_HEIGHT / 2,
      side * (widthM / 2 + CURB_WIDTH + SIDEWALK_WIDTH + BUILDING_EDGE_WIDTH / 2 + 1.4)
    ] as Vector3Tuple,
    size: [corridor.lengthMeters * 0.86, BUILDING_EDGE_HEIGHT, BUILDING_EDGE_WIDTH] as Vector3Tuple
  }));
});

export const STAGE6E_CITY_EDGE_BLOCKS: CityEdgeBlockSpec[] =
  buildStage6ECityEdgeBlocks();

export const CROSSWALK_STRIPES: PlanePrimitiveSpec[] = buildCrosswalkStripes();

// ── Road-surface detail decals (day-scene fill) ────────────────────────────────
// Cast-iron manhole covers + worn-asphalt patches scattered on the approach
// carriageways. Lateral offsets stay inside each road half-width (N/S/E = 18 m,
// W = 14.4 m); longitudinal distances sit BEYOND the crosswalk (≈±20.75 m) and
// stop bar (≈±24.6 m) so a cover never lands on a painted marking. y is set by
// the decal builder's per-group lift, so only x/z matter here.
export const MANHOLE_DECALS: PlanePrimitiveSpec[] = [
  { id: "manhole-n-1", direction: "north", position: [-9, MARKING_HEIGHT, -30], size: [0.9, 0.9], rotationY: 0.3 },
  { id: "manhole-n-2", direction: "north", position: [5.4, MARKING_HEIGHT, -45], size: [0.9, 0.9], rotationY: -0.6 },
  { id: "manhole-n-3", direction: "north", position: [-3.6, MARKING_HEIGHT, -62], size: [0.9, 0.9], rotationY: 0.9 },
  { id: "manhole-s-1", direction: "south", position: [7.2, MARKING_HEIGHT, 32], size: [0.9, 0.9], rotationY: 0.15 },
  { id: "manhole-s-2", direction: "south", position: [-5.4, MARKING_HEIGHT, 50], size: [0.9, 0.9], rotationY: -0.45 },
  { id: "manhole-s-3", direction: "south", position: [10.8, MARKING_HEIGHT, 70], size: [0.9, 0.9], rotationY: 0.75 },
  { id: "manhole-e-1", direction: "east", position: [40, MARKING_HEIGHT, -7.2], size: [0.9, 0.9], rotationY: 0.5 },
  { id: "manhole-e-2", direction: "east", position: [58, MARKING_HEIGHT, 5.4], size: [0.9, 0.9], rotationY: -0.2 },
  { id: "manhole-w-1", direction: "west", position: [-38, MARKING_HEIGHT, 7.2], size: [0.9, 0.9], rotationY: 0.8 },
  { id: "manhole-w-2", direction: "west", position: [-55, MARKING_HEIGHT, -5.4], size: [0.9, 0.9], rotationY: -0.7 }
];

export const WEAR_PATCH_DECALS: PlanePrimitiveSpec[] = [
  { id: "wear-n-1", direction: "north", position: [-5.4, MARKING_HEIGHT, -40], size: [2.5, 3.5], rotationY: 0 },
  { id: "wear-n-2", direction: "north", position: [7.2, MARKING_HEIGHT, -68], size: [2.5, 3.5], rotationY: 0 },
  { id: "wear-s-1", direction: "south", position: [-7.2, MARKING_HEIGHT, 42], size: [2.5, 3.5], rotationY: 0 },
  { id: "wear-s-2", direction: "south", position: [3.6, MARKING_HEIGHT, 60], size: [2.5, 3.5], rotationY: 0 },
  { id: "wear-e-1", direction: "east", position: [48, MARKING_HEIGHT, 5.4], size: [3.5, 2.5], rotationY: 0 },
  { id: "wear-e-2", direction: "east", position: [66, MARKING_HEIGHT, -7.2], size: [3.5, 2.5], rotationY: 0 },
  { id: "wear-w-1", direction: "west", position: [-46, MARKING_HEIGHT, -7.2], size: [3.5, 2.5], rotationY: 0 },
  { id: "wear-w-2", direction: "west", position: [-60, MARKING_HEIGHT, 5.4], size: [3.5, 2.5], rotationY: 0 }
];

// Arrow lateral offset: moved from ±LANE_WIDTH_METERS (±3.6 m, the busway
// outer edge) to ±2.5 lanes (≈ ±9 m, a general through lane) so the arrows
// sit on carriageway pavement rather than on the central median bus lane.
// LEGACY: still consumed by ProceduralIntersection (fallback) + StructuralGuideLayer
// (guide mode). The live RoadSurfaceLayer now renders LANE_ARROW_DECALS instead.
export const TURN_ARROW_MARKINGS: TurnArrowMarking[] = [
  buildVerticalTurnArrow("north-turn-arrow", "north", -(LANE_WIDTH_METERS * 2.5), -34, 1),
  buildVerticalTurnArrow("south-turn-arrow", "south", LANE_WIDTH_METERS * 2.5, 34, -1),
  buildHorizontalTurnArrow("east-turn-arrow", "east", 34, LANE_WIDTH_METERS * 2.5, -1),
  buildHorizontalTurnArrow("west-turn-arrow", "west", -34, -(LANE_WIDTH_METERS * 2.5), 1)
];

// ── Realistic per-lane turn arrows (left / straight / right) ───────────────────
// One decal in the left-most general lane (좌회전), a middle lane (직진), and the
// curb lane (우회전) of each inbound approach, just upstream of the stop line.
// Lane centres mirror getInboundLaneOffset (TrafficDensityLayer SSOT) so the
// arrows sit on the same lanes the SUMO vehicles drive in.

export type LaneArrowKind = "left" | "straight" | "right";

export type LaneArrowDecal = {
  id: string;
  direction: Direction;
  kind: LaneArrowKind;
  position: Vector3Tuple;
  rotationY: number;
};

const ARROW_MARKING_HEIGHT = MARKING_HEIGHT + 0.02;
const ARROW_DIST_FROM_STOP_LINE = 13;

// Mirror of getInboundLaneOffset (TrafficDensityLayer): inbound lanes occupy the
// right-hand half measured outward from the median; laneIndex 0 = right curb,
// laneCount-1 = median-adjacent. Replicated here (not imported) to avoid pulling
// the GLTF-heavy TrafficDensityLayer into the road-surface module + its tests.
function inboundLaneCenter(
  direction: Direction,
  laneIndex: number,
  laneCount: number
): number {
  const inboundSide = direction === "north" || direction === "east" ? -1 : 1;
  return inboundSide * (laneCount - laneIndex - 0.5) * LANE_WIDTH_METERS;
}

function buildLaneArrowDecals(): LaneArrowDecal[] {
  const decals: LaneArrowDecal[] = [];

  for (const direction of ["north", "south", "east", "west"] as const) {
    const laneCount = getApproachInboundLaneCount(direction);
    const hasBus = getApproachHasMedianBus(direction);
    const rightIdx = 0;
    const leftIdx = laneCount - 1 - (hasBus ? 1 : 0); // skip the median bus lane
    const straightIdx = Math.min(
      laneCount - 1,
      Math.max(0, Math.round((rightIdx + leftIdx) / 2))
    );

    const lanes: Array<{ kind: LaneArrowKind; index: number }> = [
      { kind: "right", index: rightIdx },
      { kind: "straight", index: straightIdx },
      { kind: "left", index: leftIdx }
    ];

    for (const { kind, index } of lanes) {
      const offset = inboundLaneCenter(direction, index, laneCount);
      let position: Vector3Tuple;
      let rotationY: number;

      if (direction === "north") {
        position = [offset, ARROW_MARKING_HEIGHT, -(HALF_BOX_Z + ARROW_DIST_FROM_STOP_LINE)];
        rotationY = Math.PI;
      } else if (direction === "south") {
        position = [offset, ARROW_MARKING_HEIGHT, HALF_BOX_Z + ARROW_DIST_FROM_STOP_LINE];
        rotationY = 0;
      } else if (direction === "east") {
        position = [HALF_BOX_X + ARROW_DIST_FROM_STOP_LINE, ARROW_MARKING_HEIGHT, offset];
        rotationY = Math.PI / 2;
      } else {
        position = [-(HALF_BOX_X + ARROW_DIST_FROM_STOP_LINE), ARROW_MARKING_HEIGHT, offset];
        rotationY = -Math.PI / 2;
      }

      decals.push({ id: `${direction}-arrow-${kind}`, direction, kind, position, rotationY });
    }
  }

  return decals;
}

export const LANE_ARROW_DECALS: LaneArrowDecal[] = buildLaneArrowDecals();

// 중앙버스전용차로 (강남대로 N/S only). The bus lane is the median-adjacent lane in
// each travel direction, so each corridor gets two: inbound (-x) + outbound (+x).
// NOTE (P3): the lane surface is now plain dark asphalt (Korea marks bus lanes
// with BLUE lines, not red pavement). This export keeps the bus-lane FOOTPRINT
// (centre/size) used to place the blue border lines + 버스 text. The legacy
// MEDIAN_BUS_LANE_COLOR is retained for non-rendering consumers but is no longer
// painted on the running surface.
export const MEDIAN_BUS_LANE_COLOR = "#b0322c";

export const MEDIAN_BUS_LANE_MARKINGS: PlanePrimitiveSpec[] =
  APPROACH_CORRIDORS.flatMap((corridor) => {
    if (
      corridor.orientation !== "north_south" ||
      !getApproachHasMedianBus(corridor.direction)
    ) {
      return [];
    }
    const lateral = LANE_WIDTH_METERS / 2;
    return [-1, 1].map((side) => ({
      id: `${corridor.direction}-median-bus-lane-${side < 0 ? "inbound" : "outbound"}`,
      direction: corridor.direction,
      position: [
        side * lateral,
        MARKING_HEIGHT + 0.006,
        corridor.position[2]
      ] as Vector3Tuple,
      size: [LANE_WIDTH_METERS, corridor.lengthMeters] as [number, number]
    }));
  });

// ── Korean lane-line markings (P3 road realism, per scratchpad/road-spec.json) ──
// Colours per 도로교통법 [별표6] 노면표시: 황색 중앙선, 청색 중앙버스전용차로선, 백색 기타.
export const CENTER_LINE_COLOR = "#e3c64a"; // 황색 (yellow) 중앙선
export const BUS_LANE_BORDER_COLOR = "#2f6fd0"; // 청색 (blue) 복선
export const SOLID_LANE_LINE_COLOR = "#eceadf"; // 백색 solid lines

const SOLID_LINE_WIDTH = 0.14; // 0.10–0.15 m per line
// 중앙선 (yellow 복선) is rendered wider than the generic 0.14 m lines. At the high
// operator-wide camera a 0.14 m line is sub-pixel at a grazing angle and aliases
// into a dash-like, broken appearance (the blue 복선 does the same). The 중앙선
// must read as a continuous SOLID double-yellow line (Korean 중앙선 = solid), and
// it is the primary structure cue for photoreal plate regen, so it is widened to
// stay solid across the whole corridor at this distance.
const CENTER_LINE_WIDTH = 0.34;
const DOUBLE_LINE_GAP = 0.18; // gap between a double (복선) pair
const STOP_BAR_WIDTH = 0.45; // 정지선 0.30–0.60 m
const EDGE_LINE_INSET = 0.45; // 길가장자리구역선 inset from the curb
const GENERAL_STOP_GAP = 6.6; // m beyond the box edge (just before the crosswalk)
const BUS_STOP_ADVANCE = 0.9; // bus 정지선 advanced ahead of the general one
const LANE_RESTRICT_LENGTH = 22; // 진로변경제한선 solid run near the junction

// A longitudinal line that runs the corridor's travel axis at lateral offset
// `lateral`, centred on the corridor, spanning `lengthM` (or a near-box segment).
function longitudinalLine(
  id: string,
  corridor: ApproachCorridorSpec,
  lateral: number,
  lengthM: number,
  alongCenter: number,
  lineWidth: number
): PlanePrimitiveSpec {
  if (corridor.orientation === "north_south") {
    return {
      id,
      direction: corridor.direction,
      position: [lateral, MARKING_HEIGHT, alongCenter],
      size: [lineWidth, lengthM]
    };
  }
  return {
    id,
    direction: corridor.direction,
    position: [alongCenter, MARKING_HEIGHT, lateral],
    size: [lengthM, lineWidth]
  };
}

function doubleLine(
  idBase: string,
  corridor: ApproachCorridorSpec,
  centerLateral: number,
  lengthM: number,
  alongCenter: number,
  lineWidth: number = SOLID_LINE_WIDTH
): PlanePrimitiveSpec[] {
  const half = DOUBLE_LINE_GAP / 2 + lineWidth / 2;
  return [-1, 1].map((s) =>
    longitudinalLine(
      `${idBase}-${s < 0 ? "a" : "b"}`,
      corridor,
      centerLateral + s * half,
      lengthM,
      alongCenter,
      lineWidth
    )
  );
}

// 중앙선 — yellow double-solid at the road centre of every corridor.
export const CENTER_LINE_MARKINGS: PlanePrimitiveSpec[] =
  APPROACH_CORRIDORS.flatMap((corridor) => {
    const alongCenter =
      corridor.orientation === "north_south"
        ? corridor.position[2]
        : corridor.position[0];
    return doubleLine(
      `${corridor.direction}-center-line`,
      corridor,
      0,
      corridor.lengthMeters,
      alongCenter,
      CENTER_LINE_WIDTH
    );
  });

// 중앙버스전용차로선 — blue double-solid on the OUTER edge of each median bus lane.
export const BUS_LANE_BORDER_MARKINGS: PlanePrimitiveSpec[] =
  APPROACH_CORRIDORS.flatMap((corridor) => {
    if (
      corridor.orientation !== "north_south" ||
      !getApproachHasMedianBus(corridor.direction)
    ) {
      return [];
    }
    return [-1, 1].flatMap((side) =>
      doubleLine(
        `${corridor.direction}-bus-border-${side < 0 ? "in" : "out"}`,
        corridor,
        side * LANE_WIDTH_METERS,
        corridor.lengthMeters,
        corridor.position[2]
      )
    );
  });

// 길가장자리구역선 — white solid edge line just inside the curb, both sides.
export const EDGE_LINE_MARKINGS: PlanePrimitiveSpec[] =
  APPROACH_CORRIDORS.flatMap((corridor) => {
    const widthM = corridorWidth(corridor.direction);
    const lateral = widthM / 2 - EDGE_LINE_INSET;
    const alongCenter =
      corridor.orientation === "north_south"
        ? corridor.position[2]
        : corridor.position[0];
    return [-1, 1].map((side) =>
      longitudinalLine(
        `${corridor.direction}-edge-line-${side < 0 ? "a" : "b"}`,
        corridor,
        side * lateral,
        corridor.lengthMeters,
        alongCenter,
        SOLID_LINE_WIDTH
      )
    );
  });

// 진로변경제한선 — white SOLID lane lines for the segment nearest the junction
// (no lane change near the stop line). Same lateral positions as the dashed
// dividers, excluding the centre (yellow) and bus borders (blue).
export const LANE_RESTRICT_MARKINGS: PlanePrimitiveSpec[] =
  APPROACH_CORRIDORS.flatMap((corridor) => {
    const widthM = corridorWidth(corridor.direction);
    const laneCount = corridor.inboundLanes + corridor.outboundLanes;
    const hasBus = getApproachHasMedianBus(corridor.direction);
    const boxHalf =
      corridor.orientation === "north_south" ? HALF_BOX_Z : HALF_BOX_X;
    const sign =
      corridor.direction === "north" || corridor.direction === "east" ? -1 : 1;
    const alongCenter = sign * (boxHalf + LANE_RESTRICT_LENGTH / 2);

    const lines: PlanePrimitiveSpec[] = [];
    for (let laneIndex = 1; laneIndex < laneCount; laneIndex += 1) {
      const laneOffset = -widthM / 2 + laneIndex * LANE_WIDTH_METERS;
      if (Math.abs(laneOffset) < 0.05) continue;
      if (hasBus && Math.abs(Math.abs(laneOffset) - LANE_WIDTH_METERS) < 0.05) {
        continue;
      }
      lines.push(
        longitudinalLine(
          `${corridor.direction}-restrict-${laneIndex}`,
          corridor,
          laneOffset,
          LANE_RESTRICT_LENGTH,
          alongCenter,
          SOLID_LINE_WIDTH
        )
      );
    }
    return lines;
  });

// 정지선 — white transverse stop bar on every approach, just before the crosswalk.
// On 강남대로 the bus lane gets its own bar advanced ahead of the general one.
export const STOP_LINE_MARKINGS: PlanePrimitiveSpec[] = (
  ["north", "south", "east", "west"] as const
).flatMap((direction) => {
  const corridor = APPROACH_CORRIDORS.find((c) => c.direction === direction)!;
  const widthM = corridorWidth(direction);
  const halfRoad = widthM / 2;
  const hasBus = getApproachHasMedianBus(direction);
  const sign = direction === "north" || direction === "east" ? -1 : 1;
  const isNS = corridor.orientation === "north_south";
  const boxHalf = isNS ? HALF_BOX_Z : HALF_BOX_X;
  const generalAlong = sign * (boxHalf + GENERAL_STOP_GAP);
  const busAlong = sign * (boxHalf + GENERAL_STOP_GAP - BUS_STOP_ADVANCE);

  const bars: PlanePrimitiveSpec[] = [];
  const innerEdge = hasBus ? LANE_WIDTH_METERS : 0; // general lanes start past the bus lane
  const generalWidth = halfRoad - innerEdge;
  const generalCenter = sign * (innerEdge + generalWidth / 2);

  const transverse = (
    id: string,
    lateralCenter: number,
    spanWidth: number,
    along: number
  ): PlanePrimitiveSpec =>
    isNS
      ? {
          id,
          direction,
          position: [lateralCenter, MARKING_HEIGHT, along],
          size: [spanWidth, STOP_BAR_WIDTH]
        }
      : {
          id,
          direction,
          position: [along, MARKING_HEIGHT, lateralCenter],
          size: [STOP_BAR_WIDTH, spanWidth]
        };

  bars.push(
    transverse(`${direction}-stop-general`, generalCenter, generalWidth, generalAlong)
  );
  if (hasBus) {
    bars.push(
      transverse(
        `${direction}-stop-bus`,
        sign * (LANE_WIDTH_METERS / 2),
        LANE_WIDTH_METERS,
        busAlong
      )
    );
  }
  return bars;
});

// 버스 legend — white "버스" text painted periodically in each median bus lane.
export type BusLaneLegend = {
  id: string;
  direction: Direction;
  position: Vector3Tuple;
  rotationY: number;
};
export const BUS_LANE_LEGENDS: BusLaneLegend[] = APPROACH_CORRIDORS.flatMap(
  (corridor) => {
    if (
      corridor.orientation !== "north_south" ||
      !getApproachHasMedianBus(corridor.direction)
    ) {
      return [];
    }
    const sign = corridor.direction === "north" ? -1 : 1;
    const lateral = sign * (LANE_WIDTH_METERS / 2); // inbound bus lane centre
    // Two legends along the inbound bus lane, set back from the junction.
    return [28, 64].map((dist, i) => ({
      id: `${corridor.direction}-bus-legend-${i}`,
      direction: corridor.direction,
      position: [lateral, MARKING_HEIGHT + 0.02, sign * (HALF_BOX_Z + dist)] as Vector3Tuple,
      rotationY: corridor.direction === "north" ? Math.PI : 0
    }));
  }
);

export function getCorridorLengthDataAttribute() {
  return (Object.keys(CORRIDOR_LENGTH_METERS) as Direction[])
    .map((direction) => `${direction}:${CORRIDOR_LENGTH_METERS[direction]}`)
    .join(",");
}

function buildCrosswalkStripes(): PlanePrimitiveSpec[] {
  const stripes: PlanePrimitiveSpec[] = [];
  const stripeCount = 11;
  const crosswalkDepth = 5.0;
  const centeredIndex = (stripeCount - 1) / 2;

  // All four approaches now have pedestrian-responsive crosswalks (SP3 restore).
  for (const direction of ["north", "south", "east", "west"] as const) {
    if (!getApproachHasCrosswalk(direction)) continue;
    const lateralSpan = getApproachRoadWidthMeters(direction) - 1.4;
    const spacing = lateralSpan / (stripeCount - 1);

    if (direction === "north" || direction === "south") {
      // N/S crosswalk: stripes span the x axis (강남대로 width), placed at z edge.
      const offsetZ = (HALF_BOX_Z + 2.75) * (direction === "north" ? -1 : 1);
      for (let index = 0; index < stripeCount; index += 1) {
        const offset = (index - centeredIndex) * spacing;
        stripes.push({
          id: `${direction}-crosswalk-${index}`,
          direction,
          position: [offset, MARKING_HEIGHT + 0.008, offsetZ],
          size: [CROSSWALK_STRIPE_WIDTH, crosswalkDepth]
        });
      }
    } else {
      // E/W crosswalk: stripes span the z axis (road width), placed at x edge.
      const offsetX = (HALF_BOX_X + 2.75) * (direction === "east" ? 1 : -1);
      for (let index = 0; index < stripeCount; index += 1) {
        const offset = (index - centeredIndex) * spacing;
        stripes.push({
          id: `${direction}-crosswalk-${index}`,
          direction,
          position: [offsetX, MARKING_HEIGHT + 0.008, offset],
          size: [crosswalkDepth, CROSSWALK_STRIPE_WIDTH]
        });
      }
    }
  }

  return stripes;
}

function buildVerticalTurnArrow(
  id: string,
  direction: Direction,
  x: number,
  z: number,
  forwardZ: 1 | -1
): TurnArrowMarking {
  const headZ = z + forwardZ * ARROW_HEAD_OFFSET;

  return {
    id,
    direction,
    parts: [
      {
        id: `${id}-shaft`,
        kind: "shaft",
        direction,
        position: [x, ARROW_HEIGHT, z],
        size: [ARROW_SHAFT_WIDTH, ARROW_SHAFT_LENGTH],
        rotationY: 0
      },
      {
        id: `${id}-head-left`,
        kind: "head_left",
        direction,
        position: [x - ARROW_HEAD_SPREAD, ARROW_HEIGHT, headZ],
        size: [ARROW_HEAD_WIDTH, ARROW_HEAD_LENGTH],
        rotationY: -forwardZ * Math.PI / 4
      },
      {
        id: `${id}-head-right`,
        kind: "head_right",
        direction,
        position: [x + ARROW_HEAD_SPREAD, ARROW_HEIGHT, headZ],
        size: [ARROW_HEAD_WIDTH, ARROW_HEAD_LENGTH],
        rotationY: forwardZ * Math.PI / 4
      }
    ]
  };
}

function buildHorizontalTurnArrow(
  id: string,
  direction: Direction,
  x: number,
  z: number,
  forwardX: 1 | -1
): TurnArrowMarking {
  const headX = x + forwardX * ARROW_HEAD_OFFSET;

  return {
    id,
    direction,
    parts: [
      {
        id: `${id}-shaft`,
        kind: "shaft",
        direction,
        position: [x, ARROW_HEIGHT, z],
        size: [ARROW_SHAFT_LENGTH, ARROW_SHAFT_WIDTH],
        rotationY: 0
      },
      {
        id: `${id}-head-left`,
        kind: "head_left",
        direction,
        position: [headX, ARROW_HEIGHT, z - ARROW_HEAD_SPREAD],
        size: [ARROW_HEAD_LENGTH, ARROW_HEAD_WIDTH],
        rotationY: forwardX * Math.PI / 4
      },
      {
        id: `${id}-head-right`,
        kind: "head_right",
        direction,
        position: [headX, ARROW_HEIGHT, z + ARROW_HEAD_SPREAD],
        size: [ARROW_HEAD_LENGTH, ARROW_HEAD_WIDTH],
        rotationY: -forwardX * Math.PI / 4
      }
    ]
  };
}

function buildStage6ECityEdgeBlocks(): CityEdgeBlockSpec[] {
  return BUILDING_EDGE_BLOCKS.flatMap((building) => {
    const [width, , depth] = building.size;
    const [x, , z] = building.position;
    const isNorthSouthBlock = depth > width;
    const longSize = isNorthSouthBlock ? depth : width;
    const segmentCount = Math.max(4, Math.round(longSize / 26));
    const segmentStep = longSize / segmentCount;
    const segmentLength = segmentStep * 0.78;

    return Array.from({ length: segmentCount }, (_, index) => {
      const offset = -longSize / 2 + segmentStep * (index + 0.5);
      const height = getStage6ECityEdgeHeight(building.id, index);
      const depthScale = getStage6ECityEdgeDepthScale(building.id, index);
      const size = isNorthSouthBlock
        ? ([width * depthScale, height, segmentLength] as Vector3Tuple)
        : ([segmentLength, height, depth * depthScale] as Vector3Tuple);
      const position = isNorthSouthBlock
        ? ([x, height / 2, z + offset] as Vector3Tuple)
        : ([x + offset, height / 2, z] as Vector3Tuple);

      return {
        id: `${building.id}-stage6e-segment-${index}`,
        sourceBuildingId: building.id,
        direction: building.direction,
        position,
        size
      };
    });
  });
}

function getStage6ECityEdgeHeight(buildingId: string, segmentIndex: number) {
  const heights = [16, 23, 18.5, 31, 14.5, 27, 20.5] as const;
  return heights[getStage6EPatternIndex(buildingId, segmentIndex, heights.length)];
}

function getStage6ECityEdgeDepthScale(
  buildingId: string,
  segmentIndex: number
) {
  const scales = [0.84, 1, 0.92, 1.08, 0.88, 1.02] as const;
  return scales[getStage6EPatternIndex(buildingId, segmentIndex, scales.length)];
}

function getStage6EPatternIndex(
  id: string,
  index: number,
  patternLength: number
) {
  let hash = index;
  for (let charIndex = 0; charIndex < id.length; charIndex += 1) {
    hash = (hash * 33 + id.charCodeAt(charIndex)) >>> 0;
  }

  return hash % patternLength;
}
