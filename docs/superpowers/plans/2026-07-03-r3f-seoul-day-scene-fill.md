# R3F Seoul Day-Scene Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The no-parameter `/dashboard` day scene has zero empty ground/periphery inside the operator-wide + limited-orbit view, everything added reads photoreal, and the app is pinned to Seoul only.

**Architecture:** A new `GroundDressingLayer` (base ground plane + sidewalk/curb/apron instanced batches + 4 corner plaza plates + filtered city-edge blocks) and a new `StreetFurnitureLayer` (GLB streetlights/trees/benches + `RoadDetailProps`) mount into the photobash default tree. Textures come from recompression-freed budget + a small imagegen atlas set. Distant boxes get per-footprint vertex-color tints; marking decals gain manhole/wear kinds; a few hero rooftop textures get regenerated for variety. Telemetry attrs derived from unmounted layers are rewired to the newly-mounted real layers with the verifier updated in the same change.

**Tech Stack:** Next.js (non-standard), React Three Fiber, three BufferGeometryUtils, vitest (r3f tests call components as plain functions), sharp (recompression), codex exec imagegen, Playwright verify harness.

**Spec:** `docs/superpowers/specs/2026-07-03-r3f-seoul-day-scene-fill-design.md`

## Global Constraints

- **NEVER modify `getInboundLaneOffset`.**
- **URL params kept working:** `r3fQuality`, `r3fWeather`, `r3fTimeOfDay`, `guide`, `viewpoint`, `roadonly`, `r3fCameraPreset`/`cameraPreset`. `?roadonly=1` must keep producing a clean road+decals alignment base (new ground/furniture layers stay OUT of roadonly renders).
- **Asset gate stays 25 MB** (`scripts/verify-r3f-assets.mjs:102`, sums ALL manifest-referenced .glb+image files, deduped). If recompression + new textures cannot fit, STOP and report — do not raise the limit. (Note: `optimize-r3f-assets.mjs` has a *different* 25 MB accumulator over 19 hardcoded ids — the binding gate is verify-r3f-assets.)
- **No gate weakening.** Draw-call budgets 900 peak / 180 high, visual-diff thresholds, and all dashboard assertions keep their strength. Task 1's measurement fix is a strengthening (making a blind check real) — allowed. Telemetry rewires must keep verifier checks REAL (assert against actually-rendered content).
- **Do NOT mount** `StaticRoadLayer`, `Stage5SceneAssets`, or `SceneClutterLayer` components (test-locked / vehicle-duplicating / retired). Reuse their exported DATA only. `SimulationScene.test.tsx:100` (`expect(names).not.toContain("StaticRoadLayer")`) stays.
- The photobash composition stays the default scene (apps/web/AGENTS.md locked decisions). No plate-era reintroduction.
- Visual verdicts go through codex CLI (`/home/chan/.local/bin/codex exec "…" --image …`), never self-Read.
- Imagegen via `codex exec` with the built-in image_gen skill; parallel runs need per-run unique output dirs (see `scratchpad/run_hero_imagegen.sh` for the proven prompt/copy/SAVED-line pattern).
- apps/web is NON-STANDARD Next.js: read `node_modules/next/dist/docs/` before touching any Next API (this plan is client-components only — none expected).
- Bilingual ko/en dashboard copy per existing `locale === "ko" ? … : …` patterns.
- `cd apps/web && npx vitest run` green before every commit. Stage SPECIFIC paths; never `git add -A` (scratchpad/, tmp/, output/ stay out).
- Branch `feat/r3f-seoul-day-scene-fill`. Commit trailers (both lines):
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01XQkJeTkSjyEwLiMuMHvEgv`

---

### Task 1: Trustworthy draw-call measurement + baseline

**Files:**
- Modify: `scripts/verify-r3f-performance.mjs:48-66` (readPerformance)
- Modify: `scripts/verify-r3f-dashboard.mjs:991-995` (drawCalls selection)
- No app code.

**Interfaces:**
- Consumes: `artifacts/r3f-dashboard-details.json` fields `performance.drawCalls`, `renderer.peakDrawCalls` (both already written by the dashboard harness).
- Produces: a trusted `BASELINE_PEAK_DRAW_CALLS` number recorded in `.superpowers/sdd/progress.md` that Tasks 3-7 compare against.

**Why:** `SimulationCanvas` runs `frameloop="demand"`; the harness's manual proof publish can sample `renderer.info.render.calls` on a near-empty frame, so `performance.drawCalls` can read `1` — and verify-r3f-performance's only floor is `> 0`, so the 900-budget check silently passes blind. `renderer.peakDrawCalls` already folds the WebGL-instrumented per-frame max (`webglDrawCallInstrumentation`, verify-r3f-dashboard.mjs:768-822) and is trustworthy.

- [ ] **Step 1: Fix the selection in verify-r3f-dashboard.mjs**

At lines 991-995, `drawCalls` prefers the potentially-premature `rendererInfoCalls` over the instrumented max. Change:

```js
const drawCalls = Number.isFinite(Number(rendererInfoCalls))
  ? Number(rendererInfoCalls)
  : instrumentedDrawCalls;
