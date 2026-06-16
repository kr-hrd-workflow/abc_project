import type { Direction } from "../../lib/types";

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

export const INTERSECTION_BOX_METERS = 32;
export const LANE_WIDTH_METERS = 3.6;
export const INBOUND_LANE_COUNT = 3;
export const OUTBOUND_LANE_COUNT = 2;
export const ROAD_WIDTH_METERS =
  (INBOUND_LANE_COUNT + OUTBOUND_LANE_COUNT) * LANE_WIDTH_METERS;

export const CORRIDOR_LENGTH_METERS: Record<Direction, number> = {
  north: 140,
  south: 120,
  east: 140,
  west: 140
};

const HALF_INTERSECTION = INTERSECTION_BOX_METERS / 2;
const MARKING_HEIGHT = 0.018;
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
    inboundLanes: INBOUND_LANE_COUNT,
    outboundLanes: OUTBOUND_LANE_COUNT,
    orientation: "north_south",
    position: [0, 0, -HALF_INTERSECTION - CORRIDOR_LENGTH_METERS.north / 2],
    size: [ROAD_WIDTH_METERS, CORRIDOR_LENGTH_METERS.north]
  },
  {
    direction: "south",
    lengthMeters: CORRIDOR_LENGTH_METERS.south,
    inboundLanes: INBOUND_LANE_COUNT,
    outboundLanes: OUTBOUND_LANE_COUNT,
    orientation: "north_south",
    position: [0, 0, HALF_INTERSECTION + CORRIDOR_LENGTH_METERS.south / 2],
    size: [ROAD_WIDTH_METERS, CORRIDOR_LENGTH_METERS.south]
  },
  {
    direction: "east",
    lengthMeters: CORRIDOR_LENGTH_METERS.east,
    inboundLanes: INBOUND_LANE_COUNT,
    outboundLanes: OUTBOUND_LANE_COUNT,
    orientation: "east_west",
    position: [HALF_INTERSECTION + CORRIDOR_LENGTH_METERS.east / 2, 0, 0],
    size: [CORRIDOR_LENGTH_METERS.east, ROAD_WIDTH_METERS]
  },
  {
    direction: "west",
    lengthMeters: CORRIDOR_LENGTH_METERS.west,
    inboundLanes: INBOUND_LANE_COUNT,
    outboundLanes: OUTBOUND_LANE_COUNT,
    orientation: "east_west",
    position: [-HALF_INTERSECTION - CORRIDOR_LENGTH_METERS.west / 2, 0, 0],
    size: [CORRIDOR_LENGTH_METERS.west, ROAD_WIDTH_METERS]
  }
];

export const LANE_DIVIDER_MARKINGS = APPROACH_CORRIDORS.flatMap((corridor) => {
  const dividers: PlanePrimitiveSpec[] = [];
  const laneCount = corridor.inboundLanes + corridor.outboundLanes;

  for (let laneIndex = 1; laneIndex < laneCount; laneIndex += 1) {
    const laneOffset = -ROAD_WIDTH_METERS / 2 + laneIndex * LANE_WIDTH_METERS;

    if (corridor.orientation === "north_south") {
      dividers.push({
        id: `${corridor.direction}-lane-divider-${laneIndex}`,
        direction: corridor.direction,
        position: [
          laneOffset,
          MARKING_HEIGHT,
          corridor.position[2]
        ],
        size: [0.16, corridor.lengthMeters - 8]
      });
    } else {
      dividers.push({
        id: `${corridor.direction}-lane-divider-${laneIndex}`,
        direction: corridor.direction,
        position: [
          corridor.position[0],
          MARKING_HEIGHT,
          laneOffset
        ],
        size: [corridor.lengthMeters - 8, 0.16]
      });
    }
  }

  return dividers;
});

export const QUEUE_ZONES = APPROACH_CORRIDORS.map((corridor) => {
  const length = Math.min(72, corridor.lengthMeters - 22);
  const offsetFromStopLine = 14 + length / 2;

  if (corridor.direction === "north") {
    return {
      id: "north-queue-zone",
      direction: corridor.direction,
      position: [0, MARKING_HEIGHT + 0.004, -HALF_INTERSECTION - offsetFromStopLine] as Vector3Tuple,
      size: [ROAD_WIDTH_METERS - 1.6, length] as [number, number]
    };
  }
  if (corridor.direction === "south") {
    return {
      id: "south-queue-zone",
      direction: corridor.direction,
      position: [0, MARKING_HEIGHT + 0.004, HALF_INTERSECTION + offsetFromStopLine] as Vector3Tuple,
      size: [ROAD_WIDTH_METERS - 1.6, length] as [number, number]
    };
  }
  if (corridor.direction === "east") {
    return {
      id: "east-queue-zone",
      direction: corridor.direction,
      position: [HALF_INTERSECTION + offsetFromStopLine, MARKING_HEIGHT + 0.004, 0] as Vector3Tuple,
      size: [length, ROAD_WIDTH_METERS - 1.6] as [number, number]
    };
  }

  return {
    id: "west-queue-zone",
    direction: corridor.direction,
    position: [-HALF_INTERSECTION - offsetFromStopLine, MARKING_HEIGHT + 0.004, 0] as Vector3Tuple,
    size: [length, ROAD_WIDTH_METERS - 1.6] as [number, number]
  };
});

