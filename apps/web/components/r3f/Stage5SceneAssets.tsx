"use client";

import { useEffect, useRef } from "react";
import { Clone, useGLTF } from "@react-three/drei";
import { DoubleSide, Object3D, type Group, type InstancedMesh } from "three";

import {
  BUILDING_EDGE_BLOCKS,
  type Vector3Tuple
} from "./roadGeometry";
import { getR3FAssetEntry, type R3FAssetId } from "./assetManifest";
import { useStage5RoadMaterials } from "./roadMaterials";

export const STAGE5_HERO_GLB_ASSET_IDS = [
  "vehicles/bus_far",
  "vehicles/emergency_ambulance_medium"
] as const satisfies readonly R3FAssetId[];

export const STAGE5_VISIBLE_TRAFFIC_GLB_ASSET_IDS = [
  "vehicles/bus_far",
  "vehicles/emergency_ambulance_medium"
] as const satisfies readonly R3FAssetId[];

export const STAGE5_STREET_FURNITURE_GLB_ASSET_IDS = [
  "props/streetlight"
] as const satisfies readonly R3FAssetId[];

type Stage5HeroAssetId = (typeof STAGE5_HERO_GLB_ASSET_IDS)[number];
type Stage5VisibleTrafficAssetId =
  (typeof STAGE5_VISIBLE_TRAFFIC_GLB_ASSET_IDS)[number];
type Stage5StreetFurnitureAssetId =
  (typeof STAGE5_STREET_FURNITURE_GLB_ASSET_IDS)[number];

export type Stage5VisibleTrafficVehiclePlacement = {
  id: string;
  assetId: Stage5VisibleTrafficAssetId;
  position: Vector3Tuple;
  rotationY: number;
  scale: Vector3Tuple;
};

export type Stage5HeroVehiclePlacement = Stage5VisibleTrafficVehiclePlacement & {
  assetId: Stage5HeroAssetId;
};

export type Stage5FacadePanelSpec = {
  id: string;
  position: Vector3Tuple;
  rotationY: number;
  size: [number, number];
};

export type Stage5StreetFurniturePlacement = {
  id: string;
  assetId: Stage5StreetFurnitureAssetId;
  position: Vector3Tuple;
  rotationY: number;
  scale: Vector3Tuple;
};

export type Stage5StreetFurnitureContactShadowPlacement = {
  id: string;
  sourcePlacementId: string;
  position: Vector3Tuple;
  rotationY: number;
  size: [number, number];
  opacity: number;
};

const FACADE_HEIGHT_METERS = 4.8;
const FACADE_INSET_METERS = 0.035;

export const STAGE5_HERO_VEHICLE_PLACEMENTS: Stage5HeroVehiclePlacement[] = [
  {
    id: "stage5-south-foreground-bus-glb",
    assetId: "vehicles/bus_far",
    position: [-5.4, 0.04, 48],
    rotationY: Math.PI,
    scale: [1.02, 1.02, 1.02]
  },
  {
    id: "stage5-east-emergency-ambulance-glb",
    assetId: "vehicles/emergency_ambulance_medium",
    position: [47, 0.04, -5.4],
    rotationY: Math.PI / 2,
    scale: [0.94, 0.94, 0.94]
  }
];

export const STAGE5_VISIBLE_TRAFFIC_GLB_PLACEMENTS: Stage5VisibleTrafficVehiclePlacement[] = [
  ...STAGE5_HERO_VEHICLE_PLACEMENTS
];

export const STAGE5_STREET_FURNITURE_PLACEMENTS: Stage5StreetFurniturePlacement[] = [
  {
    id: "stage5-southwest-streetlight-glb",
    assetId: "props/streetlight",
    position: [-14.8, 0.04, 45],
    rotationY: -Math.PI / 5,
    scale: [1, 1, 1]
  },
  {
    id: "stage5-northeast-streetlight-glb",
    assetId: "props/streetlight",
    position: [14.8, 0.04, -44],
    rotationY: Math.PI + Math.PI / 5,
    scale: [1, 1, 1]
  }
];

export const STAGE5_STREET_FURNITURE_CONTACT_SHADOW_PLACEMENTS: Stage5StreetFurnitureContactShadowPlacement[] = [
  {
    id: "stage5-southwest-streetlight-contact-shadow",
    sourcePlacementId: "stage5-southwest-streetlight-glb",
    position: [-14.8, 0.024, 45],
    rotationY: -Math.PI / 5,
    size: [1.55, 0.48],
    opacity: 0.34
  },
  {
    id: "stage5-northeast-streetlight-contact-shadow",
    sourcePlacementId: "stage5-northeast-streetlight-glb",
    position: [14.8, 0.024, -44],
    rotationY: Math.PI + Math.PI / 5,
    size: [1.55, 0.48],
    opacity: 0.34
  }
];

