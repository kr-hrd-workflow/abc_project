// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";

import {
  getFixtures,
  getIntersectionStatus,
  getRuntimeReadiness,
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
