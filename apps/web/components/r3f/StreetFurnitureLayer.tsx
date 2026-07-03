"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { Object3D, type Group, type InstancedMesh } from "three";

import {
  buildVehicleGlbGeometryGroups,
  InstancedVehicleGlbMesh,
  type VehicleGlbGeometryGroup,
  type VehicleGlbInstance
} from "./InstancedVehicleGlb";
import { getR3FAssetEntry } from "./assetManifest";
import type { Vector3Tuple } from "./roadGeometry";
import {
  STAGE5_SHADOWS_ENABLED,
  STAGE5_STREETLIGHT_SHADOW_CASTER_COUNT
} from "./shadowPolicy";

// Furniture GLB ids dressed onto the four approaches. Same first-pass assets the
// retired Stage5SceneAssets layer used — reused as DATA only; this layer mounts
// furniture ONLY (no static hero vehicles) so the count telemetry stays honest.
const STREET_FURNITURE_ASSET_IDS = [
  "props/streetlight",
  "props/tree_cluster",
  "props/curb_details",
  "props/outdoor_table_chair_set_01"
] as const;

type StreetFurnitureAssetId = (typeof STREET_FURNITURE_ASSET_IDS)[number];

export type StreetFurniturePlacement = {
  id: string;
  assetId: StreetFurnitureAssetId;
  position: Vector3Tuple;
  rotationY: number;
  scale: Vector3Tuple;
};

export type StreetFurnitureContactShadow = {
  id: string;
  position: Vector3Tuple;
  radius: number;
};

// Per-asset tint palettes for the tintable body groups (values mirror the
// Stage5 first-pass palettes so the furniture keeps its Korean-street look).
// Non-tintable authored materials (trunks, glass, metal) ignore these.
const STREET_FURNITURE_COLORS: Record<StreetFurnitureAssetId, readonly string[]> =
  {
    "props/streetlight": ["#515c64"],
    "props/tree_cluster": ["#486747", "#587755"],
    "props/curb_details": ["#756f64", "#91887b"],
    "props/outdoor_table_chair_set_01": ["#8f8067", "#a69472", "#6d6257"]
  };

// Sidewalk centerlines derived from SIDEWALK_SLABS geometry:
//   offset = roadHalfWidth + CURB_WIDTH(0.45) + SIDEWALK_WIDTH/2(2.75)
//   강남대로 N/S & 테헤란로 E: (36/2)+0.45+2.75 = 21.2 m
//   서초대로 W:              (28.8/2)+0.45+2.75 = 17.6 m
// Intersection box half-extent is 18 m on both axes, so furniture starts ~20 m
// beyond the box (|distance-from-center| >= 38 m) and never enters the box or
// the carriageway (every placement clears |x|>=14 AND |z|>=14).
const NS_SIDEWALK = 21.2; // x for north/south approaches
const E_SIDEWALK = 21.2; // z for the east approach (테헤란로, 10 lanes)
const W_SIDEWALK = 17.6; // z for the west approach (서초대로, 8 lanes)

const STREETLIGHT_ROT = {
  facingNegX: Math.PI / 2,
  facingPosX: -Math.PI / 2,
  facingNegZ: Math.PI,
  facingPosZ: 0
} as const;

