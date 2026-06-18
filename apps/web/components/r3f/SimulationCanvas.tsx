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
  SRGBColorSpace,
  type WebGLRenderer
} from "three";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import {
  buildR3FTelemetryEvent,
  publishR3FTelemetryEvent
} from "../../lib/r3fTelemetry";
import { SimulationScene } from "./SimulationScene";
import { STAGE5_CAMERA, getStage5CameraForAspect } from "./roadGeometry";

export const STAGE5_DRAW_CALL_BUDGET = 250;
export const STAGE5_TONE_MAPPING_EXPOSURE = 2.55;

export type Stage5CanvasProof = {
  renderer: "r3f";
  stage: 5;
  drawCallBudget: number;
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  canvasWidth: number;
  canvasHeight: number;
  drawingBufferWidth: number;
  drawingBufferHeight: number;
  devicePixelRatio: number;
  canvasConnected: boolean;
  contextLost: boolean;
  contextLossEvents: number;
  updatedAt: string;
};

declare global {
  interface Window {
    __r3fSimulationCanvasProof?: Stage5CanvasProof;
    __r3fSimulationCanvasElement?: HTMLCanvasElement;
    __r3fSimulationMaxDrawCalls?: number;
    __r3fSimulationReadPixels?: () => {
      width: number;
      height: number;
      pixelsBase64: string;
    };
  }
}

const canvasContextLossEvents = new WeakMap<HTMLCanvasElement, { count: number }>();
const noop = () => {};

export function SimulationCanvas({
  sceneSnapshot
}: {
  sceneSnapshot: SceneSnapshot;
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
      dpr={[1, 1.5]}
      frameloop="demand"
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
      {renderScene ? <SimulationScene sceneSnapshot={sceneSnapshot} /> : null}
    </Canvas>
  );
}

export function configureStage5Renderer(renderer: WebGLRenderer) {
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = STAGE5_TONE_MAPPING_EXPOSURE;
  renderer.shadowMap.enabled = false;
}

export function buildStage5CanvasProof(
  renderer: WebGLRenderer,
  contextLossEvents = 0
): Stage5CanvasProof {
  const canvas = renderer.domElement;
  const context = renderer.getContext();

  return {
    renderer: "r3f",
    stage: 5,
    drawCallBudget: STAGE5_DRAW_CALL_BUDGET,
    drawCalls: getStage5DrawCalls(renderer),
    triangles: renderer.info.render.triangles,
    points: renderer.info.render.points,
    lines: renderer.info.render.lines,
    canvasWidth: canvas.clientWidth || canvas.width,
    canvasHeight: canvas.clientHeight || canvas.height,
    drawingBufferWidth: canvas.width,
    drawingBufferHeight: canvas.height,
    devicePixelRatio: renderer.getPixelRatio(),
    canvasConnected: canvas.isConnected,
    contextLost:
      typeof context.isContextLost === "function" ? context.isContextLost() : false,
    contextLossEvents,
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
    const cleanupScheduledPublish = scheduleStage5CanvasProofPublish(gl);

    publishStage5CanvasProof(gl, getContextLossEventCount(gl));

    return () => {
      cleanupScheduledPublish();
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

function getStage5DrawCalls(renderer: WebGLRenderer) {
  const currentDrawCalls = renderer.info.render.calls;
  const maxDrawCalls =
    typeof window !== "undefined" ? window.__r3fSimulationMaxDrawCalls ?? 0 : 0;

  return Math.max(currentDrawCalls, maxDrawCalls);
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
      visibleVehicleCount
    })
  );
}

function readNumberAttribute(element: Element | null, name: string) {
  const value = Number(element?.getAttribute(name));

  return Number.isFinite(value) ? value : null;
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
