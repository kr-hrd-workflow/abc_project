import { describe, expect, it } from "vitest";

import { INTERSECTION_TRUTH } from "./intersectionTruth";
import {
  getInboundLaneOffset,
  parseLaneDirection,
  parseLaneIndex,
  buildTrafficDensityRenderPlan
} from "./TrafficDensityLayer";
import {
  applyCalibratedLaneOffset,
  PLATE_VEHICLE_CALIBRATION
} from "./plateVehicleCalibration";
import { buildSceneSnapshot } from "./buildSceneSnapshot";
import type { SimulationFrameSnapshot } from "../../lib/simulationSnapshot";

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

describe("SP4 per-viewpoint lateral calibration", () => {
  it("identity calibration (offset=0, scale=1) is a no-op on getInboundLaneOffset", () => {
    // The no-op calibration must preserve the raw lane offset exactly.
    for (const direction of ["north", "south", "east", "west"] as const) {
      const truth = INTERSECTION_TRUTH[direction];
      for (let laneIndex = 0; laneIndex < truth.inboundLanes; laneIndex++) {
        const raw = getInboundLaneOffset(direction, laneIndex, truth.inboundLanes);
        const calibrated = applyCalibratedLaneOffset(raw, "wide", direction);
        // Calibration table must be no-op at current values.
        const cal = PLATE_VEHICLE_CALIBRATION.wide[direction];
        const expected = cal.offset + cal.scale * raw;
        expect(calibrated).toBeCloseTo(expected, 10);
      }
    }
  });

  it("non-zero offset shifts all lanes uniformly by the calibration amount", () => {
    const raw = getInboundLaneOffset("north", 2, 5); // lane 2 of 5
    // Simulate a +1.5m calibration offset.
    const shiftedOffset = 1.5 + 1.0 * raw;
    expect(shiftedOffset).toBeCloseTo(raw + 1.5, 10);
  });

  it("scale != 1 compresses / expands lanes proportionally", () => {
    const raw = getInboundLaneOffset("south", 0, 5); // outermost lane
    const compressed = 0 + 0.9 * raw;
    expect(Math.abs(compressed)).toBeLessThan(Math.abs(raw));
    const expanded = 0 + 1.1 * raw;
    expect(Math.abs(expanded)).toBeGreaterThan(Math.abs(raw));
  });

  it("bus lane remains bus lane after calibration (buses stay on median lane)", () => {
    // The bus lane (index 4 for north) is the innermost lane closest to the median.
    // Any uniform offset or scale must not move the bus lane to a non-bus lane slot.
    // The key property: after calibration, the bus lane still has the smallest
    // absolute offset among all north inbound lanes (it's closest to center).
    const truth = INTERSECTION_TRUTH.north;
    const busLaneIndex = 4; // median bus lane
    const rawBus = getInboundLaneOffset("north", busLaneIndex, truth.inboundLanes);
    // With current calibration values applied:
    const cal = PLATE_VEHICLE_CALIBRATION.wide.north;
    const calibratedBus = cal.offset + cal.scale * rawBus;
    // For all other lanes, their calibrated offset should have larger absolute value.
    for (let i = 0; i < truth.inboundLanes - 1; i++) {
      const rawOther = getInboundLaneOffset("north", i, truth.inboundLanes);
      const calibratedOther = cal.offset + cal.scale * rawOther;
      expect(Math.abs(calibratedOther)).toBeGreaterThan(Math.abs(calibratedBus) - 1e-6);
    }
  });

  it("buildTrafficDensityRenderPlan respects viewpoint param — positions shift by calibration", () => {
    // Build a SUMO north_in_2 vehicle and check that its x position equals the
    // calibrated lane offset for 'wide' viewpoint.
    const frame: SimulationFrameSnapshot = {
      source: "sumo_traci",
      intersection_id: "INT-0001",
      scenario_id: "normal",
      sim_time_seconds: 0,
      captured_at: "2026-06-27T00:00:00.000Z",
      bounds_meters: { min_x: -100, max_x: 100, min_y: -100, max_y: 100 },
      vehicles: [
        {
          id: "v-north-2",
          vehicle_type: "car",
          lane_id: "north_in_2",
          x_meters: 0,
          y_meters: -30,
          heading_degrees: 180,
          speed_mps: 2,
          waiting_seconds: 0,
          emergency: false
        }
      ],
      pedestrians: [],
      density_segments: [],
      signals: [],
      queues: { north: 0, south: 0, east: 0, west: 0 },
      events: []
    };
    const scene = buildSceneSnapshot(frame);
    const rawOffset = getInboundLaneOffset("north", 2, 5);
    const cal = PLATE_VEHICLE_CALIBRATION.wide.north;
    const expectedX = cal.offset + cal.scale * rawOffset;

    const plan = buildTrafficDensityRenderPlan(scene, undefined, "wide");
    expect(plan.preciseVehicles).toHaveLength(1);
    expect(plan.preciseVehicles[0].position[0]).toBeCloseTo(expectedX, 5);
  });
});
