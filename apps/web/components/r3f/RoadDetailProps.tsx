"use client";

import { memo, useEffect, useMemo } from "react";
import { SRGBColorSpace, type Texture } from "three";

import type { R3FAssetId } from "./assetManifest";
import type { Vector3Tuple } from "./roadGeometry";
import {
  createStage6WeatherAtlasCellTexture,
  STAGE6_WEATHER_ATLAS_ASSET_ID,
  type Stage6WeatherAtlasCellName,
  useStage6WeatherAtlasTexture
} from "./stage6WeatherAtlas";

export type RoadDetailPropKind =
  | "bollard"
  | "traffic_cone"
  | "guardrail"
  | "road_sign";

export type RoadDetailPropSource =
  | "manifest_backed"
  | "procedural_background_proxy";

export type RoadDetailPropSpec = {
  id: string;
  kind: RoadDetailPropKind;
  source: RoadDetailPropSource;
  sourceAssetId?: R3FAssetId;
  position: Vector3Tuple;
  rotationY: number;
  scale: Vector3Tuple;
};

type RoadDetailAtlasKind = "guardrail" | "roadSign";

type RoadDetailPropAtlasTextures = Record<RoadDetailAtlasKind, Texture | null>;

const ROAD_DETAIL_PROP_ATLAS_CELLS = {
  guardrail: "guardrailPanels",
  roadSign: "roadSigns"
} as const satisfies Record<RoadDetailAtlasKind, Stage6WeatherAtlasCellName>;

export function getRoadDetailPropAtlasContracts() {
  return {
    guardrail: {
      atlasCell: ROAD_DETAIL_PROP_ATLAS_CELLS.guardrail,
      sourceAsset: STAGE6_WEATHER_ATLAS_ASSET_ID
    },
    roadSign: {
      atlasCell: ROAD_DETAIL_PROP_ATLAS_CELLS.roadSign,
      sourceAsset: STAGE6_WEATHER_ATLAS_ASSET_ID
    }
  };
}

export const ROAD_DETAIL_PROP_SPECS: RoadDetailPropSpec[] = [
  {
    id: "southwest-curb-bollard-reference",
    kind: "bollard",
    source: "manifest_backed",
    sourceAssetId: "props/curb_details",
    position: [-14.8, 0.48, 22.5],
    rotationY: 0,
    scale: [0.18, 0.92, 0.18]
  },
  {
    id: "northeast-curb-bollard-reference",
    kind: "bollard",
    source: "manifest_backed",
    sourceAssetId: "props/curb_details",
    position: [14.8, 0.48, -23.5],
    rotationY: 0,
    scale: [0.18, 0.92, 0.18]
  },
  {
    id: "west-approach-traffic-cone-0",
    kind: "traffic_cone",
    source: "procedural_background_proxy",
    position: [-58, 0.32, -10.2],
    rotationY: Math.PI / 8,
    scale: [0.55, 0.68, 0.55]
  },
  {
    id: "west-approach-traffic-cone-1",
    kind: "traffic_cone",
    source: "procedural_background_proxy",
    position: [-64, 0.32, -9.7],
    rotationY: -Math.PI / 10,
    scale: [0.5, 0.64, 0.5]
  },
  {
    id: "north-side-guardrail",
    kind: "guardrail",
    source: "procedural_background_proxy",
    position: [-16.8, 0.72, -92],
    rotationY: 0,
    scale: [0.18, 0.54, 28]
  },
  {
    id: "east-side-guardrail",
    kind: "guardrail",
    source: "procedural_background_proxy",
    position: [92, 0.72, 16.8],
    rotationY: Math.PI / 2,
    scale: [0.18, 0.54, 26]
  },
  {
    id: "north-speed-road-sign",
    kind: "road_sign",
    source: "procedural_background_proxy",
    position: [16.6, 2.1, -52],
    rotationY: -Math.PI / 10,
    scale: [1.1, 1.6, 0.08]
  },
  {
    id: "south-lane-road-sign",
    kind: "road_sign",
    source: "procedural_background_proxy",
    position: [-16.2, 2.1, 56],
    rotationY: Math.PI + Math.PI / 8,
    scale: [1.2, 1.5, 0.08]
  }
];

