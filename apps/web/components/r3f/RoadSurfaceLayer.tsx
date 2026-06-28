"use client";

import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import {
  BufferGeometry,
  PlaneGeometry,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
  type Texture
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { Direction } from "../../lib/types";
import {
  APPROACH_CORRIDORS,
  type ApproachCorridorSpec,
  CROSSWALK_STRIPES,
  INTERSECTION_BOX_X_METERS,
  INTERSECTION_BOX_Z_METERS,
  LANE_ARROW_DECALS,
  type LaneArrowKind,
  LANE_DIVIDER_MARKINGS,
  MEDIAN_BUS_LANE_MARKINGS,
  type PlanePrimitiveSpec
} from "./roadGeometry";

// RoadSurfaceLayer — photoreal production road rendered from the geometry model.
//
// Covers the junction box + all four approach corridors in dark textured asphalt
// (meshStandardMaterial with asphalt.webp, roughness 0.95) plus the full marking
// set with worn-paint muted colours:
//   • Muted brick/terracotta median bus lane  (MEDIAN_BUS_LANE_MARKINGS)
//   • Off-white lane dividers  (LANE_DIVIDER_MARKINGS)
//   • Zebra crosswalks         (CROSSWALK_STRIPES)
//   • Turn arrows              (TURN_ARROW_MARKINGS)
//
// Heights are staggered to prevent z-fighting:
//   road surface  → y ≈ 0.002
//   bus lane      → y + 0.012
//   lane dividers → y + 0.014
//   crosswalks    → y + 0.016
//   turn arrows   → y + 0.020
//
// Texture tiling: asphalt.webp is tiled at 1 repeat per ~9 m so the grain
// appears world-consistent. Each distinct plane clones the base texture so
// tiling is never stretched along either axis.
//
// This component uses React hooks (useTexture, useMemo). Mount via <Suspense>
// in SimulationScene so a missing texture degrades gracefully.
//
// Props:
//   isNight — switches asphalt tint and marking colours to the night palette.

const ASPHALT_PATH = "/simulation/r3f/assets/textures/asphalt.webp";
const TILE_SCALE_M = 9; // metres per texture repeat

// Muted bus lane colours — local override so the road reads photoreal without
// touching the exported MEDIAN_BUS_LANE_COLOR (used by other code / tests).
const BUS_DAY = "#8f4034";
const BUS_NIGHT = "#5e2c25";

// Shoulder widen (perpendicular to travel, total across both sides) so the
// rendered textured asphalt reaches the plate's curb line and no flat
// plate-asphalt shows through between the road and the sidewalk. Markings stay
// at their exact geometry positions — only the surface grows, so the extra
// width reads as realistic unmarked shoulder asphalt. Per-corridor because the
// avenue widths are asymmetric (강남대로/테헤란로 = 36 m, 서초대로 = 28.8 m) and the
// plate frames each arm slightly differently.
const CORRIDOR_WIDEN_M: Record<Direction, number> = {
  north: 22,
  south: 22,
  east: 18,
  west: 22
};

// Junction box widen (total, per axis). Kept smaller than the arm widen so the
// box seals each arm junction without paving the diagonal sidewalk/plaza
// corners (those are pedestrian space in the plate, never carriageway).
const BOX_WIDEN_X_M = 8;
const BOX_WIDEN_Z_M = 8;

// Preload the asphalt texture in browser environments so it is warm on first
// paint and does not cause a black-frame flicker in the capture harness.
if (
  typeof window !== "undefined" &&
  !/jsdom/i.test(window.navigator?.userAgent ?? "")
) {
  useTexture.preload(ASPHALT_PATH);
}

function tileTexture(base: Texture, w: number, h: number): Texture {
  const tex = base.clone();
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(w / TILE_SCALE_M, h / TILE_SCALE_M);
  tex.needsUpdate = true;
  return tex;
}

// Merge a set of flat ground-plane markings (lane dividers / crosswalk stripes /
// bus lanes) into a single BufferGeometry so the whole high-camera frame renders
// in ONE draw call per marking type instead of one per stripe (297 dividers +
// 44 crosswalk stripes were previously 1 mesh each → blew the draw-call budget
// once the steep wide camera stopped frustum-culling the far approaches).
function mergeFlatMarkings(
  specs: PlanePrimitiveSpec[],
  yLift: number
): BufferGeometry | null {
  if (specs.length === 0) return null;
  const geometries = specs.map((spec) => {
    const geo = new PlaneGeometry(spec.size[0], spec.size[1]);
    geo.rotateX(-Math.PI / 2); // lay flat (normal → +Y)
    if (spec.rotationY) geo.rotateY(spec.rotationY);
    geo.translate(spec.position[0], spec.position[1] + yLift, spec.position[2]);
    return geo;
  });
  return geometries.length === 1
    ? geometries[0]
    : mergeGeometries(geometries, false);
}

// Realistic Korean lane-arrow outlines in a local 2-D frame (x = right,
// y = forward). The polygon is filled by ShapeGeometry — proper straight,
// left-turn (bent), and right-turn shapes rather than the old flat chevron.
const ARROW_SHAFT_HALF = 0.45;
function arrowOutline(kind: LaneArrowKind): [number, number][] {
  if (kind === "straight") {
    const length = 6.0;
    const headLength = 2.2;
    const headHalf = 1.25;
    const baseY = length - headLength;
    return [
      [-ARROW_SHAFT_HALF, 0],
      [ARROW_SHAFT_HALF, 0],
      [ARROW_SHAFT_HALF, baseY],
      [headHalf, baseY],
      [0, length],
      [-headHalf, baseY],
      [-ARROW_SHAFT_HALF, baseY]
    ];
  }

  // Left turn: vertical shaft, bend to a leftward (−x) arm + triangular head.
  const armY = 3.6;
  const armX = 2.0;
  const apexX = 3.4;
  const headHalf = 1.1;
  const left: [number, number][] = [
    [ARROW_SHAFT_HALF, 0],
    [ARROW_SHAFT_HALF, armY + ARROW_SHAFT_HALF],
    [-armX, armY + ARROW_SHAFT_HALF],
    [-armX, armY + headHalf],
    [-apexX, armY],
    [-armX, armY - headHalf],
    [-armX, armY - ARROW_SHAFT_HALF],
    [-ARROW_SHAFT_HALF, armY - ARROW_SHAFT_HALF],
    [-ARROW_SHAFT_HALF, 0]
  ];
  if (kind === "left") return left;
  return left.map(([x, y]) => [-x, y]); // right = mirror across the shaft
}

function buildArrowGeometry(
  kind: LaneArrowKind,
  position: readonly [number, number, number],
  rotationY: number
): BufferGeometry {
  const shape = new Shape();
  const points = arrowOutline(kind);
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();

  const geo = new ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2); // lay flat; local +y → world −z
  geo.rotateY(rotationY);
  geo.translate(position[0], position[1], position[2]);
  return geo;
}

