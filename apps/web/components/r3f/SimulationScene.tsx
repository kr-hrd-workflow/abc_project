"use client";

import { Suspense } from "react";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { BuildingLayer } from "./BuildingLayer";
import { CameraRig } from "./CameraRig";
import { DynamicPedestrianLayer } from "./DynamicPedestrianLayer";
import { DynamicVehicleLayer } from "./DynamicVehicleLayer";
import { MarkingDecalLayer } from "./MarkingDecalLayer";
import { NightVehicleTreatment } from "./NightVehicleTreatment";
import { PhotorealPlate } from "./PhotorealPlate";
import { getCmpAGlobalXShiftMeters } from "./plateVehicleCalibration";
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

// Photobash view: ?photobash=1 — NO plate. Renders the textured asphalt road
// (vector markings suppressed) + MarkingDecalLayer textured marking decals (which
// reuse the same metric marking specs, so they are structurally aligned with the
// lanes/vehicles) + live vehicles, signals, lighting, and post-FX. Gated exactly
// like ?guide=1 / ?photoreal=1, so the default and photoreal scenes are unaffected.
function resolvePhotobashMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("photobash") === "1";
}

// DIAGNOSTIC COMPARISON (?cmp=A|B) — experimental, only meaningful with
// ?photoreal=1. Absent ?cmp the default is the v5 plate (overlay OFF); these are
// roadlock-plate diagnostics layered on top of resolvePlateChoice.
//   A = plain-asphalt plate (no painted lanes) + R3F markings overlay ON  → a
//       single, non-doubled lane set with vehicles centred in it.
//   B = roadlock plate's painted lanes + R3F markings overlay OFF + URL-driven
//       per-approach vehicle lateral calibration (?calB=, see
//       plateVehicleCalibration) so live vehicles seat on the plate's lanes.
function resolveCmpMode(): "A" | "B" | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("cmp");
  return v === "A" || v === "B" ? v : null;
}

// PLATE CHOICE (?photoreal=1) — the dense-canyon cover-v5 road-lock plate is the
// PRODUCTION DEFAULT. The v5 plate already carries its own painted lanes + 4-way
// crosswalks, so the R3F lane-markings overlay is OFF for it (the plate supplies
// the road). ?plate=roadlock is the escape hatch back to the legacy geometry-locked
// plate (which DOES get the R3F overlay).
//
// ⚠️ LOCKED DECISION — do NOT turn the R3F overlay ON for v5. v5's baked lanes are
// offset from the metric projection, so overlaying the metric R3F lanes DOUBLES
// them (render-verified 2026-06-30; see the SimulationScenePhotoreal guardrail test
// and apps/web/AGENTS.md). roadlock is geometry-locked so its overlay lands clean.
function resolvePlateChoice(): "v5" | "roadlock" {
  if (typeof window === "undefined") return "v5";
  return new URLSearchParams(window.location.search).get("plate") === "roadlock"
    ? "roadlock"
    : "v5";
}

