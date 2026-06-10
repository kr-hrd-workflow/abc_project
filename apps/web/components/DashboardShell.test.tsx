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
  vi.unstubAllGlobals();
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
  test("renders the reduced-neon operations cockpit structure", () => {
    const { container } = renderDashboard({ selectedScenarioId: "emergency" });

    expect(container.querySelector('[data-theme="launch-cinematic"]')).toBeTruthy();
    expect(container.querySelector('[data-layout="operations-cockpit"]')).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 1, name: "스마트 교차로 운영 시스템" })
    ).toBeTruthy();
    expect(screen.getByLabelText("Scenario Rail")).toBeTruthy();
    expect(screen.getByText("Incident Brief Spine")).toBeTruthy();
    expect(screen.getByLabelText("Simulation Viewport")).toBeTruthy();
    expect(screen.getByText("Response Plan")).toBeTruthy();
    expect(screen.getAllByText("긴급차량 우선 통과").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Simulation only / No real signal control")).toBeTruthy();
  });

  test("renders the approved safety and simulation viewport copy", () => {
    renderDashboard();

    expect(screen.getAllByText("실제 신호 제어 없음").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/교체형 시뮬레이션 뷰/)).toBeTruthy();
  });

  test("lets the operator switch between AI automatic and admin manual operation modes", async () => {
    renderDashboard();

    const aiButton = screen.getByRole("button", { name: "AI 자동 운영" });
    const manualButton = screen.getByRole("button", { name: "관리자 직접 운영" });

    expect(aiButton.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("AI가 시뮬레이션 권고를 자동으로 준비합니다.")).toBeTruthy();

    await userEvent.click(manualButton);

    expect(aiButton.getAttribute("aria-pressed")).toBe("false");
    expect(manualButton.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("관리자가 권고안을 검토하고 직접 실행 여부를 판단합니다.")).toBeTruthy();
  });

  test("shows operational details for automatic and manual modes", async () => {
    renderDashboard();

    expect(screen.getByText("자동 준비 중")).toBeTruthy();
    expect(screen.getByText("신뢰도 92%")).toBeTruthy();
    expect(screen.getByText("다음 권고 emergency_priority")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "관리자 직접 운영" }));

    expect(screen.getByText("승인 보류")).toBeTruthy();
    expect(screen.getByText("관리자 검토 필요")).toBeTruthy();
    expect(screen.getByText("감사 로그 준비")).toBeTruthy();
  });

  test("exposes natural motion hooks for the operation mode transition", async () => {
    const { container } = renderDashboard();

    const toggle = screen.getByRole("group", { name: "운영 모드" });
    const aiButton = screen.getByRole("button", { name: "AI 자동 운영" });
    const manualButton = screen.getByRole("button", { name: "관리자 직접 운영" });
    const stateCards = screen.getByLabelText("운영 모드 상태");

    expect(toggle.getAttribute("data-mode")).toBe("ai");
    expect(toggle.className).toContain("motion-toggle");
    expect(aiButton.className).toContain("motion-pressable");
    expect(manualButton.className).toContain("motion-pressable");
    expect(stateCards.getAttribute("data-mode")).toBe("ai");
    expect(container.querySelectorAll(".operation-state-card").length).toBe(3);

    await userEvent.click(manualButton);

    expect(toggle.getAttribute("data-mode")).toBe("manual");
    expect(stateCards.getAttribute("data-mode")).toBe("manual");
  });

  test("marks high-frequency dashboard actions as responsive pressable surfaces", () => {
    renderDashboard();

    expect(screen.getByRole("button", { name: "추천 새로고침" }).className).toContain(
      "motion-icon-button"
    );
    expect(screen.getByRole("button", { name: "전송" }).className).toContain(
      "motion-pressable"
    );
    expect(screen.getByRole("button", { name: /리포트 생성/ }).className).toContain(
      "motion-pressable"
    );
    expect(screen.getByRole("button", { name: "다운로드" }).className).toContain(
      "motion-pressable"
    );
    expect(screen.getByRole("link", { name: /알림/ }).className).toContain(
      "motion-pressable"
    );
    expect(screen.getByRole("button", { name: /긴급차량/ }).className).toContain(
      "motion-pressable"
    );
  });

  test("adds dense brief-spine evidence instead of leaving the incident rail empty", () => {
    renderDashboard();

    expect(screen.getByText("우선순위 큐")).toBeTruthy();
    expect(screen.getByText("증거 흐름")).toBeTruthy();
    expect(screen.getByText("CCTV Frame")).toBeTruthy();
    expect(screen.getByText("SUMO Delta")).toBeTruthy();
  });

  test("promotes the response plan into a focus-first command stack", () => {
    renderDashboard();

    expect(screen.getByText("Decision focus")).toBeTruthy();
    expect(screen.getByText("권고안 검토")).toBeTruthy();
    expect(screen.getByText("실행 전 승인 필요")).toBeTruthy();
    expect(screen.getByText("Response stack")).toBeTruthy();
  });

  test("renders the replaceable SUMO simulation viewport boundary", () => {
    renderDashboard();

    expect(screen.getByText("SUMO/TraCI Renderer")).toBeTruthy();
    expect(screen.getAllByText("sumo_traci").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Delay -18%")).toBeTruthy();
  });

  test("renders aggregate SUMO telemetry without claiming vehicle trajectories", () => {
    renderDashboard();

    expect(screen.getByLabelText("SUMO 집계 텔레메트리")).toBeTruthy();
    expect(screen.getByLabelText("SUMO 스타일 교통 재생")).toBeTruthy();
    expect(screen.getByText("실사형 재생")).toBeTruthy();
    expect(screen.getByText("주기 22s")).toBeTruthy();
    expect(screen.getByText("대기 72s -> 59s")).toBeTruthy();
    expect(screen.getByText("처리량 +13%")).toBeTruthy();
    expect(screen.getByText("긴급 통과 28s -> 18s")).toBeTruthy();
    expect(screen.getByText("파생 대기열 압력")).toBeTruthy();
    expect(screen.getByText("서 16대")).toBeTruthy();
    expect(screen.getByText("집계 지표 기반")).toBeTruthy();
  });

  test("switches visible labels between Korean and English", async () => {
    renderDashboard();

    await userEvent.click(screen.getByRole("button", { name: "EN" }));

    expect(screen.getByText("Incident Brief Spine")).toBeTruthy();
    expect(screen.getAllByText("No real signal control").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("AI Automatic")).toBeTruthy();
    expect(screen.getByText("Admin Manual")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Alert" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Reports" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Scenarios" })).toBeTruthy();
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

  test("uses real navigation targets for header actions", () => {
    renderDashboard();

    expect(screen.getByRole("link", { name: /알림/ }).getAttribute("href")).toBe(
      "#events"
    );
    expect(screen.getByRole("link", { name: /리포트/ }).getAttribute("href")).toBe(
      "#reports"
    );
    expect(screen.getByRole("link", { name: /시나리오/ }).getAttribute("href")).toBe(
      "#scenario-control"
    );
  });

  test("keeps recommendation and simulation copy aligned to non-emergency data", () => {
    renderDashboard({
      selectedScenarioId: "pedestrian",
      status: {
        ...status,
        signal_phase: "pedestrian_phase",
        emergency_priority: false
      },
      events: [
        {
          ...events[0],
          event_type: "pedestrian_waiting",
          severity: "warning",
          direction: null,
          ai_summary: "Pedestrians waiting at the crossing."
        }
      ],
      recommendation: {
        ...recommendation,
        action: "pedestrian_phase",
        recommended_plan: { pedestrian_crossing: 20 },
        evidence: { reason: "pedestrian_waiting" }
      }
    });

    expect(screen.getByText("보행자 횡단 단계 권고")).toBeTruthy();
    expect(screen.getByText("보행자 대기 요청이 감지되었습니다.")).toBeTruthy();
    expect(screen.getByLabelText("보행자 대기 SUMO 이벤트")).toBeTruthy();
    expect(screen.queryByText("긴급차량이 동쪽에서 접근 중입니다.")).toBeNull();
    expect(screen.queryByLabelText("긴급차량")).toBeNull();
  });

  test("renders blocked-intersection SUMO markers from events", () => {
    renderDashboard({
      selectedScenarioId: "blocked",
      status: {
        ...status,
        signal_phase: "all_red",
        pedestrian_request: false,
        emergency_priority: false
      },
      events: [
        {
          ...events[0],
          event_type: "intersection_blocked",
          severity: "critical",
          direction: "west",
          object_count: 4,
          ai_summary: "Blocked vehicles are holding the west approach."
        }
      ],
      recommendation: {
        ...recommendation,
        action: "all_red_clearance",
        recommended_plan: { all_red: 12 },
        evidence: { reason: "intersection_blocked", direction: "west" }
      }
    });

    expect(screen.getByLabelText("교차로 차단 SUMO 이벤트")).toBeTruthy();
    expect(screen.getByText("서쪽 접근부 4대")).toBeTruthy();
    expect(screen.queryByLabelText("긴급차량")).toBeNull();
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

  test("shows recoverable chat errors without clearing the operator question", async () => {
    const onAskQuestion = vi.fn().mockRejectedValue(new Error("network down"));
    renderDashboard({ onAskQuestion });

    await userEvent.type(
      screen.getByPlaceholderText("현재 교통 상황 질문"),
      "동쪽 상황은?"
    );
    await userEvent.click(screen.getByRole("button", { name: "전송" }));

    const alert = await screen.findByRole("alert");

    expect(alert.textContent).toContain("질문 전송 실패");
    expect(screen.getByDisplayValue("동쪽 상황은?")).toBeTruthy();
  });

  test("shows recoverable report generation errors", async () => {
    const onGenerateReport = vi.fn().mockRejectedValue(new Error("network down"));
    renderDashboard({ onGenerateReport });

    await userEvent.click(screen.getByRole("button", { name: /리포트 생성/ }));

    const alert = await screen.findByRole("alert");

    expect(alert.textContent).toContain("리포트 생성 실패");
    expect(screen.getByRole("button", { name: /리포트 생성/ })).toBeTruthy();
  });

  test("downloads the current report as JSON", async () => {
    const createObjectURL = vi.fn(() => "blob:report");
    const revokeObjectURL = vi.fn();
    const click = vi.fn();
    const originalCreateElement = document.createElement.bind(document);

    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL
    });

    renderDashboard();

    vi.spyOn(document, "createElement").mockImplementation((tagName, options) => {
      if (tagName === "a") {
        return {
          click,
          download: "",
          href: ""
        } as unknown as HTMLAnchorElement;
      }

      return originalCreateElement(tagName, options);
    });

    await userEvent.click(screen.getByRole("button", { name: "다운로드" }));

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:report");
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
