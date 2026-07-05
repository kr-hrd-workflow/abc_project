"use client";

import { useState } from "react";

import type { TrafficEvent, IntersectionStatus, RuntimeReadiness, SimulationComparison } from "../lib/types";
import type {
  SimulationFrameBufferEntry,
  SimulationFrameSnapshot
} from "../lib/simulationSnapshot";
import type { Locale } from "../lib/i18n";
import { copy } from "../lib/i18n";
import type { ScenePresentationState } from "./r3f/stage6Quality";
import { SimulationViewport } from "./SimulationViewport";

type DigitalTwinProps = {
  status: IntersectionStatus;
  events: TrafficEvent[];
  simulation: SimulationComparison;
  simulationFrame: SimulationFrameSnapshot | null;
  simulationFrameEntries?: SimulationFrameBufferEntry[];
  selectedScenarioId: string;
  runtimeReadiness: RuntimeReadiness;
  locale: Locale;
  scenePresentation?: ScenePresentationState;
  onRunSimulation: () => Promise<void>;
};

export function DigitalTwin({
  status,
  events,
  simulation,
  simulationFrame,
  simulationFrameEntries,
  selectedScenarioId,
  runtimeReadiness,
  locale,
  scenePresentation,
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
    <section
      className="panel simulation-panel"
      aria-label={locale === "ko" ? "디지털 트윈 시뮬레이션" : "Digital Twin Simulation"}
    >
      <div className="panel-heading simulation-heading">
        <div>
          <h2>{locale === "ko" ? "디지털 트윈 시뮬레이션" : "Digital Twin Simulation"}</h2>
          <p>
            {t.simulationViewport}
            <span>{t.simulationViewportSub}</span>
          </p>
        </div>
        <div className="viewport-controls">
          <span className="viewport-mode">
            {locale === "ko" ? "시뮬레이션 스트림 준비" : "Simulation stream ready"}
          </span>
          <span className="viewport-mode">
            {locale === "ko" ? "SUMO 검증" : "SUMO validation"}
          </span>
          <span className="viewport-mode">{status.signal_phase}</span>
          <button
            type="button"
            className="motion-pressable command-pressable simulation-run-button"
            onClick={handleRunSimulation}
            disabled={simulationState === "running"}
          >
            <span>{simulationState === "running" ? t.simulationRunning : t.runSimulation}</span>
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
        simulationFrame={simulationFrame}
        simulationFrameEntries={simulationFrameEntries}
        selectedScenarioId={selectedScenarioId}
        runtimeReadiness={runtimeReadiness}
        locale={locale}
        scenePresentation={scenePresentation}
      />

      <div className="simulation-legend">
        <span>{t.signalState}</span>
        <span><i className="dot green" /> {locale === "ko" ? "녹색" : "GREEN"}</span>
        <span><i className="dot amber" /> {locale === "ko" ? "황색" : "YELLOW"}</span>
        <span><i className="dot red" /> {locale === "ko" ? "적색" : "RED"}</span>
        <span><i className="dot vehicle" /> {t.vehicle}</span>
        <span><i className="dot cyan" /> {t.pedestrian}</span>
        <span><i className="dot emergency" /> {t.emergency}</span>
      </div>
    </section>
  );
}
