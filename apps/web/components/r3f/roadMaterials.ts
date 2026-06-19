import { useEffect, useMemo, useState } from "react";
import { useThree, type ThreeElements } from "@react-three/fiber";
import {
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Texture
} from "three";

import { getR3FAssetEntry, type R3FAssetId } from "./assetManifest";
import { createStage6WeatherAtlasCellTexture } from "./stage6WeatherAtlas";

type RoadMaterialProps = ThreeElements["meshStandardMaterial"];

export type Stage6RoadMaterialMapCoverage = {
  baseColor: "scalar" | "texture";
  normal: "missing" | "texture";
  roughness: "scalar" | "texture";
  ao: "missing" | "texture";
};

export type Stage6RoadMaterialName =
  | "asphalt"
  | "wetAsphalt"
  | "lanePaint"
  | "crosswalkPaint"
  | "curbConcrete"
  | "sidewalkConcrete"
  | "puddleMask"
  | "roadEdgeGrime";

export const STAGE5_TEXTURE_ASSET_IDS = {
  wetAsphaltAlbedo: "textures/wet_asphalt_albedo",
  wetAsphaltRoughness: "textures/wet_asphalt_roughness",
  wornLaneMarkings: "decals/worn_lane_markings",
  crosswalkWear: "decals/crosswalk_wear",
  curbGrime: "decals/curb_grime",
  sidewalkPaverVariation: "textures/sidewalk_paver_variation",
  facadeWindowEmissive: "textures/facade_window_emissive",
  stage6WeatherMaterialAtlas: "sprites/stage6_weather_material_source_atlas"
} as const satisfies Record<string, R3FAssetId>;

export const STAGE5_TEXTURE_PATHS = {
  wetAsphaltAlbedo: getR3FAssetEntry(STAGE5_TEXTURE_ASSET_IDS.wetAsphaltAlbedo).path,
  wetAsphaltRoughness: getR3FAssetEntry(
    STAGE5_TEXTURE_ASSET_IDS.wetAsphaltRoughness
  ).path,
  wornLaneMarkings: getR3FAssetEntry(STAGE5_TEXTURE_ASSET_IDS.wornLaneMarkings)
    .path,
  crosswalkWear: getR3FAssetEntry(STAGE5_TEXTURE_ASSET_IDS.crosswalkWear).path,
  curbGrime: getR3FAssetEntry(STAGE5_TEXTURE_ASSET_IDS.curbGrime).path,
  sidewalkPaverVariation: getR3FAssetEntry(
    STAGE5_TEXTURE_ASSET_IDS.sidewalkPaverVariation
  ).path,
  facadeWindowEmissive: getR3FAssetEntry(
    STAGE5_TEXTURE_ASSET_IDS.facadeWindowEmissive
  ).path,
  stage6WeatherMaterialAtlas: getR3FAssetEntry(
    STAGE5_TEXTURE_ASSET_IDS.stage6WeatherMaterialAtlas
  ).path
} as const;

type Stage5TextureKey = keyof typeof STAGE5_TEXTURE_PATHS;
type Stage5RuntimeTextures = Record<Stage5TextureKey, Texture>;

const STAGE5_TEXTURE_ENTRIES = Object.entries(STAGE5_TEXTURE_PATHS) as Array<
  [Stage5TextureKey, string]
>;

export const STAGE5_WET_ROAD_MATERIAL_CONTROLS = {
  wetness: 0.72,
  asphaltBumpScale: 0.064,
  markingWearOpacity: 0.58
} as const;

export const STAGE6_BUILDING_FACADE_MATERIAL_CONTROLS = {
  baseColor: "#202a2f",
  emissive: "#415e68",
  emissiveIntensity: 0.24,
  facadePanelOpacity: 0.42
} as const;

