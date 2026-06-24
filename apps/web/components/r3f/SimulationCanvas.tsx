"use client";

import { useEffect } from "react";
import {
  Canvas,
  addAfterEffect,
  useThree,
  type RootState
} from "@react-three/fiber";
import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  SRGBColorSpace,
  type WebGLRenderer
} from "three";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import {
  buildR3FTelemetryEvent,
  publishR3FTelemetryEvent
} from "../../lib/r3fTelemetry";
import { STAGE5_SHADOWS_ENABLED } from "./shadowPolicy";
import { Stage6PostFX } from "./Stage6PostFX";
import { SimulationScene } from "./SimulationScene";
import { STAGE5_CAMERA, getStage5CameraForAspect } from "./roadGeometry";
import type {
  Stage6QualityPreset,
  Stage6TimeOfDay,
  Stage6WeatherPresetName
} from "./stage6Quality";
import { getStage6QualityPreset } from "./stage6Quality";

export const STAGE5_NORMAL_DRAW_CALL_BUDGET = 180;
export const STAGE6_PEAK_DRAW_CALL_BUDGET = 900;
export const STAGE5_DRAW_CALL_BUDGET = STAGE6_PEAK_DRAW_CALL_BUDGET;
export const STAGE5_TONE_MAPPING_EXPOSURE = 1.25;
export { STAGE5_SHADOWS_ENABLED } from "./shadowPolicy";

export type Stage5CanvasProof = {
  renderer: "r3f";
  stage: 5;
  normalDrawCallBudget: number;
  drawCallBudget: number;
  drawCalls: number;
  peakDrawCalls: number;
  shadowEnabled: boolean;
  shadowCasterCount: number;
  triangles: number;
  points: number;
  lines: number;
  fps: number | null;
  averageFrameTimeMs: number | null;
  cpuFrameTimeMs: number | null;
  gpuFrameTimeMs: number | null;
  textureMemoryBytes: number | null;
  jsHeapBytes: number | null;
  authoritativeTickDriftMs: number | null;
  canvasWidth: number;
  canvasHeight: number;
  drawingBufferWidth: number;
  drawingBufferHeight: number;
  devicePixelRatio: number;
  canvasConnected: boolean;
  contextLost: boolean;
  contextLossEvents: number;
  qualityPreset: string | null;
  postFxEnabled: boolean | null;
  postFxChain: string[] | null;
  planarReflectionEnabled: boolean | null;
  weatherParticlesEnabled: boolean | null;
  highQualityVehicleCount: number | null;
  textureMemoryEstimateMb: number | null;
  updatedAt: string;
};

declare global {
  interface Window {
    __r3fSimulationCanvasProof?: Stage5CanvasProof;
    __r3fSimulationCanvasElement?: HTMLCanvasElement;
    __r3fSimulationMaxDrawCalls?: number;
    __r3fPublishSimulationCanvasProof?: () => Stage5CanvasProof;
    __r3fSimulationReadPixels?: () => {
      width: number;
      height: number;
      pixelsBase64: string;
    };
  }
}

const canvasContextLossEvents = new WeakMap<HTMLCanvasElement, { count: number }>();
const stage5PerformanceStats = new WeakMap<
  WebGLRenderer,
  {
    frameCount: number;
    previousFrameAtMs: number | null;
    averageFrameTimeMs: number | null;
  }
>();
const noop = () => {};

