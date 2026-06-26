"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import {
  Color,
  DoubleSide,
  Object3D,
  Shape,
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
import type { Direction } from "../../lib/types";
import type {
  SimulationDensitySegment,
  SimulationDensitySegmentSource,
  SimulationVehicleSnapshot,
  SimulationVehicleType
} from "../../lib/simulationSnapshot";
import type { SceneSnapshot, SceneTrafficDensityMode } from "./buildSceneSnapshot";
import type {
  Stage6VehicleLodTier,
  Stage6VehicleMaterialCues
} from "./stage6VehicleLod";
import type { Stage6QualityPreset } from "./stage6Quality";
import { getStage6QualityPreset } from "./stage6Quality";
import {
  STAGE5_NEAR_VEHICLE_SHADOW_LIMIT,
  STAGE5_SHADOWS_ENABLED
} from "./shadowPolicy";
import {
  CORRIDOR_LENGTH_METERS,
  INBOUND_LANE_COUNT,
  INTERSECTION_BOX_METERS,
  LANE_WIDTH_METERS
} from "./roadGeometry";
import type { Vector3Tuple } from "./roadGeometry";
import { getR3FAssetEntry, type R3FAssetId } from "./assetManifest";
import {
  STAGE6_VEHICLE_LOD_POLICY,
  STAGE6_VEHICLE_MATERIAL_RESPONSE_CUES,
  decideStage6VehicleLod,
  getStage6VehicleMaterialCues
} from "./stage6VehicleLod";

export type TrafficDensitySourceLabel =
  | "fixture"
  | "snapshot"
  | SimulationDensitySegmentSource
  | "none";

export type TrafficDensityPreciseVehicle = {
  id: string;
  sourceLabel: "snapshot";
  vehicleType: SimulationVehicleSnapshot["vehicle_type"];
  position: Vector3Tuple;
  rotationY: number;
  size: Vector3Tuple;
  color: string;
  emergency: boolean;
  lodTier: Stage6VehicleLodTier;
  highQualityGlbEligible: boolean;
  operatorRelevant: boolean;
  materialCues: Stage6VehicleMaterialCues;
};

export type TrafficDensityFarVehicle = {
  id: string;
  direction: Direction;
  assetId: Stage6ERepeatedDensityAssetId;
  sourceLabel: Exclude<TrafficDensitySourceLabel, "snapshot" | "none">;
  position: Vector3Tuple;
  rotationY: number;
  size: Vector3Tuple;
  color: string;
  opacity: number;
};

export type TrafficDensityRenderPlan = {
  mode: SceneTrafficDensityMode;
  sourceLabel: TrafficDensitySourceLabel;
  preciseVehicles: TrafficDensityPreciseVehicle[];
  farVehicles: TrafficDensityFarVehicle[];
};

export type Stage6EDensityAssetGroup = {
  assetId: Stage6ERepeatedDensityAssetId;
  vehicles: TrafficDensityFarVehicle[];
  instanceCount: number;
};

export type Stage6EDensityRenderPlan = {
  instancedAssetGroups: Stage6EDensityAssetGroup[];
  proceduralVehicles: TrafficDensityFarVehicle[];
  totalInstancedVehicleCount: number;
};

const DIRECTIONS: Direction[] = ["north", "south", "east", "west"];
const PRECISE_VEHICLE_HEADING_BY_DIRECTION: Record<Direction, number> = {
  north: 180,
  south: 0,
  east: 270,
  west: 90
};
const STOP_LINE_OFFSET_METERS = INTERSECTION_BOX_METERS / 2;
export const STAGE5_MIN_VISIBLE_VEHICLES = 80;
const MAX_FIXTURE_VEHICLES_PER_DIRECTION = 24;
const MIN_TRAFFIC_VEHICLE_WIDTH_METERS = 2.32;
const MIN_TRAFFIC_VEHICLE_HEIGHT_METERS = 1.08;
export const PRECISE_VEHICLE_MIN_LONGITUDINAL_CLEARANCE_METERS = 1.2;
const QUEUE_START_METERS_FROM_STOP_LINE = 12;
const INBOUND_LANE_VISUAL_BIAS_METERS = LANE_WIDTH_METERS * 0.45;
const DIRECTION_INDEX: Record<Direction, number> = {
  north: 0,
  south: 1,
  east: 2,
  west: 3
};
export const STAGE5_TRAFFIC_VEHICLE_SILHOUETTE_PARTS = [
  { name: "contactShadow", geometry: "circleGeometry", visible: false },
  { name: "body", geometry: "extrudeGeometry", visible: true },
  { name: "cabin", geometry: "sphereGeometry", visible: true },
  { name: "windshield", geometry: "planeGeometry", visible: true },
  { name: "rearGlass", geometry: "planeGeometry", visible: true },
  { name: "sideGlass", geometry: "planeGeometry", visible: true },
  { name: "roofHighlight", geometry: "planeGeometry", visible: true },
  { name: "frontGrille", geometry: "planeGeometry", visible: true },
  { name: "tailPanel", geometry: "planeGeometry", visible: true },
  { name: "wheelArch", geometry: "torusGeometry", visible: true },
  { name: "wheel", geometry: "cylinderGeometry", visible: true },
  { name: "headlight", geometry: "sphereGeometry", visible: true },
  { name: "taillight", geometry: "sphereGeometry", visible: true },
  { name: "headlightGlow", geometry: "planeGeometry", visible: false },
  { name: "taillightGlow", geometry: "planeGeometry", visible: false }
] as const;

export const STAGE5_TRAFFIC_VEHICLE_LIGHT_GLOW = {
  headlight: {
    material: {
      color: "#ffc65a",
      emissive: "#ffb347",
      emissiveIntensity: 4.1,
      roughness: 0.14,
      toneMapped: false
    },
    scale: [0.3, 0.17, 0.095]
  },
  taillight: {
    material: {
      color: "#ff766b",
      emissive: "#ff3535",
      emissiveIntensity: 2.85,
      roughness: 0.2,
      toneMapped: false
    },
    scale: [0.28, 0.16, 0.09]
  }
} as const;

type Stage5TrafficVehiclePartName =
  (typeof STAGE5_TRAFFIC_VEHICLE_SILHOUETTE_PARTS)[number]["name"];
type Stage5TrafficVehicleGeometry =
  (typeof STAGE5_TRAFFIC_VEHICLE_SILHOUETTE_PARTS)[number]["geometry"];
type TrafficVehicleProfileName =
  | "sedan"
  | "hatchback"
  | "taxi"
  | "suv"
  | "van"
  | "boxTruck"
  | "cityBus";
type TrafficVehicleProfile = {
  name: TrafficVehicleProfileName;
  size: Vector3Tuple;
  colors: string[];
};
type Stage5TrafficVehicleInstance = {
  id: string;
  position: Vector3Tuple;
  rotationY: number;
  size: Vector3Tuple;
  color: string;
  emergency: boolean;
  profileName: TrafficVehicleProfileName;
  lodTier: Stage6VehicleLodTier;
  highQualityGlbEligible: boolean;
  operatorRelevant: boolean;
  materialCues: Stage6VehicleMaterialCues;
};
type PreciseVehicleLanePlacement = {
  direction: Direction;
  laneIndex: number;
};
type PreciseVehicleDraft = {
  vehicle: SimulationVehicleSnapshot;
  originalIndex: number;
  size: Vector3Tuple;
  lanePosition: {
    x: number;
    z: number;
  };
  lanePlacement: PreciseVehicleLanePlacement | null;
};

export const STAGE6E_REPEATED_DENSITY_GLB_ASSET_IDS = [
  "vehicles/passenger_car_far",
  "vehicles/taxi_far",
  "vehicles/bus_far",
  "vehicles/truck_far"
] as const satisfies readonly R3FAssetId[];

export type Stage6ERepeatedDensityAssetId =
  (typeof STAGE6E_REPEATED_DENSITY_GLB_ASSET_IDS)[number];

const STAGE6E_DENSITY_ASSET_BY_PROFILE: Record<
  TrafficVehicleProfileName,
  Stage6ERepeatedDensityAssetId
> = {
  sedan: "vehicles/passenger_car_far",
  hatchback: "vehicles/passenger_car_far",
  taxi: "vehicles/taxi_far",
  suv: "vehicles/passenger_car_far",
  van: "vehicles/passenger_car_far",
  boxTruck: "vehicles/truck_far",
  cityBus: "vehicles/bus_far"
};

