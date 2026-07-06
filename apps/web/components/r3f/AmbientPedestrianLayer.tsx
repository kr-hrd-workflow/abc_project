"use client";

import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import {
  BufferGeometry,
  CircleGeometry,
  ClampToEdgeWrapping,
  DoubleSide,
  PlaneGeometry,
  SRGBColorSpace,
  type Texture
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { Vector3Tuple } from "./roadGeometry";

export const AMBIENT_PEDESTRIAN_TRUTH_SOURCE = "ambient_background_proxy";
export const AMBIENT_PEDESTRIAN_ATLAS_URL =
  "/simulation/r3f/assets/sprites/pedestrian-commuter-atlas.png";

const ATLAS_COLUMNS = 4;
const ATLAS_ROWS = 2;
const ATLAS_CELL_U = 1 / ATLAS_COLUMNS;
const ATLAS_CELL_V = 1 / ATLAS_ROWS;
const PEDESTRIAN_GROUND_Y = 0.055;
const OPERATOR_WIDE_IMPOSTOR_PITCH = -Math.PI / 3;
const OPERATOR_WIDE_IMPOSTOR_YAW = 0.18;
const CCTV_IMPOSTOR_PITCH = 0;
const CCTV_IMPOSTOR_YAW = 0.62;
const OPERATOR_WIDE_IMPOSTOR_RENDER_ORDER = 6;
const CCTV_IMPOSTOR_RENDER_ORDER = 8;
const OPERATOR_WIDE_ALPHA_TEST = 0.18;
const CCTV_ALPHA_TEST = 0.28;

export type AmbientPedestrianViewpoint = "wide" | "cctv";

export type AmbientPedestrianVariant = {
  id: string;
  detailLevel: "near" | "mid" | "far";
  spriteWidthMeters: number;
  spriteHeightMeters: number;
  contactShadowScale: Vector3Tuple;
  baseOpacity: number;
};

export type AmbientPedestrianSpec = {
  id: string;
  position: Vector3Tuple;
  rotationY: number;
  variantId: string;
  atlasIndex: number;
  opacity: number;
};

type AmbientPedestrianUserData = {
  pedestrianLayer: "ambient";
  sumoTruth: false;
  truthSource: typeof AMBIENT_PEDESTRIAN_TRUTH_SOURCE;
  ambientPedestrianId: string;
  photorealRole: "imagegen_operator_distance_background_person";
  renderMode:
    | "imagegen_alpha_sprite_impostor"
    | "imagegen_alpha_upright_3d_billboard";
  visualTruth: typeof AMBIENT_PEDESTRIAN_TRUTH_SOURCE;
  lodVariantId: string;
  atlasUrl: typeof AMBIENT_PEDESTRIAN_ATLAS_URL;
  atlasIndex: number;
};

type AmbientPedestrianRenderEntry = AmbientPedestrianSpec & {
  variant: AmbientPedestrianVariant;
  spriteScale: Vector3Tuple;
  shadowScale: Vector3Tuple;
  userData: AmbientPedestrianUserData;
  proofMetadata: AmbientPedestrianUserData;
};

export type AmbientPedestrianRenderPlan = {
  ambientPedestrians: AmbientPedestrianRenderEntry[];
  sourceLabel: typeof AMBIENT_PEDESTRIAN_TRUTH_SOURCE;
  atlasUrl: typeof AMBIENT_PEDESTRIAN_ATLAS_URL;
  renderProfile: "operator_wide" | "cctv_legible";
  renderMode: AmbientPedestrianUserData["renderMode"];
  impostorPitch: number;
  impostorYaw: number;
  impostorRenderOrder: number;
  materialAlphaTest: number;
  materialDepthWrite: boolean;
};

export const AMBIENT_PEDESTRIAN_VARIANTS: AmbientPedestrianVariant[] = [
  {
    id: "near-sidewalk",
    detailLevel: "near",
    spriteWidthMeters: 1.12,
    spriteHeightMeters: 2.36,
    contactShadowScale: [0.58, 0.18, 1],
    baseOpacity: 0.96
  },
  {
    id: "cctv-foreground",
    detailLevel: "near",
    spriteWidthMeters: 1.24,
    spriteHeightMeters: 2.44,
    contactShadowScale: [0.66, 0.2, 1],
    baseOpacity: 0.98
  },
  {
    id: "mid-plaza",
    detailLevel: "mid",
    spriteWidthMeters: 0.98,
    spriteHeightMeters: 2.08,
    contactShadowScale: [0.5, 0.15, 1],
    baseOpacity: 0.9
  },
  {
    id: "far-silhouette",
    detailLevel: "far",
    spriteWidthMeters: 0.8,
    spriteHeightMeters: 1.72,
    contactShadowScale: [0.4, 0.12, 1],
    baseOpacity: 0.78
  }
];

type AmbientPedestrianRenderProfile = {
  name: AmbientPedestrianRenderPlan["renderProfile"];
  renderMode: AmbientPedestrianUserData["renderMode"];
  impostorPitch: number;
  impostorYaw: number;
  impostorRenderOrder: number;
  materialAlphaTest: number;
  materialDepthWrite: boolean;
  scaleByDetailLevel: Record<AmbientPedestrianVariant["detailLevel"], number>;
};

const AMBIENT_PEDESTRIAN_RENDER_PROFILES = {
  wide: {
    name: "operator_wide",
    renderMode: "imagegen_alpha_sprite_impostor",
    impostorPitch: OPERATOR_WIDE_IMPOSTOR_PITCH,
    impostorYaw: OPERATOR_WIDE_IMPOSTOR_YAW,
    impostorRenderOrder: OPERATOR_WIDE_IMPOSTOR_RENDER_ORDER,
    materialAlphaTest: OPERATOR_WIDE_ALPHA_TEST,
    materialDepthWrite: false,
    scaleByDetailLevel: {
      near: 1,
      mid: 1,
      far: 1
    }
  },
  cctv: {
    name: "cctv_legible",
    renderMode: "imagegen_alpha_upright_3d_billboard",
    impostorPitch: CCTV_IMPOSTOR_PITCH,
    impostorYaw: CCTV_IMPOSTOR_YAW,
    impostorRenderOrder: CCTV_IMPOSTOR_RENDER_ORDER,
    materialAlphaTest: CCTV_ALPHA_TEST,
    materialDepthWrite: true,
    scaleByDetailLevel: {
      near: 1.72,
      mid: 1.45,
      far: 1.12
    }
  }
} as const satisfies Record<
  AmbientPedestrianViewpoint,
  AmbientPedestrianRenderProfile
>;

export const AMBIENT_PEDESTRIAN_SPECS: AmbientPedestrianSpec[] = [
  {
    id: "cctv-foreground-southeast-corner-1",
    position: [20, PEDESTRIAN_GROUND_Y, 8.65],
    rotationY: 2.65,
    variantId: "cctv-foreground",
    atlasIndex: 4,
    opacity: 0.98
  },
  {
    id: "cctv-foreground-southeast-corner-2",
    position: [20.75, PEDESTRIAN_GROUND_Y, 10.38],
    rotationY: 2.45,
    variantId: "cctv-foreground",
    atlasIndex: 5,
    opacity: 0.96
  },
  {
    id: "cctv-foreground-southeast-corner-3",
    position: [22.1, PEDESTRIAN_GROUND_Y, 13.84],
    rotationY: 2.35,
    variantId: "cctv-foreground",
    atlasIndex: 6,
    opacity: 0.96
  },
  {
    id: "cctv-foreground-southwest-corner-1",
    position: [-20.75, PEDESTRIAN_GROUND_Y, 10.38],
    rotationY: -2.35,
    variantId: "cctv-foreground",
    atlasIndex: 7,
    opacity: 0.94
  },
  {
    id: "nw-plaza-crosswalk-wait-1",
    position: [-23, PEDESTRIAN_GROUND_Y, -22],
    rotationY: 0.25,
    variantId: "near-sidewalk",
    atlasIndex: 0,
    opacity: 0.94
  },
  {
    id: "nw-sidewalk-pair-2",
    position: [-35, PEDESTRIAN_GROUND_Y, -18],
    rotationY: -0.15,
    variantId: "mid-plaza",
    atlasIndex: 1,
    opacity: 0.88
  },
  {
    id: "ne-plaza-crosswalk-wait-1",
    position: [24, PEDESTRIAN_GROUND_Y, -25],
    rotationY: -0.35,
    variantId: "near-sidewalk",
    atlasIndex: 2,
    opacity: 0.95
  },
  {
    id: "ne-sidewalk-window-shopper-2",
    position: [38, PEDESTRIAN_GROUND_Y, -31],
    rotationY: 0.55,
    variantId: "mid-plaza",
    atlasIndex: 3,
    opacity: 0.84
  },
  {
    id: "se-retail-plaza-1",
    position: [25, PEDESTRIAN_GROUND_Y, 24],
    rotationY: 2.85,
    variantId: "near-sidewalk",
    atlasIndex: 4,
    opacity: 0.92
  },
  {
    id: "se-sidewalk-walker-2",
    position: [42, PEDESTRIAN_GROUND_Y, 34],
    rotationY: 2.35,
    variantId: "mid-plaza",
    atlasIndex: 5,
    opacity: 0.82
  },
  {
    id: "sw-station-plaza-1",
    position: [-25, PEDESTRIAN_GROUND_Y, 26],
    rotationY: -2.85,
    variantId: "near-sidewalk",
    atlasIndex: 6,
    opacity: 0.92
  },
  {
    id: "sw-sidewalk-walker-2",
    position: [-44, PEDESTRIAN_GROUND_Y, 36],
    rotationY: -2.45,
    variantId: "mid-plaza",
    atlasIndex: 7,
    opacity: 0.82
  },
  {
    id: "north-sidewalk-distance-1",
    position: [-20, PEDESTRIAN_GROUND_Y, -54],
    rotationY: 0.1,
    variantId: "far-silhouette",
    atlasIndex: 0,
    opacity: 0.68
  },
  {
    id: "east-sidewalk-distance-1",
    position: [56, PEDESTRIAN_GROUND_Y, -20],
    rotationY: 1.45,
    variantId: "far-silhouette",
    atlasIndex: 3,
    opacity: 0.66
  },
  {
    id: "south-sidewalk-distance-1",
    position: [18.5, PEDESTRIAN_GROUND_Y, 58],
    rotationY: 3.1,
    variantId: "far-silhouette",
    atlasIndex: 5,
    opacity: 0.66
  },
  {
    id: "west-sidewalk-distance-1",
    position: [-58, PEDESTRIAN_GROUND_Y, 18.5],
    rotationY: -1.5,
    variantId: "far-silhouette",
    atlasIndex: 6,
    opacity: 0.66
  }
];

if (
  typeof window !== "undefined" &&
  !/jsdom/i.test(window.navigator?.userAgent ?? "")
) {
  useTexture.preload(AMBIENT_PEDESTRIAN_ATLAS_URL);
}

export function buildAmbientPedestrianRenderPlan(
  viewpoint: AmbientPedestrianViewpoint = "wide"
): AmbientPedestrianRenderPlan {
  const renderProfile = AMBIENT_PEDESTRIAN_RENDER_PROFILES[viewpoint];

  return {
    ambientPedestrians: AMBIENT_PEDESTRIAN_SPECS.map((spec) => {
      const variant = resolveAmbientPedestrianVariant(spec.variantId);
      const scaleMultiplier =
        renderProfile.scaleByDetailLevel[variant.detailLevel];
      const proofMetadata: AmbientPedestrianUserData = {
        pedestrianLayer: "ambient",
        sumoTruth: false,
        truthSource: AMBIENT_PEDESTRIAN_TRUTH_SOURCE,
        visualTruth: AMBIENT_PEDESTRIAN_TRUTH_SOURCE,
        ambientPedestrianId: spec.id,
        photorealRole: "imagegen_operator_distance_background_person",
        renderMode: renderProfile.renderMode,
        lodVariantId: variant.id,
        atlasUrl: AMBIENT_PEDESTRIAN_ATLAS_URL,
        atlasIndex: spec.atlasIndex
      };

      return {
        ...spec,
        variant,
        spriteScale: [
          variant.spriteWidthMeters * scaleMultiplier,
          variant.spriteHeightMeters * scaleMultiplier,
          1
        ],
        shadowScale: [
          variant.contactShadowScale[0] * scaleMultiplier,
          variant.contactShadowScale[1] * scaleMultiplier,
          1
        ],
        userData: proofMetadata,
        proofMetadata
      };
    }),
    sourceLabel: AMBIENT_PEDESTRIAN_TRUTH_SOURCE,
    atlasUrl: AMBIENT_PEDESTRIAN_ATLAS_URL,
    renderProfile: renderProfile.name,
    renderMode: renderProfile.renderMode,
    impostorPitch: renderProfile.impostorPitch,
    impostorYaw: renderProfile.impostorYaw,
    impostorRenderOrder: renderProfile.impostorRenderOrder,
    materialAlphaTest: renderProfile.materialAlphaTest,
    materialDepthWrite: renderProfile.materialDepthWrite
  };
}

export function pedestrianAtlasUvRect(
  atlasIndex: number
): [number, number, number, number] {
  const column = atlasIndex % ATLAS_COLUMNS;
  const row = Math.floor(atlasIndex / ATLAS_COLUMNS);

  return [
    column * ATLAS_CELL_U,
    1 - (row + 1) * ATLAS_CELL_V,
    (column + 1) * ATLAS_CELL_U,
    1 - row * ATLAS_CELL_V
  ];
}

function configurePedestrianAtlasTexture(texture: Texture): Texture {
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.repeat.set(1, 1);
  texture.offset.set(0, 0);
  texture.needsUpdate = true;

  return texture;
}

export function buildAmbientPedestrianImpostorGeometry(
  pedestrians: AmbientPedestrianRenderEntry[],
  impostorPitch = OPERATOR_WIDE_IMPOSTOR_PITCH,
  impostorYaw = OPERATOR_WIDE_IMPOSTOR_YAW
): BufferGeometry {
  const geometries = pedestrians.map((pedestrian) => {
    const [u0, v0, u1, v1] = pedestrianAtlasUvRect(pedestrian.atlasIndex);
    const geometry = new PlaneGeometry(
      pedestrian.spriteScale[0],
      pedestrian.spriteScale[1]
    );
    const uv = geometry.attributes.uv;

    for (let i = 0; i < uv.count; i += 1) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      uv.setXY(i, u0 + u * (u1 - u0), v0 + v * (v1 - v0));
    }

    uv.needsUpdate = true;
    geometry.translate(0, pedestrian.spriteScale[1] / 2, 0);
    geometry.rotateX(impostorPitch);
    geometry.rotateY(impostorYaw + pedestrian.rotationY * 0.08);
    geometry.translate(
      pedestrian.position[0],
      pedestrian.position[1],
      pedestrian.position[2]
    );
    return geometry;
  });

  return mergeGeometries(geometries, false) ?? new BufferGeometry();
}

