"use client";

import { Suspense } from "react";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { BackgroundPlateLayer } from "./BackgroundPlateLayer";
import { CameraRig } from "./CameraRig";
import { DynamicPedestrianLayer } from "./DynamicPedestrianLayer";
import { DynamicVehicleLayer } from "./DynamicVehicleLayer";
import { EnvironmentLayer } from "./EnvironmentLayer";
import { RoadDetailProps } from "./RoadDetailProps";
import { SceneClutterLayer } from "./SceneClutterLayer";
import { SignalLayer } from "./SignalLayer";
import { StaticRoadLayer } from "./StaticRoadLayer";
import { WheelSprayLayer } from "./WheelSprayLayer";
import type {
  Stage6QualityPreset,
  Stage6TimeOfDay,
  Stage6WeatherPresetName
} from "./stage6Quality";
import { getStage6QualityPreset } from "./stage6Quality";

export function SimulationScene({
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
  return (
    <group name={`smart-intersection-stage5-${sceneSnapshot.trafficDensityMode}`}>
      <CameraRig weather={weather} timeOfDay={timeOfDay} />
      <EnvironmentLayer
        signals={sceneSnapshot.signals}
        qualityPreset={qualityPreset}
        weather={weather}
        timeOfDay={timeOfDay}
      />
      <BackgroundPlateBoundary timeOfDay={timeOfDay} />
      <StaticRoadLayerWithDetails qualityPreset={qualityPreset} />
      <DynamicVehicleLayerWithWeather
        sceneSnapshot={sceneSnapshot}
        qualityPreset={qualityPreset}
      />
      <DynamicPedestrianLayer sceneSnapshot={sceneSnapshot} />
      <SignalLayer signals={sceneSnapshot.signals} />
    </group>
  );
}

// Mounts the night background plate behind a Suspense boundary so a missing or
// still-loading plate degrades to the procedural background already present in
// the scene (BackgroundPlateLayer itself is a no-op for the day path).
function BackgroundPlateBoundary({
  timeOfDay
}: {
  timeOfDay: Stage6TimeOfDay;
}) {
  return (
    <Suspense fallback={null}>
      <BackgroundPlateLayer angleId="operator-wide" timeOfDay={timeOfDay} />
    </Suspense>
  );
}

BackgroundPlateBoundary.displayName = "BackgroundPlateBoundary";

function StaticRoadLayerWithDetails({
  qualityPreset
}: {
  qualityPreset: Stage6QualityPreset;
}) {
  return (
    <>
      <StaticRoadLayer qualityPreset={qualityPreset} />
      <RoadDetailProps />
      <SceneClutterLayer />
    </>
  );
}

StaticRoadLayerWithDetails.displayName = "StaticRoadLayer";

function DynamicVehicleLayerWithWeather({
  sceneSnapshot,
  qualityPreset
}: {
  sceneSnapshot: SceneSnapshot;
  qualityPreset: Stage6QualityPreset;
}) {
  return (
    <>
      <DynamicVehicleLayer
        sceneSnapshot={sceneSnapshot}
        qualityPreset={qualityPreset}
      />
      <WheelSprayLayer
        sceneSnapshot={sceneSnapshot}
        qualityPreset={qualityPreset}
      />
    </>
  );
}

DynamicVehicleLayerWithWeather.displayName = "DynamicVehicleLayer";
