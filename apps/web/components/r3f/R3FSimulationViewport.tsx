"use client";

import type { SimulationViewportProps } from "../SimulationViewportFallback";
import { SimulationCanvas } from "./SimulationCanvas";

export function R3FSimulationViewport({
  simulation,
  locale
}: SimulationViewportProps) {
  return (
    <div
      className="simulation-viewport"
      data-testid="r3f-simulation-viewport"
      data-r3f-simulation-ready="true"
      data-r3f-renderer-mode="r3f_procedural_stage3"
      data-r3f-snapshot-source="simulation_snapshot_fixture"
      data-r3f-traffic-density-mode="fixture_queues"
      data-r3f-corridor-length-meters="north:140,south:120,east:140,west:140"
    >
      <SimulationCanvas />
      <div className="playback-badge">
        <strong>R3F digital twin</strong>
        <span>Browser WebGL renderer</span>
      </div>
      <section
        className="simulation-cctv-surface"
        aria-label={locale === "ko" ? "시뮬레이션 스트림 뷰어" : "Simulation stream viewer"}
      >
        <div>
          <span>{locale === "ko" ? "Stream-ready Render Slot" : "Stream-ready Render Slot"}</span>
          <strong>{locale === "ko" ? "R3F 디지털 트윈" : "R3F digital twin"}</strong>
          <small>
            {locale === "ko"
              ? "Simulation only. SUMO/TraCI 검증 경계 유지."
              : "Simulation only. SUMO/TraCI validation boundary remains active."}
          </small>
        </div>
        <div className="cctv-frame-lines" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </section>
      <div className="renderer-status" aria-label="Simulation renderer status">
        <strong>SUMO/TraCI Renderer</strong>
        <span>{simulation.source}</span>
        <span>R3F island</span>
      </div>
    </div>
  );
}
