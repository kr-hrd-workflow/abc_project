"use client";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import type { SimulationFrameTelemetry } from "../../lib/simulationSnapshot";

type SimulationOverlaysProps = {
  simulationSource: string;
  sceneSnapshot: SceneSnapshot;
  signalState: string;
  frameTelemetry: SimulationFrameTelemetry;
};

export function SimulationOverlays({
  simulationSource,
  sceneSnapshot,
  signalState,
  frameTelemetry
}: SimulationOverlaysProps) {
  return (
    <div
      className="simulation-source-overlays"
      data-testid="r3f-simulation-overlays"
      aria-label="Simulation source overlays"
    >
      <OverlayBadge
        label="Camera"
        value="SIM-CCTV-INT-0001"
        testId="r3f-cctv-camera-id-badge"
      />
      <OverlayBadge
        label="CCTV"
        value={formatVirtualCctvSource(simulationSource, sceneSnapshot.source)}
        testId="r3f-cctv-source-badge"
      />
      <OverlayBadge
        label="Render delay"
        value={formatRenderDelay(frameTelemetry.simToRenderDelayMs)}
        testId="r3f-cctv-render-delay-badge"
      />
      <OverlayBadge
        label="Feed"
        value={
          frameTelemetry.stale
            ? formatFrameStaleValue(frameTelemetry.staleReason)
            : "current simulation frame"
        }
        testId="r3f-cctv-stale-badge"
      />
      <OverlayBadge
        label="Effect"
        value="rain lens / light compression"
        testId="r3f-cctv-effect-badge"
      />
      <OverlayBadge
        label="Safety"
        value="Virtual simulation CCTV, not a live feed"
        testId="r3f-cctv-safety-badge"
      />
      <OverlayBadge label="Simulation" value={simulationSource} testId="r3f-simulation-source-badge" />
      <OverlayBadge
        label="Snapshot"
        value={sceneSnapshot.source ?? "none"}
        testId="r3f-snapshot-source-badge"
      />
      <OverlayBadge
        label="Traffic"
        value={sceneSnapshot.trafficDensityMode}
        testId="r3f-traffic-density-mode-badge"
      />
      <OverlayBadge
        label="Signals"
        value={signalState}
        testId="r3f-signal-state-badge"
      />
      <OverlayBadge
        label="Queue"
        value={sceneSnapshot.queueSource}
        testId="r3f-queue-source-badge"
      />
      {frameTelemetry.stale ? (
        <OverlayBadge
          label="Frame"
          value={formatFrameStaleValue(frameTelemetry.staleReason)}
          testId="r3f-frame-stale-badge"
        />
      ) : null}
      {sceneSnapshot.scenarioId ? (
        <OverlayBadge
          label="Scenario"
          value={sceneSnapshot.scenarioId}
          testId="r3f-scenario-id-badge"
        />
      ) : null}
    </div>
  );
}

function formatFrameStaleValue(reason: string | null) {
  if (reason === "degraded_source") return "degraded";
  if (reason === "missing_next_frame") return "stale missing-next";
  if (reason === "frame_age") return "stale age";
  return "stale";
}

function formatVirtualCctvSource(
  simulationSource: string,
  snapshotSource: string | null
) {
  return `virtual simulation CCTV / ${simulationSource} / ${snapshotSource ?? "none"}`;
}

function formatRenderDelay(simToRenderDelayMs: number | null) {
  if (typeof simToRenderDelayMs !== "number" || !Number.isFinite(simToRenderDelayMs)) {
    return "unavailable";
  }

  return `${Math.max(0, Math.round(simToRenderDelayMs))} ms`;
}

function OverlayBadge({
  label,
  value,
  testId
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <span className="simulation-source-badge" data-testid={testId}>
      <b>{label}</b>
      <span>{value}</span>
    </span>
  );
}
