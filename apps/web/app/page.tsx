"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "../components/DashboardShell";
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
  SimulationComparison,
  TrafficEvent
} from "../lib/types";

type DashboardData = {
  status: IntersectionStatus;
  events: TrafficEvent[];
  recommendation: Recommendation;
  simulation: SimulationComparison;
  report: Report;
  chat: ChatResponse | null;
};

export default function Page() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [status, events, recommendation, simulation, report] =
        await Promise.all([
          getIntersectionStatus(),
          getEvents(),
          recommendSignal(),
          simulateSignal(),
          generateReport()
        ]);

      setData({ status, events, recommendation, simulation, report, chat: null });
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard");
    }
  }

  async function handleAskQuestion(question: string) {
    const chat = await askQuestion(question);
    setData((current) => (current ? { ...current, chat } : current));
  }

  async function handleGenerateReport() {
    const report = await generateReport();
    setData((current) => (current ? { ...current, report } : current));
  }

  async function handleRefreshRecommendation() {
    const recommendation = await recommendSignal();
    setData((current) => (current ? { ...current, recommendation } : current));
  }

  async function handleRunSimulation() {
    const simulation = await simulateSignal();
    setData((current) => (current ? { ...current, simulation } : current));
  }

  if (error) {
    return (
      <main className="loading-shell">
        <h1>Smart Intersection Ops</h1>
        <p>{error}</p>
        <button type="button" onClick={loadDashboard}>
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
      onAskQuestion={handleAskQuestion}
      onGenerateReport={handleGenerateReport}
      onRefreshRecommendation={handleRefreshRecommendation}
      onRunSimulation={handleRunSimulation}
    />
  );
}
