"use client";

import { useEffect, useMemo } from "react";
import {
  AdditiveBlending,
  NormalBlending,
  type Texture,
  type Blending
} from "three";

import {
  createStage6WeatherAtlasCellTexture,
  useStage6WeatherAtlasTexture,
  type Stage6WeatherAtlasCellName
} from "./stage6WeatherAtlas";
import type { Stage6QualityPreset } from "./stage6Quality";
import { getStage6QualityPreset } from "./stage6Quality";
import type { Vector3Tuple } from "./roadGeometry";

export type Stage6SurfaceDecalSpec = {
  id: string;
  atlasCell: Stage6WeatherAtlasCellName;
  position: Vector3Tuple;
  size: [number, number];
  rotationY?: number;
  opacity: number;
  color: string;
  blending: "normal" | "additive";
  minQuality: Stage6QualityPreset["name"];
};

export const STAGE6_SURFACE_DECAL_SPECS: readonly Stage6SurfaceDecalSpec[] = [
  {
    id: "intersection-reflective-asphalt-atlas-decal",
    atlasCell: "rainReflectiveRoad",
    position: [0, 0.058, 0],
    size: [38, 38],
    opacity: 0.28,
    color: "#dbe4e0",
    blending: "normal",
    minQuality: "medium"
  },
  {
    id: "north-approach-wet-asphalt-atlas-decal",
    atlasCell: "wetAsphaltGloss",
    position: [0, 0.056, -58],
    size: [19, 92],
    opacity: 0.28,
    color: "#e2e8e3",
    blending: "normal",
    minQuality: "high"
  },
  {
    id: "south-approach-wet-asphalt-atlas-decal",
    atlasCell: "wetAsphaltGloss",
    position: [0, 0.056, 56],
    size: [19, 88],
    opacity: 0.28,
    color: "#e2e8e3",
    blending: "normal",
    minQuality: "high"
  },
  {
    id: "east-west-wet-asphalt-atlas-decal",
    atlasCell: "rainReflectiveRoad",
    position: [0, 0.057, 0],
    size: [126, 19],
    opacity: 0.25,
    color: "#d6e0dd",
    blending: "normal",
    minQuality: "high"
  },
  {
    id: "north-stop-bar-puddle-atlas-decal",
    atlasCell: "puddleMask",
    position: [-5.5, 0.064, -20.2],
    size: [10.5, 5.4],
    opacity: 0.18,
    color: "#b9c9cc",
    blending: "additive",
    minQuality: "high"
  },
  {
    id: "east-crosswalk-pothole-atlas-decal",
    atlasCell: "potholePuddles",
    position: [24.5, 0.065, 3.2],
    size: [13.5, 7.4],
    opacity: 0.16,
    color: "#c2cfd0",
    blending: "additive",
    minQuality: "ultra"
  },
  {
    id: "south-lane-puddle-atlas-decal",
    atlasCell: "puddleMask",
    position: [5.4, 0.064, 28.5],
    size: [8.5, 4.8],
    opacity: 0.14,
    color: "#c1ced0",
    blending: "additive",
    minQuality: "high"
  }
] as const;

const QUALITY_RANK: Record<Stage6QualityPreset["name"], number> = {
  low: 0,
  medium: 1,
  high: 2,
  ultra: 3
};

export function getStage6SurfaceDecalsForQuality(
  qualityPreset: Stage6QualityPreset
) {
  const rank = QUALITY_RANK[qualityPreset.name];

  return STAGE6_SURFACE_DECAL_SPECS.filter(
    (spec) => QUALITY_RANK[spec.minQuality] <= rank
  );
}

export function shouldLoadStage6SurfaceDecalAtlas(
  qualityPreset: Stage6QualityPreset
) {
  return getStage6SurfaceDecalsForQuality(qualityPreset).length > 0;
}

export function Stage6SurfaceDecals({
  qualityPreset = getStage6QualityPreset("low")
}: {
  qualityPreset?: Stage6QualityPreset;
}) {
  const specs = useMemo(
    () => getStage6SurfaceDecalsForQuality(qualityPreset),
    [qualityPreset]
  );
  const shouldLoadAtlas = specs.length > 0;
  const atlasTexture = useStage6WeatherAtlasTexture({
    enabled: shouldLoadAtlas
  });
  const textures = useMemo(() => {
    if (!atlasTexture) return new Map<string, Texture>();

    return new Map(
      specs.map((spec) => [
        spec.id,
        createStage6WeatherAtlasCellTexture(atlasTexture, spec.atlasCell)
      ])
    );
  }, [atlasTexture, specs]);

  useEffect(
    () => () => {
      textures.forEach((texture) => {
        texture.dispose();
      });
    },
    [textures]
  );

  if (!atlasTexture || specs.length === 0) return null;

  return (
    <group
      name="stage6-visible-weather-atlas-surface-decals"
      userData={{
        sourceAsset: "sprites/stage6_weather_material_source_atlas",
        qualityPreset: qualityPreset.name,
        decalCount: specs.length
      }}
    >
      {specs.map((spec) => (
        <mesh
          key={spec.id}
          name={spec.id}
          position={spec.position}
          rotation={[-Math.PI / 2, spec.rotationY ?? 0, 0]}
          renderOrder={6}
        >
          <planeGeometry args={spec.size} />
          <meshBasicMaterial
            map={textures.get(spec.id) ?? null}
            color={spec.color}
            transparent
            opacity={spec.opacity}
            depthWrite={false}
            toneMapped={false}
            blending={toThreeBlending(spec.blending)}
          />
        </mesh>
      ))}
    </group>
  );
}

function toThreeBlending(blending: Stage6SurfaceDecalSpec["blending"]): Blending {
  return blending === "additive" ? AdditiveBlending : NormalBlending;
}
