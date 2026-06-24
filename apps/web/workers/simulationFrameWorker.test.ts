import { describe, expect, test } from "vitest";

import type { SimulationFrameSnapshot } from "../lib/simulationSnapshot";
import {
  createSimulationFrameRingBuffer,
  normalizeSimulationFrameMessage
} from "./simulationFrameWorker";

const baseFrame: SimulationFrameSnapshot = {
  source: "sumo_traci",
  intersection_id: "INT-0001",
  scenario_id: "emergency",
  sim_time_seconds: 1,
  captured_at: "2026-06-18T00:00:00.000Z",
  bounds_meters: { min_x: -10, max_x: 10, min_y: -10, max_y: 10 },
  vehicles: [],
  density_segments: [],
  signals: [],
  queues: { north: 0, south: 0, east: 0, west: 0 },
  events: []
};

describe("simulation frame worker buffer", () => {
  test("rejects frames without the minimum simulation frame shape", () => {
    expect(
      normalizeSimulationFrameMessage({
        type: "simulation-frame",
        frame: { source: "sumo_traci" },
        receivedAtMs: 100,
        networkLatencyMs: 12
      })
    ).toBeNull();
  });

  test("normalizes source labels and timestamps before buffering", () => {
    const entry = normalizeSimulationFrameMessage({
      type: "simulation-frame",
      frame: {
        ...baseFrame,
        source: " sumo_last_good ",
        captured_at: "2026-06-18T00:00:02.000Z"
      },
      receivedAtMs: 2500,
      networkLatencyMs: 34.4
    });

    expect(entry).toEqual(
      expect.objectContaining({
        receivedAtMs: 2500,
        networkLatencyMs: 34,
        capturedAtMs: Date.parse("2026-06-18T00:00:02.000Z")
      })
    );
    expect(entry?.frame.source).toBe("sumo_last_good");
    expect(entry?.frame.captured_at).toBe("2026-06-18T00:00:02.000Z");
  });

  test("keeps SUMO pedestrian snapshots from authoritative frames", () => {
    const entry = normalizeSimulationFrameMessage({
      type: "simulation-frame",
      frame: {
        ...baseFrame,
        pedestrians: [
          {
            id: "person-1",
            x_meters: -3.5,
            y_meters: 12,
            heading_degrees: 91,
            speed_mps: 1.35,
            lane_id: null,
            edge_id: "crosswalk-west",
            waiting_seconds: 2.25,
            source: "sumo_person"
          }
        ]
      },
      receivedAtMs: 2500,
      networkLatencyMs: 10
    });

    expect(entry?.frame.pedestrians).toEqual([
      {
        id: "person-1",
        x_meters: -3.5,
        y_meters: 12,
        heading_degrees: 91,
        speed_mps: 1.35,
        lane_id: null,
        edge_id: "crosswalk-west",
        waiting_seconds: 2.25,
        source: "sumo_person"
      }
    ]);
  });

  test("keeps the latest two authoritative frames ordered by sim time", () => {
    const buffer = createSimulationFrameRingBuffer(2);

    for (const simTime of [2, 1, 3]) {
      buffer.push({
        frame: { ...baseFrame, sim_time_seconds: simTime },
        receivedAtMs: simTime * 100,
        networkLatencyMs: 10,
        capturedAtMs: Date.parse(baseFrame.captured_at)
      });
    }

    expect(buffer.latestTwo().map((entry) => entry.frame.sim_time_seconds)).toEqual([
      2,
      3
    ]);
  });

  test("keeps authoritative frame buffers scoped to one scenario", () => {
    const buffer = createSimulationFrameRingBuffer(2);

    buffer.push({
      frame: { ...baseFrame, scenario_id: "emergency", sim_time_seconds: 1 },
      receivedAtMs: 100,
      networkLatencyMs: 10,
      capturedAtMs: Date.parse(baseFrame.captured_at)
    });
    buffer.push({
      frame: { ...baseFrame, scenario_id: "pedestrian", sim_time_seconds: 2 },
      receivedAtMs: 200,
      networkLatencyMs: 10,
      capturedAtMs: Date.parse(baseFrame.captured_at)
    });

    expect(buffer.latestTwo().map((entry) => entry.frame.scenario_id)).toEqual([
      "pedestrian"
    ]);
  });

  test("rejects frames with invalid nested vehicle, signal, density, queue, or event values", () => {
    expect(
      normalizeSimulationFrameMessage({
        type: "simulation-frame",
        frame: {
          ...baseFrame,
          vehicles: [
            {
              id: "bad",
              vehicle_type: "car",
              lane_id: "east_in_1",
              x_meters: "1",
              y_meters: 0,
              heading_degrees: 0,
              speed_mps: 0,
              waiting_seconds: 0,
              emergency: false
            }
          ]
        },
        receivedAtMs: 100,
        networkLatencyMs: 12
      })
    ).toBeNull();

    expect(
      normalizeSimulationFrameMessage({
        type: "simulation-frame",
        frame: {
          ...baseFrame,
          pedestrians: [
            {
              id: "bad-person",
              x_meters: 0,
              y_meters: 0,
              heading_degrees: 0,
              speed_mps: "1",
              lane_id: null,
              edge_id: "crosswalk-west",
              waiting_seconds: 0,
              source: "sumo_person"
            }
          ]
        },
        receivedAtMs: 100,
        networkLatencyMs: 12
      })
    ).toBeNull();

    expect(
      normalizeSimulationFrameMessage({
        type: "simulation-frame",
        frame: {
          ...baseFrame,
          signals: [
            {
              signal_id: "bad-signal",
              direction: "east",
              state: "blue",
              seconds_remaining: 1
            }
          ]
        },
        receivedAtMs: 100,
        networkLatencyMs: 12
      })
    ).toBeNull();

    expect(
      normalizeSimulationFrameMessage({
        type: "simulation-frame",
        frame: {
          ...baseFrame,
          density_segments: [
            {
              segment_id: "bad-density",
              approach: "west",
              start_meters_from_stop_line: 1,
              end_meters_from_stop_line: 5,
              lane_count: "2",
              vehicle_count: 4,
              average_speed_mps: 1,
              source: "aggregate_density_proxy"
            }
          ]
        },
        receivedAtMs: 100,
        networkLatencyMs: 12
      })
    ).toBeNull();

    expect(
      normalizeSimulationFrameMessage({
        type: "simulation-frame",
        frame: {
          ...baseFrame,
          queues: { ...baseFrame.queues, east: "3" }
        },
        receivedAtMs: 100,
        networkLatencyMs: 12
      })
    ).toBeNull();

    expect(
      normalizeSimulationFrameMessage({
        type: "simulation-frame",
        frame: {
          ...baseFrame,
          events: [
            {
              id: 1,
              intersection_id: "INT-0001",
              occurred_at: "2026-06-18T00:00:00.000Z",
              direction: "north",
              event_type: "queue_threshold_exceeded",
              severity: "urgent",
              object_count: 1,
              ai_summary: "Bad event severity.",
              recommendation: "Reject frame.",
              status: "open",
              source: "sumo_traci"
            }
          ]
        },
        receivedAtMs: 100,
        networkLatencyMs: 12
      })
    ).toBeNull();
  });
});
