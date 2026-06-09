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

      <div className="simulation-viewport">
        <div className="city-block block-nw" />
        <div className="city-block block-ne" />
        <div className="city-block block-sw" />
        <div className="city-block block-se" />
        <div className="tree-field trees-nw" />
        <div className="tree-field trees-ne" />
        <div className="tree-field trees-sw" />
        <div className="tree-field trees-se" />
        <div className="road vertical-road" />
        <div className="road horizontal-road" />
        <div className="lane-markers vertical-lanes" />
        <div className="lane-markers horizontal-lanes" />
        <div className="turn-pocket north-pocket" />
        <div className="turn-pocket east-pocket" />
        <div className="priority-corridor east-priority" />
        <div className="priority-corridor south-priority" />
        <div className="crosswalk crosswalk-north" />
        <div className="crosswalk crosswalk-south" />
        <div className="crosswalk crosswalk-east" />
        <div className="crosswalk crosswalk-west" />

        <DirectionBadge direction="north" label={formatDirection("north", locale)} value={status.queues.north} />
        <DirectionBadge direction="south" label={formatDirection("south", locale)} value={status.queues.south} />
        <DirectionBadge direction="east" label={formatDirection("east", locale)} value={status.queues.east} />
        <DirectionBadge direction="west" label={formatDirection("west", locale)} value={status.queues.west} />

        <VehicleLane side="north" count={status.queues.north} />
        <VehicleLane side="south" count={status.queues.south} />
        <VehicleLane side="east" count={status.queues.east} />
        <VehicleLane side="west" count={status.queues.west} />

        <SignalStack className="signal-north" />
        <SignalStack className="signal-south" />
        <SignalStack className="signal-east active" />
        <SignalStack className="signal-west" />
        {status.pedestrian_request ? <div className="pedestrian-marker" aria-label={t.pedestrian} /> : null}
        {emergencyEvent ? (
          <div className="emergency-marker">
            <span aria-hidden="true" className="emergency-triangle" />
            <strong>{locale === "ko" ? "긴급차량 동쪽 접근" : "Emergency Vehicle"}</strong>
            <small>{locale === "ko" ? "Emergency Vehicle" : "Emergency from East"}</small>
          </div>
        ) : null}
        <div className="emergency-vehicle" aria-label={t.emergency}>
          <span />
        </div>
        <div className="live-badge">
          <strong>LIVE</strong>
          <time>{formatTime(status.captured_at)}</time>
        </div>
        <div className="zoom-stack" aria-hidden="true">
          <span>+</span>
          <span>-</span>
        </div>
      </div>

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

function DirectionBadge({
  direction,
  label,
  value
}: {
  direction: "north" | "south" | "east" | "west";
  label: string;
  value: number;
}) {
  const directionName = direction.toUpperCase();

  return (
    <div className={`direction-badge ${direction}`}>
      <strong>{label}</strong>
      <small>{directionName}</small>
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

function SignalStack({ className }: { className: string }) {
  return (
    <div className={`signal ${className}`}>
      <span className="red-light" />
      <span className="amber-light" />
      <span className="green-light" />
    </div>
  );
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}
