# R3F Photoreal Finishing Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the existing `/dashboard` R3F simulation so it reads as a realistic wet urban traffic camera scene, with bounded postprocessing, PBR road and vehicle materials, weather/CCTV polish, quality presets, asset provenance, and visual/performance gates.

**Architecture:** Keep the existing R3F/WebGL renderer, `SimulationFrameSnapshot` truth boundary, fixture fallback, SUMO live modes, and manifest-backed asset pipeline. The main agent owns shared contracts, conflict sequencing, final integration, and proof. Six workers own non-overlapping implementation tracks, then reviewers check spec compliance, code quality, artifact hygiene, and final readiness.

**Tech Stack:** Next.js, React, TypeScript, React Three Fiber, Three.js, Drei, `@react-three/postprocessing`, glTF/GLB 2.0, glTF Transform, project-authored textures, ImageGen-generated source assets, FastAPI/SUMO frame contracts, Vitest, Testing Library, Playwright/browser verifier.

---

## Source Inputs

- User-approved 6-worker orchestration from 2026-06-19.
- Research report: `C:\Users\100ri\Downloads\deep-research-report (2).md`.
- Baseline plan: `docs/superpowers/plans/2026-06-16-r3f-photoreal-dashboard-simulation.md`.
- Successor live-SUMO plan: `docs/superpowers/plans/2026-06-18-sumo-live-r3f-photoreal-completion.md`.
- Active status scratchpad: `plan.md`. Do not overwrite it during this planning slice.

## Non-Negotiable Boundaries

- `SimulationFrameSnapshot.vehicles` remains the only precise vehicle truth source.
- `density_segments` and fixture fallback may drive aggregate traffic density only when source labels remain honest.
- Do not claim live CCTV, real signal control, deployment, production monitoring, release, tag, or branch protection.
- Do not modify `archive/`.
- Do not install SUMO, Blender, KTX2 encoders, gltfpack, new npm packages, Python packages, or browser tools without approval.
- Do not download or ship third-party assets without license/provenance review and approval.
- ImageGen or ChatGPT Image 2.0 outputs may be used for texture/decal/sprite source generation and visual direction. Runtime assets must be copied into the repo, documented in manifest/provenance, and verified in browser proof.
- The built-in `image_gen` path is the default for image generation. CLI/API image generation that requires `OPENAI_API_KEY` is used only after explicit confirmation in the implementation turn.
- No commit, push, merge, PR, deployment, tag, release, or external account change is authorized by this plan.

## Coverage Map

| Original owner request | Worker coverage |
| --- | --- |
| PostFX: Stage6PostFX, SSAO, SMAA, Bloom, Noise, Vignette, ToneMapping | Worker 1 |
| Road PBR: asphalt, lane paint, crosswalk, curb materials, normal/roughness/ao maps | Workers 2 and 5 |
| Wet road/reflection: wet masks, puddles, MeshReflectorMaterial or planar zones | Workers 2 and 5 |
| Lighting: HDRI/Environment, streetlights, signals, headlights, night/rain presets | Workers 2 and 3 |
| Vehicle material: paint, glass, tire, brake light, emergency light | Worker 3 |
| Vehicle LOD: hero/near/mid/far, high-quality GLB only close | Workers 3 and 5 |
| CCTV presentation: timestamp, camera id, lens feel, compression noise, scanline, shake | Workers 1 and 4 |
| Weather: rain streak, splash sprite, fog/haze, wheel spray | Workers 4 and 5 |
| Animation smoothing: SUMO interpolation, heading, lane change, stale fallback | Worker 3 |
| Quality preset: Low/Medium/High/Ultra feature flags | Main agent plus Workers 1, 3, 6 |
| Visual regression: screenshot comparison, fixed scenario, visual QA gate | Worker 6 |
| Performance telemetry: draw calls, frame time, vehicles, GPU-heavy feature state | Worker 6 |
| Asset pipeline: GLB/KTX2/Draco/Meshopt compression and manifest validation | Worker 5 |
| Road detail props: bollard, cone, guardrail, sign, sidewalk, trees, street lamps | Workers 4 and 5 |
| Signal realism: housing, lens glow, emissive, amber/red/green bloom | Workers 2 and 1 |
| Camera composition: viewport camera, FOV, near/far, aspect composition | Worker 4 |
| Color grading: day/night/rain exposure, contrast, saturation, black level | Worker 1 |
| Scene clutter: buildings, billboards, road signs, pedestrian silhouettes, distant city | Workers 4 and 5 |
| Docs/runbook: photoreal mode, env, quality presets | Worker 6 |
| Integration: conflict merge, build/test/verify, final polish | Main agent plus Worker 6 |

## Shared File Ownership Rules

