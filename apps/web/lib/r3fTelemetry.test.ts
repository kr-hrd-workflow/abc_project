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
      emitted_at: "2026-06-18T00:00:00.000Z"
    });

    expect(publishR3FTelemetryEvent(event)).toBe(event);
    expect(window.__r3fTelemetryEvent).toBe(event);
  });
});
