"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import {
  DoubleSide,
  Object3D,
  type Group,
  type InstancedMesh
} from "three";

import {
  buildVehicleGlbGeometryGroups,
  InstancedVehicleGlbMesh,
  VehicleGlbContactShadows,
  type VehicleGlbGeometryGroup,
  type VehicleGlbInstance
} from "./InstancedVehicleGlb";
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
import {
  STAGE6_BUILDING_FACADE_MATERIAL_CONTROLS,
  useStage5RoadMaterials
} from "./roadMaterials";
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
  "props/curb_details",
  "props/outdoor_table_chair_set_01"
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
  renderMode: "glb_material_groups";
};

export type Stage6EFirstPassInstancingPlan = {
  assetGroups: Stage6EFirstPassInstancedAssetGroup[];
  clonePlacements: [];
  drawCallUpperBound: number;
};

const FACADE_HEIGHT_METERS = 4.8;
const FACADE_INSET_METERS = 0.035;
let stage6ERuntimeAssetsPreloaded = false;

const STAGE6E_FIRST_PASS_MATERIAL_COLORS: Record<
  Stage6EFirstPassAssetId,
  string
> = {
  "vehicles/bus_near": "#2f75bf",
  "vehicles/emergency_ambulance_medium": "#b74744",
  "vehicles/passenger_car_near": "#758b95",
  "vehicles/taxi_near": "#d7962f",
  "vehicles/truck_near": "#87939a",
  "props/streetlight": "#515c64",
  "props/tree_cluster": "#4f6d4f",
  "props/curb_details": "#7f786c",
  "props/outdoor_table_chair_set_01": "#8f8067"
};

// Near hero per-instance liveries. Not luminance-constrained (these are the
// foreground hero vehicles), so they carry the realistic Korean palette including
// the dark passenger-car range, weighted toward neutrals. Emergency keeps a white
// body; its red comes from the GLB emitter materials.
const STAGE6E_FIRST_PASS_INSTANCE_COLORS: Partial<
  Record<Stage6EFirstPassAssetId, readonly string[]>
> = {
  "vehicles/bus_near": ["#1d4ea2", "#1d4ea2", "#1d4ea2", "#3d9b68"],
  "vehicles/emergency_ambulance_medium": ["#f2f4f5", "#e4e8ea"],
  "vehicles/passenger_car_near": [
    "#eef1f2",
    "#d7dadc",
    "#b7bdc0",
    "#8f989d",
    "#2c3136",
    "#6e1f24",
    "#1d2740"
  ],
  "vehicles/taxi_near": ["#ef7c00", "#f0892a"],
  "vehicles/truck_near": ["#e8ebec", "#cfd4d6", "#a7b0b4", "#9fb6c9"],
  "props/tree_cluster": ["#486747", "#587755"],
  "props/curb_details": ["#756f64", "#91887b"],
  "props/outdoor_table_chair_set_01": ["#8f8067", "#a69472", "#6d6257"]
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
  },
  {
    id: "stage6e-gangnam-sidewalk-cafe-seating-glb",
    assetId: "props/outdoor_table_chair_set_01",
    position: [-30.2, 0.035, -25.8],
    rotationY: Math.PI / 3,
    scale: [0.96, 0.96, 0.96]
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
  },
  {
    id: "stage6e-gangnam-sidewalk-cafe-seating-contact-shadow",
    sourcePlacementId: "stage6e-gangnam-sidewalk-cafe-seating-glb",
    position: [-30.2, 0.024, -25.8],
    rotationY: Math.PI / 3,
    size: [2.15, 0.9],
    opacity: 0.3
  }
];

export const STAGE5_FACADE_PANELS: Stage5FacadePanelSpec[] =
  buildStage5FacadePanels();

export function getStage6FacadePanelMaterialContract() {
  return {
    // "textures/facade_window_emissive" was deleted (dead: never fed a
    // rendered GroundDressingLayer material) — this contract's id keeps its
    // last known value since this whole component tree has no live importer.
    sourceAsset: "textures/facade_window_emissive",
    textureRole: "facadeWindowEmissive",
    baseColorMap: "none",
    emissiveOnly: true,
    minOpacity: STAGE6_BUILDING_FACADE_MATERIAL_CONTROLS.facadePanelOpacity
  };
}

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
      renderMode: "glb_material_groups" as const
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
  const outdoorTableChairSet = useGLTF(
    getR3FAssetEntry("props/outdoor_table_chair_set_01").path
  );
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
    "props/curb_details": curbDetails.scene,
    "props/outdoor_table_chair_set_01": outdoorTableChairSet.scene
  };
  const firstPassScenes: Record<Stage6EFirstPassAssetId, Group> = {
    ...visibleTrafficScenes,
    ...streetFurnitureScenes
  };
  const instancingPlan = buildStage6EFirstPassInstancingPlan();
  const geometryGroupsByAsset = useMemo(
    () =>
      Object.fromEntries(
        STAGE6E_FIRST_PASS_GLB_ASSET_IDS.map((assetId) => [
          assetId,
          buildVehicleGlbGeometryGroups(assetId, firstPassScenes[assetId])
        ])
      ) as Record<Stage6EFirstPassAssetId, VehicleGlbGeometryGroup[]>,
    [
      ambulance.scene,
      bus.scene,
      curbDetails.scene,
      outdoorTableChairSet.scene,
      passengerCar.scene,
      streetlight.scene,
      taxi.scene,
      treeCluster.scene,
      truck.scene
    ]
  );
  const heroVehicleShadowInstances = useMemo(
    () => buildHeroVehicleContactShadowInstances(),
    []
  );

  return (
    <group name="stage5-realism-asset-layer">
      <Stage5FacadePanels />
      {instancingPlan.assetGroups.flatMap((assetGroup) => {
        const geometryGroups = geometryGroupsByAsset[assetGroup.assetId];
        if (!geometryGroups || geometryGroups.length === 0) return [];

        const instances: VehicleGlbInstance[] = assetGroup.placements.map(
          (placement, index) => ({
            x: placement.position[0],
            z: placement.position[2],
            rotationY: placement.rotationY,
            scale: placement.scale[0],
            color: getStage6EFirstPassInstanceColor(
              assetGroup.assetId,
              placement,
              index
            )
          })
        );
        const castShadow =
          STAGE5_SHADOWS_ENABLED && assetGroup.assetId === "props/streetlight";

        return geometryGroups.map((group) => (
          <InstancedVehicleGlbMesh
            key={group.key}
            name={`stage6e-first-pass-${assetGroup.assetId}-${group.role}`}
            group={group}
            instances={instances}
            castShadow={castShadow}
          />
        ));
      })}
      <VehicleGlbContactShadows
        name="stage6e-hero-vehicle-contact-shadows"
        instances={heroVehicleShadowInstances}
        opacity={0.42}
      />
      <Stage5StreetFurnitureContactShadows />
    </group>
  );
}

