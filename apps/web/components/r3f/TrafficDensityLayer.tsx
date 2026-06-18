"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Object3D,
  Shape,
  type Group,
  type InstancedMesh,
  type Material,
  type Mesh,
  MeshStandardMaterial
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { Direction } from "../../lib/types";
import type {
  SimulationDensitySegment,
  SimulationDensitySegmentSource,
  SimulationVehicleSnapshot
} from "../../lib/simulationSnapshot";
import type { SceneSnapshot, SceneTrafficDensityMode } from "./buildSceneSnapshot";
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
const STOP_LINE_OFFSET_METERS = INTERSECTION_BOX_METERS / 2;
export const STAGE5_MIN_VISIBLE_VEHICLES = 80;
const MAX_FIXTURE_VEHICLES_PER_DIRECTION = 24;
const MIN_TRAFFIC_VEHICLE_WIDTH_METERS = 2.32;
const MIN_TRAFFIC_VEHICLE_HEIGHT_METERS = 1.08;
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
  { name: "headlightGlow", geometry: "planeGeometry", visible: true },
  { name: "taillightGlow", geometry: "planeGeometry", visible: true }
] as const;

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
};

export const STAGE6E_REPEATED_DENSITY_GLB_ASSET_IDS = [
  "vehicles/passenger_car_far",
  "vehicles/taxi_far",
  "vehicles/bus_far",
  "vehicles/truck_far"
] as const satisfies readonly R3FAssetId[];

export type Stage6ERepeatedDensityAssetId =
  (typeof STAGE6E_REPEATED_DENSITY_GLB_ASSET_IDS)[number];

type Stage6EInstancedGeometryGroup = {
  key: string;
  assetId: Stage6ERepeatedDensityAssetId;
  geometry: BufferGeometry;
  material: Material;
};

const STAGE6E_DENSITY_MATERIAL_COLORS: Record<
  Stage6ERepeatedDensityAssetId,
  string
> = {
  "vehicles/passenger_car_far": "#748995",
  "vehicles/taxi_far": "#a78d3a",
  "vehicles/bus_far": "#668897",
  "vehicles/truck_far": "#859197"
};

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

const TRAFFIC_VEHICLE_PROFILES: TrafficVehicleProfile[] = [
  {
    name: "sedan",
    size: [2.36, 1.14, 4.65],
    colors: ["#e6ecef", "#b7c1c7", "#8fa4af", "#c9d2d5"]
  },
  {
    name: "hatchback",
    size: [
      MIN_TRAFFIC_VEHICLE_WIDTH_METERS,
      MIN_TRAFFIC_VEHICLE_HEIGHT_METERS,
      4.32
    ],
    colors: ["#f0f3f1", "#aeb9be", "#97a8b0"]
  },
  {
    name: "taxi",
    size: [2.38, 1.16, 4.72],
    colors: ["#d9bd52", "#e0c866"]
  },
  {
    name: "suv",
    size: [2.52, 1.34, 4.9],
    colors: ["#b8c3c8", "#7f96a4", "#a97870"]
  },
  {
    name: "van",
    size: [2.62, 1.62, 5.62],
    colors: ["#d7dee1", "#9cafb8", "#c2b17a"]
  },
  {
    name: "boxTruck",
    size: [2.68, 2.02, 7.15],
    colors: ["#cfd8dc", "#b2bec5"]
  },
  {
    name: "cityBus",
    size: [2.76, 2.18, 8.85],
    colors: ["#88a9b6", "#b7c7cf"]
  }
];