```

to

```js
// A demand-frameloop proof publish can sample a near-empty frame (calls=1).
// The instrumented per-frame max is the floor of truth: never report less.
const drawCalls = Math.max(
  Number.isFinite(Number(rendererInfoCalls)) ? Number(rendererInfoCalls) : 0,
  instrumentedDrawCalls
);
```

- [ ] **Step 2: Fix readPerformance in verify-r3f-performance.mjs**

In `readPerformance()` (lines 48-66), where it pulls `details.performance.drawCalls ?? details.renderer.drawCalls`, use the peak field as the authoritative source and add a sanity floor:

```js
const drawCalls = numberOrNull(
  Math.max(
    Number(performance.drawCalls ?? 0),
    Number(renderer.peakDrawCalls ?? 0),
    Number(renderer.drawCalls ?? 0)
  ) || null
);
```

And strengthen the peak check (lines 168-174): add a floor so a near-empty sample can never pass —

```js
addCheck(
  "draw calls stay under peak budget",
  performance.drawCalls !== null &&
    performance.drawCalls >= 50 &&
    performance.drawCalls <= maxPeakDrawCalls,
  `drawCalls=${performance.drawCalls ?? "missing"} / ${maxPeakDrawCalls} (floor 50: a real scene cannot render in fewer)`
);
```

(Adapt variable names to the actual local shape in the file — `readPerformance` returns an object consumed as `performance`.)

- [ ] **Step 3: Regenerate details + run the gate**

Run: `npm run verify:r3f-dashboard` (≈7 min) then `npm run verify:r3f-performance`.
Expected: PASS (or PASS_WITH_CONCERNS for headless-rAF frame-time only). Note the reported drawCalls — this is the baseline; it should be in the ~500-700 range (last credible peak was 574), NOT 1.

- [ ] **Step 4: Record the baseline**

Append to `.superpowers/sdd/progress.md`: `BASELINE_PEAK_DRAW_CALLS=<value> (Task 1, day-fill plan)`.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-r3f-performance.mjs scripts/verify-r3f-dashboard.mjs
git commit -m "fix(verify): draw-call gate reads the instrumented peak, not a demand-frame sample"
```

---

### Task 2: Recompress hero textures to free asset budget

**Files:**
- Modify: `apps/web/public/simulation/r3f/assets/textures/hero/*.webp` (in place)
- Modify: `apps/web/public/simulation/r3f/assets/manifest.json` (only if hero entries carry size/compression fields — inspect first)
- Create: `scratchpad/recompress-hero.mjs` (throwaway sharp script — NOT committed)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: ≥5 MB free under the verify-r3f-assets 25 MB accumulator (report exact number), with codex A/B PASS.

- [ ] **Step 1: Measure current usage + hero resolution profile**

```bash
node scripts/verify-r3f-assets.mjs 2>&1 | grep -i "payload\|budget" | head -5
cd apps/web/public/simulation/r3f/assets/textures/hero
node -e "const s=require('sharp');const fs=require('fs');(async()=>{for(const f of fs.readdirSync('.').filter(f=>f.endsWith('.webp')).slice(0,10)){const m=await s(f).metadata();console.log(f,m.width+'x'+m.height,(fs.statSync(f).size/1024|0)+'KB')}})()"
```

Record before-state. Also check how hero files are declared: `grep -c hero apps/web/public/simulation/r3f/assets/manifest.json`.

- [ ] **Step 2: Resolution-fit + re-encode with sharp (scratchpad script)**

Write `scratchpad/recompress-hero.mjs`: for every `hero/*.webp`, if width > 768 resize to width 768 (keep aspect), re-encode webp `{ quality: 72 }`, write to a sibling `hero-recompressed/` dir first (never destructive in step 1 of the loop). Print per-file and total savings.

```js
import sharp from "sharp";
import { readdirSync, statSync, mkdirSync } from "fs";
const SRC = "apps/web/public/simulation/r3f/assets/textures/hero";
const OUT = "scratchpad/hero-recompressed";
mkdirSync(OUT, { recursive: true });
let before = 0, after = 0;
for (const f of readdirSync(SRC).filter((f) => f.endsWith(".webp"))) {
  const src = `${SRC}/${f}`;
  before += statSync(src).size;
  const img = sharp(src);
  const meta = await img.metadata();
  const pipeline = meta.width > 768 ? img.resize({ width: 768 }) : img;
  await pipeline.webp({ quality: 72 }).toFile(`${OUT}/${f}`);
  after += statSync(`${OUT}/${f}`).size;
}
console.log(`before=${(before / 1048576).toFixed(2)}MB after=${(after / 1048576).toFixed(2)}MB saved=${((before - after) / 1048576).toFixed(2)}MB`);
```

Run: `node scratchpad/recompress-hero.mjs` (sharp is already a repo dependency — verify with `npm ls sharp`; if missing at root, run from `apps/web`).

- [ ] **Step 3: Swap in, rebuild, codex A/B**

Copy recompressed files over the originals (`cp scratchpad/hero-recompressed/*.webp apps/web/public/simulation/r3f/assets/textures/hero/`), run `npm run verify:r3f-dashboard`, then codex-compare the fresh day screenshot against the pre-swap one (`git show HEAD:artifacts/r3f-dashboard-scenario-day-high.png > /tmp/claude-1000/day-before.png` — adjust to your scratchpad):

```bash
/home/chan/.local/bin/codex exec "Compare these two renders of the same 3D scene. Image 1 = before texture recompression, image 2 = after. Report PER-BUILDING any visible quality loss: blur, banding, blocking, washed-out signage. Verdict: PASS (no visible loss at this viewing distance) or FAIL with the affected regions." --image <before.png> --image artifacts/r3f-dashboard-scenario-day-high.png
```

If codex names degraded buildings: restore ONLY those files from git (`git checkout -- <specific hero files>`), re-run, re-review.

- [ ] **Step 4: Confirm budget + suite, commit**

Run: `node scripts/verify-r3f-assets.mjs` → record new total; expected ≥5 MB free (if <5 MB, iterate quality 68 / width 640 on the LARGEST files only, re-review). `cd apps/web && npx vitest run` → PASS.

```bash
git add apps/web/public/simulation/r3f/assets/textures/hero
git commit -m "perf(assets): resolution-fit + re-encode hero facades — frees budget for ground/periphery textures"
```

---

### Task 3: `GroundDressingLayer` — base ground, sidewalks, curbs, apron

**Files:**
- Create: `apps/web/components/r3f/instancedBatches.tsx` (extracted from ApproachCorridors)
- Modify: `apps/web/components/r3f/ApproachCorridors.tsx` (import batches from the new module; delete local copies)
- Modify: `apps/web/components/r3f/roadGeometry.ts` (move `CITY_GROUND_APRON` here, export it)
- Create: `apps/web/components/r3f/GroundDressingLayer.tsx`
- Modify: `apps/web/components/r3f/SimulationScene.tsx` (mount)
- Test: `apps/web/components/r3f/GroundDressingLayer.test.tsx`, modify `SimulationScene.test.tsx`

