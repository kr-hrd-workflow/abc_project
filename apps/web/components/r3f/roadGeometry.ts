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

export const CORRIDOR_LENGTH_METERS: Record<Direction, number> = {
  north: INTERSECTION_TRUTH.north.corridorLengthM,
  south: INTERSECTION_TRUTH.south.corridorLengthM,
  east: INTERSECTION_TRUTH.east.corridorLengthM,
  west: INTERSECTION_TRUTH.west.corridorLengthM
};

const HALF_BOX_X = INTERSECTION_BOX_X_METERS / 2;
const HALF_BOX_Z = INTERSECTION_BOX_Z_METERS / 2;
const MARKING_HEIGHT = 0.018;
const LANE_DIVIDER_MARKING_WIDTH = 0.46;
const LANE_DIVIDER_SEGMENT_LENGTH = 7.8;
const LANE_DIVIDER_SEGMENT_GAP = 5.2;
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
  const usableLength = corridor.lengthMeters - 12;
  const segmentPitch = LANE_DIVIDER_SEGMENT_LENGTH + LANE_DIVIDER_SEGMENT_GAP;
  const segmentCount = Math.max(4, Math.floor(usableLength / segmentPitch));
  const firstSegmentOffset = -usableLength / 2 + LANE_DIVIDER_SEGMENT_LENGTH / 2;

  for (let laneIndex = 1; laneIndex < laneCount; laneIndex += 1) {
    const laneOffset = -widthM / 2 + laneIndex * LANE_WIDTH_METERS;

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

// Arrow lateral offset: moved from ±LANE_WIDTH_METERS (±3.6 m, the busway
// outer edge) to ±2.5 lanes (≈ ±9 m, a general through lane) so the arrows
// sit on carriageway pavement rather than on the central median bus lane.
export const TURN_ARROW_MARKINGS: TurnArrowMarking[] = [
  buildVerticalTurnArrow("north-turn-arrow", "north", -(LANE_WIDTH_METERS * 2.5), -34, 1),
  buildVerticalTurnArrow("south-turn-arrow", "south", LANE_WIDTH_METERS * 2.5, 34, -1),
  buildHorizontalTurnArrow("east-turn-arrow", "east", 34, LANE_WIDTH_METERS * 2.5, -1),
  buildHorizontalTurnArrow("west-turn-arrow", "west", -34, -(LANE_WIDTH_METERS * 2.5), 1)
];

// 중앙버스전용차로: red median bus-only lane surfaces on 강남대로 (N/S) only.
// The bus lane is the median-adjacent lane in each travel direction, so each
// corridor gets two: one inbound side (-x) and one outbound side (+x).
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
