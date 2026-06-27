import { describe, expect, it } from "vitest";

import { INTERSECTION_TRUTH } from "./intersectionTruth";
import {
  getInboundLaneOffset,
  parseLaneDirection,
  parseLaneIndex
} from "./TrafficDensityLayer";

const carriagewayHalf = (approach: { inboundLanes: number; outboundLanes: number; laneWidthM: number }) =>
  ((approach.inboundLanes + approach.outboundLanes) * approach.laneWidthM) / 2;

const inboundLadder = (direction: "north" | "south" | "east" | "west") => {
  const truth = INTERSECTION_TRUTH[direction];
  return Array.from({ length: truth.inboundLanes }, (_, i) =>
    getInboundLaneOffset(direction, i, truth.inboundLanes)
  );
};

describe("SP1 lane alignment integration", () => {
  it("parses the {approach}_{in|out}_{laneIndex} lane-id contract", () => {
    expect(parseLaneDirection("north_in_3")).toBe("north");
    expect(parseLaneIndex("north_in_3")).toBe(3);
    expect(parseLaneDirection("west_in_3")).toBe("west");
    expect(parseLaneIndex("west_in_3")).toBe(3);
  });

  it("snapshot vehicle on north_in_3 lands on the real inbound lane center", () => {
    const truth = INTERSECTION_TRUTH.north;
    const half = carriagewayHalf(truth);
    const ladder = inboundLadder("north");

    // 강남대로 carries 5 inbound lanes incl. the median bus lane.
    expect(truth.inboundLanes).toBe(5);
    expect(truth.hasMedianBus).toBe(true);

    // Every inbound lane center is inside the carriageway — no off-road float.
    for (const offset of ladder) {
      expect(Math.abs(offset)).toBeLessThanOrEqual(half - truth.laneWidthM / 2 + 1e-6);
    }
    // Lanes are distinct and one lane-width apart.
    const sorted = [...ladder].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i] - sorted[i - 1]).toBeCloseTo(truth.laneWidthM, 4);
    }
    // north_in_3 sits exactly on the 4th rung of that ladder.
    const { direction } = { direction: parseLaneDirection("north_in_3")! };
    const index = parseLaneIndex("north_in_3")!;
    expect(getInboundLaneOffset(direction, index, truth.inboundLanes)).toBeCloseTo(
      sorted[3],
      4
    );
    // The median bus lane sits near the carriageway centerline.
    expect(Math.min(...ladder.map((o) => Math.abs(o)))).toBeLessThanOrEqual(
      truth.laneWidthM
    );
  });

  it("uses per-approach inbound counts (강남대로 5 incl. bus, 테헤란로 5, 서초대로 4)", () => {
    expect(INTERSECTION_TRUTH.east.inboundLanes).toBe(5);
    expect(INTERSECTION_TRUTH.east.hasMedianBus).toBe(false);
    expect(INTERSECTION_TRUTH.west.inboundLanes).toBe(4);

    // 5th lane (median bus, index 4) resolves to a distinct in-carriageway center,
    // proving the higher index is honored rather than clamped to the legacy 3.
    const truth = INTERSECTION_TRUTH.north;
    const half = carriagewayHalf(truth);
    const lane4 = getInboundLaneOffset("north", 4, truth.inboundLanes);
    const lane3 = getInboundLaneOffset("north", 3, truth.inboundLanes);
    expect(Math.abs(lane4)).toBeLessThanOrEqual(half - truth.laneWidthM / 2 + 1e-6);
    expect(Math.abs(lane4 - lane3)).toBeCloseTo(truth.laneWidthM, 4);

    // 서초대로 narrow leg: west_in_3 still lands on a real lane.
    const west = INTERSECTION_TRUTH.west;
    expect(Math.abs(getInboundLaneOffset("west", 3, west.inboundLanes))).toBeLessThanOrEqual(
      carriagewayHalf(west) - west.laneWidthM / 2 + 1e-6
    );
  });
});
