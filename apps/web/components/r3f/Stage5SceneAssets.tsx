"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  MeshStandardMaterial,
  Object3D,
  type Group,
  type InstancedMesh,
  type Material,
  type Mesh
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {
  STAGE6E_CITY_EDGE_BLOCKS,
  type Vector3Tuple
} from "./roadGeometry";
import {
  getR3FAssetEntry,
  listR3FAssetEntries,
  type R3FAssetEntry,
  type R3FAssetId
} from "./assetManifest";
import { useStage5RoadMaterials } from "./roadMaterials";
import { STAGE5_SHADOWS_ENABLED } from "./shadowPolicy";

export const STAGE6E_FIRST_PASS_PAYLOAD_LIMIT_BYTES = 25 * 1024 * 1024;

export const STAGE5_HERO_GLB_ASSET_IDS = [
  "vehicles/bus_near",
  "vehicles/emergency_ambulance_medium",
  "vehicles/passenger_car_near",
  "vehicles/taxi_near",
  "vehicles/truck_near"
] as const satisfies readonly R3FAssetId[];

export const STAGE5_VISIBLE_TRAFFIC_GLB_ASSET_IDS = [
  ...STAGE5_HERO_GLB_ASSET_IDS
] as const satisfies readonly R3FAssetId[];

export const STAGE5_STREET_FURNITURE_GLB_ASSET_IDS = [
  "props/streetlight",
  "props/tree_cluster",
  "props/curb_details"
] as const satisfies readonly R3FAssetId[];

export const STAGE6E_FIRST_PASS_GLB_ASSET_IDS = [
  ...STAGE5_VISIBLE_TRAFFIC_GLB_ASSET_IDS,
  ...STAGE5_STREET_FURNITURE_GLB_ASSET_IDS
] as const satisfies readonly R3FAssetId[];

export const STAGE6E_DENSITY_PRELOAD_GLB_ASSET_IDS = [
  "vehicles/passenger_car_far",
  "vehicles/taxi_far",
  "vehicles/bus_far",
  "vehicles/truck_far",
  "vehicles/emergency_ambulance_medium"
] as const satisfies readonly R3FAssetId[];

export const STAGE6E_PRELOAD_GLB_ASSET_IDS = Array.from(
  new Set([
    ...STAGE6E_FIRST_PASS_GLB_ASSET_IDS,
    ...STAGE6E_DENSITY_PRELOAD_GLB_ASSET_IDS
  ])
) as readonly R3FAssetId[];

type Stage5HeroAssetId = (typeof STAGE5_HERO_GLB_ASSET_IDS)[number];
type Stage5VisibleTrafficAssetId =
  (typeof STAGE5_VISIBLE_TRAFFIC_GLB_ASSET_IDS)[number];
type Stage5StreetFurnitureAssetId =
  (typeof STAGE5_STREET_FURNITURE_GLB_ASSET_IDS)[number];
type Stage6EFirstPassAssetId =
  (typeof STAGE6E_FIRST_PASS_GLB_ASSET_IDS)[number];
type Stage6EFirstPassPlacement =
  | Stage5VisibleTrafficVehiclePlacement
  | Stage5StreetFurniturePlacement;

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

export type Stage6EAssetRuntimePlan = {
  firstPassAssetIds: R3FAssetId[];
  preloadAssetIds: R3FAssetId[];
  densityAssetIds: R3FAssetId[];
  byKind: Record<string, R3FAssetId[]>;
  byLod: Record<string, R3FAssetId[]>;
  byDensityEligibility: Record<"eligible" | "ineligible", R3FAssetId[]>;
  byMaxFileSizeBucket: Record<string, R3FAssetId[]>;
  firstPassPayloadBytes: number;
  firstPassPayloadLimitBytes: number;
};

export type Stage6EFirstPassInstancedAssetGroup = {
  assetId: Stage6EFirstPassAssetId;
  placements: Stage6EFirstPassPlacement[];
  placementCount: number;
  placementIds: string[];
  renderMode: "instanced_silhouette";
};

export type Stage6EFirstPassInstancingPlan = {
  assetGroups: Stage6EFirstPassInstancedAssetGroup[];
  clonePlacements: [];
  drawCallUpperBound: number;
};

