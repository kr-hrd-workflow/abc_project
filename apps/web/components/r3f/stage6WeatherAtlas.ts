"use client";

import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import {
  ClampToEdgeWrapping,
  LinearFilter,
  SRGBColorSpace,
  TextureLoader,
  type Texture
} from "three";

import { getR3FAssetEntry, type R3FAssetId } from "./assetManifest";

export const STAGE6_WEATHER_ATLAS_ASSET_ID =
  "sprites/stage6_weather_material_source_atlas" as const satisfies R3FAssetId;
export const STAGE6_WEATHER_ATLAS_PATH = getR3FAssetEntry(
  STAGE6_WEATHER_ATLAS_ASSET_ID
).path;

export type Stage6WeatherAtlasCellName =
  | "wetAsphaltGloss"
  | "asphaltAggregate"
  | "rainReflectiveRoad"
  | "potholePuddles"
  | "laneMarkings"
  | "crosswalkWear"
  | "wetConcrete"
  | "puddleMask"
  | "rainStreaks"
  | "splashPuffs"
  | "wheelSpray"
  | "sprayDroplets"
  | "billboardPanels"
  | "pedestrianSilhouettes"
  | "roadSigns"
  | "guardrailPanels";

export type Stage6WeatherAtlasCell = {
  column: number;
  row: number;
  role: string;
};

export const STAGE6_WEATHER_ATLAS_GRID_SIZE = 4;

export const STAGE6_WEATHER_ATLAS_CELLS: Record<
  Stage6WeatherAtlasCellName,
  Stage6WeatherAtlasCell
> = {
  wetAsphaltGloss: { column: 0, row: 0, role: "glossy wet asphalt albedo" },
  asphaltAggregate: { column: 1, row: 0, role: "coarse asphalt aggregate" },
  rainReflectiveRoad: { column: 2, row: 0, role: "rain-reflective road panel" },
  potholePuddles: { column: 3, row: 0, role: "pothole and puddle panel" },
  laneMarkings: { column: 0, row: 1, role: "worn lane paint panel" },
  crosswalkWear: { column: 1, row: 1, role: "worn crosswalk paint panel" },
  wetConcrete: { column: 2, row: 1, role: "wet concrete and grime panel" },
  puddleMask: { column: 3, row: 1, role: "irregular puddle mask" },
  rainStreaks: { column: 0, row: 2, role: "rain streak sprite cell" },
  splashPuffs: { column: 1, row: 2, role: "rain splash puff sprite cell" },
  wheelSpray: { column: 2, row: 2, role: "vehicle wheel-spray sprite cell" },
  sprayDroplets: { column: 3, row: 2, role: "droplet splash sprite cell" },
  billboardPanels: { column: 0, row: 3, role: "blank billboard panel cell" },
  pedestrianSilhouettes: {
    column: 1,
    row: 3,
    role: "pedestrian silhouette source cell"
  },
  roadSigns: { column: 2, row: 3, role: "road sign source cell" },
  guardrailPanels: { column: 3, row: 3, role: "guardrail source cell" }
};

export function getStage6WeatherAtlasCell(name: Stage6WeatherAtlasCellName) {
  return STAGE6_WEATHER_ATLAS_CELLS[name];
}

export function createStage6WeatherAtlasCellTexture(
  atlasTexture: Texture,
  name: Stage6WeatherAtlasCellName,
  colorSpace: Texture["colorSpace"] = SRGBColorSpace
) {
  const cell = getStage6WeatherAtlasCell(name);
  const cellScale = 1 / STAGE6_WEATHER_ATLAS_GRID_SIZE;
  const texture = atlasTexture.clone();

  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.repeat.set(cellScale, cellScale);
  texture.offset.set(
    cell.column * cellScale,
    (STAGE6_WEATHER_ATLAS_GRID_SIZE - 1 - cell.row) * cellScale
  );
  texture.center.set(0, 0);
  texture.colorSpace = colorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;

  return texture;
}

export function useStage6WeatherAtlasTexture({
  enabled = true
}: {
  enabled?: boolean;
} = {}) {
  const invalidate = useThree((state) => state.invalidate);
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    if (!enabled || !canUseRuntimeAtlasTexture()) {
      setTexture(null);
      return;
    }

    const loader = new TextureLoader();
    let cancelled = false;
    let loadedTexture: Texture | null = null;

    loader
      .loadAsync(STAGE6_WEATHER_ATLAS_PATH)
      .then((atlasTexture) => {
        if (cancelled) {
          atlasTexture.dispose();
          return;
        }

        atlasTexture.colorSpace = SRGBColorSpace;
        atlasTexture.generateMipmaps = false;
        atlasTexture.minFilter = LinearFilter;
        atlasTexture.magFilter = LinearFilter;
        atlasTexture.needsUpdate = true;
        loadedTexture = atlasTexture;
        setTexture(atlasTexture);
        invalidate();
      })
      .catch(() => {
        if (!cancelled) {
          setTexture(null);
          invalidate();
        }
      });

    return () => {
      cancelled = true;
      loadedTexture?.dispose();
    };
  }, [enabled, invalidate]);

  return texture;
}

function canUseRuntimeAtlasTexture() {
  return (
    typeof window !== "undefined" &&
    !/jsdom/i.test(window.navigator.userAgent)
  );
}
