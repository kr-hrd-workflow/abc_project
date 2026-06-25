"use client";

import { Suspense } from "react";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { BackgroundPlateLayer } from "./BackgroundPlateLayer";
import { CameraRig } from "./CameraRig";
import { DynamicPedestrianLayer } from "./DynamicPedestrianLayer";
import { DynamicVehicleLayer } from "./DynamicVehicleLayer";
import { EnvironmentLayer } from "./EnvironmentLayer";
import { NightExposureSync, NightSeamlessPostFX } from "./NightSeamlessPostFX";
import { NightSeamlessLighting } from "./NightSeamlessLighting";
import { NightVehicleTreatment } from "./NightVehicleTreatment";
import { RoadDetailProps } from "./RoadDetailProps";
import { SceneClutterLayer } from "./SceneClutterLayer";
import { GANGNAM_NIGHT_GRADE } from "./seamlessGrade";
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
  const isNight = timeOfDay === "night";

  return (
    <group name={`smart-intersection-stage5-${sceneSnapshot.trafficDensityMode}`}>
      <CameraRig weather={weather} timeOfDay={timeOfDay} />
      <SceneLighting
        isNight={isNight}
        sceneSnapshot={sceneSnapshot}
        qualityPreset={qualityPreset}
        weather={weather}
        timeOfDay={timeOfDay}
      />
      <BackgroundPlateBoundary timeOfDay={timeOfDay} />
      <StaticRoadLayerWithDetails qualityPreset={qualityPreset} />
      <DynamicVehicleLayerWithWeather
        isNight={isNight}
        timeOfDay={timeOfDay}
        sceneSnapshot={sceneSnapshot}
        qualityPreset={qualityPreset}
      />
      <DynamicPedestrianLayer sceneSnapshot={sceneSnapshot} />
      <SignalLayer signals={sceneSnapshot.signals} />
      <SceneFinishing isNight={isNight} />
    </group>
  );
}

// Fresh night lighting (NightSeamlessLighting) replaces EnvironmentLayer's night
// preset at night per the reuse policy. The day path keeps EnvironmentLayer.
function SceneLighting({
  isNight,
  sceneSnapshot,
  qualityPreset,
  weather,
  timeOfDay
}: {
  isNight: boolean;
  sceneSnapshot: SceneSnapshot;
  qualityPreset: Stage6QualityPreset;
  weather: Stage6WeatherPresetName;
  timeOfDay: Stage6TimeOfDay;
}) {
  if (isNight) {
    return <NightSeamlessLighting />;
  }

  return (
    <EnvironmentLayer
      signals={sceneSnapshot.signals}
      qualityPreset={qualityPreset}
      weather={weather}
      timeOfDay={timeOfDay}
    />
  );
}

SceneLighting.displayName = "EnvironmentLayer";

// Fresh night image formation: ACES tonemap + bloom from the shared grade, plus
// the renderer-exposure sync. Mounted only at night; the day path runs the
// legacy Stage6PostFX at the Canvas level instead.
function SceneFinishing({ isNight }: { isNight: boolean }) {
  if (!isNight) {
    return null;
  }

  return (
    <>
      <NightExposureSync exposure={GANGNAM_NIGHT_GRADE.toneMappingExposure} />
      <NightSeamlessPostFX />
    </>
  );
}

SceneFinishing.displayName = "SceneFinishing";

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
  isNight,
  timeOfDay,
  sceneSnapshot,
  qualityPreset
}: {
  isNight: boolean;
  timeOfDay: Stage6TimeOfDay;
  sceneSnapshot: SceneSnapshot;
  qualityPreset: Stage6QualityPreset;
}) {
  const vehicles = (
    <DynamicVehicleLayer
      sceneSnapshot={sceneSnapshot}
      qualityPreset={qualityPreset}
    />
  );

  return (
    <>
      {isNight ? (
        // Fresh night grounding (emissive + contact shadow + wet reflection)
        // wraps the unchanged SUMO-truth vehicle layer. WheelSprayLayer (a wet
        // weather cue) stays out of the night path's grounding wrapper.
        <NightVehicleTreatment timeOfDay={timeOfDay}>
          {vehicles}
        </NightVehicleTreatment>
      ) : (
        <>
          {vehicles}
          <WheelSprayLayer
            sceneSnapshot={sceneSnapshot}
            qualityPreset={qualityPreset}
          />
        </>
      )}
    </>
  );
}

DynamicVehicleLayerWithWeather.displayName = "DynamicVehicleLayer";
