"use client";

import type { IntersectionStatus, SimulationComparison, TrafficEvent } from "../lib/types";
import type { Locale } from "../lib/i18n";
import { copy, formatDirection } from "../lib/i18n";

type SimulationViewportProps = {
  status: IntersectionStatus;
  events: TrafficEvent[];
  simulation: SimulationComparison;
  locale: Locale;
};

export function SimulationViewport({
  status,
  events,
  simulation,
  locale
}: SimulationViewportProps) {
  const t = copy[locale];
  const emergencyEvent = events.find(
    (event) => event.event_type === "emergency_vehicle_approach"
  );
  const delayPercent = simulation.improvement.total_delay_percent;
  const activeDirection = signalPhaseDirection(status.signal_phase);
  const emergencyDirection = emergencyEvent?.direction ?? null;

  return (
    <div className="simulation-viewport">
      <div className="renderer-status" aria-label="Simulation renderer status">
        <strong>SUMO/TraCI Renderer</strong>
        <span>{simulation.source}</span>
        <span>Delay {formatPercent(delayPercent)}</span>
      </div>
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
      {activeDirection ? (
        <div className={`priority-corridor ${activeDirection}-priority`} />
      ) : null}
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

      <SignalStack className={`signal-north ${activeDirection === "north" ? "active" : ""}`} />
      <SignalStack className={`signal-south ${activeDirection === "south" ? "active" : ""}`} />
      <SignalStack className={`signal-east ${activeDirection === "east" ? "active" : ""}`} />
      <SignalStack className={`signal-west ${activeDirection === "west" ? "active" : ""}`} />
      {status.pedestrian_request ? <div className="pedestrian-marker" aria-label={t.pedestrian} /> : null}
      {emergencyEvent ? (
        <div className="emergency-marker">
          <span aria-hidden="true" className="emergency-triangle" />
          <strong>
            {locale === "ko"
              ? `긴급차량 ${formatDirection(emergencyDirection, locale)} 접근`
              : "Emergency Vehicle"}
          </strong>
          <small>
            {locale === "ko"
              ? "Emergency Vehicle"
              : `Emergency from ${formatDirection(emergencyDirection, locale)}`}
          </small>
        </div>
      ) : null}
      {emergencyEvent ? (
        <div className="emergency-vehicle" aria-label={t.emergency}>
          <span />
        </div>
      ) : null}
      <div className="live-badge">
        <strong>LIVE</strong>
        <time>{formatTime(status.captured_at)}</time>
      </div>
      <div className="zoom-stack" aria-hidden="true">
        <span>+</span>
        <span>-</span>
      </div>
    </div>
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

function formatPercent(value: number) {
  const normalizedValue = value > 0 ? -value : value;
  return `${normalizedValue}%`;
}

function signalPhaseDirection(value: string) {
  if (value.includes("north")) return "north";
  if (value.includes("south")) return "south";
  if (value.includes("east")) return "east";
  if (value.includes("west")) return "west";
  return null;
}