function mergeLaneArrows(): BufferGeometry | null {
  const geometries = LANE_ARROW_DECALS.map((decal) =>
    buildArrowGeometry(decal.kind, decal.position, decal.rotationY)
  );
  if (geometries.length === 0) return null;
  return geometries.length === 1
    ? geometries[0]
    : mergeGeometries(geometries, false);
}

// Widen the asphalt surface perpendicular to travel (width axis only) so it
// reaches the plate curb line. Length axis (travel direction) is unchanged.
function widenedCorridorSize(corridor: ApproachCorridorSpec): [number, number] {
  const widen = CORRIDOR_WIDEN_M[corridor.direction];
  return corridor.orientation === "north_south"
    ? [corridor.size[0] + widen, corridor.size[1]]
    : [corridor.size[0], corridor.size[1] + widen];
}

const BOX_SURFACE_X = INTERSECTION_BOX_X_METERS + BOX_WIDEN_X_M;
const BOX_SURFACE_Z = INTERSECTION_BOX_Z_METERS + BOX_WIDEN_Z_M;

export type RoadSurfaceLayerProps = {
  isNight: boolean;
};

export function RoadSurfaceLayer({ isNight }: RoadSurfaceLayerProps) {
  const asphaltBase = useTexture(ASPHALT_PATH) as Texture;

  // Clone one texture per plane so each gets its own UV repeat (world-consistent
  // tiling against the widened surface sizes).
  const junctionTex = useMemo(
    () => tileTexture(asphaltBase, BOX_SURFACE_X, BOX_SURFACE_Z),
    [asphaltBase]
  );
  const corridorTextures = useMemo(
    () =>
      APPROACH_CORRIDORS.map((c) => {
        const [w, h] = widenedCorridorSize(c);
        return tileTexture(asphaltBase, w, h);
      }),
    [asphaltBase]
  );

  // Markings merged into one geometry per type (perf: ~350 stripe meshes → 4).
  const busGeometry = useMemo(
    () => mergeFlatMarkings(MEDIAN_BUS_LANE_MARKINGS, 0.012),
    []
  );
  const dividerGeometry = useMemo(
    () => mergeFlatMarkings(LANE_DIVIDER_MARKINGS, 0.014),
    []
  );
  const crosswalkGeometry = useMemo(
    () => mergeFlatMarkings(CROSSWALK_STRIPES, 0.016),
    []
  );
  const arrowGeometry = useMemo(() => mergeLaneArrows(), []);

  // Asphalt tint: white in day (texture reads true colour ~#3a3a3e),
  // slightly blue-dark tint at night so the grain stays visible.
  const asphaltColor = isNight ? "#5a5a64" : "#ffffff";
  const busLaneColor = isNight ? BUS_NIGHT : BUS_DAY;

  // Worn-paint marking colours — off-white, not stark.
  const laneColor = isNight ? "#a9a394" : "#d7d5cc";
  const crosswalkColor = isNight ? "#b4af9f" : "#e3e1d8";
  const arrowColor = isNight ? "#a9a394" : "#d7d5cc";

  return (
    <group name="road-surface-layer">
      {/* Junction box — centre of the intersection (widened to seal arms) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[BOX_SURFACE_X, BOX_SURFACE_Z]} />
        <meshStandardMaterial
          map={junctionTex}
          color={asphaltColor}
          roughness={0.95}
          metalness={0}
        />
      </mesh>

      {/* Approach corridor road surfaces (widened to the plate curb line) */}
      {APPROACH_CORRIDORS.map((corridor, idx) => (
        <mesh
          key={`road-corridor-${corridor.direction}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[corridor.position[0], 0.002, corridor.position[2]]}
        >
          <planeGeometry args={widenedCorridorSize(corridor)} />
          <meshStandardMaterial
            map={corridorTextures[idx]}
            color={asphaltColor}
            roughness={0.95}
            metalness={0}
          />
        </mesh>
      ))}

      {/* Muted brick/terracotta median bus lane (강남대로 N/S only) — merged */}
      {busGeometry && (
        <mesh geometry={busGeometry}>
          <meshBasicMaterial color={busLaneColor} />
        </mesh>
      )}

      {/* Off-white lane dividers (merged) — slight transparency reveals grain */}
      {dividerGeometry && (
        <mesh geometry={dividerGeometry}>
          <meshBasicMaterial color={laneColor} transparent opacity={0.9} />
        </mesh>
      )}

      {/* Zebra crosswalk stripes — all four approaches (merged) */}
      {crosswalkGeometry && (
        <mesh geometry={crosswalkGeometry}>
          <meshBasicMaterial color={crosswalkColor} transparent opacity={0.9} />
        </mesh>
      )}

      {/* Realistic per-lane turn arrows (좌회전 / 직진 / 우회전), merged */}
      {arrowGeometry && (
        <mesh geometry={arrowGeometry}>
          <meshBasicMaterial color={arrowColor} />
        </mesh>
      )}
    </group>
  );
}

RoadSurfaceLayer.displayName = "RoadSurfaceLayer";
