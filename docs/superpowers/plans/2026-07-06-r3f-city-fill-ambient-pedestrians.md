# R3F City Fill And Ambient Pedestrians Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the R3F dashboard scene denser and render visible photoreal ambient pedestrians while preserving `SimulationFrameSnapshot.pedestrians` as the only SUMO pedestrian truth.

**Architecture:** Add visual density through existing frontend-only R3F data layers. Add a focused `AmbientPedestrianLayer` for sidewalk/background proxy pedestrians, render them from a project-generated ImageGen alpha sprite atlas, mount it only in the full scene, and report its count/source separately from SUMO pedestrian telemetry.

**Tech Stack:** Next.js, React 19, TypeScript, React Three Fiber, Three.js, Vitest, Testing Library, Playwright/browser proof when available.

---

## Files

- Create: `apps/web/components/r3f/AmbientPedestrianLayer.tsx`
- Create: `apps/web/components/r3f/AmbientPedestrianLayer.test.tsx`
- Create: `apps/web/public/simulation/r3f/assets/sprites/pedestrian-commuter-atlas.png`
- Modify: `apps/web/components/r3f/SimulationScene.tsx`
- Modify: `apps/web/components/r3f/SimulationScene.test.tsx`
- Modify: `apps/web/components/r3f/R3FSimulationViewport.tsx`
- Modify: `apps/web/components/r3f/SimulationCanvas.test.tsx`
- Modify: `apps/web/lib/r3fTelemetry.test.ts`
- Modify: `apps/web/public/simulation/r3f/assets/manifest.json`
- Modify: `apps/web/public/simulation/r3f/assets/textures/PROVENANCE.md`
- Modify: `docs/compliance/r3f-asset-licenses.md`
- Modify: `apps/web/components/r3f/buildingFootprints.ts`
- Modify: `apps/web/components/r3f/BuildingLayer.test.tsx`
- Modify: `apps/web/components/r3f/GroundDressingLayer.tsx` only if extra periphery fill is needed after building fill
- Modify: `apps/web/components/r3f/GroundDressingLayer.test.tsx` only if `GroundDressingLayer.tsx` changes
- Modify: `apps/web/components/r3f/StreetFurnitureLayer.tsx` only if street-level fill is needed after building fill
- Modify: `apps/web/components/r3f/StreetFurnitureLayer.test.tsx` only if `StreetFurnitureLayer.tsx` changes

Do not modify backend SUMO, TraCI, `live-input.v1`, or route adapter code.

## Task 1: Ambient Pedestrian Layer And Telemetry

**Files:**
- Create: `apps/web/components/r3f/AmbientPedestrianLayer.tsx`
- Create: `apps/web/components/r3f/AmbientPedestrianLayer.test.tsx`
- Modify: `apps/web/components/r3f/SimulationScene.tsx`
- Modify: `apps/web/components/r3f/SimulationScene.test.tsx`
- Modify: `apps/web/components/r3f/R3FSimulationViewport.tsx`
- Modify: `apps/web/components/r3f/SimulationCanvas.test.tsx`
- Modify: `apps/web/lib/r3fTelemetry.test.ts`

- [ ] **Step 1: Write failing layer tests**

Create `AmbientPedestrianLayer.test.tsx` with tests that:

```ts
expect(AMBIENT_PEDESTRIAN_TRUTH_SOURCE).toBe("ambient_background_proxy");
expect(AMBIENT_PEDESTRIAN_SPECS.length).toBeGreaterThanOrEqual(8);
expect(buildAmbientPedestrianRenderPlan().ambientPedestrians).toHaveLength(
  AMBIENT_PEDESTRIAN_SPECS.length
);
expect(firstUserData).toEqual(
  expect.objectContaining({
    pedestrianLayer: "ambient",
    sumoTruth: false,
    truthSource: "ambient_background_proxy"
  })
);
```

Also assert every ambient pedestrian position is outside the central road box and
each spec references a valid atlas cell:

```ts
const inCentralRoad =
  Math.abs(spec.position[0]) < 18 && Math.abs(spec.position[2]) < 18;
expect(inCentralRoad).toBe(false);
expect(spec.atlasIndex).toBeGreaterThanOrEqual(0);
expect(spec.atlasIndex).toBeLessThan(8);
```

- [ ] **Step 2: Run the failing layer test**

Run:

```bash
npm --workspace apps/web run test -- components/r3f/AmbientPedestrianLayer.test.tsx
```

Expected before implementation: fail because the file/module does not exist.

- [ ] **Step 3: Implement imagegen sprite-impostor ambient layer**