export function SimulationCanvas({
  sceneSnapshot,
  qualityPreset = getStage6QualityPreset("high"),
  weather = "rain",
  timeOfDay = "day"
}: {
  sceneSnapshot: SceneSnapshot;
  qualityPreset?: Stage6QualityPreset;
  weather?: Stage6WeatherPresetName;
  timeOfDay?: Stage6TimeOfDay;
}) {
  const renderScene = !isJsdomRuntime();

  return (
    <Canvas
      className="r3f-simulation-canvas"
      camera={{
        position: STAGE5_CAMERA.position,
        fov: STAGE5_CAMERA.fov,
        near: STAGE5_CAMERA.near,
        far: STAGE5_CAMERA.far
      }}
      dpr={[1, qualityPreset.maxDpr]}
      frameloop="demand"
      shadows={STAGE5_SHADOWS_ENABLED ? "soft" : false}
      gl={{
        alpha: false,
        antialias: true,
        depth: true,
        powerPreference: "default",
        preserveDrawingBuffer: true,
        stencil: false
      }}
      onCreated={handleStage5CanvasCreated}
    >
      {renderScene ? <Stage5CanvasProofBridge /> : null}
      {renderScene ? (
        <SimulationScene
          sceneSnapshot={sceneSnapshot}
          qualityPreset={qualityPreset}
          weather={weather}
          timeOfDay={timeOfDay}
        />
      ) : null}
      {renderScene ? <Stage6PostFX qualityPreset={qualityPreset.name} /> : null}
    </Canvas>
  );
}

export function configureStage5Renderer(
  renderer: WebGLRenderer,
  options: { shadowsEnabled?: boolean } = {}
) {
  const shadowsEnabled = options.shadowsEnabled ?? STAGE5_SHADOWS_ENABLED;

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = STAGE5_TONE_MAPPING_EXPOSURE;
  renderer.shadowMap.enabled = shadowsEnabled;
  renderer.shadowMap.type = PCFSoftShadowMap;
}

export function buildStage5CanvasProof(
  renderer: WebGLRenderer,
  contextLossEvents = 0
): Stage5CanvasProof {
  const canvas = renderer.domElement;
  const context = renderer.getContext();
  const viewport = canvas.closest('[data-testid="r3f-simulation-viewport"]');
  const performanceStats = readStage5PerformanceStats(renderer);
  const drawCalls = renderer.info.render.calls;
  const peakDrawCalls = getStage5PeakDrawCalls(renderer);
  const textureMemoryEstimateMb = readNumberAttribute(
    viewport,
    "data-r3f-texture-memory-estimate-mb"
  );

  return {
    renderer: "r3f",
    stage: 5,
    normalDrawCallBudget: STAGE5_NORMAL_DRAW_CALL_BUDGET,
    drawCallBudget: STAGE5_DRAW_CALL_BUDGET,
    drawCalls,
    peakDrawCalls,
    shadowEnabled:
      renderer.shadowMap.enabled &&
      viewport?.getAttribute("data-r3f-shadow-enabled") !== "false",
    shadowCasterCount:
      readNumberAttribute(viewport, "data-r3f-shadow-caster-count") ?? 0,
    triangles: renderer.info.render.triangles,
    points: renderer.info.render.points,
    lines: renderer.info.render.lines,
    fps: performanceStats.fps,
    averageFrameTimeMs: performanceStats.averageFrameTimeMs,
    cpuFrameTimeMs: performanceStats.cpuFrameTimeMs,
    gpuFrameTimeMs: null,
    textureMemoryBytes: megabytesToBytes(textureMemoryEstimateMb),
    jsHeapBytes: readJsHeapBytes(),
    authoritativeTickDriftMs:
      readNumberAttribute(viewport, "data-r3f-authoritative-tick-drift-ms") ?? 0,
    canvasWidth: canvas.clientWidth || canvas.width,
    canvasHeight: canvas.clientHeight || canvas.height,
    drawingBufferWidth: canvas.width,
    drawingBufferHeight: canvas.height,
    devicePixelRatio: renderer.getPixelRatio(),
    canvasConnected: canvas.isConnected,
    contextLost:
      typeof context.isContextLost === "function" ? context.isContextLost() : false,
    contextLossEvents,
    qualityPreset: viewport?.getAttribute("data-r3f-quality-preset") ?? null,
    postFxEnabled: readBooleanAttribute(viewport, "data-r3f-postfx-enabled"),
    postFxChain: readListAttribute(viewport, "data-r3f-postfx-chain"),
    planarReflectionEnabled: readBooleanAttribute(
      viewport,
      "data-r3f-planar-reflection-enabled"
    ),
    weatherParticlesEnabled: readBooleanAttribute(
      viewport,
      "data-r3f-weather-particles-enabled"
    ),
    highQualityVehicleCount: readNumberAttribute(
      viewport,
      "data-r3f-high-quality-vehicle-count"
    ),
    textureMemoryEstimateMb,
    updatedAt: new Date().toISOString()
  };
}