export const ROAD_MATERIALS = {
  asphalt: {
    color: "#1f2a2f",
    roughness: 0.2,
    metalness: 0.06,
    envMapIntensity: 1.18,
    dithering: true
  },
  intersectionAsphalt: {
    color: "#1c282d",
    roughness: 0.18,
    metalness: 0.07,
    envMapIntensity: 1.24,
    dithering: true
  },
  asphaltPatch: {
    color: "#1b2529",
    roughness: 0.44,
    metalness: 0.035,
    envMapIntensity: 0.86,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    dithering: true
  },
  wornMarking: {
    color: "#e0dac5",
    emissive: "#716955",
    emissiveIntensity: 0.18,
    roughness: 0.78,
    metalness: 0.02,
    transparent: true,
    opacity: STAGE5_WET_ROAD_MATERIAL_CONTROLS.markingWearOpacity,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    toneMapped: false,
    dithering: true
  },
  crosswalkMarking: {
    color: "#d2c6aa",
    emissive: "#514633",
    emissiveIntensity: 0.08,
    roughness: 0.8,
    metalness: 0.02,
    transparent: true,
    opacity: 0.54,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    toneMapped: false,
    dithering: true
  },
  markingScuff: {
    color: "#202b2f",
    roughness: 0.74,
    metalness: 0.02,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    dithering: true
  },
  queueZone: {
    color: "#25363c",
    roughness: 0.58,
    metalness: 0.02,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    dithering: true
  },
  edgeGrime: {
    color: "#222c30",
    roughness: 0.78,
    metalness: 0.01,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    dithering: true
  },
  curb: {
    color: "#424845",
    roughness: 0.9,
    metalness: 0.01,
    dithering: true
  },
  sidewalk: {
    color: "#3a4442",
    roughness: 0.91,
    metalness: 0.02,
    dithering: true
  },
  cityGround: {
    color: "#20292d",
    roughness: 0.82,
    metalness: 0.025,
    envMapIntensity: 0.62,
    dithering: true
  },
  buildingBlock: {
    color: "#1f2b31",
    roughness: 0.72,
    metalness: 0.04,
    emissive: "#0c1215",
    emissiveIntensity: 0.08,
    envMapIntensity: 0.38,
    dithering: true
  },
  buildingEdge: {
    color: STAGE6_BUILDING_FACADE_MATERIAL_CONTROLS.baseColor,
    roughness: 0.44,
    metalness: 0.14,
    emissive: STAGE6_BUILDING_FACADE_MATERIAL_CONTROLS.emissive,
    emissiveIntensity:
      STAGE6_BUILDING_FACADE_MATERIAL_CONTROLS.emissiveIntensity,
    envMapIntensity: 0.86,
    dithering: true
  }
} satisfies Record<string, RoadMaterialProps>;

export const STAGE6_ROAD_MATERIALS = {
  asphalt: ROAD_MATERIALS.asphalt,
  wetAsphalt: ROAD_MATERIALS.intersectionAsphalt,
  lanePaint: ROAD_MATERIALS.wornMarking,
  crosswalkPaint: ROAD_MATERIALS.crosswalkMarking,
  curbConcrete: ROAD_MATERIALS.curb,
  sidewalkConcrete: ROAD_MATERIALS.sidewalk,
  puddleMask: {
    color: "#202b2f",
    roughness: 0.08,
    metalness: 0.08,
    envMapIntensity: 1.8,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    dithering: true
  },
  roadEdgeGrime: ROAD_MATERIALS.edgeGrime
} as const satisfies Record<Stage6RoadMaterialName, RoadMaterialProps>;

export const STAGE6_ROAD_MATERIAL_COVERAGE = {
  asphalt: {
    baseColor: "texture",
    normal: "missing",
    roughness: "texture",
    ao: "missing"
  },
  wetAsphalt: {
    baseColor: "texture",
    normal: "missing",
    roughness: "texture",
    ao: "missing"
  },
  lanePaint: {
    baseColor: "texture",
    normal: "missing",
    roughness: "texture",
    ao: "missing"
  },
  crosswalkPaint: {
    baseColor: "texture",
    normal: "missing",
    roughness: "texture",
    ao: "missing"
  },
  curbConcrete: {
    baseColor: "texture",
    normal: "missing",
    roughness: "texture",
    ao: "missing"
  },
  sidewalkConcrete: {
    baseColor: "texture",
    normal: "missing",
    roughness: "texture",
    ao: "missing"
  },
  puddleMask: {
    baseColor: "scalar",
    normal: "missing",
    roughness: "scalar",
    ao: "missing"
  },
  roadEdgeGrime: {
    baseColor: "texture",
    normal: "missing",
    roughness: "texture",
    ao: "missing"
  }
} as const satisfies Record<Stage6RoadMaterialName, Stage6RoadMaterialMapCoverage>;