Create `AmbientPedestrianLayer.tsx` with:

```ts
export const AMBIENT_PEDESTRIAN_TRUTH_SOURCE = "ambient_background_proxy";
export const AMBIENT_PEDESTRIAN_ATLAS_URL =
  "/simulation/r3f/assets/sprites/pedestrian-commuter-atlas.png";

export type AmbientPedestrianSpec = {
  id: string;
  position: Vector3Tuple;
  rotationY: number;
  variantId: string;
  atlasIndex: number;
  opacity: number;
};
```

Use deterministic specs on sidewalks/plazas. Render a contact shadow plus
`<sprite>` impostor sampled from fixed atlas cells via cloned `useTexture`
textures. Do not render primitive capsule/head figures. Set group `userData`
with `pedestrianLayer: "ambient"`, `sumoTruth: false`,
`truthSource: AMBIENT_PEDESTRIAN_TRUTH_SOURCE`, and
`renderMode: "imagegen_alpha_sprite_impostor"`.

- [ ] **Step 3b: Register the generated pedestrian atlas**

Register `pedestrian-commuter-atlas.png` in:

- `apps/web/public/simulation/r3f/assets/manifest.json`
- `apps/web/public/simulation/r3f/assets/textures/PROVENANCE.md`
- `docs/compliance/r3f-asset-licenses.md`

The row must say this is built-in ImageGen output processed with repo `sharp`
chroma-key/despill, has no third-party downloads/logos/text/watermarks, and is
ambient visual context only.

- [ ] **Step 4: Mount ambient layer in full scene only**

Modify `SimulationScene.tsx` to import `AmbientPedestrianLayer` and mount it when
`!isRoadOnly`, near the static city/furniture layers and before dynamic SUMO
pedestrians. Update `SimulationScene.test.tsx` to assert default scene contains
`AmbientPedestrianLayer` and `?roadonly=1` does not.

- [ ] **Step 5: Wire viewport telemetry**

Modify `R3FSimulationViewport.tsx` to import
`AMBIENT_PEDESTRIAN_SPECS` and `AMBIENT_PEDESTRIAN_TRUTH_SOURCE`. Replace the
hard-coded ambient count/source with those exports.

- [ ] **Step 6: Update telemetry tests**

Update `SimulationCanvas.test.tsx` and `r3fTelemetry.test.ts` expected ambient
source from the old procedural label to `ambient_background_proxy`. Add a
viewport or canvas test proving SUMO count and ambient count can both be present
without merging.

- [ ] **Step 7: Verify Task 1**

Run:

```bash
npm --workspace apps/web run test -- components/r3f/AmbientPedestrianLayer.test.tsx components/r3f/DynamicPedestrianLayer.test.tsx components/r3f/SimulationScene.test.tsx components/r3f/SimulationCanvas.test.tsx lib/r3fTelemetry.test.ts
npm run verify:r3f-assets
```

Expected: all selected tests pass.

## Task 2: City Density Fill

**Files:**
- Modify: `apps/web/components/r3f/buildingFootprints.ts`
- Modify: `apps/web/components/r3f/BuildingLayer.test.tsx`
- Modify: `apps/web/components/r3f/GroundDressingLayer.tsx` only if needed
- Modify: `apps/web/components/r3f/GroundDressingLayer.test.tsx` only if needed
- Modify: `apps/web/components/r3f/StreetFurnitureLayer.tsx` only if needed
- Modify: `apps/web/components/r3f/StreetFurnitureLayer.test.tsx` only if needed

- [ ] **Step 1: Write failing density tests**

Add tests in `BuildingLayer.test.tsx` for named new city-fill footprints such as
`northwest-rear-fill`, `northeast-rear-fill`, `southwest-rear-fill`, and
`southeast-rear-fill`. Tests should require:

```ts
expect(fillers).toHaveLength(4);
expect(fillers.every((b) => b.form === "distant" || b.form === "midriseCommercial")).toBe(true);
expect(fillers.every((b) => b.size[1] >= 24 && b.size[1] <= 90)).toBe(true);
```

Keep the existing safe-zone test as the main road-overlap guard.

- [ ] **Step 2: Run the failing density test**

Run:

```bash
npm --workspace apps/web run test -- components/r3f/BuildingLayer.test.tsx
```

Expected before implementation: fail because the new filler footprints are not
defined.

- [ ] **Step 3: Add frontend-only building fill**

Add 4-8 off-road footprints to `BUILDING_FOOTPRINTS`. Prefer existing photoreal
facade/material paths and keep them positioned outside road and crosswalk lanes.
Do not leave visible fillers as flat toy/proxy blocks.