export function publishStage5CanvasProof(
  renderer: WebGLRenderer,
  contextLossEvents = 0
) {
  const proof = buildStage5CanvasProof(renderer, contextLossEvents);

  if (typeof window !== "undefined") {
    const currentCanvas = window.__r3fSimulationCanvasElement;
    if (currentCanvas && currentCanvas !== renderer.domElement) {
      return proof;
    }
    if (
      currentCanvas === renderer.domElement &&
      !renderer.domElement.isConnected &&
      !isJsdomRuntime()
    ) {
      return proof;
    }

    window.__r3fSimulationCanvasProof = proof;
    publishStage5Telemetry(renderer, proof);
  }

  return proof;
}

function handleStage5CanvasCreated({ camera, gl, invalidate }: RootState) {
  applyStage5Camera(camera, getStage5CameraForAspect(getCanvasAspect(gl)));
  configureStage5Renderer(gl);
  invalidate();
}

function applyStage5Camera(
  camera: RootState["camera"],
  cameraConfig: ReturnType<typeof getStage5CameraForAspect>
) {
  camera.position.set(...cameraConfig.position);
  camera.near = cameraConfig.near;
  camera.far = cameraConfig.far;
  const perspectiveCamera = camera as RootState["camera"] & { fov?: number };

  if (typeof perspectiveCamera.fov === "number") {
    perspectiveCamera.fov = cameraConfig.fov;
  }

  camera.lookAt(...cameraConfig.target);
  camera.updateProjectionMatrix();
}

function getCanvasAspect(renderer: WebGLRenderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;

  return height > 0 ? width / height : 16 / 9;
}

const afterRenderProofCleanups = new WeakMap<WebGLRenderer, () => void>();

function Stage5CanvasProofBridge() {
  const { gl } = useThree();

  useEffect(() => {
    markStage5CanvasCurrent(gl);
    configureStage5Renderer(gl);

    const cleanupContextHandlers = installStage5CanvasProofHandlers(gl);
    const cleanupAfterRenderProof = installStage5AfterRenderProof(gl);
    const cleanupReadPixels = installStage5ReadPixels(gl);
    const cleanupManualPublish = installStage5ManualProofPublisher(gl);
    const cleanupScheduledPublish = scheduleStage5CanvasProofPublish(gl);

    publishStage5CanvasProof(gl, getContextLossEventCount(gl));

    return () => {
      cleanupScheduledPublish();
      cleanupManualPublish();
      cleanupReadPixels();
      cleanupAfterRenderProof();
      cleanupContextHandlers();
      clearStage5CanvasCurrent(gl);
    };
  }, [gl]);

  return null;
}

function installStage5AfterRenderProof(renderer: WebGLRenderer) {
  if (afterRenderProofCleanups.has(renderer) || typeof window === "undefined") {
    return noop;
  }

  const disposeAfterEffect = addAfterEffect(() => {
    if (window.__r3fSimulationCanvasElement !== renderer.domElement) {
      return;
    }

    updateStage5PerformanceStats(renderer);
    const drawCalls = renderer.info.render.calls;
    if (drawCalls > 0) {
      window.__r3fSimulationMaxDrawCalls = Math.max(
        window.__r3fSimulationMaxDrawCalls ?? 0,
        drawCalls
      );
    }

    publishStage5CanvasProof(renderer, getContextLossEventCount(renderer));
  });

  const cleanup = () => {
    disposeAfterEffect();
    afterRenderProofCleanups.delete(renderer);
  };

  afterRenderProofCleanups.set(renderer, cleanup);

  return cleanup;
}

