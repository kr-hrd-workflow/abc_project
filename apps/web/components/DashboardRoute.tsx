"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "./DashboardShell";
import {
  askQuestion,
  generateReport,
  getEvents,
  getIntersectionStatus,
  recommendSignal,
  simulateSignal
} from "../lib/api";
import type {
  ChatResponse,
  IntersectionStatus,
  Recommendation,
  Report,
  ScenarioId,
  SimulationComparison,
  TrafficEvent
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
      const [status, events, recommendation, simulation, report] =
        await Promise.all([
          getIntersectionStatus(scenarioId),
          getEvents(scenarioId),
          recommendSignal(scenarioId),
          simulateSignal(scenarioId),
          generateReport(scenarioId)
        ]);

      setData({ status, events, recommendation, simulation, report, chat: null });
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
    return (
      <main className="loading-shell">
        <h1>Smart Intersection Ops</h1>
        <p>{error}</p>
        <button type="button" onClick={() => void loadDashboard(selectedScenarioId)}>
          Retry
        </button>
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
      selectedScenarioId={selectedScenarioId}
      scenarioOptions={SCENARIO_OPTIONS}
      scenarioLoading={scenarioLoading}
      onAskQuestion={handleAskQuestion}
      onGenerateReport={handleGenerateReport}
      onRefreshRecommendation={handleRefreshRecommendation}
      onRunSimulation={handleRunSimulation}
      onScenarioChange={(scenarioId) => void handleScenarioChange(scenarioId)}
    />
  );
}