export function buildAmbientPedestrianShadowGeometry(
  pedestrians: AmbientPedestrianRenderEntry[]
): BufferGeometry {
  const geometries = pedestrians.map((pedestrian) => {
    const geometry = new CircleGeometry(1, 24);
    geometry.scale(
      pedestrian.shadowScale[0],
      pedestrian.shadowScale[1],
      1
    );
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(
      pedestrian.position[0],
      pedestrian.position[1] + 0.018,
      pedestrian.position[2]
    );
    return geometry;
  });

  return mergeGeometries(geometries, false) ?? new BufferGeometry();
}

function resolveAmbientPedestrianVariant(id: string): AmbientPedestrianVariant {
  return (
    AMBIENT_PEDESTRIAN_VARIANTS.find((variant) => variant.id === id) ??
    AMBIENT_PEDESTRIAN_VARIANTS[0]
  );
}

export function AmbientPedestrianLayer({
  viewpoint = "wide"
}: {
  viewpoint?: AmbientPedestrianViewpoint;
} = {}) {
  const atlasTexture = useTexture(AMBIENT_PEDESTRIAN_ATLAS_URL) as Texture;
  const plan = useMemo(
    () => buildAmbientPedestrianRenderPlan(viewpoint),
    [viewpoint]
  );
  const configuredAtlasTexture = useMemo(
    () => configurePedestrianAtlasTexture(atlasTexture),
    [atlasTexture]
  );
  const impostorGeometry = useMemo(
    () =>
      buildAmbientPedestrianImpostorGeometry(
        plan.ambientPedestrians,
        plan.impostorPitch,
        plan.impostorYaw
      ),
    [plan]
  );
  const shadowGeometry = useMemo(
    () => buildAmbientPedestrianShadowGeometry(plan.ambientPedestrians),
    [plan]
  );

  useEffect(
    () => () => {
      impostorGeometry.dispose();
      shadowGeometry.dispose();
    },
    [impostorGeometry, shadowGeometry]
  );

  return (
    <group
      name="stage6-ambient-pedestrian-layer"
      userData={{
        pedestrianLayer: "ambient",
        sumoTruth: false,
        truthSource: AMBIENT_PEDESTRIAN_TRUTH_SOURCE,
        visualTruth: AMBIENT_PEDESTRIAN_TRUTH_SOURCE,
        ambientPedestrianCount: plan.ambientPedestrians.length,
        photorealRole: "imagegen_operator_distance_background_person",
        renderMode: plan.renderMode,
        renderProfile: plan.renderProfile,
        atlasUrl: AMBIENT_PEDESTRIAN_ATLAS_URL
      }}
    >
      <mesh
        name="ambient-pedestrian-contact-shadows"
        geometry={shadowGeometry}
        userData={{
          pedestrianLayer: "ambient",
          sumoTruth: false,
          truthSource: AMBIENT_PEDESTRIAN_TRUTH_SOURCE,
          renderMode: "merged_contact_shadows",
          ambientPedestrianCount: plan.ambientPedestrians.length
        }}
      >
        <meshBasicMaterial
          color="#07090a"
          transparent
          opacity={0.22}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh
        name="ambient-pedestrian-imagegen-impostors"
        geometry={impostorGeometry}
        renderOrder={plan.impostorRenderOrder}
        userData={{
          pedestrianLayer: "ambient",
          sumoTruth: false,
          truthSource: AMBIENT_PEDESTRIAN_TRUTH_SOURCE,
          visualTruth: AMBIENT_PEDESTRIAN_TRUTH_SOURCE,
          photorealRole: "imagegen_operator_distance_background_person",
          renderMode: plan.renderMode,
          renderProfile: plan.renderProfile,
          ambientPedestrianCount: plan.ambientPedestrians.length,
          atlasUrl: AMBIENT_PEDESTRIAN_ATLAS_URL,
          mergedAtlasCells: plan.ambientPedestrians.map(
            (pedestrian) => pedestrian.atlasIndex
          )
        }}
      >
        <meshBasicMaterial
          map={configuredAtlasTexture}
          transparent
          opacity={0.92}
          alphaTest={plan.materialAlphaTest}
          depthWrite={plan.materialDepthWrite}
          depthTest
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

AmbientPedestrianLayer.displayName = "AmbientPedestrianLayer";
