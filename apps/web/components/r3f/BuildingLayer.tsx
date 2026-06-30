"use client";

// BuildingLayer — P2 photoreal 3D building system for 강남역 사거리.
//
// P2c: composed massing + facade variety + gradient sky.
//   • Each building is composed from stacked/inset volumes (PODIUM base, inset
//     SHAFT, optional SETBACK upper section, dark CROWN/mechanical, optional
//     ANTENNA) instead of one uniform box — varied deterministically by id hash
//     so the skyline reads as distinct towers, not a row of boxes.
//   • Glass towers keep the photographic curtain-wall texture (3 tints); mid-/
//     low-rise side-street buildings use a duller concrete/small-window look so
//     the city is not all identical glass. Dark podium bases meet the ground.
//   • DAY map = facade-glass-day.webp + HDRI reflections; NIGHT map+emissiveMap
//     = facade-windows-night.webp so lit windows glow under bloom.
//   • Sky: graded gradient dome (day: blue→hazy horizon + faint clouds; night:
//     dark zenith→warm city-glow horizon) replacing the flat procedural sky.
//
// PERFORMANCE: every sub-volume across all buildings is merged by material group
// (3 glass tints + concrete + dark detail + far ring) into ~6 BufferGeometries,
// so the entire skyline costs ~6 draw calls regardless of massing richness. UV
// tiling is BAKED per-face into the merged geometry (≈14 m/tile glass, ≈7 m/tile
// concrete) so a single shared texture+repeat[1,1] tiles correctly without a
// per-face material array (which rendered each box as 6 draw calls in P2b).
//
// Safe-zone rule: sub-volumes stay within each footprint's horizontal envelope
// (podium = full footprint, shaft/setback inset), so buildings remain outside
// the road + sidewalk clearance and occlude vehicles via true 3D depth.

import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  type BufferAttribute,
  type Material,
  type Texture
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {
  BUILDING_FOOTPRINTS,
  type BuildingFootprint,
  type BuildingForm
} from "./buildingFootprints";
import type { Stage6QualityPreset, Stage6TimeOfDay } from "./stage6Quality";

// ── Facade texture assets (served from public/) ───────────────────────────────

export const FACADE_DAY_TEXTURE_PATH =
  "/simulation/r3f/assets/textures/facade-glass-day.webp";
export const FACADE_NIGHT_TEXTURE_PATH =
  "/simulation/r3f/assets/textures/facade-windows-night.webp";
// 강남 고증: glass towers carry the Samsung dark-glass tile (FACADE_DAY path);
// mid-rise commercial buildings carry the Gangnam illuminated-signage facade.
export const FACADE_SIGNAGE_DAY_TEXTURE_PATH =
  "/simulation/r3f/assets/textures/facade-signage-day.webp";

// One glass tile covers ~14 m of facade → ≈4 floors at ~3.5 m/floor.
export const FACADE_METERS_PER_TILE = 14;
// Mid-rise commercial carries the Gangnam signage facade — one tile spans the
// full ~9-floor signboard elevation (~30 m) so floors read at natural height
// instead of a compressed window band.
export const CONCRETE_METERS_PER_TILE = 30;

// Preload both facade textures in the browser so they are warm on first paint
// and do not cause a black-frame flicker in the capture harness.
if (
  typeof window !== "undefined" &&
  !/jsdom/i.test(window.navigator?.userAgent ?? "")
) {
  useTexture.preload(FACADE_DAY_TEXTURE_PATH);
  useTexture.preload(FACADE_NIGHT_TEXTURE_PATH);
  useTexture.preload(FACADE_SIGNAGE_DAY_TEXTURE_PATH);
}

// ── jsdom guard ───────────────────────────────────────────────────────────────
function isJsdomRuntime(): boolean {
  return (
    typeof window !== "undefined" && /jsdom/i.test(window.navigator.userAgent)
  );
}

// ── Pure helpers (unit-tested) ────────────────────────────────────────────────

