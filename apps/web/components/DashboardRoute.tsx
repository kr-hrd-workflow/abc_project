"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "./DashboardShell";
import {
  analyzeUpload,
  askQuestion,
  generateReport,
  getAnalysisJob,
  getEvents,
  getFixtures,
  getIntersectionStatus,
  ingestFixture,
  recommendSignal,
  simulateSignal
} from "../lib/api";
import type {
  AnalysisFixture,
  AnalysisJob,
  ChatResponse,
  FixtureIngestResult,
  IntersectionStatus,
  Recommendation,
  Report,
  ScenarioId,
  SimulationComparison,
  TrafficEvent,
  UploadAnalysisResult
} from "../lib/types";
import { SCENARIO_OPTIONS } from "../lib/types";

const DEFAULT_SCENARIO_ID: ScenarioId = "emergency";

type DashboardData = {
  status: IntersectionStatus;
  events: TrafficEvent[];
  recommendation: Recommendation;
  simulation: SimulationComparison;
  report: Report;
  chat: ChatResponse | null;
  fixtures: AnalysisFixture[];
  latestFixtureIngest: FixtureIngestResult | null;
  latestAnalysisJob: AnalysisJob | null;
};

export function DashboardRoute() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] =
    useState<ScenarioId>(DEFAULT_SCENARIO_ID);
  const [scenarioLoading, setScenarioLoading] = useState(false);

  useEffect(() => {
    void loadDashboard(DEFAULT_SCENARIO_ID);
  }, []);

  async function loadDashboard(scenarioId: ScenarioId) {
    try {
      const [status, events, recommendation, simulation, report, fixtures] =
        await Promise.all([
          getIntersectionStatus(scenarioId),
          getEvents(scenarioId),
          recommendSignal(scenarioId),
          simulateSignal(scenarioId),
          generateReport(scenarioId),
          getFixtures()
        ]);

      setData({
        status,
        events,
        recommendation,
        simulation,
        report,
        chat: null,
        fixtures,
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
      report={data.report}
      chat={data.chat}
      fixtures={data.fixtures}
      latestFixtureIngest={data.latestFixtureIngest}
      latestAnalysisJob={data.latestAnalysisJob}
      selectedScenarioId={selectedScenarioId}
      scenarioOptions={SCENARIO_OPTIONS}
      scenarioLoading={scenarioLoading}
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