export const CURB_SEGMENTS = APPROACH_CORRIDORS.flatMap((corridor) => {
  if (corridor.orientation === "north_south") {
    return [-1, 1].map((side) => ({
      id: `${corridor.direction}-curb-${side}`,
      direction: corridor.direction,
      position: [
        side * (ROAD_WIDTH_METERS / 2 + CURB_WIDTH / 2),
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
      side * (ROAD_WIDTH_METERS / 2 + CURB_WIDTH / 2)
    ] as Vector3Tuple,
    size: [corridor.lengthMeters, CURB_HEIGHT, CURB_WIDTH] as Vector3Tuple
  }));
});

export const SIDEWALK_SLABS = APPROACH_CORRIDORS.flatMap((corridor) => {
  if (corridor.orientation === "north_south") {
    return [-1, 1].map((side) => ({
      id: `${corridor.direction}-sidewalk-${side}`,
      direction: corridor.direction,
      position: [
        side * (ROAD_WIDTH_METERS / 2 + CURB_WIDTH + SIDEWALK_WIDTH / 2),
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
      side * (ROAD_WIDTH_METERS / 2 + CURB_WIDTH + SIDEWALK_WIDTH / 2)
    ] as Vector3Tuple,
    size: [corridor.lengthMeters, 0.09, SIDEWALK_WIDTH] as Vector3Tuple
  }));
});

export const BUILDING_EDGE_BLOCKS = APPROACH_CORRIDORS.flatMap((corridor) => {
  if (corridor.orientation === "north_south") {
    return [-1, 1].map((side) => ({
      id: `${corridor.direction}-building-edge-${side}`,
      direction: corridor.direction,
      position: [
        side * (ROAD_WIDTH_METERS / 2 + CURB_WIDTH + SIDEWALK_WIDTH + BUILDING_EDGE_WIDTH / 2 + 1.4),
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
      side * (ROAD_WIDTH_METERS / 2 + CURB_WIDTH + SIDEWALK_WIDTH + BUILDING_EDGE_WIDTH / 2 + 1.4)
    ] as Vector3Tuple,
    size: [corridor.lengthMeters * 0.86, BUILDING_EDGE_HEIGHT, BUILDING_EDGE_WIDTH] as Vector3Tuple
  }));
});

export const CROSSWALK_STRIPES: PlanePrimitiveSpec[] = buildCrosswalkStripes();

export const TURN_ARROW_MARKINGS: TurnArrowMarking[] = [
  buildVerticalTurnArrow("north-turn-arrow", "north", -LANE_WIDTH_METERS, -34, 1),
  buildVerticalTurnArrow("south-turn-arrow", "south", LANE_WIDTH_METERS, 34, -1),
  buildHorizontalTurnArrow("east-turn-arrow", "east", 34, LANE_WIDTH_METERS, -1),
  buildHorizontalTurnArrow("west-turn-arrow", "west", -34, -LANE_WIDTH_METERS, 1)
];

export function getCorridorLengthDataAttribute() {
  return (Object.keys(CORRIDOR_LENGTH_METERS) as Direction[])
    .map((direction) => `${direction}:${CORRIDOR_LENGTH_METERS[direction]}`)
    .join(",");
}

function buildCrosswalkStripes(): PlanePrimitiveSpec[] {
  const stripes: PlanePrimitiveSpec[] = [];
  const stripeCount = 7;
  const spacing = 1.1;
  const crosswalkOffset = HALF_INTERSECTION + 3.2;
  const centeredIndex = (stripeCount - 1) / 2;

  for (let index = 0; index < stripeCount; index += 1) {
    const offset = (index - centeredIndex) * spacing;
    stripes.push({
      id: `north-crosswalk-${index}`,
      direction: "north",
      position: [offset, MARKING_HEIGHT + 0.008, -crosswalkOffset],
      size: [0.56, ROAD_WIDTH_METERS + 2.5]
    });
    stripes.push({
      id: `south-crosswalk-${index}`,
      direction: "south",
      position: [offset, MARKING_HEIGHT + 0.008, crosswalkOffset],
      size: [0.56, ROAD_WIDTH_METERS + 2.5]
    });
    stripes.push({
      id: `east-crosswalk-${index}`,
      direction: "east",
      position: [crosswalkOffset, MARKING_HEIGHT + 0.008, offset],
      size: [ROAD_WIDTH_METERS + 2.5, 0.56]
    });
    stripes.push({
      id: `west-crosswalk-${index}`,
      direction: "west",
      position: [-crosswalkOffset, MARKING_HEIGHT + 0.008, offset],
      size: [ROAD_WIDTH_METERS + 2.5, 0.56]
    });
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
