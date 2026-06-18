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
  fps: number | null;
  average_frame_time_ms: number | null;
  cpu_frame_time_ms: number | null;
  gpu_frame_time_ms: number | null;
  triangles: number | null;
  texture_memory_bytes: number | null;
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
  fps?: number | null;
  averageFrameTimeMs?: number | null;
  cpuFrameTimeMs?: number | null;
  gpuFrameTimeMs?: number | null;
  triangles?: number | null;
  textureMemoryBytes?: number | null;
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
    fps: input.fps ?? null,
    average_frame_time_ms: input.averageFrameTimeMs ?? null,
    cpu_frame_time_ms: input.cpuFrameTimeMs ?? null,
    gpu_frame_time_ms: input.gpuFrameTimeMs ?? null,
    triangles: input.triangles ?? null,
    texture_memory_bytes: input.textureMemoryBytes ?? null,
    js_heap_bytes: input.jsHeapBytes ?? null,
    authoritative_tick_drift_ms: input.authoritativeTickDriftMs ?? null,
    emitted_at: input.emittedAt ?? new Date().toISOString()
  };
}

export function publishR3FTelemetryEvent(event: R3FTelemetryEvent) {
  if (typeof window !== "undefined") {
    window.__r3fTelemetryEvent = event;
  }

  return event;
}
