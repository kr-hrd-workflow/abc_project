"use client";

import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import {
  BufferGeometry,
  CanvasTexture,
  LinearFilter,
  PlaneGeometry,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  type Texture
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { Direction } from "../../lib/types";
import {
  APPROACH_CORRIDORS,
  type ApproachCorridorSpec,
  BUS_LANE_BORDER_MARKINGS,
  BUS_LANE_LEGENDS,
  CENTER_LINE_MARKINGS,
  CROSSWALK_STRIPES,
  EDGE_LINE_MARKINGS,
  INTERSECTION_BOX_X_METERS,
  INTERSECTION_BOX_Z_METERS,
  LANE_ARROW_DECALS,
  type LaneArrowKind,
  LANE_DIVIDER_MARKINGS,
  LANE_DIVIDER_MARKING_WIDTH,
  LANE_DIVIDER_SEGMENT_GAP,
  LANE_DIVIDER_SEGMENT_LENGTH,
  LANE_RESTRICT_MARKINGS,
  LANE_WIDTH_METERS,
  MARKING_HEIGHT,
  type PlanePrimitiveSpec,
  STOP_LINE_MARKINGS,
  type Vector3Tuple
} from "./roadGeometry";
import {
  getApproachHasMedianBus,
  getApproachRoadWidthMeters
} from "./intersectionTruth";

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

// ── cmp=A (?photoreal=1&cmp=A) markings registration ───────────────────────────
// dx8.5 revert: the markings overlay renders at its NORMAL metric positions and a
// single GLOBAL +X group translate in SimulationScene (default 8.5 m, ?cmpAdx=)
// registers the markings + vehicles onto the plain plate TOGETHER. The former
// per-corridor lateral offset is removed; the far-end extension + west rotation are
// set to 0 (scaffolding retained but neutral), so the painted lane structure is
// back to normal corridor length with no west skew.

// Far-end (away-from-junction) marking extension per arm, metres. Disabled (all 0)
// for the dx8.5 revert: markings render at their normal metric corridor length and
// the cmp=A group translate registers them onto the plate (no far-extension).
const CMP_A_FAR_EXTEND_M: Record<Direction, number> = {
  north: 0,
  south: 0,
  east: 0,
  west: 0
};

// Outward (away-from-junction) sign along each corridor's travel axis.
function corridorOutwardSign(direction: Direction): 1 | -1 {
  return direction === "north" || direction === "west" ? -1 : 1;
}

// Lengthen a full-corridor longitudinal solid line (중앙선 / 길가장자리 / bus
// border) at the far end only: grow the length and slide the centre outward so
// the near (junction) end stays put.
function extendSolidLongitudinal(spec: PlanePrimitiveSpec): PlanePrimitiveSpec {
  const extend = CMP_A_FAR_EXTEND_M[spec.direction];
  if (!extend) return spec;
  const isNS = spec.direction === "north" || spec.direction === "south";
  const out = corridorOutwardSign(spec.direction);
  const [x, y, z] = spec.position;
  const [w, h] = spec.size;
  const size: [number, number] = isNS ? [w, h + extend] : [w + extend, h];
  const position: Vector3Tuple = isNS
    ? [x, y, z + (out * extend) / 2]
    : [x + (out * extend) / 2, y, z];
  return { ...spec, size, position };
}

// Far-end dashed-divider continuation so the lane lines do not stop short of the
// extended solids. Mirrors roadGeometry's LANE_DIVIDER_MARKINGS lane-offset +
// pitch (constants imported from roadGeometry to stay in sync).
function buildCmpADividerExtensionDashes(): PlanePrimitiveSpec[] {
  const pitch = LANE_DIVIDER_SEGMENT_LENGTH + LANE_DIVIDER_SEGMENT_GAP;
  const dashLength = LANE_DIVIDER_SEGMENT_LENGTH * 0.92;
  const dashes: PlanePrimitiveSpec[] = [];

  for (const corridor of APPROACH_CORRIDORS) {
    const extend = CMP_A_FAR_EXTEND_M[corridor.direction];
    if (!extend) continue;
    const laneCount = corridor.inboundLanes + corridor.outboundLanes;
    const widthM = getApproachRoadWidthMeters(corridor.direction);
    const hasBus = getApproachHasMedianBus(corridor.direction);
    const isNS = corridor.orientation === "north_south";
    const out = corridorOutwardSign(corridor.direction);
    const along0 = isNS ? corridor.position[2] : corridor.position[0];
    const farEnd = along0 + out * (corridor.lengthMeters / 2);
    const count = Math.ceil(extend / pitch);

    for (let laneIndex = 1; laneIndex < laneCount; laneIndex += 1) {
      const laneOffset = -widthM / 2 + laneIndex * LANE_WIDTH_METERS;
      if (Math.abs(laneOffset) < 0.05) continue;
      if (hasBus && Math.abs(Math.abs(laneOffset) - LANE_WIDTH_METERS) < 0.05) {
        continue;
      }
      for (let k = 0; k < count; k += 1) {
        const along = farEnd + out * pitch * (k + 0.5);
        dashes.push(
          isNS
            ? {
                id: `${corridor.direction}-divider-ext-${laneIndex}-${k}`,
                direction: corridor.direction,
                position: [laneOffset, MARKING_HEIGHT, along],
                size: [LANE_DIVIDER_MARKING_WIDTH, dashLength]
              }
            : {
                id: `${corridor.direction}-divider-ext-${laneIndex}-${k}`,
                direction: corridor.direction,
                position: [along, MARKING_HEIGHT, laneOffset],
                size: [dashLength, LANE_DIVIDER_MARKING_WIDTH]
              }
        );
      }
    }
  }

  return dashes;
}

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

function mergeLaneArrows(
  decals: typeof LANE_ARROW_DECALS = LANE_ARROW_DECALS
): BufferGeometry | null {
  const geometries = decals.map((decal) =>
    buildArrowGeometry(decal.kind, decal.position, decal.rotationY)
  );
  if (geometries.length === 0) return null;
  return geometries.length === 1
    ? geometries[0]
    : mergeGeometries(geometries, false);
}

// Merge the "버스" legend planes (one shared texture) into one geometry so the
// whole set is a single draw call. Each plane is laid flat + oriented to its
// lane's travel direction (same transform recipe as the arrows).
function mergeBusLegends(
  legends: typeof BUS_LANE_LEGENDS = BUS_LANE_LEGENDS
): BufferGeometry | null {
  if (legends.length === 0) return null;
  const geometries = legends.map((legend) => {
    const geo = new PlaneGeometry(2.4, 4.6);
    geo.rotateX(-Math.PI / 2);
    geo.rotateY(legend.rotationY);
    geo.translate(legend.position[0], legend.position[1], legend.position[2]);
    return geo;
  });
  return geometries.length === 1
    ? geometries[0]
    : mergeGeometries(geometries, false);
}

function isJsdomRuntime(): boolean {
  return (
    typeof window !== "undefined" && /jsdom/i.test(window.navigator.userAgent)
  );
}

// White "버스" legend on a transparent canvas (browser-only; jsdom has no 2-D ctx).
function useBusLegendTexture(): Texture | null {
  return useMemo(() => {
    if (typeof document === "undefined" || isJsdomRuntime()) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, 128, 256);
    ctx.fillStyle = "#eef0ee";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font =
      "900 92px 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif";
    // Stack the two syllables along the lane (reads from the driver's approach).
    ctx.fillText("버", 64, 70);
    ctx.fillText("스", 64, 186);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }, []);
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
  // markingsOnly (?photoreal=1): suppress the textured asphalt surfaces and
  // render ONLY the painted markings (lane lines, 중앙선, 정지선, crosswalks,
  // arrows, bus legends). The photoreal plate supplies the photoreal asphalt +
  // buildings; the metric-exact markings are composited on top so the live
  // vehicles (placed at the same metric lane centres) sit centred in visible,
  // metrically-correct lanes regardless of the plate's painted-lane drift.
  markingsOnly?: boolean;
  // cmpA (?photoreal=1&cmp=A): shift each corridor's markings laterally onto the
  // plain plate's carriageway (same SSOT the vehicles use) and extend the far end
  // to the visible plate-road extent. No effect on the committed road / photoreal.
  cmpA?: boolean;
  // suppressVectorMarkings (?photobash=1): render ONLY the textured asphalt and
  // skip every merged vector-marking mesh (lane lines, 중앙선, 정지선, crosswalks,
  // arrows, bus legends). The photobash mode replaces those flat vector markings
  // with MarkingDecalLayer's textured decals over this asphalt.
  suppressVectorMarkings?: boolean;
};