**Interfaces:**
- Consumes: `CURB_SEGMENTS`, `SIDEWALK_SLABS` (roadGeometry.ts:305/332, already exported), `useStage5RoadMaterials()` (roadMaterials.ts:291 — sidewalk/curb/cityGround entries already texture-augmented).
- Produces: `export const GroundDressingLayer` (memo, displayName `"GroundDressingLayer"`), props `{ isNight?: boolean }`. `instancedBatches.tsx` exports `InstancedPlaneBatch`, `InstancedBoxBatch` with the exact prop signatures they have today in ApproachCorridors.tsx:256-354. Task 5 adds plates/textures onto this layer; Task 6 adds edge blocks into it.

- [ ] **Step 1: Failing tests first**

In `SimulationScene.test.tsx`, extend the default-scene test (the one at :90-101) with `expect(names).toContain("GroundDressingLayer");` and extend the roadonly test with `expect(names).not.toContain("GroundDressingLayer");` (roadonly must stay a clean alignment base).

Create `GroundDressingLayer.test.tsx` following the plain-function-call idiom of this codebase's r3f tests (no render pass — hooks like useStage5RoadMaterials CAN'T run; so structure the component with a hook-free outer component delegating materials to an inner `<Suspense>` child, mirroring how BuildingLayer tests assert structure — read `MarkingDecalLayer.test.tsx` for the collect-mesh idiom first):

```tsx
import { describe, expect, test } from "vitest";
import { GROUND_DRESSING_BATCHES } from "./GroundDressingLayer";
import { CURB_SEGMENTS, SIDEWALK_SLABS, CITY_GROUND_APRON } from "./roadGeometry";

describe("GroundDressingLayer batches", () => {
  test("covers base ground + sidewalks + curbs + apron with instanced batches", () => {
    const names = GROUND_DRESSING_BATCHES.map((b) => b.name);
    expect(names).toContain("ground-dressing-base-plane");
    expect(names).toContain("ground-dressing-sidewalk-slabs");
    expect(names).toContain("ground-dressing-curbs");
    expect(names).toContain("ground-dressing-city-apron");
    const sidewalks = GROUND_DRESSING_BATCHES.find((b) => b.name === "ground-dressing-sidewalk-slabs");
    expect(sidewalks?.specs).toBe(SIDEWALK_SLABS);
    const curbs = GROUND_DRESSING_BATCHES.find((b) => b.name === "ground-dressing-curbs");
    expect(curbs?.specs).toBe(CURB_SEGMENTS);
  });
  test("base plane is large enough to kill the sky-dome ground void and sits under the road", () => {
    const base = GROUND_DRESSING_BATCHES.find((b) => b.name === "ground-dressing-base-plane");
    expect(base?.specs[0].size[0]).toBeGreaterThanOrEqual(700);
    expect(base?.specs[0].position[1]).toBeLessThan(0);
  });
});
```

Run: `cd apps/web && npx vitest run components/r3f/GroundDressingLayer.test.tsx components/r3f/SimulationScene.test.tsx` → FAIL (module missing / names absent).

- [ ] **Step 2: Extract `instancedBatches.tsx`**

Move `InstancedPlaneBatch` (ApproachCorridors.tsx:256-304) and `InstancedBoxBatch` (:306-354) verbatim into the new module, exported, importing their types (`PlaneBatchSpec`/`PlanePrimitiveSpec`/`BoxPrimitiveSpec`, `RoadMaterialProps`) from their current homes. ApproachCorridors imports them back — its own rendering and tests must stay identical. Also move `CITY_GROUND_APRON` (ApproachCorridors.tsx:33-39) to `roadGeometry.ts` as an exported const and re-import it in ApproachCorridors. While in `instancedBatches.tsx`, extend the material prop type locally: `type BatchMaterial = RoadMaterialProps & { map?: Texture }` and spread `map` onto the `<meshStandardMaterial>` — Task 5/6 need textured batches.

- [ ] **Step 3: Implement `GroundDressingLayer.tsx`**

```tsx
"use client";

import { memo, Suspense } from "react";
import { CITY_GROUND_APRON, CURB_SEGMENTS, SIDEWALK_SLABS } from "./roadGeometry";
import { InstancedBoxBatch, InstancedPlaneBatch } from "./instancedBatches";
import { useStage5RoadMaterials } from "./roadMaterials";

// Single big plane under everything: kills the sky-dome ground void in one
// draw call. Sits below road asphalt; sidewalk/curb batches add near-road
// definition on top. Photoreal maps arrive in Task 5 (imagegen atlas); until
// then the stage5 material set's sidewalk/cityGround textures apply.
export const GROUND_DRESSING_BATCHES = [
  { name: "ground-dressing-base-plane", kind: "plane" as const, materialKey: "cityGround" as const,
    specs: [{ id: "ground-base", position: [0, -0.06, 0] as [number, number, number], size: [720, 720] as [number, number] }] },
  { name: "ground-dressing-city-apron", kind: "plane" as const, materialKey: "cityGround" as const, specs: CITY_GROUND_APRON },
  { name: "ground-dressing-sidewalk-slabs", kind: "box" as const, materialKey: "sidewalk" as const, specs: SIDEWALK_SLABS },
  { name: "ground-dressing-curbs", kind: "box" as const, materialKey: "curb" as const, specs: CURB_SEGMENTS },
];

function GroundDressingContent() {
  const roadMaterials = useStage5RoadMaterials();
  return (
    <group name="ground-dressing-layer">
      {GROUND_DRESSING_BATCHES.map((batch) =>
        batch.kind === "plane" ? (
          <InstancedPlaneBatch key={batch.name} name={batch.name} specs={batch.specs}
            material={roadMaterials[batch.materialKey]} renderOrder={-3} receiveShadow />
        ) : (
          <InstancedBoxBatch key={batch.name} name={batch.name} specs={batch.specs}
            material={roadMaterials[batch.materialKey]} receiveShadow />
        )
      )}
    </group>
  );
}

function GroundDressingLayerComponent({ isNight = false }: { isNight?: boolean }) {
  void isNight; // night grade handled by scene lighting; prop reserved for parity with siblings
  return (
    <Suspense fallback={null}>
      <GroundDressingContent />
    </Suspense>
  );
}

export const GroundDressingLayer = memo(GroundDressingLayerComponent);
GroundDressingLayer.displayName = "GroundDressingLayer";
```

