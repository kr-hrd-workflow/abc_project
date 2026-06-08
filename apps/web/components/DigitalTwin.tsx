"use client";

import { useState } from "react";

import type { TrafficEvent, IntersectionStatus } from "../lib/types";
import type { Locale } from "../lib/i18n";
import { copy, formatDirection } from "../lib/i18n";

type DigitalTwinProps = {
  status: IntersectionStatus;
  events: TrafficEvent[];
  locale: Locale;
  onRunSimulation: () => Promise<void>;
};

export function DigitalTwin({
  status,
  events,
  locale,
  onRunSimulation
}: DigitalTwinProps) {
  const t = copy[locale];
  const [simulationState, setSimulationState] =
    useState<"idle" | "running" | "ready" | "failed">("idle");
  const emergencyEvent = events.find(
    (event) => event.event_type === "emergency_vehicle_approach"
  );

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
          <p>{t.simulationViewport}</p>
        </div>
        <div className="viewport-controls">
          <button type="button">2D</button>
          <button type="button" className="active">3D</button>
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

      <div className="simulation-viewport">
        <div className="road vertical-road" />
        <div className="road horizontal-road" />
        <div className="crosswalk crosswalk-north" />
        <div className="crosswalk crosswalk-south" />
        <div className="crosswalk crosswalk-east" />
        <div className="crosswalk crosswalk-west" />

        <DirectionBadge className="north" label={formatDirection("north", locale)} value={status.queues.north} />
        <DirectionBadge className="south" label={formatDirection("south", locale)} value={status.queues.south} />
        <DirectionBadge className="east" label={formatDirection("east", locale)} value={status.queues.east} />
        <DirectionBadge className="west" label={formatDirection("west", locale)} value={status.queues.west} />

        <VehicleLane side="north" count={status.queues.north} />
        <VehicleLane side="south" count={status.queues.south} />
        <VehicleLane side="east" count={status.queues.east} />
        <VehicleLane side="west" count={status.queues.west} />

        <div className="signal signal-north" />
        <div className="signal signal-south" />
        <div className="signal signal-east active" />
        <div className="signal signal-west" />
        {status.pedestrian_request ? <div className="pedestrian-marker">🚶</div> : null}
        {emergencyEvent ? (
          <div className="emergency-marker">
            <span>🚑</span>
            <strong>{locale === "ko" ? "긴급차량 동쪽 접근" : "Emergency from East"}</strong>
          </div>
        ) : null}
      </div>

      <div className="simulation-legend">
        <span><i className="dot green" /> GREEN</span>
        <span><i className="dot amber" /> YELLOW</span>
        <span><i className="dot red" /> RED</span>
        <span><i className="dot cyan" /> {locale === "ko" ? "보행자" : "Pedestrian"}</span>
      </div>
    </section>
  );
}

function DirectionBadge({
  className,
  label,
  value
}: {
  className: string;
  label: string;
  value: number;
}) {
  return (
    <div className={`direction-badge ${className}`}>
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

function VehicleLane({ side, count }: { side: string; count: number }) {
  return (
    <div className={`vehicle-lane lane-${side}`}>
      {Array.from({ length: Math.min(count, 8) }).map((_, index) => (
        <span key={index} className={index % 3 === 0 ? "queued" : ""} />
      ))}
    </div>
  );
}