type Stage6EFirstPassSilhouetteGeometry = {
  key: string;
  assetId: Stage6EFirstPassAssetId;
  geometry: BufferGeometry;
  material: Material;
};

const FACADE_HEIGHT_METERS = 4.8;
const FACADE_INSET_METERS = 0.035;
let stage6ERuntimeAssetsPreloaded = false;

const STAGE6E_FIRST_PASS_MATERIAL_COLORS: Record<
  Stage6EFirstPassAssetId,
  string
> = {
  "vehicles/bus_near": "#698b9a",
  "vehicles/emergency_ambulance_medium": "#b74744",
  "vehicles/passenger_car_near": "#758b95",
  "vehicles/taxi_near": "#a88d38",
  "vehicles/truck_near": "#87939a",
  "props/streetlight": "#515c64",
  "props/tree_cluster": "#4f6d4f",
  "props/curb_details": "#7f786c"
};

const STAGE6E_FIRST_PASS_INSTANCE_COLORS: Partial<
  Record<Stage6EFirstPassAssetId, readonly string[]>
> = {
  "vehicles/bus_near": ["#668b9b", "#7895a1"],
  "vehicles/emergency_ambulance_medium": ["#b74744", "#d9dedf"],
  "vehicles/passenger_car_near": ["#708692", "#a5b0b5", "#5f737d"],
  "vehicles/taxi_near": ["#a88d38", "#c2a64a"],
  "vehicles/truck_near": ["#828d93", "#a5acaf"],
  "props/tree_cluster": ["#486747", "#587755"],
  "props/curb_details": ["#756f64", "#91887b"]
};

export const STAGE5_HERO_VEHICLE_PLACEMENTS: Stage5HeroVehiclePlacement[] = [
  {
    id: "stage6e-south-foreground-bus-glb",
    assetId: "vehicles/bus_near",
    position: [-6.2, 0.04, 47],
    rotationY: Math.PI,
    scale: [1.02, 1.02, 1.02]
  },
  {
    id: "stage6e-east-emergency-ambulance-glb",
    assetId: "vehicles/emergency_ambulance_medium",
    position: [47, 0.04, -5.4],
    rotationY: Math.PI / 2,
    scale: [0.94, 0.94, 0.94]
  },
  {
    id: "stage6e-southbound-passenger-car-glb",
    assetId: "vehicles/passenger_car_near",
    position: [4.2, 0.04, 31],
    rotationY: Math.PI,
    scale: [0.9, 0.9, 0.9]
  },
  {
    id: "stage6e-westbound-taxi-glb",
    assetId: "vehicles/taxi_near",
    position: [-33.5, 0.04, 4.6],
    rotationY: -Math.PI / 2,
    scale: [0.9, 0.9, 0.9]
  },
  {
    id: "stage6e-east-foreground-truck-glb",
    assetId: "vehicles/truck_near",
    position: [31.5, 0.04, -7.2],
    rotationY: Math.PI / 2,
    scale: [0.86, 0.86, 0.86]
  }
];

export const STAGE5_VISIBLE_TRAFFIC_GLB_PLACEMENTS: Stage5VisibleTrafficVehiclePlacement[] = [
  ...STAGE5_HERO_VEHICLE_PLACEMENTS
];

export const STAGE5_STREET_FURNITURE_PLACEMENTS: Stage5StreetFurniturePlacement[] = [
  {
    id: "stage6e-southwest-streetlight-glb",
    assetId: "props/streetlight",
    position: [-14.8, 0.04, 45],
    rotationY: -Math.PI / 5,
    scale: [1, 1, 1]
  },
  {
    id: "stage6e-northeast-streetlight-glb",
    assetId: "props/streetlight",
    position: [14.8, 0.04, -44],
    rotationY: Math.PI + Math.PI / 5,
    scale: [1, 1, 1]
  },
  {
    id: "stage6e-southwest-tree-cluster-glb",
    assetId: "props/tree_cluster",
    position: [-25.5, 0.02, 39],
    rotationY: Math.PI / 7,
    scale: [1.08, 1.08, 1.08]
  },
  {
    id: "stage6e-northeast-tree-cluster-glb",
    assetId: "props/tree_cluster",
    position: [27.5, 0.02, -38],
    rotationY: Math.PI + Math.PI / 8,
    scale: [0.98, 0.98, 0.98]
  },
  {
    id: "stage6e-south-curb-details-glb",
    assetId: "props/curb_details",
    position: [-10.8, 0.03, 24.5],
    rotationY: 0,
    scale: [1, 1, 1]
  },
  {
    id: "stage6e-east-curb-details-glb",
    assetId: "props/curb_details",
    position: [25.2, 0.03, 10.6],
    rotationY: -Math.PI / 2,
    scale: [1, 1, 1]
  }
];

