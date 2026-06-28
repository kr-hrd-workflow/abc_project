"use client";

// BuildingLayer — P2 photoreal 3D building system for 강남역 사거리.
//
// P2b: building facades use PHOTOGRAPHIC tileable textures instead of flat
// CG boxes:
//   DAY   — facade-glass-day.webp as the `map` (blue-green reflective glass
//           curtain-wall + mullion grid + baked sky reflections) plus HDRI
//           reflections via envMapIntensity.
//   NIGHT — facade-windows-night.webp as both `map` and `emissiveMap` (white
//           emissive) so lit warm/cool windows glow under the scene bloom; day
//           reflectivity dimmed.
//
// Per-face UV repeat is computed from each building's real metric size so a
// texture tile maps to ~14 m of facade (≈4 floors at ~3.5 m), never stretched.
// Variety: 3 glass tints (blue/green/neutral) + slight per-building repeat and
// UV-offset jitter so the skyline does not read as one repeated block.
//
// Day sky: drei <Sky> procedural atmosphere.  Night sky: dark dome.
// Safe-zone rule: footprints sit outside the road + sidewalk clearance; the
// boxes are true 3D depth, so vehicles behind them are occluded correctly.

import { useMemo } from "react";
import { Sky, useTexture } from "@react-three/drei";
import {
  BackSide,
  MeshPhysicalMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture
} from "three";

import {
  BUILDING_FOOTPRINTS,
  type BuildingFootprint,
  type BuildingType
} from "./buildingFootprints";
import type { Stage6QualityPreset, Stage6TimeOfDay } from "./stage6Quality";

// ── Facade texture assets (served from public/) ───────────────────────────────

export const FACADE_DAY_TEXTURE_PATH =
  "/simulation/r3f/assets/textures/facade-glass-day.webp";
export const FACADE_NIGHT_TEXTURE_PATH =
  "/simulation/r3f/assets/textures/facade-windows-night.webp";

// One texture tile covers ~14 m of facade → ≈4 floors at ~3.5 m/floor.
export const FACADE_METERS_PER_TILE = 14;

// Preload both facade textures in the browser so they are warm on first paint
// and do not cause a black-frame flicker in the capture harness.
if (
  typeof window !== "undefined" &&
  !/jsdom/i.test(window.navigator?.userAgent ?? "")
) {
  useTexture.preload(FACADE_DAY_TEXTURE_PATH);
  useTexture.preload(FACADE_NIGHT_TEXTURE_PATH);
}

// ── jsdom guard ───────────────────────────────────────────────────────────────
// Sky / night-dome are mesh-based with shader materials and must not render
// in the unit-test jsdom environment (no real WebGL context).
function isJsdomRuntime(): boolean {
  return (
    typeof window !== "undefined" && /jsdom/i.test(window.navigator.userAgent)
  );
}

// ── Pure helpers (unit-tested) ────────────────────────────────────────────────

