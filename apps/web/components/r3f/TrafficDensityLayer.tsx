"use client";

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
const FAR_VEHICLE_SIZE: Vector3Tuple = [2.05, 0.86, 4.35];
const STOP_LINE_OFFSET_METERS = INTERSECTION_BOX_METERS / 2;

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

  return (
    <group name={`stage3-traffic-density-${plan.mode}`}>
      {plan.farVehicles.map((vehicle) => (
        <mesh
          key={vehicle.id}
          name={`${vehicle.id}-${vehicle.sourceLabel}`}
          position={vehicle.position}
          rotation={[0, vehicle.rotationY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={vehicle.size} />
          <meshStandardMaterial
            color={vehicle.color}
            roughness={0.72}
            metalness={0.08}
            transparent
            opacity={vehicle.opacity}
          />
        </mesh>
      ))}
      {plan.preciseVehicles.map((vehicle) => (
        <mesh
          key={vehicle.id}
          name={`${vehicle.id}-${vehicle.sourceLabel}`}
          position={vehicle.position}
          rotation={[0, vehicle.rotationY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={vehicle.size} />
          <meshStandardMaterial
            color={vehicle.color}
            roughness={0.6}
            metalness={0.14}
            emissive={vehicle.emergency ? "#5f1515" : "#000000"}
            emissiveIntensity={vehicle.emergency ? 0.22 : 0}
          />
        </mesh>
      ))}
    </group>
  );
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
    const visibleCount = Math.min(14, Math.ceil(queueCount / 3));

    return Array.from({ length: visibleCount }, (_, index) => {
      const transform = getApproachTransform({
        direction,
        distanceFromStopLine: 22 + index * 7.25,
        laneIndex: index % INBOUND_LANE_COUNT,
        laneCount: INBOUND_LANE_COUNT,
        height: FAR_VEHICLE_SIZE[1]
      });

      return {
        id: `fixture-${direction}-queue-${index}`,
        direction,
        sourceLabel: "fixture",
        position: transform.position,
        rotationY: transform.rotationY,
        size: FAR_VEHICLE_SIZE,
        color: "#7dd3fc",
        opacity: 0.74
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
    const distanceFromStopLine =
      span > 0 ? start + ((index + 0.5) * span) / visibleCount : start;
    const transform = getApproachTransform({
      direction: segment.approach,
      distanceFromStopLine,
      laneIndex: index % laneCount,
      laneCount,
      height: FAR_VEHICLE_SIZE[1]
    });

    return {
      id: `${segment.segment_id}-density-${index}`,
      direction: segment.approach,
      sourceLabel: segment.source,
      position: transform.position,
      rotationY: transform.rotationY,
      size: FAR_VEHICLE_SIZE,
      color:
        segment.source === "aggregate_density_proxy" ? "#facc15" : "#7dd3fc",
      opacity: segment.source === "aggregate_density_proxy" ? 0.68 : 0.72
    };
  });
}

function getApproachTransform({
  direction,
  distanceFromStopLine,
  laneIndex,
  laneCount,
  height
}: {
  direction: Direction;
  distanceFromStopLine: number;
  laneIndex: number;
  laneCount: number;
  height: number;
}) {
  const laneOffset = getLaneOffset(laneIndex, laneCount);
  const y = height / 2 + 0.045;
  const distance = STOP_LINE_OFFSET_METERS + distanceFromStopLine;

  if (direction === "north") {
    return {
      position: [laneOffset, y, -distance] as Vector3Tuple,
      rotationY: 0
    };
  }
  if (direction === "south") {
    return {
      position: [laneOffset, y, distance] as Vector3Tuple,
      rotationY: Math.PI
    };
  }
  if (direction === "east") {
    return {
      position: [distance, y, laneOffset] as Vector3Tuple,
      rotationY: Math.PI / 2
    };
  }

  return {
    position: [-distance, y, laneOffset] as Vector3Tuple,
    rotationY: -Math.PI / 2
  };
}

function getLaneOffset(laneIndex: number, laneCount: number) {
  const centeredIndex = laneIndex - (laneCount - 1) / 2;
  return centeredIndex * LANE_WIDTH_METERS;
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
