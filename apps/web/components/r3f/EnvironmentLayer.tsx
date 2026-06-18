"use client";

import { memo, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { PMREMGenerator, type Scene, type WebGLRenderer } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { LightingRig } from "./LightingRig";
import { WeatherAndAtmosphere } from "./WeatherAndAtmosphere";

export type Stage5EnvironmentPreset = "day" | "cloudy" | "rain" | "night";

export const STAGE5_ENVIRONMENT_PRESETS = {
  day: {
    environmentIntensity: 0.62,
    pmremBlur: 0.02
  },
  cloudy: {
    environmentIntensity: 0.78,
    pmremBlur: 0.035
  },
  rain: {
    environmentIntensity: 0.92,
    pmremBlur: 0.045
  },
  night: {
    environmentIntensity: 0.7,
    pmremBlur: 0.055
  }
} as const satisfies Record<
  Stage5EnvironmentPreset,
  {
    environmentIntensity: number;
    pmremBlur: number;
  }
>;

export const STAGE5_ACTIVE_ENVIRONMENT_PRESET: Stage5EnvironmentPreset = "rain";

function EnvironmentLayerComponent({
  preset = STAGE5_ACTIVE_ENVIRONMENT_PRESET
}: {
  preset?: Stage5EnvironmentPreset;
}) {
  return (
    <group
      name="stage5-environment-layer"
      userData={{
        environmentPreset: preset,
        iblSource: "procedural-room-environment"
      }}
    >
      <ProceduralEnvironmentIBL preset={preset} />
      <WeatherAndAtmosphere />
      <LightingRig />
    </group>
  );
}

export const EnvironmentLayer = memo(EnvironmentLayerComponent);
EnvironmentLayer.displayName = "EnvironmentLayer";

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
