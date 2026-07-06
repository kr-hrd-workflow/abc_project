"use client";

import { memo, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { PMREMGenerator, type Scene, type WebGLRenderer } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { GANGNAM_NIGHT_GRADE } from "./seamlessGrade";
import { LightingRig } from "./LightingRig";
import { WeatherAndAtmosphere } from "./WeatherAndAtmosphere";
import type { SceneSnapshot } from "./buildSceneSnapshot";
import type {
  Stage6QualityPreset,
  Stage6TimeOfDay,
  Stage6WeatherPresetName
} from "./stage6Quality";
import { getStage6QualityPreset } from "./stage6Quality";

// Day IBL settings — brighter/sharper than the legacy rain preset for outdoor.
const DAY_IBL_BLUR = 0.014;
const DAY_IBL_INTENSITY = 0.82;

// Night IBL settings — dark, neon-warm.
const NIGHT_IBL_BLUR = 0.06;

type NightEnvConfig = {
  environmentIntensity: number;
  neonColor: string;
  groundBounceColor: string;
  ambientIntensity: number;
  keyIntensity: number;
};

function resolveNightEnvConfig(): NightEnvConfig {
  return {
    environmentIntensity: GANGNAM_NIGHT_GRADE.environmentIntensity,
    neonColor: GANGNAM_NIGHT_GRADE.neonColor,
    groundBounceColor: "#3a1f12",
    ambientIntensity: GANGNAM_NIGHT_GRADE.environmentIntensity * 0.6,
    keyIntensity: GANGNAM_NIGHT_GRADE.environmentIntensity * 1.4
  };
}

export type Stage5EnvironmentPreset = "day" | "cloudy" | "rain" | "night";

export function getStage6EnvironmentPreset({
  weather,
  timeOfDay
}: {
  weather: Stage6WeatherPresetName;
  timeOfDay: Stage6TimeOfDay;
}): Stage5EnvironmentPreset {
  if (timeOfDay === "night") return "night";
  if (weather === "rain") return "rain";
  if (weather === "cloudy") return "cloudy";

  return "day";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type SceneEnvironmentProps = {
  timeOfDay?: Stage6TimeOfDay;
  signals?: SceneSnapshot["signals"];
  qualityPreset?: Stage6QualityPreset;
  weather?: Stage6WeatherPresetName;
  // suppressAtmosphericScenery (?photoreal=1&cmp=A): keep the IBL + LightingRig
  // (so the GLB vehicles stay lit) but drop WeatherAndAtmosphere entirely — its
  // distant-city backdrop plane, depth-haze planes, scene background colour and
  // fog were leaking "old background lights" behind the plate. With it gone the
  // only visible 3D is the plate + markings + vehicles (+ occluders).
  suppressAtmosphericScenery?: boolean;
};

function SceneEnvironmentComponent({
  timeOfDay = "day",
  signals = [],
  qualityPreset = getStage6QualityPreset("high"),
  weather = "rain",
  suppressAtmosphericScenery = false
}: SceneEnvironmentProps) {
  if (timeOfDay === "night") {
    return (
      <SceneNightEnvironment
        signals={signals}
        qualityPreset={qualityPreset}
        weather={weather}
      />
    );
  }

  return (
    <SceneDayEnvironment
      signals={signals}
      qualityPreset={qualityPreset}
      weather={weather}
      suppressAtmosphericScenery={suppressAtmosphericScenery}
    />
  );
}

// Not memo-wrapped: parent (SimulationScene/SceneLighting) rebuilds on any
// scene-state change, so memo would add overhead without rerender savings.
export function SceneEnvironment(props: SceneEnvironmentProps) {
  return SceneEnvironmentComponent(props);
}
SceneEnvironment.displayName = "SceneEnvironment";

// ---------------------------------------------------------------------------
// Day path
// ---------------------------------------------------------------------------

function SceneDayEnvironment({
  signals,
  qualityPreset,
  weather,
  suppressAtmosphericScenery = false
}: {
  signals: SceneSnapshot["signals"];
  qualityPreset: Stage6QualityPreset;
  weather: Stage6WeatherPresetName;
  suppressAtmosphericScenery?: boolean;
}) {
  const lightingPreset = getStage6EnvironmentPreset({ weather, timeOfDay: "day" });

  return (
    <group
      name="scene-day-environment"
      userData={{ iblSource: "procedural-room-outdoor", timeOfDay: "day" }}
    >
      {/* Brighter outdoor IBL via RoomEnvironment PMREM — headless-safe, no CDN fetch.
          Uses a lower blur than the cloudy/rain presets for sharper outdoor reflections. */}
      {qualityPreset.name !== "low" ? (
        <DayIBL />
      ) : null}
      {/* LightingRig provides hemisphere + ambient + directional key + streetlights +
          signal accents + vehicle emissive accents. No extra lights added here to
          avoid doubling the rig and overexposing the scene. */}
      <LightingRig preset={lightingPreset} signals={signals} />
      {/* Fog, haze planes, rain particles, wet-road reflections. Dropped in
          cmp=A so the distant-city backdrop / haze / fog stop leaking behind the
          plate (the plate already supplies the photoreal backdrop). */}
      {!suppressAtmosphericScenery &&
        (qualityPreset.name === "high" || qualityPreset.name === "ultra") && (
        <WeatherAndAtmosphere
          qualityPreset={qualityPreset}
          weather={weather}
          signals={signals}
        />
      )}
    </group>
  );
}

SceneDayEnvironment.displayName = "SceneDayEnvironment";

// ---------------------------------------------------------------------------
// Night path
// ---------------------------------------------------------------------------

function SceneNightEnvironmentComponent({
  signals,
  qualityPreset,
  weather
}: {
  signals: SceneSnapshot["signals"];
  qualityPreset: Stage6QualityPreset;
  weather: Stage6WeatherPresetName;
}) {
  const config = useMemo(() => resolveNightEnvConfig(), []);

  return (
    <group
      name="scene-night-environment"
      userData={{
        iblSource: "procedural-room-neon",
        timeOfDay: "night",
        neonColor: config.neonColor
      }}
    >
      {qualityPreset.name !== "low" ? (
        <NightNeonIBL config={config} />
      ) : null}
      {/* Neon-biased hemisphere: sky takes dominant neon cast,
          ground takes warm sodium bounce so vehicle undersides read. */}
      <hemisphereLight
        name="scene-neon-sky-fill"
        color={config.neonColor}
        groundColor={config.groundBounceColor}
        intensity={config.ambientIntensity}
      />
      {/* Soft fill so emissive headlights still read against graded shadows */}
      <ambientLight
        name="scene-night-ambient"
        color={config.neonColor}
        intensity={config.ambientIntensity * 0.4}
      />
      {/* High, cool key approximating spill from the glass towers in the plate */}
      <directionalLight
        name="scene-night-key"
        color={config.neonColor}
        intensity={config.keyIntensity}
        position={[18, 42, -8]}
      />
      {/* Rain must read as rain at night too: mount the weather treatment
          (rain streaks + additive wet-road glow, toneMapped=false so it glows
          under night Bloom) but sceneryless — the night IBL/neon backdrop and
          building/sky layer own the background, so its day background/fog/
          distant-city/haze are gated off (must NOT clobber the night backdrop). */}
      <WeatherAndAtmosphere
        weather={weather}
        qualityPreset={qualityPreset}
        signals={signals}
        sceneryless
      />
    </group>
  );
}

export const SceneNightEnvironment = memo(SceneNightEnvironmentComponent);
SceneNightEnvironment.displayName = "SceneNightEnvironment";

// ---------------------------------------------------------------------------
// IBL helpers (headless-safe: guard against jsdom and non-GL renderers)
// ---------------------------------------------------------------------------

function DayIBL() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (isJsdomRuntime() || !canUseRenderer(gl)) {
      return;
    }

    const pmrem = new PMREMGenerator(gl);
    const envScene = new RoomEnvironment();
    const envTexture = pmrem.fromScene(envScene, DAY_IBL_BLUR).texture;

    const previousEnvironment = scene.environment;
    const previousIntensity = readSceneEnvironmentIntensity(scene);

    scene.environment = envTexture;
    writeSceneEnvironmentIntensity(scene, DAY_IBL_INTENSITY);
    invalidate();

    return () => {
      if (scene.environment === envTexture) {
        scene.environment = previousEnvironment;
        writeSceneEnvironmentIntensity(scene, previousIntensity);
      }
      envTexture.dispose();
      pmrem.dispose();
      invalidate();
    };
  }, [gl, invalidate, scene]);

  return null;
}