export function buildTrafficDensityRenderPlan(
  sceneSnapshot: SceneSnapshot
): TrafficDensityRenderPlan {
  const mode = sceneSnapshot.trafficDensityMode;
  const preciseVehicles = buildPreciseVehicles(sceneSnapshot.vehicles);
  const farVehicles = buildFarVehicles(sceneSnapshot);

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
  sceneSnapshot
}: {
  sceneSnapshot: SceneSnapshot;
}) {
  const plan = buildTrafficDensityRenderPlan(sceneSnapshot);
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
      profileName: getPreciseVehicleProfileName(vehicle.vehicleType)
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
      <Stage5TrafficVehicleInstances
        name="stage5-near-precise-shadow-vehicles"
        vehicles={preciseShadowVehicles}
        castRealShadows={STAGE5_SHADOWS_ENABLED}
      />
      <Stage5TrafficVehicleInstances
        name="stage5-precise-contact-shadow-vehicles"
        vehicles={preciseContactOnlyVehicles}
      />
      {canUseDensityGlbs ? (
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
      ) : (
        <Stage5TrafficVehicleInstances
          name="stage5-density-procedural-contact-shadow-vehicles"
          vehicles={allProceduralFarVehicles}
        />
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
  return vehicles.map((vehicle) => ({
    id: vehicle.id,
    position: vehicle.position,
    rotationY: vehicle.rotationY,
    size: vehicle.size,
    color: vehicle.color,
    emergency: false,
    profileName: getProfileNameFromSize(vehicle.size)
  }));
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
      ) as Record<
        Stage6ERepeatedDensityAssetId,
        Stage6EInstancedGeometryGroup[]
      >,
    [bus.scene, passengerCar.scene, taxi.scene, truck.scene]
  );
  const visibleVehicles = useMemo(
    () => assetGroups.flatMap((group) => group.vehicles),
    [assetGroups]
  );

  if (visibleVehicles.length === 0) return null;

  return (
    <group name="stage6e-manifest-density-glb-vehicles">
      {assetGroups.flatMap((assetGroup) =>
        geometryGroupsByAsset[assetGroup.assetId].map((geometryGroup) => (
          <Stage6EInstancedDensityMesh
            key={geometryGroup.key}
            geometryGroup={geometryGroup}
            vehicles={assetGroup.vehicles}
          />
        ))
      )}
      <Stage6EDensityContactShadows vehicles={visibleVehicles} />
    </group>
  );
}

function Stage6EInstancedDensityMesh({
  geometryGroup,
  vehicles
}: {
  geometryGroup: Stage6EInstancedGeometryGroup;
  vehicles: TrafficDensityFarVehicle[];
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const tempObjectRef = useRef(new Object3D());
  const tempColorRef = useRef(new Color());

  useEffect(() => {
    const mesh = meshRef.current;
    if (!isThreeInstancedMesh(mesh)) return;

    const tempObject = tempObjectRef.current;
    const tempColor = tempColorRef.current;

    vehicles.forEach((vehicle, index) => {
      tempObject.position.set(vehicle.position[0], 0.04, vehicle.position[2]);
      tempObject.rotation.set(0, vehicle.rotationY, 0);
      tempObject.scale.set(1, 1, 1);
      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);
      mesh.setColorAt(index, tempColor.set(vehicle.color));
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [vehicles]);

  if (vehicles.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometryGroup.geometry, geometryGroup.material, vehicles.length]}
      castShadow={false}
      receiveShadow={false}
      userData={{
        densityAssetId: geometryGroup.assetId,
        densitySilhouetteGroupKey: geometryGroup.key,
        aggregateDensityOnly: true,
        instancedDensityVehicleCount: vehicles.length
      }}
    />
  );
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
        opacity={0.34}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

export function buildStage6EInstancedGeometryGroups(
  assetId: Stage6ERepeatedDensityAssetId,
  scene: Group
): Stage6EInstancedGeometryGroup[] {
  const geometries: BufferGeometry[] = [];

  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    if (!isRenderableMesh(object)) return;

    const geometry = normalizeStage6EDensityGeometryForMerge(object.geometry);
    geometry.applyMatrix4(object.matrixWorld);

    if (geometry.attributes.position) {
      geometries.push(geometry);
    }
  });

  if (geometries.length === 0) return [];

  const geometry =
    geometries.length === 1
      ? geometries[0]
      : canMergeStage6EGeometries(geometries)
        ? mergeGeometries(geometries)
        : geometries[0];

  if (!geometry) return [];

  return [
    {
      key: `${assetId}:silhouette`,
      assetId,
      geometry,
      material: createStage6EDensityMaterial(assetId)
    }
  ];
}