- [ ] **Step 4: Add ground or street-level fill only if building fill leaves obvious gaps**

If visual inspection or existing tests show gaps remain, add a small number of
existing-pattern placements to `GroundDressingLayer.tsx` or
`StreetFurnitureLayer.tsx`. Do not change streetlight shadow caster count. Add
or update the paired tests in the same slice.

- [ ] **Step 5: Verify Task 2**

Run:

```bash
npm --workspace apps/web run test -- components/r3f/BuildingLayer.test.tsx components/r3f/GroundDressingLayer.test.tsx components/r3f/StreetFurnitureLayer.test.tsx components/r3f/heroBuildingFacades.test.ts
```

Expected: all selected tests pass.

## Task 3: Integration And Browser Proof

**Files:**
- No new source ownership unless Task 1/2 integration reveals a conflict.

## Task 3b: CCTV Pedestrian Legibility Patch

**Files:**
- Modify: `apps/web/components/r3f/AmbientPedestrianLayer.tsx`
- Modify: `apps/web/components/r3f/AmbientPedestrianLayer.test.tsx`
- Modify: `apps/web/components/r3f/SimulationScene.tsx`
- Modify: `apps/web/components/r3f/SimulationScene.test.tsx`

- [ ] **Step 1: Write failing CCTV render-profile tests**

Add tests proving `buildAmbientPedestrianRenderPlan("cctv")` keeps the same
ambient count/source but returns larger foreground/midground sprite dimensions
than `buildAmbientPedestrianRenderPlan("wide")`, and proves
`SimulationScene({ viewpoint: "cctv" })` passes `viewpoint="cctv"` into
`AmbientPedestrianLayer`.

- [ ] **Step 2: Run the failing tests**

Run:

```bash
npm --workspace apps/web run test -- components/r3f/AmbientPedestrianLayer.test.tsx components/r3f/SimulationScene.test.tsx
```

Expected before implementation: FAIL because the ambient layer has no
CCTV-specific profile and the scene does not thread viewpoint to it.

- [ ] **Step 3: Implement the minimal CCTV profile**

Thread `viewpoint` into `AmbientPedestrianLayer`, add a typed render profile,
scale near/mid CCTV sprites upward, and use an upright depth-writing CCTV
billboard profile so road markings do not render over foreground pedestrians.
Keep merged atlas/shadow geometry and ambient truth labels unchanged.

- [ ] **Step 4: Verify the focused tests pass**

Run:

```bash
npm --workspace apps/web run test -- components/r3f/AmbientPedestrianLayer.test.tsx components/r3f/SimulationScene.test.tsx
```

Expected after implementation: PASS.

- [ ] **Step 1: Inspect merged diff**

Run:

```bash
git diff -- apps/web/components/r3f apps/web/lib/r3fTelemetry.test.ts docs/superpowers/specs docs/superpowers/plans
```

Confirm ambient and SUMO pedestrian truth paths remain separate.

- [ ] **Step 2: Run combined tests**

Run:

```bash
npm --workspace apps/web run test -- components/r3f/AmbientPedestrianLayer.test.tsx components/r3f/DynamicPedestrianLayer.test.tsx components/r3f/SimulationScene.test.tsx components/r3f/BuildingLayer.test.tsx components/r3f/GroundDressingLayer.test.tsx components/r3f/StreetFurnitureLayer.test.tsx components/r3f/SimulationCanvas.test.tsx
npm --workspace apps/web run test -- components/DashboardShell.test.tsx lib/r3fTelemetry.test.ts
npm run verify:r3f-assets
```

Expected: all selected tests pass.

- [ ] **Step 3: Run R3F dashboard verifier**

Run:

```bash
npm run verify:r3f-dashboard
```

Expected: verifier passes or reports only known existing warnings. Do not claim
completion if this fails.

- [ ] **Step 4: Browser proof**

Start the dev server if needed and verify `/dashboard` renders. Capture desktop
and mobile proof if Browser/Playwright is available. Check:

- page is not blank
- no framework error overlay
- no relevant console errors
- ambient pedestrians are visible in the R3F scene as photoreal sprite impostors
- DOM telemetry separates SUMO and ambient pedestrian counts

## Coordination Rules

- Use WSL path `/home/chan/abc_project`.
- Preserve untracked `scratchpad/`.
- Do not commit, push, merge, deploy, or install dependencies without explicit
  user approval.
- Do not edit files owned by another active worker unless the primary agent
  reassigns the scope.
