"use client";

import { useMemo } from "react";

import type { SimulationViewportProps } from "../SimulationViewportFallback";
import { buildFixtureSceneSnapshot, buildSceneSnapshot } from "./buildSceneSnapshot";
import { getCorridorLengthDataAttribute } from "./roadGeometry";
import { SimulationCanvas } from "./SimulationCanvas";
import { SimulationOverlays } from "./SimulationOverlays";
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
  simulationFrame
}: SimulationViewportProps) {
  const frameSceneSnapshot = useMemo(
    () => buildSceneSnapshot(simulationFrame),
    [simulationFrame]
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
      data-r3f-visible-vehicle-count={visibleVehicleCount}
      data-r3f-glb-vehicle-count={STAGE5_VISIBLE_TRAFFIC_GLB_PLACEMENTS.length}
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
