"use client";

// BuildingLayer — P2 photoreal 3D building system for 강남역 사거리.
//
// Replaces the AI scene-plate as the source of buildings/sky/horizon.
// Each building is a MeshPhysicalMaterial box (glass curtain-wall) that
// reflects the P1 RoomEnvironment HDRI — this envMapIntensity is the key
// photoreal lever.  Night: lit emissive window grid from DataTexture.
// Day sky: drei <Sky> procedural atmosphere.  Night sky: dark dome.
//
// Safe-zone rule: buildings are defined outside the road + sidewalk
// clearance by buildingFootprints.ts; occlusion is true 3D depth, so
// vehicles behind buildings are hidden correctly by the depth buffer.

import { useMemo } from "react";
import { Sky } from "@react-three/drei";
import {
  BackSide,
  DataTexture,
  LinearSRGBColorSpace,
  MeshPhysicalMaterial,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2
} from "three";

import {
  BUILDING_FOOTPRINTS,
  type BuildingFootprint,
  type BuildingType
} from "./buildingFootprints";
import type { Stage6QualityPreset, Stage6TimeOfDay } from "./stage6Quality";
import { getStage6QualityPreset } from "./stage6Quality";

// ── jsdom guard ───────────────────────────────────────────────────────────────
// Sky / night-dome are mesh-based with shader materials and must not render
// in the unit-test jsdom environment (no real WebGL context).
function isJsdomRuntime(): boolean {
  return (
    typeof window !== "undefined" && /jsdom/i.test(window.navigator.userAgent)
  );
}

// ── Window-grid textures ──────────────────────────────────────────────────────
// 64×96 px tileable DataTexture — 4 columns × 6 rows of window cells.
// Used as roughnessMap (day + night) to make mullion frames less reflective
// than the glass panels, and as emissiveMap (night only) for lit-window glow.
// DataTexture is purely CPU-side, so it works in jsdom as well as the browser.

const TEX_W = 64;
const TEX_H = 96;
const TEX_COLS = 4;
const TEX_ROWS = 6;
const MULLION_PX = 3; // frame thickness in pixels