- Main agent owns sequencing for high-conflict files:
  - `apps/web/components/r3f/SimulationCanvas.tsx`
  - `apps/web/components/r3f/SimulationScene.tsx`
  - `apps/web/components/r3f/R3FSimulationViewport.tsx`
  - `scripts/verify-r3f-dashboard.mjs`
  - `scripts/verify-r3f-assets.mjs`
  - `apps/web/public/simulation/r3f/assets/manifest.json`
- Workers must not edit outside their owned scope without reporting `NEEDS_CONTEXT`.
- If two workers need the same file, the main agent assigns a single temporary owner and sequences the second worker after the first report is accepted.
- All workers must preserve unrelated dirty worktree changes.

## Target File Structure

Create or modify these files as the finishing wave progresses:

```text
apps/web/components/r3f/stage6Quality.ts
apps/web/components/r3f/Stage6PostFX.tsx
apps/web/components/r3f/stage6PostFXPresets.ts
apps/web/components/r3f/WetRoadReflectors.tsx
apps/web/components/r3f/RainParticleLayer.tsx
apps/web/components/r3f/WheelSprayLayer.tsx
apps/web/components/r3f/SceneClutterLayer.tsx
apps/web/components/r3f/RoadDetailProps.tsx
apps/web/components/r3f/CameraRig.tsx
apps/web/components/r3f/SimulationCanvas.tsx
apps/web/components/r3f/SimulationScene.tsx
apps/web/components/r3f/EnvironmentLayer.tsx
apps/web/components/r3f/LightingRig.tsx
apps/web/components/r3f/SignalHardware.tsx
apps/web/components/r3f/SignalLayer.tsx
apps/web/components/r3f/WeatherAndAtmosphere.tsx
apps/web/components/r3f/roadMaterials.ts
apps/web/components/r3f/TrafficDensityLayer.tsx
apps/web/components/r3f/Stage5SceneAssets.tsx
apps/web/components/r3f/useInterpolatedSimulationFrame.ts
apps/web/components/r3f/buildSceneSnapshot.ts
apps/web/components/r3f/assetManifest.ts
apps/web/components/r3f/SimulationOverlays.tsx
apps/web/lib/r3fTelemetry.ts
apps/web/lib/simulationSnapshot.ts
apps/web/public/simulation/r3f/assets/manifest.json
apps/web/public/simulation/r3f/assets/textures/PROVENANCE.md
docs/compliance/r3f-asset-licenses.md
docs/technotes/r3f-photoreal-dashboard-renderer.md
docs/launch-runbook.md
docs/ops/r3f-artifact-retention.md
docs/release/r3f-stage-checklist.md
scripts/optimize-r3f-assets.mjs
scripts/verify-r3f-assets.mjs
scripts/verify-r3f-dashboard.mjs
scripts/verify-r3f-performance.mjs
scripts/verify-r3f-visual-diff.mjs
```

## Task 0: Main Agent Shared Contracts

**Owner:** Main agent only.

**Files:**
- Create: `apps/web/components/r3f/stage6Quality.ts`
- Modify: `apps/web/components/r3f/SimulationCanvas.tsx`
- Modify: `apps/web/components/r3f/SimulationCanvas.test.tsx`
- Modify: `docs/technotes/r3f-photoreal-dashboard-renderer.md`

- [ ] **Step 1: Add a failing test for the shared quality contract**

Add assertions in `apps/web/components/r3f/SimulationCanvas.test.tsx`:

```ts
import { getStage6QualityPreset, STAGE6_QUALITY_PRESETS } from "./stage6Quality";

test("defines bounded Stage 6 quality presets", () => {
  expect(Object.keys(STAGE6_QUALITY_PRESETS)).toEqual(["low", "medium", "high", "ultra"]);
  expect(getStage6QualityPreset("ultra").maxDpr).toBeGreaterThan(getStage6QualityPreset("low").maxDpr);
  expect(getStage6QualityPreset("unknown").name).toBe("high");
  expect(getStage6QualityPreset("low").reflections).toBe("fake");
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
npm --workspace apps/web run test -- components/r3f/SimulationCanvas.test.tsx
```

Expected: fails with an import/module error for `./stage6Quality`.

- [ ] **Step 3: Define the shared quality contract**

Create `apps/web/components/r3f/stage6Quality.ts` with this public shape:

```ts
export type Stage6QualityPresetName = "low" | "medium" | "high" | "ultra";

export type Stage6QualityPreset = {
  name: Stage6QualityPresetName;
  postFx: "off" | "lite" | "standard" | "cinematic";
  reflections: "fake" | "planar-lite" | "planar" | "planar-high";
  weatherParticles: "off" | "lite" | "standard" | "dense";
  heroVehicleRadiusMeters: number;
  nearVehicleRadiusMeters: number;
  maxShadowCasters: number;
  maxDpr: number;
  targetFrameTimeMs: number;
};

export const STAGE6_QUALITY_PRESETS: Record<Stage6QualityPresetName, Stage6QualityPreset> = {
  low: {
    name: "low",
    postFx: "off",
    reflections: "fake",
    weatherParticles: "off",
    heroVehicleRadiusMeters: 0,
    nearVehicleRadiusMeters: 18,
    maxShadowCasters: 4,
    maxDpr: 1,
    targetFrameTimeMs: 40
  },
  medium: {
    name: "medium",
    postFx: "lite",
    reflections: "planar-lite",
    weatherParticles: "lite",
    heroVehicleRadiusMeters: 12,
    nearVehicleRadiusMeters: 28,
    maxShadowCasters: 8,
    maxDpr: 1.25,
    targetFrameTimeMs: 28
  },
  high: {
    name: "high",
    postFx: "standard",
    reflections: "planar",
    weatherParticles: "standard",
    heroVehicleRadiusMeters: 22,
    nearVehicleRadiusMeters: 42,
    maxShadowCasters: 14,
    maxDpr: 1.5,
    targetFrameTimeMs: 20
  },
  ultra: {
    name: "ultra",
    postFx: "cinematic",
    reflections: "planar-high",
    weatherParticles: "dense",
    heroVehicleRadiusMeters: 32,
    nearVehicleRadiusMeters: 58,
    maxShadowCasters: 24,
    maxDpr: 2,
    targetFrameTimeMs: 16.7
  }
};

export function getStage6QualityPreset(input: string | undefined): Stage6QualityPreset {
  const key = input?.toLowerCase();
  if (key === "low" || key === "medium" || key === "high" || key === "ultra") {
    return STAGE6_QUALITY_PRESETS[key];
  }
  return STAGE6_QUALITY_PRESETS.high;
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```powershell
npm --workspace apps/web run test -- components/r3f/SimulationCanvas.test.tsx
```

Expected: passes with the new shared quality contract.

- [ ] **Step 5: Document the shared contract**

Add a short "Stage 6 finishing wave contracts" section to `docs/technotes/r3f-photoreal-dashboard-renderer.md` covering:

```text
Quality presets are Low/Medium/High/Ultra.
Low favors stable fallback visuals.
High is the default review target.
Ultra is allowed only when visual and frame-time proof pass.
Feature-heavy effects must expose their active state to verifier telemetry.
```

- [ ] **Step 6: Validation**

Run:

```powershell
npm --workspace apps/web run test -- components/r3f/SimulationCanvas.test.tsx
git diff --check
```

Expected: focused test passes; diff check passes.

## Task 1: Worker 1 - Render/PostFX, Color Grading, CCTV Image Feel

**Worker scope:** PostFX, color grading, camera-image imperfections, and PostFX telemetry. Do not modify road geometry, vehicle LOD policy, asset manifest, weather particles, or visual diff scripts.

**Files:**
- Create: `apps/web/components/r3f/Stage6PostFX.tsx`
- Create: `apps/web/components/r3f/stage6PostFXPresets.ts`
- Modify: `apps/web/components/r3f/SimulationCanvas.tsx`
- Modify: `apps/web/components/r3f/SimulationCanvas.test.tsx`
- Modify: `apps/web/lib/r3fTelemetry.ts`

- [ ] **Step 1: Add PostFX preset definitions**

Create `stage6PostFXPresets.ts`:

```ts
import type { Stage6QualityPresetName } from "./stage6Quality";

export type Stage6PostFXPreset = {
  enabled: boolean;
  smaa: boolean;
  ssao: "off" | "lite" | "standard" | "dual";
  bloom: "off" | "signal-lite" | "headlight" | "cinematic";
  noiseOpacity: number;
  vignetteDarkness: number;
  toneMappingExposure: number;
  saturation: number;
  contrast: number;
  blackLevel: number;
  cctvCompressionNoise: number;
  scanlineOpacity: number;
  lensDistortion: number;
};

