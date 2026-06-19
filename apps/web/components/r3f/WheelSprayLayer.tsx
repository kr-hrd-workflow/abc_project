"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  DoubleSide,
  Object3D,
  SRGBColorSpace,
  type InstancedMesh
} from "three";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import {
  STAGE6_WEATHER_ATLAS_ASSET_ID,
  createStage6WeatherAtlasCellTexture,
  useStage6WeatherAtlasTexture
} from "./stage6WeatherAtlas";
import {
  getStage6QualityPreset,
  type Stage6QualityPreset,
  type Stage6QualityPresetName
} from "./stage6Quality";
import type { Vector3Tuple } from "./roadGeometry";

export type WheelSprayConfig = {
  qualityPreset: Stage6QualityPresetName;
  maxSprayPlumes: number;
  opacity: number;
};

type WheelSprayInstance = {
  id: string;
  position: Vector3Tuple;
  rotationY: number;
  scale: Vector3Tuple;
};

const WHEEL_SPRAY_CONFIGS = {
  low: {
    qualityPreset: "low",
    maxSprayPlumes: 0,
    opacity: 0
  },
  medium: {
    qualityPreset: "medium",
    maxSprayPlumes: 0,
    opacity: 0
  },
  high: {
    qualityPreset: "high",
    maxSprayPlumes: 8,
    opacity: 0.19
  },
  ultra: {
    qualityPreset: "ultra",
    maxSprayPlumes: 18,
    opacity: 0.26
  }
} as const satisfies Record<Stage6QualityPresetName, WheelSprayConfig>;

const WHEEL_SPRAY_ATLAS_CELL = "wheelSpray" as const;

export function getWheelSprayConfig(
  qualityPreset: Stage6QualityPresetName | Stage6QualityPreset
): WheelSprayConfig {
  const presetName =
    typeof qualityPreset === "string"
      ? getStage6QualityPreset(qualityPreset).name
      : qualityPreset.name;

  return { ...WHEEL_SPRAY_CONFIGS[presetName] };
}

export function shouldLoadWheelSprayAtlas(config: WheelSprayConfig) {
  return config.maxSprayPlumes > 0;
}

export function getWheelSprayMaterialContract(config: WheelSprayConfig) {
  if (!shouldLoadWheelSprayAtlas(config)) return null;

  return {
    atlasCell: WHEEL_SPRAY_ATLAS_CELL,
    sourceAsset: STAGE6_WEATHER_ATLAS_ASSET_ID
  };
}

export function buildWheelSprayInstances(
  sceneSnapshot: SceneSnapshot,
  qualityPreset: Stage6QualityPresetName | Stage6QualityPreset
): WheelSprayInstance[] {
  const config = getWheelSprayConfig(qualityPreset);
  if (config.maxSprayPlumes === 0) return [];

  return sceneSnapshot.vehicles
    .filter((vehicle) => vehicle.speed_mps > 1.4)
    .slice(0, config.maxSprayPlumes)
    .map((vehicle, index) => {
      const rotationY = degreesToRadians(vehicle.heading_degrees);
      const rearOffsetMeters = vehicle.vehicle_type === "bus" ? 4.4 : 2.1;
      const lateralOffset = index % 2 === 0 ? -0.68 : 0.68;
      const position = offsetFromVehicle(
        [vehicle.x_meters, 0.18, vehicle.y_meters],
        rotationY,
        [lateralOffset, 0, rearOffsetMeters]
      );

      return {
        id: `${vehicle.id}-wheel-spray`,
        position,
        rotationY,
        scale: [
          vehicle.vehicle_type === "bus" ? 2.6 : 1.6,
          vehicle.vehicle_type === "bus" ? 0.72 : 0.48,
          1
        ]
      };
    });
}

function WheelSprayLayerComponent({
  sceneSnapshot,
  qualityPreset = "high"
}: {
  sceneSnapshot: SceneSnapshot;
  qualityPreset?: Stage6QualityPresetName | Stage6QualityPreset;
}) {
  const sprayRef = useRef<InstancedMesh>(null);
  const config = getWheelSprayConfig(qualityPreset);
  const sprays = useMemo(
    () => buildWheelSprayInstances(sceneSnapshot, qualityPreset),
    [qualityPreset, sceneSnapshot]
  );
  const materialContract = getWheelSprayMaterialContract(config);
  const atlasTexture = useStage6WeatherAtlasTexture({
    enabled: shouldLoadWheelSprayAtlas(config) && sprays.length > 0
  });
  const sprayTexture = useMemo(
    () =>
      atlasTexture && materialContract
        ? createStage6WeatherAtlasCellTexture(
            atlasTexture,
            materialContract.atlasCell,
            SRGBColorSpace
          )
        : null,
    [atlasTexture, materialContract]
  );

  useEffect(
    () => () => {
      sprayTexture?.dispose();
    },
    [sprayTexture]
  );

  useEffect(() => {
    if (!sprayRef.current) return;

    const tempObject = new Object3D();

    sprays.forEach((spray, index) => {
      tempObject.position.set(...spray.position);
      tempObject.rotation.set(-0.18, spray.rotationY, 0);
      tempObject.scale.set(...spray.scale);
      tempObject.updateMatrix();
      sprayRef.current?.setMatrixAt(index, tempObject.matrix);
    });

    sprayRef.current.instanceMatrix.needsUpdate = true;
  }, [sprays]);

  if (sprays.length === 0) return null;

  return (
    <group
      name={`stage6-wheel-spray-layer-${config.qualityPreset}`}
      userData={{
        qualityPreset: config.qualityPreset,
        sprayPlumes: sprays.length,
        source: "SimulationFrameSnapshot.vehicles",
        atlasCell: materialContract?.atlasCell ?? null,
        sourceAsset: materialContract?.sourceAsset ?? null
      }}
    >
      <instancedMesh
        ref={sprayRef}
        name="stage6-wheel-spray-plumes"
        args={[undefined, undefined, sprays.length]}
        renderOrder={7}
      >
        <planeGeometry args={[1, 0.34]} />
        <meshBasicMaterial
          color="#d7edf2"
          map={sprayTexture ?? undefined}
          alphaMap={sprayTexture ?? undefined}
          transparent
          opacity={config.opacity}
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}

export const WheelSprayLayer = memo(WheelSprayLayerComponent);
WheelSprayLayer.displayName = "WheelSprayLayer";

function offsetFromVehicle(
  position: Vector3Tuple,
  rotationY: number,
  localOffset: Vector3Tuple
): Vector3Tuple {
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);

  return [
    position[0] + localOffset[0] * cos + localOffset[2] * sin,
    position[1] + localOffset[1],
    position[2] - localOffset[0] * sin + localOffset[2] * cos
  ];
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}