// Far/density traffic palettes. These vehicles are seen from an oblique camera
// and a test enforces every far color has luminance > 72, so this set is kept
// LIGHT only (white / silver / light-grey / taxi-orange / bus-blue). The dark
// realistic liveries (charcoal / near-black / deep red / navy) live exclusively
// in the near/precise stream (PRECISE_VEHICLE_COLOR_PALETTES), which is not
// luminance-constrained.
const TRAFFIC_VEHICLE_PROFILES: TrafficVehicleProfile[] = [
  {
    name: "sedan",
    size: [2.36, 1.14, 4.65],
    colors: ["#e9ecee", "#d3d7da", "#bcc2c5", "#9aa2a7", "#8f989d", "#747f86"]
  },
  {
    name: "hatchback",
    size: [
      MIN_TRAFFIC_VEHICLE_WIDTH_METERS,
      MIN_TRAFFIC_VEHICLE_HEIGHT_METERS,
      4.32
    ],
    colors: ["#e6eaec", "#cdd2d5", "#aab1b5", "#7f8b91"]
  },
  {
    name: "taxi",
    size: [2.38, 1.16, 4.72],
    colors: ["#ef7c00", "#f0892a", "#f59a3d"]
  },
  {
    name: "suv",
    size: [2.52, 1.34, 4.9],
    colors: ["#e4e8ea", "#c6cccf", "#9fa9ad", "#7c878c"]
  },
  {
    name: "van",
    size: [2.62, 1.62, 5.62],
    colors: ["#e2e6e8", "#c0c7ca", "#9aa6ac", "#8f9fb0"]
  },
  {
    name: "boxTruck",
    size: [2.68, 2.02, 7.15],
    colors: ["#e8ebec", "#cfd4d6", "#aeb8bd", "#9fb6c9"]
  },
  {
    name: "cityBus",
    size: [2.76, 2.18, 8.85],
    colors: ["#3f74c0", "#5b8fd6", "#7fa7dd", "#8c9ca3"]
  }
];

export function buildTrafficDensityRenderPlan(
  sceneSnapshot: SceneSnapshot,
  qualityPreset: Stage6QualityPreset = getStage6QualityPreset("high")
): TrafficDensityRenderPlan {
  const mode = sceneSnapshot.trafficDensityMode;
  const preciseVehicles = buildPreciseVehicles(
    sceneSnapshot.vehicles,
    qualityPreset
  );
  const farVehicles =
    preciseVehicles.length > 0 ? [] : buildFarVehicles(sceneSnapshot);

  return {
    mode,
    sourceLabel: resolveSourceLabel(sceneSnapshot),
    preciseVehicles,
    farVehicles
  };
}

export function buildStage6EDensityRenderPlan(
  vehicles: TrafficDensityFarVehicle[]
): Stage6EDensityRenderPlan {
  const instancedAssetGroups = STAGE6E_REPEATED_DENSITY_GLB_ASSET_IDS.map(
    (assetId) => {
      const groupVehicles = vehicles.filter(
        (vehicle) => vehicle.assetId === assetId
      );

      return {
        assetId,
        vehicles: groupVehicles,
        instanceCount: groupVehicles.length
      };
    }
  ).filter((group) => group.instanceCount > 0);

  return {
    instancedAssetGroups,
    proceduralVehicles: [],
    totalInstancedVehicleCount: instancedAssetGroups.reduce(
      (total, group) => total + group.instanceCount,
      0
    )
  };
}

export function TrafficDensityLayer({
  sceneSnapshot,
  qualityPreset = getStage6QualityPreset("high")
}: {
  sceneSnapshot: SceneSnapshot;
  qualityPreset?: Stage6QualityPreset;
}) {
  const plan = buildTrafficDensityRenderPlan(sceneSnapshot, qualityPreset);
  const canUseDensityGlbs = canUseRuntimeDensityAssets();
  const densityRenderPlan = buildStage6EDensityRenderPlan(plan.farVehicles);
  const allProceduralFarVehicles =
    buildStage5TrafficVehicleInstances(plan.farVehicles);
  const proceduralFallbackVehicles =
    buildStage5TrafficVehicleInstances(densityRenderPlan.proceduralVehicles);
  const preciseVehicles: Stage5TrafficVehicleInstance[] =
    plan.preciseVehicles.map((vehicle) => ({
      id: vehicle.id,
      position: vehicle.position,
      rotationY: vehicle.rotationY,
      size: vehicle.size,
      color: vehicle.color,
      emergency: vehicle.emergency,
      profileName: getPreciseVehicleProfileName(vehicle.vehicleType),
      lodTier: vehicle.lodTier,
      highQualityGlbEligible: vehicle.highQualityGlbEligible,
      operatorRelevant: vehicle.operatorRelevant,
      materialCues: vehicle.materialCues
    }));
  const preciseShadowVehicles =
    selectNearVehicleShadowCasters(preciseVehicles);
  const preciseShadowVehicleIds = new Set(
    preciseShadowVehicles.map((vehicle) => vehicle.id)
  );
  const preciseContactOnlyVehicles = preciseVehicles.filter(
    (vehicle) => !preciseShadowVehicleIds.has(vehicle.id)
  );

  return (
    <group
      name={`stage5-traffic-density-${plan.mode}`}
      userData={{
        visibleVehicleCount: plan.farVehicles.length + plan.preciseVehicles.length,
        qualityPreset: qualityPreset.name,
        stage6VehicleLodPolicy: STAGE6_VEHICLE_LOD_POLICY,
        stage6PreciseVehicleLodTiers: countStage6VehicleLodTiers(
          plan.preciseVehicles
        ),
        stage6HighQualityGlbEligibleVehicleCount:
          plan.preciseVehicles.filter((vehicle) => vehicle.highQualityGlbEligible)
            .length,
        stage6MaterialResponseCues: STAGE6_VEHICLE_MATERIAL_RESPONSE_CUES,
        densityGlbAssetIds: plan.farVehicles.map((vehicle) => vehicle.assetId),
        densitySourceLabel: plan.sourceLabel,
        densityGlbInstancedFamilyCount:
          densityRenderPlan.instancedAssetGroups.length,
        densityGlbVehicleCount: canUseDensityGlbs
          ? densityRenderPlan.totalInstancedVehicleCount
          : 0,
        proceduralDensityVehicleCount: canUseDensityGlbs
          ? densityRenderPlan.proceduralVehicles.length
          : allProceduralFarVehicles.length
      }}
    >
      {canUseDensityGlbs ? (
        <>
          {plan.preciseVehicles.length > 0 ? (
            <Suspense
              fallback={
                <>
                  <Stage5TrafficVehicleInstances
                    name="stage5-near-precise-shadow-vehicles"
                    vehicles={preciseShadowVehicles}
                    castRealShadows={STAGE5_SHADOWS_ENABLED}
                  />
                  <Stage5TrafficVehicleInstances
                    name="stage5-precise-contact-shadow-vehicles"
                    vehicles={preciseContactOnlyVehicles}
                  />
                </>
              }
            >
              <PreciseVehicleGlbs vehicles={plan.preciseVehicles} />
            </Suspense>
          ) : null}
          <Suspense
            fallback={
              <Stage5TrafficVehicleInstances
                name="stage5-density-procedural-contact-shadow-fallback"
                vehicles={allProceduralFarVehicles}
              />
            }
          >
            <Stage6EDensityVehicleGlbs
              assetGroups={densityRenderPlan.instancedAssetGroups}
            />
            {densityRenderPlan.proceduralVehicles.length > 0 ? (
              <Stage5TrafficVehicleInstances
                name="stage5-density-procedural-contact-shadow-vehicles"
                vehicles={proceduralFallbackVehicles}
              />
            ) : null}
          </Suspense>
        </>
      ) : (
        <>
          <Stage5TrafficVehicleInstances
            name="stage5-near-precise-shadow-vehicles"
            vehicles={preciseShadowVehicles}
            castRealShadows={STAGE5_SHADOWS_ENABLED}
          />
          <Stage5TrafficVehicleInstances
            name="stage5-precise-contact-shadow-vehicles"
            vehicles={preciseContactOnlyVehicles}
          />
          <Stage5TrafficVehicleInstances
            name="stage5-density-procedural-contact-shadow-vehicles"
            vehicles={allProceduralFarVehicles}
          />
        </>
      )}
    </group>
  );
}

function selectNearVehicleShadowCasters(
  vehicles: Stage5TrafficVehicleInstance[]
) {
  if (!STAGE5_SHADOWS_ENABLED || vehicles.length === 0) return [];

  return [...vehicles]
    .sort(
      (left, right) =>
        getIntersectionDistanceSquared(left.position) -
        getIntersectionDistanceSquared(right.position)
    )
    .slice(0, STAGE5_NEAR_VEHICLE_SHADOW_LIMIT);
}

