import { describe, expect, test } from "vitest";

import type { SimulationFrameSnapshot } from "../../lib/simulationSnapshot";
import { buildSceneSnapshot } from "./buildSceneSnapshot";
import { LANE_WIDTH_METERS } from "./roadGeometry";
import {
  buildTrafficDensityRenderPlan,
  getInboundLaneOffset,
  getStage5RearGlassScale,
  getStage5RoofHighlightScale,
  getStage5WindshieldScale,
  PRECISE_VEHICLE_MIN_LONGITUDINAL_CLEARANCE_METERS
} from "./TrafficDensityLayer";

describe("buildTrafficDensityRenderPlan precise vehicle lane normalization", () => {
  test("aligns compatible SUMO lane vehicles to visible R3F lane centers without inventing vehicles", () => {
    const frame: SimulationFrameSnapshot = {
      source: "sumo_traci",
      intersection_id: "INT-0001",
      scenario_id: "normal",
      sim_time_seconds: 4,
      captured_at: "2026-06-24T00:00:04.000Z",
      bounds_meters: { min_x: -100, max_x: 100, min_y: -100, max_y: 100 },
      vehicles: [
        {
          id: "vehicle-east-1",
          vehicle_type: "car",
          lane_id: "east_in_1",
          x_meters: 18,
          y_meters: 14.7,
          heading_degrees: 270,
          speed_mps: 3,
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
    const plan = buildTrafficDensityRenderPlan(scene);

    expect(plan.preciseVehicles).toHaveLength(1);
    expect(plan.farVehicles).toEqual([]);
    expect(plan.preciseVehicles[0].position[0]).toBe(18);
    expect(plan.preciseVehicles[0].position[2]).toBeCloseTo(
      -(5 - 1 - 0.5) * LANE_WIDTH_METERS // east_in_1 with 5 inbound lanes → -12.6
    );
  });

  test("keeps raw SUMO positions when lane identity is not a compatible approach lane", () => {
    const frame: SimulationFrameSnapshot = {
      source: "sumo_traci",
      intersection_id: "INT-0001",
      scenario_id: "normal",
      sim_time_seconds: 4,
      captured_at: "2026-06-24T00:00:04.000Z",
      bounds_meters: { min_x: -100, max_x: 100, min_y: -100, max_y: 100 },
      vehicles: [
        {
          id: "vehicle-arbitrary-1",
          vehicle_type: "car",
          lane_id: "gneE42_1",
          x_meters: 18,
          y_meters: 14.7,
          heading_degrees: 270,
          speed_mps: 3,
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

    const plan = buildTrafficDensityRenderPlan(buildSceneSnapshot(frame));

    expect(plan.preciseVehicles).toHaveLength(1);
    expect(plan.preciseVehicles[0].position[0]).toBe(18);
    expect(plan.preciseVehicles[0].position[2]).toBe(14.7);
  });

  test("separates same-lane SUMO vehicles visually without adding density vehicles", () => {
    const frame: SimulationFrameSnapshot = {
      source: "sumo_traci",
      intersection_id: "INT-0001",
      scenario_id: "normal",
      sim_time_seconds: 4,
      captured_at: "2026-06-24T00:00:04.000Z",
      bounds_meters: { min_x: -100, max_x: 100, min_y: -100, max_y: 100 },
      vehicles: [
        {
          id: "west-front",
          vehicle_type: "car",
          lane_id: "west_in_1",
          x_meters: -18,
          y_meters: 0,
          heading_degrees: 90,
          speed_mps: 0,
          waiting_seconds: 12,
          emergency: false
        },
        {
          id: "west-back",
          vehicle_type: "car",
          lane_id: "west_in_1",
          x_meters: -19,
          y_meters: 0,
          heading_degrees: 90,
          speed_mps: 0,
          waiting_seconds: 8,
          emergency: false
        }
      ],
      pedestrians: [],
      density_segments: [],
      signals: [],
      queues: { north: 0, south: 0, east: 0, west: 0 },
      events: []
    };

    const plan = buildTrafficDensityRenderPlan(buildSceneSnapshot(frame));
    const front = plan.preciseVehicles.find((vehicle) => vehicle.id === "west-front");
    const back = plan.preciseVehicles.find((vehicle) => vehicle.id === "west-back");

    expect(plan.preciseVehicles).toHaveLength(2);
    expect(plan.farVehicles).toEqual([]);
    expect(front?.position[0]).toBe(-18);
    expect(back?.position[0]).toBeLessThanOrEqual(
      -18 -
        front!.size[2] / 2 -
        back!.size[2] / 2 -
        PRECISE_VEHICLE_MIN_LONGITUDINAL_CLEARANCE_METERS
    );
  });

  test("keeps vehicle glass highlights as narrow cues instead of transparent roof boxes", () => {
    const sedanSize = [2.36, 1.14, 4.65] as const;
    const roofScale = getStage5RoofHighlightScale(sedanSize);
    const windshieldScale = getStage5WindshieldScale(sedanSize);
    const rearGlassScale = getStage5RearGlassScale(sedanSize);

    expect(roofScale[0]).toBeLessThanOrEqual(sedanSize[0] * 0.18);
    expect(roofScale[1]).toBeLessThanOrEqual(sedanSize[2] * 0.06);
    expect(roofScale[2]).toBe(1);
    expect(windshieldScale[0]).toBeLessThanOrEqual(sedanSize[0] * 0.5);
    expect(windshieldScale[1]).toBeLessThanOrEqual(sedanSize[2] * 0.13);
    expect(rearGlassScale[0]).toBeLessThanOrEqual(sedanSize[0] * 0.44);
    expect(rearGlassScale[1]).toBeLessThanOrEqual(sedanSize[2] * 0.12);
  });
});

describe("getInboundLaneOffset per-approach asymmetric lanes", () => {
  test("lays inbound lanes outward from the median on the right-hand side", () => {
    // index 0 = right curb (farthest from median), index laneCount-1 = median-adjacent.
    expect(getInboundLaneOffset("north", 0, 5)).toBeCloseTo(-16.2, 6);
    expect(getInboundLaneOffset("north", 4, 5)).toBeCloseTo(-1.8, 6);
    expect(getInboundLaneOffset("south", 4, 5)).toBeCloseTo(1.8, 6);
    expect(getInboundLaneOffset("east", 1, 5)).toBeCloseTo(-12.6, 6);
  });

  test("honors 서초대로's narrower 4-lane inbound group", () => {
    expect(getInboundLaneOffset("west", 0, 4)).toBeCloseTo(12.6, 6);
    expect(getInboundLaneOffset("west", 3, 4)).toBeCloseTo(1.8, 6);
  });

  test("median bus lane (강남대로 innermost inbound) sits half a lane off center", () => {
    expect(Math.abs(getInboundLaneOffset("north", 4, 5))).toBeCloseTo(
      LANE_WIDTH_METERS / 2,
      6
    );
    expect(Math.abs(getInboundLaneOffset("south", 4, 5))).toBeCloseTo(
      LANE_WIDTH_METERS / 2,
      6
    );
  });
});
