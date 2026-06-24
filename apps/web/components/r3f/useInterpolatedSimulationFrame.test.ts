import { describe, expect, test } from "vitest";

import type {
  SimulationFrameBufferEntry,
  SimulationFrameSnapshot,
  SimulationPedestrianSnapshot
} from "../../lib/simulationSnapshot";
import {
  interpolateHeadingDegrees,
  interpolateSimulationFrame
} from "./useInterpolatedSimulationFrame";

const basePedestrian: SimulationPedestrianSnapshot = {
  id: "person-1",
  x_meters: -2,
  y_meters: 4,
  heading_degrees: 90,
  speed_mps: 1.2,
  lane_id: "west_crosswalk",
  edge_id: null,
  waiting_seconds: 0,
  source: "sumo_person"
};

const baseFrame: SimulationFrameSnapshot = {
  source: "sumo_traci",
  intersection_id: "INT-0001",
  scenario_id: "emergency",
  sim_time_seconds: 10,
  captured_at: "2026-06-18T00:00:10.000Z",
  bounds_meters: { min_x: -10, max_x: 10, min_y: -10, max_y: 10 },
  vehicles: [
    {
      id: "vehicle-1",
      vehicle_type: "car",
      lane_id: "east_in_1",
      x_meters: 0,
      y_meters: 0,
      heading_degrees: 350,
      speed_mps: 2,
      waiting_seconds: 4,
      emergency: false
    }
  ],
  pedestrians: [basePedestrian],
  density_segments: [],
  signals: [
    {
      signal_id: "east-main",
      direction: "east",
      state: "red",
      seconds_remaining: 1
    }
  ],
  queues: { north: 1, south: 2, east: 3, west: 4 },
  events: []
};

function entry(
  frame: SimulationFrameSnapshot,
  receivedAtMs: number
): SimulationFrameBufferEntry {
  return {
    frame,
    receivedAtMs,
    networkLatencyMs: 20,
    capturedAtMs: Date.parse(frame.captured_at)
  };
}

