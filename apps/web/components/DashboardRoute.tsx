"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DashboardShell } from "./DashboardShell";
import {
  analyzeUpload,
  askQuestion,
  generateReport,
  getAnalysisJob,
  getCctvFlow,
  getEvents,
  getFixtures,
  getIntersectionStatus,
  getRuntimeReadiness,
  getSimulationFrame,
  ingestFixture,
  isSimulationFrameRouteMissingError,
  recommendSignal,
  simulateSignal
} from "../lib/api";
import {
  SIMULATION_FRAME_POLL_INTERVAL_MS,
  type SimulationFrameBufferEntry,
  type SimulationFrameSnapshot
} from "../lib/simulationSnapshot";
import {
  createSimulationFrameRingBuffer,
  normalizeSimulationFrameMessage,
  type SimulationFrameWorkerInboundMessage,
  type SimulationFrameWorkerOutboundMessage
} from "../workers/simulationFrameWorker";
import type {
  AnalysisFixture,
  AnalysisJob,
  CctvFlow,
  ChatResponse,
  FixtureIngestResult,
  IntersectionStatus,
  Recommendation,
  Report,
  RuntimeReadiness,
  ScenarioId,
  SimulationComparison,
  TrafficEvent,
  UploadAnalysisResult
} from "../lib/types";
import { SCENARIO_OPTIONS } from "../lib/types";
import { CITY_PROFILES } from "../lib/cities";
import {
  DEFAULT_SCENE_PRESENTATION,
  getStage6PresentationMode,
  type ScenePresentationState
} from "./r3f/stage6Quality";

const DEFAULT_SCENARIO_ID: ScenarioId = "normal";

type DashboardData = {
  status: IntersectionStatus;
  events: TrafficEvent[];
  recommendation: Recommendation;
  simulation: SimulationComparison;
  simulationFrame: SimulationFrameSnapshot | null;
  report: Report;
  chat: ChatResponse | null;
  fixtures: AnalysisFixture[];
  runtimeReadiness: RuntimeReadiness;
  latestFixtureIngest: FixtureIngestResult | null;
  latestAnalysisJob: AnalysisJob | null;
};

type SimulationFrameLoadResult = {
  frame: SimulationFrameSnapshot | null;
  routeAvailable: boolean;
  networkLatencyMs: number | null;
};

