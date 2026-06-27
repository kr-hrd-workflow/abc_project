"use client";

import { memo } from "react";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import type { SimulationViewpoint } from "./SimulationScene";
import type { Stage6QualityPreset } from "./stage6Quality";
import { getStage6QualityPreset } from "./stage6Quality";
import { TrafficDensityLayer } from "./TrafficDensityLayer";

function DynamicVehicleLayerComponent({
  sceneSnapshot,
  qualityPreset = getStage6QualityPreset("high"),
  viewpoint = "wide"
}: {
  sceneSnapshot: SceneSnapshot;
  qualityPreset?: Stage6QualityPreset;
  viewpoint?: SimulationViewpoint;
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
      <TrafficDensityLayer
        sceneSnapshot={sceneSnapshot}
        qualityPreset={qualityPreset}
        viewpoint={viewpoint}
      />
    </group>
  );
}

export const DynamicVehicleLayer = memo(DynamicVehicleLayerComponent);
DynamicVehicleLayer.displayName = "DynamicVehicleLayer";