function buildStage5TrafficVehicleInstances(
  vehicles: TrafficDensityFarVehicle[]
): Stage5TrafficVehicleInstance[] {
  return vehicles.map((vehicle) => {
    const profileName = getProfileNameFromSize(vehicle.size);

    return {
      id: vehicle.id,
      position: vehicle.position,
      rotationY: vehicle.rotationY,
      size: vehicle.size,
      color: vehicle.color,
      emergency: false,
      profileName,
      lodTier: "far",
      highQualityGlbEligible: false,
      operatorRelevant: false,
      materialCues: getStage6VehicleMaterialCues({
        vehicleType: getVehicleTypeFromProfileName(profileName),
        emergency: false,
        speedMps: 0,
        waitingSeconds: 0,
        truthSource: "proxy"
      })
    };
  });
}

function Stage6EDensityVehicleGlbs({
  assetGroups
}: {
  assetGroups: Stage6EDensityAssetGroup[];
}) {
  const passengerCar = useGLTF(
    getR3FAssetEntry("vehicles/passenger_car_far").path
  );
  const taxi = useGLTF(getR3FAssetEntry("vehicles/taxi_far").path);
  const bus = useGLTF(getR3FAssetEntry("vehicles/bus_far").path);
  const truck = useGLTF(getR3FAssetEntry("vehicles/truck_far").path);
  const densityScenes: Record<Stage6ERepeatedDensityAssetId, Group> = {
    "vehicles/passenger_car_far": passengerCar.scene,
    "vehicles/taxi_far": taxi.scene,
    "vehicles/bus_far": bus.scene,
    "vehicles/truck_far": truck.scene
  };
  const geometryGroupsByAsset = useMemo(
    () =>
      Object.fromEntries(
        STAGE6E_REPEATED_DENSITY_GLB_ASSET_IDS.map((assetId) => [
          assetId,
          buildStage6EInstancedGeometryGroups(assetId, densityScenes[assetId])
        ])
      ) as Record<Stage6ERepeatedDensityAssetId, VehicleGlbGeometryGroup[]>,
    [bus.scene, passengerCar.scene, taxi.scene, truck.scene]
  );
  const visibleVehicles = useMemo(
    () => assetGroups.flatMap((group) => group.vehicles),
    [assetGroups]
  );

  if (visibleVehicles.length === 0) return null;

  return (
    <group name="stage6e-manifest-density-glb-vehicles">
      {assetGroups.flatMap((assetGroup) => {
        const instances = toDensityGlbInstances(assetGroup.vehicles);

        return geometryGroupsByAsset[assetGroup.assetId].map((group) => (
          <InstancedVehicleGlbMesh
            key={group.key}
            name={`stage6e-density-${assetGroup.assetId}-${group.role}`}
            group={group}
            instances={instances}
          />
        ));
      })}
      <Stage6EDensityContactShadows vehicles={visibleVehicles} />
    </group>
  );
}

function toDensityGlbInstances(
  vehicles: TrafficDensityFarVehicle[]
): VehicleGlbInstance[] {
  return vehicles.map((vehicle) => ({
    x: vehicle.position[0],
    z: vehicle.position[2],
    rotationY: vehicle.rotationY,
    color: vehicle.color
  }));
}

