"use client";

import { MeshReflectorMaterial } from "@react-three/drei";

import type { Stage6QualityPreset } from "./stage6Quality";
import { getStage6QualityPreset } from "./stage6Quality";
import {
  INTERSECTION_BOX_METERS,
  ROAD_WIDTH_METERS,
  type Vector3Tuple
} from "./roadGeometry";

export type WetRoadReflectionZoneKind =
  | "intersection-center"
  | "stop-bar"
  | "crosswalk-adjacent";

export type WetRoadReflectionMode =
  | "fake-sheen"
  | "planar-lite"
  | "planar"
  | "planar-high";

export type WetRoadReflectionZone = {
  id: string;
  kind: WetRoadReflectionZoneKind;
  position: Vector3Tuple;
  size: [number, number];
  rotationY: number;
  enabled: boolean;
};

export type WetRoadReflectionPlan = {
  reflectionMode: WetRoadReflectionMode;
  zones: WetRoadReflectionZone[];
  resolution: number;
  blur: [number, number];
  mixStrength: number;
};

const REFLECTOR_HEIGHT = 0.052;
const HALF_INTERSECTION = INTERSECTION_BOX_METERS / 2;
const CROSSWALK_OFFSET = HALF_INTERSECTION + 3.2;

const WET_ROAD_REFLECTION_ZONES = [
  {
    id: "intersection-center-puddle-reflector",
    kind: "intersection-center",
    position: [0, REFLECTOR_HEIGHT, 0],
    size: [INTERSECTION_BOX_METERS * 0.64, INTERSECTION_BOX_METERS * 0.64],
    rotationY: 0
  },
  {
    id: "north-stop-bar-reflector",
    kind: "stop-bar",
    position: [0, REFLECTOR_HEIGHT + 0.001, -HALF_INTERSECTION],
    size: [ROAD_WIDTH_METERS + 1.6, 2.8],
    rotationY: 0
  },
  {
    id: "south-stop-bar-reflector",
    kind: "stop-bar",
    position: [0, REFLECTOR_HEIGHT + 0.001, HALF_INTERSECTION],
    size: [ROAD_WIDTH_METERS + 1.6, 2.8],
    rotationY: 0
  },
  {
    id: "east-stop-bar-reflector",
    kind: "stop-bar",
    position: [HALF_INTERSECTION, REFLECTOR_HEIGHT + 0.001, 0],
    size: [2.8, ROAD_WIDTH_METERS + 1.6],
    rotationY: 0
  },
  {
    id: "west-stop-bar-reflector",
    kind: "stop-bar",
    position: [-HALF_INTERSECTION, REFLECTOR_HEIGHT + 0.001, 0],
    size: [2.8, ROAD_WIDTH_METERS + 1.6],
    rotationY: 0
  },
  {
    id: "north-crosswalk-adjacent-reflector",
    kind: "crosswalk-adjacent",
    position: [0, REFLECTOR_HEIGHT + 0.002, -CROSSWALK_OFFSET],
    size: [ROAD_WIDTH_METERS + 3.2, 4.2],
    rotationY: 0
  },
  {
    id: "south-crosswalk-adjacent-reflector",
    kind: "crosswalk-adjacent",
    position: [0, REFLECTOR_HEIGHT + 0.002, CROSSWALK_OFFSET],
    size: [ROAD_WIDTH_METERS + 3.2, 4.2],
    rotationY: 0
  },
  {
    id: "east-crosswalk-adjacent-reflector",
    kind: "crosswalk-adjacent",
    position: [CROSSWALK_OFFSET, REFLECTOR_HEIGHT + 0.002, 0],
    size: [4.2, ROAD_WIDTH_METERS + 3.2],
    rotationY: 0
  },
  {
    id: "west-crosswalk-adjacent-reflector",
    kind: "crosswalk-adjacent",
    position: [-CROSSWALK_OFFSET, REFLECTOR_HEIGHT + 0.002, 0],
    size: [4.2, ROAD_WIDTH_METERS + 3.2],
    rotationY: 0
  }
] as const satisfies readonly Omit<WetRoadReflectionZone, "enabled">[];

export function buildWetRoadReflectionPlan(
  qualityPreset: Stage6QualityPreset
): WetRoadReflectionPlan {
  const reflectionMode = qualityPreset.reflections;
  const enabledZoneIds = getEnabledWetRoadReflectionZoneIds(reflectionMode);

  if (reflectionMode === "fake") {
    return {
      reflectionMode: "fake-sheen",
      zones: WET_ROAD_REFLECTION_ZONES.map((zone) => ({
        ...zone,
        position: [...zone.position],
        size: [...zone.size],
        enabled: false
      })),
      resolution: 0,
      blur: [0, 0],
      mixStrength: 0
    };
  }

  const planarMode =
    reflectionMode === "planar-high" ? "planar-high" : reflectionMode;

  return {
    reflectionMode: planarMode,
    zones: WET_ROAD_REFLECTION_ZONES.map((zone) => ({
      ...zone,
      position: [...zone.position],
      size: [...zone.size],
      enabled: enabledZoneIds.has(zone.id)
    })),
    resolution: reflectionMode === "planar-high" ? 768 : 384,
    blur: reflectionMode === "planar-lite" ? [280, 70] : [420, 110],
    mixStrength: reflectionMode === "planar-high" ? 0.72 : 0.54
  };
}

function getEnabledWetRoadReflectionZoneIds(
  reflectionMode: Stage6QualityPreset["reflections"]
) {
  if (reflectionMode === "fake") {
    return new Set<string>();
  }
  if (reflectionMode === "planar-high") {
    return new Set(
      WET_ROAD_REFLECTION_ZONES.filter(
        (zone) => zone.kind === "intersection-center" || zone.kind === "stop-bar"
      ).map((zone) => zone.id)
    );
  }

  return new Set(["intersection-center-puddle-reflector"]);
}

export function WetRoadReflectors({
  qualityPreset = getStage6QualityPreset("low")
}: {
  qualityPreset?: Stage6QualityPreset;
}) {
  const plan = buildWetRoadReflectionPlan(qualityPreset);
  const activeZones = plan.zones.filter((zone) => zone.enabled);

  return (
    <group
      name="stage6-wet-road-reflectors"
      userData={{
        qualityPreset: qualityPreset.name,
        reflectionMode: plan.reflectionMode,
        fallback: plan.reflectionMode === "fake-sheen" ? "wet-sheen-overlays" : null,
        zoneCount: activeZones.length
      }}
    >
      {activeZones.map((zone) => (
        <mesh
          key={zone.id}
          name={zone.id}
          position={zone.position}
          rotation={[-Math.PI / 2, zone.rotationY, 0]}
          renderOrder={5}
        >
          <planeGeometry args={zone.size} />
          <MeshReflectorMaterial
            color="#1f2a2d"
            metalness={0.08}
            roughness={0.18}
            resolution={plan.resolution}
            blur={plan.blur}
            mixBlur={0.72}
            mixStrength={plan.mixStrength}
            depthScale={0.08}
            minDepthThreshold={0.62}
            maxDepthThreshold={1.18}
            mirror={0.1}
            transparent
            opacity={zone.kind === "intersection-center" ? 0.58 : 0.42}
          />
        </mesh>
      ))}
    </group>
  );
}
