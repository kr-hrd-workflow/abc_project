import { useEffect, useMemo, useState } from "react";
import { useThree, type ThreeElements } from "@react-three/fiber";
import {
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Texture
} from "three";

type RoadMaterialProps = ThreeElements["meshStandardMaterial"];

export const STAGE5_TEXTURE_PATHS = {
  wetAsphaltAlbedo: "/simulation/r3f/assets/textures/wet_asphalt_albedo.webp",
  wetAsphaltRoughness: "/simulation/r3f/assets/textures/wet_asphalt_roughness.webp",
  wornLaneMarkings: "/simulation/r3f/assets/textures/worn_lane_markings.png",
  crosswalkWear: "/simulation/r3f/assets/textures/crosswalk_wear.png",
  curbGrime: "/simulation/r3f/assets/textures/curb_grime.png",
  sidewalkPaverVariation:
    "/simulation/r3f/assets/textures/sidewalk_paver_variation.webp",
  facadeWindowEmissive:
    "/simulation/r3f/assets/textures/facade_window_emissive.webp"
} as const;

type Stage5TextureKey = keyof typeof STAGE5_TEXTURE_PATHS;
type Stage5RuntimeTextures = Record<Stage5TextureKey, Texture>;

const STAGE5_TEXTURE_ENTRIES = Object.entries(STAGE5_TEXTURE_PATHS) as Array<
  [Stage5TextureKey, string]
>;

export const ROAD_MATERIALS = {
  asphalt: {
    color: "#37464a",
    roughness: 0.31,
    metalness: 0.035,
    envMapIntensity: 1.08,
    dithering: true
  },
  intersectionAsphalt: {
    color: "#303d41",
    roughness: 0.29,
    metalness: 0.05,
    envMapIntensity: 1.16,
    dithering: true
  },
  asphaltPatch: {
    color: "#233036",
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
    color: "#fffdf0",
    emissive: "#d4c6a3",
    emissiveIntensity: 0.58,
    roughness: 0.82,
    metalness: 0.02,
    transparent: true,
    opacity: 0.99,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    toneMapped: false,
    dithering: true
  },
  crosswalkMarking: {
    color: "#fff7df",
    emissive: "#c8b895",
    emissiveIntensity: 0.48,
    roughness: 0.86,
    metalness: 0.02,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    toneMapped: false,
    dithering: true
  },
  markingScuff: {
    color: "#30393c",
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
    color: "#33484f",
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
    color: "#283134",
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
    color: "#69675e",
    roughness: 0.9,
    metalness: 0.01,
    dithering: true
  },
  sidewalk: {
    color: "#60685f",
    roughness: 0.91,
    metalness: 0.02,
    dithering: true
  },
  cityGround: {
    color: "#253237",
    roughness: 0.86,
    metalness: 0.025,
    envMapIntensity: 0.48,
    dithering: true
  },
  buildingEdge: {
    color: "#29363c",
    roughness: 0.5,
    metalness: 0.12,
    emissive: "#42382c",
    emissiveIntensity: 0.52,
    envMapIntensity: 0.72,
    dithering: true
  }
} satisfies Record<string, RoadMaterialProps>;

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
          map: repeatTexture(textures.wetAsphaltAlbedo, [10, 32], SRGBColorSpace),
          roughnessMap: repeatTexture(
            textures.wetAsphaltRoughness,
            [10, 32],
            NoColorSpace
          ),
          bumpMap: repeatTexture(
            textures.wetAsphaltRoughness,
            [18, 44],
            NoColorSpace
          ),
          bumpScale: 0.045
        },
        intersectionAsphalt: {
          ...ROAD_MATERIALS.intersectionAsphalt,
          map: repeatTexture(textures.wetAsphaltAlbedo, [7, 7], SRGBColorSpace),
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
          bumpScale: 0.038
        },
        asphaltPatch: {
          ...ROAD_MATERIALS.asphaltPatch,
          map: repeatTexture(textures.wetAsphaltAlbedo, [4, 14], SRGBColorSpace),
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
          map: repeatTexture(textures.wornLaneMarkings, [1, 18], SRGBColorSpace),
          roughnessMap: repeatTexture(
            textures.wetAsphaltRoughness,
            [4, 28],
            NoColorSpace
          )
        },
        crosswalkMarking: {
          ...ROAD_MATERIALS.crosswalkMarking,
          map: repeatTexture(textures.crosswalkWear, [2, 1], SRGBColorSpace),
          roughnessMap: repeatTexture(
            textures.wetAsphaltRoughness,
            [3, 3],
            NoColorSpace
          )
        },
        markingScuff: {
          ...ROAD_MATERIALS.markingScuff,
          map: repeatTexture(textures.wornLaneMarkings, [2, 10], SRGBColorSpace),
          roughnessMap: repeatTexture(
            textures.wetAsphaltRoughness,
            [4, 16],
            NoColorSpace
          )
        },
        queueZone: ROAD_MATERIALS.queueZone,
        edgeGrime: {
          ...ROAD_MATERIALS.edgeGrime,
          map: repeatTexture(textures.curbGrime, [1, 22], SRGBColorSpace),
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
        buildingEdge: {
          ...ROAD_MATERIALS.buildingEdge,
          map: repeatTexture(textures.facadeWindowEmissive, [8, 6], SRGBColorSpace),
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