describe("interpolateSimulationFrame", () => {
  test("interpolates headings across the zero-degree seam on the shortest path", () => {
    expect(interpolateHeadingDegrees(350, 10, 0.5)).toBeCloseTo(0);
  });

  test("interpolates vehicles by sim_time_seconds and keeps signal state until the next frame boundary", () => {
    const nextFrame: SimulationFrameSnapshot = {
      ...baseFrame,
      sim_time_seconds: 10.1,
      captured_at: "2026-06-18T00:00:10.100Z",
      vehicles: [
        {
          ...baseFrame.vehicles[0],
          x_meters: 10,
          y_meters: 4,
          heading_degrees: 10,
          speed_mps: 4,
          waiting_seconds: 2
        }
      ],
      signals: [
        {
          ...baseFrame.signals[0],
          state: "green",
          seconds_remaining: 12
        }
      ]
    };

    const interpolated = interpolateSimulationFrame(
      [entry(baseFrame, 1000), entry(nextFrame, 1100)],
      {
        nowMs: 1200,
        interpolationDelayMs: 150
      }
    );

    expect(interpolated.frame?.sim_time_seconds).toBeCloseTo(10.05);
    expect(interpolated.frame?.vehicles[0].x_meters).toBeCloseTo(5);
    expect(interpolated.frame?.vehicles[0].y_meters).toBeCloseTo(2);
    expect(interpolated.frame?.vehicles[0].heading_degrees).toBeCloseTo(0);
    expect(interpolated.frame?.vehicles[0].speed_mps).toBeCloseTo(3);
    expect(interpolated.frame?.vehicles[0].waiting_seconds).toBeCloseTo(3);
    expect(interpolated.frame?.signals[0].state).toBe("red");
    expect(interpolated.telemetry.simToRenderDelayMs).toBe(50);
    expect(interpolated.telemetry.stale).toBe(false);

    const atBoundary = interpolateSimulationFrame(
      [entry(baseFrame, 1000), entry(nextFrame, 1100)],
      {
        nowMs: 1250,
        interpolationDelayMs: 150
      }
    );

    expect(atBoundary.frame?.signals[0].state).toBe("green");
  });

  test("uses only entries for the requested scenario when frame buffers are mixed", () => {
    const pedestrianFrame: SimulationFrameSnapshot = {
      ...baseFrame,
      scenario_id: "pedestrian",
      sim_time_seconds: 20,
      captured_at: "2026-06-18T00:00:20.000Z",
      vehicles: [
        {
          ...baseFrame.vehicles[0],
          id: "pedestrian-vehicle",
          x_meters: 40
        }
      ]
    };

    const result = interpolateSimulationFrame(
      [entry(baseFrame, 1000), entry(pedestrianFrame, 2000)],
      {
        scenarioId: "pedestrian",
        nowMs: 2100,
        interpolationDelayMs: 150
      }
    );

    expect(result.frame?.scenario_id).toBe("pedestrian");
    expect(result.frame?.vehicles.map((vehicle) => vehicle.id)).toEqual([
      "pedestrian-vehicle"
    ]);
  });

  test("uses the next vehicle set at the authoritative boundary", () => {
    const nextFrame: SimulationFrameSnapshot = {
      ...baseFrame,
      sim_time_seconds: 10.1,
      captured_at: "2026-06-18T00:00:10.100Z",
      vehicles: [
        {
          ...baseFrame.vehicles[0],
          id: "entering-vehicle",
          x_meters: 10
        }
      ]
    };

    const beforeBoundary = interpolateSimulationFrame(
      [entry(baseFrame, 1000), entry(nextFrame, 1100)],
      {
        nowMs: 1200,
        interpolationDelayMs: 150
      }
    );
    const atBoundary = interpolateSimulationFrame(
      [entry(baseFrame, 1000), entry(nextFrame, 1100)],
      {
        nowMs: 1250,
        interpolationDelayMs: 150
      }
    );

    expect(beforeBoundary.frame?.vehicles.map((vehicle) => vehicle.id)).toEqual([
      "vehicle-1"
    ]);
    expect(atBoundary.frame?.vehicles.map((vehicle) => vehicle.id)).toEqual([
      "entering-vehicle"
    ]);
  });

  test("interpolates pedestrians by id and keeps missing next pedestrians until the frame boundary", () => {
    const nextFrame: SimulationFrameSnapshot = {
      ...baseFrame,
      sim_time_seconds: 10.1,
      captured_at: "2026-06-18T00:00:10.100Z",
      pedestrians: [
        {
          ...basePedestrian,
          x_meters: 2,
          y_meters: 8,
          heading_degrees: 180,
          speed_mps: 0.6,
          waiting_seconds: 3
        },
        {
          ...basePedestrian,
          id: "person-entering",
          x_meters: 8
        }
      ]
    };

    const beforeBoundary = interpolateSimulationFrame(
      [entry(baseFrame, 1000), entry(nextFrame, 1100)],
      {
        nowMs: 1200,
        interpolationDelayMs: 150
      }
    );

    expect(
      beforeBoundary.frame?.pedestrians?.map((pedestrian) => pedestrian.id)
    ).toEqual(["person-1"]);
    const interpolatedPedestrian = beforeBoundary.frame?.pedestrians?.[0];
    expect(interpolatedPedestrian?.x_meters).toBeCloseTo(0);
    expect(interpolatedPedestrian?.y_meters).toBeCloseTo(6);
    expect(interpolatedPedestrian?.heading_degrees).toBeCloseTo(135);
    expect(interpolatedPedestrian?.speed_mps).toBeCloseTo(0.9);
    expect(interpolatedPedestrian?.waiting_seconds).toBeCloseTo(1.5);

    const atBoundary = interpolateSimulationFrame(
      [entry(baseFrame, 1000), entry(nextFrame, 1100)],
      {
        nowMs: 1250,
        interpolationDelayMs: 150
      }
    );

    expect(
      atBoundary.frame?.pedestrians?.map((pedestrian) => pedestrian.id)
    ).toEqual(["person-1", "person-entering"]);
  });

  test("extrapolates pedestrians in the bounded window and clones them safely", () => {
    const fresh = interpolateSimulationFrame([entry(baseFrame, 1000)], {
      nowMs: 1200,
      interpolationDelayMs: 150,
      maxExtrapolationMs: 300,
      staleAfterMs: 1000
    });

    const freshPedestrian = fresh.frame?.pedestrians?.[0];

    expect(freshPedestrian?.x_meters).toBeCloseTo(-2);
    expect(freshPedestrian?.y_meters).toBeCloseTo(4.06);

    if (freshPedestrian) {
      freshPedestrian.x_meters = 99;
    }

    expect(basePedestrian.x_meters).toBe(-2);
  });

  test("extrapolates a missing next frame only for the bounded window before marking stale", () => {
    const fresh = interpolateSimulationFrame([entry(baseFrame, 1000)], {
      nowMs: 1200,
      interpolationDelayMs: 150,
      maxExtrapolationMs: 300,
      staleAfterMs: 1000
    });

    expect(fresh.frame?.vehicles[0].x_meters).toBeCloseTo(0.1);
    expect(fresh.telemetry.stale).toBe(false);

    const stale = interpolateSimulationFrame([entry(baseFrame, 1000)], {
      nowMs: 2600,
      interpolationDelayMs: 150,
      maxExtrapolationMs: 300,
      staleAfterMs: 1000
    });

    expect(stale.frame?.vehicles[0].x_meters).toBe(0);
    expect(stale.telemetry.stale).toBe(true);
    expect(stale.telemetry.staleReason).toBe("missing_next_frame");
  });

  test("does not convert density segments into precise vehicles", () => {
    const densityFrame: SimulationFrameSnapshot = {
      ...baseFrame,
      vehicles: [],
      pedestrians: [],
      density_segments: [
        {
          segment_id: "west-queue-1",
          approach: "west",
          start_meters_from_stop_line: 10,
          end_meters_from_stop_line: 50,
          lane_count: 2,
          vehicle_count: 9,
          average_speed_mps: 1.5,
          source: "aggregate_density_proxy"
        }
      ]
    };

    const interpolated = interpolateSimulationFrame([entry(densityFrame, 1000)], {
      nowMs: 1100,
      interpolationDelayMs: 150
    });

    expect(interpolated.frame?.vehicles).toEqual([]);
    expect(interpolated.frame?.pedestrians).toEqual([]);
    expect(interpolated.frame?.density_segments).toHaveLength(1);
  });
});