export const STAGE5_STREET_FURNITURE_CONTACT_SHADOW_PLACEMENTS: Stage5StreetFurnitureContactShadowPlacement[] = [
  {
    id: "stage6e-southwest-streetlight-contact-shadow",
    sourcePlacementId: "stage6e-southwest-streetlight-glb",
    position: [-14.8, 0.024, 45],
    rotationY: -Math.PI / 5,
    size: [1.55, 0.48],
    opacity: 0.34
  },
  {
    id: "stage6e-northeast-streetlight-contact-shadow",
    sourcePlacementId: "stage6e-northeast-streetlight-glb",
    position: [14.8, 0.024, -44],
    rotationY: Math.PI + Math.PI / 5,
    size: [1.55, 0.48],
    opacity: 0.34
  },
  {
    id: "stage6e-southwest-tree-contact-shadow",
    sourcePlacementId: "stage6e-southwest-tree-cluster-glb",
    position: [-25.5, 0.024, 39],
    rotationY: Math.PI / 7,
    size: [4.8, 1.7],
    opacity: 0.3
  },
  {
    id: "stage6e-northeast-tree-contact-shadow",
    sourcePlacementId: "stage6e-northeast-tree-cluster-glb",
    position: [27.5, 0.024, -38],
    rotationY: Math.PI + Math.PI / 8,
    size: [4.5, 1.55],
    opacity: 0.28
  },
  {
    id: "stage6e-south-curb-contact-shadow",
    sourcePlacementId: "stage6e-south-curb-details-glb",
    position: [-10.8, 0.024, 24.5],
    rotationY: 0,
    size: [3.4, 0.58],
    opacity: 0.26
  },
  {
    id: "stage6e-east-curb-contact-shadow",
    sourcePlacementId: "stage6e-east-curb-details-glb",
    position: [25.2, 0.024, 10.6],
    rotationY: -Math.PI / 2,
    size: [3.4, 0.58],
    opacity: 0.26
  }
];

export const STAGE5_FACADE_PANELS: Stage5FacadePanelSpec[] =
  buildStage5FacadePanels();

export function buildStage6EAssetRuntimePlan(): Stage6EAssetRuntimePlan {
  const manifestEntries = listR3FAssetEntries();
  const firstPassEntries = STAGE6E_FIRST_PASS_GLB_ASSET_IDS.map(getR3FAssetEntry);
  const preloadEntries = STAGE6E_PRELOAD_GLB_ASSET_IDS.map(getR3FAssetEntry);
  const densityEntries = manifestEntries.filter(
    (asset) =>
      asset.kind === "vehicle" &&
      asset.densityEligible === true &&
      (asset.lod === "far" || asset.lod === "medium")
  );

  return {
    firstPassAssetIds: firstPassEntries.map((asset) => asset.id),
    preloadAssetIds: preloadEntries.map((asset) => asset.id),
    densityAssetIds: densityEntries.map((asset) => asset.id),
    byKind: groupAssetIdsBy(firstPassEntries, (asset) => asset.kind),
    byLod: groupAssetIdsBy(firstPassEntries, (asset) => asset.lod),
    byDensityEligibility: {
      eligible: densityEntries.map((asset) => asset.id),
      ineligible: manifestEntries
        .filter((asset) => asset.densityEligible !== true)
        .map((asset) => asset.id)
    },
    byMaxFileSizeBucket: {
      firstPassUnder500Kb: firstPassEntries
        .filter((asset) => asset.maxFileSizeBytes <= 500_000)
        .map((asset) => asset.id),
      firstPassUnder1Mb: firstPassEntries
        .filter((asset) => asset.maxFileSizeBytes <= 1_000_000)
        .map((asset) => asset.id),
      firstPassUnder2Mb: firstPassEntries
        .filter((asset) => asset.maxFileSizeBytes <= 2_000_000)
        .map((asset) => asset.id)
    },
    firstPassPayloadBytes: firstPassEntries.reduce(
      (total, asset) => total + asset.maxFileSizeBytes,
      0
    ),
    firstPassPayloadLimitBytes: STAGE6E_FIRST_PASS_PAYLOAD_LIMIT_BYTES
  };
}

