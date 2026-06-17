"use client";

import type { SceneSnapshot } from "./buildSceneSnapshot";

type SimulationOverlaysProps = {
  simulationSource: string;
  sceneSnapshot: SceneSnapshot;
  signalState: string;
};

export function SimulationOverlays({
  simulationSource,
  sceneSnapshot,
  signalState
}: SimulationOverlaysProps) {
  return (
    <div
      className="simulation-source-overlays"
      data-testid="r3f-simulation-overlays"
      aria-label="Simulation source overlays"
    >
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
