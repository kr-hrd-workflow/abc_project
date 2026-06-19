"use client";

import { memo, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { PMREMGenerator, type Scene, type WebGLRenderer } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { LightingRig } from "./LightingRig";
import { WeatherAndAtmosphere } from "./WeatherAndAtmosphere";
import type {
  Stage6QualityPreset,
  Stage6TimeOfDay,
  Stage6WeatherPresetName
} from "./stage6Quality";
import { getStage6QualityPreset } from "./stage6Quality";

export type Stage5EnvironmentPreset = "day" | "cloudy" | "rain" | "night";

export const STAGE5_ENVIRONMENT_PRESETS = {
  day: {
    environmentIntensity: 0.74,
    pmremBlur: 0.018,
    fogHazePairing: {
      background: "#25343a",
      fog: "#516269",
      fogNear: 72,
      fogFar: 320,
      haze: "#cfd8d4",
      hazeOpacityScale: 0.58
    }
  },
  cloudy: {
    environmentIntensity: 0.82,
    pmremBlur: 0.034,
    fogHazePairing: {
      background: "#202d33",
      fog: "#405158",
      fogNear: 56,
      fogFar: 270,
      haze: "#c5d1cf",
      hazeOpacityScale: 0.82
    }
  },
  rain: {
    environmentIntensity: 0.62,
    pmremBlur: 0.045,
    fogHazePairing: {
      background: "#1b2930",
      fog: "#26383f",
      fogNear: 30,
      fogFar: 180,
      haze: "#657a7f",
      hazeOpacityScale: 0.48
    }
  },
  night: {
    environmentIntensity: 0.34,
    pmremBlur: 0.058,
    fogHazePairing: {
      background: "#17242b",
      fog: "#23343c",
      fogNear: 28,
      fogFar: 170,
      haze: "#5d7378",
      hazeOpacityScale: 0.5
    }
  }
} as const satisfies Record<
  Stage5EnvironmentPreset,
  {
    environmentIntensity: number;
    pmremBlur: number;
    fogHazePairing: {
      background: string;
      fog: string;
      fogNear: number;
      fogFar: number;
      haze: string;
      hazeOpacityScale: number;
    };
  }
>;

export const STAGE5_ACTIVE_ENVIRONMENT_PRESET: Stage5EnvironmentPreset = "rain";

function EnvironmentLayerComponent({
  preset,
  signals = [],
  qualityPreset = getStage6QualityPreset("high"),
  weather = "rain",
  timeOfDay = "day"
}: {
  preset?: Stage5EnvironmentPreset;
  signals?: SceneSnapshot["signals"];
  qualityPreset?: Stage6QualityPreset;
  weather?: Stage6WeatherPresetName;
  timeOfDay?: Stage6TimeOfDay;
}) {
  const activePreset =
    preset ?? getStage6EnvironmentPreset({ weather, timeOfDay });

  return (
    <group
      name="stage5-environment-layer"
      userData={{
        environmentPreset: activePreset,
        iblSource: "procedural-room-environment",
        fogHazePairing: STAGE5_ENVIRONMENT_PRESETS[activePreset].fogHazePairing
      }}
    >
      <ProceduralEnvironmentIBL preset={activePreset} />
      <WeatherAndAtmosphere
        qualityPreset={qualityPreset}
        weather={weather}
        signals={signals}
      />
      <LightingRig preset={activePreset} signals={signals} />
    </group>
  );
}

export const EnvironmentLayer = memo(EnvironmentLayerComponent);
EnvironmentLayer.displayName = "EnvironmentLayer";

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

function ProceduralEnvironmentIBL({
  preset
}: {
  preset: Stage5EnvironmentPreset;
}) {
  const { gl, invalidate, scene } = useThree();

  useEffect(() => {
    if (isJsdomRuntime() || !canUseProceduralEnvironmentRenderer(gl)) {
      return;
    }

    const presetConfig = STAGE5_ENVIRONMENT_PRESETS[preset];
    const pmrem = new PMREMGenerator(gl);
    const environmentScene = new RoomEnvironment();
    const environmentTexture = pmrem.fromScene(
      environmentScene,
      presetConfig.pmremBlur
    ).texture;
    const previousEnvironment = scene.environment;
    const previousIntensity = readSceneEnvironmentIntensity(scene);

    scene.environment = environmentTexture;
    writeSceneEnvironmentIntensity(scene, presetConfig.environmentIntensity);
    invalidate();

    return () => {
      if (scene.environment === environmentTexture) {
        scene.environment = previousEnvironment;
        writeSceneEnvironmentIntensity(scene, previousIntensity);
      }
      environmentTexture.dispose();
      pmrem.dispose();
      invalidate();
    };
  }, [gl, invalidate, preset, scene]);

  return null;
}

function canUseProceduralEnvironmentRenderer(
  renderer: unknown
): renderer is WebGLRenderer {
  return (
    typeof renderer === "object" &&
    renderer !== null &&
    "getRenderTarget" in renderer &&
    "setRenderTarget" in renderer
  );
}

function isJsdomRuntime() {
  return (
    typeof window !== "undefined" &&
    /jsdom/i.test(window.navigator.userAgent)
  );
}

function readSceneEnvironmentIntensity(scene: Scene) {
  return (scene as Scene & { environmentIntensity?: number }).environmentIntensity ?? 1;
}

function writeSceneEnvironmentIntensity(scene: Scene, intensity: number) {
  (scene as Scene & { environmentIntensity?: number }).environmentIntensity =
    intensity;
}
