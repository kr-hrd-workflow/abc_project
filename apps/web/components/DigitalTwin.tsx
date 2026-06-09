"use client";

import { useState } from "react";

import type { TrafficEvent, IntersectionStatus, SimulationComparison } from "../lib/types";
import type { Locale } from "../lib/i18n";
import { copy } from "../lib/i18n";
import { SimulationViewport } from "./SimulationViewport";

type DigitalTwinProps = {
  status: IntersectionStatus;
  events: TrafficEvent[];
  simulation: SimulationComparison;
  locale: Locale;
  onRunSimulation: () => Promise<void>;
};

export function DigitalTwin({
  status,
  events,
  simulation,
  locale,
  onRunSimulation
}: DigitalTwinProps) {
  const t = copy[locale];
  const [simulationState, setSimulationState] =
    useState<"idle" | "running" | "ready" | "failed">("idle");

  async function handleRunSimulation() {
    setSimulationState("running");
    try {
      await onRunSimulation();
      setSimulationState("ready");
    } catch {
      setSimulationState("failed");
    }
  }

  return (
    <section className="panel simulation-panel" aria-label="Digital Twin Simulation">
      <div className="panel-heading simulation-heading">
        <div>
          <h2>Digital Twin Simulation</h2>
          <p>
            {t.simulationViewport}
            <span>{t.simulationViewportSub}</span>
          </p>
        </div>
        <div className="viewport-controls">
          <button type="button" aria-label={locale === "ko" ? "밝기" : "Lighting"}>
            <span aria-hidden="true" className="toolbar-icon sun" />
          </button>
          <button type="button">2D</button>
          <button type="button" className="active">3D</button>
          <button type="button" aria-label={locale === "ko" ? "전체화면" : "Fullscreen"}>
            <span aria-hidden="true" className="toolbar-icon expand" />
          </button>
          <button
            type="button"
            onClick={handleRunSimulation}
            disabled={simulationState === "running"}
          >
            {simulationState === "running" ? t.simulationRunning : t.runSimulation}
          </button>
        </div>
      </div>
      {simulationState !== "idle" ? (
        <div className={`simulation-feedback ${simulationState}`} role="status">
          {simulationState === "running" ? t.simulationRunning : null}
          {simulationState === "ready" ? t.simulationReady : null}
          {simulationState === "failed" ? t.simulationFailed : null}
        </div>
      ) : null}

      <SimulationViewport
        status={status}
        events={events}
        simulation={simulation}
        locale={locale}
      />

      <div className="simulation-legend">
        <span>{t.signalState}</span>
        <span><i className="dot green" /> GREEN</span>
        <span><i className="dot amber" /> YELLOW</span>
        <span><i className="dot red" /> RED</span>
        <span><i className="dot vehicle" /> {t.vehicle}</span>
        <span><i className="dot cyan" /> {t.pedestrian}</span>
        <span><i className="dot emergency" /> {t.emergency}</span>
      </div>
    </section>
  );
}
