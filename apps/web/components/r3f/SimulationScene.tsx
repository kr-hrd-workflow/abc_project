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
import { GANGNAM_NIGHT_GRADE } from "./seamlessGrade";
import { SignalLayer } from "./SignalLayer";
import { StructuralGuideLayer } from "./StructuralGuideLayer";
import { WheelSprayLayer } from "./WheelSprayLayer";
import type {
  Stage6QualityPreset,
  Stage6TimeOfDay,
  Stage6WeatherPresetName
} from "./stage6Quality";
import { getStage6QualityPreset } from "./stage6Quality";

export type SimulationViewpoint = "wide" | "cctv";

function resolveViewpoint(explicit?: SimulationViewpoint): SimulationViewpoint {
  if (explicit) return explicit;
  if (typeof window === "undefined") return "wide";
  return new URLSearchParams(window.location.search).get("viewpoint") === "cctv"
    ? "cctv"
    : "wide";
}

// Guide mode: ?guide=1 — suppresses plate, vehicles, PostFX and renders a flat
// structural guide (road layout + lane markings + building massing) for use as
// imagegen conditioning input. Normal scene is completely unaffected.
function resolveGuideMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("guide") === "1";
}

export function SimulationScene({
  sceneSnapshot,
  qualityPreset = getStage6QualityPreset("high"),
  weather = "rain",
  timeOfDay = "day",
  viewpoint
}: {
  sceneSnapshot: SceneSnapshot;
  qualityPreset?: Stage6QualityPreset;
  weather?: Stage6WeatherPresetName;
  timeOfDay?: Stage6TimeOfDay;
  viewpoint?: SimulationViewpoint;
}) {
  const isNight = timeOfDay === "night";
  // The CCTV viewpoint swaps to the low oblique camera + its matching plate so
  // traffic signals read at a glance (signal-control purpose). "wide" keeps the
  // default high operator view.
  const activeViewpoint = resolveViewpoint(viewpoint);
  const cameraPreset = activeViewpoint === "cctv" ? "operatorCctv" : undefined;
  const plateAngleId =
    activeViewpoint === "cctv" ? "operator-cctv" : "operator-wide";

  // Guide mode (?guide=1): suppress plate, vehicles, PostFX; render flat
  // structural guide. Camera stays aligned with the plate camera angles via
  // the same viewpoint/cameraPreset path so the guide matches the plate frame.
  const isGuide = resolveGuideMode();

  if (isGuide) {
    // Use "nightAerialProof" for wide (= STAGE5_CAMERA, exact plate-camera match)
    // and "operatorCctv" for cctv. No plate, no vehicles, no PostFX.
    const guideCameraPreset =
      activeViewpoint === "cctv" ? "operatorCctv" : "nightAerialProof";
    return (
      <group name="structural-guide-scene">
        <CameraRig preset={guideCameraPreset} />
        <StructuralGuideLayer />
      </group>
    );
  }

  return (
    <group name={`smart-intersection-stage5-${sceneSnapshot.trafficDensityMode}`}>
      <CameraRig weather={weather} timeOfDay={timeOfDay} preset={cameraPreset} />
      <SceneLighting
        isNight={isNight}
        sceneSnapshot={sceneSnapshot}
        qualityPreset={qualityPreset}
        weather={weather}
        timeOfDay={timeOfDay}
      />
      <BackgroundPlateBoundary timeOfDay={timeOfDay} angleId={plateAngleId} />
      <StaticRoadLayerWithDetails isNight={isNight} qualityPreset={qualityPreset} />
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
  timeOfDay,
  angleId = "operator-wide"
}: {
  timeOfDay: Stage6TimeOfDay;
  angleId?: string;
}) {
  return (
    <Suspense fallback={null}>
      <BackgroundPlateLayer angleId={angleId} timeOfDay={timeOfDay} />
    </Suspense>
  );
}

BackgroundPlateBoundary.displayName = "BackgroundPlateBoundary";

function StaticRoadLayerWithDetails(_props: {
  isNight: boolean;
  qualityPreset: Stage6QualityPreset;
}) {
  // Both day and night now project a photoreal plate (BackgroundPlateLayer) that
  // IS the road + city, so the entire procedural road/markings/curbs/clutter is
  // suppressed for both to avoid a second road overlapping the plate. Dynamic
  // vehicles carry their own contact shadows; the procedural surface is not
  // needed.
  return null;
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
