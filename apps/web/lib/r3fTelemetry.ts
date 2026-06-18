export type R3FTelemetryEvent = {
  renderer_mode: string | null;
  snapshot_source: string | null;
  frame_bound: boolean;
  draw_call_count: number | null;
  webgl_context_loss_count: number;
  fallback_reason: string | null;
  visible_vehicle_count: number | null;
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
    emitted_at: input.emittedAt ?? new Date().toISOString()
  };
}

export function publishR3FTelemetryEvent(event: R3FTelemetryEvent) {
  if (typeof window !== "undefined") {
    window.__r3fTelemetryEvent = event;
  }

  return event;
}
