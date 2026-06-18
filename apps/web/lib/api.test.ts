// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";

import {
  getFixtures,
  getIntersectionStatus,
  getSimulationFrame,
  getRuntimeReadiness,
  isSimulationFrameRouteMissingError,
  normalizeApiBaseUrl,
  recommendSignal
} from "./api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API client", () => {
  test("normalizes API base URLs that already include the /api prefix", () => {
    expect(normalizeApiBaseUrl("http://127.0.0.1:8000")).toBe(
      "http://127.0.0.1:8000"
    );
    expect(normalizeApiBaseUrl("http://127.0.0.1:8000/api")).toBe(
      "http://127.0.0.1:8000"
    );
    expect(normalizeApiBaseUrl("http://127.0.0.1:8000/api/")).toBe(
      "http://127.0.0.1:8000"
    );
  });

  test("retries scenario-scoped reads without scenario_id when the API returns 404", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Not Found" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          intersection_id: "INT-0001",
          captured_at: "2026-06-08T01:24:30+00:00",
          signal_phase: "east_priority",
          cycle_second: 24,
          queues: { north: 32, south: 11, east: 18, west: 8 },
          pedestrian_request: true,
          emergency_priority: true,
          congestion_level: "high",
          source: "scenario_mock"
        })
      });

    vi.stubGlobal("fetch", fetchMock);

    const status = await getIntersectionStatus("emergency");

    expect(status.intersection_id).toBe("INT-0001");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://127.0.0.1:8000/api/intersection/status?scenario_id=emergency"
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "http://127.0.0.1:8000/api/intersection/status"
    );
  });

  test("treats missing fixture routes as an empty optional fixture list", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: "Not Found" })
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(getFixtures()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/fixtures",
      expect.objectContaining({ cache: "no-store" })
    );
  });

  test("treats missing runtime readiness route as unavailable readiness", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: "Not Found" })
    });

    vi.stubGlobal("fetch", fetchMock);

    const readiness = await getRuntimeReadiness();

    expect(readiness.openai.ready).toBe(false);
    expect(readiness.openai.mode).toBe("unavailable");
    expect(readiness.openai.missing).toContain("runtime readiness endpoint");
  });

  test("requests the simulation frame snapshot with the selected scenario", async () => {
    const frameSnapshot = {
      source: "simulation_snapshot_fixture",
      intersection_id: "INT-0001",
      scenario_id: "emergency",
      sim_time_seconds: 42,
      captured_at: "2026-06-16T00:00:00.000Z",
      bounds_meters: { min_x: -160, max_x: 160, min_y: -140, max_y: 140 },
      vehicles: [
        {
          id: "east-emergency-1",
          vehicle_type: "emergency",
          lane_id: "east_in_1",
          x_meters: 72,
          y_meters: 4,
          heading_degrees: 270,
          speed_mps: 11.5,
          waiting_seconds: 0,
          emergency: true
        }
      ],
      density_segments: [
        {
          segment_id: "west-queue-1",
          approach: "west",
          start_meters_from_stop_line: 12,
          end_meters_from_stop_line: 118,
          lane_count: 3,
          vehicle_count: 28,
          average_speed_mps: 2.5,
          source: "fixture_density_proxy"
        }
      ],
      signals: [
        {
          signal_id: "east-main",
          direction: "east",
          state: "green",
          seconds_remaining: 18
        }
      ],
      queues: { north: 9, south: 5, east: 7, west: 16 },
      events: [
        {
          id: 1,
          intersection_id: "INT-0001",
          occurred_at: "2026-06-16T00:00:00.000Z",
          direction: "east",
          event_type: "emergency_vehicle_approach",
          severity: "critical",
          object_count: 1,
          ai_summary: "Emergency vehicle approaching from East.",
          recommendation: "Review emergency priority signal simulation.",
          status: "open",
          source: "scenario_mock"
        }
      ]
    };
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => frameSnapshot
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(getSimulationFrame("emergency")).resolves.toEqual(frameSnapshot);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/simulation/frame?scenario_id=emergency",
      expect.objectContaining({ cache: "no-store" })
    );
  });

  test("recognizes missing simulation frame route errors with scenario query params", () => {
    expect(
      isSimulationFrameRouteMissingError(
        new Error("API request failed: 404 /api/simulation/frame?scenario_id=emergency")
      )
    ).toBe(true);
    expect(
      isSimulationFrameRouteMissingError(
        new Error("API request failed: 500 /api/simulation/frame?scenario_id=emergency")
      )
    ).toBe(false);
  });

  test("uses simulation-only fallback recommendation when control route is missing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Not Found" })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Not Found" })
      });

    vi.stubGlobal("fetch", fetchMock);

    const recommendation = await recommendSignal("emergency");

    expect(recommendation.status).toBe("fallback");
    expect(recommendation.safety_boundary).toContain("No real traffic signal control");
  });
});