export const STAGE6_POSTFX_PRESETS: Record<Stage6QualityPresetName, Stage6PostFXPreset> = {
  low: {
    enabled: false,
    smaa: false,
    ssao: "off",
    bloom: "off",
    noiseOpacity: 0,
    vignetteDarkness: 0,
    toneMappingExposure: 1,
    saturation: 1,
    contrast: 1,
    blackLevel: 0,
    cctvCompressionNoise: 0,
    scanlineOpacity: 0,
    lensDistortion: 0
  },
  medium: {
    enabled: true,
    smaa: true,
    ssao: "lite",
    bloom: "signal-lite",
    noiseOpacity: 0.025,
    vignetteDarkness: 0.12,
    toneMappingExposure: 1.05,
    saturation: 0.96,
    contrast: 1.04,
    blackLevel: 0.015,
    cctvCompressionNoise: 0.035,
    scanlineOpacity: 0.025,
    lensDistortion: 0.01
  },
  high: {
    enabled: true,
    smaa: true,
    ssao: "standard",
    bloom: "headlight",
    noiseOpacity: 0.035,
    vignetteDarkness: 0.18,
    toneMappingExposure: 1.1,
    saturation: 0.94,
    contrast: 1.08,
    blackLevel: 0.025,
    cctvCompressionNoise: 0.045,
    scanlineOpacity: 0.035,
    lensDistortion: 0.015
  },
  ultra: {
    enabled: true,
    smaa: true,
    ssao: "dual",
    bloom: "cinematic",
    noiseOpacity: 0.045,
    vignetteDarkness: 0.24,
    toneMappingExposure: 1.16,
    saturation: 0.92,
    contrast: 1.12,
    blackLevel: 0.035,
    cctvCompressionNoise: 0.055,
    scanlineOpacity: 0.045,
    lensDistortion: 0.02
  }
};
```

- [ ] **Step 2: Add a Stage6PostFX component**

Create `Stage6PostFX.tsx` using `@react-three/postprocessing`. Include `EffectComposer`, `SMAA`, `SSAO`, `Bloom` or `SelectiveBloom` if the existing scene can provide selection refs, `ToneMapping`, `Noise`, and `Vignette`. Keep parameters driven by `STAGE6_POSTFX_PRESETS`. Do not add strong chromatic aberration.

- [ ] **Step 3: Mount PostFX through the shared quality preset**

In `SimulationCanvas.tsx`, derive the preset from a prop, environment value, or existing dashboard config path. Add proof metadata to the viewport or telemetry:

```text
data-r3f-quality-preset
data-r3f-postfx-enabled
data-r3f-postfx-chain
```

- [ ] **Step 4: Test preset and telemetry behavior**

Add focused tests in `SimulationCanvas.test.tsx`:

```ts
test("disables postprocessing for low quality and enables SMAA for high quality", () => {
  expect(STAGE6_POSTFX_PRESETS.low.enabled).toBe(false);
  expect(STAGE6_POSTFX_PRESETS.high.smaa).toBe(true);
  expect(STAGE6_POSTFX_PRESETS.high.ssao).toBe("standard");
});
```

- [ ] **Step 5: Validation**

Run:

```powershell
npm --workspace apps/web run test -- components/r3f/SimulationCanvas.test.tsx lib/r3fTelemetry.test.ts
npm run build:web
git diff --check
```

Expected: tests and build pass; PostFX state is inspectable without running a browser.

## Task 2: Worker 2 - Road PBR, Wet Reflection, Lighting, Signal Realism

**Worker scope:** Road material system, wet reflection zones, environment/lighting presets, and signal/head/streetlight emissive realism. Do not edit PostFX components, weather particle emitters, vehicle interpolation, visual diff scripts, or asset compression scripts.

**Files:**
- Modify: `apps/web/components/r3f/roadMaterials.ts`
- Modify: `apps/web/components/r3f/ProceduralIntersection.tsx`
- Modify: `apps/web/components/r3f/ApproachCorridors.tsx`
- Create: `apps/web/components/r3f/WetRoadReflectors.tsx`
- Modify: `apps/web/components/r3f/EnvironmentLayer.tsx`
- Modify: `apps/web/components/r3f/LightingRig.tsx`
- Modify: `apps/web/components/r3f/SignalHardware.tsx`
- Modify: `apps/web/components/r3f/SignalLayer.tsx`
- Modify: `apps/web/components/r3f/SimulationCanvas.test.tsx`

- [ ] **Step 1: Expand road material contract**

In `roadMaterials.ts`, expose named materials for:

```text
asphalt
wetAsphalt
lanePaint
crosswalkPaint
curbConcrete
sidewalkConcrete
puddleMask
roadEdgeGrime
```

Each material must declare where it uses scalar values versus texture maps:

```ts
type Stage6RoadMaterialMapCoverage = {
  baseColor: "scalar" | "texture";
  normal: "missing" | "texture";
  roughness: "scalar" | "texture";
  ao: "missing" | "texture";
};
```

- [ ] **Step 2: Add missing-map fallback behavior**

Where normal or AO maps are not present yet, keep the material usable with explicit `missing` metadata rather than pretending full PBR coverage exists.

- [ ] **Step 3: Add local wet reflection zones**

Create `WetRoadReflectors.tsx`. It should render planar or `MeshReflectorMaterial` zones only for the intersection center, stop bars, and crosswalk-adjacent wet patches. Low quality must use the existing fake wet sheen fallback.

- [ ] **Step 4: Tune lighting presets**

In `EnvironmentLayer.tsx` and `LightingRig.tsx`, define day, cloudy, rain, and night presets with explicit:

```text
environment intensity
ambient/hemisphere balance
streetlight intensity
signal lens emissive scale
headlight response target
fog/haze pairing
```

- [ ] **Step 5: Improve signal realism**

In `SignalHardware.tsx`, separate housing, hood, lens glass, and emissive core materials. Keep red/yellow/green state data-driven. Add amber bloom eligibility without making all signal housing glow.

- [ ] **Step 6: Validation**

Run:

```powershell
npm --workspace apps/web run test -- components/r3f/SimulationCanvas.test.tsx components/DashboardShell.test.tsx
npm run build:web
git diff --check
```

Expected: tests/build pass; wet reflection path is gated by quality; signal state remains data-driven.

## Task 3: Worker 3 - Vehicle Materials, LOD Policy, Animation Smoothing

**Worker scope:** Vehicle material overrides, hero/near/mid/far LOD policy, high-quality GLB distance gates, brake/emergency light behavior, and SUMO-frame smoothing. Do not edit asset files directly, manifest provenance rules, PostFX, road materials, or verifier scripts.

**Files:**
- Modify: `apps/web/components/r3f/TrafficDensityLayer.tsx`
- Modify: `apps/web/components/r3f/Stage5SceneAssets.tsx`
- Modify: `apps/web/components/r3f/assetManifest.ts`
- Modify: `apps/web/components/r3f/useInterpolatedSimulationFrame.ts`
- Modify: `apps/web/components/r3f/useInterpolatedSimulationFrame.test.ts`
- Modify: `apps/web/components/r3f/buildSceneSnapshot.ts`
- Modify: `apps/web/lib/simulationSnapshot.ts`
- Modify: `apps/web/components/r3f/SimulationCanvas.test.tsx`

- [ ] **Step 1: Define runtime LOD policy**

Add a code-level policy:

```ts
export type Stage6VehicleLodTier = "hero" | "near" | "mid" | "far";

