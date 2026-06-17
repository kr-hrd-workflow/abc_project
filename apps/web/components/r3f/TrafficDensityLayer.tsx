"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Object3D,
  Shape,
  type InstancedMesh
} from "three";

import type { Direction } from "../../lib/types";
import type {
  SimulationDensitySegment,
  SimulationDensitySegmentSource,
  SimulationVehicleSnapshot
} from "../../lib/simulationSnapshot";
import type { SceneSnapshot, SceneTrafficDensityMode } from "./buildSceneSnapshot";
import {
  CORRIDOR_LENGTH_METERS,
  INBOUND_LANE_COUNT,
  INTERSECTION_BOX_METERS,
  LANE_WIDTH_METERS
} from "./roadGeometry";
import type { Vector3Tuple } from "./roadGeometry";

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

export function TrafficDensityLayer({
  sceneSnapshot
}: {
  sceneSnapshot: SceneSnapshot;
}) {
  const plan = buildTrafficDensityRenderPlan(sceneSnapshot);
  const renderableVehicles: Stage5TrafficVehicleInstance[] = [
    ...plan.farVehicles.map((vehicle) => ({
      id: vehicle.id,
      position: vehicle.position,
      rotationY: vehicle.rotationY,
      size: vehicle.size,
      color: vehicle.color,
      emergency: false,
      profileName: getProfileNameFromSize(vehicle.size)
    })),
    ...plan.preciseVehicles.map((vehicle) => ({
      id: vehicle.id,
      position: vehicle.position,
      rotationY: vehicle.rotationY,
      size: vehicle.size,
      color: vehicle.color,
      emergency: vehicle.emergency,
      profileName: getPreciseVehicleProfileName(vehicle.vehicleType)
    }))
  ];

  return (
    <group
      name={`stage5-traffic-density-${plan.mode}`}
      userData={{ visibleVehicleCount: renderableVehicles.length }}
    >
      <Stage5TrafficVehicleInstances vehicles={renderableVehicles} />
    </group>
  );
}

function Stage5TrafficVehicleInstances({
  vehicles
}: {
  vehicles: Stage5TrafficVehicleInstance[];
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
    <group name="stage5-instanced-traffic-vehicles">
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
        castShadow
        receiveShadow
      >
        <Stage5VehiclePartGeometry partName="body" />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.36}
          metalness={0.22}
          emissive="#1d2a30"
          emissiveIntensity={0.16}
          vertexColors
        />
      </instancedMesh>
      <instancedMesh
        ref={cabinRef}
        args={[undefined, undefined, vehicles.length]}
        castShadow
        receiveShadow
      >
        <Stage5VehiclePartGeometry partName="cabin" />
        <meshStandardMaterial
          color="#7fb2c3"
          roughness={0.2}
          metalness={0.04}
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
        <meshStandardMaterial
          color="#376175"
          emissive="#183542"
          emissiveIntensity={0.34}
          roughness={0.18}
          metalness={0.05}
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
        <meshStandardMaterial
          color="#2d5264"
          emissive="#142c37"
          emissiveIntensity={0.3}
          roughness={0.2}
          metalness={0.04}
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
        <meshStandardMaterial
          color="#244a5b"
          emissive="#102831"
          emissiveIntensity={0.24}
          roughness={0.22}
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
        castShadow
        receiveShadow
      >
        <Stage5VehiclePartGeometry partName="wheelArch" />
        <meshStandardMaterial color="#050607" roughness={0.8} metalness={0.03} />
      </instancedMesh>
      <instancedMesh
        ref={wheelRef}
        args={[undefined, undefined, vehicles.length * 4]}
        castShadow
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