export function getStage6RoadMaterialCoverage(name: Stage6RoadMaterialName) {
  return STAGE6_ROAD_MATERIAL_COVERAGE[name];
}

export type Stage5RoadMaterialSet = typeof ROAD_MATERIALS;

export function useStage5RoadMaterials(): Stage5RoadMaterialSet {
  const invalidate = useThree((state) => state.invalidate);
  const runtimeTexturesEnabled = canUseRuntimeTextures();
  const [textures, setTextures] = useState<Stage5RuntimeTextures | null>(null);

  useEffect(() => {
    if (!runtimeTexturesEnabled) {
      setTextures(null);
      return;
    }

    const loader = new TextureLoader();
    const loadedTextures: Texture[] = [];
    let cancelled = false;

    Promise.all(
      STAGE5_TEXTURE_ENTRIES.map(async ([key, path]) => {
        const texture = await loader.loadAsync(path);
        loadedTextures.push(texture);

        return [key, texture] as const;
      })
    )
      .then((loadedEntries) => {
        if (cancelled) {
          loadedTextures.forEach((texture) => texture.dispose());
          return;
        }

        setTextures(Object.fromEntries(loadedEntries) as Stage5RuntimeTextures);
        invalidate();
      })
      .catch(() => {
        if (!cancelled) {
          setTextures(null);
          invalidate();
        }
      });

    return () => {
      cancelled = true;
      loadedTextures.forEach((texture) => texture.dispose());
    };
  }, [invalidate, runtimeTexturesEnabled]);

  return useMemo(
    () => {
      if (!textures) {
        return ROAD_MATERIALS;
      }

      return {
        asphalt: {
          ...ROAD_MATERIALS.asphalt,
          map: createStage6WeatherAtlasCellTexture(
            textures.stage6WeatherMaterialAtlas,
            "wetAsphaltGloss",
            SRGBColorSpace
          ),
          roughnessMap: repeatTexture(
            textures.wetAsphaltRoughness,
            [10, 32],
            NoColorSpace
          ),
          bumpMap: createStage6WeatherAtlasCellTexture(
            textures.stage6WeatherMaterialAtlas,
            "asphaltAggregate",
            NoColorSpace
          ),
          bumpScale: STAGE5_WET_ROAD_MATERIAL_CONTROLS.asphaltBumpScale
        },
        intersectionAsphalt: {
          ...ROAD_MATERIALS.intersectionAsphalt,
          map: createStage6WeatherAtlasCellTexture(
            textures.stage6WeatherMaterialAtlas,
            "rainReflectiveRoad",
            SRGBColorSpace
          ),
          roughnessMap: repeatTexture(
            textures.wetAsphaltRoughness,
            [7, 7],
            NoColorSpace
          ),
          bumpMap: repeatTexture(
            textures.wetAsphaltRoughness,
            [12, 12],
            NoColorSpace
          ),
          bumpScale: STAGE5_WET_ROAD_MATERIAL_CONTROLS.asphaltBumpScale * 0.86
        },
        asphaltPatch: {
          ...ROAD_MATERIALS.asphaltPatch,
          map: createStage6WeatherAtlasCellTexture(
            textures.stage6WeatherMaterialAtlas,
            "potholePuddles",
            SRGBColorSpace
          ),
          roughnessMap: repeatTexture(
            textures.wetAsphaltRoughness,
            [6, 18],
            NoColorSpace
          ),
          bumpMap: repeatTexture(
            textures.wetAsphaltRoughness,
            [8, 20],
            NoColorSpace
          ),
          bumpScale: 0.025
        },
        wornMarking: {
          ...ROAD_MATERIALS.wornMarking,
          map: createStage6WeatherAtlasCellTexture(
            textures.stage6WeatherMaterialAtlas,
            "laneMarkings",
            SRGBColorSpace
          ),
          roughnessMap: repeatTexture(
            textures.wetAsphaltRoughness,
            [4, 28],
            NoColorSpace
          )
        },
        crosswalkMarking: {
          ...ROAD_MATERIALS.crosswalkMarking,
          map: createStage6WeatherAtlasCellTexture(
            textures.stage6WeatherMaterialAtlas,
            "crosswalkWear",
            SRGBColorSpace
          ),
          roughnessMap: repeatTexture(
            textures.wetAsphaltRoughness,
            [3, 3],
            NoColorSpace
          )
        },
        markingScuff: {
          ...ROAD_MATERIALS.markingScuff,
          map: createStage6WeatherAtlasCellTexture(
            textures.stage6WeatherMaterialAtlas,
            "wetConcrete",
            SRGBColorSpace
          ),
          roughnessMap: repeatTexture(
            textures.wetAsphaltRoughness,
            [4, 16],
            NoColorSpace
          )
        },
        queueZone: ROAD_MATERIALS.queueZone,
        edgeGrime: {
          ...ROAD_MATERIALS.edgeGrime,
          map: createStage6WeatherAtlasCellTexture(
            textures.stage6WeatherMaterialAtlas,
            "puddleMask",
            SRGBColorSpace
          ),
          roughnessMap: repeatTexture(textures.curbGrime, [1, 22], NoColorSpace)
        },
        curb: {
          ...ROAD_MATERIALS.curb,
          map: repeatTexture(textures.curbGrime, [1, 18], SRGBColorSpace),
          roughnessMap: repeatTexture(
            textures.wetAsphaltRoughness,
            [1, 12],
            NoColorSpace
          ),
          bumpMap: repeatTexture(textures.curbGrime, [1, 18], NoColorSpace),
          bumpScale: 0.025
        },
        sidewalk: {
          ...ROAD_MATERIALS.sidewalk,
          map: repeatTexture(
            textures.sidewalkPaverVariation,
            [4, 28],
            SRGBColorSpace
          ),
          roughnessMap: repeatTexture(
            textures.sidewalkPaverVariation,
            [4, 28],
            NoColorSpace
          ),
          bumpMap: repeatTexture(
            textures.sidewalkPaverVariation,
            [5, 32],
            NoColorSpace
          ),
          bumpScale: 0.02
        },
        cityGround: {
          ...ROAD_MATERIALS.cityGround,
          map: repeatTexture(
            textures.sidewalkPaverVariation,
            [18, 18],
            SRGBColorSpace
          ),
          roughnessMap: repeatTexture(
            textures.wetAsphaltRoughness,
            [22, 22],
            NoColorSpace
          ),
          bumpMap: repeatTexture(
            textures.sidewalkPaverVariation,
            [20, 20],
            NoColorSpace
          ),
          bumpScale: 0.014
        },
        buildingBlock: ROAD_MATERIALS.buildingBlock,
        buildingEdge: {
          ...ROAD_MATERIALS.buildingEdge,
          color: STAGE6_BUILDING_FACADE_MATERIAL_CONTROLS.baseColor,
          emissive: STAGE6_BUILDING_FACADE_MATERIAL_CONTROLS.emissive,
          emissiveIntensity:
            STAGE6_BUILDING_FACADE_MATERIAL_CONTROLS.emissiveIntensity,
          emissiveMap: repeatTexture(
            textures.facadeWindowEmissive,
            [8, 6],
            SRGBColorSpace
          )
        }
      };
    },
    [textures]
  );
}

function canUseRuntimeTextures() {
  return (
    typeof window !== "undefined" &&
    !/jsdom/i.test(window.navigator.userAgent)
  );
}

function repeatTexture(
  texture: Texture,
  repeat: readonly [number, number],
  colorSpace: Texture["colorSpace"]
) {
  const preparedTexture = texture.clone();

  preparedTexture.wrapS = RepeatWrapping;
  preparedTexture.wrapT = RepeatWrapping;
  preparedTexture.repeat.set(repeat[0], repeat[1]);
  preparedTexture.colorSpace = colorSpace;
  preparedTexture.needsUpdate = true;

  return preparedTexture;
}
