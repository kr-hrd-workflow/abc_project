export type R3FTelemetryValueSource =
  | "dom_attribute"
  | "browser_telemetry"
  | "app_proof"
  | "verifier"
  | "not_reported";

export type R3FTelemetryPostFx = {
  enabled: boolean | null;
  chain: string[] | null;
  source: R3FTelemetryValueSource;
  reason: string | null;
};

export type R3FTelemetryHeavyFeatures = {
  planar_reflection: boolean | null;
  weather_particles: boolean | null;
  high_quality_vehicles: number | null;
  shadow_casters: number | null;
  source: R3FTelemetryValueSource;
  reason: string | null;
};

export type R3FTelemetryPerformance = {
  draw_calls: number | null;
  frame_time_ms: number | null;
  visible_vehicles: number | null;
  texture_memory_estimate_mb: number | null;
  source: R3FTelemetryValueSource;
  reason: string | null;
};

export type R3FTelemetrySourceLabels = {
  snapshot_source: string | null;
  stale: boolean;
  fallback_reason: string | null;
};

export type R3FTelemetryEvent = {
  renderer_mode: string | null;
  snapshot_source: string | null;
  frame_bound: boolean;
  draw_call_count: number | null;
  webgl_context_loss_count: number;
  fallback_reason: string | null;
  visible_vehicle_count: number | null;
  frame_age_ms: number | null;
  network_latency_ms: number | null;
  sim_to_render_delay_ms: number | null;
  authoritative_hz: number | null;
  frame_stale: boolean;
  quality_preset: string | null;
  post_fx: R3FTelemetryPostFx;
  heavy_features: R3FTelemetryHeavyFeatures;
  fps: number | null;
  average_frame_time_ms: number | null;
  cpu_frame_time_ms: number | null;
  gpu_frame_time_ms: number | null;
  triangles: number | null;
  texture_memory_bytes: number | null;
  performance: R3FTelemetryPerformance;
  source_labels: R3FTelemetrySourceLabels;
  js_heap_bytes: number | null;
  authoritative_tick_drift_ms: number | null;
  emitted_at: string;
};

export type R3FTelemetryInput = {
  rendererMode: string | null;
  snapshotSource: string | null;
  frameBound: boolean;
  drawCallCount: number | null;
  webglContextLossCount: number;
  fallbackReason: string | null;
  visibleVehicleCount: number | null;
  frameAgeMs?: number | null;
  networkLatencyMs?: number | null;
  simToRenderDelayMs?: number | null;
  authoritativeHz?: number | null;
  frameStale?: boolean;
  qualityPreset?: string | null;
  postFx?: {
    enabled: boolean | null;
    chain: string[] | null;
    source?: R3FTelemetryValueSource;
    reason?: string | null;
  };
  heavyFeatures?: {
    planarReflection: boolean | null;
    weatherParticles: boolean | null;
    highQualityVehicles: number | null;
    shadowCasters: number | null;
    source?: R3FTelemetryValueSource;
    reason?: string | null;
  };
  fps?: number | null;
  averageFrameTimeMs?: number | null;
  cpuFrameTimeMs?: number | null;
  gpuFrameTimeMs?: number | null;
  triangles?: number | null;
  textureMemoryBytes?: number | null;
  textureMemoryEstimateMb?: number | null;
  performance?: {
    drawCalls?: number | null;
    frameTimeMs?: number | null;
    visibleVehicles?: number | null;
    textureMemoryEstimateMb?: number | null;
    source?: R3FTelemetryValueSource;
    reason?: string | null;
  };
  jsHeapBytes?: number | null;
  authoritativeTickDriftMs?: number | null;
  emittedAt?: string;
};

declare global {
  interface Window {
    __r3fTelemetryEvent?: R3FTelemetryEvent;
  }
}