export const STREET_FURNITURE_PLACEMENTS: StreetFurniturePlacement[] = [
  // --- 12 streetlights: 3 per approach at 30 m spacing, alternating sides ---
  // North approach (runs toward -z)
  { id: "sf-north-streetlight-1", assetId: "props/streetlight", position: [NS_SIDEWALK, 0.04, -38], rotationY: STREETLIGHT_ROT.facingNegX, scale: [1, 1, 1] },
  { id: "sf-north-streetlight-2", assetId: "props/streetlight", position: [-NS_SIDEWALK, 0.04, -68], rotationY: STREETLIGHT_ROT.facingPosX, scale: [1, 1, 1] },
  { id: "sf-north-streetlight-3", assetId: "props/streetlight", position: [NS_SIDEWALK, 0.04, -98], rotationY: STREETLIGHT_ROT.facingNegX, scale: [1, 1, 1] },
  // South approach (runs toward +z)
  { id: "sf-south-streetlight-1", assetId: "props/streetlight", position: [-NS_SIDEWALK, 0.04, 38], rotationY: STREETLIGHT_ROT.facingPosX, scale: [1, 1, 1] },
  { id: "sf-south-streetlight-2", assetId: "props/streetlight", position: [NS_SIDEWALK, 0.04, 68], rotationY: STREETLIGHT_ROT.facingNegX, scale: [1, 1, 1] },
  { id: "sf-south-streetlight-3", assetId: "props/streetlight", position: [-NS_SIDEWALK, 0.04, 98], rotationY: STREETLIGHT_ROT.facingPosX, scale: [1, 1, 1] },
  // East approach (runs toward +x)
  { id: "sf-east-streetlight-1", assetId: "props/streetlight", position: [38, 0.04, E_SIDEWALK], rotationY: STREETLIGHT_ROT.facingNegZ, scale: [1, 1, 1] },
  { id: "sf-east-streetlight-2", assetId: "props/streetlight", position: [68, 0.04, -E_SIDEWALK], rotationY: STREETLIGHT_ROT.facingPosZ, scale: [1, 1, 1] },
  { id: "sf-east-streetlight-3", assetId: "props/streetlight", position: [98, 0.04, E_SIDEWALK], rotationY: STREETLIGHT_ROT.facingNegZ, scale: [1, 1, 1] },
  // West approach (runs toward -x)
  { id: "sf-west-streetlight-1", assetId: "props/streetlight", position: [-38, 0.04, W_SIDEWALK], rotationY: STREETLIGHT_ROT.facingNegZ, scale: [1, 1, 1] },
  { id: "sf-west-streetlight-2", assetId: "props/streetlight", position: [-68, 0.04, -W_SIDEWALK], rotationY: STREETLIGHT_ROT.facingPosZ, scale: [1, 1, 1] },
  { id: "sf-west-streetlight-3", assetId: "props/streetlight", position: [-98, 0.04, W_SIDEWALK], rotationY: STREETLIGHT_ROT.facingNegZ, scale: [1, 1, 1] },

  // --- 8 tree clusters: 2 per approach, between the streetlights, opposite side ---
  { id: "sf-north-tree-1", assetId: "props/tree_cluster", position: [-NS_SIDEWALK, 0.02, -53], rotationY: Math.PI / 7, scale: [1.06, 1.06, 1.06] },
  { id: "sf-north-tree-2", assetId: "props/tree_cluster", position: [NS_SIDEWALK, 0.02, -83], rotationY: -Math.PI / 5, scale: [0.98, 0.98, 0.98] },
  { id: "sf-south-tree-1", assetId: "props/tree_cluster", position: [NS_SIDEWALK, 0.02, 53], rotationY: Math.PI / 4, scale: [1.04, 1.04, 1.04] },
  { id: "sf-south-tree-2", assetId: "props/tree_cluster", position: [-NS_SIDEWALK, 0.02, 83], rotationY: -Math.PI / 6, scale: [1.0, 1.0, 1.0] },
  { id: "sf-east-tree-1", assetId: "props/tree_cluster", position: [53, 0.02, -E_SIDEWALK], rotationY: Math.PI / 8, scale: [1.05, 1.05, 1.05] },
  { id: "sf-east-tree-2", assetId: "props/tree_cluster", position: [83, 0.02, E_SIDEWALK], rotationY: -Math.PI / 3, scale: [0.97, 0.97, 0.97] },
  { id: "sf-west-tree-1", assetId: "props/tree_cluster", position: [-53, 0.02, -W_SIDEWALK], rotationY: Math.PI / 5, scale: [1.03, 1.03, 1.03] },
  { id: "sf-west-tree-2", assetId: "props/tree_cluster", position: [-83, 0.02, W_SIDEWALK], rotationY: -Math.PI / 4, scale: [1.01, 1.01, 1.01] },

  // --- 4 curb details: one per approach, near the near-intersection curb line ---
  { id: "sf-north-curb", assetId: "props/curb_details", position: [NS_SIDEWALK, 0.03, -25], rotationY: 0, scale: [1, 1, 1] },
  { id: "sf-south-curb", assetId: "props/curb_details", position: [-NS_SIDEWALK, 0.03, 25], rotationY: 0, scale: [1, 1, 1] },
  { id: "sf-east-curb", assetId: "props/curb_details", position: [25, 0.03, E_SIDEWALK], rotationY: -Math.PI / 2, scale: [1, 1, 1] },
  { id: "sf-west-curb", assetId: "props/curb_details", position: [-25, 0.03, -W_SIDEWALK], rotationY: -Math.PI / 2, scale: [1, 1, 1] },

  // --- 2 sidewalk-cafe seating sets on the SW / SE plaza corners ---
  { id: "sf-southwest-cafe-seating", assetId: "props/outdoor_table_chair_set_01", position: [-24, 0.035, 24], rotationY: Math.PI / 3, scale: [0.96, 0.96, 0.96] },
  { id: "sf-southeast-cafe-seating", assetId: "props/outdoor_table_chair_set_01", position: [24, 0.035, 24], rotationY: -Math.PI / 3, scale: [0.96, 0.96, 0.96] }
];

// Flat AO discs grounding the biggest footprints (tree clusters on the sidewalk,
// cafe sets on the corner apron) so they read as planted, not floating. y sits
// each disc just above the surface it rests on (sidewalk top ~0.09, apron ~0).
export const STREET_FURNITURE_CONTACT_SHADOWS: StreetFurnitureContactShadow[] = [
  ...STREET_FURNITURE_PLACEMENTS.filter(
    (p) => p.assetId === "props/tree_cluster"
  ).map((p) => ({
    id: `${p.id}-contact-shadow`,
    position: [p.position[0], 0.1, p.position[2]] as Vector3Tuple,
    radius: 2.3
  })),
  ...STREET_FURNITURE_PLACEMENTS.filter(
    (p) => p.assetId === "props/outdoor_table_chair_set_01"
  ).map((p) => ({
    id: `${p.id}-contact-shadow`,
    position: [p.position[0], 0.02, p.position[2]] as Vector3Tuple,
    radius: 1.7
  }))
];