export function DashboardRoute() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [cctvFlow, setCctvFlow] = useState<CctvFlow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] =
    useState<ScenarioId>(DEFAULT_SCENARIO_ID);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenePresentation, setScenePresentation] =
    useState<ScenePresentationState>(DEFAULT_SCENE_PRESENTATION);
  const [simulationFrameEntries, setSimulationFrameEntries] = useState<
    SimulationFrameBufferEntry[]
  >([]);
  const [simulationFrameRouteAvailable, setSimulationFrameRouteAvailable] =
    useState(true);
  const simulationFrameWorkerRef = useRef<Worker | null>(null);
  const fallbackFrameBufferRef = useRef(createSimulationFrameRingBuffer(2));
  const selectedScenarioIdRef = useRef<ScenarioId>(selectedScenarioId);
  const dashboardLoaded = data !== null;

  const handleBufferedFrames = useCallback(
    (frames: SimulationFrameBufferEntry[]) => {
      const currentScenarioId = selectedScenarioIdRef.current;
      const scopedFrames = frames.filter(
        (entry) => entry.frame.scenario_id === currentScenarioId
      );
      if (frames.length > 0 && scopedFrames.length === 0) return;

      setSimulationFrameEntries(scopedFrames);
      const latestFrame = scopedFrames[scopedFrames.length - 1]?.frame;

      if (latestFrame) {
        setData((current) =>
          current ? { ...current, simulationFrame: latestFrame } : current
        );
      }
    },
    []
  );

  const ensureSimulationFrameWorker = useCallback(() => {
    if (typeof Worker === "undefined") return null;
    if (simulationFrameWorkerRef.current) return simulationFrameWorkerRef.current;

    try {
      const worker = new Worker(
        new URL("../workers/simulationFrameWorker.ts", import.meta.url),
        { type: "module" }
      );

      worker.onmessage = (
        event: MessageEvent<SimulationFrameWorkerOutboundMessage>
      ) => {
        if (event.data.type === "simulation-frame-buffer") {
          handleBufferedFrames(event.data.frames);
        }
      };
      worker.onerror = () => {
        worker.terminate();
        simulationFrameWorkerRef.current = null;
      };
      simulationFrameWorkerRef.current = worker;

      return worker;
    } catch {
      return null;
    }
  }, [handleBufferedFrames]);

  const resetSimulationFrameBuffer = useCallback(() => {
    fallbackFrameBufferRef.current.reset();
    setSimulationFrameEntries([]);
    simulationFrameWorkerRef.current?.postMessage({ type: "reset" });
  }, []);

  const publishSimulationFrame = useCallback(
    (
      frame: SimulationFrameSnapshot,
      networkLatencyMs: number | null,
      expectedScenarioId: ScenarioId
    ) => {
      if (frame.scenario_id !== expectedScenarioId) return;

      const message: SimulationFrameWorkerInboundMessage = {
        type: "simulation-frame",
        frame,
        receivedAtMs: readNowMs(),
        networkLatencyMs: networkLatencyMs ?? 0
      };
      const worker = ensureSimulationFrameWorker();

      if (worker) {
        worker.postMessage(message);
        return;
      }

      const entry = normalizeSimulationFrameMessage(message);
      if (!entry) return;

      fallbackFrameBufferRef.current.push(entry);
      handleBufferedFrames(fallbackFrameBufferRef.current.latestTwo());
    },
    [ensureSimulationFrameWorker, handleBufferedFrames]
  );

  useEffect(() => {
    void loadDashboard(DEFAULT_SCENARIO_ID);
  }, []);

  // URL params are the INITIAL override (verify scripts drive scenarios via
  // ?r3fWeather/?r3fTimeOfDay/?viewpoint); after mount the UI toggles own the
  // state. useEffect (not useState initializer) keeps SSR hydration clean.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = getStage6PresentationMode(params);
    setScenePresentation({
      weather: mode.weather,
      timeOfDay: mode.timeOfDay,
      viewpoint: params.get("viewpoint") === "cctv" ? "cctv" : "wide"
    });
  }, []);

  // Best-effort, off the critical path: a CCTV measurement can take ~30s and may
  // have no source, so it must never block or fail the dashboard load.
  // ponytail: fetch once on mount; add polling if a live-refresh tile is needed.
  useEffect(() => {
    let cancelled = false;
    getCctvFlow()
      .then((flow) => {
        if (!cancelled) setCctvFlow(flow);
      })
      .catch(() => {
        if (!cancelled) setCctvFlow(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      simulationFrameWorkerRef.current?.terminate();
      simulationFrameWorkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    selectedScenarioIdRef.current = selectedScenarioId;
  }, [selectedScenarioId]);

  useEffect(() => {
    if (
      !dashboardLoaded ||
      !simulationFrameRouteAvailable ||
      !shouldPollSimulationFrames(selectedScenarioId)
    ) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      const result = await loadSimulationFrame(selectedScenarioId);
      if (cancelled) return;

      if (!result.routeAvailable) {
        setSimulationFrameRouteAvailable(false);
        return;
      }

      if (result.frame) {
        publishSimulationFrame(
          result.frame,
          result.networkLatencyMs,
          selectedScenarioId
        );
      }

      timer = setTimeout(poll, SIMULATION_FRAME_POLL_INTERVAL_MS);
    };

    timer = setTimeout(poll, SIMULATION_FRAME_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    dashboardLoaded,
    publishSimulationFrame,
    selectedScenarioId,
    simulationFrameRouteAvailable
  ]);

  async function loadDashboard(scenarioId: ScenarioId) {
    try {
      const [
        status,
        events,
        recommendation,
        simulation,
        report,
        fixtures,
        runtimeReadiness,
        simulationFrameResult
      ] =
        await Promise.all([
          getIntersectionStatus(scenarioId),
          getEvents(scenarioId),
          recommendSignal(scenarioId),
          simulateSignal(scenarioId),
          generateReport(scenarioId),
          getFixtures(),
          getRuntimeReadiness(),
          loadSimulationFrame(scenarioId)
        ]);

      if (scenarioId !== selectedScenarioIdRef.current) return;
      setSimulationFrameRouteAvailable(simulationFrameResult.routeAvailable);

      const scopedSimulationFrame =
        simulationFrameResult.frame?.scenario_id === scenarioId
          ? simulationFrameResult.frame
          : null;

      if (scopedSimulationFrame) {
        publishSimulationFrame(
          scopedSimulationFrame,
          simulationFrameResult.networkLatencyMs,
          scenarioId
        );
      } else {
        resetSimulationFrameBuffer();
      }

      setData({
        status,
        events,
        recommendation,
        simulation,
        simulationFrame: scopedSimulationFrame,
        report,
        chat: null,
        fixtures,
        runtimeReadiness,
        latestFixtureIngest: null,
        latestAnalysisJob: null
      });
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard");
    }
  }

  async function handleAskQuestion(question: string) {
    const chat = await askQuestion(question, selectedScenarioId);
    setData((current) => (current ? { ...current, chat } : current));
  }

  async function handleGenerateReport() {
    const report = await generateReport(selectedScenarioId);
    setData((current) => (current ? { ...current, report } : current));
  }

  async function handleRefreshRecommendation() {
    const recommendation = await recommendSignal(selectedScenarioId);
    setData((current) => (current ? { ...current, recommendation } : current));
  }

  async function handleRunSimulation() {
    const simulation = await simulateSignal(selectedScenarioId);
    setData((current) => (current ? { ...current, simulation } : current));
  }

  async function handleIngestFixture(fixtureId: string) {
    const latestFixtureIngest = await ingestFixture(fixtureId);
    setData((current) =>
      current ? { ...current, latestFixtureIngest } : current
    );
    return latestFixtureIngest;
  }

  async function handleAnalyzeUpload(file: File): Promise<UploadAnalysisResult> {
    const result = await analyzeUpload(file);
    setData((current) =>
      current ? { ...current, latestAnalysisJob: result.job } : current
    );
    return result;
  }

  async function handleRefreshAnalysisJob(jobId: string) {
    const latestAnalysisJob = await getAnalysisJob(jobId);
    setData((current) =>
      current ? { ...current, latestAnalysisJob } : current
    );
    return latestAnalysisJob;
  }

  async function handleScenarioChange(scenarioId: ScenarioId) {
    if (scenarioId === selectedScenarioId) return;

    resetSimulationFrameBuffer();
    setSimulationFrameRouteAvailable(true);
    selectedScenarioIdRef.current = scenarioId;
    setSelectedScenarioId(scenarioId);
    setScenarioLoading(true);
    try {
      await loadDashboard(scenarioId);
    } finally {
      setScenarioLoading(false);
    }
  }

  if (error) {
    const detail = formatDashboardError(error);

    return (
      <main className="loading-shell dashboard-error-shell">
        <div className="error-card">
          <span className="error-kicker">Connection check</span>
          <h1>Dashboard API unavailable</h1>
          <p>{detail}</p>
          <div className="error-actions">
            <button type="button" onClick={() => void loadDashboard(selectedScenarioId)}>
              Retry connection
            </button>
            <a href="/">Back to landing</a>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="loading-shell">
        <h1>Smart Intersection Ops</h1>
        <p>Loading dashboard...</p>
      </main>
    );
  }

  return (
    <DashboardShell
      status={data.status}
      events={data.events}
      recommendation={data.recommendation}
      simulation={data.simulation}
      simulationFrame={data.simulationFrame}
      simulationFrameEntries={simulationFrameEntries}
      report={data.report}
      chat={data.chat}
      fixtures={data.fixtures}
      runtimeReadiness={data.runtimeReadiness}
      latestFixtureIngest={data.latestFixtureIngest}
      latestAnalysisJob={data.latestAnalysisJob}
      cctvFlow={cctvFlow}
      selectedScenarioId={selectedScenarioId}
      scenarioOptions={SCENARIO_OPTIONS}
      scenarioLoading={scenarioLoading}
      cityProfile={CITY_PROFILES[0]}
      scenePresentation={scenePresentation}
      onScenePresentationChange={setScenePresentation}
      onAskQuestion={handleAskQuestion}
      onGenerateReport={handleGenerateReport}
      onIngestFixture={handleIngestFixture}
      onAnalyzeUpload={handleAnalyzeUpload}
      onRefreshAnalysisJob={handleRefreshAnalysisJob}
      onRefreshRecommendation={handleRefreshRecommendation}
      onRunSimulation={handleRunSimulation}
      onScenarioChange={(scenarioId) => void handleScenarioChange(scenarioId)}
    />
  );
}

function formatDashboardError(error: string) {
  const detailSeparator = ": Database unavailable.";
  if (error.includes(detailSeparator)) {
    return `Database unavailable.${error.split(detailSeparator)[1]}`;
  }
  if (error === "Failed to fetch") {
    return "The API server is not reachable. Start the API service and try again.";
  }
  return error;
}

async function loadSimulationFrame(
  scenarioId: ScenarioId
): Promise<SimulationFrameLoadResult> {
  const startedAtMs = readNowMs();

  try {
    const frame = await getSimulationFrame(scenarioId);

    return {
      frame,
      routeAvailable: true,
      networkLatencyMs: readNowMs() - startedAtMs
    };
  } catch (error) {
    if (isSimulationFrameRouteMissingError(error)) {
      return {
        frame: null,
        routeAvailable: false,
        networkLatencyMs: null
      };
    }
    throw error;
  }
}

function shouldPollSimulationFrames(scenarioId: ScenarioId) {
  return SCENARIO_OPTIONS.some((option) => option.id === scenarioId);
}

function readNowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}