(Adapt `roadMaterials[batch.materialKey]` typing to `Stage5RoadMaterialSet`; if `InstancedPlaneBatch` specs typing needs `PlaneBatchSpec[]`, cast the base-plane literal accordingly.)

- [ ] **Step 4: Mount in SimulationScene**

In `SimulationScene.tsx` insert after the `<Suspense><RoadSurfaceLayer …/></Suspense>` line (:108-110), inside a roadonly guard:

```tsx
{!isRoadOnly && <GroundDressingLayer isNight={isNight} />}
```

- [ ] **Step 5: Green + visual sanity**

Run: `cd apps/web && npx vitest run` → PASS (fix any tree-assertion fallout by updating expectations, not weakening). Then `npm run verify:r3f-dashboard` and codex-check the day screenshot: "Is the white/gray ground void gone? Do sidewalks/curbs read at the road edges? Any z-fighting between base plane, apron, and road?" Fix lift values (base -0.06 vs apron default) if codex reports z-fighting.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/r3f/instancedBatches.tsx apps/web/components/r3f/GroundDressingLayer.tsx \
  apps/web/components/r3f/GroundDressingLayer.test.tsx apps/web/components/r3f/ApproachCorridors.tsx \
  apps/web/components/r3f/roadGeometry.ts apps/web/components/r3f/SimulationScene.tsx \
  apps/web/components/r3f/SimulationScene.test.tsx
git commit -m "feat(r3f): GroundDressingLayer — continuous ground, sidewalks, curbs in the default scene"
```

---

### Task 4: `StreetFurnitureLayer` + RoadDetailProps + honest telemetry

**Files:**
- Create: `apps/web/components/r3f/StreetFurnitureLayer.tsx`
- Modify: `apps/web/components/r3f/SimulationScene.tsx` (mount both)
- Modify: `apps/web/components/r3f/R3FSimulationViewport.tsx:26-34, 80-82, 144-152` (telemetry rewire)
- Modify: `scripts/verify-r3f-dashboard.mjs:2673-2682, 4237-4243` (same-change verifier update)
- Test: `apps/web/components/r3f/StreetFurnitureLayer.test.tsx`, modify `SimulationScene.test.tsx`, `SimulationCanvas.test.tsx` fixtures if flagged

**Interfaces:**
- Consumes: `buildVehicleGlbGeometryGroups` + `InstancedVehicleGlbMesh` (from `./InstancedVehicleGlb`, same pattern as Stage5SceneAssets.tsx:466-564), `getR3FAssetEntry`, GLB asset ids `"props/streetlight" | "props/tree_cluster" | "props/curb_details" | "props/outdoor_table_chair_set_01"`, `STAGE5_SHADOWS_ENABLED` + `STAGE5_STREETLIGHT_SHADOW_CASTER_COUNT` (shadowPolicy.ts:8), `RoadDetailProps` (standalone, prop-less, RoadDetailProps.tsx:268).
- Produces: `export const StreetFurnitureLayer` (displayName `"StreetFurnitureLayer"`); `export const STREET_FURNITURE_PLACEMENTS` (same shape as Stage5StreetFurniturePlacement); `export const STREET_FURNITURE_CONTACT_SHADOWS` (array of `{id, position: Vector3Tuple, radius: number}`). R3FSimulationViewport reads `STREET_FURNITURE_CONTACT_SHADOWS.length` for `data-r3f-street-shadow-count`.

- [ ] **Step 1: Failing tests**

`StreetFurnitureLayer.test.tsx`:

```tsx
import { describe, expect, test } from "vitest";
import { STREET_FURNITURE_PLACEMENTS, STREET_FURNITURE_CONTACT_SHADOWS } from "./StreetFurnitureLayer";
import { STAGE5_STREETLIGHT_SHADOW_CASTER_COUNT } from "./shadowPolicy";

