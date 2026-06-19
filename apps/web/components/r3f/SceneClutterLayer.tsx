"use client";

import { memo, useEffect, useMemo } from "react";
import { DoubleSide, SRGBColorSpace, type Texture } from "three";

import type { Vector3Tuple } from "./roadGeometry";
import {
  STAGE6_WEATHER_ATLAS_ASSET_ID,
  createStage6WeatherAtlasCellTexture,
  useStage6WeatherAtlasTexture
} from "./stage6WeatherAtlas";

export type SceneClutterKind =
  | "building_silhouette"
  | "billboard"
  | "pedestrian_silhouette"
  | "distant_city_block";

export type SceneClutterSpec = {
  id: string;
  kind: SceneClutterKind;
  position: Vector3Tuple;
  rotationY: number;
  scale: Vector3Tuple;
  color: string;
  opacity: number;
  realBrandClaim: false;
};

export const SCENE_CLUTTER_SPECS: SceneClutterSpec[] = [
  {
    id: "northwest-building-silhouette",
    kind: "building_silhouette",
    position: [-35, 7.2, -104],
    rotationY: 0,
    scale: [10, 14.4, 12],
    color: "#1e2b30",
    opacity: 0.92,
    realBrandClaim: false
  },
  {
    id: "southeast-building-silhouette",
    kind: "building_silhouette",
    position: [38, 6.4, 88],
    rotationY: 0,
    scale: [12, 12.8, 10],
    color: "#223137",
    opacity: 0.88,
    realBrandClaim: false
  },
  {
    id: "east-blank-billboard",
    kind: "billboard",
    position: [60, 6.6, -18],
    rotationY: -Math.PI / 2,
    scale: [8.5, 2.8, 0.16],
    color: "#37464a",
    opacity: 0.76,
    realBrandClaim: false
  },
  {
    id: "south-blank-billboard",
    kind: "billboard",
    position: [-18, 6.2, 72],
    rotationY: Math.PI,
    scale: [7.4, 2.6, 0.16],
    color: "#3c494c",
    opacity: 0.72,
    realBrandClaim: false
  },
  {
    id: "southwest-pedestrian-silhouette",
    kind: "pedestrian_silhouette",
    position: [-24.4, 0.9, 27],
    rotationY: Math.PI / 7,
    scale: [0.42, 1.8, 0.24],
    color: "#172125",
    opacity: 0.72,
    realBrandClaim: false
  },
  {
    id: "northeast-pedestrian-silhouette",
    kind: "pedestrian_silhouette",
    position: [23.2, 0.9, -29.5],
    rotationY: -Math.PI / 9,
    scale: [0.38, 1.7, 0.22],
    color: "#172125",
    opacity: 0.66,
    realBrandClaim: false
  },
  {
    id: "north-distant-city-block",
    kind: "distant_city_block",
    position: [-74, 15, -164],
    rotationY: 0,
    scale: [18, 30, 12],
    color: "#18252a",
    opacity: 0.58,
    realBrandClaim: false
  },
  {
    id: "west-distant-city-block",
    kind: "distant_city_block",
    position: [-154, 12, 44],
    rotationY: 0,
    scale: [15, 24, 16],
    color: "#1a272c",
    opacity: 0.5,
    realBrandClaim: false
  }
];

const SCENE_CLUTTER_ATLAS_CELLS = {
  billboard: "billboardPanels"
} as const;

export function getSceneClutterAtlasContracts() {
  return {
    billboard: {
      atlasCell: SCENE_CLUTTER_ATLAS_CELLS.billboard,
      sourceAsset: STAGE6_WEATHER_ATLAS_ASSET_ID
    }
  };
}

function SceneClutterLayerComponent() {
  const atlasTexture = useStage6WeatherAtlasTexture();
  const billboardTexture = useMemo(
    () =>
      atlasTexture
        ? createStage6WeatherAtlasCellTexture(
            atlasTexture,
            SCENE_CLUTTER_ATLAS_CELLS.billboard,
            SRGBColorSpace
          )
        : null,
    [atlasTexture]
  );

  useEffect(
    () => () => {
      billboardTexture?.dispose();
    },
    [billboardTexture]
  );

  return (
    <group
      name="stage6-scene-clutter-layer"
      userData={{
        proxySource: "procedural_background_proxy",
        brandSafety: "blank billboards only; no real brand claims"
      }}
    >
      {SCENE_CLUTTER_SPECS.map((spec) => (
        <SceneClutterItem
          key={spec.id}
          billboardTexture={billboardTexture}
          spec={spec}
        />
      ))}
    </group>
  );
}

export const SceneClutterLayer = memo(SceneClutterLayerComponent);
SceneClutterLayer.displayName = "SceneClutterLayer";

function SceneClutterItem({
  billboardTexture,
  spec
}: {
  billboardTexture: Texture | null;
  spec: SceneClutterSpec;
}) {
  if (spec.kind === "billboard") {
    return (
      <mesh
        name={spec.id}
        position={spec.position}
        rotation={[0, spec.rotationY, 0]}
        scale={spec.scale}
        userData={spec}
        renderOrder={1}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={spec.color}
          map={billboardTexture ?? undefined}
          emissiveMap={billboardTexture ?? undefined}
          emissive="#d8ecff"
          emissiveIntensity={0.34}
          roughness={0.48}
          metalness={0.16}
          transparent
          opacity={spec.opacity}
          depthWrite={false}
        />
      </mesh>
    );
  }

  if (spec.kind === "pedestrian_silhouette") {
    return (
      <group
        name={spec.id}
        position={spec.position}
        rotation={[0, spec.rotationY, 0]}
        userData={spec}
      >
        <mesh scale={spec.scale}>
          <capsuleGeometry args={[0.5, 1, 4, 10]} />
          <meshStandardMaterial
            color={spec.color}
            roughness={0.7}
            transparent
            opacity={spec.opacity}
          />
        </mesh>
        <mesh position={[0, 1.08, 0]} scale={[0.28, 0.28, 0.28]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial
            color={spec.color}
            roughness={0.72}
            transparent
            opacity={spec.opacity}
          />
        </mesh>
      </group>
    );
  }

  return (
    <mesh
      name={spec.id}
      position={spec.position}
      rotation={[0, spec.rotationY, 0]}
      scale={spec.scale}
      userData={spec}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={spec.color}
        roughness={0.82}
        metalness={0.04}
        transparent
        opacity={spec.opacity}
        side={DoubleSide}
      />
    </mesh>
  );
}