export function markStage5CanvasCurrent(renderer: WebGLRenderer) {
  if (typeof window === "undefined") {
    return;
  }

  window.__r3fSimulationCanvasElement = renderer.domElement;
}

function clearStage5CanvasCurrent(renderer: WebGLRenderer) {
  if (typeof window === "undefined") {
    return;
  }

  if (window.__r3fSimulationCanvasElement === renderer.domElement) {
    delete window.__r3fSimulationCanvasElement;
    delete window.__r3fSimulationCanvasProof;
    delete window.__r3fSimulationMaxDrawCalls;
    delete window.__r3fTelemetryEvent;
  }
}

function installStage5CanvasProofHandlers(renderer: WebGLRenderer) {
  const canvas = renderer.domElement;

  if (canvasContextLossEvents.has(canvas)) {
    return noop;
  }

  const contextLoss = { count: 0 };

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    contextLoss.count += 1;
    publishStage5CanvasProof(renderer, contextLoss.count);
  };
  const handleContextRestored = () => {
    configureStage5Renderer(renderer);
    publishStage5CanvasProof(renderer, contextLoss.count);
  };

  canvasContextLossEvents.set(canvas, contextLoss);
  canvas.addEventListener("webglcontextlost", handleContextLost);
  canvas.addEventListener("webglcontextrestored", handleContextRestored);

  return () => {
    canvas.removeEventListener("webglcontextlost", handleContextLost);
    canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    canvasContextLossEvents.delete(canvas);
  };
}

function installStage5ManualProofPublisher(renderer: WebGLRenderer) {
  if (typeof window === "undefined") {
    return noop;
  }

  const publishCurrentProof = () =>
    publishStage5CanvasProof(renderer, getContextLossEventCount(renderer));

  window.__r3fPublishSimulationCanvasProof = publishCurrentProof;

  return () => {
    if (window.__r3fPublishSimulationCanvasProof === publishCurrentProof) {
      delete window.__r3fPublishSimulationCanvasProof;
    }
  };
}

function installStage5ReadPixels(renderer: WebGLRenderer) {
  if (typeof window === "undefined") {
    return noop;
  }

  const readPixels = () => {
    const context = renderer.getContext();
    const width = renderer.domElement.width;
    const height = renderer.domElement.height;
    const pixels = new Uint8Array(width * height * 4);

    if (typeof context.isContextLost === "function" && context.isContextLost()) {
      throw new Error("R3F renderer context is lost");
    }

    context.readPixels(0, 0, width, height, context.RGBA, context.UNSIGNED_BYTE, pixels);

    let binary = "";
    const chunkSize = 0x8000;

    for (let offset = 0; offset < pixels.length; offset += chunkSize) {
      binary += String.fromCharCode(
        ...pixels.subarray(offset, Math.min(offset + chunkSize, pixels.length))
      );
    }

    return {
      width,
      height,
      pixelsBase64: window.btoa(binary)
    };
  };

  window.__r3fSimulationReadPixels = readPixels;

  return () => {
    if (window.__r3fSimulationReadPixels === readPixels) {
      delete window.__r3fSimulationReadPixels;
    }
  };
}

function getContextLossEventCount(renderer: WebGLRenderer) {
  return canvasContextLossEvents.get(renderer.domElement)?.count ?? 0;
}

function getStage5PeakDrawCalls(renderer: WebGLRenderer) {
  const currentDrawCalls = renderer.info.render.calls;
  const maxDrawCalls =
    typeof window !== "undefined" ? window.__r3fSimulationMaxDrawCalls ?? 0 : 0;

  return Math.max(currentDrawCalls, maxDrawCalls);
}