export function buildStage6EFirstPassInstancingPlan(): Stage6EFirstPassInstancingPlan {
  const placements = [
    ...STAGE5_VISIBLE_TRAFFIC_GLB_PLACEMENTS,
    ...STAGE5_STREET_FURNITURE_PLACEMENTS
  ];
  const assetGroups = STAGE6E_FIRST_PASS_GLB_ASSET_IDS.map((assetId) => {
    const groupPlacements = placements.filter(
      (placement) => placement.assetId === assetId
    );

    return {
      assetId,
      placements: groupPlacements,
      placementCount: groupPlacements.length,
      placementIds: groupPlacements.map((placement) => placement.id),
      renderMode: "instanced_silhouette" as const
    };
  }).filter((group) => group.placementCount > 0);

  return {
    assetGroups,
    clonePlacements: [],
    drawCallUpperBound: assetGroups.length + 1
  };
}

export function preloadStage6ERuntimeAssets(): R3FAssetId[] {
  if (stage6ERuntimeAssetsPreloaded) {
    return [...STAGE6E_PRELOAD_GLB_ASSET_IDS];
  }

  stage6ERuntimeAssetsPreloaded = true;

  for (const assetId of buildStage6EAssetRuntimePlan().preloadAssetIds) {
    const asset = getR3FAssetEntry(assetId);

    useGLTF.preload(asset.path);
  }

  return [...STAGE6E_PRELOAD_GLB_ASSET_IDS];
}

export function Stage5SceneAssets() {
  if (!canUseRuntimeAssets()) {
    return null;
  }

  return <RuntimeStage5SceneAssets />;
}

function groupAssetIdsBy(
  entries: readonly R3FAssetEntry[],
  getKey: (asset: R3FAssetEntry) => string
) {
  return entries.reduce<Record<string, R3FAssetId[]>>((groups, asset) => {
    const key = getKey(asset);

    groups[key] = groups[key] ?? [];
    groups[key].push(asset.id);

    return groups;
  }, {});
}

function RuntimeStage5SceneAssets() {
  const bus = useGLTF(getR3FAssetEntry("vehicles/bus_near").path);
  const ambulance = useGLTF(
    getR3FAssetEntry("vehicles/emergency_ambulance_medium").path
  );
  const passengerCar = useGLTF(getR3FAssetEntry("vehicles/passenger_car_near").path);
  const taxi = useGLTF(getR3FAssetEntry("vehicles/taxi_near").path);
  const truck = useGLTF(getR3FAssetEntry("vehicles/truck_near").path);
  const streetlight = useGLTF(getR3FAssetEntry("props/streetlight").path);
  const treeCluster = useGLTF(getR3FAssetEntry("props/tree_cluster").path);
  const curbDetails = useGLTF(getR3FAssetEntry("props/curb_details").path);
  const visibleTrafficScenes: Record<Stage5VisibleTrafficAssetId, Group> = {
    "vehicles/bus_near": bus.scene,
    "vehicles/emergency_ambulance_medium": ambulance.scene,
    "vehicles/passenger_car_near": passengerCar.scene,
    "vehicles/taxi_near": taxi.scene,
    "vehicles/truck_near": truck.scene
  };
  const streetFurnitureScenes: Record<Stage5StreetFurnitureAssetId, Group> = {
    "props/streetlight": streetlight.scene,
    "props/tree_cluster": treeCluster.scene,
    "props/curb_details": curbDetails.scene
  };
  const firstPassScenes: Record<Stage6EFirstPassAssetId, Group> = {
    ...visibleTrafficScenes,
    ...streetFurnitureScenes
  };
  const instancingPlan = buildStage6EFirstPassInstancingPlan();
  const silhouettesByAsset = useMemo(
    () =>
      Object.fromEntries(
        STAGE6E_FIRST_PASS_GLB_ASSET_IDS.map((assetId) => [
          assetId,
          buildStage6EFirstPassSilhouetteGeometry(assetId, firstPassScenes[assetId])
        ])
      ) as Record<
        Stage6EFirstPassAssetId,
        Stage6EFirstPassSilhouetteGeometry | null
      >,
    [
      ambulance.scene,
      bus.scene,
      curbDetails.scene,
      passengerCar.scene,
      streetlight.scene,
      taxi.scene,
      treeCluster.scene,
      truck.scene
    ]
  );

  return (
    <group name="stage5-realism-asset-layer">
      <Stage5FacadePanels />
      {instancingPlan.assetGroups.map((assetGroup) => {
        const silhouette = silhouettesByAsset[assetGroup.assetId];

        if (!silhouette) return null;

        return (
          <Stage6EFirstPassInstancedSilhouette
            key={assetGroup.assetId}
            silhouette={silhouette}
            placements={assetGroup.placements}
          />
        );
      })}
      <Stage5StreetFurnitureContactShadows />
    </group>
  );
}