export function normalizeStage6EDensityGeometryForMerge(
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

function createStage6EDensityMaterial(assetId: Stage6ERepeatedDensityAssetId) {
  return new MeshStandardMaterial({
    color: STAGE6E_DENSITY_MATERIAL_COLORS[assetId],
    roughness: 0.62,
    metalness: 0.14,
    envMapIntensity: 0.68
  });
}

function canMergeStage6EGeometries(geometries: BufferGeometry[]) {
  if (geometries.length < 2) return false;

  const firstSignature = getStage6EGeometryMergeSignature(geometries[0]);

  return geometries.every(
    (geometry) =>
      geometry.index === null &&
      geometry.attributes.position &&
      getStage6EGeometryMergeSignature(geometry) === firstSignature
  );
}

function getStage6EGeometryMergeSignature(geometry: BufferGeometry) {
  const attributeSignature = Object.keys(geometry.attributes)
    .sort()
    .map((name) => {
      const attribute = geometry.attributes[name];

      return `${name}:${getStage6EAttributeMergeSignature(attribute)}`;
    })
    .join("|");
  const morphSignature = Object.entries(geometry.morphAttributes)
    .sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
    .map(([name, morphAttributes]) => {
      return `${name}[${(morphAttributes ?? [])
        .map(getStage6EAttributeMergeSignature)
        .join(",")}]`;
    })
    .join("|");

  return [
    "index:none",
    `attributes:${attributeSignature}`,
    `morphRelative:${geometry.morphTargetsRelative ? "true" : "false"}`,
    `morph:${morphSignature}`
  ].join(";");
}

function getStage6EAttributeMergeSignature(
  attribute: BufferGeometry["attributes"][string]
) {
  const arrayType =
    "array" in attribute && attribute.array
      ? attribute.array.constructor.name
      : "interleaved";
  const gpuType = "gpuType" in attribute ? attribute.gpuType : "none";

  return [
    arrayType,
    `size:${attribute.itemSize}`,
    `normalized:${attribute.normalized ? "true" : "false"}`,
    `gpu:${gpuType}`
  ].join("/");
}

function isRenderableMesh(object: Object3D): object is Mesh {
  return Boolean(
    (object as Mesh).isMesh &&
      (object as Mesh).geometry &&
      (object as Mesh).material
  );
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
  const headlightGlowRef = useRef<InstancedMesh>(null);
  const taillightGlowRef = useRef<InstancedMesh>(null);
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
        scale: [vehicle.size[0] * 0.56, vehicle.size[2] * 0.2, 1]
      });
      setVehiclePartMatrix({
        mesh: rearGlassRef.current,
        tempObject,
        vehicle,
        index,
        localOffset: [0, vehicle.size[1] * 0.63, vehicle.size[2] * 0.26],
        localRotation: [-Math.PI / 2, 0, 0],
        scale: [vehicle.size[0] * 0.5, vehicle.size[2] * 0.18, 1]
      });
      setVehiclePartMatrix({
        mesh: roofHighlightRef.current,
        tempObject,
        vehicle,
        index,
        localOffset: [0, vehicle.size[1] * 0.7, -vehicle.size[2] * 0.02],
        localRotation: [-Math.PI / 2, 0, 0],
        scale: [vehicle.size[0] * 0.68, vehicle.size[2] * 0.68, 1]
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
        scale: [vehicle.size[0] * 0.24, vehicle.size[1] * 0.13, vehicle.size[2] * 0.08]
      });
    });
    tailOffsets.forEach(({ vehicle, localOffset }, index) => {
      setVehiclePartMatrix({
        mesh: taillightRef.current,
        tempObject,
        vehicle,
        index,
        localOffset,
        scale: [vehicle.size[0] * 0.22, vehicle.size[1] * 0.12, vehicle.size[2] * 0.075]
      });
    });

    vehicles.forEach((vehicle, index) => {
      setVehiclePartMatrix({
        mesh: headlightGlowRef.current,
        tempObject,
        vehicle,
        index,
        localOffset: [0, -vehicle.size[1] * 0.46, -vehicle.size[2] * 0.72],
        localRotation: [-Math.PI / 2, 0, 0],
        scale: [vehicle.size[0] * 0.92, vehicle.size[2] * 0.62, 1]
      });
      setVehiclePartMatrix({
        mesh: taillightGlowRef.current,
        tempObject,
        vehicle,
        index,
        localOffset: [0, -vehicle.size[1] * 0.46, vehicle.size[2] * 0.62],
        localRotation: [-Math.PI / 2, 0, 0],
        scale: [vehicle.size[0] * 0.84, vehicle.size[2] * 0.42, 1]
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
      taillightRef.current,
      headlightGlowRef.current,
      taillightGlowRef.current
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
        castsRealShadows: castRealShadows
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
          opacity={0.44}
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
          roughness={0.28}
          metalness={0.28}
          clearcoat={0.48}
          clearcoatRoughness={0.24}
          envMapIntensity={0.98}
          emissive="#1d2a30"
          emissiveIntensity={0.12}
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
          color="#7fb2c3"
          roughness={0.16}
          metalness={0.04}
          transmission={0.12}
          thickness={0.08}
          envMapIntensity={1.18}
          emissive="#17313c"
          emissiveIntensity={0.26}
          transparent
          opacity={0.82}
        />
      </instancedMesh>
      <instancedMesh
        ref={roofHighlightRef}
        args={[undefined, undefined, vehicles.length]}
      >
        <Stage5VehiclePartGeometry partName="roofHighlight" />
        <meshBasicMaterial
          color="#f7fbff"
          transparent
          opacity={0.16}
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
          color="#376175"
          emissive="#183542"
          emissiveIntensity={0.34}
          roughness={0.12}
          metalness={0.05}
          transmission={0.16}
          thickness={0.05}
          envMapIntensity={1.24}
          transparent
          opacity={0.78}
          side={DoubleSide}
        />
      </instancedMesh>
      <instancedMesh
        ref={rearGlassRef}
        args={[undefined, undefined, vehicles.length]}
      >
        <Stage5VehiclePartGeometry partName="rearGlass" />
        <meshPhysicalMaterial
          color="#2d5264"
          emissive="#142c37"
          emissiveIntensity={0.3}
          roughness={0.14}
          metalness={0.04}
          transmission={0.14}
          thickness={0.05}
          envMapIntensity={1.16}
          transparent
          opacity={0.74}
          side={DoubleSide}
        />
      </instancedMesh>
      <instancedMesh
        ref={sideGlassRef}
        args={[undefined, undefined, vehicles.length * 2]}
      >
        <Stage5VehiclePartGeometry partName="sideGlass" />
        <meshPhysicalMaterial
          color="#244a5b"
          emissive="#102831"
          emissiveIntensity={0.24}
          roughness={0.16}
          transmission={0.14}
          thickness={0.04}
          envMapIntensity={1.12}
          transparent
          opacity={0.68}
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
          color="#fff3c4"
          emissive="#fff0b0"
          emissiveIntensity={2.15}
          roughness={0.2}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={taillightRef}
        args={[undefined, undefined, vehicles.length * 2]}
      >
        <Stage5VehiclePartGeometry partName="taillight" />
        <meshStandardMaterial
          color="#ff5c55"
          emissive="#ff2f2f"
          emissiveIntensity={1.8}
          roughness={0.28}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={headlightGlowRef}
        args={[undefined, undefined, vehicles.length]}
      >
        <Stage5VehiclePartGeometry partName="headlightGlow" />
        <meshBasicMaterial
          color="#d5f2ff"
          transparent
          opacity={0.62}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={taillightGlowRef}
        args={[undefined, undefined, vehicles.length]}
      >
        <Stage5VehiclePartGeometry partName="taillightGlow" />
        <meshBasicMaterial
          color="#ff8a72"
          transparent
          opacity={0.58}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
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

function buildPreciseVehicles(
  vehicles: SimulationVehicleSnapshot[]
): TrafficDensityPreciseVehicle[] {
  return vehicles.map((vehicle) => {
    const size = getPreciseVehicleSize(vehicle);

    return {
      id: vehicle.id,
      sourceLabel: "snapshot",
      vehicleType: vehicle.vehicle_type,
      position: [
        vehicle.x_meters,
        size[1] / 2 + 0.04,
        vehicle.y_meters
      ],
      rotationY: degreesToRadians(vehicle.heading_degrees),
      size,
      color: getPreciseVehicleColor(vehicle),
      emergency: vehicle.emergency
    };
  });
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
          : "#94d4e7",
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

function getPreciseVehicleColor(vehicle: SimulationVehicleSnapshot) {
  if (vehicle.emergency || vehicle.vehicle_type === "emergency") return "#ef4444";
  if (vehicle.vehicle_type === "bus") return "#38bdf8";
  if (vehicle.vehicle_type === "truck") return "#94a3b8";
  if (vehicle.vehicle_type === "taxi") return "#facc15";
  return "#dbeafe";
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function canUseRuntimeDensityAssets() {
  return (
    typeof window !== "undefined" &&
    !/jsdom/i.test(window.navigator.userAgent)
  );
}
