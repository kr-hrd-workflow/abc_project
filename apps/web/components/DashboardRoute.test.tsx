// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { RuntimeReadiness } from "../lib/types";
import { DashboardRoute, shouldRequestCctvFlow } from "./DashboardRoute";

vi.mock("../lib/api", () => ({
  askQuestion: vi.fn(),
  analyzeUpload: vi.fn(),
  generateReport: vi.fn().mockRejectedValue(new Error("not used")),
  getAnalysisJob: vi.fn(),
  getCctvFlow: vi.fn().mockResolvedValue(null),
  getEvents: vi.fn().mockRejectedValue(new Error("not used")),
  getFixtures: vi.fn().mockRejectedValue(new Error("not used")),
  getIntersectionStatus: vi
    .fn()
    .mockRejectedValue(
      new Error(
        "API request failed: 503 /api/intersection/status: Database unavailable. Start PostgreSQL and run migrations."
      )
    ),
  getRuntimeReadiness: vi.fn().mockRejectedValue(new Error("not used")),
  getSimulationFrame: vi.fn().mockRejectedValue(new Error("not used")),
  ingestFixture: vi.fn(),
  isSimulationFrameRouteMissingError: vi.fn().mockReturnValue(false),
  recommendSignal: vi.fn().mockRejectedValue(new Error("not used")),
  simulateSignal: vi.fn().mockRejectedValue(new Error("not used"))
}));

afterEach(() => {
  cleanup();
});

describe("DashboardRoute", () => {
  test("renders an actionable API recovery state", async () => {
    render(<DashboardRoute />);

    expect(await screen.findByText("Dashboard API unavailable")).toBeTruthy();
    expect(
      screen.getByText("Database unavailable. Start PostgreSQL and run migrations.")
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry connection" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to landing" }).getAttribute("href")).toBe(
      "/"
    );
  });
});

describe("shouldRequestCctvFlow", () => {
  test("only requests CCTV flow when the OpenCV/YOLO vision runtime is ready", () => {
    const readiness: RuntimeReadiness = {
      vision: {
        ready: false,
        mode: "fixture",
        missing: [],
        checks: []
      },
      simulation: {
        ready: true,
        mode: "sumo_traci",
        missing: [],
        checks: []
      },
      openai: {
        ready: true,
        mode: "gpt-5.5",
        missing: [],
        checks: []
      },
      pgvector: {
        ready: false,
        mode: "database",
        missing: [],
        checks: []
      }
    };

    expect(shouldRequestCctvFlow(readiness)).toBe(false);
    expect(
      shouldRequestCctvFlow({
        ...readiness,
        vision: { ...readiness.vision, mode: "opencv_yolo", ready: false }
      })
    ).toBe(false);
    expect(
      shouldRequestCctvFlow({
        ...readiness,
        vision: { ...readiness.vision, mode: "opencv_yolo", ready: true }
      })
    ).toBe(true);
  });
});
