import type { Direction } from "../../lib/types";

// Single source of truth for the real Gangnam Station (강남역 사거리) layout.
// Mirrored by the Python/SUMO side (apps/api networks intersection_truth) — do
// NOT duplicate magic numbers across stacks; both read from these values.
export const INTERSECTION_LANE_WIDTH_METERS = 3.6;

export type ApproachTruth = {
  approach: Direction;
  road: string;
  inboundLanes: number;
  outboundLanes: number;
  hasMedianBus: boolean;
  laneWidthM: number;
  corridorLengthM: number;
  hasCrosswalk: boolean;
};

export const INTERSECTION_TRUTH: Record<Direction, ApproachTruth> = {
  north: {
    approach: "north",
    road: "강남대로",
    inboundLanes: 5,
    outboundLanes: 5,
    hasMedianBus: true,
    laneWidthM: INTERSECTION_LANE_WIDTH_METERS,
    corridorLengthM: 140,
    hasCrosswalk: true
  },
  south: {
    approach: "south",
    road: "강남대로",
    inboundLanes: 5,
    outboundLanes: 5,
    hasMedianBus: true,
    laneWidthM: INTERSECTION_LANE_WIDTH_METERS,
    corridorLengthM: 120,
    hasCrosswalk: true
  },
  east: {
    approach: "east",
    road: "테헤란로",
    inboundLanes: 5,
    outboundLanes: 5,
    hasMedianBus: false,
    laneWidthM: INTERSECTION_LANE_WIDTH_METERS,
    corridorLengthM: 140,
    hasCrosswalk: true
  },
  west: {
    approach: "west",
    road: "서초대로",
    inboundLanes: 4,
    outboundLanes: 4,
    hasMedianBus: false,
    laneWidthM: INTERSECTION_LANE_WIDTH_METERS,
    corridorLengthM: 140,
    hasCrosswalk: true
  }
};

export function getApproachInboundLaneCount(direction: Direction): number {
  return INTERSECTION_TRUTH[direction].inboundLanes;
}

export function getApproachOutboundLaneCount(direction: Direction): number {
  return INTERSECTION_TRUTH[direction].outboundLanes;
}

export function getApproachRoadWidthMeters(direction: Direction): number {
  const t = INTERSECTION_TRUTH[direction];
  return (t.inboundLanes + t.outboundLanes) * t.laneWidthM;
}

export function getApproachHasMedianBus(direction: Direction): boolean {
  return INTERSECTION_TRUTH[direction].hasMedianBus;
}

// SUMO numbers lanes from the right curb (0) toward the median. The median
// bus-only lane is therefore the innermost (highest-index) inbound lane.
export function getApproachMedianBusLaneIndex(
  direction: Direction
): number | null {
  const t = INTERSECTION_TRUTH[direction];
  return t.hasMedianBus ? t.inboundLanes - 1 : null;
}

export function getApproachHasCrosswalk(direction: Direction): boolean {
  return INTERSECTION_TRUTH[direction].hasCrosswalk;
}