DayIBL.displayName = "DayIBL";

function NightNeonIBL({ config }: { config: NightEnvConfig }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (isJsdomRuntime() || !canUseRenderer(gl)) {
      return;
    }

    const pmrem = new PMREMGenerator(gl);
    const envScene = new RoomEnvironment();
    const envTexture = pmrem.fromScene(envScene, NIGHT_IBL_BLUR).texture;

    const previousEnvironment = scene.environment;
    const previousIntensity = readSceneEnvironmentIntensity(scene);

    scene.environment = envTexture;
    writeSceneEnvironmentIntensity(scene, config.environmentIntensity);
    // Background is owned by the 3D building/sky layer, not this IBL.
    // Never clobber it — IBL only drives reflections, not the visible backdrop.
    invalidate();

    return () => {
      if (scene.environment === envTexture) {
        scene.environment = previousEnvironment;
        writeSceneEnvironmentIntensity(scene, previousIntensity);
      }
      envTexture.dispose();
      pmrem.dispose();
      invalidate();
    };
  }, [config.environmentIntensity, gl, invalidate, scene]);

  return null;
}

NightNeonIBL.displayName = "NightNeonIBL";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function canUseRenderer(renderer: unknown): renderer is WebGLRenderer {
  return (
    typeof renderer === "object" &&
    renderer !== null &&
    "getRenderTarget" in renderer &&
    "setRenderTarget" in renderer
  );
}

function isJsdomRuntime() {
  return (
    typeof window !== "undefined" && /jsdom/i.test(window.navigator.userAgent)
  );
}

function readSceneEnvironmentIntensity(scene: Scene) {
  return (
    (scene as Scene & { environmentIntensity?: number }).environmentIntensity ?? 1
  );
}

function writeSceneEnvironmentIntensity(scene: Scene, intensity: number) {
  (scene as Scene & { environmentIntensity?: number }).environmentIntensity =
    intensity;
}
