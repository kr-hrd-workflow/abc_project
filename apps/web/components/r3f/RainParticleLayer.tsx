"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  DoubleSide,
  SRGBColorSpace,
  Object3D,
  type InstancedMesh
} from "three";

import {
  getStage6QualityPreset,
  type Stage6QualityPreset,
  type Stage6QualityPresetName
} from "./stage6Quality";
import type { Stage6WeatherPresetName } from "./stage6Quality";
import {
  createStage6WeatherAtlasCellTexture,
  useStage6WeatherAtlasTexture
} from "./stage6WeatherAtlas";
import type { Vector3Tuple } from "./roadGeometry";

export type RainLayerConfig = {
  qualityPreset: Stage6QualityPresetName;
  streakCount: number;
  splashCount: number;
  streakOpacity: number;
  splashOpacity: number;
  streakWidthMeters: number;
  streakLengthMeters: number;
};

type RainParticleInstance = {
  id: string;
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  scale: Vector3Tuple;
};

const RAIN_LAYER_CONFIGS = {
  low: {
    qualityPreset: "low",
    streakCount: 0,
    splashCount: 0,
    streakOpacity: 0,
    splashOpacity: 0,
    streakWidthMeters: 0,
    streakLengthMeters: 0
  },
  medium: {
    qualityPreset: "medium",
    streakCount: 48,
    splashCount: 0,
    streakOpacity: 0.18,
    splashOpacity: 0,
    streakWidthMeters: 0.075,
    streakLengthMeters: 3.2
  },
  high: {
    qualityPreset: "high",
    streakCount: 112,
    splashCount: 18,
    streakOpacity: 0.34,
    splashOpacity: 0.15,
    streakWidthMeters: 0.105,
    streakLengthMeters: 5.2
  },
  ultra: {
    qualityPreset: "ultra",
    streakCount: 192,
    splashCount: 36,
    streakOpacity: 0.44,
    splashOpacity: 0.24,
    streakWidthMeters: 0.14,
    streakLengthMeters: 6.2
  }
} as const satisfies Record<Stage6QualityPresetName, RainLayerConfig>;

export function getRainLayerConfig(
  qualityPreset: Stage6QualityPresetName | Stage6QualityPreset
): RainLayerConfig {
  const presetName =
    typeof qualityPreset === "string"
      ? getStage6QualityPreset(qualityPreset).name
      : qualityPreset.name;

  return { ...RAIN_LAYER_CONFIGS[presetName] };
}

export function getWeatherAwareRainLayerConfig(
  qualityPreset: Stage6QualityPresetName | Stage6QualityPreset,
  weather: Stage6WeatherPresetName
): RainLayerConfig {
  if (weather !== "rain") {
    return {
      ...getRainLayerConfig(qualityPreset),
      streakCount: 0,
      splashCount: 0,
      streakOpacity: 0,
      splashOpacity: 0
    };
  }

  return getRainLayerConfig(qualityPreset);
}

export function shouldLoadRainParticleAtlas(config: RainLayerConfig) {
  return config.streakCount + config.splashCount > 0;
}