describe("street furniture placements", () => {
  test("dresses all four approaches with lights and trees", () => {
    const lights = STREET_FURNITURE_PLACEMENTS.filter((p) => p.assetId === "props/streetlight");
    const trees = STREET_FURNITURE_PLACEMENTS.filter((p) => p.assetId === "props/tree_cluster");
    expect(lights.length).toBeGreaterThanOrEqual(8);
    expect(trees.length).toBeGreaterThanOrEqual(6);
    // every placement sits OFF the carriageway: |x| or |z| beyond the road half-width (~14 m)
    for (const p of STREET_FURNITURE_PLACEMENTS) {
      expect(Math.min(Math.abs(p.position[0]), Math.abs(p.position[2]))).toBeGreaterThanOrEqual(14);
    }
  });
  test("contact shadows exist and shadow casters respect the policy budget", () => {
    expect(STREET_FURNITURE_CONTACT_SHADOWS.length).toBeGreaterThanOrEqual(2);
    expect(STAGE5_STREETLIGHT_SHADOW_CASTER_COUNT).toBe(2); // budget is NOT auto-raised by more lights
  });
});
```

In `SimulationScene.test.tsx` default-tree test add `expect(names).toContain("StreetFurnitureLayer");` and `expect(names).toContain("RoadDetailProps");`; roadonly test adds `not.toContain` for both.
Run to verify FAIL.

- [ ] **Step 2: Implement StreetFurnitureLayer**

Structure mirrors `RuntimeStage5SceneAssets` (Stage5SceneAssets.tsx:466-564) but furniture-only: `useGLTF` the 4 prop assets, `buildVehicleGlbGeometryGroups(assetId, scene)`, one `<InstancedVehicleGlbMesh>` per geometry group with instances mapped from `STREET_FURNITURE_PLACEMENTS`; `castShadow` ONLY when `STAGE5_SHADOWS_ENABLED && assetId === "props/streetlight" && placementIndex < STAGE5_STREETLIGHT_SHADOW_CASTER_COUNT`. Contact shadows: flat dark circle planes (`<mesh rotation-x={-Math.PI/2}><circleGeometry args={[radius, 16]}/><meshBasicMaterial color="#000" transparent opacity={0.28} depthWrite={false}/></mesh>`) from `STREET_FURNITURE_CONTACT_SHADOWS`.

Placement data — seed the four approaches (corridor sidewalks run along x≈±15.5 for N/S approaches and z≈±15.5 for E/W; verify exact sidewalk centerlines from `SIDEWALK_SLABS` positions before hardcoding). Starter set (tune in Step 4's codex loop):
- 12 streetlights: 3 per approach at 30 m spacing starting 20 m from the intersection box, alternating sides.
- 8 tree_cluster: 2 per approach between streetlights.
- 4 curb_details + 2 outdoor_table_chair_set (SW/SE plaza corners).
Reuse `STAGE5_STREET_FURNITURE_PLACEMENTS` (Stage5SceneAssets.tsx:236-286) as the coordinate reference for plausible y/rotation/scale values.

Mount in SimulationScene inside `{!isRoadOnly && …}` next to BuildingLayerBoundary:

```tsx
{!isRoadOnly && (
  <Suspense fallback={null}>
    <StreetFurnitureLayer />
    <RoadDetailProps />
  </Suspense>
)}
```

- [ ] **Step 3: Telemetry rewire + verifier (same change)**

`R3FSimulationViewport.tsx`:
- Delete imports `SCENE_CLUTTER_SPECS` (from SceneClutterLayer) and `STAGE5_STREET_FURNITURE_CONTACT_SHADOW_PLACEMENTS`, `STAGE5_VISIBLE_TRAFFIC_GLB_PLACEMENTS` (from Stage5SceneAssets).
- `ambientPedestrianCount`: replace the SCENE_CLUTTER_SPECS filter (:80-82) with literal `0` + comment (`// ambient pedestrians retired with SceneClutterLayer; SUMO persons arrive in sub-project B`). Keep `data-r3f-ambient-pedestrian-source="procedural_background_proxy"` literal unchanged (verifier string-matches it).
- `data-r3f-glb-vehicle-count`: rewire to the live GLB vehicle count already computed in this file for `data-r3f-high-quality-vehicle-count` (reuse that variable).
- `data-r3f-street-shadow-count`: `STREET_FURNITURE_CONTACT_SHADOWS.length` (import from StreetFurnitureLayer).

`scripts/verify-r3f-dashboard.mjs`: thresholds at 2673-2682 and 4237-4243 keep their semantics (`>=2`, `>=12`, `>=2`) — they now measure REAL rendered content. Verify the numbers still hold with the harness fixture (3 precise vehicles → glbVehicleCount ≥ 2 ✓; contact shadows ≥ 2 ✓). If any threshold fails against live values, adjust the SCENE (more contact shadows), not the threshold.

- [ ] **Step 4: Suite + gates + codex placement review**

`cd apps/web && npx vitest run && npx tsc --noEmit` → PASS. `npm run verify:r3f-dashboard` → PASS. Codex on the fresh day screenshot: "Are streetlights/trees/benches placed plausibly (on sidewalks, not in the carriageway, not intersecting buildings)? Do the street edges still look barren anywhere?" Iterate placements until PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/r3f/StreetFurnitureLayer.tsx apps/web/components/r3f/StreetFurnitureLayer.test.tsx \
  apps/web/components/r3f/SimulationScene.tsx apps/web/components/r3f/SimulationScene.test.tsx \
  apps/web/components/r3f/R3FSimulationViewport.tsx scripts/verify-r3f-dashboard.mjs