export function buildR3FTelemetryEvent(
  input: R3FTelemetryInput
): R3FTelemetryEvent {
  return {
    renderer_mode: input.rendererMode,
    snapshot_source: input.snapshotSource,
    frame_bound: input.frameBound,
    draw_call_count: input.drawCallCount,
    webgl_context_loss_count: input.webglContextLossCount,
    fallback_reason: input.fallbackReason,
    visible_vehicle_count: input.visibleVehicleCount,
    frame_age_ms: input.frameAgeMs ?? null,
    network_latency_ms: input.networkLatencyMs ?? null,
    sim_to_render_delay_ms: input.simToRenderDelayMs ?? null,
    authoritative_hz: input.authoritativeHz ?? null,
    frame_stale: input.frameStale ?? false,
    quality_preset: input.qualityPreset ?? null,
    post_fx: normalizePostFx(input.postFx),
    heavy_features: normalizeHeavyFeatures(input.heavyFeatures),
    fps: input.fps ?? null,
    average_frame_time_ms: input.averageFrameTimeMs ?? null,
    cpu_frame_time_ms: input.cpuFrameTimeMs ?? null,
    gpu_frame_time_ms: input.gpuFrameTimeMs ?? null,
    triangles: input.triangles ?? null,
    texture_memory_bytes: input.textureMemoryBytes ?? null,
    performance: normalizePerformance(input),
    source_labels: {
      snapshot_source: input.snapshotSource,
      stale: input.frameStale ?? false,
      fallback_reason: input.fallbackReason
    },
    js_heap_bytes: input.jsHeapBytes ?? null,
    authoritative_tick_drift_ms: input.authoritativeTickDriftMs ?? null,
    emitted_at: input.emittedAt ?? new Date().toISOString()
  };
}

function normalizePostFx(
  postFx: R3FTelemetryInput["postFx"]
): R3FTelemetryPostFx {
  if (!postFx) {
    return {
      enabled: null,
      chain: null,
      source: "not_reported",
      reason: "postFX state was not reported by DOM attributes or browser telemetry"
    };
  }

  return {
    enabled: postFx.enabled,
    chain: postFx.chain,
    source: postFx.source ?? "browser_telemetry",
    reason: postFx.reason ?? null
  };
}

function normalizeHeavyFeatures(
  heavyFeatures: R3FTelemetryInput["heavyFeatures"]
): R3FTelemetryHeavyFeatures {
  if (!heavyFeatures) {
    return {
      planar_reflection: null,
      weather_particles: null,
      high_quality_vehicles: null,
      shadow_casters: null,
      source: "not_reported",
      reason:
        "heavy feature state was not reported by DOM attributes or browser telemetry"
    };
  }

  return {
    planar_reflection: heavyFeatures.planarReflection,
    weather_particles: heavyFeatures.weatherParticles,
    high_quality_vehicles: heavyFeatures.highQualityVehicles,
    shadow_casters: heavyFeatures.shadowCasters,
    source: heavyFeatures.source ?? "browser_telemetry",
    reason: heavyFeatures.reason ?? null
  };
}

function normalizePerformance(
  input: R3FTelemetryInput
): R3FTelemetryPerformance {
  const drawCalls = input.performance?.drawCalls ?? input.drawCallCount;
  const frameTimeMs =
    input.performance?.frameTimeMs ?? input.averageFrameTimeMs ?? null;
  const visibleVehicles =
    input.performance?.visibleVehicles ?? input.visibleVehicleCount;
  const textureMemoryEstimateMb =
    input.performance?.textureMemoryEstimateMb ??
    input.textureMemoryEstimateMb ??
    bytesToMegabytes(input.textureMemoryBytes);
  const missing = [
    frameTimeMs === null ? "frame time" : null,
    textureMemoryEstimateMb === null ? "texture memory estimate" : null
  ].filter((value): value is string => value !== null);

  return {
    draw_calls: drawCalls,
    frame_time_ms: frameTimeMs,
    visible_vehicles: visibleVehicles,
    texture_memory_estimate_mb: textureMemoryEstimateMb,
    source: input.performance?.source ?? "browser_telemetry",
    reason: input.performance?.reason ?? buildMissingPerformanceReason(missing)
  };
}

function bytesToMegabytes(bytes: number | null | undefined) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes)) {
    return null;
  }

  return Number((bytes / (1024 * 1024)).toFixed(2));
}

function buildMissingPerformanceReason(missing: string[]) {
  if (missing.length === 0) {
    return null;
  }

  if (missing.length === 1) {
    return `${missing[0]} was not reported by browser telemetry`;
  }

  return `${missing.slice(0, -1).join(", ")} and ${
    missing[missing.length - 1]
  } were not reported by browser telemetry`;
}

export function publishR3FTelemetryEvent(event: R3FTelemetryEvent) {
  if (typeof window !== "undefined") {
    window.__r3fTelemetryEvent = event;
  }

  return event;
}
