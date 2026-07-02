"use client";

import { Suspense } from "react";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { BuildingLayer } from "./BuildingLayer";
import { CameraRig } from "./CameraRig";
import { DynamicPedestrianLayer } from "./DynamicPedestrianLayer";
import { DynamicVehicleLayer } from "./DynamicVehicleLayer";
import { LimitedOrbitControls } from "./LimitedOrbitControls";
import { MarkingDecalLayer } from "./MarkingDecalLayer";
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

// Photobash view: ?photobash=1 — NO plate. Renders the textured asphalt road
// (vector markings suppressed) + MarkingDecalLayer textured marking decals (which
// reuse the same metric marking specs, so they are structurally aligned with the
// lanes/vehicles) + live vehicles, signals, lighting, and post-FX. Gated exactly
// like ?guide=1, so the default scene is completely unaffected.
function resolvePhotobashMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("photobash") === "1";
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

  // Guide mode (?guide=1): suppress buildings, vehicles, PostFX; render flat
  // structural guide. Camera stays aligned with the 3D scene camera via the
  // same viewpoint/cameraPreset path so the guide matches the live scene frame.
  const isGuide = resolveGuideMode();

  // Photobash mode (?photobash=1): plate-free textured-asphalt road + decal
  // markings + live vehicles/signals. See resolvePhotobashMode.
  const isPhotobash = resolvePhotobashMode();

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

  if (isPhotobash) {
    // Plate-free photobash scene: textured asphalt road with its flat vector
    // markings SUPPRESSED, and MarkingDecalLayer's textured marking decals on top
    // (same metric specs → structurally aligned with the lanes the vehicles use).
    // No PhotorealPlate. Vehicles, signals, lighting, and post-FX mirror the
    // default scene.
    //
    // ?roadonly=1 strips buildings, vehicles, signals and post-FX, leaving only
    // the metric road + lane decals. This is the clean base fed to imagegen for a
    // photoreal "plate B": no building boxes in the input → imagegen invents real
    // Gangnam buildings freely while the road geometry stays the alignment anchor.
    const isRoadOnly =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("roadonly") === "1";
    return (
      <group name="photobash-scene">
        <CameraRig preset="operatorWide" weather={weather} timeOfDay={timeOfDay} />
        <LimitedOrbitControls />
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
        <MarkingDecalLayer />
        {!isRoadOnly && (
          <DynamicVehicleLayerWithWeather
            isNight={isNight}
            timeOfDay={timeOfDay}
            sceneSnapshot={sceneSnapshot}
            qualityPreset={qualityPreset}
            viewpoint="wide"
          />
        )}
        {!isRoadOnly && <SignalLayer signals={sceneSnapshot.signals} />}
        {!isRoadOnly && (
          <SceneFinishing isNight={isNight} qualityPreset={qualityPreset} />
        )}
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
      <BuildingLayerBoundary timeOfDay={timeOfDay} qualityPreset={qualityPreset} />
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
// buildings, sky, and horizon.  BackgroundPlateLayer is retained in the repo as
// a reference asset but is no longer mounted.  True 3D geometry means vehicles
// are occluded by buildings via the depth buffer (no more depth-only proxy boxes).
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