git commit -m "feat(r3f): street furniture + road detail props in the default scene; telemetry counts now measure mounted content"
```

---

### Task 5: Imagegen ground atlas + corner plaza plates + manifest compliance

**Files:**
- Create: `scratchpad/day-fill-prompts/*.txt`, `scratchpad/run_day_fill_imagegen.sh` (tooling, NOT committed)
- Create: `apps/web/public/simulation/r3f/assets/textures/ground/{sidewalk_atlas_a.webp,sidewalk_atlas_b.webp,urban_ground.webp,corner_plaza_ne.webp,corner_plaza_nw.webp,corner_plaza_se.webp,corner_plaza_sw.webp,edge_facade_strip.webp,manhole.webp,wear_patch.webp}`
- Modify: `apps/web/components/r3f/roadMaterials.ts` (sidewalk/cityGround map upgrade)
- Modify: `apps/web/components/r3f/GroundDressingLayer.tsx` (corner plates + ground map)
- Modify: `apps/web/public/simulation/r3f/assets/manifest.json`, `docs/compliance/r3f-asset-licenses.md`
- Test: extend `GroundDressingLayer.test.tsx`

**Interfaces:**
- Consumes: Task 3's layer + `instancedBatches` `map` support; Task 2's freed budget.
- Produces: `CORNER_PLAZA_PLATES: { id; position: Vector3Tuple; size: [number, number]; textureUrl: string }[]` exported from GroundDressingLayer (Task 10 visual review references them). Manifest entries for all new textures + the 3 previously-unregistered marking paints.

- [ ] **Step 1: Generate the textures**

Write one prompt file per texture under `scratchpad/day-fill-prompts/` (top-down orthographic, photoreal, Korean-street styling, seamless-tileable for the atlas ones; corner plates: albedo only, explicitly "no shadows, no ambient occlusion, flat even daylight, includes tactile paving strips and curb ramps at the road-facing edges"). Copy the `run_hero_imagegen.sh` loop pattern (codex exec + `SAVED:` line contract + per-run log dir) into `run_day_fill_imagegen.sh` with `OUT_DIR="$ROOT/scratchpad/day-fill-out"`. Run sequentially (10 images — parallel session output collision is the known failure mode; sequential is fine here).

- [ ] **Step 2: Convert + place + register**

Convert to webp with sharp (atlas 512-1024px, quality 80; plates 1024px), place under `textures/ground/`. Add a manifest entry per file following the `decals/worn_lane_markings` shape verbatim (kind `"texture"` or `"decal"`, `source: "project-authored-procedural-texture"`, license line `"Project-authored generated runtime texture/decal; no external third-party texture source"`, `compression: { status: "webp-runtime", geometry: "not-applicable", texture: "webp", evidence: "scripts/verify-r3f-assets.mjs" }`, `provenanceEvidencePath` as existing). Add one `r3f-asset-licenses.md` row each (12-column format, Source URL/License documentation blank for project-authored). **Also add the 3 missing entries for `markings/white_paint.webp`, `yellow_paint.webp`, `blue_paint.webp`** (pre-existing compliance gap — they render today but are unregistered).

Run: `node scripts/verify-r3f-assets.mjs` → PASS, total ≤ 25 MB (report the number; if over, shrink plates to 768px first).

- [ ] **Step 3: Wire materials + plates (test first)**

Extend `GroundDressingLayer.test.tsx`:

```tsx
test("four corner plaza plates cover the diagonal corners", () => {
  expect(CORNER_PLAZA_PLATES).toHaveLength(4);
  const quadrants = new Set(CORNER_PLAZA_PLATES.map((p) => `${Math.sign(p.position[0])},${Math.sign(p.position[2])}`));
  expect(quadrants.size).toBe(4);
  for (const p of CORNER_PLAZA_PLATES) {
    expect(Math.abs(p.position[0])).toBeGreaterThanOrEqual(15);
    expect(Math.abs(p.position[2])).toBeGreaterThanOrEqual(15);
  }
});
```

FAIL → implement: plates as 4 `<mesh>` planes (y = -0.02, above base plane, below decal lift range), each `useTexture(p.textureUrl)` with `SRGBColorSpace`; position/size derived from the intersection box + sidewalk offsets in roadGeometry (read `INTERSECTION_*` constants there; starter: centers at (±26, ±26), size [26, 26] — verify against `?roadonly=1` render). Upgrade `roadMaterials.ts` sidewalk/cityGround texture paths to the new atlas files (keep the existing texture-augmentation code path at :449-478, just point at the new files; keep old files if other consumers reference them).

- [ ] **Step 4: Gates + codex**

`npx vitest run` → PASS. `npm run verify:r3f-dashboard` → PASS. Codex: "Ground: does the paving read photoreal at this distance? Corner plazas: aligned to the crosswalk corners, tactile strips at road edges? Any visible tiling repetition or seams? Any baked shadow on the plates conflicting with scene light direction?" Iterate.

- [ ] **Step 5: Commit**

```bash
git add apps/web/public/simulation/r3f/assets/textures/ground apps/web/public/simulation/r3f/assets/manifest.json \
  docs/compliance/r3f-asset-licenses.md apps/web/components/r3f/GroundDressingLayer.tsx \
  apps/web/components/r3f/GroundDressingLayer.test.tsx apps/web/components/r3f/roadMaterials.ts
git commit -m "feat(r3f): photoreal ground atlas + corner plaza plates (imagegen); register marking paints in manifest"
```

---

### Task 6: Periphery — distant tints, textured edge blocks, north skyline dedup

**Files:**
- Modify: `apps/web/components/r3f/BuildingLayer.tsx` (far-group vertex colors, :551-573 merge + :818-827 material)
- Modify: `apps/web/components/r3f/GroundDressingLayer.tsx` (edge-block batch)
- Modify: `apps/web/components/r3f/WeatherAndAtmosphere.tsx` (backdrop decision)
- Test: modify `BuildingLayer` tests (whichever assert far material), `GroundDressingLayer.test.tsx`

**Interfaces:**
- Consumes: `STAGE6E_CITY_EDGE_BLOCKS` (roadGeometry.ts:386, `CityEdgeBlockSpec[]`), `footprint.tint` (buildingFootprints.ts — currently dead data), Task 5's `edge_facade_strip.webp`, `instancedBatches` `map` support.
- Produces: exported `PERIPHERY_EDGE_BLOCKS` (the filtered subset) so tests can pin the no-overlap rule.

- [ ] **Step 1: Failing tests**

In `GroundDressingLayer.test.tsx`:

```tsx
test("periphery edge blocks stay outside the hero-building zone (no double-rendered buildings)", () => {
  expect(PERIPHERY_EDGE_BLOCKS.length).toBeGreaterThanOrEqual(12);
  for (const b of PERIPHERY_EDGE_BLOCKS) {
    expect(Math.max(Math.abs(b.position[0]), Math.abs(b.position[2]))).toBeGreaterThanOrEqual(70);
  }
});
```

BuildingLayer far-tint test (place beside existing BuildingLayer tests, plain-function style — assert the exported helper, add one): `export function getDistantTintColors(): string[]` returns the 5 footprints' tints in order; test asserts 5 entries and ≥3 distinct values.

- [ ] **Step 2: Distant vertex-color tints**

In `composeBuildingVolumes`/`buildPlainBox` path for `form === "distant"`: bake a per-box `color` BufferAttribute from `footprint.tint` (THREE.Color per vertex) before the group merge; set the far material (`buildGroupMaterials`) to `vertexColors: true` and lighten its base `color` to `#c9d2e0` so vertex tints read through (day); keep night emissive branch as-is. The 5 boxes stay one merged geometry + one material (no draw-call change).

- [ ] **Step 3: Textured periphery edge blocks**

In GroundDressingLayer: `export const PERIPHERY_EDGE_BLOCKS = STAGE6E_CITY_EDGE_BLOCKS.filter((b) => Math.max(Math.abs(b.position[0]), Math.abs(b.position[2])) >= 70);` and add `<InstancedBoxBatch name="ground-dressing-edge-blocks" specs={PERIPHERY_EDGE_BLOCKS} material={{ color: "#8d949e", roughness: 0.85, metalness: 0.04, map: edgeFacadeTexture }} />` (load `edge_facade_strip.webp` via useTexture inside the Suspense content; per-instance scale stretches the strip — acceptable at ≥70 m, codex judges). If Step 5's codex review still reports the corridor ENDS reading empty (existing blocks flank the corridors but may not cap them), append a small exported `PERIPHERY_END_CAPS: BoxPrimitiveSpec[]` array (2-4 hand-placed blocks per corridor end at |x| or |z| ≈ 320-360) to the same batch — data-only addition, same material.

- [ ] **Step 4: North skyline A/B via codex**

Capture two day screenshots (verify harness run + a manual capture after toggling): (a) current, (b) with `DISTANT_CITY_BACKDROP` mesh removed (comment out locally). Codex: "Which northern horizon reads better — layered haze or double-skyline artifact? Verdict KEEP or REMOVE the canvas backdrop." Apply the verdict (if REMOVE: delete the `DISTANT_CITY_BACKDROP` spec + mesh + `useDistantCityTexture` if then-unused; if KEEP: no change). This is a genuine visual decision — do not skip the A/B.

- [ ] **Step 5: Suite + gates + commit**

`npx vitest run` → PASS. `npm run verify:r3f-dashboard` + codex: "North/NW/NE/S periphery: do the placeholder blue blocks and white voids still exist? Does the city read as continuing past the frame?" Draw calls vs Task-1 baseline: report delta (edge blocks = 1 instanced call; tints = 0).

```bash
git add apps/web/components/r3f/BuildingLayer.tsx apps/web/components/r3f/GroundDressingLayer.tsx \
  apps/web/components/r3f/GroundDressingLayer.test.tsx apps/web/components/r3f/WeatherAndAtmosphere.tsx
git commit -m "feat(r3f): periphery fill — distant tints, textured edge blocks, north skyline dedup"
```

(plus BuildingLayer test file in the add list — match actual filename.)

---

### Task 7: Road-surface decals (manhole/wear) + hero rooftop variety

**Files:**
- Modify: `apps/web/components/r3f/markingDecalDescriptors.ts` (union + GROUPS)
- Modify: `apps/web/components/r3f/roadGeometry.ts` (MANHOLE_DECALS, WEAR_PATCH_DECALS spec arrays)
- Modify: `apps/web/components/r3f/MarkingDecalLayer.tsx` (PLACEHOLDER_URLS entries)
- Modify: `apps/web/components/r3f/MarkingDecalLayer.test.tsx` (6 → 8 invariant, derived not hardcoded)
- Modify: ~4-6 files under `apps/web/public/simulation/r3f/assets/textures/hero/` (regenerated top textures, same filenames)

**Interfaces:**
- Consumes: Task 5's `manhole.webp`/`wear_patch.webp`; the `MarkingTextureKey`-driven merge (mesh count == key count).
- Produces: `MarkingTextureKey` gains `"manhole" | "wear_patch"`.

- [ ] **Step 1: Update the invariant test FIRST (derived, stronger)**

In `MarkingDecalLayer.test.tsx`, replace hardcoded `6` expectations with `Object.keys(PLACEHOLDER_URLS).length` (export `PLACEHOLDER_URLS` from `MarkingDecalLayer.tsx` first if it is module-private today) so the invariant is structural; add a test that `buildMarkingDecalDescriptors()` contains ≥8 manhole descriptors and ≥6 wear patches. Run → FAIL.

- [ ] **Step 2: Implement**

`roadGeometry.ts`: add exported `MANHOLE_DECALS` (≈10 specs: `{id, position, size:[0.9,0.9], rotationY}` scattered on approach lanes, NOT on crosswalks/stop bars — offset from marking specs) and `WEAR_PATCH_DECALS` (≈8, size [2.5,3.5], centered on lane wheel paths). `markingDecalDescriptors.ts`: extend `MarkingTextureKey` union, add two GROUPS entries with distinct lifts (next free values in the 0.001-0.006 ladder — read the existing lifts and continue the sequence). `MarkingDecalLayer.tsx`: add the two `PLACEHOLDER_URLS` entries pointing at `/simulation/r3f/assets/textures/ground/manhole.webp` and `wear_patch.webp`. Mesh count becomes 8 automatically via the merge-by-key path.

- [ ] **Step 3: Rooftop variety**

List the hero `_top` textures (`ls apps/web/public/simulation/r3f/assets/textures/hero | grep top`), render the current day screenshot, and ask codex: "Which rooftops look like duplicated placeholder caps/helipads? Name the worst 4-6." Regenerate exactly those tops via the imagegen loop (prompts: varied Korean commercial rooftops — HVAC units, water tanks, piping, no helipad), same filenames/dimensions (webp, match originals' width via sharp), drop-in replace. First check how hero files are declared in manifest.json (`grep hero manifest.json | head`) and mirror — same-name replacement should need no manifest edits.

- [ ] **Step 4: Suite + gates + codex + commit**

`npx vitest run` → PASS. `npm run verify:r3f-dashboard` → PASS; `node scripts/verify-r3f-assets.mjs` ≤ 25 MB. Codex: "Asphalt: do manholes/wear read as road texture (not floating stickers)? Rooftops: is the duplicate-cap feel gone?"

```bash
git add apps/web/components/r3f/markingDecalDescriptors.ts apps/web/components/r3f/roadGeometry.ts \
  apps/web/components/r3f/MarkingDecalLayer.tsx apps/web/components/r3f/MarkingDecalLayer.test.tsx \
  apps/web/public/simulation/r3f/assets/textures/hero
git commit -m "feat(r3f): manhole/wear road decals + regenerated rooftop variety"
```

---

### Task 8: Seoul-only — remove the city selector

**Files:**
- Modify: `apps/web/lib/cities.ts` (Seoul only), `apps/web/lib/types.ts:5` (`CityId = "seoul"`)
- Modify: `apps/web/components/DashboardShell.tsx` (drop selector JSX :237-257; props `selectedCityId`/`cityProfiles`/`onCityChange` → single `cityProfile: CityProfile`; keep the city-profile-card at :189-195 rendering from it)
- Modify: `apps/web/components/DashboardRoute.tsx:85,440-444` (drop state; pass `cityProfile={CITY_PROFILES[0]}`)
- Test: `apps/web/components/DashboardShell.test.tsx` (:427 dashboardProps helper, :694 profile test updated, :707 city-change test deleted)

**Interfaces:**
- Consumes: nothing from other tasks (fully independent).
- Produces: `DashboardShellProps.cityProfile: CityProfile`.

- [ ] **Step 1: Failing tests** — update `dashboardProps` helper to `cityProfile: CITY_PROFILES[0]`, rewrite :694 test to assert the Seoul profile card renders (intersection name "강남대로 / 테헤란로" ko / "Gangnam-daero / Teheran-ro" en) and that no `city-segment-control` section exists (`expect(screen.queryByRole("button", { name: /뉴욕|New York/ })).toBeNull()`). Delete the :707 onCityChange test. Run → FAIL (props mismatch).
- [ ] **Step 2: Implement** — cities.ts keeps only the seoul entry + `DEFAULT_CITY_ID`; `CityId = "seoul"`; DashboardShell prop swap + delete the selector `<section className="city-segment-control">…</section>`; DashboardRoute drops `selectedCityId` state. `npx tsc --noEmit` drives out every other reference (fix what it flags — expected: only these files).
- [ ] **Step 3: Suite green** — `npx vitest run` → PASS.
- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/cities.ts apps/web/lib/types.ts apps/web/components/DashboardShell.tsx \
  apps/web/components/DashboardRoute.tsx apps/web/components/DashboardShell.test.tsx
git commit -m "feat(dashboard): Seoul-only — remove the cosmetic city selector"
```

---

### Task 9: Dead-code deletion (EnvironmentLayer, NightSeamlessLighting)

**Files:**
- Modify: `apps/web/components/r3f/SceneEnvironment.tsx` (absorb `getStage6EnvironmentPreset`, drop the import at :9)
- Modify: `apps/web/components/r3f/CameraWeatherClutter.test.tsx:13` (import from SceneEnvironment)
- Delete: `apps/web/components/r3f/EnvironmentLayer.tsx`, `apps/web/components/r3f/NightSeamlessLighting.tsx`
- Modify: `apps/web/components/r3f/SimulationScene.tsx:137` (stale comment)

**Interfaces:**
- Consumes: nothing. **Caution (memory `r3f-deadcode-cuts-need-heavy-verify-gates`):** dead-looking knobs can be verifier-load-bearing — this task runs the FULL gate suite, not just vitest.
- Produces: `getStage6EnvironmentPreset` exported from `SceneEnvironment.tsx` (same signature).

- [ ] **Step 1:** Move `getStage6EnvironmentPreset` (EnvironmentLayer.tsx:126-138) verbatim into SceneEnvironment.tsx as an export; update both importers. `git rm` the two files; reword the two stale comments (SimulationScene.tsx:137, and the EnvironmentLayer mention if any survive — grep `NightSeamlessLighting\|EnvironmentLayer` must return zero non-comment hits, then zero hits total).
- [ ] **Step 2:** `npx vitest run && npx tsc --noEmit` → PASS.
- [ ] **Step 3:** Full gates: `npm run verify:r3f-dashboard && npm run verify:r3f-performance && node scripts/verify-r3f-assets.mjs && npm run verify:security` → PASS (deletion must not shift any gate).
- [ ] **Step 4: Commit**

```bash
git add -u apps/web/components/r3f
git commit -m "chore(r3f): delete superseded EnvironmentLayer/NightSeamlessLighting; relocate getStage6EnvironmentPreset"
```

---

### Task 10: Gates, orbit-angle codex review, visual re-baseline, handoff

**Files:**
- Modify: `scripts/baselines/r3f-dashboard-visual-baseline.json` (re-baseline — intentional change)
- No other source changes expected.

**Interfaces:** consumes everything above.

- [ ] **Step 1: Full suites** — `cd apps/web && npx vitest run` and `cd apps/api && .venv/bin/python -m pytest -q` → PASS / 200 passed (api untouched by this plan; run anyway).
- [ ] **Step 2: Dashboard gate** — `npm run verify:r3f-dashboard` → PASS; artifacts regenerated.
- [ ] **Step 3: Codex final review (operator + 2 orbit-equivalent angles)** — day-high screenshot (operator wide), plus two additional angles captured via existing camera presets: run the dashboard locally (or reuse harness stage6 cctv captures) with `?cameraPreset=operatorCctv` and `?cameraPreset=photorealProof` (confirm both exist in `CameraRig.tsx` presets; substitute the two closest available presets if named differently). Codex prompt must explicitly ask: "(1) Any remaining empty/blockout areas — bare ground, floating road edges, blank periphery, blue placeholder blocks? (2) Does every added element (ground, plazas, furniture, edge blocks, decals, rooftops) read photoreal at this distance? (3) Defects: z-fighting, floating props, texture seams, shadow conflicts. Verdict per image: PASS/FAIL with regions." Expected: PASS ×3. FAIL → stop, fix, re-run from Step 2. Do NOT re-baseline over a defect.
- [ ] **Step 4: Re-baseline** — `npm run verify:r3f-visual-diff` (expect FAIL vs old baseline — intentional), regenerate `scripts/baselines/r3f-dashboard-visual-baseline.json` from fresh `artifacts/r3f-dashboard-details.json` mirroring the existing schema (thresholds in verify-r3f-visual-diff.mjs UNTOUCHED), re-run → PASS.
- [ ] **Step 5: Remaining gates** — `npm run verify:r3f-performance` (report drawCalls vs Task-1 baseline; must be ≤900 peak/≤180 high with the new floor≥50 check), `node scripts/verify-r3f-assets.mjs` (≤25 MB — report final number), `npm run verify:security` → PASS.
- [ ] **Step 6: Commit baseline + tracked artifacts**

```bash
git add scripts/baselines/r3f-dashboard-visual-baseline.json artifacts/r3f-dashboard-details.json \
  artifacts/r3f-dashboard-desktop.png artifacts/r3f-dashboard-desktop-canvas.png artifacts/r3f-dashboard-mobile.png \
  artifacts/r3f-dashboard-mobile-canvas.png artifacts/r3f-dashboard-mobile-overlays.png artifacts/r3f-dashboard-webgl-off.png \
  artifacts/r3f-security-gates.json
git commit -m "test(r3f): re-baseline visual diff for the filled Seoul day scene"
```

- [ ] **Step 7: Handoff** — report: gate table with numbers (draw-call delta vs baseline, asset MB final), codex verdicts, screenshot paths (day operator + 2 angles). Do NOT merge to main — merge is the user's call (superpowers:finishing-a-development-branch).
