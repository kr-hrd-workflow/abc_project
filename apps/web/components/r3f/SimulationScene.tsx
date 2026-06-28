"use client";

import { Suspense } from "react";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { BackgroundPlateLayer } from "./BackgroundPlateLayer";
import { CameraRig } from "./CameraRig";
import { DynamicPedestrianLayer } from "./DynamicPedestrianLayer";
import { DynamicVehicleLayer } from "./DynamicVehicleLayer";
import { NightVehicleTreatment } from "./NightVehicleTreatment";
import { RoadSurfaceLayer } from "./RoadSurfaceLayer";
import { SceneEnvironment } from "./SceneEnvironment";
import { ScenePostFX } from "./ScenePostFX";
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
        viewpoint={activeViewpoint}
      />
      <DynamicPedestrianLayer sceneSnapshot={sceneSnapshot} />
      <SignalLayer signals={sceneSnapshot.signals} />
      <SceneFinishing isNight={isNight} qualityPreset={qualityPreset} />
    </group>
  );
}

// SceneEnvironment unifies day IBL + Sky + LightingRig + WeatherAndAtmosphere
// (day) and night IBL + neon lights (night) into one timeOfDay-aware component.
// Replaces the former split: EnvironmentLayer (day) vs NightSeamlessLighting (night).
function SceneLighting({
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
  return (
    <SceneEnvironment
      timeOfDay={timeOfDay}
      signals={sceneSnapshot.signals}
      qualityPreset={qualityPreset}
      weather={weather}
    />
  );
}

SceneLighting.displayName = "SceneEnvironment";

// ScenePostFX — unified EffectComposer for day AND night. Stage6PostFX (day) has
// been removed from SimulationCanvas so this is now the only EffectComposer.
// Night uses Bloom-only (no ACES — plate is display-referred). Day uses the full
// pipeline (ToneMapping ACES + SSAO + Bloom + Noise + Vignette).
function SceneFinishing({
  isNight,
  qualityPreset
}: {
  isNight: boolean;
  qualityPreset: Stage6QualityPreset;
}) {
  return (
    <ScenePostFX
      timeOfDay={isNight ? "night" : "day"}
      qualityPreset={qualityPreset}
    />
  );
}

SceneFinishing.displayName = "ScenePostFX";

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

function StaticRoadLayerWithDetails({
  isNight
}: {
  isNight: boolean;
  qualityPreset: Stage6QualityPreset;
}) {
  // R1: Render the polished production road from geometry so SUMO vehicles
  // always sit on metrically-accurate lane lines. The plate continues to supply
  // buildings/skyline; the rendered road sits on top and covers the central road
  // region. Far-end overlap with plate buildings is the lead's follow-up.
  // Wrapped in Suspense because RoadSurfaceLayer uses useTexture (asphalt.webp).
  return (
    <Suspense fallback={null}>
      <RoadSurfaceLayer isNight={isNight} />
    </Suspense>
  );
}

StaticRoadLayerWithDetails.displayName = "StaticRoadLayer";

function DynamicVehicleLayerWithWeather({
  isNight,
  timeOfDay,
  sceneSnapshot,
  qualityPreset,
  viewpoint = "wide"
}: {
  isNight: boolean;
  timeOfDay: Stage6TimeOfDay;
  sceneSnapshot: SceneSnapshot;
  qualityPreset: Stage6QualityPreset;
  viewpoint?: SimulationViewpoint;
}) {
  const vehicles = (
    <DynamicVehicleLayer
      sceneSnapshot={sceneSnapshot}
      qualityPreset={qualityPreset}
      viewpoint={viewpoint}
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