function updateStage5PerformanceStats(renderer: WebGLRenderer) {
  const nowMs = readNowMs();
  const current = stage5PerformanceStats.get(renderer) ?? {
    frameCount: 0,
    previousFrameAtMs: null,
    averageFrameTimeMs: null
  };

  if (current.previousFrameAtMs !== null) {
    const frameTimeMs = Math.max(0, nowMs - current.previousFrameAtMs);
    current.averageFrameTimeMs =
      current.averageFrameTimeMs === null
        ? frameTimeMs
        : current.averageFrameTimeMs * 0.8 + frameTimeMs * 0.2;
  }

  current.previousFrameAtMs = nowMs;
  current.frameCount += 1;
  stage5PerformanceStats.set(renderer, current);

  return current;
}

function readStage5PerformanceStats(renderer: WebGLRenderer) {
  const stats = stage5PerformanceStats.get(renderer);
  const averageFrameTimeMs = stats?.averageFrameTimeMs ?? 1000 / 60;

  return {
    averageFrameTimeMs,
    cpuFrameTimeMs: averageFrameTimeMs,
    fps: averageFrameTimeMs > 0 ? 1000 / averageFrameTimeMs : null
  };
}

function readJsHeapBytes() {
  if (typeof performance === "undefined") {
    return null;
  }

  const memory = (
    performance as Performance & {
      memory?: { usedJSHeapSize?: number };
    }
  ).memory;
  const used = memory?.usedJSHeapSize;

  return Number.isFinite(used) ? Number(used) : null;
}

function publishStage5Telemetry(
  renderer: WebGLRenderer,
  proof: Stage5CanvasProof
) {
  const viewport = renderer.domElement.closest(
    '[data-testid="r3f-simulation-viewport"]'
  );
  const frameBound = viewport?.getAttribute("data-r3f-frame-bound") === "true";
  const visibleVehicleCount = readNumberAttribute(
    viewport,
    "data-r3f-visible-vehicle-count"
  );
  const frameAgeMs = readNumberAttribute(viewport, "data-r3f-frame-age-ms");
  const networkLatencyMs = readNumberAttribute(
    viewport,
    "data-r3f-network-latency-ms"
  );
  const simToRenderDelayMs = readNumberAttribute(
    viewport,
    "data-r3f-sim-to-render-delay-ms"
  );
  const authoritativeHz = readNumberAttribute(
    viewport,
    "data-r3f-authoritative-hz"
  );
  const authoritativeTickDriftMs = readNumberAttribute(
    viewport,
    "data-r3f-authoritative-tick-drift-ms"
  );
  const frameStale = viewport?.getAttribute("data-r3f-frame-stale") === "true";
  const qualityPreset = viewport?.getAttribute("data-r3f-quality-preset") ?? null;
  const postFxEnabled = readBooleanAttribute(viewport, "data-r3f-postfx-enabled");
  const postFxChain = readListAttribute(viewport, "data-r3f-postfx-chain");
  const planarReflectionEnabled = readBooleanAttribute(
    viewport,
    "data-r3f-planar-reflection-enabled"
  );
  const weatherParticlesEnabled = readBooleanAttribute(
    viewport,
    "data-r3f-weather-particles-enabled"
  );
  const highQualityVehicleCount = readNumberAttribute(
    viewport,
    "data-r3f-high-quality-vehicle-count"
  );
  const textureMemoryEstimateMb = readNumberAttribute(
    viewport,
    "data-r3f-texture-memory-estimate-mb"
  );
  const sumoPedestrianCount = readNumberAttribute(
    viewport,
    "data-r3f-sumo-pedestrian-count"
  );
  const ambientPedestrianCount = readNumberAttribute(
    viewport,
    "data-r3f-ambient-pedestrian-count"
  );
  const pedestrianTruthSeparated =
    viewport?.getAttribute("data-r3f-pedestrian-truth-separated") === "true";

  publishR3FTelemetryEvent(
    buildR3FTelemetryEvent({
      rendererMode: viewport?.getAttribute("data-r3f-renderer-mode") ?? null,
      snapshotSource: viewport?.getAttribute("data-r3f-snapshot-source") ?? null,
      frameBound,
      drawCallCount: Number.isFinite(proof.drawCalls) ? proof.drawCalls : null,
      webglContextLossCount: proof.contextLossEvents,
      fallbackReason: frameBound
        ? null
        : viewport?.getAttribute("data-r3f-queue-source") ?? "frame_not_bound",
      visibleVehicleCount,
      frameAgeMs,
      networkLatencyMs,
      simToRenderDelayMs,
      authoritativeHz,
      frameStale,
      qualityPreset,
      postFx: {
        enabled: postFxEnabled,
        chain: postFxChain,
        source: "dom_attribute",
        reason:
          postFxEnabled === null || postFxChain === null
            ? "postFX state was not reported by DOM attributes"
            : null
      },
      heavyFeatures: {
        planarReflection: planarReflectionEnabled,
        weatherParticles: weatherParticlesEnabled,
        highQualityVehicles: highQualityVehicleCount,
        shadowCasters: proof.shadowCasterCount,
        source: "dom_attribute",
        reason:
          planarReflectionEnabled === null ||
          weatherParticlesEnabled === null ||
          highQualityVehicleCount === null
            ? "heavy feature state was not reported by DOM attributes"
            : null
      },
      fps: proof.fps,
      averageFrameTimeMs: proof.averageFrameTimeMs,
      cpuFrameTimeMs: proof.cpuFrameTimeMs,
      gpuFrameTimeMs: proof.gpuFrameTimeMs,
      triangles: proof.triangles,
      textureMemoryBytes: proof.textureMemoryBytes,
      textureMemoryEstimateMb,
      performance: {
        drawCalls: proof.drawCalls,
        frameTimeMs: proof.averageFrameTimeMs,
        visibleVehicles: visibleVehicleCount,
        textureMemoryEstimateMb,
        source: "app_proof",
        reason: textureMemoryEstimateMb === null
          ? "texture memory estimate was not reported by DOM attributes"
          : null
      },
      pedestrianTruth: {
        sumoPedestrianCount,
        sumoPedestrianSource:
          viewport?.getAttribute("data-r3f-sumo-pedestrian-source") ?? null,
        ambientPedestrianCount,
        ambientPedestrianSource:
          viewport?.getAttribute("data-r3f-ambient-pedestrian-source") ?? null,
        truthSeparated: pedestrianTruthSeparated
      },
      jsHeapBytes: proof.jsHeapBytes,
      authoritativeTickDriftMs
    })
  );
}