function Stage6EFirstPassInstancedSilhouette({
  silhouette,
  placements
}: {
  silhouette: Stage6EFirstPassSilhouetteGeometry;
  placements: Stage6EFirstPassPlacement[];
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const tempObjectRef = useRef(new Object3D());
  const tempColorRef = useRef(new Color());

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const tempObject = tempObjectRef.current;
    const tempColor = tempColorRef.current;

    placements.forEach((placement, index) => {
      tempObject.position.set(...placement.position);
      tempObject.rotation.set(0, placement.rotationY, 0);
      tempObject.scale.set(...placement.scale);
      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);
      mesh.setColorAt(
        index,
        tempColor.set(getStage6EFirstPassInstanceColor(silhouette.assetId, placement, index))
      );
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [placements, silhouette.assetId]);

  if (placements.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      name={`stage6e-first-pass-${silhouette.assetId}-instanced-silhouette`}
      args={[silhouette.geometry, silhouette.material, placements.length]}
      castShadow={
        STAGE5_SHADOWS_ENABLED && silhouette.assetId === "props/streetlight"
      }
      receiveShadow={false}
      userData={{
        stage6eAssetId: silhouette.assetId,
        firstPassInstancedSilhouette: true,
        realShadowWhitelist:
          STAGE5_SHADOWS_ENABLED && silhouette.assetId === "props/streetlight",
        placementCount: placements.length
      }}
    />
  );
}

function getStage6EFirstPassInstanceColor(
  assetId: Stage6EFirstPassAssetId,
  placement: Stage6EFirstPassPlacement,
  index: number
) {
  const palette = STAGE6E_FIRST_PASS_INSTANCE_COLORS[assetId];
  if (!palette || palette.length === 0) {
    return STAGE6E_FIRST_PASS_MATERIAL_COLORS[assetId];
  }

  return palette[getStablePaletteIndex(placement.id, index, palette.length)];
}

function getStablePaletteIndex(id: string, fallbackIndex: number, length: number) {
  if (length <= 1) return 0;

  let hash = fallbackIndex;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }

  return hash % length;
}