export function RoadSurfaceLayer({
  isNight,
  markingsOnly = false,
  cmpA = false,
  suppressVectorMarkings = false
}: RoadSurfaceLayerProps) {
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

  // Markings merged into one geometry per material so the whole high-camera
  // frame is a handful of draw calls instead of one per stripe. In cmp=A each
  // corridor's specs are shifted laterally onto the plate road; the full-corridor
  // longitudinal solids (중앙선 / 길가장자리 / bus border) plus extra dashed-divider
  // segments are also extended at the far end.
  const dividerGeometry = useMemo(
    () =>
      mergeFlatMarkings(
        cmpA
          ? [...LANE_DIVIDER_MARKINGS, ...buildCmpADividerExtensionDashes()]
          : LANE_DIVIDER_MARKINGS,
        0.014
      ),
    [cmpA]
  );
  const crosswalkGeometry = useMemo(
    () => mergeFlatMarkings(CROSSWALK_STRIPES, 0.016),
    []
  );
  const arrowGeometry = useMemo(
    () =>
      mergeLaneArrows(cmpA ? LANE_ARROW_DECALS : undefined),
    [cmpA]
  );
  // 중앙선 (yellow), 중앙버스전용차로선 (blue), and the white solid line set
  // (정지선 + 길가장자리구역선 + 진로변경제한선) each merge to one geometry.
  const centerLineGeometry = useMemo(
    () =>
      mergeFlatMarkings(
        cmpA
          ? CENTER_LINE_MARKINGS.map((s) => extendSolidLongitudinal(s))
          : CENTER_LINE_MARKINGS,
        0.011
      ),
    [cmpA]
  );
  const busBorderGeometry = useMemo(
    () =>
      mergeFlatMarkings(
        cmpA
          ? BUS_LANE_BORDER_MARKINGS.map((s) => extendSolidLongitudinal(s))
          : BUS_LANE_BORDER_MARKINGS,
        0.012
      ),
    [cmpA]
  );
  const solidWhiteGeometry = useMemo(
    () =>
      mergeFlatMarkings(
        cmpA
          ? [
              ...STOP_LINE_MARKINGS,
              ...EDGE_LINE_MARKINGS.map((s) => extendSolidLongitudinal(s)),
              ...LANE_RESTRICT_MARKINGS
            ]
          : [...STOP_LINE_MARKINGS, ...EDGE_LINE_MARKINGS, ...LANE_RESTRICT_MARKINGS],
        0.013
      ),
    [cmpA]
  );
  const busLegendTexture = useBusLegendTexture();
  const busLegendGeometry = useMemo(
    () => mergeBusLegends(cmpA ? BUS_LANE_LEGENDS : undefined),
    [cmpA]
  );

  // Asphalt tint: white in day (texture reads true colour ~#3a3a3e),
  // slightly blue-dark tint at night so the grain stays visible.
  const asphaltColor = isNight ? "#5a5a64" : "#ffffff";

  // Korean lane-line palette (worn-paint, slightly muted at night).
  const laneColor = isNight ? "#a9a394" : "#d7d5cc"; // white dashed dividers
  const crosswalkColor = isNight ? "#b4af9f" : "#e3e1d8";
  const arrowColor = isNight ? "#a9a394" : "#d7d5cc";
  const centerLineColor = isNight ? "#b39a3a" : "#e3c64a"; // 황색 중앙선
  const busBorderColor = isNight ? "#2b5896" : "#2f6fd0"; // 청색 복선
  const solidWhiteColor = isNight ? "#c0bbac" : "#eceadf"; // 정지선/길가장자리/제한선

  return (
    <group name="road-surface-layer">
      {/* Textured asphalt surfaces — suppressed in markingsOnly (?photoreal=1),
          where the plate already supplies photoreal asphalt. */}
      {!markingsOnly && (
        <>
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
        </>
      )}

      {/* Vector markings — suppressed in suppressVectorMarkings (?photobash=1),
          where MarkingDecalLayer's textured decals replace these flat planes. */}
      {!suppressVectorMarkings && (
        <>
      {/* 중앙선 — yellow double-solid centre line (merged) */}
      {centerLineGeometry && (
        <mesh geometry={centerLineGeometry}>
          <meshBasicMaterial color={centerLineColor} />
        </mesh>
      )}

      {/* 중앙버스전용차로선 — blue double-solid bus-lane border (merged).
          The bus lane itself is plain asphalt (no red pavement). */}
      {busBorderGeometry && (
        <mesh geometry={busBorderGeometry}>
          <meshBasicMaterial color={busBorderColor} />
        </mesh>
      )}

      {/* White SOLID lines: 정지선 + 길가장자리구역선 + 진로변경제한선 (merged) */}
      {solidWhiteGeometry && (
        <mesh geometry={solidWhiteGeometry}>
          <meshBasicMaterial color={solidWhiteColor} />
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

      {/* 버스 legend text painted in each median bus lane (browser-only, merged) */}
      {busLegendTexture && busLegendGeometry && (
        <mesh geometry={busLegendGeometry}>
          <meshBasicMaterial
            map={busLegendTexture}
            transparent
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      )}
        </>
      )}
    </group>
  );
}

RoadSurfaceLayer.displayName = "RoadSurfaceLayer";