/** Deterministic hash of a building id → unsigned 32-bit. */
function hashId(id: string): number {
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
 * Whole-tile UV repeat for one facade face. Rounded to integers so floors are
 * never sliced mid-window at the roofline; clamped to ≥1 for short buildings.
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

// ── Per-type material tuning ──────────────────────────────────────────────────

type TypeTuning = {
  /** Day: glass reflectivity (texture supplies mullions/base, envMap adds sky). */
  dayRoughness: number;
  dayMetalness: number;
  dayEnvMapIntensity: number;
  /** Night: dim reflections, let lit windows carry the look. */
  nightRoughness: number;
  nightEnvMapIntensity: number;
  /** Night emissive window intensity (tuned against scene bloom). */
  emissiveIntensity: number;
};

const TYPE_TUNING: Record<BuildingType, TypeTuning> = {
  "glass-tower": {
    dayRoughness: 0.12,
    dayMetalness: 0.12,
    dayEnvMapIntensity: 2.0,
    nightRoughness: 0.42,
    nightEnvMapIntensity: 0.3,
    emissiveIntensity: 1.6
  },
  "glass-high-rise": {
    dayRoughness: 0.16,
    dayMetalness: 0.1,
    dayEnvMapIntensity: 1.6,
    nightRoughness: 0.46,
    nightEnvMapIntensity: 0.25,
    emissiveIntensity: 1.35
  },
  "mid-rise": {
    dayRoughness: 0.3,
    dayMetalness: 0.06,
    dayEnvMapIntensity: 0.9,
    nightRoughness: 0.55,
    nightEnvMapIntensity: 0.18,
    emissiveIntensity: 1.1
  },
  "low-rise": {
    dayRoughness: 0.5,
    dayMetalness: 0.03,
    dayEnvMapIntensity: 0.4,
    nightRoughness: 0.7,
    nightEnvMapIntensity: 0.12,
    emissiveIntensity: 0.9
  }
};

/** Clone a facade texture with independent wrap/repeat/offset (shares image data). */
function cloneFacadeTexture(
  base: Texture,
  repeat: [number, number],
  offset: [number, number]
): Texture {
  const tex = base.clone();
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.offset.set(offset[0], offset[1]);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Build ONE glass curtain-wall material for a whole building box.
 *
 * A single material per box keeps each building at 1 draw call (a per-face
 * material array makes a box render as 6 draw calls — 31 buildings would blow
 * the 900 peak-draw-call budget). The UV repeat is derived from the building's
 * AVERAGE horizontal dimension, so the wider and narrower faces stay close in
 * tile density (≈10–15 m/tile) without stretching. Height uses whole-tile rows.
 */
function buildGlassMaterial(
  baseTex: Texture,
  footprint: BuildingFootprint,
  isNight: boolean
): MeshPhysicalMaterial {
  const tuning = TYPE_TUNING[footprint.type];
  const varFactor = getBuildingVarFactor(footprint.id);
  const [w, h, d] = footprint.size;
  const avgFaceWidth = (w + d) / 2;
  const repeat = computeFacadeRepeat(avgFaceWidth, h, varFactor);

  // Per-building UV offset jitter so neighbouring towers don't share the exact
  // same window origin (kills obvious tiling repetition).
  const hash = hashId(footprint.id);
  const offset: [number, number] = [(hash % 7) / 7, ((hash >> 3) % 5) / 5];

  const map = cloneFacadeTexture(baseTex, repeat, offset);
  const tintIndex = getGlassTintIndex(footprint.id);

  if (isNight) {
    const mat = new MeshPhysicalMaterial({
      map,
      roughness: tuning.nightRoughness,
      metalness: 0.05,
      envMapIntensity: tuning.nightEnvMapIntensity
    });
    mat.color.set(GLASS_TINTS_NIGHT[tintIndex]);
    // Same texture drives the emissive channel: bright lit windows glow,
    // dark glass stays dark. emissive white so the texture colour is preserved.
    mat.emissive.set("#ffffff");
    mat.emissiveMap = map;
    mat.emissiveIntensity = tuning.emissiveIntensity;
    return mat;
  }

  const mat = new MeshPhysicalMaterial({
    map,
    roughness: tuning.dayRoughness,
    metalness: tuning.dayMetalness,
    envMapIntensity: tuning.dayEnvMapIntensity
  });
  // Slight tint over the (already blue-green) photo so towers vary blue/green/neutral.
  mat.color.set(GLASS_TINTS_DAY[tintIndex]);
  return mat;
}

// ── Public API ────────────────────────────────────────────────────────────────

export type BuildingLayerProps = {
  timeOfDay?: Stage6TimeOfDay;
  qualityPreset?: Stage6QualityPreset;
};

// BuildingLayerComponent is hook-free so it can be called directly in unit
// tests (same pattern as SceneEnvironment). Hooks live in BuildingVolumeSet.
function BuildingLayerComponent({
  timeOfDay = "day"
  // qualityPreset available for future LOD gating
}: BuildingLayerProps) {
  const isNight = timeOfDay === "night";

  return (
    <group
      name="gangnam-building-layer"
      userData={{ phase: "p2", retires: "background-plate" }}
    >
      {/* Sky / horizon — jsdom-guarded (requires shader compilation) */}
      {!isJsdomRuntime() && <SceneSkyAndHorizon isNight={isNight} />}

      {/* Building volumes live in a child component so useTexture/useMemo hooks
          only run during real React rendering, not when BuildingLayer is called
          directly by unit tests. */}
      <BuildingVolumeSet isNight={isNight} />
    </group>
  );
}

// Not memo-wrapped: SimulationScene rebuilds on every snapshot frame, so memo
// would add overhead without meaningful rerender savings. Pattern mirrors
// SceneEnvironment.
export function BuildingLayer(props: BuildingLayerProps) {
  return BuildingLayerComponent(props);
}
BuildingLayer.displayName = "BuildingLayer";

// ── Building volume set (has hooks) ──────────────────────────────────────────

// Isolated so useTexture/useMemo run inside a real React render tree, not when
// the parent BuildingLayerComponent is called directly by unit tests.
function BuildingVolumeSet({ isNight }: { isNight: boolean }) {
  // Both facade textures are loaded (cheap, ~0.2 MB total); the active one is
  // chosen per time-of-day. useTexture suspends until ready (browser only).
  const [dayTex, nightTex] = useTexture([
    FACADE_DAY_TEXTURE_PATH,
    FACADE_NIGHT_TEXTURE_PATH
  ]) as Texture[];
  const baseTex = isNight ? nightTex : dayTex;

  return (
    <>
      {BUILDING_FOOTPRINTS.map((fp) => (
        <BuildingVolume
          key={fp.id}
          footprint={fp}
          baseTex={baseTex}
          isNight={isNight}
        />
      ))}
    </>
  );
}

BuildingVolumeSet.displayName = "BuildingVolumeSet";

// ── Building volume ───────────────────────────────────────────────────────────

type BuildingVolumeProps = {
  footprint: BuildingFootprint;
  baseTex: Texture;
  isNight: boolean;
};

function BuildingVolume({ footprint, baseTex, isNight }: BuildingVolumeProps) {
  const { id, position, size } = footprint;
  const [w, h, d] = size;
  const [px, py, pz] = position;

  // One glass material on the whole box (1 draw call). The rooftop cap (below)
  // covers most of the top face so the glass-roof reads as a glazed parapet.
  const mat = useMemo(
    () => buildGlassMaterial(baseTex, footprint, isNight),
    [baseTex, footprint, isNight]
  );

  // Rooftop mechanical cap: dark box (≈4 % of tower height, min 1.2 m) covering
  // most of the roof — breaks the flat-box silhouette, reads as HVAC/plant-room
  // equipment, and hides the glass top face under a clean dark parapet.
  const rooftopH = Math.max(1.2, h * 0.04);
  const rooftopY = py + h / 2 + rooftopH / 2;
  const rooftopW = w * 0.86;
  const rooftopD = d * 0.86;

  return (
    <group name={`building-${id}`}>
      {/* Main facade body — single glass material across all faces. */}
      <mesh position={[px, py, pz]} material={mat} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* Rooftop equipment cap */}
      <mesh position={[px, rooftopY, pz]}>
        <boxGeometry args={[rooftopW, rooftopH, rooftopD]} />
        <meshStandardMaterial
          color={isNight ? "#0c0d12" : "#1a1a1e"}
          roughness={0.82}
          metalness={0.18}
        />
      </mesh>
    </group>
  );
}

BuildingVolume.displayName = "BuildingVolume";

// ── Sky and horizon ───────────────────────────────────────────────────────────

function SceneSkyAndHorizon({ isNight }: { isNight: boolean }) {
  return isNight ? <NightSkyDome /> : <DaySky />;
}

SceneSkyAndHorizon.displayName = "SceneSkyAndHorizon";

/**
 * Procedural atmosphere sky for day scenes.
 * Sun at ≈17° elevation from the NW (Korean mid-afternoon).
 * Sky provides the visible horizon colour; LightingRig handles actual scene lighting.
 */
function DaySky() {
  return (
    <Sky
      distance={450000}
      sunPosition={[1, 0.3, -1]}
      turbidity={9}
      rayleigh={1.2}
      mieCoefficient={0.005}
      mieDirectionalG={0.8}
    />
  );
}

DaySky.displayName = "DaySky";

/** Dark night-sky dome: BackSide sphere so it fills the horizon without competing
 *  with the emissive building windows and neon-lit vehicles. */
function NightSkyDome() {
  return (
    <mesh renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[400, 32, 16]} />
      <meshBasicMaterial color="#07080f" side={BackSide} depthWrite={false} />
    </mesh>
  );
}

NightSkyDome.displayName = "NightSkyDome";
