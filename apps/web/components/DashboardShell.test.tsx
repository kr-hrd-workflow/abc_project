// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useState } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

const r3fCameraMock = vi.hoisted(() => ({
  position: { set: vi.fn() },
  lookAt: vi.fn(),
  updateProjectionMatrix: vi.fn(),
  fov: 0,
  near: 0,
  far: 0
}));
const r3fInvalidateMock = vi.hoisted(() => vi.fn());
const dashboardRouteApiMock = vi.hoisted(() => ({
  analyzeUpload: vi.fn(),
  askQuestion: vi.fn(),
  generateReport: vi.fn(),
  getAnalysisJob: vi.fn(),
  getEvents: vi.fn(),
  getFixtures: vi.fn(),
  getIntersectionStatus: vi.fn(),
  getRuntimeReadiness: vi.fn(),
  getSimulationFrame: vi.fn(),
  ingestFixture: vi.fn(),
  isSimulationFrameRouteMissingError: (error: unknown) =>
    error instanceof Error &&
    error.message.includes("API request failed: 404 /api/simulation/frame"),
  recommendSignal: vi.fn(),
  simulateSignal: vi.fn()
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children?: ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useThree: () => ({
    camera: r3fCameraMock,
    invalidate: r3fInvalidateMock,
    size: { width: 914, height: 680 }
  })
}));
vi.mock("./r3f/ApproachCorridors", () => ({
  ApproachCorridors: () => null
}));
vi.mock("./r3f/LightingRig", () => ({
  LightingRig: () => null
}));
vi.mock("./r3f/ProceduralIntersection", () => ({
  ProceduralIntersection: () => null
}));
vi.mock("./r3f/Stage5SceneAssets", async (importActual) => {
  const actual =
    await importActual<typeof import("./r3f/Stage5SceneAssets")>();

  return {
    ...actual,
    Stage5SceneAssets: () => null
  };
});
vi.mock("./r3f/TrafficDensityLayer", async (importActual) => {
  const actual =
    await importActual<typeof import("./r3f/TrafficDensityLayer")>();

  return {
    ...actual,
    TrafficDensityLayer: () => null
  };
});
vi.mock("./r3f/WeatherAndAtmosphere", () => ({
  WeatherAndAtmosphere: () => null
}));
vi.mock("../lib/api", () => dashboardRouteApiMock);

import { DashboardRoute } from "./DashboardRoute";
import { DashboardShell } from "./DashboardShell";
import {
  buildFixtureSceneSnapshot,
  buildSceneSnapshot
} from "./r3f/buildSceneSnapshot";
import { STAGE5_RENDERER_MODE } from "./r3f/R3FSimulationViewport";
import { SimulationScene } from "./r3f/SimulationScene";
import {
  STAGE5_MIN_VISIBLE_VEHICLES,
  STAGE5_TRAFFIC_VEHICLE_SILHOUETTE_PARTS,
  buildTrafficDensityRenderPlan
} from "./r3f/TrafficDensityLayer";
import { getR3FAssetEntry, listR3FAssetEntries } from "./r3f/assetManifest";
import {
  STAGE5_FACADE_PANELS,
  STAGE5_HERO_GLB_ASSET_IDS,
  STAGE5_HERO_VEHICLE_PLACEMENTS,
  STAGE5_STREET_FURNITURE_CONTACT_SHADOW_PLACEMENTS,
  STAGE5_STREET_FURNITURE_GLB_ASSET_IDS,
  STAGE5_STREET_FURNITURE_PLACEMENTS,
  STAGE5_VISIBLE_TRAFFIC_GLB_ASSET_IDS,
  STAGE5_VISIBLE_TRAFFIC_GLB_PLACEMENTS
} from "./r3f/Stage5SceneAssets";
import { STAGE5_TEXTURE_PATHS } from "./r3f/roadMaterials";
import {
  STAGE5_CAMERA,
  STAGE6E_CITY_EDGE_BLOCKS,
  TURN_ARROW_MARKINGS
} from "./r3f/roadGeometry";
import type {
  ChatResponse,
  AnalysisFixture,
  AnalysisJob,
  FixtureIngestResult,
  IntersectionStatus,
  Recommendation,
  Report,
  RuntimeReadiness,
  ScenarioId,
  CityId,
  SimulationComparison,
  TrafficEvent
} from "../lib/types";
import { SCENARIO_OPTIONS } from "../lib/types";
import { CITY_PROFILES } from "../lib/cities";
import type {
  SimulationFrameBufferEntry,
  SimulationFrameSnapshot
} from "../lib/simulationSnapshot";

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

const frameSnapshot: SimulationFrameSnapshot = {
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
    },
    {
      signal_id: "north-main",
      direction: "north",
      state: "red",
      seconds_remaining: 42
    }
  ],
  queues: status.queues,
  events
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

const fixtures: AnalysisFixture[] = [
  {
    fixture_id: "emergency-east-frame",
    scenario_id: "emergency",
    media_type: "image",
    filename: "emergency-east-frame.jpg",
    description: "Sample frame with an emergency vehicle approaching from the east.",
    source: "sample_frame",
    renderer: "opencv_yolo_fixture",
    safety_note: "Sample analysis only. No real CCTV stream or traffic signal control."
  },
  {
    fixture_id: "blocked-intersection-clip",
    scenario_id: "blocked",
    media_type: "video",
    filename: "blocked-intersection-clip.mp4",
    description: "Sample clip representing a blocked four-way intersection.",
    source: "sample_clip",
    renderer: "opencv_yolo_fixture",
    safety_note: "Sample analysis only. No real CCTV stream or traffic signal control."
  },
  {
    fixture_id: "hosted-virtual-cctv-east",
    scenario_id: "emergency",
    media_type: "virtual_cctv",
    filename: "hosted-virtual-cctv-east.mp4",
    description: "Hosted simulation stream virtual CCTV presentation feed for the east emergency approach scenario.",
    source: "hosted_simulation_cctv",
    renderer: "hosted_simulation_stream",
    safety_note: "Hosted visualization is presentation-only; SUMO/TraCI remains the traffic validation engine."
  }
];

const latestFixtureIngest: FixtureIngestResult = {
  ...fixtures[0],
  analysis_status: "ingested",
  observation: { source: "opencv_yolo" },
  status_id: 42,
  event_ids: [1, 2]
};

const latestAnalysisJob: AnalysisJob = {
  job_id: "job-123",
  status: "completed",
  filename: "intersection-frame.jpg",
  media_type: "image/jpeg",
  media_kind: "image",
  scenario_id: "emergency",
  observation_source: "opencv_yolo",
  status_id: 42,
  event_ids: [1, 2],
  size_bytes: 128
};

const stage4RequiredAssetIds = [
  "vehicles/passenger_car_near",
  "vehicles/passenger_car_medium",
  "vehicles/passenger_car_far",
  "vehicles/taxi_near",
  "vehicles/taxi_far",
  "vehicles/bus_near",
  "vehicles/bus_far",
  "vehicles/truck_near",
  "vehicles/truck_far",
  "vehicles/emergency_ambulance_near",
  "vehicles/emergency_ambulance_medium",
  "props/traffic_signal_pole",
  "props/traffic_signal_heads",
  "props/streetlight",
  "props/tree_cluster",
  "props/curb_details",
  "textures/wet_asphalt_albedo",
  "textures/wet_asphalt_roughness",
  "decals/worn_lane_markings",
  "decals/crosswalk_wear",
  "decals/curb_grime",
  "textures/sidewalk_paver_variation",
  "textures/facade_window_emissive"
];

const runtimeReadiness: RuntimeReadiness = {
  vision: { ready: true, mode: "fixture", missing: [], checks: [] },
  simulation: { ready: true, mode: "fixture", missing: [], checks: [] },
  openai: {
    ready: false,
    mode: "gpt-5.5",
    missing: ["OPENAI_API_KEY"],
    checks: [
      { name: "python module openai", available: true },
      { name: "OPENAI_API_KEY", available: false, detail: "presence only" },
      { name: "OPENAI_MONTHLY_BUDGET_USD", available: true }
    ]
  },
  pgvector: { ready: true, mode: "database", missing: [], checks: [] }
};

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function dashboardProps(overrides: Partial<Parameters<typeof DashboardShell>[0]> = {}) {
  return {
    status,
    events,
    recommendation,
    simulation,
    report,
    chat,
    runtimeReadiness,
    simulationFrame: frameSnapshot,
    onAskQuestion: vi.fn(),
    onGenerateReport: vi.fn(),
    onRefreshRecommendation: vi.fn(),
    onRunSimulation: vi.fn(),
    selectedScenarioId: "emergency" as ScenarioId,
    scenarioOptions: SCENARIO_OPTIONS,
    scenarioLoading: false,
    selectedCityId: "seoul" as CityId,
    cityProfiles: CITY_PROFILES,
    onCityChange: vi.fn(),
    onScenarioChange: vi.fn(),
    fixtures,
    latestFixtureIngest: null,
    latestAnalysisJob: null,
    onIngestFixture: vi.fn(),
    onAnalyzeUpload: vi.fn(),
    onRefreshAnalysisJob: vi.fn(),
    ...overrides
  };
}