export type Stage6VehicleLodDecision = {
  tier: Stage6VehicleLodTier;
  useHighQualityGlb: boolean;
  castRealShadow: boolean;
  useGlassMaterial: boolean;
  useEmissiveLights: boolean;
};
```

Decision rules:

```text
hero: emergency or operator-relevant vehicle within heroVehicleRadiusMeters
near: precise vehicle within nearVehicleRadiusMeters
mid: precise vehicle outside near radius or density-eligible medium GLB
far: density segment proxy, billboard, or silhouette only
```

- [ ] **Step 2: Improve vehicle material response**

Add material overrides or manifest-driven material tags for:

```text
paint clearcoat-like response
glass roughness/opacity
tire roughness and dark nonmetal response
brake light emissive
headlight emissive
emergency light emissive pulse
```

Lights may be animated visually, but they must not invent traffic truth.

- [ ] **Step 3: Smooth authoritative motion**

In `useInterpolatedSimulationFrame.ts`, keep interpolation based on `sim_time_seconds`. Add bounded heading smoothing and lane-change smoothing:

```text
heading: interpolate shortest angular path
lane change: damp lateral offset only between authoritative positions
stale fallback: freeze or short-extrapolate within existing stale threshold, then mark stale
```

- [ ] **Step 4: Add tests for LOD and smoothing**

Add tests:

```ts
test("keeps high-quality GLB usage close to the camera", () => {
  expect(decideStage6VehicleLod({ distanceMeters: 8, emergency: false }, STAGE6_QUALITY_PRESETS.high).tier).toBe("hero");
  expect(decideStage6VehicleLod({ distanceMeters: 90, emergency: false }, STAGE6_QUALITY_PRESETS.high).tier).toBe("far");
});