/** Roughness texture: glass panels (value≈12/255≈0.05) vs mullion (≈128/255≈0.50). */
function buildRoughnessTexture(): DataTexture {
  const data = new Uint8Array(TEX_W * TEX_H * 4);
  const cellW = TEX_W / TEX_COLS;
  const cellH = TEX_H / TEX_ROWS;

  for (let y = 0; y < TEX_H; y++) {
    for (let x = 0; x < TEX_W; x++) {
      const lx = x % cellW;
      const ly = y % cellH;
      const isMullion =
        lx < MULLION_PX ||
        lx >= cellW - MULLION_PX ||
        ly < MULLION_PX ||
        ly >= cellH - MULLION_PX;

      const v = isMullion ? 128 : 12;
      const i = (y * TEX_W + x) * 4;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }

  const tex = new DataTexture(data, TEX_W, TEX_H, RGBAFormat);
  tex.colorSpace = LinearSRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Emissive texture for night: ~75% of windows show warm or cool light glow. */
function buildNightEmissiveTexture(): DataTexture {
  const data = new Uint8Array(TEX_W * TEX_H * 4);
  const cellW = TEX_W / TEX_COLS;
  const cellH = TEX_H / TEX_ROWS;

  for (let y = 0; y < TEX_H; y++) {
    for (let x = 0; x < TEX_W; x++) {
      const col = Math.floor(x / cellW);
      const row = Math.floor(y / cellH);
      const lx = x % cellW;
      const ly = y % cellH;
      const isMullion =
        lx < MULLION_PX ||
        lx >= cellW - MULLION_PX ||
        ly < MULLION_PX ||
        ly >= cellH - MULLION_PX;

      let r = 0,
        g = 0,
        b = 0;
      if (!isMullion) {
        // Deterministic pseudo-random per window cell
        const hash = ((col * 7919 + row * 6271) ^ (col + row * 31)) >>> 0;
        const lit = hash % 4 !== 0; // ~75 % of windows lit
        if (lit) {
          const cool = hash % 3 === 0;
          r = cool ? 130 : 230;
          g = cool ? 185 : 210;
          b = cool ? 225 : 155;
        } else {
          r = 6;
          g = 6;
          b = 10;
        }
      }
      // Mullions remain 0,0,0 (no emission)

      const i = (y * TEX_W + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  const tex = new DataTexture(data, TEX_W, TEX_H, RGBAFormat);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

// ── Material configuration by building type ───────────────────────────────────

type MaterialConfig = {
  /** Base roughness (overridden locally by roughnessMap). */
  roughness: number;
  metalness: number;
  /** Key photoreal lever: how strongly the scene HDRI is reflected in the glass. */
  envMapIntensity: number;
  /** Night emissive window intensity. */
  emissiveIntensity: number;
  /** Texture repeat [u, v] for the window-grid tiles across a facade. */
  repeatU: number;
  repeatV: number;
};

const MATERIAL_CONFIGS: Record<BuildingType, MaterialConfig> = {
  "glass-tower": {
    roughness: 0.07,
    metalness: 0.08,
    envMapIntensity: 2.8,
    emissiveIntensity: 0.85,
    repeatU: 8,
    repeatV: 18
  },
  "glass-high-rise": {
    roughness: 0.1,
    metalness: 0.08,
    envMapIntensity: 2.3,
    emissiveIntensity: 0.6,
    repeatU: 6,
    repeatV: 14
  },
  "mid-rise": {
    roughness: 0.35,
    metalness: 0.04,
    envMapIntensity: 0.9,
    emissiveIntensity: 0.3,
    repeatU: 5,
    repeatV: 8
  },
  "low-rise": {
    roughness: 0.65,
    metalness: 0.02,
    envMapIntensity: 0.3,
    emissiveIntensity: 0.15,
    repeatU: 4,
    repeatV: 5
  }
};

/** Clone a DataTexture and set independent UV repeat — does not copy GPU data. */
function cloneTexWithRepeat(base: DataTexture, u: number, v: number): DataTexture {
  const clone = base.clone();
  clone.repeat = new Vector2(u, v);
  clone.needsUpdate = true;
  return clone;
}

// ── Public API ────────────────────────────────────────────────────────────────

export type BuildingLayerProps = {
  timeOfDay?: Stage6TimeOfDay;
  qualityPreset?: Stage6QualityPreset;
};

// BuildingLayerComponent is hook-free so it can be called directly in unit
// tests (same pattern as SceneEnvironment). Hooks live in BuildingVolumeSet.
function BuildingLayerComponent({
  timeOfDay = "day",
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

      {/* Building volumes live in a child component so useMemo hooks only
          run during real React rendering, not when called directly in tests. */}
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

// Isolated so useMemo runs inside a real React render tree, not when the
// parent BuildingLayerComponent is called directly by unit tests.
function BuildingVolumeSet({ isNight }: { isNight: boolean }) {
  // Base window textures (CPU-side DataTexture, safe in jsdom too)
  const roughTex = useMemo(() => buildRoughnessTexture(), []);
  const nightTex = useMemo(() => buildNightEmissiveTexture(), []);

  // One MeshPhysicalMaterial per building type per time-of-day.
  const typeMaterials = useMemo<Record<BuildingType, MeshPhysicalMaterial>>(() => {
    const types = Object.keys(MATERIAL_CONFIGS) as BuildingType[];
    return Object.fromEntries(
      types.map((type) => {
        const cfg = MATERIAL_CONFIGS[type];
        const rt = cloneTexWithRepeat(roughTex, cfg.repeatU, cfg.repeatV);

        const mat = new MeshPhysicalMaterial({
          roughness: cfg.roughness,
          metalness: cfg.metalness,
          envMapIntensity: cfg.envMapIntensity,
          roughnessMap: rt
        });

        if (isNight) {
          const et = cloneTexWithRepeat(nightTex, cfg.repeatU, cfg.repeatV);
          mat.emissive.set("#ffffff");
          mat.emissiveMap = et;
          mat.emissiveIntensity = cfg.emissiveIntensity;
        }

        return [type, mat];
      })
    ) as Record<BuildingType, MeshPhysicalMaterial>;
  }, [isNight, roughTex, nightTex]);

  return (
    <>
      {BUILDING_FOOTPRINTS.map((fp) => (
        <BuildingVolume
          key={fp.id}
          footprint={fp}
          typeMaterial={typeMaterials[fp.type]}
        />
      ))}
    </>
  );
}

BuildingVolumeSet.displayName = "BuildingVolumeSet";

// ── Building volume ───────────────────────────────────────────────────────────

type BuildingVolumeProps = {
  footprint: BuildingFootprint;
  typeMaterial: MeshPhysicalMaterial;
};

function BuildingVolume({ footprint, typeMaterial }: BuildingVolumeProps) {
  const { id, position, size, tint } = footprint;
  const [w, h, d] = size;
  const [px, py, pz] = position;

  // Per-building clone to set individual glass tint; cloning shares the texture
  // references so GPU data is never duplicated.
  const mat = useMemo(() => {
    const m = typeMaterial.clone();
    m.color.set(tint);
    return m;
  }, [typeMaterial, tint]);

  // Rooftop mechanical cap: small dark box (≈4 % of tower height, min 1.2 m)
  // breaks the flat-box silhouette and reads as HVAC/plant-room equipment.
  const rooftopH = Math.max(1.2, h * 0.04);
  const rooftopY = py + h / 2 + rooftopH / 2;
  const rooftopW = w * 0.7;
  const rooftopD = d * 0.7;

  return (
    <group name={`building-${id}`}>
      {/* Main facade body */}
      <mesh position={[px, py, pz]} material={mat} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* Rooftop equipment cap */}
      <mesh position={[px, rooftopY, pz]}>
        <boxGeometry args={[rooftopW, rooftopH, rooftopD]} />
        <meshStandardMaterial color="#1a1a1e" roughness={0.82} metalness={0.18} />
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
