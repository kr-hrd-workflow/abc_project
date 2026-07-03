"use client";

import { Suspense } from "react";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { BuildingLayer } from "./BuildingLayer";
import { CameraRig } from "./CameraRig";
import { DynamicPedestrianLayer } from "./DynamicPedestrianLayer";
import { DynamicVehicleLayer } from "./DynamicVehicleLayer";
import { GroundDressingLayer } from "./GroundDressingLayer";
import { LimitedOrbitControls } from "./LimitedOrbitControls";
import { MarkingDecalLayer } from "./MarkingDecalLayer";
import { NightVehicleTreatment } from "./NightVehicleTreatment";
import { RoadSurfaceLayer } from "./RoadSurfaceLayer";
import { SceneEnvironment } from "./SceneEnvironment";
import { ScenePostFX } from "./ScenePostFX";
import { deriveSignalLightingPreset, SignalLayer } from "./SignalLayer";
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

// Guide mode: ?guide=1 — suppresses buildings, vehicles, PostFX and renders a
// flat structural guide (road layout + lane markings + building massing) for use
// as imagegen conditioning input. The default scene is unaffected.
function resolveGuideMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("guide") === "1";
}

// ?roadonly=1 — imagegen base tooling: strips buildings, vehicles, signals and
// post-FX, leaving only the metric road + lane decals as a clean alignment
// anchor for image generation. Kept for the facade/backdrop regen workflows.
function resolveRoadOnlyMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("roadonly") === "1";
}

// The default scene IS the photobash composition (promoted 2026-07-02; the
// former vector-marking stage5 branch and the ?photoreal plate branch were
// retired — see apps/web/AGENTS.md locked decisions). ?photobash=1 is accepted
// as a no-op alias for old bookmarks and render tooling.
export function SimulationScene({
  sceneSnapshot,
  qualityPreset = getStage6QualityPreset("high"),
  weather = "clear",
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
  const activeViewpoint = resolveViewpoint(viewpoint);
  const cameraPreset =
    activeViewpoint === "cctv" ? "operatorCctv" : "operatorWide";

  if (resolveGuideMode()) {
    // "nightAerialProof" for wide (= STAGE5_CAMERA, exact guide-camera match)
    // and "operatorCctv" for cctv. No vehicles, no PostFX.
    const guideCameraPreset =
      activeViewpoint === "cctv" ? "operatorCctv" : "nightAerialProof";
    return (
      <group name="structural-guide-scene">
        <CameraRig preset={guideCameraPreset} />
        <StructuralGuideLayer />
      </group>
    );
  }

  const isRoadOnly = resolveRoadOnlyMode();
  return (
    <group name="photobash-scene">
      <CameraRig
        key={cameraPreset}
        preset={cameraPreset}
        weather={weather}
        timeOfDay={timeOfDay}
      />
      <LimitedOrbitControls key={`orbit-${cameraPreset}`} />
      <SceneLighting
        isNight={isNight}
        sceneSnapshot={sceneSnapshot}
        qualityPreset={qualityPreset}
        weather={weather}
        timeOfDay={timeOfDay}
        suppressAtmosphericScenery={isRoadOnly}
      />
      {!isRoadOnly && (
        <BuildingLayerBoundary timeOfDay={timeOfDay} qualityPreset={qualityPreset} />
      )}
      <Suspense fallback={null}>
        <RoadSurfaceLayer isNight={isNight} suppressVectorMarkings />
      </Suspense>
      {!isRoadOnly && <GroundDressingLayer isNight={isNight} />}
      <MarkingDecalLayer />
      {!isRoadOnly && (
        <DynamicVehicleLayerWithWeather
          isNight={isNight}
          timeOfDay={timeOfDay}
          sceneSnapshot={sceneSnapshot}
          qualityPreset={qualityPreset}
          viewpoint={activeViewpoint}
        />
      )}
      {!isRoadOnly && <DynamicPedestrianLayer sceneSnapshot={sceneSnapshot} />}
      {!isRoadOnly && (
        <SignalLayer
          signals={sceneSnapshot.signals}
          lightingPreset={deriveSignalLightingPreset(weather, timeOfDay)}
        />
      )}
      {!isRoadOnly && (
        <SceneFinishing isNight={isNight} qualityPreset={qualityPreset} />
      )}
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
  timeOfDay,
  suppressAtmosphericScenery = false
}: {
  isNight: boolean;
  sceneSnapshot: SceneSnapshot;
  qualityPreset: Stage6QualityPreset;
  weather: Stage6WeatherPresetName;
  timeOfDay: Stage6TimeOfDay;
  suppressAtmosphericScenery?: boolean;
}) {
  return (
    <SceneEnvironment
      timeOfDay={timeOfDay}
      signals={sceneSnapshot.signals}
      qualityPreset={qualityPreset}
      weather={weather}
      suppressAtmosphericScenery={suppressAtmosphericScenery}
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

// P2: 3D photoreal building layer replaces the AI scene-plate as the source of
// buildings, sky, and horizon.  The plate system was deleted 2026-07-02.
// True 3D geometry means vehicles are occluded by buildings via the depth
// buffer (no more depth-only proxy boxes).
function BuildingLayerBoundary({
  timeOfDay,
  qualityPreset
}: {
  timeOfDay: Stage6TimeOfDay;
  qualityPreset: Stage6QualityPreset;
}) {
  return (
    <Suspense fallback={null}>
      <BuildingLayer timeOfDay={timeOfDay} qualityPreset={qualityPreset} />
    </Suspense>
  );
}

BuildingLayerBoundary.displayName = "BuildingLayer";

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
