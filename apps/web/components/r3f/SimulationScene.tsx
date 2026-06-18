"use client";

import { useEffect } from "react";
import { useThree, type RootState } from "@react-three/fiber";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { DynamicVehicleLayer } from "./DynamicVehicleLayer";
import { EnvironmentLayer } from "./EnvironmentLayer";
import { getStage5CameraForAspect } from "./roadGeometry";
import { SignalLayer } from "./SignalLayer";
import { StaticRoadLayer } from "./StaticRoadLayer";

export function SimulationScene({
  sceneSnapshot
}: {
  sceneSnapshot: SceneSnapshot;
}) {
  return (
    <group name={`smart-intersection-stage5-${sceneSnapshot.trafficDensityMode}`}>
      <Stage3CameraRig />
      <EnvironmentLayer />
      <StaticRoadLayer />
      <DynamicVehicleLayer sceneSnapshot={sceneSnapshot} />
      <SignalLayer signals={sceneSnapshot.signals} />
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