/** Deterministic FNV-1a hash of a building id → unsigned 32-bit. No Math.random. */
export function hashId(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

/** Per-building tile-size jitter in [0.9, 1.1] so tiling is not identical. */
export function getBuildingVarFactor(id: string): number {
  return 0.9 + (hashId(id) % 5) * 0.05;
}

/**
 * Whole-tile UV repeat for one facade face (kept for reference + tests). Rounded
 * so floors are never sliced mid-window at the roofline; clamped to ≥1.
 */
export function computeFacadeRepeat(
  faceWidthM: number,
  heightM: number,
  varFactor: number
): [number, number] {
  const u = Math.max(1, Math.round((faceWidthM / FACADE_METERS_PER_TILE) * varFactor));
  const v = Math.max(1, Math.round(heightM / FACADE_METERS_PER_TILE));
  return [u, v];
}

// 3 glass tints distributed across buildings. Day tints are LIGHT so the
// photographic map + reflections read through the colour multiply; night tints
// are dark so only the emissive lit windows glow.
export const GLASS_TINTS_DAY = ["#b4c8e0", "#aad0c2", "#c6ced6"] as const;
export const GLASS_TINTS_NIGHT = ["#10151f", "#101a18", "#141820"] as const;

export function getGlassTintIndex(id: string): number {
  return hashId(id) % 3;
}

// ── Building massing composition (pure, unit-tested) ──────────────────────────

/** Merge/material group a sub-volume belongs to. */
export type VolumeGroup =
  | "glass0"
  | "glass1"
  | "glass2"
  | "concrete"
  | "dark"
  | "far"
  | "billboard";

export type BuildingVolumeSpec = {
  group: VolumeGroup;
  /** [width(x), height(y), depth(z)] in metres. */
  size: [number, number, number];
  /** Geometric centre [x, y, z]; y = bottom + height/2 so the base sits at y=0. */
  center: [number, number, number];
  /** Metres per facade tile for UV baking (glass/concrete groups only). */
  metersPerTile: number;
  /** LED signage colour (billboard group only). */
  ledColor?: string;
};

const GLASS_GROUPS: VolumeGroup[] = ["glass0", "glass1", "glass2"];

// Bright Korean-LED signage palette for billboard frontages (deterministic pick).
const LED_COLORS = [
  "#e8455f", // red
  "#33c4e6", // cyan
  "#e8851f", // amber
  "#d94bb0", // magenta
  "#8fd94a", // green
  "#e6c24a", // warm white-yellow
  "#cdd6de" // soft white (not blown-out, so it reads as signage not a blank panel)
] as const;

/**
 * LED billboard panels on a mid-rise commercial frontage facing the
 * intersection. Placed flush on the building's intersection-facing face(s)
 * (the dominant approach axis; both faces for corner blocks). Returned as thin
 * boxes so they merge into the single emissive billboard group (1 draw call).
 */
function buildBillboards(footprint: BuildingFootprint): BuildingVolumeSpec[] {
  const { id, size, position } = footprint;
  const [w, h, d] = size;
  const [px, , pz] = position;
  const hash = hashId(id);

  const bandH = Math.min(18, Math.max(6, h * 0.34));
  const bandY = h * 0.46;
  const isCorner = Math.abs(px) < 58 && Math.abs(pz) < 58;
  const panels: BuildingVolumeSpec[] = [];

  const ledFor = (salt: number) =>
    LED_COLORS[(hash + salt) % LED_COLORS.length];

  // X-facing panel (faces ±x toward the intersection).
  const wantX = isCorner || Math.abs(px) >= Math.abs(pz);
  if (wantX) {
    const sign = px >= 0 ? -1 : 1; // toward origin
    panels.push({
      group: "billboard",
      size: [0.5, bandH, d * 0.8],
      center: [px + sign * (w / 2 + 0.3), bandY, pz],
      metersPerTile: 1,
      ledColor: ledFor(0)
    });
  }
  // Z-facing panel (faces ±z toward the intersection).
  const wantZ = isCorner || Math.abs(pz) > Math.abs(px);
  if (wantZ) {
    const sign = pz >= 0 ? -1 : 1; // toward origin
    panels.push({
      group: "billboard",
      size: [w * 0.8, bandH, 0.5],
      center: [px, bandY, pz + sign * (d / 2 + 0.3)],
      metersPerTile: 1,
      ledColor: ledFor(3)
    });
  }

  return panels;
}

/**
 * Compose a building into stacked/inset sub-volumes by FORM. Deterministic by id
 * hash — no Math.random. Sub-volumes stay within the footprint's horizontal
 * envelope (podium = full footprint; shaft/setback inset), so the safe-zone
 * guarantee from buildingFootprints holds. Crown/antenna may extend ABOVE the
 * footprint height for silhouette variety (vertical only).
 *
 *   glassTower        → podium + slim inset shaft + optional setback + dark crown
 *                       + antenna on the tallest/selected towers (glass facade).
 *   midriseCommercial → podium + broad concrete shaft + dark parapet + LED
 *                       billboard panels on the intersection frontage.
 *   distant           → a single cheap far-massing box (horizon silhouette).
 */
export function composeBuildingVolumes(
  footprint: BuildingFootprint
): BuildingVolumeSpec[] {
  const { id, form, size, position } = footprint;
  const [w, h, d] = size;
  const [px, , pz] = position;
  const hash = hashId(id);
  const glassGroup = GLASS_GROUPS[hash % 3];

  // Distant ring: a single simple far-massing box (kept cheap, low detail).
  if (form === "distant") {
    return [
      {
        group: "far",
        size: [w, h, d],
        center: [px, h / 2, pz],
        metersPerTile: FACADE_METERS_PER_TILE
      }
    ];
  }

  const volumes: BuildingVolumeSpec[] = [];
  const glass = form === "glassTower";
  const facadeGroup: VolumeGroup = glass ? glassGroup : "concrete";
  const tile = glass ? FACADE_METERS_PER_TILE : CONCRETE_METERS_PER_TILE;

  // Podium (dark lobby/base band) — full footprint, meets the ground.
  const podiumH = Math.min(glass ? 12 : 6, Math.max(3.5, h * (glass ? 0.07 : 0.12)));
  volumes.push({
    group: "dark",
    size: [w, podiumH, d],
    center: [px, podiumH / 2, pz],
    metersPerTile: tile
  });

  // Optional setback upper section for taller glass towers (varies silhouette).
  const wantSetback = glass && h > 110 && hash % 2 === 0;
  const setbackH = wantSetback ? h * 0.22 : 0;

  // Main shaft (inset above the podium). Towers are slimmer for a slender read;
  // mid-rise commercial blocks stay broad.
  const shaftInset = glass ? 0.9 : 0.99;
  const shaftW = w * shaftInset;
  const shaftD = d * shaftInset;
  const shaftH = Math.max(2, h - podiumH - setbackH);
  const shaftBottom = podiumH;
  volumes.push({
    group: facadeGroup,
    size: [shaftW, shaftH, shaftD],
    center: [px, shaftBottom + shaftH / 2, pz],
    metersPerTile: tile
  });

  // Setback section (narrower glass tower top).
  if (setbackH > 0) {
    const setW = w * 0.66;
    const setD = d * 0.66;
    const setBottom = shaftBottom + shaftH;
    volumes.push({
      group: facadeGroup,
      size: [setW, setbackH, setD],
      center: [px, setBottom + setbackH / 2, pz],
      metersPerTile: tile
    });
  }

  // Top of the occupied volume (where crown/parapet sits).
  const topY = podiumH + shaftH + setbackH;

  if (glass) {
    // Dark mechanical crown so tops are not flat glass.
    const crownH = Math.min(6, Math.max(2, h * 0.035));
    const crownW = (setbackH > 0 ? w * 0.66 : w * shaftInset) * 0.6;
    const crownD = (setbackH > 0 ? d * 0.66 : d * shaftInset) * 0.6;
    volumes.push({
      group: "dark",
      size: [crownW, crownH, crownD],
      center: [px, topY + crownH / 2, pz],
      metersPerTile: tile
    });

    // Slender antenna mast on the tallest towers + a selected subset.
    if (h > 180 || hash % 3 === 0) {
      const antH = Math.max(6, h * 0.08);
      volumes.push({
        group: "dark",
        size: [0.6, antH, 0.6],
        center: [px, topY + crownH + antH / 2, pz],
        metersPerTile: tile
      });
    }
  } else {
    // Mid-rise commercial: thin dark parapet cap + LED billboard frontage.
    const parapetH = 1.2;
    volumes.push({
      group: "dark",
      size: [w * 0.99, parapetH, d * 0.99],
      center: [px, topY + parapetH / 2, pz],
      metersPerTile: tile
    });
    if (footprint.billboards) {
      volumes.push(...buildBillboards(footprint));
    }
  }

  return volumes;
}

// ── Material tuning by group ──────────────────────────────────────────────────

type GroupTuning = {
  dayRoughness: number;
  dayMetalness: number;
  dayEnvMapIntensity: number;
  nightRoughness: number;
  nightEnvMapIntensity: number;
  emissiveIntensity: number;
};

// Glass tints share one tuning (tower-grade reflectivity so SW flagships read as
// glass); concrete is duller and matte.
const GLASS_TUNING: GroupTuning = {
  dayRoughness: 0.13,
  dayMetalness: 0.11,
  dayEnvMapIntensity: 1.9,
  nightRoughness: 0.44,
  nightEnvMapIntensity: 0.28,
  emissiveIntensity: 1.5
};

const CONCRETE_TUNING: GroupTuning = {
  dayRoughness: 0.82,
  dayMetalness: 0.02,
  dayEnvMapIntensity: 0.25,
  nightRoughness: 0.9,
  nightEnvMapIntensity: 0.08,
  emissiveIntensity: 0.7
};

// ── UV baking ─────────────────────────────────────────────────────────────────

// BoxGeometry face order + per-face (spanU, spanV) in metres, given (w,h,d).
// Faces: 0 +x, 1 -x, 2 +y, 3 -y, 4 +z, 5 -z. Each face has 4 vertices.
function faceSpans(w: number, h: number, d: number): [number, number][] {
  return [
    [d, h], // +x
    [d, h], // -x
    [w, d], // +y
    [w, d], // -y
    [w, h], // +z
    [w, h] // -z
  ];
}

/**
 * Build a box whose per-face UVs are scaled so the facade texture tiles at
 * ~metersPerTile (with RepeatWrapping), plus a per-building UV offset so
 * neighbouring buildings don't share the same window origin. Translated to its
 * world centre so it can be merged into a shared geometry.
 */
function buildTiledBox(
  size: [number, number, number],
  center: [number, number, number],
  metersPerTile: number,
  offset: [number, number]
): BufferGeometry {
  const [w, h, d] = size;
  const geo = new BoxGeometry(w, h, d);
  const uv = geo.attributes.uv as BufferAttribute;
  const spans = faceSpans(w, h, d);

  for (let face = 0; face < 6; face += 1) {
    const [spanU, spanV] = spans[face];
    const ru = spanU / metersPerTile;
    const rv = spanV / metersPerTile;
    for (let v = 0; v < 4; v += 1) {
      const idx = face * 4 + v;
      const u0 = uv.getX(idx);
      const v0 = uv.getY(idx);
      uv.setXY(idx, u0 * ru + offset[0], v0 * rv + offset[1]);
    }
  }
  uv.needsUpdate = true;

  geo.translate(center[0], center[1], center[2]);
  return geo;
}

/** Plain (untextured) box translated to its world centre — for dark/far volumes. */
function buildPlainBox(
  size: [number, number, number],
  center: [number, number, number]
): BufferGeometry {
  const geo = new BoxGeometry(size[0], size[1], size[2]);
  geo.translate(center[0], center[1], center[2]);
  return geo;
}

/**
 * Billboard panel box with a flat per-vertex LED colour, so the whole signage
 * group merges into one vertex-coloured geometry (1 unlit draw call) while still
 * showing varied colours. UV attribute is kept so all billboard geometries share
 * the same attribute set for merging.
 */
function buildBillboardBox(
  size: [number, number, number],
  center: [number, number, number],
  ledColor: string
): BufferGeometry {
  const geo = new BoxGeometry(size[0], size[1], size[2]);
  geo.translate(center[0], center[1], center[2]);
  const c = new Color(ledColor);
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geo;
}

// ── Public API ────────────────────────────────────────────────────────────────

export type BuildingLayerProps = {
  timeOfDay?: Stage6TimeOfDay;
  qualityPreset?: Stage6QualityPreset;
};

// BuildingLayerComponent is hook-free so it can be called directly in unit
// tests (same pattern as SceneEnvironment). Hooks live in BuildingVolumeSet.
function BuildingLayerComponent({ timeOfDay = "day" }: BuildingLayerProps) {
  const isNight = timeOfDay === "night";

  return (
    <group
      name="gangnam-building-layer"
      userData={{ phase: "p2c", retires: "background-plate" }}
    >
      {/* Sky / horizon — jsdom-guarded (requires shader compilation) */}
      {!isJsdomRuntime() && <GradientSky isNight={isNight} />}

      {/* Merged building volumes live in a child component so useTexture/useMemo
          hooks only run during real React rendering, not when BuildingLayer is
          called directly by unit tests. */}
      <BuildingVolumeSet isNight={isNight} />
    </group>
  );
}

// Not memo-wrapped (mirrors SceneEnvironment): SimulationScene rebuilds on every
// snapshot frame, so memo adds overhead without meaningful rerender savings.
export function BuildingLayer(props: BuildingLayerProps) {
  return BuildingLayerComponent(props);
}
BuildingLayer.displayName = "BuildingLayer";

// ── Building volume set (has hooks) ──────────────────────────────────────────

function BuildingVolumeSet({ isNight }: { isNight: boolean }) {
  const [dayTex, nightTex, signageDayTex] = useTexture([
    FACADE_DAY_TEXTURE_PATH,
    FACADE_NIGHT_TEXTURE_PATH,
    FACADE_SIGNAGE_DAY_TEXTURE_PATH
  ]) as Texture[];

  // Merge every sub-volume by material group → ~6 geometries for the whole city.
  const merged = useMemo(() => {
    const byGroup = new Map<VolumeGroup, BufferGeometry[]>();
    const push = (g: VolumeGroup, geo: BufferGeometry) => {
      const list = byGroup.get(g);
      if (list) list.push(geo);
      else byGroup.set(g, [geo]);
    };

    for (const fp of BUILDING_FOOTPRINTS) {
      const hash = hashId(fp.id);
      const offset: [number, number] = [(hash % 7) / 7, ((hash >> 3) % 5) / 5];
      for (const vol of composeBuildingVolumes(fp)) {
        if (vol.group === "billboard") {
          push(
            vol.group,
            buildBillboardBox(vol.size, vol.center, vol.ledColor ?? "#ffffff")
          );
        } else if (vol.group === "dark" || vol.group === "far") {
          push(vol.group, buildPlainBox(vol.size, vol.center));
        } else {
          push(
            vol.group,
            buildTiledBox(vol.size, vol.center, vol.metersPerTile, offset)
          );
        }
      }
    }

    const result = new Map<VolumeGroup, BufferGeometry>();
    for (const [group, geos] of byGroup) {
      const geo = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
      if (geo) result.set(group, geo);
    }
    return result;
  }, []);

  // Shared facade texture: tiling is baked into UVs, so repeat stays [1,1] and
  // wrapping handles the >1 UVs. One texture instance serves every glass group.
  const wrapFacade = (src: Texture) => {
    const t = src.clone();
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.colorSpace = SRGBColorSpace;
    t.repeat.set(1, 1);
    t.needsUpdate = true;
    return t;
  };
  // Glass towers = dark Samsung glass (day) / lit windows (night).
  const facadeTex = useMemo(
    () => wrapFacade(isNight ? nightTex : dayTex),
    [isNight, dayTex, nightTex]
  );
  // Mid-rise commercial = Gangnam illuminated-signage facade (day); night keeps
  // the lit-window sheet so the existing night glow is unchanged.
  const concreteFacadeTex = useMemo(
    () => wrapFacade(isNight ? nightTex : signageDayTex),
    [isNight, signageDayTex, nightTex]
  );

  const materials = useMemo(
    () => buildGroupMaterials(facadeTex, concreteFacadeTex, isNight),
    [facadeTex, concreteFacadeTex, isNight]
  );

  return (
    <group name="gangnam-building-massing">
      {[...merged.entries()].map(([group, geometry]) => {
        const lit = group !== "far" && group !== "billboard";
        return (
          <mesh
            key={group}
            geometry={geometry}
            material={materials[group]}
            // Buildings no longer cast shadows: from the high traffic-monitoring
            // camera, massing shadows add little but cost a shadow-map pass per
            // merge group. They still receive vehicle/road shadows.
            castShadow={false}
            receiveShadow={lit}
          />
        );
      })}
    </group>
  );
}

BuildingVolumeSet.displayName = "BuildingVolumeSet";

// Build one material per merge group. Glass tints share the facade texture with
// different colour multiplies; concrete is a duller small-window variant; dark
// is the matte podium/crown/antenna material; far is a flat distant-city tone;
// billboard is an unlit vertex-coloured LED signage material.
function buildGroupMaterials(
  facadeTex: Texture,
  concreteTex: Texture,
  isNight: boolean
): Record<VolumeGroup, Material> {
  const glass = (tintIndex: number): MeshPhysicalMaterial => {
    const t = GLASS_TUNING;
    if (isNight) {
      const m = new MeshPhysicalMaterial({
        map: facadeTex,
        roughness: t.nightRoughness,
        metalness: 0.05,
        envMapIntensity: t.nightEnvMapIntensity
      });
      m.color.set(GLASS_TINTS_NIGHT[tintIndex]);
      m.emissive.set("#ffffff");
      m.emissiveMap = facadeTex;
      m.emissiveIntensity = t.emissiveIntensity;
      return m;
    }
    const m = new MeshPhysicalMaterial({
      map: facadeTex,
      roughness: t.dayRoughness,
      metalness: t.dayMetalness,
      envMapIntensity: t.dayEnvMapIntensity
    });
    m.color.set(GLASS_TINTS_DAY[tintIndex]);
    return m;
  };

  const concrete = (): MeshStandardMaterial => {
    const t = CONCRETE_TUNING;
    if (isNight) {
      const m = new MeshStandardMaterial({
        map: concreteTex,
        roughness: t.nightRoughness,
        metalness: 0.02,
        envMapIntensity: t.nightEnvMapIntensity
      });
      m.color.set("#3a3c40");
      m.emissive.set("#ffffff");
      m.emissiveMap = concreteTex;
      m.emissiveIntensity = t.emissiveIntensity;
      return m;
    }
    const m = new MeshStandardMaterial({
      map: concreteTex,
      // Signage facade carries its own colour; keep it near-white so the
      // illuminated signboards read at full chroma instead of muted stone.
      color: "#d7d4cc",
      roughness: t.dayRoughness,
      metalness: t.dayMetalness,
      envMapIntensity: t.dayEnvMapIntensity
    });
    return m;
  };

  const dark = new MeshStandardMaterial({
    color: isNight ? "#0b0c11" : "#23252b",
    roughness: 0.86,
    metalness: 0.16
  });

  const far = new MeshStandardMaterial({
    color: isNight ? "#0a0d16" : "#41506a",
    roughness: 0.95,
    metalness: 0.02
  });
  if (isNight) {
    // Faint glow so the distant skyline is not pure black at night.
    far.emissive.set("#1a2438");
    far.emissiveIntensity = 0.5;
  }

  // LED billboard signage: unlit, full-brightness vertex colours so panels read
  // as bright signage (day) and bloom-glowing signage (night). Slightly hotter
  // at night so the bloom pass catches it.
  const billboard = new MeshBasicMaterial({
    vertexColors: true,
    toneMapped: !isNight
  });

  return {
    glass0: glass(0),
    glass1: glass(1),
    glass2: glass(2),
    concrete: concrete(),
    dark,
    far,
    billboard
  };
}

// ── Gradient sky ──────────────────────────────────────────────────────────────

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Day: blue zenith → hazy horizon, with faint value-noise clouds in the upper
// band. Night: near-black zenith → warm city-glow horizon, no clouds.
const SKY_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vDir;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform float uClouds;
  uniform vec3 uCloudColor;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      v += amp * noise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    float y = clamp(vDir.y, -1.0, 1.0);
    vec3 col;
    if (y >= 0.0) {
      col = mix(uHorizon, uZenith, pow(y, 0.6));
    } else {
      col = mix(uHorizon, uGround, pow(-y, 0.5));
    }
    if (uClouds > 0.0 && y > 0.02) {
      // Project onto a plane so clouds streak across the dome.
      vec2 cp = vDir.xz / (y + 0.25);
      float c = fbm(cp * 1.5 + vec2(7.0, 3.0));
      c = smoothstep(0.55, 0.95, c);
      float band = smoothstep(0.02, 0.45, y) * (1.0 - smoothstep(0.6, 1.0, y));
      col = mix(col, uCloudColor, c * band * uClouds);
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

function GradientSky({ isNight }: { isNight: boolean }) {
  const material = useMemo(() => {
    const day = {
      uZenith: { value: hexToRgb("#3f74c4") },
      uHorizon: { value: hexToRgb("#cdd9e8") },
      uGround: { value: hexToRgb("#9aa6b4") },
      uClouds: { value: 0.55 },
      uCloudColor: { value: hexToRgb("#f2f5fa") }
    };
    const night = {
      uZenith: { value: hexToRgb("#05060c") },
      uHorizon: { value: hexToRgb("#1d2236") },
      uGround: { value: hexToRgb("#0a0b12") },
      uClouds: { value: 0.0 },
      uCloudColor: { value: hexToRgb("#222a3a") }
    };
    return new ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: isNight ? night : day,
      side: BackSide,
      depthWrite: false,
      fog: false
    });
  }, [isNight]);

  const geometry = useMemo(() => new SphereGeometry(480, 32, 16), []);

  return (
    <mesh
      geometry={geometry}
      material={material}
      renderOrder={-10}
      frustumCulled={false}
    />
  );
}

GradientSky.displayName = "GradientSky";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
