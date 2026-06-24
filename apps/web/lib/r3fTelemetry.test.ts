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
      qualityPreset: "high",
      postFx: {
        enabled: true,
        chain: ["SMAA", "SSAO", "Bloom", "ToneMapping", "Noise", "Vignette"],
        source: "dom_attribute",
        reason: null
      },
      heavyFeatures: {
        planarReflection: true,
        weatherParticles: true,
        highQualityVehicles: 18,
        shadowCasters: 14,
        source: "browser_telemetry",
        reason: null
      },
      fps: 60,
      averageFrameTimeMs: 16.2,
      cpuFrameTimeMs: 16.2,
      gpuFrameTimeMs: null,
      triangles: 42000,
      textureMemoryBytes: null,
      textureMemoryEstimateMb: 8.5,
      pedestrianTruth: {
        sumoPedestrianCount: 2,
        sumoPedestrianSource: "simulation_frame_snapshot",
        ambientPedestrianCount: 6,
        ambientPedestrianSource: "procedural_background_proxy",
        truthSeparated: true
      },
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
      quality_preset: "high",
      post_fx: {
        enabled: true,
        chain: ["SMAA", "SSAO", "Bloom", "ToneMapping", "Noise", "Vignette"],
        source: "dom_attribute",
        reason: null
      },
      heavy_features: {
        planar_reflection: true,
        weather_particles: true,
        high_quality_vehicles: 18,
        shadow_casters: 14,
        source: "browser_telemetry",
        reason: null
      },
      fps: 60,
      average_frame_time_ms: 16.2,
      cpu_frame_time_ms: 16.2,
      gpu_frame_time_ms: null,
      triangles: 42000,
      texture_memory_bytes: null,
      performance: {
        draw_calls: 94,
        frame_time_ms: 16.2,
        visible_vehicles: 160,
        texture_memory_estimate_mb: 8.5,
        source: "browser_telemetry",
        reason: null
      },
      source_labels: {
        snapshot_source: "simulation_snapshot_fixture",
        stale: false,
        fallback_reason: null
      },
      pedestrian_truth: {
        sumo_pedestrian_count: 2,
        sumo_pedestrian_source: "simulation_frame_snapshot",
        ambient_pedestrian_count: 6,
        ambient_pedestrian_source: "procedural_background_proxy",
        truth_separated: true
      },
      js_heap_bytes: 2048,
      authoritative_tick_drift_ms: 5,
      emitted_at: "2026-06-18T00:00:00.000Z"
    });

    expect(publishR3FTelemetryEvent(event)).toBe(event);
    expect(window.__r3fTelemetryEvent).toBe(event);
  });

  test("labels missing Stage 6 finishing telemetry instead of fabricating values", () => {
    const event = buildR3FTelemetryEvent({
      rendererMode: "r3f_photoreal_stage5",
      snapshotSource: "simulation_snapshot_fixture",
      frameBound: true,
      drawCallCount: 94,
      webglContextLossCount: 0,
      fallbackReason: null,
      visibleVehicleCount: 160,
      averageFrameTimeMs: null,
      textureMemoryBytes: null,
      emittedAt: "2026-06-18T00:00:00.000Z"
    });

    expect(event.quality_preset).toBeNull();
    expect(event.post_fx).toEqual({
      enabled: null,
      chain: null,
      source: "not_reported",
      reason: "postFX state was not reported by DOM attributes or browser telemetry"
    });
    expect(event.heavy_features).toEqual({
      planar_reflection: null,
      weather_particles: null,
      high_quality_vehicles: null,
      shadow_casters: null,
      source: "not_reported",
      reason: "heavy feature state was not reported by DOM attributes or browser telemetry"
    });
    expect(event.performance).toEqual({
      draw_calls: 94,
      frame_time_ms: null,
      visible_vehicles: 160,
      texture_memory_estimate_mb: null,
      source: "browser_telemetry",
      reason:
        "frame time and texture memory estimate were not reported by browser telemetry"
    });
    expect(event.source_labels).toEqual({
      snapshot_source: "simulation_snapshot_fixture",
      stale: false,
      fallback_reason: null
    });
    expect(event.pedestrian_truth).toEqual({
      sumo_pedestrian_count: null,
      sumo_pedestrian_source: null,
      ambient_pedestrian_count: null,
      ambient_pedestrian_source: null,
      truth_separated: false
    });
  });
});
