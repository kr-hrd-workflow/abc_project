// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { DashboardRoute } from "./DashboardRoute";

vi.mock("../lib/api", () => ({
  askQuestion: vi.fn(),
  analyzeUpload: vi.fn(),
  generateReport: vi.fn().mockRejectedValue(new Error("not used")),
  getAnalysisJob: vi.fn(),
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
  ingestFixture: vi.fn(),
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
