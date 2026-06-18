"use client";

import { memo } from "react";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { TrafficDensityLayer } from "./TrafficDensityLayer";

function DynamicVehicleLayerComponent({
  sceneSnapshot
}: {
  sceneSnapshot: SceneSnapshot;
}) {
  return (
    <group
      name={`stage5-dynamic-vehicle-layer-${sceneSnapshot.trafficDensityMode}`}
      userData={{
        trafficDensityMode: sceneSnapshot.trafficDensityMode,
        preciseVehicleSource: sceneSnapshot.preciseVehicleSource,
        densityFillSource: sceneSnapshot.densityFillSource
      }}
    >
      <TrafficDensityLayer sceneSnapshot={sceneSnapshot} />
    </group>
  );
}

export const DynamicVehicleLayer = memo(DynamicVehicleLayerComponent);
DynamicVehicleLayer.displayName = "DynamicVehicleLayer";
