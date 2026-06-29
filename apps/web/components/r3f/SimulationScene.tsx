"use client";

import { Suspense } from "react";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { BuildingLayer } from "./BuildingLayer";
import { CameraRig } from "./CameraRig";
import { DynamicPedestrianLayer } from "./DynamicPedestrianLayer";
import { DynamicVehicleLayer } from "./DynamicVehicleLayer";
import { NightVehicleTreatment } from "./NightVehicleTreatment";
import { PhotorealPlate } from "./PhotorealPlate";
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

// Production photoreal view: ?photoreal=1 — mounts the fixed photoreal empty-road
// 강남역 plate as the full-canvas screen-space backdrop and composites the live
// SUMO vehicles, pedestrians, and signals on top at the operator-wide camera,
// with the 3D buildings and 3D road SUPPRESSED (metric building footprints stay
// on as depth-only occluders). It is a supported, opt-in mode gated exactly like
// ?guide=1, so the default scene is completely unaffected.
function resolvePhotorealMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("photoreal") === "1";
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

  // Production photoreal view (?photoreal=1): photoreal plate backdrop + live
  // vehicles, pedestrians, and signals composited on top. Buildings + 3D road
  // suppressed. The camera is pinned to the operator-wide day/clear rig because
  // rain/night would add a shake offset (CameraRig) that misregisters the fixed
  // screen-space plate; lighting, plate, vehicles, and signals still follow the
  // real timeOfDay so day and night both read correctly. Post-FX mirrors the
  // normal scene (day: ACES pipeline; night: Bloom-only).
  const isPhotoreal = resolvePhotorealMode();

  if (isPhotoreal) {
    return (
      <group name="photoreal-production-scene">
        <CameraRig preset="operatorWide" weather="clear" timeOfDay="day" />
        <SceneLighting
          isNight={isNight}
          sceneSnapshot={sceneSnapshot}
          qualityPreset={qualityPreset}
          weather="clear"
          timeOfDay={timeOfDay}
        />
        <PhotorealPlate timeOfDay={timeOfDay} />
        {/* Metric-exact road MARKINGS composited on the plate. The plate's
            imagegen road grid is rotated/offset from the metric projection and
            its lane spacing ≠ 3.6 m, so a screen-space plate offset/scale cannot
            seat all four approaches. Drawing the geometry-derived lane lines,
            중앙선, 정지선 and crosswalks on top makes the visible lanes metric-exact,
            so the live vehicles (same getInboundLaneOffset SSOT) sit centred in
            them. Asphalt stays from the plate (markingsOnly). */}
        <Suspense fallback={null}>
          <RoadSurfaceLayer isNight={isNight} markingsOnly />
        </Suspense>
        <DynamicVehicleLayerWithWeather
          isNight={isNight}
          timeOfDay={timeOfDay}
          sceneSnapshot={sceneSnapshot}
          qualityPreset={qualityPreset}
          viewpoint="wide"
        />
        <DynamicPedestrianLayer sceneSnapshot={sceneSnapshot} />
        <SignalLayer
          signals={sceneSnapshot.signals}
          lightingPreset={isNight ? "night" : "day"}
        />
        <SceneFinishing isNight={isNight} qualityPreset={qualityPreset} />
      </group>
    );
  }

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
