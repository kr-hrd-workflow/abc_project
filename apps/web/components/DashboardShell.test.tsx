// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import { DashboardShell } from "./DashboardShell";
import type {
  ChatResponse,
  IntersectionStatus,
  Recommendation,
  Report,
  SimulationComparison,
  TrafficEvent
} from "../lib/types";
import { SCENARIO_OPTIONS } from "../lib/types";

const status: IntersectionStatus = {
  intersection_id: "INT-0001",
  captured_at: "2026-06-09T08:42:00Z",
  signal_phase: "east_priority",
  cycle_second: 22,
  queues: {
    north: 9,
    south: 5,
    east: 7,
    west: 16
  },
  pedestrian_request: true,
  emergency_priority: true,
  congestion_level: "high",
  source: "scenario_mock"
};

const events: TrafficEvent[] = [
  {
    id: 1,
    intersection_id: "INT-0001",
    occurred_at: "2026-06-09T08:42:15Z",
    direction: "east",
    event_type: "emergency_vehicle_approach",
    severity: "critical",
    object_count: 1,
    ai_summary: "Emergency vehicle approaching from East.",
    recommendation: "Review emergency priority signal simulation.",
    status: "open",
    source: "scenario_mock"
  }
];

const recommendation: Recommendation = {
  id: 1,
  intersection_id: "INT-0001",
  created_at: "2026-06-09T08:42:20Z",
  action: "emergency_priority",
  recommended_plan: {
    east: 35,
    north: 20,
    south: 20,
    west: 15
  },
  evidence: {
    reason: "emergency_vehicle_approach",
    direction: "east",
    estimated_arrival_seconds: 12
  },
  safety_boundary:
    "Recommendation and simulation only. No real traffic signal control is performed.",
  status: "draft"
};

const simulation: SimulationComparison = {
  source: "sumo_traci",
  baseline: {
    average_wait_seconds: 72,
    total_delay_seconds: 128.4,
    throughput: 1842,
    emergency_vehicle_clearance_seconds: 28
  },
  recommended: {
    average_wait_seconds: 59,
    total_delay_seconds: 105.3,
    throughput: 2084,
    emergency_vehicle_clearance_seconds: 18
  },
  improvement: {
    average_wait_percent: -18,
    total_delay_percent: -18,
    throughput_percent: 13,
    emergency_vehicle_clearance_percent: -36
  }
};

const report: Report = {
  id: 1,
  intersection_id: "INT-0001",
  period_start: "2026-06-09T08:00:00Z",
  period_end: "2026-06-09T08:42:00Z",
  summary: "Scenario 08:42 report",
  generated_at: "2026-06-09T08:42:31Z"
};

const chat: ChatResponse = {
  answer: "Delay is expected to improve by 18% in simulation.",
  referenced_event_ids: [1]
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderDashboard(overrides = {}) {
  return render(
    <DashboardShell
      status={status}
      events={events}
      recommendation={recommendation}
      simulation={simulation}
      report={report}
      chat={chat}
      onAskQuestion={vi.fn()}
      onGenerateReport={vi.fn()}
      onRefreshRecommendation={vi.fn()}
      onRunSimulation={vi.fn()}
      selectedScenarioId="emergency"
      scenarioOptions={SCENARIO_OPTIONS}
      scenarioLoading={false}
      onScenarioChange={vi.fn()}
      {...overrides}
    />
  );
}

describe("DashboardShell", () => {
  test("renders a clear dashboard heading and scenario rail", () => {
    renderDashboard({ selectedScenarioId: "emergency" });

    expect(
      screen.getByRole("heading", { level: 1, name: "스마트 교차로 운영 시스템" })
    ).toBeTruthy();
    expect(screen.getByLabelText("시나리오 08:42")).toBeTruthy();
    expect(screen.getByText("긴급차량 우선 통과")).toBeTruthy();
  });

  test("renders the approved safety and simulation viewport copy", () => {
    renderDashboard();

    expect(screen.getByText("실제 신호 제어 없음")).toBeTruthy();
    expect(screen.getByText(/교체형 시뮬레이션 뷰/)).toBeTruthy();
  });

  test("renders the replaceable SUMO simulation viewport boundary", () => {
    renderDashboard();

    expect(screen.getByText("SUMO/TraCI Renderer")).toBeTruthy();
    expect(screen.getByText("sumo_traci")).toBeTruthy();
    expect(screen.getByText("Delay -18%")).toBeTruthy();
  });

  test("switches visible labels between Korean and English", async () => {
    renderDashboard();

    await userEvent.click(screen.getByRole("button", { name: "EN" }));

    expect(screen.getByText("Event Timeline")).toBeTruthy();
    expect(screen.getByText("No real signal control")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Alert" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reports" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Settings" })).toBeTruthy();
  });

  test("renders scenario options and marks the selected scenario", () => {
    renderDashboard({ selectedScenarioId: "blocked" });

    expect(screen.getByRole("button", { name: /차단/ }).getAttribute("aria-pressed")).toBe(
      "true"
    );
    expect(
      screen.getByRole("button", { name: /긴급차량/ }).getAttribute("aria-pressed")
    ).toBe("false");
  });

  test("calls scenario change handler from the segmented control", async () => {
    const onScenarioChange = vi.fn();
    renderDashboard({
      selectedScenarioId: "emergency",
      onScenarioChange
    });

    await userEvent.click(screen.getByRole("button", { name: /보행자/ }));

    expect(onScenarioChange).toHaveBeenCalledWith("pedestrian");
  });

  test("submits chat questions through the provided handler", async () => {
    const onAskQuestion = vi.fn().mockResolvedValue(undefined);
    renderDashboard({ onAskQuestion });

    await userEvent.type(
      screen.getByPlaceholderText("현재 교통 상황 질문"),
      "동쪽 상황은?"
    );
    await userEvent.click(screen.getByRole("button", { name: "전송" }));

    expect(onAskQuestion).toHaveBeenCalledWith("동쪽 상황은?");
  });

  test("shows feedback after running the simulation", async () => {
    const onRunSimulation = vi.fn().mockResolvedValue(undefined);
    renderDashboard({ onRunSimulation });

    await userEvent.click(screen.getByRole("button", { name: "시뮬레이션 실행" }));

    expect(onRunSimulation).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("시뮬레이션 갱신 완료")).toBeTruthy();
  });

  test("disables recommendation refresh while refresh is running", async () => {
    const user = userEvent.setup();
    let resolveRefresh: () => void = () => undefined;
    const onRefreshRecommendation = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        })
    );

    renderDashboard({ onRefreshRecommendation });

    const refreshButton = screen.getByRole("button", { name: "추천 새로고침" });
    await user.click(refreshButton);

    expect((refreshButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("추천 새로고침 중")).toBeTruthy();

    resolveRefresh();
  });
});
