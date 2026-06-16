"use client";

import { Canvas } from "@react-three/fiber";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { SimulationScene } from "./SimulationScene";
import { STAGE3_CAMERA } from "./roadGeometry";

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
        position: STAGE3_CAMERA.position,
        fov: STAGE3_CAMERA.fov,
        near: STAGE3_CAMERA.near,
        far: STAGE3_CAMERA.far
      }}
      frameloop="demand"
    >
      {renderScene ? <SimulationScene sceneSnapshot={sceneSnapshot} /> : null}
    </Canvas>
  );
}

function isJsdomRuntime() {
  return (
    typeof window !== "undefined" &&
    /jsdom/i.test(window.navigator.userAgent)
  );
}
