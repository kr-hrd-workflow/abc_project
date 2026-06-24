import { describe, expect, test } from "vitest";

import type {
  SimulationFrameSnapshot,
  SimulationPedestrianSnapshot,
  SimulationVehicleSnapshot
} from "../../lib/simulationSnapshot";
import { buildFixtureSceneSnapshot, buildSceneSnapshot } from "./buildSceneSnapshot";
import { buildTrafficDensityRenderPlan } from "./TrafficDensityLayer";

const pedestrian: SimulationPedestrianSnapshot = {
  id: "person-1",
  x_meters: -4,
  y_meters: 8,
  heading_degrees: 90,
  speed_mps: 1.1,
  lane_id: null,
  edge_id: "crossing-west",
  waiting_seconds: 0,
  source: "sumo_person"
};

const frame: SimulationFrameSnapshot = {
  source: "sumo_traci",
  intersection_id: "INT-0001",
  scenario_id: "pedestrian",
  sim_time_seconds: 42,
  captured_at: "2026-06-24T00:00:42.000Z",
  bounds_meters: { min_x: -100, max_x: 100, min_y: -100, max_y: 100 },
  vehicles: [],
  pedestrians: [pedestrian],
  density_segments: [],
  signals: [],
  queues: { north: 4, south: 5, east: 6, west: 7 },
  events: []
};

const vehicle: SimulationVehicleSnapshot = {
  id: "vehicle-east-1",
  vehicle_type: "car",
  lane_id: "east_in_1",
  x_meters: 18,
  y_meters: 14.7,
  heading_degrees: 270,
  speed_mps: 3,
  waiting_seconds: 0,
  emergency: false
};

describe("buildSceneSnapshot pedestrian truth boundary", () => {
  test("copies pedestrians from SimulationFrameSnapshot and keeps fixture pedestrians empty", () => {
    const scene = buildSceneSnapshot(frame);
    const fixture = buildFixtureSceneSnapshot({
      queues: frame.queues,
      events: frame.events
    });

    expect(scene.pedestrians).toEqual(frame.pedestrians);
    expect(scene.precisePedestrianSource).toBe("simulation_frame_snapshot");
    expect(fixture.pedestrians).toEqual([]);
    expect(fixture.precisePedestrianSource).toBe("none");

    scene.pedestrians[0].x_meters = 999;
    expect(pedestrian.x_meters).toBe(-4);
  });

  test("does not convert density segments or queues into precise vehicles or pedestrians", () => {
    const densityScene = buildSceneSnapshot({
      ...frame,
      vehicles: [],
      pedestrians: [],
      density_segments: [
        {
          segment_id: "east-heavy-density",
          approach: "east",
          start_meters_from_stop_line: 10,
          end_meters_from_stop_line: 70,
          lane_count: 3,
          vehicle_count: 40,
          average_speed_mps: 2,
          source: "aggregate_density_proxy"
        }
      ]
    });
    const plan = buildTrafficDensityRenderPlan(densityScene);

    expect(densityScene.vehicles).toEqual([]);
    expect(densityScene.pedestrians).toEqual([]);
    expect(plan.preciseVehicles).toEqual([]);
    expect(plan.farVehicles.length).toBeGreaterThan(0);
  });

  test("prefers frame vehicles over density-generated visual fill", () => {
    const scene = buildSceneSnapshot({
      ...frame,
      vehicles: [vehicle],
      pedestrians: [],
      density_segments: [
        {
          segment_id: "east-heavy-density",
          approach: "east",
          start_meters_from_stop_line: 10,
          end_meters_from_stop_line: 70,
          lane_count: 3,
          vehicle_count: 40,
          average_speed_mps: 2,
          source: "aggregate_density_proxy"
        }
      ]
    });
    const plan = buildTrafficDensityRenderPlan(scene);

    expect(scene.preciseVehicleSource).toBe("simulation_frame_snapshot");
    expect(scene.trafficDensityMode).toBe("snapshot_vehicles");
    expect(scene.allowsDensityFill).toBe(false);
    expect(scene.densityFillSource).toBe("none");
    expect(plan.preciseVehicles).toHaveLength(1);
    expect(plan.farVehicles).toEqual([]);
  });
});