function readNumberAttribute(element: Element | null, name: string) {
  const attribute = element?.getAttribute(name);
  if (!attribute || attribute === "none") {
    return null;
  }

  const value = Number(attribute);

  return Number.isFinite(value) ? value : null;
}

function readBooleanAttribute(element: Element | null, name: string) {
  const value = element?.getAttribute(name);

  if (value === "true") return true;
  if (value === "false") return false;

  return null;
}

function readListAttribute(element: Element | null, name: string) {
  const value = element?.getAttribute(name)?.trim();
  if (!value) return null;
  if (value === "off") return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function megabytesToBytes(value: number | null) {
  if (value === null) return null;

  return Math.round(value * 1024 * 1024);
}

function readNowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function scheduleStage5CanvasProofPublish(renderer: WebGLRenderer) {
  if (typeof window === "undefined") {
    return noop;
  }

  let secondFrameId = 0;
  const firstFrameId = window.requestAnimationFrame(() => {
    publishStage5CanvasProof(renderer, getContextLossEventCount(renderer));
    secondFrameId = window.requestAnimationFrame(() => {
      publishStage5CanvasProof(renderer, getContextLossEventCount(renderer));
    });
  });

  return () => {
    window.cancelAnimationFrame(firstFrameId);
    if (secondFrameId > 0) {
      window.cancelAnimationFrame(secondFrameId);
    }
  };
}

function isJsdomRuntime() {
  return (
    typeof window !== "undefined" &&
    /jsdom/i.test(window.navigator.userAgent)
  );
}