function Stage6EDensityContactShadows({
  vehicles
}: {
  vehicles: TrafficDensityFarVehicle[];
}) {
  const shadowRef = useRef<InstancedMesh>(null);
  const tempObjectRef = useRef(new Object3D());

  useEffect(() => {
    const mesh = shadowRef.current;
    if (!isThreeInstancedMesh(mesh)) return;

    const tempObject = tempObjectRef.current;

    vehicles.forEach((vehicle, index) => {
      tempObject.position.set(vehicle.position[0], 0.018, vehicle.position[2]);
      tempObject.rotation.set(-Math.PI / 2, vehicle.rotationY, 0);
      tempObject.scale.set(vehicle.size[0] * 1.24, vehicle.size[2] * 1.06, 1);
      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }, [vehicles]);

  if (vehicles.length === 0) return null;

  return (
    <instancedMesh
      ref={shadowRef}
      args={[undefined, undefined, vehicles.length]}
      castShadow={false}
      receiveShadow={false}
    >
      <circleGeometry args={[0.5, 24]} />
      <meshBasicMaterial
        color="#020617"
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

// Splits a density (far-LOD) vehicle GLB into one merged geometry per authored
// material so far traffic keeps real per-part PBR (paint / glass / tire / hub /
// emitters) instead of the old flat position-only silhouette. The body group is
// white and tintable so the per-instance Korean livery color renders faithfully.
export function buildStage6EInstancedGeometryGroups(
  assetId: Stage6ERepeatedDensityAssetId,
  scene: Group
): VehicleGlbGeometryGroup[] {
  return buildVehicleGlbGeometryGroups(assetId, scene);
}

// Near-LOD GLB assets used for the precise SUMO-truth stream. Each is already
// preloaded for the hero placements, so reusing the path here hits the cache.
const PRECISE_VEHICLE_GLB_ASSET_IDS = [
  "vehicles/passenger_car_near",
  "vehicles/taxi_near",
  "vehicles/bus_near",
  "vehicles/truck_near",
  "vehicles/emergency_ambulance_medium"
] as const satisfies readonly R3FAssetId[];

type PreciseVehicleGlbAssetId = (typeof PRECISE_VEHICLE_GLB_ASSET_IDS)[number];

const PRECISE_VEHICLE_GLB_ASSET_BY_TYPE: Record<
  SimulationVehicleType,
  PreciseVehicleGlbAssetId
> = {
  car: "vehicles/passenger_car_near",
  taxi: "vehicles/taxi_near",
  bus: "vehicles/bus_near",
  truck: "vehicles/truck_near",
  emergency: "vehicles/emergency_ambulance_medium"
};

// Renders the precise SUMO-truth vehicles with their real GLB geometry + authored
// per-part PBR materials, grouped per (asset, material) into InstancedMeshes so
// the ~precise stream stays a handful of draw calls. SUMO position/heading/type
// are passed through unchanged; only the body-paint group is livery-tinted.
function PreciseVehicleGlbs({
  vehicles
}: {
  vehicles: TrafficDensityPreciseVehicle[];
}) {
  const passengerCar = useGLTF(
    getR3FAssetEntry("vehicles/passenger_car_near").path
  );
  const taxi = useGLTF(getR3FAssetEntry("vehicles/taxi_near").path);
  const bus = useGLTF(getR3FAssetEntry("vehicles/bus_near").path);
  const truck = useGLTF(getR3FAssetEntry("vehicles/truck_near").path);
  const ambulance = useGLTF(
    getR3FAssetEntry("vehicles/emergency_ambulance_medium").path
  );
  const scenesByAsset: Record<PreciseVehicleGlbAssetId, Group> = {
    "vehicles/passenger_car_near": passengerCar.scene,
    "vehicles/taxi_near": taxi.scene,
    "vehicles/bus_near": bus.scene,
    "vehicles/truck_near": truck.scene,
    "vehicles/emergency_ambulance_medium": ambulance.scene
  };
  const geometryGroupsByAsset = useMemo(
    () =>
      Object.fromEntries(
        PRECISE_VEHICLE_GLB_ASSET_IDS.map((assetId) => [
          assetId,
          buildVehicleGlbGeometryGroups(assetId, scenesByAsset[assetId])
        ])
      ) as Record<PreciseVehicleGlbAssetId, VehicleGlbGeometryGroup[]>,
    [ambulance.scene, bus.scene, passengerCar.scene, taxi.scene, truck.scene]
  );
  const instancesByAsset = useMemo(
    () => groupPreciseVehicleGlbInstances(vehicles),
    [vehicles]
  );
  const contactShadowInstances = useMemo<VehicleGlbInstance[]>(
    () =>
      vehicles.map((vehicle) => ({
        x: vehicle.position[0],
        z: vehicle.position[2],
        rotationY: vehicle.rotationY,
        footprint: [vehicle.size[0], vehicle.size[2]]
      })),
    [vehicles]
  );

  if (vehicles.length === 0) return null;

  return (
    <group name="stage5-precise-vehicle-glbs">
      {PRECISE_VEHICLE_GLB_ASSET_IDS.flatMap((assetId) => {
        const instances = instancesByAsset[assetId];
        if (instances.length === 0) return [];

        return geometryGroupsByAsset[assetId].map((group) => (
          <InstancedVehicleGlbMesh
            key={group.key}
            name={`stage5-precise-${assetId}-${group.role}`}
            group={group}
            instances={instances}
          />
        ));
      })}
      <VehicleGlbContactShadows
        name="stage5-precise-vehicle-contact-shadows"
        instances={contactShadowInstances}
        opacity={0.5}
      />
    </group>
  );
}

function groupPreciseVehicleGlbInstances(
  vehicles: TrafficDensityPreciseVehicle[]
): Record<PreciseVehicleGlbAssetId, VehicleGlbInstance[]> {
  const grouped: Record<PreciseVehicleGlbAssetId, VehicleGlbInstance[]> = {
    "vehicles/passenger_car_near": [],
    "vehicles/taxi_near": [],
    "vehicles/bus_near": [],
    "vehicles/truck_near": [],
    "vehicles/emergency_ambulance_medium": []
  };

  for (const vehicle of vehicles) {
    const assetId = PRECISE_VEHICLE_GLB_ASSET_BY_TYPE[vehicle.vehicleType];
    grouped[assetId].push({
      x: vehicle.position[0],
      z: vehicle.position[2],
      rotationY: vehicle.rotationY,
      color: vehicle.color
    });
  }

  return grouped;
}

function Stage5TrafficVehicleInstances({
  vehicles,
  castRealShadows = false,
  name = "stage5-instanced-traffic-vehicles"
}: {
  vehicles: Stage5TrafficVehicleInstance[];
  castRealShadows?: boolean;
  name?: string;
}) {
  const bodyRef = useRef<InstancedMesh>(null);
  const cabinRef = useRef<InstancedMesh>(null);
  const windshieldRef = useRef<InstancedMesh>(null);
  const rearGlassRef = useRef<InstancedMesh>(null);
  const sideGlassRef = useRef<InstancedMesh>(null);
  const roofHighlightRef = useRef<InstancedMesh>(null);
  const frontGrilleRef = useRef<InstancedMesh>(null);
  const tailPanelRef = useRef<InstancedMesh>(null);
  const wheelArchRef = useRef<InstancedMesh>(null);
  const wheelRef = useRef<InstancedMesh>(null);
  const contactShadowRef = useRef<InstancedMesh>(null);
  const headlightRef = useRef<InstancedMesh>(null);
  const taillightRef = useRef<InstancedMesh>(null);
  const tempObjectRef = useRef(new Object3D());

  useEffect(() => {
    const tempObject = tempObjectRef.current;

    vehicles.forEach((vehicle, index) => {
      const cabinOffsetZ =
        vehicle.profileName === "cityBus" ? -vehicle.size[2] * 0.14 : -vehicle.size[2] * 0.05;
      const cabinLengthScale =
        vehicle.profileName === "cityBus" || vehicle.profileName === "van"
          ? vehicle.size[2] * 0.52
          : vehicle.size[2] * 0.34;
      const cabinWidthScale =
        vehicle.profileName === "boxTruck"
          ? vehicle.size[0] * 0.42
          : vehicle.size[0] * 0.54;
      setVehiclePartMatrix({
        mesh: bodyRef.current,
        tempObject,
        vehicle,
        index,
        localOffset: [0, 0.02, 0],
        scale: [vehicle.size[0] * 0.86, vehicle.size[1] * 0.76, vehicle.size[2] * 0.94]
      });
      setVehiclePartMatrix({
        mesh: cabinRef.current,
        tempObject,
        vehicle,
        index,
        localOffset: [0, vehicle.size[1] * 0.38, cabinOffsetZ],
        scale: [cabinWidthScale, vehicle.size[1] * 0.34, cabinLengthScale]
      });
      setVehiclePartMatrix({
        mesh: windshieldRef.current,
        tempObject,
        vehicle,
        index,
        localOffset: [0, vehicle.size[1] * 0.66, -vehicle.size[2] * 0.28],
        localRotation: [-Math.PI / 2, 0, 0],
        scale: getStage5WindshieldScale(vehicle.size)
      });
      setVehiclePartMatrix({
        mesh: rearGlassRef.current,
        tempObject,
        vehicle,
        index,
        localOffset: [0, vehicle.size[1] * 0.63, vehicle.size[2] * 0.26],
        localRotation: [-Math.PI / 2, 0, 0],
        scale: getStage5RearGlassScale(vehicle.size)
      });
      setVehiclePartMatrix({
        mesh: roofHighlightRef.current,
        tempObject,
        vehicle,
        index,
        localOffset: [0, vehicle.size[1] * 0.7, -vehicle.size[2] * 0.02],
        localRotation: [-Math.PI / 2, 0, 0],
        scale: getStage5RoofHighlightScale(vehicle.size)
      });
      setVehiclePartMatrix({
        mesh: frontGrilleRef.current,
        tempObject,
        vehicle,
        index,
        localOffset: [0, vehicle.size[1] * 0.03, -vehicle.size[2] * 0.55],
        scale: [vehicle.size[0] * 0.56, vehicle.size[1] * 0.2, 1]
      });
      setVehiclePartMatrix({
        mesh: tailPanelRef.current,
        tempObject,
        vehicle,
        index,
        localOffset: [0, vehicle.size[1] * 0.04, vehicle.size[2] * 0.55],
        localRotation: [0, Math.PI, 0],
        scale: [vehicle.size[0] * 0.58, vehicle.size[1] * 0.18, 1]
      });
      setVehiclePartMatrix({
        mesh: contactShadowRef.current,
        tempObject,
        vehicle,
        index,
        localOffset: [0, -vehicle.size[1] * 0.48, 0],
        localRotation: [-Math.PI / 2, 0, 0],
        scale: [vehicle.size[0] * 1.3, vehicle.size[2] * 1.08, 1]
      });
      if (isThreeInstancedMesh(bodyRef.current)) {
        bodyRef.current.setColorAt(index, new Color(vehicle.color));
      }
    });

    const sideGlassOffsets = vehicles.flatMap((vehicle) =>
      [
        [-vehicle.size[0] * 0.42, vehicle.size[1] * 0.42, -vehicle.size[2] * 0.02],
        [vehicle.size[0] * 0.42, vehicle.size[1] * 0.42, -vehicle.size[2] * 0.02]
      ].map((localOffset) => ({ vehicle, localOffset: localOffset as Vector3Tuple }))
    );
    const wheelOffsets = vehicles.flatMap((vehicle) =>
      [
        [-vehicle.size[0] * 0.48, -vehicle.size[1] * 0.28, -vehicle.size[2] * 0.33],
        [vehicle.size[0] * 0.48, -vehicle.size[1] * 0.28, -vehicle.size[2] * 0.33],
        [-vehicle.size[0] * 0.48, -vehicle.size[1] * 0.28, vehicle.size[2] * 0.33],
        [vehicle.size[0] * 0.48, -vehicle.size[1] * 0.28, vehicle.size[2] * 0.33]
      ].map((localOffset) => ({ vehicle, localOffset: localOffset as Vector3Tuple }))
    );

    sideGlassOffsets.forEach(({ vehicle, localOffset }, index) => {
      setVehiclePartMatrix({
        mesh: sideGlassRef.current,
        tempObject,
        vehicle,
        index,
        localOffset,
        localRotation: [0, Math.PI / 2, 0],
        scale: [vehicle.size[2] * 0.42, vehicle.size[1] * 0.22, 1]
      });
    });
    wheelOffsets.forEach(({ vehicle, localOffset }, index) => {
      setVehiclePartMatrix({
        mesh: wheelArchRef.current,
        tempObject,
        vehicle,
        index,
        localOffset: [localOffset[0], localOffset[1] + vehicle.size[1] * 0.08, localOffset[2]],
        localRotation: [0, Math.PI / 2, 0],
        scale: [vehicle.size[1] * 0.42, vehicle.size[1] * 0.42, vehicle.size[0] * 0.08]
      });
      setVehiclePartMatrix({
        mesh: wheelRef.current,
        tempObject,
        vehicle,
        index,
        localOffset,
        localRotation: [0, 0, Math.PI / 2],
        scale: [vehicle.size[1] * 0.34, vehicle.size[0] * 0.16, vehicle.size[1] * 0.34]
      });
    });

    const lightOffsets = vehicles.flatMap((vehicle) =>
      [
        [-vehicle.size[0] * 0.28, -vehicle.size[1] * 0.02, -vehicle.size[2] * 0.51],
        [vehicle.size[0] * 0.28, -vehicle.size[1] * 0.02, -vehicle.size[2] * 0.51]
      ].map((localOffset) => ({ vehicle, localOffset: localOffset as Vector3Tuple }))
    );
    const tailOffsets = vehicles.flatMap((vehicle) =>
      [
        [-vehicle.size[0] * 0.3, -vehicle.size[1] * 0.02, vehicle.size[2] * 0.51],
        [vehicle.size[0] * 0.3, -vehicle.size[1] * 0.02, vehicle.size[2] * 0.51]
      ].map((localOffset) => ({ vehicle, localOffset: localOffset as Vector3Tuple }))
    );

    lightOffsets.forEach(({ vehicle, localOffset }, index) => {
      setVehiclePartMatrix({
        mesh: headlightRef.current,
        tempObject,
        vehicle,
        index,
        localOffset,
        scale: [
          vehicle.size[0] * STAGE5_TRAFFIC_VEHICLE_LIGHT_GLOW.headlight.scale[0],
          vehicle.size[1] * STAGE5_TRAFFIC_VEHICLE_LIGHT_GLOW.headlight.scale[1],
          vehicle.size[2] * STAGE5_TRAFFIC_VEHICLE_LIGHT_GLOW.headlight.scale[2]
        ]
      });
    });
    tailOffsets.forEach(({ vehicle, localOffset }, index) => {
      setVehiclePartMatrix({
        mesh: taillightRef.current,
        tempObject,
        vehicle,
        index,
        localOffset,
        scale: [
          vehicle.size[0] * STAGE5_TRAFFIC_VEHICLE_LIGHT_GLOW.taillight.scale[0],
          vehicle.size[1] * STAGE5_TRAFFIC_VEHICLE_LIGHT_GLOW.taillight.scale[1],
          vehicle.size[2] * STAGE5_TRAFFIC_VEHICLE_LIGHT_GLOW.taillight.scale[2]
        ]
      });
    });

    for (const mesh of [
      bodyRef.current,
      cabinRef.current,
      windshieldRef.current,
      rearGlassRef.current,
      sideGlassRef.current,
      roofHighlightRef.current,
      frontGrilleRef.current,
      tailPanelRef.current,
      wheelArchRef.current,
      wheelRef.current,
      contactShadowRef.current,
      headlightRef.current,
      taillightRef.current
    ]) {
      if (isThreeInstancedMesh(mesh)) {
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
    if (isThreeInstancedMesh(bodyRef.current) && bodyRef.current.instanceColor) {
      bodyRef.current.instanceColor.needsUpdate = true;
    }
  }, [vehicles]);

  if (vehicles.length === 0) return null;

  return (
    <group
      name={name}
      userData={{
        vehicleCount: vehicles.length,
        castsRealShadows: castRealShadows,
        stage6VehicleLodTiers: countStage6VehicleLodTiers(vehicles),
        highQualityGlbEligibleVehicleCount: vehicles.filter(
          (vehicle) => vehicle.highQualityGlbEligible
        ).length,
        materialResponseCues: STAGE6_VEHICLE_MATERIAL_RESPONSE_CUES,
        emergencyLightVehicleCount: vehicles.filter(
          (vehicle) => vehicle.materialCues.emergencyLight !== "none"
        ).length
      }}
    >
      <instancedMesh
        ref={contactShadowRef}
        args={[undefined, undefined, vehicles.length]}
        receiveShadow
      >
        <Stage5VehiclePartGeometry partName="contactShadow" />
        <meshBasicMaterial
          color="#020304"
          transparent
          opacity={0.58}
          depthWrite={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={bodyRef}
        args={[undefined, undefined, vehicles.length]}
        castShadow={castRealShadows}
        receiveShadow
      >
        <Stage5VehiclePartGeometry partName="body" />
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0.36}
          metalness={0.18}
          clearcoat={0.32}
          clearcoatRoughness={0.34}
          envMapIntensity={0.72}
          emissive="#10171a"
          emissiveIntensity={0.05}
          vertexColors
        />
      </instancedMesh>
      <instancedMesh
        ref={cabinRef}
        args={[undefined, undefined, vehicles.length]}
        castShadow={castRealShadows}
        receiveShadow
      >
        <Stage5VehiclePartGeometry partName="cabin" />
        <meshPhysicalMaterial
          color="#253943"
          roughness={0.2}
          metalness={0.04}
          transmission={0.08}
          thickness={0.08}
          envMapIntensity={0.76}
          emissive="#0a1418"
          emissiveIntensity={0.12}
          transparent
          opacity={0.88}
        />
      </instancedMesh>
      <instancedMesh
        ref={roofHighlightRef}
        args={[undefined, undefined, vehicles.length]}
      >
        <Stage5VehiclePartGeometry partName="roofHighlight" />
        <meshBasicMaterial
          color="#20323a"
          transparent
          opacity={0.008}
          depthWrite={false}
          side={DoubleSide}
        />
      </instancedMesh>
      <instancedMesh
        ref={windshieldRef}
        args={[undefined, undefined, vehicles.length]}
      >
        <Stage5VehiclePartGeometry partName="windshield" />
        <meshPhysicalMaterial
          color="#1b303a"
          emissive="#081218"
          emissiveIntensity={0.12}
          roughness={0.12}
          metalness={0.05}
          transmission={0.08}
          thickness={0.05}
          envMapIntensity={0.84}
          transparent
          opacity={0.5}
          side={DoubleSide}
        />
      </instancedMesh>
      <instancedMesh
        ref={rearGlassRef}
        args={[undefined, undefined, vehicles.length]}
      >
        <Stage5VehiclePartGeometry partName="rearGlass" />
        <meshPhysicalMaterial
          color="#182b34"
          emissive="#071016"
          emissiveIntensity={0.1}
          roughness={0.14}
          metalness={0.04}
          transmission={0.08}
          thickness={0.05}
          envMapIntensity={0.78}
          transparent
          opacity={0.48}
          side={DoubleSide}
        />
      </instancedMesh>
      <instancedMesh
        ref={sideGlassRef}
        args={[undefined, undefined, vehicles.length * 2]}
      >
        <Stage5VehiclePartGeometry partName="sideGlass" />
        <meshPhysicalMaterial
          color="#142832"
          emissive="#060e13"
          emissiveIntensity={0.08}
          roughness={0.16}
          transmission={0.08}
          thickness={0.04}
          envMapIntensity={0.74}
          transparent
          opacity={0.46}
          side={DoubleSide}
        />
      </instancedMesh>
      <instancedMesh
        ref={frontGrilleRef}
        args={[undefined, undefined, vehicles.length]}
      >
        <Stage5VehiclePartGeometry partName="frontGrille" />
        <meshStandardMaterial
          color="#101820"
          emissive="#111827"
          emissiveIntensity={0.18}
          roughness={0.62}
          metalness={0.1}
          side={DoubleSide}
        />
      </instancedMesh>
      <instancedMesh
        ref={tailPanelRef}
        args={[undefined, undefined, vehicles.length]}
      >
        <Stage5VehiclePartGeometry partName="tailPanel" />
        <meshStandardMaterial
          color="#41161a"
          emissive="#431414"
          emissiveIntensity={0.32}
          roughness={0.52}
          side={DoubleSide}
        />
      </instancedMesh>
      <instancedMesh
        ref={wheelArchRef}
        args={[undefined, undefined, vehicles.length * 4]}
        castShadow={castRealShadows}
        receiveShadow
      >
        <Stage5VehiclePartGeometry partName="wheelArch" />
        <meshStandardMaterial color="#050607" roughness={0.8} metalness={0.03} />
      </instancedMesh>
      <instancedMesh
        ref={wheelRef}
        args={[undefined, undefined, vehicles.length * 4]}
        castShadow={castRealShadows}
        receiveShadow
      >
        <Stage5VehiclePartGeometry partName="wheel" />
        <meshStandardMaterial color="#08090a" roughness={0.78} metalness={0.04} />
      </instancedMesh>
      <instancedMesh
        ref={headlightRef}
        args={[undefined, undefined, vehicles.length * 2]}
      >
        <Stage5VehiclePartGeometry partName="headlight" />
        <meshStandardMaterial
          {...STAGE5_TRAFFIC_VEHICLE_LIGHT_GLOW.headlight.material}
        />
      </instancedMesh>
      <instancedMesh
        ref={taillightRef}
        args={[undefined, undefined, vehicles.length * 2]}
      >
        <Stage5VehiclePartGeometry partName="taillight" />
        <meshStandardMaterial
          {...STAGE5_TRAFFIC_VEHICLE_LIGHT_GLOW.taillight.material}
        />
      </instancedMesh>
    </group>
  );
}

function Stage5VehiclePartGeometry({
  partName
}: {
  partName: Stage5TrafficVehiclePartName;
}) {
  const geometry = getStage5TrafficVehicleGeometry(partName);

  if (geometry === "extrudeGeometry") {
    return <Stage5VehicleBodyGeometry />;
  }
  if (geometry === "sphereGeometry") {
    return <sphereGeometry args={[0.5, 16, 8]} />;
  }
  if (geometry === "cylinderGeometry") {
    return <cylinderGeometry args={[0.5, 0.5, 1, 16]} />;
  }
  if (geometry === "torusGeometry") {
    return <torusGeometry args={[0.5, 0.08, 8, 18]} />;
  }
  if (geometry === "circleGeometry") {
    return <circleGeometry args={[0.5, 28]} />;
  }

  return <planeGeometry args={[1, 1]} />;
}

function Stage5VehicleBodyGeometry() {
  const bodyShape = useMemo(() => {
    const shape = new Shape();

    shape.moveTo(-0.5, -0.28);
    shape.lineTo(-0.43, 0.05);
    shape.quadraticCurveTo(-0.32, 0.28, -0.12, 0.34);
    shape.lineTo(0.2, 0.34);
    shape.quadraticCurveTo(0.42, 0.26, 0.49, 0.02);
    shape.lineTo(0.52, -0.18);
    shape.quadraticCurveTo(0.36, -0.28, 0.12, -0.31);
    shape.lineTo(-0.28, -0.31);
    shape.quadraticCurveTo(-0.43, -0.3, -0.5, -0.28);

    return shape;
  }, []);

  return (
    <extrudeGeometry
      args={[
        bodyShape,
        {
          depth: 1,
          bevelEnabled: true,
          bevelSegments: 2,
          bevelSize: 0.045,
          bevelThickness: 0.045,
          curveSegments: 8
        }
      ]}
      onUpdate={(geometry) => {
        geometry.center();
      }}
    />
  );
}

function getStage5TrafficVehicleGeometry(
  partName: Stage5TrafficVehiclePartName
): Stage5TrafficVehicleGeometry {
  return STAGE5_TRAFFIC_VEHICLE_SILHOUETTE_PARTS.find(
    (part) => part.name === partName
  )?.geometry ?? "planeGeometry";
}

function setVehiclePartMatrix({
  mesh,
  tempObject,
  vehicle,
  index,
  localOffset,
  localRotation = [0, 0, 0],
  scale
}: {
  mesh: InstancedMesh | null;
  tempObject: Object3D;
  vehicle: {
    position: Vector3Tuple;
    rotationY: number;
    size: Vector3Tuple;
  };
  index: number;
  localOffset: Vector3Tuple;
  localRotation?: Vector3Tuple;
  scale: Vector3Tuple;
}) {
  if (!isThreeInstancedMesh(mesh)) return;

  const worldOffset = rotateLocalOffset(localOffset, vehicle.rotationY);

  tempObject.position.set(
    vehicle.position[0] + worldOffset[0],
    vehicle.position[1] + localOffset[1],
    vehicle.position[2] + worldOffset[2]
  );
  tempObject.rotation.set(
    localRotation[0],
    vehicle.rotationY + localRotation[1],
    localRotation[2]
  );
  tempObject.scale.set(...scale);
  tempObject.updateMatrix();
  mesh.setMatrixAt(index, tempObject.matrix);
}

function isThreeInstancedMesh(mesh: InstancedMesh | null): mesh is InstancedMesh {
  return Boolean(mesh && typeof mesh.setMatrixAt === "function");
}

function rotateLocalOffset(offset: Vector3Tuple, rotationY: number): Vector3Tuple {
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);

  return [
    offset[0] * cos + offset[2] * sin,
    offset[1],
    -offset[0] * sin + offset[2] * cos
  ];
}

function getIntersectionDistanceSquared(position: Vector3Tuple) {
  return position[0] * position[0] + position[2] * position[2];
}

function countStage6VehicleLodTiers(
  vehicles: { lodTier: Stage6VehicleLodTier }[]
): Record<Stage6VehicleLodTier, number> {
  return vehicles.reduce<Record<Stage6VehicleLodTier, number>>(
    (counts, vehicle) => {
      counts[vehicle.lodTier] += 1;

      return counts;
    },
    { hero: 0, near: 0, mid: 0, far: 0 }
  );
}

function buildPreciseVehicles(
  vehicles: SimulationVehicleSnapshot[],
  qualityPreset: Stage6QualityPreset
): TrafficDensityPreciseVehicle[] {
  const drafts = applyPreciseVehicleLongitudinalSpacing(
    vehicles.map((vehicle, originalIndex) => {
      const size = getPreciseVehicleSize(vehicle);
      const lanePlacement = resolvePreciseVehicleLanePlacement(vehicle);

      return {
        vehicle,
        originalIndex,
        size,
        lanePosition: getLaneAlignedPreciseVehiclePosition(vehicle, lanePlacement),
        lanePlacement
      };
    })
  );

  return drafts.map(({ vehicle, size, lanePosition }) => {
    const lodDecision = decideStage6VehicleLod({
      distanceMeters: Math.sqrt(
        lanePosition.x * lanePosition.x + lanePosition.z * lanePosition.z
      ),
      sourceLabel: "snapshot",
      vehicleType: vehicle.vehicle_type,
      emergency: vehicle.emergency,
      speedMps: vehicle.speed_mps,
      waitingSeconds: vehicle.waiting_seconds,
      qualityPreset
    });

    return {
      id: vehicle.id,
      sourceLabel: "snapshot",
      vehicleType: vehicle.vehicle_type,
      position: [
        lanePosition.x,
        size[1] / 2 + 0.04,
        lanePosition.z
      ],
      rotationY: degreesToRadians(vehicle.heading_degrees),
      size,
      color: getPreciseVehicleColor(vehicle),
      emergency: vehicle.emergency,
      lodTier: lodDecision.tier,
      highQualityGlbEligible: lodDecision.highQualityGlbEligible,
      operatorRelevant: lodDecision.operatorRelevant,
      materialCues: lodDecision.materialCues
    };
  });
}

function getLaneAlignedPreciseVehiclePosition(
  vehicle: SimulationVehicleSnapshot,
  lanePlacement = resolvePreciseVehicleLanePlacement(vehicle)
) {
  if (!lanePlacement) {
    return {
      x: vehicle.x_meters,
      z: vehicle.y_meters
    };
  }

  const laneOffset = getInboundLaneOffset(
    lanePlacement.direction,
    lanePlacement.laneIndex,
    INBOUND_LANE_COUNT
  );

  if (
    lanePlacement.direction === "north" ||
    lanePlacement.direction === "south"
  ) {
    return {
      x: laneOffset,
      z: vehicle.y_meters
    };
  }

  return {
    x: vehicle.x_meters,
    z: laneOffset
  };
}

function applyPreciseVehicleLongitudinalSpacing(
  drafts: PreciseVehicleDraft[]
): PreciseVehicleDraft[] {
  const adjustedDrafts = drafts.map((draft) => ({
    ...draft,
    lanePosition: { ...draft.lanePosition }
  }));
  const draftsByLane = new Map<string, PreciseVehicleDraft[]>();

  for (const draft of adjustedDrafts) {
    if (!draft.lanePlacement) continue;

    const key = `${draft.lanePlacement.direction}:${draft.lanePlacement.laneIndex}`;
    draftsByLane.set(key, [...(draftsByLane.get(key) ?? []), draft]);
  }

  for (const laneDrafts of draftsByLane.values()) {
    const orderedLaneDrafts = [...laneDrafts].sort(
      (left, right) =>
        getApproachQueueCoordinate(left) -
          getApproachQueueCoordinate(right) ||
        left.originalIndex - right.originalIndex
    );

    for (let index = 1; index < orderedLaneDrafts.length; index += 1) {
      const leader = orderedLaneDrafts[index - 1];
      const follower = orderedLaneDrafts[index];
      const minFollowerCoordinate =
        getApproachQueueCoordinate(leader) +
        getPreciseVehicleMinimumCenterSpacing(leader.size, follower.size);

      if (getApproachQueueCoordinate(follower) < minFollowerCoordinate) {
        setApproachQueueCoordinate(follower, minFollowerCoordinate);
      }
    }
  }

  return adjustedDrafts;
}

function getPreciseVehicleMinimumCenterSpacing(
  leaderSize: Vector3Tuple,
  followerSize: Vector3Tuple
) {
  return (
    leaderSize[2] / 2 +
    followerSize[2] / 2 +
    PRECISE_VEHICLE_MIN_LONGITUDINAL_CLEARANCE_METERS
  );
}

function getApproachQueueCoordinate(draft: PreciseVehicleDraft) {
  const direction = draft.lanePlacement?.direction;

  if (direction === "north") return -draft.lanePosition.z;
  if (direction === "south") return draft.lanePosition.z;
  if (direction === "east") return draft.lanePosition.x;
  if (direction === "west") return -draft.lanePosition.x;

  return Math.sqrt(
    draft.lanePosition.x * draft.lanePosition.x +
      draft.lanePosition.z * draft.lanePosition.z
  );
}

function setApproachQueueCoordinate(
  draft: PreciseVehicleDraft,
  queueCoordinate: number
) {
  const direction = draft.lanePlacement?.direction;

  if (direction === "north") {
    draft.lanePosition.z = -queueCoordinate;
    return;
  }
  if (direction === "south") {
    draft.lanePosition.z = queueCoordinate;
    return;
  }
  if (direction === "east") {
    draft.lanePosition.x = queueCoordinate;
    return;
  }
  if (direction === "west") {
    draft.lanePosition.x = -queueCoordinate;
  }
}

function resolvePreciseVehicleLanePlacement(
  vehicle: SimulationVehicleSnapshot
): PreciseVehicleLanePlacement | null {
  const laneIndex = parseLaneIndex(vehicle.lane_id);
  if (laneIndex === null) return null;

  const laneDirection = parseLaneDirection(vehicle.lane_id);
  if (!laneDirection) return null;
  if (!headingMatchesDirection(vehicle.heading_degrees, laneDirection)) return null;

  return {
    direction: laneDirection,
    laneIndex: clamp(laneIndex, 0, INBOUND_LANE_COUNT - 1)
  };
}

function parseLaneDirection(laneId: string): Direction | null {
  const normalized = laneId.toLowerCase();

  return DIRECTIONS.find((direction) =>
    new RegExp(`(^|[_:\\-.])${direction}([_:\\-.]|$)`).test(normalized)
  ) ?? null;
}

function parseLaneIndex(laneId: string) {
  const match = laneId.match(/(\d+)(?!.*\d)/);
  if (!match) return null;

  const laneIndex = Number.parseInt(match[1], 10);
  return Number.isInteger(laneIndex) ? laneIndex : null;
}

function headingMatchesDirection(headingDegrees: number, direction: Direction) {
  return angularDistanceDegrees(
    headingDegrees,
    PRECISE_VEHICLE_HEADING_BY_DIRECTION[direction]
  ) <= 35;
}

function buildFarVehicles(
  sceneSnapshot: SceneSnapshot
): TrafficDensityFarVehicle[] {
  if (!sceneSnapshot.allowsDensityFill) return [];
  if (sceneSnapshot.trafficDensityMode === "fixture_queues") {
    return buildFixtureQueueVehicles(sceneSnapshot);
  }
  if (sceneSnapshot.trafficDensityMode === "density_segments") {
    return sceneSnapshot.densitySegments.flatMap(buildDensitySegmentVehicles);
  }

  return [];
}

export function getStage5RoofHighlightScale(
  vehicleSize: Vector3Tuple
): Vector3Tuple {
  return [vehicleSize[0] * 0.16, vehicleSize[2] * 0.045, 1];
}

export function getStage5WindshieldScale(
  vehicleSize: Vector3Tuple
): Vector3Tuple {
  return [vehicleSize[0] * 0.46, vehicleSize[2] * 0.12, 1];
}

export function getStage5RearGlassScale(
  vehicleSize: Vector3Tuple
): Vector3Tuple {
  return [vehicleSize[0] * 0.4, vehicleSize[2] * 0.1, 1];
}

function buildFixtureQueueVehicles(
  sceneSnapshot: SceneSnapshot
): TrafficDensityFarVehicle[] {
  if (!sceneSnapshot.queues) return [];

  return DIRECTIONS.flatMap((direction) => {
    const queueCount = Math.max(0, sceneSnapshot.queues?.[direction] ?? 0);
    const minimumPerDirection = Math.ceil(
      STAGE5_MIN_VISIBLE_VEHICLES / DIRECTIONS.length
    );
    const visibleCount = Math.min(
      MAX_FIXTURE_VEHICLES_PER_DIRECTION,
      Math.max(minimumPerDirection, Math.ceil(queueCount / 2))
    );
    const usableLength = Math.max(48, CORRIDOR_LENGTH_METERS[direction] - 34);
    const laneCount = INBOUND_LANE_COUNT;

    return Array.from({ length: visibleCount }, (_, index) => {
      const laneIndex = getStaggeredLaneIndex({
        direction,
        index,
        laneCount
      });
      const profile = getTrafficVehicleProfile({
        direction,
        index,
        laneIndex
      });
      const transform = getApproachTransform({
        direction,
        distanceFromStopLine: getStaggeredQueueDistance({
          direction,
          index,
          laneIndex,
          laneCount,
          visibleCount,
          usableLength,
          vehicleLength: profile.size[2]
        }),
        laneIndex,
        laneCount,
        height: profile.size[1],
        lateralJitterMeters: getLaneJitterMeters({ direction, index, laneIndex })
      });

      return {
        id: `fixture-${direction}-queue-${index}`,
        direction,
        assetId: STAGE6E_DENSITY_ASSET_BY_PROFILE[profile.name],
        sourceLabel: "fixture",
        position: transform.position,
        rotationY: transform.rotationY,
        size: profile.size,
        color: getTrafficVehicleColor({ profile, direction, index, laneIndex }),
        opacity: 0.86
      };
    });
  });
}

function buildDensitySegmentVehicles(
  segment: SimulationDensitySegment
): TrafficDensityFarVehicle[] {
  const vehicleCount = Math.max(0, segment.vehicle_count);
  if (vehicleCount === 0) return [];

  const visibleCount = Math.min(
    18,
    Math.ceil(vehicleCount / Math.max(1, segment.lane_count * 2))
  );
  const start = Math.max(8, segment.start_meters_from_stop_line);
  const end = Math.min(
    CORRIDOR_LENGTH_METERS[segment.approach] - 8,
    segment.end_meters_from_stop_line
  );
  const span = Math.max(0, end - start);
  const laneCount = Math.max(1, Math.min(segment.lane_count, INBOUND_LANE_COUNT));

  return Array.from({ length: visibleCount }, (_, index) => {
    const laneIndex = getStaggeredLaneIndex({
      direction: segment.approach,
      index,
      laneCount
    });
    const profile = getTrafficVehicleProfile({
      direction: segment.approach,
      index,
      laneIndex
    });
    const distanceFromStopLine =
      span > 0
        ? clamp(
            start +
              ((index + 0.5) * span) / visibleCount +
              getDistanceJitterMeters({
                direction: segment.approach,
                index,
                laneIndex,
                laneCount,
                vehicleLength: profile.size[2]
              }),
            start,
            end
          )
        : start;
    const transform = getApproachTransform({
      direction: segment.approach,
      distanceFromStopLine,
      laneIndex,
      laneCount,
      height: profile.size[1],
      lateralJitterMeters: getLaneJitterMeters({
        direction: segment.approach,
        index,
        laneIndex
      })
    });

    return {
      id: `${segment.segment_id}-density-${index}`,
      direction: segment.approach,
      assetId: STAGE6E_DENSITY_ASSET_BY_PROFILE[profile.name],
      sourceLabel: segment.source,
      position: transform.position,
      rotationY: transform.rotationY,
      size: profile.size,
      color:
        segment.source === "aggregate_density_proxy"
          ? getTrafficVehicleColor({ profile, direction: segment.approach, index, laneIndex })
          : "#71838c",
      opacity: segment.source === "aggregate_density_proxy" ? 0.68 : 0.72
    };
  });
}

function getTrafficVehicleProfile({
  direction,
  index,
  laneIndex
}: {
  direction: Direction;
  index: number;
  laneIndex: number;
}): TrafficVehicleProfile {
  const directionOffset = DIRECTION_INDEX[direction];
  const profileIndex =
    (index * 5 + laneIndex * 3 + directionOffset * 2) %
    TRAFFIC_VEHICLE_PROFILES.length;

  return TRAFFIC_VEHICLE_PROFILES[profileIndex];
}

function getTrafficVehicleColor({
  profile,
  direction,
  index,
  laneIndex
}: {
  profile: TrafficVehicleProfile;
  direction: Direction;
  index: number;
  laneIndex: number;
}) {
  const directionOffset = DIRECTION_INDEX[direction];
  const colorIndex =
    (index + laneIndex * 2 + directionOffset * 3) % profile.colors.length;

  return profile.colors[colorIndex];
}

function getStaggeredLaneIndex({
  direction,
  index,
  laneCount
}: {
  direction: Direction;
  index: number;
  laneCount: number;
}) {
  const directionOffset = DIRECTION_INDEX[direction];
  const laneSequence = [1, 0, 2, 1, 2, 0];

  return laneSequence[(index + directionOffset) % laneSequence.length] % laneCount;
}

function getStaggeredQueueDistance({
  direction,
  index,
  laneIndex,
  laneCount,
  visibleCount,
  usableLength,
  vehicleLength
}: {
  direction: Direction;
  index: number;
  laneIndex: number;
  laneCount: number;
  visibleCount: number;
  usableLength: number;
  vehicleLength: number;
}) {
  const row = Math.floor(index / laneCount);
  const rowCount = Math.max(1, Math.ceil(visibleCount / laneCount));
  const rowSpacing = usableLength / Math.max(1, rowCount - 1);
  const distance =
    QUEUE_START_METERS_FROM_STOP_LINE +
    row * rowSpacing +
    getDistanceJitterMeters({
      direction,
      index,
      laneIndex,
      laneCount,
      vehicleLength
    });

  return clamp(distance, 9, CORRIDOR_LENGTH_METERS[direction] - 10);
}

function getDistanceJitterMeters({
  direction,
  index,
  laneIndex,
  laneCount,
  vehicleLength
}: {
  direction: Direction;
  index: number;
  laneIndex: number;
  laneCount: number;
  vehicleLength: number;
}) {
  const directionOffset = DIRECTION_INDEX[direction];
  const row = Math.floor(index / laneCount);
  const lanePhase = [-1.9, 1.15, 3.25][laneIndex % 3] ?? 0;
  const pulse = ((row * 7 + laneIndex * 5 + directionOffset * 3) % 7 - 3) * 0.42;
  const lengthAllowance = Math.max(0, vehicleLength - 5) * 0.38;

  return lanePhase + pulse + lengthAllowance;
}

function getLaneJitterMeters({
  direction,
  index,
  laneIndex
}: {
  direction: Direction;
  index: number;
  laneIndex: number;
}) {
  const directionOffset = DIRECTION_INDEX[direction];
  const jitterStep =
    ((index * 11 + laneIndex * 7 + directionOffset * 5) % 5) - 2;

  return jitterStep * 0.09;
}

function getProfileNameFromSize(size: Vector3Tuple): TrafficVehicleProfileName {
  const matchingProfile = TRAFFIC_VEHICLE_PROFILES.find(
    (profile) => profile.size[0] === size[0] && profile.size[2] === size[2]
  );

  return matchingProfile?.name ?? "sedan";
}

function getVehicleTypeFromProfileName(
  profileName: TrafficVehicleProfileName
): SimulationVehicleSnapshot["vehicle_type"] {
  if (profileName === "cityBus") return "bus";
  if (profileName === "boxTruck") return "truck";
  if (profileName === "taxi") return "taxi";
  return "car";
}

function getPreciseVehicleProfileName(
  vehicleType: SimulationVehicleSnapshot["vehicle_type"]
): TrafficVehicleProfileName {
  if (vehicleType === "bus") return "cityBus";
  if (vehicleType === "truck") return "boxTruck";
  if (vehicleType === "taxi") return "taxi";
  if (vehicleType === "emergency") return "van";
  return "sedan";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getApproachTransform({
  direction,
  distanceFromStopLine,
  laneIndex,
  laneCount,
  height,
  lateralJitterMeters = 0
}: {
  direction: Direction;
  distanceFromStopLine: number;
  laneIndex: number;
  laneCount: number;
  height: number;
  lateralJitterMeters?: number;
}) {
  const laneOffset =
    getInboundLaneOffset(direction, laneIndex, laneCount) + lateralJitterMeters;
  const y = height / 2 + 0.045;
  const distance = STOP_LINE_OFFSET_METERS + distanceFromStopLine;

  if (direction === "north") {
    return {
      position: [laneOffset, y, -distance] as Vector3Tuple,
      rotationY: Math.PI
    };
  }
  if (direction === "south") {
    return {
      position: [laneOffset, y, distance] as Vector3Tuple,
      rotationY: 0
    };
  }
  if (direction === "east") {
    return {
      position: [distance, y, laneOffset] as Vector3Tuple,
      rotationY: -Math.PI / 2
    };
  }

  return {
    position: [-distance, y, laneOffset] as Vector3Tuple,
    rotationY: Math.PI / 2
  };
}

function getInboundLaneOffset(
  direction: Direction,
  laneIndex: number,
  laneCount: number
) {
  const centeredIndex = laneIndex - (laneCount - 1) / 2;
  const rightHandTrafficBias =
    direction === "north" || direction === "east"
      ? -INBOUND_LANE_VISUAL_BIAS_METERS
      : INBOUND_LANE_VISUAL_BIAS_METERS;

  return centeredIndex * LANE_WIDTH_METERS + rightHandTrafficBias;
}

function resolveSourceLabel(
  sceneSnapshot: SceneSnapshot
): TrafficDensitySourceLabel {
  if (sceneSnapshot.trafficDensityMode === "fixture_queues") return "fixture";
  if (sceneSnapshot.trafficDensityMode === "snapshot_vehicles") return "snapshot";
  if (sceneSnapshot.trafficDensityMode === "density_segments") {
    return sceneSnapshot.densitySegments[0]?.source ?? "none";
  }
  return "none";
}

function getPreciseVehicleSize(
  vehicle: SimulationVehicleSnapshot
): Vector3Tuple {
  if (vehicle.vehicle_type === "bus") return [2.7, 2.15, 9.2];
  if (vehicle.vehicle_type === "truck") return [2.65, 2.05, 7.4];
  if (vehicle.vehicle_type === "emergency") return [2.35, 1.48, 5.25];
  return [2.12, 1.32, 4.55];
}

// Per-instance Korean traffic liveries for the near/precise SUMO stream. This
// stream is not luminance-constrained, so passenger cars can use the realistic
// dark end of the palette (charcoal / near-black / deep red / dark navy) while
// staying weighted toward neutrals (repeated white/silver) so the fleet reads
// as varied but believable. The body GLB base stays white and is tinted by these
// per-instance colors. Emergency keeps a white body; its red comes from emitters.
const PRECISE_VEHICLE_COLOR_PALETTES: Record<
  SimulationVehicleType,
  readonly string[]
> = {
  car: [
    "#eef1f2",
    "#eef1f2",
    "#d7dadc",
    "#d7dadc",
    "#b7bdc0",
    "#8f989d",
    "#5b6166",
    "#2c3136",
    "#1a1d20",
    "#6e1f24",
    "#1d2740"
  ],
  taxi: ["#ef7c00", "#f0892a"],
  bus: ["#1d4ea2", "#1d4ea2", "#1d4ea2", "#3d9b68"],
  truck: ["#e8ebec", "#cfd4d6", "#a7b0b4", "#9fb6c9"],
  emergency: ["#f2f4f5"]
};

function getPreciseVehicleColor(vehicle: SimulationVehicleSnapshot) {
  if (vehicle.emergency || vehicle.vehicle_type === "emergency") {
    return PRECISE_VEHICLE_COLOR_PALETTES.emergency[0];
  }

  const palette =
    PRECISE_VEHICLE_COLOR_PALETTES[vehicle.vehicle_type] ??
    PRECISE_VEHICLE_COLOR_PALETTES.car;

  return palette[hashIdToPaletteIndex(vehicle.id, palette.length)];
}

// Stable per-vehicle hash so each SUMO vehicle keeps a consistent livery across
// frames while the same type shows varied colors across the fleet.
function hashIdToPaletteIndex(id: string, length: number) {
  if (length <= 1) return 0;

  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }

  return hash % length;
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function angularDistanceDegrees(left: number, right: number) {
  return Math.abs(((left - right + 540) % 360) - 180);
}

function canUseRuntimeDensityAssets() {
  return (
    typeof window !== "undefined" &&
    !/jsdom/i.test(window.navigator.userAgent)
  );
}
