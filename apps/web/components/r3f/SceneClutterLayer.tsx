"use client";

import { memo, useEffect, useMemo } from "react";
import { DoubleSide, SRGBColorSpace, type Texture } from "three";

import { CanvasTextPlane } from "./CanvasTextPlane";
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
  | "distant_city_block"
  | "public_place_sign";

export type SceneClutterSpec = {
  id: string;
  kind: SceneClutterKind;
  position: Vector3Tuple;
  rotationY: number;
  scale: Vector3Tuple;
  color: string;
  opacity: number;
  realBrandClaim: false;
  publicPlaceText?: string;
  sumoTruth?: false;
  truthSource?: "ambient_background_proxy";
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
    id: "southwest-ambient-pedestrian-proxy-silhouette",
    kind: "pedestrian_silhouette",
    position: [-24.4, 0.9, 27],
    rotationY: Math.PI / 7,
    scale: [0.42, 1.8, 0.24],
    color: "#172125",
    opacity: 0.72,
    realBrandClaim: false,
    sumoTruth: false,
    truthSource: "ambient_background_proxy"
  },
  {
    id: "northeast-ambient-pedestrian-proxy-silhouette",
    kind: "pedestrian_silhouette",
    position: [23.2, 0.9, -29.5],
    rotationY: -Math.PI / 9,
    scale: [0.38, 1.7, 0.22],
    color: "#172125",
    opacity: 0.66,
    realBrandClaim: false,
    sumoTruth: false,
    truthSource: "ambient_background_proxy"
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
  },
  {
    id: "north-public-place-sign-seoul",
    kind: "public_place_sign",
    position: [-18.8, 4.4, -64],
    rotationY: Math.PI / 12,
    scale: [4.8, 1.18, 0.12],
    color: "#26434c",
    opacity: 0.92,
    realBrandClaim: false,
    publicPlaceText: "서울"
  },
  {
    id: "south-public-place-sign-gangnam-kr",
    kind: "public_place_sign",
    position: [18.6, 4.2, 58],
    rotationY: Math.PI + Math.PI / 14,
    scale: [4.6, 1.14, 0.12],
    color: "#253d45",
    opacity: 0.9,
    realBrandClaim: false,
    publicPlaceText: "강남"
  },
  {
    id: "east-public-place-sign-teheran-ro",
    kind: "public_place_sign",
    position: [62, 4.6, 18],
    rotationY: -Math.PI / 2,
    scale: [5.4, 1.2, 0.12],
    color: "#294750",
    opacity: 0.9,
    realBrandClaim: false,
    publicPlaceText: "테헤란로"
  },
  {
    id: "west-public-place-sign-gangnam-daero",
    kind: "public_place_sign",
    position: [-64, 4.4, -18],
    rotationY: Math.PI / 2,
    scale: [5.2, 1.18, 0.12],
    color: "#2b454c",
    opacity: 0.9,
    realBrandClaim: false,
    publicPlaceText: "강남대로"
  },
  {
    id: "northwest-public-place-sign-seoul-en",
    kind: "public_place_sign",
    position: [-42, 5.1, -82],
    rotationY: Math.PI / 8,
    scale: [4.4, 1.08, 0.12],
    color: "#31464d",
    opacity: 0.86,
    realBrandClaim: false,
    publicPlaceText: "Seoul"
  },
  {
    id: "southeast-public-place-sign-gangnam-en",
    kind: "public_place_sign",
    position: [42, 5, 74],
    rotationY: Math.PI + Math.PI / 9,
    scale: [4.8, 1.1, 0.12],
    color: "#32484e",
    opacity: 0.86,
    realBrandClaim: false,
    publicPlaceText: "Gangnam"
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

  if (spec.kind === "public_place_sign") {
    return (
      <group
        name={spec.id}
        position={spec.position}
        rotation={[0, spec.rotationY, 0]}
        userData={spec}
      >
        <mesh scale={spec.scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={spec.color}
            emissive="#8db8bd"
            emissiveIntensity={0.22}
            roughness={0.45}
            metalness={0.12}
            transparent
            opacity={spec.opacity}
          />
        </mesh>
        <CanvasTextPlane
          backgroundColor="rgba(20,61,72,0.84)"
          borderColor="rgba(237,250,245,0.42)"
          position={[0, 0, spec.scale[2] * 0.5 + 0.01]}
          renderOrder={7}
          size={[spec.scale[0] * 0.82, spec.scale[1] * 0.56]}
          text={spec.publicPlaceText ?? ""}
          textColor="#edf7f4"
          userData={{
            publicPlaceText: spec.publicPlaceText,
            realBrandClaim: false
          }}
        />
      </group>
    );
  }

  if (spec.kind === "pedestrian_silhouette") {
    return (
      <group
        name={spec.id}
        position={spec.position}
        rotation={[0, spec.rotationY, 0]}
        userData={{
          ...spec,
          layer: "ambient_pedestrian_proxy_context",
          sumoTruth: false,
          truthSource: "ambient_background_proxy"
        }}
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
