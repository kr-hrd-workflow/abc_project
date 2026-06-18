"use client";

import { useMemo } from "react";

import type { SimulationViewportProps } from "../SimulationViewportFallback";
import type { SimulationFrameBufferEntry } from "../../lib/simulationSnapshot";
import { buildFixtureSceneSnapshot, buildSceneSnapshot } from "./buildSceneSnapshot";
import { getCorridorLengthDataAttribute } from "./roadGeometry";
import {
  STAGE5_SHADOWS_ENABLED,
  getStage5ShadowCasterCount
} from "./shadowPolicy";
import { SimulationCanvas } from "./SimulationCanvas";
import { SimulationOverlays } from "./SimulationOverlays";
import { useInterpolatedSimulationFrame } from "./useInterpolatedSimulationFrame";
import {
  STAGE5_TRAFFIC_VEHICLE_SILHOUETTE_PARTS,
  buildTrafficDensityRenderPlan
} from "./TrafficDensityLayer";
import {
  STAGE5_STREET_FURNITURE_CONTACT_SHADOW_PLACEMENTS,
  STAGE5_VISIBLE_TRAFFIC_GLB_PLACEMENTS
} from "./Stage5SceneAssets";

export const STAGE5_RENDERER_MODE = "r3f_photoreal_stage5";

export function R3FSimulationViewport({
  status,
  events,
  simulation,
  simulationFrame,
  simulationFrameEntries,
  selectedScenarioId
}: SimulationViewportProps) {
  const staticFrameEntries = useMemo(
    () => buildStaticFrameEntries(simulationFrame),
    [simulationFrame]
  );
  const liveFrameEntries =
    simulationFrameEntries && simulationFrameEntries.length > 0
      ? simulationFrameEntries
      : staticFrameEntries;
  const { frame: interpolatedFrame, telemetry: frameTelemetry } =
    useInterpolatedSimulationFrame(liveFrameEntries, {
      scenarioId: selectedScenarioId
    });
  const frameSceneSnapshot = useMemo(
    () => buildSceneSnapshot(interpolatedFrame),
    [interpolatedFrame]
  );
  const fallbackSceneSnapshot = useMemo(
    () => buildFixtureSceneSnapshot({ queues: status.queues, events }),
    [events, status.queues]
  );
  const frameBound = frameSceneSnapshot.source !== null;
  const sceneSnapshot = frameBound ? frameSceneSnapshot : fallbackSceneSnapshot;
  const visibleVehicleCount = useMemo(() => {
    const renderPlan = buildTrafficDensityRenderPlan(sceneSnapshot);

    return renderPlan.preciseVehicles.length + renderPlan.farVehicles.length;
  }, [sceneSnapshot]);
  const corridorLengthMeters = getCorridorLengthDataAttribute();
  const visibleVehiclePartCount =
    STAGE5_TRAFFIC_VEHICLE_SILHOUETTE_PARTS.filter((part) => part.visible).length;
  const signalState = buildSignalStateDataAttribute(sceneSnapshot.signals);
  const shadowCasterCount = getStage5ShadowCasterCount(sceneSnapshot);

  return (
    <div
      className="simulation-viewport"
      data-testid="r3f-simulation-viewport"
      data-r3f-simulation-ready="true"
      data-r3f-snapshot-source={sceneSnapshot.source ?? "none"}
      data-r3f-frame-bound={frameBound ? "true" : undefined}
      data-r3f-renderer-mode={STAGE5_RENDERER_MODE}
      data-r3f-photoreal-stage="5"
      data-r3f-corridor-length-meters={corridorLengthMeters}
      data-r3f-traffic-density-mode={sceneSnapshot.trafficDensityMode}
      data-r3f-signal-state={signalState}
      data-r3f-scenario-id={sceneSnapshot.scenarioId ?? undefined}
      data-r3f-queue-source={sceneSnapshot.queueSource}
      data-r3f-frame-age-ms={formatTelemetryNumber(frameTelemetry.frameAgeMs)}
      data-r3f-network-latency-ms={formatTelemetryNumber(
        frameTelemetry.networkLatencyMs
      )}
      data-r3f-sim-to-render-delay-ms={formatTelemetryNumber(
        frameTelemetry.simToRenderDelayMs
      )}
      data-r3f-authoritative-hz={frameTelemetry.authoritativeHz}
      data-r3f-authoritative-tick-drift-ms={formatTelemetryNumber(
        frameTelemetry.authoritativeTickDriftMs
      )}
      data-r3f-frame-stale={frameTelemetry.stale ? "true" : "false"}
      data-r3f-visible-vehicle-count={visibleVehicleCount}
      data-r3f-glb-vehicle-count={STAGE5_VISIBLE_TRAFFIC_GLB_PLACEMENTS.length}
      data-r3f-shadow-enabled={STAGE5_SHADOWS_ENABLED ? "true" : "false"}
      data-r3f-shadow-caster-count={shadowCasterCount}
      data-r3f-street-shadow-count={
        STAGE5_STREET_FURNITURE_CONTACT_SHADOW_PLACEMENTS.length
      }
      data-r3f-vehicle-silhouette-part-count={visibleVehiclePartCount}
    >
      <SimulationCanvas sceneSnapshot={sceneSnapshot} />
      <SimulationOverlays
        simulationSource={simulation.source}
        sceneSnapshot={sceneSnapshot}
        signalState={signalState}
        frameTelemetry={frameTelemetry}
      />
      <div className="playback-badge">
        <strong>R3F digital twin</strong>
        <span>Browser WebGL renderer</span>
      </div>
      <div className="renderer-status" aria-label="Simulation renderer status">
        <strong>SUMO/TraCI Renderer</strong>
        <span>{simulation.source}</span>
        <span>R3F island</span>
      </div>
    </div>
  );
}

function buildStaticFrameEntries(
  frame: SimulationViewportProps["simulationFrame"]
): SimulationFrameBufferEntry[] {
  if (!frame) return [];

  const nowMs = readNowMs();
  const capturedAtMs = Date.parse(frame.captured_at);

  return [
    {
      frame,
      receivedAtMs: nowMs,
      networkLatencyMs: 0,
      capturedAtMs: Number.isFinite(capturedAtMs) ? capturedAtMs : nowMs
    }
  ];
}

function formatTelemetryNumber(value: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(Math.round(value))
    : "none";
}

function readNowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function buildSignalStateDataAttribute(
  signals: ReturnType<typeof buildSceneSnapshot>["signals"]
) {
  if (signals.length === 0) return "unavailable";

  const byDirection = new Map<string, string>();
  for (const signal of signals) {
    if (!byDirection.has(signal.direction)) {
      byDirection.set(signal.direction, signal.state);
    }
  }

  return Array.from(byDirection.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([direction, state]) => `${direction}:${state}`)
    .join(",");
}