function Stage5StreetFurnitureContactShadows() {
  const shadowRef = useRef<InstancedMesh>(null);
  const tempObjectRef = useRef(new Object3D());

  useEffect(() => {
    const tempObject = tempObjectRef.current;

    STAGE5_STREET_FURNITURE_CONTACT_SHADOW_PLACEMENTS.forEach(
      (shadow, index) => {
        if (!shadowRef.current) return;

        tempObject.position.set(...shadow.position);
        tempObject.rotation.set(-Math.PI / 2, 0, shadow.rotationY);
        tempObject.scale.set(shadow.size[0], shadow.size[1], 1);
        tempObject.updateMatrix();
        shadowRef.current.setMatrixAt(index, tempObject.matrix);
      }
    );

    if (shadowRef.current) {
      shadowRef.current.instanceMatrix.needsUpdate = true;
    }
  }, []);

  return (
    <instancedMesh
      ref={shadowRef}
      name="stage6e-street-furniture-contact-shadows"
      args={[
        undefined,
        undefined,
        STAGE5_STREET_FURNITURE_CONTACT_SHADOW_PLACEMENTS.length
      ]}
      renderOrder={2}
    >
      <circleGeometry args={[1, 32]} />
      <meshBasicMaterial
        color="#02040a"
        transparent
        opacity={0.3}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

function buildStage6EFirstPassSilhouetteGeometry(
  assetId: Stage6EFirstPassAssetId,
  scene: Group
): Stage6EFirstPassSilhouetteGeometry | null {
  const geometries: BufferGeometry[] = [];

  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    if (!isRenderableMesh(object)) return;

    const geometry = normalizeStage6EFirstPassGeometryForMerge(object.geometry);
    geometry.applyMatrix4(object.matrixWorld);

    if (geometry.attributes.position) {
      geometries.push(geometry);
    }
  });

  if (geometries.length === 0) return null;

  const geometry =
    geometries.length === 1 ? geometries[0] : mergeGeometries(geometries);

  if (!geometry) return null;

  return {
    key: `${assetId}:first-pass-silhouette`,
    assetId,
    geometry,
    material: createStage6EFirstPassMaterial(assetId)
  };
}

function normalizeStage6EFirstPassGeometryForMerge(
  geometry: BufferGeometry
): BufferGeometry {
  const sourceGeometry = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = sourceGeometry.getAttribute("position");
  const positions: number[] = [];

  if (!position) return new BufferGeometry();

  for (let index = 0; index < position.count; index += 1) {
    positions.push(
      position.getX(index),
      position.getY(index),
      position.getZ(index)
    );
  }

  const normalizedGeometry = new BufferGeometry();

  normalizedGeometry.setAttribute(
    "position",
    new Float32BufferAttribute(positions, 3)
  );
  normalizedGeometry.computeVertexNormals();
  normalizedGeometry.clearGroups();

  return normalizedGeometry;
}

function createStage6EFirstPassMaterial(assetId: Stage6EFirstPassAssetId) {
  return new MeshStandardMaterial({
    color: STAGE6E_FIRST_PASS_MATERIAL_COLORS[assetId],
    roughness: assetId.startsWith("vehicles/") ? 0.5 : 0.64,
    metalness: assetId === "props/streetlight" ? 0.36 : 0.16,
    envMapIntensity: assetId.startsWith("vehicles/") ? 0.92 : 0.76
  });
}

function isRenderableMesh(object: Object3D): object is Mesh {
  return Boolean(
    (object as Mesh).isMesh &&
      (object as Mesh).geometry &&
      (object as Mesh).material
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
  return STAGE6E_CITY_EDGE_BLOCKS.map((building) => {
    const [width, height, depth] = building.size;
    const [x, , z] = building.position;
    const isNorthSouthFacade = depth > width;
    const facadeHeight = Math.max(FACADE_HEIGHT_METERS, height * 0.92);

    if (isNorthSouthFacade) {
      const side = Math.sign(x) || 1;
      return {
        id: `${building.id}-lit-inner-facade`,
        position: [
          x - side * (width / 2 + FACADE_INSET_METERS),
          facadeHeight / 2,
          z
        ],
        rotationY: side > 0 ? -Math.PI / 2 : Math.PI / 2,
        size: [depth, facadeHeight]
      };
    }

    const side = Math.sign(z) || 1;
    return {
      id: `${building.id}-lit-inner-facade`,
      position: [
        x,
        facadeHeight / 2,
        z - side * (depth / 2 + FACADE_INSET_METERS)
      ],
      rotationY: side > 0 ? Math.PI : 0,
      size: [width, facadeHeight]
    };
  });
}

function canUseRuntimeAssets() {
  return (
    typeof window !== "undefined" &&
    !/jsdom/i.test(window.navigator.userAgent)
  );
}

if (canUseRuntimeAssets()) {
  preloadStage6ERuntimeAssets();
}
