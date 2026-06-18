// @vitest-environment jsdom

import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  SRGBColorSpace,
  type WebGLRenderer
} from "three";
import { Children, isValidElement, type ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";

import {
  STAGE5_DRAW_CALL_BUDGET,
  STAGE5_NORMAL_DRAW_CALL_BUDGET,
  STAGE5_SHADOWS_ENABLED,
  STAGE5_TONE_MAPPING_EXPOSURE,
  buildStage5CanvasProof,
  configureStage5Renderer,
  markStage5CanvasCurrent,
  publishStage5CanvasProof
} from "./SimulationCanvas";
import type { SceneSnapshot } from "./buildSceneSnapshot";
import { buildFixtureSceneSnapshot } from "./buildSceneSnapshot";
import {
  STAGE5_NEAR_VEHICLE_SHADOW_LIMIT,
  STAGE5_SHADOW_CASTER_LIMIT,
  STAGE5_STREETLIGHT_SHADOW_CASTER_COUNT,
  getStage5ShadowCasterCount
} from "./shadowPolicy";
import {
  STAGE3_CAMERA,
  STAGE5_CAMERA,
  getStage5CameraForAspect
} from "./roadGeometry";
import { SimulationScene } from "./SimulationScene";
import type {
  SimulationDensitySegment,
  SimulationSignalSnapshot,
  SimulationVehicleSnapshot
} from "../../lib/simulationSnapshot";

function createWebGLContextMock(
  contextLost = false
): ReturnType<WebGLRenderer["getContext"]> {
  return {
    isContextLost: () => contextLost
  } as unknown as ReturnType<WebGLRenderer["getContext"]>;
}

function createRenderer(overrides: Partial<WebGLRenderer> = {}) {
  const canvas = document.createElement("canvas");
  Object.defineProperties(canvas, {
    clientWidth: { value: 640 },
    clientHeight: { value: 360 }
  });
  canvas.width = 960;
  canvas.height = 540;

  return {
    domElement: canvas,
    getContext: vi.fn(() => createWebGLContextMock(false)),
    getPixelRatio: vi.fn(() => 1.5),
    info: {
      render: {
        calls: 128,
        triangles: 42000,
        points: 0,
        lines: 12
      }
    },
    outputColorSpace: "",
    shadowMap: {
      enabled: false,
      type: 0
    },
    toneMapping: 0,
    toneMappingExposure: 1,
    ...overrides
  } as unknown as WebGLRenderer;
}

describe("SimulationCanvas Stage 5 telemetry", () => {
  test("uses a centered oblique corridor camera without hiding behind city edges", () => {
    const [cameraX, cameraY, cameraZ] = STAGE5_CAMERA.position;
    const [targetX, targetY, targetZ] = STAGE5_CAMERA.target;
    const horizontalDistance = Math.hypot(cameraX - targetX, cameraZ - targetZ);
    const elevationAngleDegrees =
      Math.atan2(cameraY - targetY, horizontalDistance) * (180 / Math.PI);

    expect(Math.abs(cameraX - targetX)).toBeGreaterThanOrEqual(18);
    expect(Math.abs(cameraX - targetX)).toBeLessThanOrEqual(34);
    expect(cameraY).toBeLessThanOrEqual(86);
    expect(cameraY).toBeGreaterThan(STAGE3_CAMERA.position[1]);
    expect(elevationAngleDegrees).toBeGreaterThan(24);
    expect(elevationAngleDegrees).toBeLessThan(34);
    expect(STAGE5_CAMERA.fov).toBeGreaterThanOrEqual(46);
    expect(Math.abs(targetX)).toBeLessThanOrEqual(8);
    expect(targetZ).toBeGreaterThanOrEqual(-36);
    expect(targetZ).toBeLessThanOrEqual(-18);
  });

  test("widens and recenters the Stage 5 camera on tall mobile viewports", () => {
    const desktopCamera = getStage5CameraForAspect(914 / 680);
    const mobileCamera = getStage5CameraForAspect(390 / 844);
    const mobileProofCanvasCamera = getStage5CameraForAspect(552 / 561);
    const desktopHorizontalDistance = Math.hypot(
      STAGE5_CAMERA.position[0] - STAGE5_CAMERA.target[0],
      STAGE5_CAMERA.position[2] - STAGE5_CAMERA.target[2]
    );
    const mobileHorizontalDistance = Math.hypot(
      mobileCamera.position[0] - mobileCamera.target[0],
      mobileCamera.position[2] - mobileCamera.target[2]
    );

    expect(desktopCamera).toBe(STAGE5_CAMERA);
    expect(mobileCamera).not.toBe(STAGE5_CAMERA);
    expect(mobileProofCanvasCamera).toBe(mobileCamera);
    expect(Math.abs(mobileCamera.position[0])).toBeLessThan(
      Math.abs(STAGE5_CAMERA.position[0])
    );
    expect(mobileHorizontalDistance).toBeLessThan(desktopHorizontalDistance * 0.55);
    expect(mobileCamera.position[1]).toBeLessThan(STAGE5_CAMERA.position[1]);
    expect(mobileCamera.fov).toBeGreaterThanOrEqual(74);
    expect(mobileCamera.target[2]).toBeGreaterThanOrEqual(-12);
  });

  test("keeps Stage 5 exposure high enough for wet-road detail without washing out lights", () => {
    expect(STAGE5_TONE_MAPPING_EXPOSURE).toBeGreaterThanOrEqual(2.4);
    expect(STAGE5_TONE_MAPPING_EXPOSURE).toBeLessThanOrEqual(2.7);
  });

  test("configures restrained renderer settings and publishes draw-call proof without React state", () => {
    const renderer = createRenderer();
    const viewport = document.createElement("div");
    viewport.dataset.testid = "r3f-simulation-viewport";
    viewport.setAttribute("data-r3f-renderer-mode", "r3f_photoreal_stage5");
    viewport.setAttribute("data-r3f-snapshot-source", "simulation_snapshot_fixture");
    viewport.setAttribute("data-r3f-frame-bound", "true");
    viewport.setAttribute("data-r3f-visible-vehicle-count", "160");
    viewport.setAttribute("data-r3f-shadow-enabled", "true");
    viewport.setAttribute("data-r3f-shadow-caster-count", "18");
    viewport.append(renderer.domElement);
    document.body.append(viewport);

    configureStage5Renderer(renderer);
    const proof = publishStage5CanvasProof(renderer);

    expect(renderer.outputColorSpace).toBe(SRGBColorSpace);
    expect(renderer.toneMapping).toBe(ACESFilmicToneMapping);
    expect(renderer.toneMappingExposure).toBe(STAGE5_TONE_MAPPING_EXPOSURE);
    expect(renderer.shadowMap.enabled).toBe(STAGE5_SHADOWS_ENABLED);
    expect(renderer.shadowMap.type).toBe(PCFSoftShadowMap);
    expect(proof).toEqual(
      expect.objectContaining({
        renderer: "r3f",
        stage: 5,
        normalDrawCallBudget: STAGE5_NORMAL_DRAW_CALL_BUDGET,
        drawCallBudget: STAGE5_DRAW_CALL_BUDGET,
        drawCalls: 128,
        peakDrawCalls: 128,
        shadowEnabled: true,
        shadowCasterCount: 18,
        triangles: 42000,
        averageFrameTimeMs: expect.any(Number),
        fps: expect.any(Number),
        cpuFrameTimeMs: expect.any(Number),
        gpuFrameTimeMs: null,
        textureMemoryBytes: null,
        jsHeapBytes: null,
        authoritativeTickDriftMs: 0,
        lines: 12,
        canvasWidth: 640,
        canvasHeight: 360,
        drawingBufferWidth: 960,
        drawingBufferHeight: 540,
        devicePixelRatio: 1.5,
        contextLost: false,
        contextLossEvents: 0
      })
    );
    expect(window.__r3fSimulationCanvasProof).toBe(proof);
    expect(window.__r3fTelemetryEvent).toEqual(
      expect.objectContaining({
        renderer_mode: "r3f_photoreal_stage5",
        snapshot_source: "simulation_snapshot_fixture",
        frame_bound: true,
        draw_call_count: 128,
        webgl_context_loss_count: 0,
        fallback_reason: null,
        visible_vehicle_count: 160
      })
    );
  });

  test("keeps renderer shadows behind the explicit whitelist gate", () => {
    const enabledRenderer = createRenderer();
    const disabledRenderer = createRenderer();

    configureStage5Renderer(enabledRenderer, { shadowsEnabled: true });
    configureStage5Renderer(disabledRenderer, { shadowsEnabled: false });

    expect(enabledRenderer.shadowMap.enabled).toBe(true);
    expect(enabledRenderer.shadowMap.type).toBe(PCFSoftShadowMap);
    expect(disabledRenderer.shadowMap.enabled).toBe(false);
  });

  test("bounds real shadow casters to near vehicles, signal hardware, and streetlights", () => {
    const sceneSnapshot = buildShadowCountSceneSnapshot({
      vehicleCount: STAGE5_NEAR_VEHICLE_SHADOW_LIMIT + 9,
      includeDensity: true
    });
    const withoutDensity = {
      ...sceneSnapshot,
      densitySegments: []
    } satisfies SceneSnapshot;
    const expectedCasterCount =
      STAGE5_NEAR_VEHICLE_SHADOW_LIMIT +
      8 +
      STAGE5_STREETLIGHT_SHADOW_CASTER_COUNT;

    expect(getStage5ShadowCasterCount(sceneSnapshot)).toBe(expectedCasterCount);
    expect(getStage5ShadowCasterCount(withoutDensity)).toBe(expectedCasterCount);
    expect(getStage5ShadowCasterCount(sceneSnapshot)).toBeLessThanOrEqual(
      STAGE5_SHADOW_CASTER_LIMIT
    );
  });

  test("composes the R3F scene through stable static and dynamic layers", () => {
    const sceneSnapshot = buildShadowCountSceneSnapshot({ vehicleCount: 2 });
    const scene = SimulationScene({ sceneSnapshot });

    expect(getChildDisplayNames(scene)).toEqual([
      "Stage3CameraRig",
      "EnvironmentLayer",
      "StaticRoadLayer",
      "DynamicVehicleLayer",
      "SignalLayer"
    ]);
  });

  test("marks context loss in the browser-readable proof object", () => {
    const renderer = createRenderer({
      getContext: vi.fn(() => createWebGLContextMock(true))
    });

    const proof = buildStage5CanvasProof(renderer, 1);

    expect(proof.contextLost).toBe(true);
    expect(proof.contextLossEvents).toBe(1);
  });

  test("does not let a stale disposed canvas overwrite current proof", () => {
    const currentRenderer = createRenderer();
    const staleRenderer = createRenderer({
      getContext: vi.fn(() => createWebGLContextMock(true))
    });

    markStage5CanvasCurrent(currentRenderer);
    const currentProof = publishStage5CanvasProof(currentRenderer);
    const staleProof = publishStage5CanvasProof(staleRenderer, 1);

    expect(staleProof.contextLossEvents).toBe(1);
    expect(window.__r3fSimulationCanvasProof).toBe(currentProof);
  });
});

function buildShadowCountSceneSnapshot({
  vehicleCount,
  includeDensity = false
}: {
  vehicleCount: number;
  includeDensity?: boolean;
}): SceneSnapshot {
  const baseSnapshot = buildFixtureSceneSnapshot({
    queues: { north: 0, south: 0, east: 0, west: 0 },
    events: []
  });

  return {
    ...baseSnapshot,
    source: "simulation_snapshot_fixture",
    vehicles: buildVehicles(vehicleCount),
    densitySegments: includeDensity ? [buildDensitySegment()] : [],
    signals: buildSignals(),
    preciseVehicleSource: vehicleCount > 0 ? "simulation_frame_snapshot" : "none",
    allowsDensityFill: includeDensity,
    densityFillSource: includeDensity ? "density_segments" : "none",
    trafficDensityMode: includeDensity ? "density_segments" : "snapshot_vehicles",
    queueSource: "frame"
  };
}

function buildVehicles(count: number): SimulationVehicleSnapshot[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `vehicle-${index}`,
    vehicle_type: index % 5 === 0 ? "bus" : "car",
    lane_id: `lane-${index}`,
    x_meters: index % 2 === 0 ? index : -index,
    y_meters: 12 + index,
    heading_degrees: index % 2 === 0 ? 180 : 0,
    speed_mps: 2,
    waiting_seconds: index,
    emergency: false
  }));
}

function buildSignals(): SimulationSignalSnapshot[] {
  return (["north", "south", "east", "west"] as const).map(
    (direction, index) => ({
      signal_id: `${direction}-main`,
      direction,
      state: index === 0 ? "green" : "red",
      seconds_remaining: 20
    })
  );
}

function buildDensitySegment(): SimulationDensitySegment {
  return {
    segment_id: "north-heavy-density",
    approach: "north",
    start_meters_from_stop_line: 10,
    end_meters_from_stop_line: 120,
    lane_count: 3,
    vehicle_count: 999,
    average_speed_mps: 2.2,
    source: "aggregate_density_proxy"
  };
}

function getChildDisplayNames(element: ReactElement) {
  return Children.toArray(element.props.children)
    .filter(isValidElement)
    .map((child) => getElementDisplayName(child as ReactElement));
}

function getElementDisplayName(element: ReactElement) {
  const type = element.type;

  if (typeof type === "string") return type;
  if (typeof type === "symbol") return type.description ?? "symbol";
  if ("displayName" in type && typeof type.displayName === "string") {
    return type.displayName;
  }
  if ("name" in type && typeof type.name === "string") {
    return type.name;
  }

  return "unknown";
}