export const STAGE5_FACADE_PANELS: Stage5FacadePanelSpec[] =
  buildStage5FacadePanels();

export function Stage5SceneAssets() {
  if (!canUseRuntimeAssets()) {
    return null;
  }

  return <RuntimeStage5SceneAssets />;
}

function RuntimeStage5SceneAssets() {
  const bus = useGLTF(getR3FAssetEntry("vehicles/bus_far").path);
  const ambulance = useGLTF(
    getR3FAssetEntry("vehicles/emergency_ambulance_medium").path
  );
  const streetlight = useGLTF(getR3FAssetEntry("props/streetlight").path);
  const visibleTrafficScenes: Record<Stage5VisibleTrafficAssetId, Group> = {
    "vehicles/bus_far": bus.scene,
    "vehicles/emergency_ambulance_medium": ambulance.scene
  };
  const streetFurnitureScenes: Record<Stage5StreetFurnitureAssetId, Group> = {
    "props/streetlight": streetlight.scene
  };

  return (
    <group name="stage5-realism-asset-layer">
      <Stage5FacadePanels />
      {STAGE5_VISIBLE_TRAFFIC_GLB_PLACEMENTS.map((vehicle) => (
        <Clone
          key={vehicle.id}
          object={visibleTrafficScenes[vehicle.assetId]}
          position={vehicle.position}
          rotation={[0, vehicle.rotationY, 0]}
          scale={vehicle.scale}
          castShadow
          receiveShadow
        />
      ))}
      {STAGE5_STREET_FURNITURE_CONTACT_SHADOW_PLACEMENTS.map((shadow) => (
        <mesh
          key={shadow.id}
          name={shadow.id}
          position={shadow.position}
          rotation={[-Math.PI / 2, 0, shadow.rotationY]}
          scale={[shadow.size[0], shadow.size[1], 1]}
          renderOrder={2}
        >
          <circleGeometry args={[1, 32]} />
          <meshBasicMaterial
            color="#02040a"
            transparent
            opacity={shadow.opacity}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      {STAGE5_STREET_FURNITURE_PLACEMENTS.map((placement) => (
        <Clone
          key={placement.id}
          object={streetFurnitureScenes[placement.assetId]}
          position={placement.position}
          rotation={[0, placement.rotationY, 0]}
          scale={placement.scale}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}

function Stage5FacadePanels() {
  const facadeRef = useRef<InstancedMesh>(null);
  const tempObjectRef = useRef(new Object3D());
  const roadMaterials = useStage5RoadMaterials();

  useEffect(() => {
    const tempObject = tempObjectRef.current;

    STAGE5_FACADE_PANELS.forEach((panel, index) => {
      if (!facadeRef.current) return;
      tempObject.position.set(...panel.position);
      tempObject.rotation.set(0, panel.rotationY, 0);
      tempObject.scale.set(panel.size[0], panel.size[1], 1);
      tempObject.updateMatrix();
      facadeRef.current.setMatrixAt(index, tempObject.matrix);
    });

    if (facadeRef.current) {
      facadeRef.current.instanceMatrix.needsUpdate = true;
    }
  }, []);

  return (
    <instancedMesh
      ref={facadeRef}
      name="stage5-lit-facade-window-panels"
      args={[undefined, undefined, STAGE5_FACADE_PANELS.length]}
      receiveShadow
    >
      <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          {...roadMaterials.buildingEdge}
          side={DoubleSide}
          transparent
          opacity={0.68}
        />
    </instancedMesh>
  );
}

function buildStage5FacadePanels(): Stage5FacadePanelSpec[] {
  return BUILDING_EDGE_BLOCKS.map((building) => {
    const [width, height, depth] = building.size;
    const [x, , z] = building.position;
    const isNorthSouthFacade = depth > width;

    if (isNorthSouthFacade) {
      const side = Math.sign(x) || 1;
      return {
        id: `${building.id}-lit-inner-facade`,
        position: [
          x - side * (width / 2 + FACADE_INSET_METERS),
          FACADE_HEIGHT_METERS / 2,
          z
        ],
        rotationY: side > 0 ? -Math.PI / 2 : Math.PI / 2,
        size: [depth, Math.max(FACADE_HEIGHT_METERS, height * 0.85)]
      };
    }

    const side = Math.sign(z) || 1;
    return {
      id: `${building.id}-lit-inner-facade`,
      position: [
        x,
        FACADE_HEIGHT_METERS / 2,
        z - side * (depth / 2 + FACADE_INSET_METERS)
      ],
      rotationY: side > 0 ? Math.PI : 0,
      size: [width, Math.max(FACADE_HEIGHT_METERS, height * 0.85)]
    };
  });
}

function canUseRuntimeAssets() {
  return (
    typeof window !== "undefined" &&
    !/jsdom/i.test(window.navigator.userAgent)
  );
}
