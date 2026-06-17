"use client";

import { Suspense, useEffect } from "react";
import { useThree, type RootState } from "@react-three/fiber";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { ApproachCorridors } from "./ApproachCorridors";
import { LightingRig } from "./LightingRig";
import { ProceduralIntersection } from "./ProceduralIntersection";
import { SignalHardware } from "./SignalHardware";
import { Stage5SceneAssets } from "./Stage5SceneAssets";
import { getStage5CameraForAspect } from "./roadGeometry";
import { TrafficDensityLayer } from "./TrafficDensityLayer";
import { WeatherAndAtmosphere } from "./WeatherAndAtmosphere";

export function SimulationScene({
  sceneSnapshot
}: {
  sceneSnapshot: SceneSnapshot;
}) {
  return (
    <group name={`smart-intersection-stage5-${sceneSnapshot.trafficDensityMode}`}>
      <Stage3CameraRig />
      <WeatherAndAtmosphere />
      <LightingRig />
      <ApproachCorridors />
      <ProceduralIntersection />
      <Suspense fallback={null}>
        <Stage5SceneAssets />
      </Suspense>
      <SignalHardware signals={sceneSnapshot.signals} />
      <TrafficDensityLayer sceneSnapshot={sceneSnapshot} />
    </group>
  );
}

function Stage3CameraRig() {
  const { camera, invalidate, size } = useThree();

  useEffect(() => {
    const cameraConfig = getStage5CameraForAspect(size.width / size.height);

    camera.position.set(...cameraConfig.position);
    camera.near = cameraConfig.near;
    camera.far = cameraConfig.far;
    const perspectiveCamera = camera as RootState["camera"] & { fov?: number };

    if (typeof perspectiveCamera.fov === "number") {
      perspectiveCamera.fov = cameraConfig.fov;
    }

    camera.lookAt(...cameraConfig.target);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, size.height, size.width]);

  return null;
}