// Approximate ground footprint [width, length] in meters per hero vehicle asset,
// used only to size the grounding contact-shadow disc under each hero GLB.
const STAGE6E_HERO_VEHICLE_FOOTPRINTS: Partial<
  Record<Stage5VisibleTrafficAssetId, [number, number]>
> = {
  "vehicles/bus_near": [2.8, 9],
  "vehicles/emergency_ambulance_medium": [2.4, 5.3],
  "vehicles/passenger_car_near": [2.1, 4.6],
  "vehicles/taxi_near": [2.1, 4.7],
  "vehicles/truck_near": [2.7, 7.2]
};

function buildHeroVehicleContactShadowInstances(): VehicleGlbInstance[] {
  return STAGE5_HERO_VEHICLE_PLACEMENTS.map((placement) => ({
    x: placement.position[0],
    z: placement.position[2],
    rotationY: placement.rotationY,
    scale: placement.scale[0],
    footprint: STAGE6E_HERO_VEHICLE_FOOTPRINTS[placement.assetId] ?? [2.3, 4.6]
  }));
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
        opacity={0.48}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
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
      renderOrder={2}
      receiveShadow
    >
      <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          {...roadMaterials.buildingEdge}
          side={DoubleSide}
          transparent
          opacity={STAGE6_BUILDING_FACADE_MATERIAL_CONTROLS.facadePanelOpacity}
          depthWrite={false}
        />
    </instancedMesh>
  );
}

function buildStage5FacadePanels(): Stage5FacadePanelSpec[] {
  return STAGE6E_CITY_EDGE_BLOCKS.flatMap((building) => {
    const [width, height, depth] = building.size;
    const [x, , z] = building.position;
    const isNorthSouthFacade = depth > width;
    const facadeHeight = Math.max(FACADE_HEIGHT_METERS, height * 0.92);

    if (isNorthSouthFacade) {
      const side = Math.sign(x) || 1;
      const mainPanel: Stage5FacadePanelSpec = {
        id: `${building.id}-lit-inner-facade`,
        position: [
          x - side * (width / 2 + FACADE_INSET_METERS),
          facadeHeight / 2,
          z
        ] as Vector3Tuple,
        rotationY: side > 0 ? -Math.PI / 2 : Math.PI / 2,
        size: [depth, facadeHeight] as [number, number]
      };

      return [
        mainPanel,
        ...buildStage5FacadeAccentBands(
          building.id,
          mainPanel.position,
          mainPanel.rotationY,
          depth,
          facadeHeight
        )
      ];
    }

    const side = Math.sign(z) || 1;
    const mainPanel: Stage5FacadePanelSpec = {
      id: `${building.id}-lit-inner-facade`,
      position: [
        x,
        facadeHeight / 2,
        z - side * (depth / 2 + FACADE_INSET_METERS)
      ] as Vector3Tuple,
      rotationY: side > 0 ? Math.PI : 0,
      size: [width, facadeHeight] as [number, number]
    };

    return [
      mainPanel,
      ...buildStage5FacadeAccentBands(
        building.id,
        mainPanel.position,
        mainPanel.rotationY,
        width,
        facadeHeight
      )
    ];
  });
}

function buildStage5FacadeAccentBands(
  buildingId: string,
  basePosition: Vector3Tuple,
  rotationY: number,
  facadeWidth: number,
  facadeHeight: number
): Stage5FacadePanelSpec[] {
  const bandCount = Math.max(2, Math.min(5, Math.round(facadeHeight / 7)));
  const stepHeight = facadeHeight / bandCount;

  return Array.from({ length: bandCount }, (_, index) => {
    const widthScale = index % 2 === 0 ? 0.72 : 0.86;
    const y = stepHeight * (index + 0.5);

    return {
      id: `${buildingId}-lit-facade-band-${index}`,
      position: [basePosition[0], y, basePosition[2]] as Vector3Tuple,
      rotationY,
      size: [facadeWidth * widthScale, stepHeight * 0.38] as [number, number]
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