test("interpolates heading through the shortest angular path", () => {
  expect(interpolateHeadingDegrees(350, 10, 0.5)).toBeCloseTo(0, 1);
});
```

- [ ] **Step 5: Validation**

Run:

```powershell
npm --workspace apps/web run test -- components/r3f/useInterpolatedSimulationFrame.test.ts components/r3f/SimulationCanvas.test.tsx components/DashboardShell.test.tsx
npm run build:web
git diff --check
```

Expected: motion tests pass; fixture fallback remains deterministic; precise vehicle truth remains frame-derived.

## Task 4: Worker 4 - Weather, CCTV Overlay, Camera Composition, Scene Clutter

**Worker scope:** Rain streaks, splash/wheel spray runtime layers, fog/haze tuning, CCTV overlay presentation, subtle camera shake, road-detail props, scene clutter, and responsive camera composition. Do not edit PostFX presets, vehicle interpolation, asset compression, or verifier logic.

**Files:**
- Modify: `apps/web/components/r3f/WeatherAndAtmosphere.tsx`
- Create: `apps/web/components/r3f/RainParticleLayer.tsx`
- Create: `apps/web/components/r3f/WheelSprayLayer.tsx`
- Create: `apps/web/components/r3f/RoadDetailProps.tsx`
- Create: `apps/web/components/r3f/SceneClutterLayer.tsx`
- Create: `apps/web/components/r3f/CameraRig.tsx`
- Modify: `apps/web/components/r3f/SimulationScene.tsx`
- Modify: `apps/web/components/r3f/SimulationOverlays.tsx`
- Modify: `apps/web/components/r3f/SimulationCanvas.tsx`
- Modify: `apps/web/components/r3f/SimulationCanvas.test.tsx`
- Modify: `apps/web/components/DashboardShell.test.tsx`

- [ ] **Step 1: Move camera logic into CameraRig**

Extract the current camera positioning into `CameraRig.tsx`. Preserve existing responsive behavior and expose named presets:

```text
operatorWide
nightRainClose
mobileWide
proofDeterministic
```

- [ ] **Step 2: Add weather layers**

Create `RainParticleLayer.tsx` and `WheelSprayLayer.tsx` with quality-gated counts:

```text
low: off
medium: sparse streaks, no wheel spray
high: streaks plus light wheel spray
ultra: dense streaks, splash sprites, wheel spray
```

Particle layers must not resize layout or create DOM overlays.

- [ ] **Step 3: Add CCTV overlay presentation**

In `SimulationOverlays.tsx`, add simulation timestamp, camera id, source mode, stale state, and subtle camera-effect labels. Keep safety copy clear that this is virtual/simulation CCTV, not a live feed.

- [ ] **Step 4: Add subtle shake without changing truth**

Add tiny deterministic camera shake only in rain/night presentation modes. The effect must be disabled in visual regression deterministic mode.

- [ ] **Step 5: Add road detail and scene clutter layers**

Use existing manifest-backed props first:

```text
bollards
traffic cones
guardrails
road signs
sidewalk slabs
trees
street lamps
building silhouettes
billboards without real brand claims
pedestrian silhouettes
distant city blocks
```

If an asset is missing, render a simple procedural proxy only when it reads as background clutter and is labeled in implementation notes.

- [ ] **Step 6: Validation**

Run:

```powershell
npm --workspace apps/web run test -- components/r3f/SimulationCanvas.test.tsx components/DashboardShell.test.tsx
npm run build:web
git diff --check
```

Expected: camera remains responsive; overlays retain safety copy; visual regression mode disables nondeterministic shake.

## Task 5: Worker 5 - Asset Pipeline, ImageGen, Runtime Texture/Asset Generation

**Worker scope:** Runtime texture/decal/sprite creation, ImageGen source handling, GLB/KTX2/Draco/Meshopt pipeline, manifest/provenance updates, and asset validation. Do not edit renderer runtime code except `assetManifest.ts` types when the manifest schema requires it.

**Files:**
- Modify: `apps/web/public/simulation/r3f/assets/manifest.json`
- Modify: `apps/web/public/simulation/r3f/assets/textures/PROVENANCE.md`
- Modify: `docs/compliance/r3f-asset-licenses.md`
- Modify: `apps/web/components/r3f/assetManifest.ts`
- Modify: `scripts/verify-r3f-assets.mjs`
- Modify: `scripts/optimize-r3f-assets.mjs`
- Add generated files under: `apps/web/public/simulation/r3f/assets/textures/`
- Add generated files under: `apps/web/public/simulation/r3f/assets/sprites/`
- Add optimized files under: `apps/web/public/simulation/r3f/assets/glb/` only when produced from approved project-authored or licensed sources.

- [ ] **Step 1: Define asset generation queue**

Generate or create source assets in this priority order:

```text
wet asphalt normal map
asphalt AO/ORM map
lane paint roughness/wear map
crosswalk worn alpha/roughness map
curb concrete normal/grime map
puddle mask atlas
rain streak sprite sheet
splash sprite sheet
wheel spray sprite sheet
distant city billboard texture without real brand claims
pedestrian silhouette atlas
road sign and guardrail decal atlas
```

- [ ] **Step 2: Use ImageGen correctly**

For generated bitmap assets, use built-in `image_gen` by default. Persist project-bound results under `apps/web/public/simulation/r3f/assets/` and record:

```text
generation mode
prompt summary
date
asset role
runtime path
license/authorship note
whether the image is runtime-shipped or reference-only
```

Never leave a runtime asset only under `$CODEX_HOME/generated_images`.

- [ ] **Step 3: Add manifest fields for richer PBR coverage**

Ensure each generated asset declares:

```text
id
path
kind
source
license
pbr
lod
maxTextureSize
maxFileSizeBytes
pbrChannels
compression
provenanceEvidencePath
runtimeUsage
```

- [ ] **Step 4: Harden GLB and texture checks**

Update `verify-r3f-assets.mjs` and `optimize-r3f-assets.mjs` so they check:

```text
normal/roughness/ao map presence when a material claims full PBR coverage
runtime textures exist
sprites are power-of-two or documented as intentionally non-POT
GLB payload budget remains under existing first-pass limit
LOD chain has hero/near/mid/far or explicit missing-tier reason
compression status is declared for every runtime asset
```

- [ ] **Step 5: KTX2/Draco/Meshopt handling**

Run existing no-install checks first:

```powershell
npm --workspace apps/web exec gltf-transform -- --version
node scripts/optimize-r3f-assets.mjs --check
node scripts/verify-r3f-assets.mjs
```

If KTX2, Draco, Meshopt, Blender, or third-party asset downloads are required, stop with `BLOCKED` and report the exact command/tool needed. Do not install.

- [ ] **Step 6: Validation**

Run:

```powershell
npm --workspace apps/web exec gltf-transform -- --version
node scripts/optimize-r3f-assets.mjs --check
node scripts/verify-r3f-assets.mjs
npm run build:web
git diff --check
```

Expected: asset verifier passes; provenance docs explain generated versus runtime assets; no unclear third-party asset ships.

## Task 6: Worker 6 - Quality Presets, Visual Regression, Telemetry, Docs, Integration QA

**Worker scope:** Verifier gates, performance telemetry, visual regression, fixed scenarios, runbook/docs, artifact policy, and final integration QA. Do not directly implement renderer features owned by Workers 1-5 unless the main agent explicitly transfers ownership.

**Files:**
- Modify: `scripts/verify-r3f-dashboard.mjs`
- Create: `scripts/verify-r3f-performance.mjs`
- Create: `scripts/verify-r3f-visual-diff.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/r3f-dashboard-verify.yml`
- Modify: `apps/web/lib/r3fTelemetry.ts`
- Modify: `docs/launch-runbook.md`
- Modify: `docs/technotes/r3f-photoreal-dashboard-renderer.md`
- Modify: `docs/ops/r3f-artifact-retention.md`
- Modify: `docs/release/r3f-stage-checklist.md`

- [ ] **Step 1: Extend telemetry payload**

Ensure `artifacts/r3f-dashboard-details.json` records:

```json
{
  "qualityPreset": "high",
  "postFx": {
    "enabled": true,
    "chain": ["SMAA", "SSAO", "Bloom", "ToneMapping", "Noise", "Vignette"]
  },
  "heavyFeatures": {
    "planarReflection": true,
    "weatherParticles": true,
    "highQualityVehicles": 0,
    "shadowCasters": 0
  },
  "performance": {
    "drawCalls": 0,
    "frameTimeMs": null,
    "visibleVehicles": 0,
    "textureMemoryEstimateMb": null
  }
}
```

Use actual values from DOM attributes or browser-side telemetry. Do not fabricate numbers.

- [ ] **Step 2: Add fixed visual scenarios**

Make the dashboard verifier capture deterministic screenshots for:

```text
day/high
night/high
rain/high
rain/low fallback
mobile/rain/high
webgl-off fallback
```

Each scenario must include source label, safety copy, no-overflow evidence, and nonblank canvas proof.

- [ ] **Step 3: Add visual diff gate**

Create `verify-r3f-visual-diff.mjs` with deterministic baseline comparison. The first implementation may use perceptual image metrics already available in the repo environment; if no image diff dependency exists, use pixel histogram and structural nonblank checks without adding a dependency.

- [ ] **Step 4: Add performance gate**

Create `verify-r3f-performance.mjs` or extend the dashboard verifier to fail when:

```text
draw calls exceed 250
normal draw calls exceed 180 in high preset
visible vehicle count is missing
postFX active state is missing
reflection active state is missing
stale frame label is missing for stale source
```

- [ ] **Step 5: Update docs and runbook**

Document:

```text
how to run photoreal mode
how to choose quality preset
what Low/Medium/High/Ultra enable
how ImageGen assets enter the repo
which artifacts prove runtime behavior
why screenshots are browser proof, not live CCTV proof
how to handle missing KTX2/Blender/third-party asset tools
```

- [ ] **Step 6: Validation**

Run:

```powershell
node scripts/verify-r3f-assets.mjs
node scripts/verify-r3f-dashboard.mjs
npm run verify:security
npm run verify
git diff --check
```

Expected: verifier artifacts are inspectable; docs do not overclaim; security gate remains green or reports approved blocked tooling honestly.

## Task 7: Main Agent Final Integration And Review Gate

**Owner:** Main agent only after Workers 1-6 report.

**Files:**
- All files changed by accepted worker reports.
- `plan.md` only if the user asks to update active task status.

- [ ] **Step 1: Collect worker evidence**

For each worker, require:

```text
status
what was inspected
what changed
files changed
tests/checks run
artifact paths
remaining risks
conflicts or shared-file edits
```

- [ ] **Step 2: Run spec-compliance review**

Assign a fresh reviewer with:

```text
review type: spec-compliance
scope: this plan, worker reports, git diff
required verdict: APPROVED or CHANGES_REQUESTED
```

- [ ] **Step 3: Run code-quality/security/artifact-hygiene review**

Assign a fresh reviewer with:

```text
review type: code-quality, regression-risk, security-risk, artifact-hygiene
scope: changed files, generated assets, verifier scripts, docs
required verdict: APPROVED or CHANGES_REQUESTED
```

- [ ] **Step 4: Run full validation**

Run:

```powershell
npm run test:api
npm --workspace apps/web run test
npm run build:web
npm run verify:r3f-assets
npm run verify:r3f-dashboard
npm run verify:security
npm run verify
git diff --check
```

If scripts added by this plan exist, also run:

```powershell
npm run verify:r3f-performance
npm run verify:r3f-visual-diff
node scripts/optimize-r3f-assets.mjs --check
```

- [ ] **Step 5: Browser proof acceptance**

Before claiming completion, collect:

```text
desktop /dashboard screenshot
mobile /dashboard screenshot
canvas-only proof
webgl-off fallback proof
rain/high scenario proof
night/high scenario proof
rain/low fallback proof
artifacts/r3f-dashboard-details.json
```

- [ ] **Step 6: Stop before external side effects**

If the user wants commit/push, ask separately after validation passes and stage only the intended files. This plan does not authorize commit or push.

## Worker Prompt Template

Use this shape for each implementation worker:

```md
Role:
You are a worker agent reporting to the primary agent. Do not act as the primary agent, create additional workers, or claim the overall task is complete.