function renderDashboard(overrides = {}) {
  return render(
    <DashboardShell {...dashboardProps(overrides)} />
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mockWebGLSupport(supported: boolean) {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    ((contextId: string) => {
      if (
        contextId === "webgl2" ||
        contextId === "webgl" ||
        contextId === "experimental-webgl"
      ) {
        return supported ? ({} as WebGLRenderingContext) : null;
      }

      return null;
    }) as HTMLCanvasElement["getContext"]
  );
}

function mockDashboardRouteApi() {
  dashboardRouteApiMock.getIntersectionStatus.mockResolvedValue(status);
  dashboardRouteApiMock.getEvents.mockResolvedValue(events);
  dashboardRouteApiMock.recommendSignal.mockResolvedValue(recommendation);
  dashboardRouteApiMock.simulateSignal.mockResolvedValue(simulation);
  dashboardRouteApiMock.generateReport.mockResolvedValue(report);
  dashboardRouteApiMock.getFixtures.mockResolvedValue(fixtures);
  dashboardRouteApiMock.getRuntimeReadiness.mockResolvedValue(runtimeReadiness);
  dashboardRouteApiMock.getSimulationFrame.mockResolvedValue(frameSnapshot);
}

function installWorkerMock() {
  const workers: Array<{
    messages: unknown[];
    onmessage: ((event: MessageEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    postMessage: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
    emit: (message: unknown) => void;
  }> = [];

  class MockWorker {
    messages: unknown[] = [];
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    postMessage = vi.fn((message: unknown) => {
      this.messages.push(message);
    });
    terminate = vi.fn();

    constructor() {
      workers.push(this);
    }

    emit(message: unknown) {
      this.onmessage?.({ data: message } as MessageEvent);
    }
  }

  vi.stubGlobal("Worker", MockWorker as unknown as typeof Worker);

  return workers;
}

function frameEntry(
  frame: SimulationFrameSnapshot,
  receivedAtMs = 1000
): SimulationFrameBufferEntry {
  return {
    frame,
    receivedAtMs,
    networkLatencyMs: 10,
    capturedAtMs: Date.parse(frame.captured_at)
  };
}

describe("DashboardShell", () => {
  test("loads the dashboard with explicit fixture fallback when the frame route is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_R3F_SIMULATION_ENABLED", "true");
    mockWebGLSupport(true);
    mockDashboardRouteApi();
    dashboardRouteApiMock.getSimulationFrame.mockRejectedValue(
      new Error("API request failed: 404 /api/simulation/frame?scenario_id=emergency")
    );

    render(<DashboardRoute />);

    const viewport = await screen.findByTestId("r3f-simulation-viewport");

    expect(dashboardRouteApiMock.getSimulationFrame).toHaveBeenCalledWith("emergency");
    expect(screen.queryByText("Dashboard API unavailable")).toBeNull();
    expect(viewport.getAttribute("data-r3f-snapshot-source")).toBe("simulation_snapshot_fixture");
    expect(viewport.getAttribute("data-r3f-frame-bound")).toBeNull();
    expect(viewport.getAttribute("data-r3f-traffic-density-mode")).toBe("fixture_queues");
  });

  test("polls live frames at the authoritative dashboard rate and stops on unmount", async () => {
    vi.stubEnv("NEXT_PUBLIC_R3F_SIMULATION_ENABLED", "true");
    mockWebGLSupport(true);
    mockDashboardRouteApi();
    dashboardRouteApiMock.getSimulationFrame
      .mockResolvedValueOnce(frameSnapshot)
      .mockResolvedValueOnce({
        ...frameSnapshot,
        sim_time_seconds: frameSnapshot.sim_time_seconds + 0.1,
        captured_at: "2026-06-16T00:00:00.100Z"
      });

    const { unmount } = render(<DashboardRoute />);

    await screen.findByTestId("r3f-simulation-viewport");
    expect(dashboardRouteApiMock.getSimulationFrame).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(dashboardRouteApiMock.getSimulationFrame).toHaveBeenCalledTimes(2);
    });

    expect(dashboardRouteApiMock.getSimulationFrame.mock.calls[1][0]).toBe("emergency");

    unmount();
    await sleep(250);

    expect(dashboardRouteApiMock.getSimulationFrame).toHaveBeenCalledTimes(2);
  });

  test("does not keep polling when the simulation frame route is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_R3F_SIMULATION_ENABLED", "true");
    mockWebGLSupport(true);
    mockDashboardRouteApi();
    dashboardRouteApiMock.getSimulationFrame.mockRejectedValue(
      new Error("API request failed: 404 /api/simulation/frame?scenario_id=emergency")
    );

    render(<DashboardRoute />);

    await screen.findByTestId("r3f-simulation-viewport");
    expect(dashboardRouteApiMock.getSimulationFrame).toHaveBeenCalledTimes(1);

    await sleep(250);

    expect(dashboardRouteApiMock.getSimulationFrame).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Dashboard API unavailable")).toBeNull();
  });

  test("ignores late worker-buffered frames from the previous scenario after a scenario switch", async () => {
    vi.stubEnv("NEXT_PUBLIC_R3F_SIMULATION_ENABLED", "true");
    mockWebGLSupport(true);
    const workers = installWorkerMock();
    const pedestrianFrame: SimulationFrameSnapshot = {
      ...frameSnapshot,
      scenario_id: "pedestrian",
      sim_time_seconds: 84,
      captured_at: "2026-06-16T00:00:01.000Z",
      vehicles: [
        {
          ...frameSnapshot.vehicles[0],
          id: "pedestrian-live-1",
          x_meters: -12
        }
      ]
    };

    mockDashboardRouteApi();
    dashboardRouteApiMock.getSimulationFrame.mockImplementation(
      async (scenarioId: ScenarioId) =>
        scenarioId === "pedestrian" ? pedestrianFrame : frameSnapshot
    );

    render(<DashboardRoute />);

    const viewport = await screen.findByTestId("r3f-simulation-viewport");
    expect(viewport.getAttribute("data-r3f-scenario-id")).toBe("emergency");

    await userEvent.click(screen.getByRole("button", { name: /보행자/ }));

    await waitFor(() => {
      expect(viewport.getAttribute("data-r3f-scenario-id")).toBe("pedestrian");
    });

    workers[0]?.emit({
      type: "simulation-frame-buffer",
      frames: [frameEntry(frameSnapshot, 2000)]
    });
    await sleep(50);

    expect(viewport.getAttribute("data-r3f-scenario-id")).toBe("pedestrian");
    expect(viewport.getAttribute("data-r3f-frame-bound")).toBe("true");
  });

  test("surfaces non-route simulation frame load errors", async () => {
    mockDashboardRouteApi();
    dashboardRouteApiMock.getSimulationFrame.mockRejectedValue(
      new Error("API request failed: 500 /api/simulation/frame?scenario_id=emergency")
    );

    render(<DashboardRoute />);

    expect(await screen.findByText("Dashboard API unavailable")).toBeTruthy();
    expect(dashboardRouteApiMock.getSimulationFrame).toHaveBeenCalledWith("emergency");
    expect(screen.getByText("API request failed: 500 /api/simulation/frame?scenario_id=emergency")).toBeTruthy();
  });

  test("renders the B plus A spatial command cockpit structure", () => {
    const { container } = renderDashboard({ selectedScenarioId: "emergency" });

    expect(container.querySelector('[data-theme="launch-cinematic"]')).toBeTruthy();
    expect(container.querySelector('[data-layout="spatial-command-hybrid"]')).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 1, name: "스마트 교차로 운영 시스템" })
    ).toBeTruthy();
    expect(screen.getByLabelText("Scenario Rail")).toBeTruthy();
    expect(screen.getByText("Incident Brief Spine")).toBeTruthy();
    expect(screen.getByLabelText("Spatial command surface")).toBeTruthy();
    expect(screen.getByText("Response Plan")).toBeTruthy();
    expect(screen.getAllByText("긴급차량 우선 통과").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Simulation only / No real signal control")).toBeTruthy();
  });

  test("renders the selected city profile independently from the scenario", () => {
    renderDashboard({ selectedCityId: "seoul" });

    expect(screen.getByLabelText("도시 선택")).toBeTruthy();
    expect(screen.getByLabelText("도시 프로필")).toBeTruthy();
    expect(screen.getByText("강남대로 / 테헤란로")).toBeTruthy();
    expect(screen.getByText(/INT-SEO-0001/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /서울/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /뉴욕/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /파리/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /런던/ })).toBeTruthy();
  });

  test("calls city change without touching the scenario handler", async () => {
    const onCityChange = vi.fn();
    const onScenarioChange = vi.fn();

    renderDashboard({ onCityChange, onScenarioChange });

    await userEvent.click(screen.getByRole("button", { name: /뉴욕/ }));

    expect(onCityChange).toHaveBeenCalledWith("new_york");
    expect(onScenarioChange).not.toHaveBeenCalled();
  });

  test("renders the approved safety and simulation viewport copy", () => {
    renderDashboard();

    expect(screen.getAllByText("실제 신호 제어 없음").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("실사형 가상 CCTV / 디지털 트윈")).toBeTruthy();
    expect(screen.getByText("OPENAI_API_KEY 대기")).toBeTruthy();
  });

  test("lets the operator switch between AI automatic and admin manual operation modes", async () => {
    renderDashboard();

    const aiButton = screen.getByRole("button", { name: "AI 권고 자동 준비" });
    const manualButton = screen.getByRole("button", { name: "관리자 직접 검토" });

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

    await userEvent.click(screen.getByRole("button", { name: "관리자 직접 검토" }));

    expect(screen.getByText("승인 보류")).toBeTruthy();
    expect(screen.getByText("관리자 검토 필요")).toBeTruthy();
    expect(screen.getByText("감사 로그 준비")).toBeTruthy();
  });

  test("exposes natural motion hooks for the operation mode transition", async () => {
    const { container } = renderDashboard();

    const toggle = screen.getByRole("group", { name: "운영 모드" });
    const aiButton = screen.getByRole("button", { name: "AI 권고 자동 준비" });
    const manualButton = screen.getByRole("button", { name: "관리자 직접 검토" });
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

  test("marks high-frequency dashboard actions as responsive command pressable surfaces", () => {
    renderDashboard();

    for (const control of [
      screen.getByRole("button", { name: "AI 권고 자동 준비" }),
      screen.getByRole("button", { name: "관리자 직접 검토" }),
      screen.getByRole("button", { name: "추천 새로고침" }),
      screen.getByRole("button", { name: "전송" }),
      screen.getByRole("button", { name: /리포트 생성/ }),
      screen.getByRole("button", { name: "다운로드" }),
      screen.getByRole("button", { name: /긴급차량/ }),
      screen.getByRole("button", { name: "SUMO 시뮬레이션 갱신" }),
      screen.getByRole("link", { name: /알림/ }),
      screen.getByRole("link", { name: /리포트/ }),
      screen.getByRole("link", { name: /시나리오/ })
    ]) {
      expect(control.className).toContain("command-pressable");
    }
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

  test("renders the accepted B plus A spatial command dashboard structure", () => {
    const { container } = renderDashboard();

    const shell = container.querySelector(".dashboard-shell");
    expect(shell?.getAttribute("data-layout")).toBe("spatial-command-hybrid");
    expect(shell?.getAttribute("data-concept")).toBe("b-plus-a");
    expect(screen.getByLabelText("Spatial command surface")).toBeTruthy();
    expect(screen.getByLabelText("Operational detail rail")).toBeTruthy();
    expect(screen.getByLabelText("Command decision rail")).toBeTruthy();
    expect(screen.getByText("Spatial command")).toBeTruthy();
    expect(screen.getByText("Live evidence rail")).toBeTruthy();
    expect(screen.getByText("Operator action stack")).toBeTruthy();
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
    expect(screen.getByLabelText("시뮬레이션 스트림 뷰어")).toBeTruthy();
    expect(screen.getByText("실사형 가상 CCTV")).toBeTruthy();
    expect(screen.getByText("Digital twin fallback")).toBeTruthy();
    expect(screen.getByText("실사형 가상 CCTV / 디지털 트윈")).toBeTruthy();
    expect(screen.getByText("NEXT_PUBLIC_SIMULATION_STREAM_URL로 Hosted simulation stream 플레이어 연결 / legacy stream alias도 임시 호환")).toBeTruthy();
    expect(screen.getByText("주기 22s")).toBeTruthy();
    expect(screen.getByText("대기 72s -> 59s")).toBeTruthy();
    expect(screen.getByText("처리량 +13%")).toBeTruthy();
    expect(screen.getByText("긴급 통과 28s -> 18s")).toBeTruthy();
    expect(screen.getByText("파생 대기열 압력")).toBeTruthy();
    expect(screen.getByText("서 16대")).toBeTruthy();
    expect(screen.getByText("집계 지표 기반")).toBeTruthy();
  });

  test("builds R3F scene vehicles only from SimulationFrameSnapshot vehicles", () => {
    const scene = buildSceneSnapshot({
      ...frameSnapshot,
      queues: { north: 40, south: 32, east: 27, west: 45 },
      events: [
        ...frameSnapshot.events,
        {
          id: 2,
          intersection_id: "INT-0001",
          occurred_at: "2026-06-16T00:00:05.000Z",
          direction: "west",
          event_type: "queue_threshold_exceeded",
          severity: "warning",
          object_count: 45,
          ai_summary: "Westbound queue is high.",
          recommendation: "Review queue pressure.",
          status: "open",
          source: "scenario_mock"
        }
      ]
    });

    expect(scene.source).toBe("simulation_snapshot_fixture");
    expect(scene.preciseVehicleSource).toBe("simulation_frame_snapshot");
    expect(scene.vehicles).toEqual(frameSnapshot.vehicles);
    expect(scene.vehicles).not.toBe(frameSnapshot.vehicles);
    expect(scene.vehicles).toHaveLength(1);
    expect(scene.vehicles[0]?.id).toBe("east-emergency-1");
  });

  test("does not turn aggregate SimulationComparison into precise vehicle instances", () => {
    const scene = buildSceneSnapshot(simulation as unknown as SimulationFrameSnapshot);

    expect(scene.source).toBe("sumo_traci");
    expect(scene.preciseVehicleSource).toBe("none");
    expect(scene.vehicles).toEqual([]);
    expect(scene.densitySegments).toEqual([]);
    expect(scene.allowsDensityFill).toBe(false);
  });

  test("allows long-road density fill only from density segments or explicit fixture mode", () => {
    const densityScene = buildSceneSnapshot(frameSnapshot);
    const fixtureScene = buildSceneSnapshot({
      ...frameSnapshot,
      density_segments: []
    });
    const unlabeledScene = buildSceneSnapshot({
      ...frameSnapshot,
      source: "sumo_traci",
      density_segments: []
    });

    expect(densityScene.allowsDensityFill).toBe(true);
    expect(densityScene.densityFillSource).toBe("density_segments");
    expect(fixtureScene.allowsDensityFill).toBe(true);
    expect(fixtureScene.densityFillSource).toBe("fixture_mode");
    expect(unlabeledScene.allowsDensityFill).toBe(false);
    expect(unlabeledScene.densityFillSource).toBe("none");
  });

  test("rejects far-corridor density fill when segment source is not an explicit proxy", () => {
    const scene = buildSceneSnapshot({
      ...frameSnapshot,
      source: "sumo_traci",
      density_segments: [
        {
          ...frameSnapshot.density_segments[0],
          source: "sumo_traci"
        }
      ]
    } as unknown as SimulationFrameSnapshot);

    expect(scene.densitySegments).toEqual([]);
    expect(scene.allowsDensityFill).toBe(false);
    expect(scene.densityFillSource).toBe("none");
    expect(scene.trafficDensityMode).toBe("snapshot_vehicles");
  });

  test("labels fixture queue density separately from snapshot vehicles", () => {
    const fixtureScene = buildFixtureSceneSnapshot({
      queues: status.queues,
      events
    });
    const vehicleScene = buildSceneSnapshot({
      ...frameSnapshot,
      density_segments: []
    });

    expect(fixtureScene.source).toBe("simulation_snapshot_fixture");
    expect(fixtureScene.preciseVehicleSource).toBe("none");
    expect(fixtureScene.vehicles).toEqual([]);
    expect(fixtureScene.allowsDensityFill).toBe(true);
    expect(fixtureScene.trafficDensityMode).toBe("fixture_queues");
    expect(vehicleScene.preciseVehicleSource).toBe("simulation_frame_snapshot");
    expect(vehicleScene.trafficDensityMode).toBe("snapshot_vehicles");
  });

  test("plans fixture traffic density from QueueMetrics with explicit fixture labels", () => {
    const scene = buildFixtureSceneSnapshot({
      queues: status.queues,
      events
    });
    const plan = buildTrafficDensityRenderPlan(scene);

    expect(plan.mode).toBe("fixture_queues");
    expect(plan.sourceLabel).toBe("fixture");
    expect(plan.preciseVehicles).toEqual([]);
    expect(plan.farVehicles.length).toBeGreaterThan(0);
    expect(new Set(plan.farVehicles.map((vehicle) => vehicle.sourceLabel))).toEqual(
      new Set(["fixture"])
    );
  });

  test("plans snapshot vehicles without synthesizing far corridor fill for sumo_traci", () => {
    const scene = buildSceneSnapshot({
      ...frameSnapshot,
      source: "sumo_traci",
      density_segments: []
    });
    const plan = buildTrafficDensityRenderPlan(scene);

    expect(scene.preciseVehicleSource).toBe("simulation_frame_snapshot");
    expect(scene.trafficDensityMode).toBe("snapshot_vehicles");
    expect(plan.mode).toBe("snapshot_vehicles");
    expect(plan.sourceLabel).toBe("snapshot");
    expect(plan.preciseVehicles.map((vehicle) => vehicle.id)).toEqual([
      "east-emergency-1"
    ]);
    expect(plan.farVehicles).toEqual([]);
  });

  test("uses explicit backend density proxies for far-corridor fill without relabeling as sumo_traci", () => {
    const scene = buildSceneSnapshot({
      ...frameSnapshot,
      source: "sumo_traci",
      vehicles: [],
      density_segments: [
        {
          ...frameSnapshot.density_segments[0],
          source: "aggregate_density_proxy"
        }
      ]
    });
    const plan = buildTrafficDensityRenderPlan(scene);

    expect(scene.trafficDensityMode).toBe("density_segments");
    expect(plan.mode).toBe("density_segments");
    expect(plan.sourceLabel).toBe("aggregate_density_proxy");
    expect(plan.preciseVehicles).toEqual([]);
    expect(plan.farVehicles.length).toBeGreaterThan(0);
    expect(plan.farVehicles.map((vehicle) => String(vehicle.sourceLabel))).not.toContain("sumo_traci");
  });

  test("does not invent far vehicles for zero-count explicit density proxies", () => {
    const scene = buildSceneSnapshot({
      ...frameSnapshot,
      source: "sumo_traci",
      vehicles: [],
      density_segments: [
        {
          ...frameSnapshot.density_segments[0],
          source: "aggregate_density_proxy",
          vehicle_count: 0
        }
      ]
    });
    const plan = buildTrafficDensityRenderPlan(scene);

    expect(scene.trafficDensityMode).toBe("density_segments");
    expect(plan.mode).toBe("density_segments");
    expect(plan.sourceLabel).toBe("aggregate_density_proxy");
    expect(plan.preciseVehicles).toEqual([]);
    expect(plan.farVehicles).toEqual([]);
  });

  test("defines Stage 3 turn arrows as arrow-shaped procedural parts", () => {
    expect(TURN_ARROW_MARKINGS).toHaveLength(4);

    TURN_ARROW_MARKINGS.forEach((arrow) => {
      const parts =
        "parts" in arrow && Array.isArray(arrow.parts) ? arrow.parts : [];
      const partKinds = new Set(parts.map((part) => part.kind));

      expect(partKinds).toEqual(new Set(["shaft", "head_left", "head_right"]));
      expect(
        parts.some((part) => part.kind.startsWith("head") && part.rotationY !== 0)
      ).toBe(true);
    });
  });

  test("invalidates demand rendering after applying the Stage 5 long-corridor camera target", () => {
    r3fCameraMock.position.set.mockClear();
    r3fCameraMock.lookAt.mockClear();
    r3fCameraMock.updateProjectionMatrix.mockClear();
    r3fInvalidateMock.mockClear();

    render(
      <SimulationScene
        sceneSnapshot={buildFixtureSceneSnapshot({
          queues: status.queues,
          events
        })}
      />
    );

    expect(r3fCameraMock.position.set).toHaveBeenCalledWith(
      ...STAGE5_CAMERA.position
    );
    expect(r3fCameraMock.near).toBe(STAGE5_CAMERA.near);
    expect(r3fCameraMock.far).toBe(STAGE5_CAMERA.far);
    expect(r3fCameraMock.fov).toBe(STAGE5_CAMERA.fov);
    expect(r3fCameraMock.lookAt).toHaveBeenCalledWith(...STAGE5_CAMERA.target);
    expect(r3fCameraMock.updateProjectionMatrix).toHaveBeenCalled();
    expect(r3fInvalidateMock).toHaveBeenCalledTimes(1);
  });

  test("keeps dashboard aggregate telemetry renderable when frame snapshots are unavailable", () => {
    const emptyScene = buildSceneSnapshot(null);
    renderDashboard();

    expect(emptyScene.vehicles).toEqual([]);
    expect(emptyScene.allowsDensityFill).toBe(false);
    expect(screen.getByLabelText("SUMO 집계 텔레메트리")).toBeTruthy();
    expect(screen.getByText("대기 72s -> 59s")).toBeTruthy();
    expect(screen.getByText("집계 지표 기반")).toBeTruthy();
  });

  test("defines the Stage 4 R3F asset manifest contract", () => {
    const assets = listR3FAssetEntries();
    const assetIds = new Set(assets.map((asset) => asset.id));

    expect(assetIds).toEqual(new Set(stage4RequiredAssetIds));

    for (const assetId of stage4RequiredAssetIds) {
      const asset = getR3FAssetEntry(assetId);

      expect(asset.id).toBe(assetId);
      expect(asset.path).toMatch(/^\/simulation\/r3f\/assets\/(glb|textures)\//);
      expect(asset.units).toBe("meters");
      expect(asset.source.length).toBeGreaterThan(0);
      expect(asset.license.length).toBeGreaterThan(0);
      expect(typeof asset.pbr).toBe("boolean");
      expect(asset.maxTextureSize).toBeGreaterThan(0);
      expect(asset.maxTriangles).toBeGreaterThanOrEqual(0);
      expect(asset.maxFileSizeBytes).toBeGreaterThan(0);
      expect(`${asset.id} ${asset.path}`).not.toMatch(
        /placeholder|proxy|blockout|temp|test-asset/i
      );
    }

    expect(getR3FAssetEntry("vehicles/passenger_car_near").lowerDetailId).toBe(
      "vehicles/passenger_car_medium"
    );
    expect(getR3FAssetEntry("vehicles/passenger_car_medium").lowerDetailId).toBe(
      "vehicles/passenger_car_far"
    );
    expect(getR3FAssetEntry("vehicles/taxi_near").lowerDetailId).toBe(
      "vehicles/taxi_far"
    );
    expect(getR3FAssetEntry("vehicles/bus_near").lowerDetailId).toBe(
      "vehicles/bus_far"
    );
    expect(getR3FAssetEntry("vehicles/truck_near").lowerDetailId).toBe(
      "vehicles/truck_far"
    );
    expect(
      getR3FAssetEntry("vehicles/emergency_ambulance_near").lowerDetailId
    ).toBe("vehicles/emergency_ambulance_medium");

    const nearOrHeroAssets = assets.filter((asset) =>
      ["near", "hero"].includes(asset.lod)
    );

    expect(nearOrHeroAssets.length).toBeGreaterThan(0);
    expect(nearOrHeroAssets.every((asset) => asset.pbr)).toBe(true);
  });

  test("defines the Stage 5 runtime material texture contract", () => {
    expect(STAGE5_TEXTURE_PATHS.wetAsphaltAlbedo).toBe(
      "/simulation/r3f/assets/textures/wet_asphalt_albedo.webp"
    );
    expect(STAGE5_TEXTURE_PATHS.wetAsphaltRoughness).toBe(
      "/simulation/r3f/assets/textures/wet_asphalt_roughness.webp"
    );
    expect(STAGE5_TEXTURE_PATHS.wornLaneMarkings).toBe(
      "/simulation/r3f/assets/textures/worn_lane_markings.png"
    );
    expect(STAGE5_TEXTURE_PATHS.crosswalkWear).toBe(
      "/simulation/r3f/assets/textures/crosswalk_wear.png"
    );
    expect(STAGE5_TEXTURE_PATHS.sidewalkPaverVariation).toBe(
      "/simulation/r3f/assets/textures/sidewalk_paver_variation.webp"
    );
    expect(STAGE5_TEXTURE_PATHS.facadeWindowEmissive).toBe(
      "/simulation/r3f/assets/textures/facade_window_emissive.webp"
    );
  });

  test("plans at least 80 fixture-density vehicles for the Stage 5 long-corridor view", () => {
    const scene = buildFixtureSceneSnapshot({
      queues: status.queues,
      events
    });
    const plan = buildTrafficDensityRenderPlan(scene);

    expect(STAGE5_MIN_VISIBLE_VEHICLES).toBe(80);
    expect(plan.mode).toBe("fixture_queues");
    expect(plan.preciseVehicles).toEqual([]);
    expect(plan.farVehicles.length).toBeGreaterThanOrEqual(STAGE5_MIN_VISIBLE_VEHICLES);
    expect(new Set(plan.farVehicles.map((vehicle) => vehicle.sourceLabel))).toEqual(
      new Set(["fixture"])
    );
  });

  test("keeps Stage 5 fixture traffic legible from an oblique camera", () => {
    const scene = buildFixtureSceneSnapshot({
      queues: status.queues,
      events
    });
    const plan = buildTrafficDensityRenderPlan(scene);
    const colorLuminance = (hexColor: string) => {
      const red = Number.parseInt(hexColor.slice(1, 3), 16);
      const green = Number.parseInt(hexColor.slice(3, 5), 16);
      const blue = Number.parseInt(hexColor.slice(5, 7), 16);

      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };

    expect(STAGE5_CAMERA.position[1]).toBeLessThan(STAGE5_CAMERA.position[2]);
    expect(plan.farVehicles.every((vehicle) => vehicle.size[0] >= 2.3)).toBe(true);
    expect(plan.farVehicles.every((vehicle) => vehicle.size[1] >= 1.05)).toBe(true);
    expect(
      Math.min(...plan.farVehicles.map((vehicle) => colorLuminance(vehicle.color)))
    ).toBeGreaterThan(72);
  });

  test("uses non-box geometry for visible Stage 5 vehicle silhouettes", () => {
    const visiblePartNames = STAGE5_TRAFFIC_VEHICLE_SILHOUETTE_PARTS.filter(
      (part) => part.visible
    ).map((part) => part.name);
    const visibleGeometryTypes = STAGE5_TRAFFIC_VEHICLE_SILHOUETTE_PARTS.filter(
      (part) => part.visible
    ).map((part) => part.geometry);

    expect(visiblePartNames).toEqual([
      "body",
      "cabin",
      "windshield",
      "rearGlass",
      "sideGlass",
      "roofHighlight",
      "frontGrille",
      "tailPanel",
      "wheelArch",
      "wheel",
      "headlight",
      "taillight",
      "headlightGlow",
      "taillightGlow"
    ]);
    expect(visibleGeometryTypes).not.toContain("boxGeometry");
    expect(visibleGeometryTypes).toContain("extrudeGeometry");
    expect(visibleGeometryTypes).toContain("cylinderGeometry");
    expect(visibleGeometryTypes).toContain("sphereGeometry");
    expect(visibleGeometryTypes).toContain("planeGeometry");
    expect(visibleGeometryTypes).toContain("torusGeometry");
  });

  test("uses Stage 4.1 GLB assets and facade panels for Stage 5 foreground realism", () => {
    expect(STAGE5_HERO_GLB_ASSET_IDS).toEqual([
      "vehicles/bus_near",
      "vehicles/emergency_ambulance_medium",
      "vehicles/passenger_car_near",
      "vehicles/taxi_near",
      "vehicles/truck_near"
    ]);
    expect(STAGE5_VISIBLE_TRAFFIC_GLB_ASSET_IDS).toEqual([
      "vehicles/bus_near",
      "vehicles/emergency_ambulance_medium",
      "vehicles/passenger_car_near",
      "vehicles/taxi_near",
      "vehicles/truck_near"
    ]);
    expect(STAGE5_HERO_VEHICLE_PLACEMENTS).toHaveLength(5);
    expect(STAGE5_VISIBLE_TRAFFIC_GLB_PLACEMENTS).toEqual(
      STAGE5_HERO_VEHICLE_PLACEMENTS
    );
    expect(STAGE5_STREET_FURNITURE_GLB_ASSET_IDS).toEqual([
      "props/streetlight",
      "props/tree_cluster",
      "props/curb_details"
    ]);
    expect(STAGE5_STREET_FURNITURE_PLACEMENTS).toHaveLength(6);
    expect(STAGE5_STREET_FURNITURE_CONTACT_SHADOW_PLACEMENTS).toHaveLength(6);
    expect(
      new Set(
        STAGE5_STREET_FURNITURE_CONTACT_SHADOW_PLACEMENTS.map(
          (shadow) => shadow.sourcePlacementId
        )
      )
    ).toEqual(new Set(STAGE5_STREET_FURNITURE_PLACEMENTS.map((light) => light.id)));
    expect(STAGE5_FACADE_PANELS).toHaveLength(STAGE6E_CITY_EDGE_BLOCKS.length);
    expect(STAGE5_FACADE_PANELS.length).toBeGreaterThan(8);
    expect(new Set(STAGE5_FACADE_PANELS.map((panel) => panel.size[1])).size)
      .toBeGreaterThan(1);
    expect(
      Math.max(...STAGE5_FACADE_PANELS.map((panel) => panel.size[1]))
    ).toBeLessThanOrEqual(7.2);

    STAGE5_VISIBLE_TRAFFIC_GLB_ASSET_IDS.forEach((assetId) => {
      const asset = getR3FAssetEntry(assetId);

      expect(asset.kind).toBe("vehicle");
      expect(asset.pbr).toBe(true);
      expect(asset.realisticSilhouette).toBe(true);
      expect(asset.visualRejectIfToyLike).toBe(true);
    });
    STAGE5_STREET_FURNITURE_GLB_ASSET_IDS.forEach((assetId) => {
      const asset = getR3FAssetEntry(assetId);

      expect(asset.kind).toBe("prop");
      expect(asset.pbr).toBe(true);
      expect(asset.realisticSilhouette).toBe(true);
      expect(asset.visualRejectIfToyLike).toBe(true);
    });
  });

  test("defines the Stage 6E manifest-backed runtime asset and preload contract", async () => {
    const stage5Assets = await import("./r3f/Stage5SceneAssets");
    const buildStage6EAssetRuntimePlan = (
      stage5Assets as typeof stage5Assets & {
        buildStage6EAssetRuntimePlan?: () => {
          firstPassAssetIds: string[];
          preloadAssetIds: string[];
          densityAssetIds: string[];
          byKind: Record<string, string[]>;
          byLod: Record<string, string[]>;
          byDensityEligibility: Record<string, string[]>;
          byMaxFileSizeBucket: Record<string, string[]>;
          firstPassPayloadBytes: number;
          firstPassPayloadLimitBytes: number;
        };
      }
    ).buildStage6EAssetRuntimePlan;

    expect(typeof buildStage6EAssetRuntimePlan).toBe("function");

    const runtimePlan = buildStage6EAssetRuntimePlan();
    const requiredRuntimeAssetIds = [
      "vehicles/bus_near",
      "vehicles/emergency_ambulance_medium",
      "vehicles/passenger_car_near",
      "vehicles/taxi_near",
      "vehicles/truck_near",
      "props/streetlight",
      "props/tree_cluster",
      "props/curb_details"
    ];

    expect(new Set(runtimePlan.firstPassAssetIds)).toEqual(
      new Set(requiredRuntimeAssetIds)
    );
    expect(new Set(runtimePlan.preloadAssetIds)).toEqual(
      new Set([
        ...requiredRuntimeAssetIds,
        "vehicles/passenger_car_far",
        "vehicles/taxi_far",
        "vehicles/bus_far",
        "vehicles/truck_far",
        "vehicles/emergency_ambulance_medium"
      ])
    );
    expect(runtimePlan.byKind.vehicle).toEqual(
      expect.arrayContaining([
        "vehicles/bus_near",
        "vehicles/emergency_ambulance_medium",
        "vehicles/passenger_car_near",
        "vehicles/taxi_near",
        "vehicles/truck_near"
      ])
    );
    expect(runtimePlan.byKind.prop).toEqual(
      expect.arrayContaining([
        "props/streetlight",
        "props/tree_cluster",
        "props/curb_details"
      ])
    );
    expect(runtimePlan.byLod.near).toEqual(
      expect.arrayContaining([
        "vehicles/bus_near",
        "vehicles/passenger_car_near",
        "vehicles/taxi_near",
        "vehicles/truck_near"
      ])
    );
    expect(runtimePlan.byLod.medium).toEqual(
      expect.arrayContaining(["vehicles/emergency_ambulance_medium"])
    );
    expect(runtimePlan.densityAssetIds).toEqual(
      expect.arrayContaining([
        "vehicles/passenger_car_far",
        "vehicles/taxi_far",
        "vehicles/bus_far",
        "vehicles/truck_far",
        "vehicles/emergency_ambulance_medium"
      ])
    );
    expect(runtimePlan.byDensityEligibility.eligible).toEqual(
      runtimePlan.densityAssetIds
    );
    expect(runtimePlan.byMaxFileSizeBucket.firstPassUnder1Mb).toEqual(
      expect.arrayContaining([
        "vehicles/emergency_ambulance_medium",
        "props/streetlight",
        "props/tree_cluster",
        "props/curb_details"
      ])
    );
    expect(runtimePlan.byMaxFileSizeBucket.firstPassUnder2Mb).toEqual(
      expect.arrayContaining([
        "vehicles/bus_near",
        "vehicles/passenger_car_near",
        "vehicles/taxi_near",
        "vehicles/truck_near"
      ])
    );
    expect(runtimePlan.firstPassPayloadBytes).toBeLessThanOrEqual(
      runtimePlan.firstPassPayloadLimitBytes
    );

    runtimePlan.firstPassAssetIds.forEach((assetId) => {
      const asset = getR3FAssetEntry(assetId);

      expect(asset.path).toMatch(/^\/simulation\/r3f\/assets\/glb\//);
      expect(asset.details?.provenance).toMatch(/project-authored/i);
    });
  });

  test("plans Stage 6E first-pass GLBs as instanced silhouette families", async () => {
    const stage5Assets = await import("./r3f/Stage5SceneAssets");
    const buildStage6EFirstPassInstancingPlan = (
      stage5Assets as typeof stage5Assets & {
        buildStage6EFirstPassInstancingPlan?: () => {
          assetGroups: Array<{
            assetId: string;
            placementCount: number;
            placementIds: string[];
            renderMode: string;
          }>;
          clonePlacements?: unknown[];
          drawCallUpperBound: number;
        };
      }
    ).buildStage6EFirstPassInstancingPlan;

    expect(typeof buildStage6EFirstPassInstancingPlan).toBe("function");

    const instancingPlan = buildStage6EFirstPassInstancingPlan();
    const expectedAssetIds = [
      ...STAGE5_VISIBLE_TRAFFIC_GLB_ASSET_IDS,
      ...STAGE5_STREET_FURNITURE_GLB_ASSET_IDS
    ];
    const expectedPlacementCount =
      STAGE5_VISIBLE_TRAFFIC_GLB_PLACEMENTS.length +
      STAGE5_STREET_FURNITURE_PLACEMENTS.length;

    expect(instancingPlan.assetGroups.map((group) => group.assetId)).toEqual(
      expectedAssetIds
    );
    expect(instancingPlan.clonePlacements ?? []).toHaveLength(0);
    expect(
      instancingPlan.assetGroups.reduce(
        (total, group) => total + group.placementCount,
        0
      )
    ).toBe(expectedPlacementCount);
    expect(instancingPlan.drawCallUpperBound).toBe(
      STAGE5_VISIBLE_TRAFFIC_GLB_ASSET_IDS.length +
        STAGE5_STREET_FURNITURE_GLB_ASSET_IDS.length +
        1
    );
    instancingPlan.assetGroups.forEach((group) => {
      const expectedCount =
        STAGE5_VISIBLE_TRAFFIC_GLB_PLACEMENTS.filter(
          (placement) => placement.assetId === group.assetId
        ).length +
        STAGE5_STREET_FURNITURE_PLACEMENTS.filter(
          (placement) => placement.assetId === group.assetId
        ).length;

      expect(group.renderMode).toBe("instanced_silhouette");
      expect(group.placementCount).toBe(expectedCount);
      expect(group.placementIds).toHaveLength(expectedCount);
    });
  });

  test("assigns manifest far-LOD GLBs to repeated density vehicles without changing truth labels", () => {
    const scene = buildFixtureSceneSnapshot({
      queues: status.queues,
      events
    });
    const plan = buildTrafficDensityRenderPlan(scene);
    const densityAssetIds = plan.farVehicles.map(
      (vehicle) => (vehicle as typeof vehicle & { assetId?: string }).assetId
    );

    expect(plan.mode).toBe("fixture_queues");
    expect(new Set(plan.farVehicles.map((vehicle) => vehicle.sourceLabel))).toEqual(
      new Set(["fixture"])
    );
    expect(densityAssetIds.every(Boolean)).toBe(true);
    expect(densityAssetIds).toEqual(
      expect.arrayContaining([
        "vehicles/passenger_car_far",
        "vehicles/taxi_far",
        "vehicles/bus_far",
        "vehicles/truck_far"
      ])
    );

    densityAssetIds.forEach((assetId) => {
      const asset = getR3FAssetEntry(assetId ?? "");

      expect(asset.kind).toBe("vehicle");
      expect(asset.lod).toBe("far");
      expect(asset.densityEligible).toBe(true);
    });
  });

  test("groups all repeated density GLBs into manifest-backed instanced families", async () => {
    const trafficDensity = await import("./r3f/TrafficDensityLayer");
    const buildStage6EDensityRenderPlan = (
      trafficDensity as typeof trafficDensity & {
        buildStage6EDensityRenderPlan?: (vehicles: Array<{
          id: string;
          assetId: string;
          sourceLabel: string;
        }>) => {
          instancedAssetGroups: Array<{
            assetId: string;
            instanceCount: number;
            vehicles: Array<{ id: string; assetId: string; sourceLabel: string }>;
          }>;
          proceduralVehicles: Array<{ assetId: string; sourceLabel: string }>;
          totalInstancedVehicleCount: number;
          glbVehicles?: unknown[];
          maxGlbVehicles?: number;
        };
      }
    ).buildStage6EDensityRenderPlan;
    const scene = buildFixtureSceneSnapshot({
      queues: status.queues,
      events
    });
    const plan = buildTrafficDensityRenderPlan(scene);

    expect(typeof buildStage6EDensityRenderPlan).toBe("function");

    const densityRenderPlan = buildStage6EDensityRenderPlan(plan.farVehicles);
    const instancedAssetIds = densityRenderPlan.instancedAssetGroups.map(
      (group) => group.assetId
    );

    expect(densityRenderPlan.glbVehicles ?? []).toHaveLength(0);
    expect(densityRenderPlan.maxGlbVehicles).toBeUndefined();
    expect(densityRenderPlan.proceduralVehicles).toHaveLength(0);
    expect(densityRenderPlan.totalInstancedVehicleCount).toBe(
      plan.farVehicles.length
    );
    expect(
      densityRenderPlan.instancedAssetGroups.reduce(
        (total, group) => total + group.instanceCount,
        0
      )
    ).toBe(plan.farVehicles.length);
    expect(instancedAssetIds).toEqual([
      "vehicles/passenger_car_far",
      "vehicles/taxi_far",
      "vehicles/bus_far",
      "vehicles/truck_far"
    ]);

    densityRenderPlan.instancedAssetGroups.forEach((group) => {
      expect(group.vehicles).toHaveLength(group.instanceCount);
      expect(group.vehicles.every((vehicle) => vehicle.assetId === group.assetId)).toBe(
        true
      );
      expect(group.vehicles.every((vehicle) => vehicle.sourceLabel === "fixture")).toBe(
        true
      );
    });
  });

  test("collapses mixed-material density GLB geometry into one asset silhouette", async () => {
    const {
      BoxGeometry,
      BufferGeometry,
      Float32BufferAttribute,
      Group,
      Mesh,
      MeshBasicMaterial
    } = await import("three");
    const trafficDensity = await import("./r3f/TrafficDensityLayer");
    const buildStage6EInstancedGeometryGroups = (
      trafficDensity as typeof trafficDensity & {
        buildStage6EInstancedGeometryGroups?: (
          assetId: string,
          scene: InstanceType<typeof Group>
        ) => Array<{ geometry: InstanceType<typeof BufferGeometry> }>;
      }
    ).buildStage6EInstancedGeometryGroups;
    const bodyMaterial = new MeshBasicMaterial({ color: "#94a3b8" });
    const glassMaterial = new MeshBasicMaterial({ color: "#38bdf8" });
    const nonIndexedTriangle = new BufferGeometry();

    nonIndexedTriangle.setAttribute(
      "position",
      new Float32BufferAttribute(
        [-0.5, 0, 0, 0.5, 0, 0, 0, 0.75, 0],
        3
      )
    );
    nonIndexedTriangle.setAttribute(
      "normal",
      new Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3)
    );
    nonIndexedTriangle.setAttribute(
      "uv",
      new Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)
    );

    const scene = new Group();

    scene.add(new Mesh(new BoxGeometry(1, 1, 1), bodyMaterial));
    scene.add(new Mesh(nonIndexedTriangle, glassMaterial));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(typeof buildStage6EInstancedGeometryGroups).toBe("function");

    const geometryGroups = buildStage6EInstancedGeometryGroups(
      "vehicles/passenger_car_far",
      scene
    );

    expect(errorSpy).not.toHaveBeenCalled();
    expect(geometryGroups).toHaveLength(1);
    expect(geometryGroups[0].geometry.index).toBeNull();
  });

  test("mounts frame-backed browser-only R3F when it is enabled and WebGL is supported", async () => {
    vi.stubEnv("NEXT_PUBLIC_R3F_SIMULATION_ENABLED", "true");
    mockWebGLSupport(true);

    renderDashboard();

    const viewport = await screen.findByTestId("r3f-simulation-viewport");

    expect(viewport).toBeTruthy();
    expect(screen.getByTestId("r3f-canvas")).toBeTruthy();
    expect(screen.getByText("R3F digital twin")).toBeTruthy();
    expect(screen.queryByText("Digital twin fallback")).toBeNull();
    expect(screen.getByText("Simulation only / No real signal control")).toBeTruthy();
    expect(viewport.getAttribute("data-r3f-simulation-ready")).toBe("true");
    expect(viewport.getAttribute("data-r3f-renderer-mode")).toBe(STAGE5_RENDERER_MODE);
    expect(viewport.getAttribute("data-r3f-photoreal-stage")).toBe("5");
    expect(viewport.getAttribute("data-r3f-snapshot-source")).toBe("simulation_snapshot_fixture");
    expect(viewport.getAttribute("data-r3f-frame-bound")).toBe("true");
    expect(viewport.getAttribute("data-r3f-traffic-density-mode")).toBe("density_segments");
    expect(viewport.getAttribute("data-r3f-signal-state")).toBe("east:green,north:red");
    expect(viewport.getAttribute("data-r3f-scenario-id")).toBe("emergency");
    expect(viewport.getAttribute("data-r3f-queue-source")).toBe("frame");
    expect(screen.getByTestId("r3f-simulation-overlays")).toBeTruthy();
    expect(screen.getByTestId("r3f-signal-state-badge").textContent).toContain(
      "east:green,north:red"
    );
    expect(screen.getByTestId("r3f-queue-source-badge").textContent).toContain("frame");
    expect(screen.getByTestId("r3f-scenario-id-badge").textContent).toContain("emergency");
    expect(
      Number(viewport.getAttribute("data-r3f-visible-vehicle-count"))
    ).toBeGreaterThan(0);
    expect(viewport.getAttribute("data-r3f-glb-vehicle-count")).toBe("5");
    expect(viewport.getAttribute("data-r3f-street-shadow-count")).toBe("6");
    expect(viewport.getAttribute("data-r3f-vehicle-silhouette-part-count")).toBe("14");
  });

  test("exposes stale live-frame telemetry without hiding safety overlays", async () => {
    vi.stubEnv("NEXT_PUBLIC_R3F_SIMULATION_ENABLED", "true");
    mockWebGLSupport(true);
    vi.spyOn(performance, "now").mockReturnValue(2500);

    renderDashboard({
      simulationFrame: {
        ...frameSnapshot,
        source: "sumo_last_good"
      },
      simulationFrameEntries: [
        {
          frame: {
            ...frameSnapshot,
            source: "sumo_last_good"
          },
          receivedAtMs: 1000,
          networkLatencyMs: 22,
          capturedAtMs: Date.parse(frameSnapshot.captured_at)
        }
      ]
    });

    const viewport = await screen.findByTestId("r3f-simulation-viewport");

    await waitFor(() => {
      expect(viewport.getAttribute("data-r3f-frame-age-ms")).toBe("1500");
    });
    expect(viewport.getAttribute("data-r3f-network-latency-ms")).toBe("22");
    expect(viewport.getAttribute("data-r3f-authoritative-hz")).toBe("10");
    expect(viewport.getAttribute("data-r3f-frame-stale")).toBe("true");
    expect(screen.getByTestId("r3f-frame-stale-badge").textContent).toContain(
      "degraded"
    );
    expect(screen.getByText("Simulation only / No real signal control")).toBeTruthy();
  });

  test("uses explicit fixture queue fallback when the simulation frame is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_R3F_SIMULATION_ENABLED", "true");
    mockWebGLSupport(true);

    renderDashboard({ simulationFrame: null });

    const viewport = await screen.findByTestId("r3f-simulation-viewport");

    expect(viewport.getAttribute("data-r3f-snapshot-source")).toBe("simulation_snapshot_fixture");
    expect(viewport.getAttribute("data-r3f-frame-bound")).toBeNull();
    expect(viewport.getAttribute("data-r3f-traffic-density-mode")).toBe("fixture_queues");
    expect(viewport.getAttribute("data-r3f-signal-state")).toBe("unavailable");
    expect(viewport.getAttribute("data-r3f-queue-source")).toBe("fixture_fallback");
    expect(screen.getByTestId("r3f-signal-state-badge").textContent).toContain("unavailable");
    expect(
      Number(viewport.getAttribute("data-r3f-visible-vehicle-count"))
    ).toBeGreaterThanOrEqual(STAGE5_MIN_VISIBLE_VEHICLES);
  });

  test("marks empty frame signals as unavailable instead of inventing signal states", async () => {
    vi.stubEnv("NEXT_PUBLIC_R3F_SIMULATION_ENABLED", "true");
    mockWebGLSupport(true);

    renderDashboard({
      simulationFrame: {
        ...frameSnapshot,
        signals: [],
        density_segments: []
      }
    });

    const viewport = await screen.findByTestId("r3f-simulation-viewport");

    expect(viewport.getAttribute("data-r3f-frame-bound")).toBe("true");
    expect(viewport.getAttribute("data-r3f-signal-state")).toBe("unavailable");
    expect(viewport.getAttribute("data-r3f-queue-source")).toBe("frame");
    expect(screen.getByTestId("r3f-signal-state-badge").textContent).toContain("unavailable");
  });

  test("marks queue source as density segment when frame queues are not valid", async () => {
    vi.stubEnv("NEXT_PUBLIC_R3F_SIMULATION_ENABLED", "true");
    mockWebGLSupport(true);

    renderDashboard({
      simulationFrame: {
        ...frameSnapshot,
        queues: null
      } as unknown as SimulationFrameSnapshot
    });

    const viewport = await screen.findByTestId("r3f-simulation-viewport");

    expect(viewport.getAttribute("data-r3f-frame-bound")).toBe("true");
    expect(viewport.getAttribute("data-r3f-traffic-density-mode")).toBe("density_segments");
    expect(viewport.getAttribute("data-r3f-queue-source")).toBe("density_segment");
    expect(screen.getByTestId("r3f-queue-source-badge").textContent).toContain(
      "density_segment"
    );
  });

  test("exposes Stage 3 corridor lengths in meters outside the canvas", async () => {
    vi.stubEnv("NEXT_PUBLIC_R3F_SIMULATION_ENABLED", "true");
    mockWebGLSupport(true);

    renderDashboard();

    const viewport = await screen.findByTestId("r3f-simulation-viewport");
    const lengthAttr = viewport.getAttribute("data-r3f-corridor-length-meters");

    expect(lengthAttr).toBeTruthy();
    expect(lengthAttr).toContain("north:140");
    expect(lengthAttr).toContain("south:120");
    expect(lengthAttr).toContain("east:140");
    expect(lengthAttr).toContain("west:140");
  });

  test("keeps the fallback viewport when R3F is disabled", () => {
    mockWebGLSupport(true);

    renderDashboard();

    expect(screen.getByText("Digital twin fallback")).toBeTruthy();
    expect(screen.getByText("실사형 가상 CCTV / 디지털 트윈")).toBeTruthy();
    expect(screen.queryByTestId("r3f-simulation-viewport")).toBeNull();
    expect(screen.getByText("Simulation only / No real signal control")).toBeTruthy();
  });

  test("keeps the fallback viewport when R3F is enabled but WebGL is unavailable", () => {
    vi.stubEnv("NEXT_PUBLIC_R3F_SIMULATION_ENABLED", "true");
    mockWebGLSupport(false);

    renderDashboard();

    expect(screen.getByText("Digital twin fallback")).toBeTruthy();
    expect(screen.getByText("실사형 가상 CCTV / 디지털 트윈")).toBeTruthy();
    expect(screen.queryByTestId("r3f-simulation-viewport")).toBeNull();
    expect(screen.getByText("Simulation only / No real signal control")).toBeTruthy();
  });

  test("mounts the hosted simulation stream URL before the legacy alias", () => {
    vi.stubEnv("NEXT_PUBLIC_R3F_SIMULATION_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_SIMULATION_STREAM_URL", "https://pixel.example/stream");
    vi.stubEnv("NEXT_PUBLIC_UNITY_WEBGL_URL", "/unity/index.html");
    mockWebGLSupport(true);

    const { container } = renderDashboard();
    const streamFrame = container.querySelector("iframe.simulation-stream-frame");

    expect(streamFrame?.getAttribute("src")).toBe("https://pixel.example/stream");
    expect(streamFrame?.getAttribute("title")).toBe("시뮬레이션 스트림");
    expect(screen.getByText("Hosted simulation stream")).toBeTruthy();
    expect(screen.queryByTestId("r3f-simulation-viewport")).toBeNull();
  });

  test("mounts the local hosted simulation iframe before the legacy alias", () => {
    vi.stubEnv("NEXT_PUBLIC_R3F_SIMULATION_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_SIMULATION_STREAM_URL", "http://127.0.0.1");
    vi.stubEnv("NEXT_PUBLIC_UNITY_WEBGL_URL", "/unity/index.html");
    mockWebGLSupport(true);

    const { container } = renderDashboard();
    const streamFrame = container.querySelector("iframe.simulation-stream-frame");

    expect(streamFrame?.getAttribute("src")).toBe("http://127.0.0.1");
    expect(streamFrame?.className).toContain("simulation-stream-frame");
    expect(streamFrame?.className).toContain("hosted-simulation-stream-frame");
    expect(streamFrame?.getAttribute("allow")).toContain("fullscreen");
    expect(screen.getByText("Hosted simulation stream")).toBeTruthy();
    expect(screen.queryByText("Legacy stream alias")).toBeNull();
    expect(screen.queryByTestId("r3f-simulation-viewport")).toBeNull();
    expect(screen.getByText("Simulation only / No real signal control")).toBeTruthy();
    expect(screen.getByText("SUMO/TraCI Renderer")).toBeTruthy();
  });

  test("keeps NEXT_PUBLIC_UNITY_WEBGL_URL as a legacy stream fallback alias", () => {
    vi.stubEnv("NEXT_PUBLIC_R3F_SIMULATION_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_UNITY_WEBGL_URL", "/unity/index.html");
    mockWebGLSupport(true);

    const { container } = renderDashboard();
    const streamFrame = container.querySelector("iframe.simulation-stream-frame");

    expect(streamFrame?.getAttribute("src")).toBe("/unity/index.html");
    expect(screen.getByText("Legacy stream alias")).toBeTruthy();
    expect(screen.queryByTestId("r3f-simulation-viewport")).toBeNull();
  });

  test("switches visible labels between Korean and English", async () => {
    renderDashboard();

    await userEvent.click(screen.getByRole("button", { name: "EN" }));

    expect(screen.getByText("Incident Brief Spine")).toBeTruthy();
    expect(screen.getAllByText("No real signal control").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("AI recommendation prep")).toBeTruthy();
    expect(screen.getByText("Admin review")).toBeTruthy();
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

  test("renders analysis intake fixtures and latest job status", () => {
    renderDashboard({
      latestFixtureIngest,
      latestAnalysisJob
    });

    expect(screen.getByText("Analysis Intake")).toBeTruthy();
    expect(screen.getByText("운영자가 샘플·업로드 분석을 시작하고 job 상태를 확인합니다.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /emergency-east-frame.jpg/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /blocked-intersection-clip.mp4/ })).toBeTruthy();
    expect(screen.getByText("Fixture ingested")).toBeTruthy();
    expect(screen.getByText("job-123")).toBeTruthy();
    expect(screen.getByText("completed")).toBeTruthy();
    expect(screen.getByText("Simulation-only analysis")).toBeTruthy();
  });

  test("calls fixture ingestion and job refresh handlers from analysis intake", async () => {
    const onIngestFixture = vi.fn().mockResolvedValue(latestFixtureIngest);
    const onRefreshAnalysisJob = vi.fn().mockResolvedValue(latestAnalysisJob);
    renderDashboard({
      latestAnalysisJob,
      onIngestFixture,
      onRefreshAnalysisJob
    });

    await userEvent.click(screen.getByRole("button", { name: /emergency-east-frame.jpg/ }));
    await userEvent.click(screen.getByRole("button", { name: "Job status refresh" }));

    expect(onIngestFixture).toHaveBeenCalledWith("emergency-east-frame");
    expect(onRefreshAnalysisJob).toHaveBeenCalledWith("job-123");
  });

  test("clears analysis intake status when the parent resets scenario data", async () => {
    function StatefulDashboard() {
      const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId>("emergency");
      const [fixtureIngest, setFixtureIngest] = useState<FixtureIngestResult | null>(null);
      const [analysisJob, setAnalysisJob] = useState<AnalysisJob | null>(null);

      return (
        <DashboardShell
          {...dashboardProps({
            selectedScenarioId,
            latestFixtureIngest: fixtureIngest,
            latestAnalysisJob: analysisJob,
            onIngestFixture: async () => {
              setFixtureIngest(latestFixtureIngest);
              return latestFixtureIngest;
            },
            onAnalyzeUpload: async () => {
              setAnalysisJob(latestAnalysisJob);
              return {
                job_id: latestAnalysisJob.job_id,
                analysis_status: "completed",
                job: latestAnalysisJob,
                observation: { source: latestAnalysisJob.observation_source },
                status_id: latestAnalysisJob.status_id,
                event_ids: latestAnalysisJob.event_ids
              };
            },
            onScenarioChange: (scenarioId) => {
              setSelectedScenarioId(scenarioId);
              setFixtureIngest(null);
              setAnalysisJob(null);
            }
          })}
        />
      );
    }

    render(<StatefulDashboard />);

    await userEvent.click(screen.getByRole("button", { name: /emergency-east-frame.jpg/ }));
    await userEvent.upload(
      screen.getByLabelText("파일 업로드 분석"),
      new File(["fixture"], "intersection-frame.jpg", { type: "image/jpeg" })
    );

    expect(await screen.findByText("Fixture ingested")).toBeTruthy();
    expect(await screen.findByText("job-123")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: /보행자/ }));

    expect(screen.queryByText("Fixture ingested")).toBeNull();
    expect(screen.queryByText("job-123")).toBeNull();
    expect(screen.getByText("아직 인입된 샘플이 없습니다.")).toBeTruthy();
    expect(screen.getByText("No job")).toBeTruthy();
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

  test("renders structured AI agent sections when the API provides them", async () => {
    renderDashboard({
      chat: {
        answer: "Fallback answer",
        referenced_event_ids: [1],
        sections: {
          current_situation: "현재 상황 내용",
          recommended_action: "추천 조치 내용",
          recommendation_rationale: ["근거 A", "근거 B"],
          authority_limit:
            "Recommendation and simulation only. No real traffic signal control is performed.",
          simulation_result: "시뮬레이션 결과 내용"
        }
      }
    });

    expect(screen.getAllByText("현재 상황").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("추천 조치")).toBeTruthy();
    expect(screen.getAllByText("추천 근거").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("권한 한계")).toBeTruthy();
    expect(screen.getByText("시뮬레이션 결과")).toBeTruthy();
    expect(screen.getByText("근거 A")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "EN" }));

    expect(screen.getAllByText("Current Situation").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Recommended Action").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Recommendation Rationale")).toBeTruthy();
    expect(screen.getByText("Authority Limit")).toBeTruthy();
    expect(screen.getByText("Simulation Result")).toBeTruthy();
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

    await userEvent.click(screen.getByRole("button", { name: "SUMO 시뮬레이션 갱신" }));

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