// DIAGNOSTIC (?cmp=A): the markings overlay + vehicles are registered onto the
// plain plate via a SINGLE GLOBAL +X group translate (the dx8.5 mechanism) — one
// <group> wraps the R3F markings and the live vehicles so they move TOGETHER by
// getCmpAGlobalXShiftMeters() metres in world X (default 8.5, tunable via
// ?cmpAdx= without a rebuild). N/S arms shift laterally; E/W arms shift along
// their travel axis. No per-corridor offset, no west rotation, no far-extension.

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
  // Photobash mode (?photobash=1): plate-free textured-asphalt road + decal
  // markings + live vehicles/signals. See resolvePhotobashMode.
  const isPhotobash = resolvePhotobashMode();
  const cmpMode = resolveCmpMode();
  const plateChoice = resolvePlateChoice();

  if (isPhotoreal) {
    // Plate precedence: cmp=A → plain diagnostic plate; cmp=B → roadlock (its
    // calibration diagnostic); ?plate=roadlock → roadlock escape hatch; otherwise
    // the v5 production default.
    const useRoadlock = plateChoice === "roadlock" || cmpMode === "B";
    const plateVariant =
      cmpMode === "A" ? "plain" : useRoadlock ? "roadlock" : "v5";
    // R3F lane-markings overlay is ON only for the geometry-locked plates: the
    // plain cmp=A plate and the roadlock plate (when not the cmp=B calibration
    // diagnostic). The v5 default keeps it OFF — overlaying its baked lanes with
    // the metric R3F lanes DOUBLES them (render-verified). ⚠️ DO NOT flip v5 ON;
    // the SimulationScenePhotoreal guardrail test pins this.
    const showR3fMarkings =
      cmpMode === "A" || (plateVariant === "roadlock" && cmpMode !== "B");
    // cmp=A is a clean road-registration diagnostic: hide the heavy 3D scene
    // except the plate + R3F markings + live vehicles + signals (+ depth
    // occluders). Pedestrians and the distant atmospheric scenery are suppressed
    // (the scenery caused a light-leak); signals stay ON so live signal state
    // reads against the plate. Committed photoreal + cmp=B keep everything.
    const isCmpA = cmpMode === "A";
    return (
      <group name="photoreal-production-scene">
        <CameraRig preset="operatorWide" weather="clear" timeOfDay="day" />
        <SceneLighting
          isNight={isNight}
          sceneSnapshot={sceneSnapshot}
          qualityPreset={qualityPreset}
          weather="clear"
          timeOfDay={timeOfDay}
          suppressAtmosphericScenery={isCmpA}
        />
        <PhotorealPlate timeOfDay={timeOfDay} variant={plateVariant} />
        {/* Metric-exact road MARKINGS composited on the plate. The plate's
            imagegen road grid is rotated/offset from the metric projection and
            its lane spacing ≠ 3.6 m, so a screen-space plate offset/scale cannot
            seat all four approaches. Drawing the geometry-derived lane lines,
            중앙선, 정지선 and crosswalks on top makes the visible lanes metric-exact,
            so the live vehicles (same getInboundLaneOffset SSOT) sit centred in
            them. Asphalt stays from the plate (markingsOnly).
            cmp=A (dx8.5): the markings + vehicles are wrapped in ONE group and
            translated together by a single GLOBAL +X shift
            (getCmpAGlobalXShiftMeters, default 8.5, ?cmpAdx=). Committed photoreal
            + cmp=B render them flat (no shift). */}
        {isCmpA && (
          <group
            name="cmp-a-dx85-shift"
            position={[getCmpAGlobalXShiftMeters(), 0, 0]}
          >
            {showR3fMarkings && (
              <Suspense fallback={null}>
                <RoadSurfaceLayer isNight={isNight} markingsOnly cmpA />
              </Suspense>
            )}
            <DynamicVehicleLayerWithWeather
              isNight={isNight}
              timeOfDay={timeOfDay}
              sceneSnapshot={sceneSnapshot}
              qualityPreset={qualityPreset}
              viewpoint="wide"
            />
          </group>
        )}
        {!isCmpA && showR3fMarkings && (
          <Suspense fallback={null}>
            <RoadSurfaceLayer isNight={isNight} markingsOnly />
          </Suspense>
        )}
        {!isCmpA && (
          <DynamicVehicleLayerWithWeather
            isNight={isNight}
            timeOfDay={timeOfDay}
            sceneSnapshot={sceneSnapshot}
            qualityPreset={qualityPreset}
            viewpoint="wide"
          />
        )}
        {!isCmpA && <DynamicPedestrianLayer sceneSnapshot={sceneSnapshot} />}
        {/* cmp=A keeps SIGNALS ON (live signal state is wanted back). The earlier
            light-leak came from the distant backdrop (suppressAtmosphericScenery),
            not the signal hardware, so signals render in cmp=A too. */}
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

  if (isPhotobash) {
    // Plate-free photobash scene: textured asphalt road with its flat vector
    // markings SUPPRESSED, and MarkingDecalLayer's textured marking decals on top
    // (same metric specs → structurally aligned with the lanes the vehicles use).
    // No PhotorealPlate. Vehicles, signals, lighting, and post-FX mirror the
    // default scene.
    return (
      <group name="photobash-scene">
        <CameraRig preset="operatorWide" weather={weather} timeOfDay={timeOfDay} />
        <SceneLighting
          isNight={isNight}
          sceneSnapshot={sceneSnapshot}
          qualityPreset={qualityPreset}
          weather={weather}
          timeOfDay={timeOfDay}
        />
        <Suspense fallback={null}>
          <RoadSurfaceLayer isNight={isNight} suppressVectorMarkings />
        </Suspense>
        <MarkingDecalLayer />
        <DynamicVehicleLayerWithWeather
          isNight={isNight}
          timeOfDay={timeOfDay}
          sceneSnapshot={sceneSnapshot}
          qualityPreset={qualityPreset}
          viewpoint="wide"
        />
        <SignalLayer signals={sceneSnapshot.signals} />
        <SceneFinishing isNight={isNight} qualityPreset={qualityPreset} />
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
