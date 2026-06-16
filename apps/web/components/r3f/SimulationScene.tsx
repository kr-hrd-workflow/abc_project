"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { ApproachCorridors } from "./ApproachCorridors";
import { ProceduralIntersection } from "./ProceduralIntersection";
import { STAGE3_CAMERA } from "./roadGeometry";
import { TrafficDensityLayer } from "./TrafficDensityLayer";

export function SimulationScene({
  sceneSnapshot
}: {
  sceneSnapshot: SceneSnapshot;
}) {
  return (
    <group name={`smart-intersection-stage3-${sceneSnapshot.trafficDensityMode}`}>
      <Stage3CameraRig />
      <color attach="background" args={["#101418"]} />
      <fog attach="fog" args={["#101418", 120, 430]} />
      <ambientLight intensity={0.42} />
      <directionalLight
        position={[58, 84, 46]}
        intensity={1.25}
        castShadow
      />
      <pointLight position={[-38, 18, -44]} intensity={0.65} color="#ffd79a" />
      <pointLight position={[44, 18, 38]} intensity={0.52} color="#9ec7ff" />
      <ApproachCorridors />
      <ProceduralIntersection />
      <TrafficDensityLayer sceneSnapshot={sceneSnapshot} />
    </group>
  );
}

function Stage3CameraRig() {
  const { camera, invalidate } = useThree();

  useEffect(() => {
    camera.position.set(...STAGE3_CAMERA.position);
    camera.near = STAGE3_CAMERA.near;
    camera.far = STAGE3_CAMERA.far;
    camera.lookAt(...STAGE3_CAMERA.target);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate]);

  return null;
}