Task:
Implement Task N from docs/superpowers/plans/2026-06-19-r3f-photoreal-finishing-wave.md.

Scope:
- Own only the files listed under Task N.
- Do not edit shared files outside the listed scope.
- If you need a high-conflict file not listed for your task, report NEEDS_CONTEXT first.

Context:
- R3F/WebGL remains the renderer.
- SimulationFrameSnapshot is the truth boundary.
- ImageGen assets are allowed only with repo provenance and browser proof.
- No live CCTV or real signal control claims.

Constraints:
- Use applicable AGENTS.md, Superpowers, and karpathy-guidelines.
- Use TDD for code changes.
- Do not revert user changes.
- Do not install tools, download third-party assets, commit, push, deploy, or touch archive/.

Return:
- What you inspected
- What you changed
- Tests/checks run with exit code
- Artifact paths
- Evidence the assigned scope is complete
- Remaining risks or conflicts
- Status: DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED
```

## Visual Acceptance Criteria

The finishing wave is not accepted unless fresh browser proof shows:

- wet asphalt with visible roughness/reflection variation, not a flat dark plane
- worn lane paint, crosswalk wear, curb grime, sidewalk variation
- local puddle or planar reflection zones at stop bars/crosswalk/intersection center
- realistic signal housings, lens glow, and restrained red/yellow/green bloom
- vehicle paint/glass/tire/brake/emergency lights with close-vehicle quality bias
- visible rain/fog/haze/wheel-spray cues in rain preset
- CCTV timestamp/camera id/source/stale labels without claiming real CCTV
- stable composition on desktop and mobile
- city-edge clutter that increases scale without obscuring traffic truth
- Low preset degrades heavy features while remaining stable and inspectable

## Final Report Required Fields

After implementation, report:

```text
Status: PASS or BLOCKED
Changed files
Worker verdicts
Reviewer verdicts
Validation commands with exit codes
Browser/artifact proof paths
Telemetry summary
Accepted risks
Commit/push: not performed unless explicitly approved in that implementation turn
```

## Self-Review

- Spec coverage: all original user owner requests are mapped in the coverage table.
- Scope control: six workers own non-overlapping primary domains; high-conflict files are sequenced by the main agent.
- Truth boundary: precise vehicles remain `SimulationFrameSnapshot.vehicles`; aggregate traffic remains `density_segments` or labeled fixture fallback.
- Image policy: ImageGen/ChatGPT Image 2.0 is allowed for source assets, with workspace persistence and provenance required before runtime use.
- Verification: focused tests, full tests, build, asset verifier, dashboard verifier, security verifier, visual/performance gates, and browser proof are required before completion.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-19-r3f-photoreal-finishing-wave.md`. Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per worker track, review between tracks, then integrate centrally.
2. **Inline Execution** - execute tasks in this session using `superpowers:executing-plans`, with checkpoints after each task.

This plan does not authorize commits, pushes, installs, downloads, deployments, or archive changes.