export function StreetFurnitureLayer() {
  if (!canUseRuntimeAssets()) {
    return null;
  }

  return <RuntimeStreetFurnitureLayer />;
}

StreetFurnitureLayer.displayName = "StreetFurnitureLayer";

function RuntimeStreetFurnitureLayer() {
  const streetlight = useGLTF(getR3FAssetEntry("props/streetlight").path);
  const treeCluster = useGLTF(getR3FAssetEntry("props/tree_cluster").path);
  const curbDetails = useGLTF(getR3FAssetEntry("props/curb_details").path);
  const outdoorTableChairSet = useGLTF(
    getR3FAssetEntry("props/outdoor_table_chair_set_01").path
  );
  const scenes: Record<StreetFurnitureAssetId, Group> = {
    "props/streetlight": streetlight.scene,
    "props/tree_cluster": treeCluster.scene,
    "props/curb_details": curbDetails.scene,
    "props/outdoor_table_chair_set_01": outdoorTableChairSet.scene
  };
  const geometryGroupsByAsset = useMemo(
    () =>
      Object.fromEntries(
        STREET_FURNITURE_ASSET_IDS.map((assetId) => [
          assetId,
          buildVehicleGlbGeometryGroups(assetId, scenes[assetId])
        ])
      ) as Record<StreetFurnitureAssetId, VehicleGlbGeometryGroup[]>,
    [
      streetlight.scene,
      treeCluster.scene,
      curbDetails.scene,
      outdoorTableChairSet.scene
    ]
  );

  return (
    <group name="street-furniture-layer">
      {STREET_FURNITURE_ASSET_IDS.flatMap((assetId) => {
        const geometryGroups = geometryGroupsByAsset[assetId];
        if (!geometryGroups || geometryGroups.length === 0) return [];

        const placements = STREET_FURNITURE_PLACEMENTS.filter(
          (placement) => placement.assetId === assetId
        );
        if (placements.length === 0) return [];

        const palette = STREET_FURNITURE_COLORS[assetId];
        const instances: VehicleGlbInstance[] = placements.map(
          (placement, index) => ({
            x: placement.position[0],
            z: placement.position[2],
            rotationY: placement.rotationY,
            scale: placement.scale[0],
            color: palette[index % palette.length]
          })
        );

        // Only streetlights cast real-time shadows, and only the first
        // STAGE5_STREETLIGHT_SHADOW_CASTER_COUNT fixtures on the first (main pole)
        // material group — more lights must NOT silently inflate the shadow-caster
        // budget, and splitting only group 0 keeps the extra draw call to one.
        const castsShadows =
          STAGE5_SHADOWS_ENABLED && assetId === "props/streetlight";

        return geometryGroups.flatMap((group, groupIndex) => {
          if (!castsShadows || groupIndex !== 0) {
            return [
              <InstancedVehicleGlbMesh
                key={group.key}
                name={`street-furniture-${assetId}-${group.role}`}
                group={group}
                instances={instances}
              />
            ];
          }

          const shadowInstances = instances.slice(
            0,
            STAGE5_STREETLIGHT_SHADOW_CASTER_COUNT
          );
          const plainInstances = instances.slice(
            STAGE5_STREETLIGHT_SHADOW_CASTER_COUNT
          );
          return [
            <InstancedVehicleGlbMesh
              key={group.key}
              name={`street-furniture-${assetId}-${group.role}`}
              group={group}
              instances={plainInstances}
            />,
            <InstancedVehicleGlbMesh
              key={`${group.key}-shadow`}
              name={`street-furniture-${assetId}-${group.role}-shadow`}
              group={group}
              instances={shadowInstances}
              castShadow
            />
          ];
        });
      })}
      <StreetFurnitureContactShadows />
    </group>
  );
}

// All furniture contact discs in ONE InstancedMesh (one draw call) — per-disc
// radius rides the instance scale on a unit circle. Mirrors the retired
// Stage5StreetFurnitureContactShadows batching so the layer stays draw-call cheap.
function StreetFurnitureContactShadows() {
  const meshRef = useRef<InstancedMesh>(null);
  const tempObjectRef = useRef(new Object3D());

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const tempObject = tempObjectRef.current;
    STREET_FURNITURE_CONTACT_SHADOWS.forEach((shadow, index) => {
      tempObject.position.set(...shadow.position);
      tempObject.rotation.set(-Math.PI / 2, 0, 0);
      tempObject.scale.set(shadow.radius, shadow.radius, 1);
      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh
      ref={meshRef}
      name="street-furniture-contact-shadows"
      args={[undefined, undefined, STREET_FURNITURE_CONTACT_SHADOWS.length]}
      renderOrder={2}
    >
      <circleGeometry args={[1, 16]} />
      <meshBasicMaterial
        color="#000"
        transparent
        opacity={0.28}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function canUseRuntimeAssets() {
  return (
    typeof window !== "undefined" &&
    !/jsdom/i.test(window.navigator.userAgent)
  );
}