function RainParticleLayerComponent({
  qualityPreset = "high",
  weather = "rain"
}: {
  qualityPreset?: Stage6QualityPresetName | Stage6QualityPreset;
  weather?: Stage6WeatherPresetName;
}) {
  const config = getWeatherAwareRainLayerConfig(qualityPreset, weather);
  const atlasTexture = useStage6WeatherAtlasTexture({
    enabled: shouldLoadRainParticleAtlas(config)
  });
  const streakRef = useRef<InstancedMesh>(null);
  const splashRef = useRef<InstancedMesh>(null);
  const streaks = useMemo(
    () => buildRainStreakInstances(config.streakCount),
    [config.streakCount]
  );
  const splashes = useMemo(
    () => buildRainSplashInstances(config.splashCount),
    [config.splashCount]
  );
  const rainStreakTexture = useMemo(
    () =>
      atlasTexture
        ? createStage6WeatherAtlasCellTexture(
            atlasTexture,
            "rainStreaks",
            SRGBColorSpace
          )
        : null,
    [atlasTexture]
  );
  const splashTexture = useMemo(
    () =>
      atlasTexture
        ? createStage6WeatherAtlasCellTexture(
            atlasTexture,
            "splashPuffs",
            SRGBColorSpace
          )
        : null,
    [atlasTexture]
  );

  useEffect(() => {
    writeInstances(streakRef.current, streaks);
  }, [streaks]);

  useEffect(() => {
    writeInstances(splashRef.current, splashes);
  }, [splashes]);

  if (config.streakCount === 0 && config.splashCount === 0) {
    return null;
  }

  return (
    <group
      name={`stage6-rain-particle-layer-${config.qualityPreset}`}
      userData={{
        qualityPreset: config.qualityPreset,
        streakCount: config.streakCount,
        splashCount: config.splashCount
      }}
    >
      {config.streakCount > 0 ? (
        <instancedMesh
          ref={streakRef}
          name="stage6-rain-streaks"
          args={[undefined, undefined, streaks.length]}
          renderOrder={6}
        >
          <planeGeometry
            args={[config.streakWidthMeters, config.streakLengthMeters]}
          />
          <meshBasicMaterial
            color="#d6e9ef"
            map={rainStreakTexture ?? undefined}
            alphaMap={rainStreakTexture ?? undefined}
            transparent
            opacity={config.streakOpacity}
            depthWrite={false}
            side={DoubleSide}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </instancedMesh>
      ) : null}
      {config.splashCount > 0 ? (
        <instancedMesh
          ref={splashRef}
          name="stage6-road-rain-splashes"
          args={[undefined, undefined, splashes.length]}
          renderOrder={5}
        >
          <circleGeometry args={[0.45, 12]} />
          <meshBasicMaterial
            color="#d9edf2"
            map={splashTexture ?? undefined}
            alphaMap={splashTexture ?? undefined}
            transparent
            opacity={config.splashOpacity}
            depthWrite={false}
            side={DoubleSide}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </instancedMesh>
      ) : null}
    </group>
  );
}

export const RainParticleLayer = memo(RainParticleLayerComponent);
RainParticleLayer.displayName = "RainParticleLayer";

function buildRainStreakInstances(count: number): RainParticleInstance[] {
  return Array.from({ length: count }, (_, index) => {
    const lane = index % 16;
    const row = Math.floor(index / 16);
    const x = -56 + lane * 7.45 + getPatternJitter(index, 1.1);
    const z = -116 + (row % 12) * 20 + getPatternJitter(index + 17, 3.4);
    const y = 12 + (index % 9) * 3.1;
    const scale = 0.72 + (index % 5) * 0.08;

    return {
      id: `rain-streak-${index}`,
      position: [x, y, z],
      rotation: [-0.22, 0.08, -0.16],
      scale: [scale, scale, scale]
    };
  });
}

function buildRainSplashInstances(count: number): RainParticleInstance[] {
  return Array.from({ length: count }, (_, index) => {
    const lane = index % 9;
    const row = Math.floor(index / 9);

    return {
      id: `rain-splash-${index}`,
      position: [
        -34 + lane * 8.5 + getPatternJitter(index, 0.9),
        0.075,
        -72 + row * 22 + getPatternJitter(index + 23, 2.8)
      ],
      rotation: [-Math.PI / 2, 0, getPatternJitter(index + 41, 0.45)],
      scale: [0.72, 0.28, 1]
    };
  });
}

function writeInstances(
  mesh: InstancedMesh | null,
  instances: RainParticleInstance[]
) {
  if (!mesh) return;

  const tempObject = new Object3D();

  instances.forEach((instance, index) => {
    tempObject.position.set(...instance.position);
    tempObject.rotation.set(...instance.rotation);
    tempObject.scale.set(...instance.scale);
    tempObject.updateMatrix();
    mesh.setMatrixAt(index, tempObject.matrix);
  });

  mesh.instanceMatrix.needsUpdate = true;
}

function getPatternJitter(seed: number, amplitude: number) {
  const value = ((seed * 9301 + 49297) % 233280) / 233280;

  return (value - 0.5) * amplitude;
}
