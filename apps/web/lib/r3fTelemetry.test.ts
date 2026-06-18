// @vitest-environment jsdom

import { afterEach, describe, expect, test } from "vitest";

import {
  buildR3FTelemetryEvent,
  publishR3FTelemetryEvent
} from "./r3fTelemetry";

afterEach(() => {
  delete window.__r3fTelemetryEvent;
});

describe("R3F telemetry", () => {
  test("builds and exposes the dashboard renderer telemetry event", () => {
    const event = buildR3FTelemetryEvent({
      rendererMode: "r3f_photoreal_stage5",
      snapshotSource: "simulation_snapshot_fixture",
      frameBound: true,
      drawCallCount: 94,
      webglContextLossCount: 0,
      fallbackReason: null,
      visibleVehicleCount: 160,
      frameAgeMs: 120,
      networkLatencyMs: 18,
      simToRenderDelayMs: 150,
      authoritativeHz: 10,
      frameStale: false,
      fps: 60,
      averageFrameTimeMs: 16.2,
      cpuFrameTimeMs: 16.2,
      gpuFrameTimeMs: null,
      triangles: 42000,
      textureMemoryBytes: null,
      jsHeapBytes: 2048,
      authoritativeTickDriftMs: 5,
      emittedAt: "2026-06-18T00:00:00.000Z"
    });

    expect(event).toEqual({
      renderer_mode: "r3f_photoreal_stage5",
      snapshot_source: "simulation_snapshot_fixture",
      frame_bound: true,
      draw_call_count: 94,
      webgl_context_loss_count: 0,
      fallback_reason: null,
      visible_vehicle_count: 160,
      frame_age_ms: 120,
      network_latency_ms: 18,
      sim_to_render_delay_ms: 150,
      authoritative_hz: 10,
      frame_stale: false,
      fps: 60,
      average_frame_time_ms: 16.2,
      cpu_frame_time_ms: 16.2,
      gpu_frame_time_ms: null,
      triangles: 42000,
      texture_memory_bytes: null,
      js_heap_bytes: 2048,
      authoritative_tick_drift_ms: 5,
      emitted_at: "2026-06-18T00:00:00.000Z"
    });

    expect(publishR3FTelemetryEvent(event)).toBe(event);
    expect(window.__r3fTelemetryEvent).toBe(event);
  });
});