function RoadDetailPropsComponent() {
  const atlasTexture = useStage6WeatherAtlasTexture();
  const atlasTextures = useMemo<RoadDetailPropAtlasTextures>(
    () => ({
      guardrail: atlasTexture
        ? createStage6WeatherAtlasCellTexture(
            atlasTexture,
            ROAD_DETAIL_PROP_ATLAS_CELLS.guardrail,
            SRGBColorSpace
          )
        : null,
      roadSign: atlasTexture
        ? createStage6WeatherAtlasCellTexture(
            atlasTexture,
            ROAD_DETAIL_PROP_ATLAS_CELLS.roadSign,
            SRGBColorSpace
          )
        : null
    }),
    [atlasTexture]
  );

  useEffect(
    () => () => {
      atlasTextures.guardrail?.dispose();
      atlasTextures.roadSign?.dispose();
    },
    [atlasTextures]
  );

  return (
    <group
      name="stage6-road-detail-props"
      userData={{
        manifestBackedAssetIds: ["props/curb_details"],
        atlasContracts: getRoadDetailPropAtlasContracts(),
        proceduralProxyReason: "background road props without new asset downloads"
      }}
    >
      {ROAD_DETAIL_PROP_SPECS.map((prop) => (
        <RoadDetailProp
          key={prop.id}
          atlasTextures={atlasTextures}
          prop={prop}
        />
      ))}
    </group>
  );
}

export const RoadDetailProps = memo(RoadDetailPropsComponent);
RoadDetailProps.displayName = "RoadDetailProps";

function RoadDetailProp({
  atlasTextures,
  prop
}: {
  atlasTextures: RoadDetailPropAtlasTextures;
  prop: RoadDetailPropSpec;
}) {
  if (prop.kind === "traffic_cone") {
    return (
      <mesh
        name={prop.id}
        position={prop.position}
        rotation={[0, prop.rotationY, 0]}
        scale={prop.scale}
        userData={prop}
      >
        <coneGeometry args={[0.42, 1, 10]} />
        <meshStandardMaterial
          color="#d06437"
          roughness={0.58}
          metalness={0.02}
        />
      </mesh>
    );
  }

  if (prop.kind === "bollard") {
    return (
      <mesh
        name={prop.id}
        position={prop.position}
        rotation={[0, prop.rotationY, 0]}
        scale={prop.scale}
        userData={prop}
      >
        <cylinderGeometry args={[1, 1, 1, 14]} />
        <meshStandardMaterial
          color="#b8bfc0"
          roughness={0.42}
          metalness={0.28}
        />
      </mesh>
    );
  }

  if (prop.kind === "guardrail") {
    return (
      <mesh
        name={prop.id}
        position={prop.position}
        rotation={[0, prop.rotationY, 0]}
        scale={prop.scale}
        userData={{
          ...prop,
          atlasCell: ROAD_DETAIL_PROP_ATLAS_CELLS.guardrail,
          sourceAsset: STAGE6_WEATHER_ATLAS_ASSET_ID
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={atlasTextures.guardrail ? "#d2d7d0" : "#879196"}
          map={atlasTextures.guardrail ?? undefined}
          roughness={0.48}
          metalness={0.38}
          envMapIntensity={0.72}
        />
      </mesh>
    );
  }

  return (
    <group
      name={prop.id}
      position={prop.position}
      rotation={[0, prop.rotationY, 0]}
      userData={{
        ...prop,
        atlasCell: ROAD_DETAIL_PROP_ATLAS_CELLS.roadSign,
        sourceAsset: STAGE6_WEATHER_ATLAS_ASSET_ID
      }}
    >
      <mesh position={[0, -0.9, 0]} scale={[0.08, 1.8, 0.08]}>
        <cylinderGeometry args={[1, 1, 1, 10]} />
        <meshStandardMaterial
          color="#59666b"
          roughness={0.5}
          metalness={0.24}
        />
      </mesh>
      <mesh scale={prop.scale}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#435156"
          roughness={0.62}
          metalness={0.08}
        />
      </mesh>
      <mesh
        name={`${prop.id}-atlas-face`}
        position={[0, 0, prop.scale[2] * 0.5 + 0.004]}
        scale={[prop.scale[0], prop.scale[1], 1]}
        userData={{
          atlasCell: ROAD_DETAIL_PROP_ATLAS_CELLS.roadSign,
          sourceAsset: STAGE6_WEATHER_ATLAS_ASSET_ID
        }}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={atlasTextures.roadSign ? "#f2f0df" : "#6e8488"}
          emissive={atlasTextures.roadSign ? "#c7d6d0" : "#000000"}
          emissiveIntensity={atlasTextures.roadSign ? 0.18 : 0}
          map={atlasTextures.roadSign ?? undefined}
          metalness={0.05}
          roughness={0.5}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
