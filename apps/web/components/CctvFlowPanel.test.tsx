// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { CctvFlowPanel } from "./CctvFlowPanel";
import type { CctvFlow } from "../lib/types";

afterEach(() => {
  cleanup();
});

const FLOW: CctvFlow = {
  source: "cctv",
  captured_at: "2026-06-30T12:00:00+00:00",
  window_seconds: 30,
  per_approach: {
    north: { veh_per_hour: 912, by_class: { car: 7 }, crossings: 7 },
    south: { veh_per_hour: 600, by_class: { car: 5 }, crossings: 5 }
  },
  pedestrian: { per_hour: 240, crossings: 2 }
};

describe("CctvFlowPanel", () => {
  test("renders measured veh/h per approach with a measured-CCTV label", () => {
    render(<CctvFlowPanel flow={FLOW} locale="ko" />);

    expect(screen.getByText("측정 CCTV 교통량")).toBeTruthy();
    expect(screen.getByText("north")).toBeTruthy();
    expect(screen.getByText(/912/)).toBeTruthy();
    expect(screen.getByText(/240/)).toBeTruthy(); // pedestrians
  });

  test("renders an empty state when there is no measurement", () => {
    render(<CctvFlowPanel flow={null} locale="ko" />);

    expect(screen.getByText(/측정 소스 없음/)).toBeTruthy();
  });
});
