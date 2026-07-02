# R3F Default-Scene Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The no-parameter `/dashboard` visit renders the photobash scene (worn-paint marking decals + limited orbit camera + pedestrian layer) with live SUMO traffic, controllable via day/night, weather, and camera UI toggles.

**Architecture:** Promote the existing `?photobash=1` branch of `SimulationScene` to the only default render path, after first retiring the photoreal-plate branch and replacing `plateVehicleCalibration` with identity behavior (photobash currently gets identity only via `?photobash=1` early-returns — promoting without this step would resurrect plate-era vehicle offsets). Then flip the deployment defaults to live SUMO, and thread a new `scenePresentation` state from `DashboardRoute` down to the scene (today all presentation values are read from `window.location.search` inside the r3f layer; URL params stay as initial overrides for verify-script compatibility).

**Tech Stack:** Next.js (non-standard — see constraint below), React Three Fiber, vitest (jsdom; r3f tests call components as plain functions and assert display names), @testing-library/react (DOM components), SUMO/TraCI (FastAPI backend), Playwright-based verify scripts.

**Spec:** `docs/superpowers/specs/2026-07-02-r3f-default-scene-completion-design.md`

## Global Constraints

- **Never modify `getInboundLaneOffset`** — lane-center math is test-enforced to visible lanes.
- **Keep these URL params working:** `r3fQuality`, `r3fWeather`, `r3fTimeOfDay` (verify-r3f-dashboard.mjs:3141-3144 builds URLs with exactly these three), `guide`, `viewpoint` (render-plate-guides.mjs:365,379), `roadonly` (imagegen base tooling), `r3fCameraPreset`/`cameraPreset` (CameraRig env/URL override).
- **Delete these URL params:** `photoreal`, `cmp`, `cmpAdx`, `calB`, `busLat`, `plate`. `photobash` becomes a no-op (accepted, ignored).
- `apps/web` is a **non-standard Next.js**: read `node_modules/next/dist/docs/` before touching any Next API (this plan touches only client components — no Next API changes expected).
- Asset payload budget 25 MB (`verify:r3f-assets`, currently 22.25 MB — this plan adds no assets). Draw-call budget 900 peak / 180 high (`verify:r3f-performance`).
- All dashboard copy is bilingual ko/en following the `locale === "ko" ? … : …` / `copy[locale]` patterns in `DashboardShell.tsx`.
- Run `npx vitest run` from `apps/web` before every commit; the suite must be green (313 tests at baseline; counts will shift as plate tests are deleted/added).
- Work on branch `feat/r3f-default-scene-completion` (already created; spec committed as c68acb3).
- End every commit message with:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01XQkJeTkSjyEwLiMuMHvEgv`

---

### Task 1: Retire the photoreal plate branch (`?photoreal` / `?cmp` / `?plate`)

**Files:**
- Modify: `apps/web/components/r3f/SimulationScene.tsx`
- Delete: `apps/web/components/r3f/PhotorealPlate.tsx`
- Modify: `apps/web/components/r3f/SimulationScenePhotoreal.test.tsx`
- Modify: `apps/web/AGENTS.md`
- Modify: `scripts/render-traffic-photoreal.mjs:56`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `SimulationScene.tsx` with exactly three branches left (guide, photobash, stage5-default); no import of `PhotorealPlate` or `getCmpAGlobalXShiftMeters`. Test file renamed responsibility: photobash/guide assertions only.

- [ ] **Step 1: Update the test file first (delete photoreal tests, keep photobash/guide tests)**

In `apps/web/components/r3f/SimulationScenePhotoreal.test.tsx`:
- Remove `import { resolvePhotorealPlate } from "./PhotorealPlate";` (line 12) and every `describe`/`test` that sets `?photoreal=1`, `?cmp=`, or `?plate=` — including the v5 lane-overlay guardrail test (its locked decision dies with the branch it guards).
- Keep the `photobash mode (?photobash=1)` describe block (lines 156-172), the guide-mode tests, and the shared helpers (`setSearch`, `snapshot`, `collectDeepDisplayNames`, etc.).
- Add one new test pinning that `?photoreal=1` now falls through to the default scene:

```tsx
describe("photoreal param retired", () => {
  test("?photoreal=1 renders the default scene (no PhotorealPlate)", () => {
    setSearch("?photoreal=1");
    const scene = SimulationScene({
      sceneSnapshot: snapshot(),
      weather: "clear",
      timeOfDay: "day",
      viewpoint: "wide"
    });
    const names = collectDeepDisplayNames(scene);
    expect(names).not.toContain("PhotorealPlate");
    setSearch("");
  });
});
```

- [ ] **Step 2: Run the test file to verify the new test fails**

Run: `cd apps/web && npx vitest run components/r3f/SimulationScenePhotoreal.test.tsx`
Expected: FAIL — the new test finds `"PhotorealPlate"` in the tree (photoreal branch still mounts it).

- [ ] **Step 3: Remove the photoreal branch from SimulationScene.tsx**

- Delete imports (lines 13-14):
```tsx
import { PhotorealPlate } from "./PhotorealPlate";
import { getCmpAGlobalXShiftMeters } from "./plateVehicleCalibration";
```
- Delete `resolvePhotorealMode` (lines 46-55), `resolveCmpMode` + its comment (lines 67-79), `resolvePlateChoice` + its comment (lines 81-96), and the cmp=A dx8.5 comment block (lines 98-103).
- Delete `const isPhotoreal = resolvePhotorealMode();`, `const cmpMode = resolveCmpMode();`, `const plateChoice = resolvePlateChoice();` and the entire `if (isPhotoreal) { … }` block (lines 137, 141-231).
- Leave the guide branch, photobash branch, and default stage5 branch untouched.

- [ ] **Step 4: Delete `PhotorealPlate.tsx`**

Run: `git rm apps/web/components/r3f/PhotorealPlate.tsx`

- [ ] **Step 5: Update `apps/web/AGENTS.md` — replace the locked-decision block**

Replace the entire section `# Locked rendering decisions — do not "fix" these` (the v5-plate paragraph) with:

```markdown
# Locked rendering decisions — do not "fix" these

- **The default scene is the photobash composition: metric marking DECALS
  (`MarkingDecalLayer`), NOT the flat vector markings, and NOT an imagegen
  plate.** The monolithic-plate approach (`?photoreal=1`, v5/roadlock plates)
  was retired 2026-07-02 (spec:
  `docs/superpowers/specs/2026-07-02-r3f-default-scene-completion-design.md`).
  Vehicles ride the RAW metric lane grid (identity calibration — plate-era
  per-approach offsets and the median-bus pin were compensations for off-metric
  plates and were deleted with them). If vehicles look offset from lanes, fix
  geometry/decals — do NOT reintroduce per-approach calibration tables.
```

(Keep the `# This is NOT the Next.js you know` section above it unchanged.)

- [ ] **Step 6: Update `scripts/render-traffic-photoreal.mjs` default query**

Line 56: change

```js
const baseQuery = process.env.TRAFFIC_PHOTOREAL_BASE_QUERY ?? "?photoreal=1";
```

to

```js
const baseQuery = process.env.TRAFFIC_PHOTOREAL_BASE_QUERY ?? "?photobash=1";
```

(`?photobash=1` is still accepted — it becomes a no-op alias for the default in Task 4.)

- [ ] **Step 7: Run the full web suite; fix any assertion still referencing photoreal**

Run: `cd apps/web && npx vitest run`
Expected: PASS. If any other test asserts photoreal behavior, delete that assertion (grep: `grep -rn "photoreal" apps/web --include=*.test.tsx --include=*.test.ts`).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(r3f): retire the photoreal plate branch (?photoreal/?cmp/?plate)"
```

---

### Task 2: Delete the retired background-plate island

**Files:**
- Delete: `apps/web/components/r3f/BackgroundPlateLayer.tsx`, `plateProxyGeometry.ts`, `plateCameraCalibration.ts`, `plateManifest.ts`
- Delete: `apps/web/components/r3f/BackgroundPlateLayer.test.tsx`, `BackgroundPlateLayer.truth.test.tsx`, `plateProxyGeometry.test.ts`, `plateCameraCalibration.test.ts`, `plateManifest.test.ts`
- Modify: `apps/web/components/r3f/SimulationCanvas.test.tsx:349,395` (retired-assertion comments)
- Modify: `apps/web/components/r3f/SimulationScene.tsx:373-376` (stale comment)

**Interfaces:**
- Consumes: Task 1 (PhotorealPlate already gone).
- Produces: zero references to `BackgroundPlateLayer|plateProxyGeometry|plateCameraCalibration|plateManifest` anywhere in `apps/web`.

These four modules are a self-contained retired island: only they import each other, plus their own tests (dependency-mapped 2026-07-02; no production component mounts them).

- [ ] **Step 1: Delete the island**

```bash
cd apps/web/components/r3f
git rm BackgroundPlateLayer.tsx BackgroundPlateLayer.test.tsx BackgroundPlateLayer.truth.test.tsx \
       plateProxyGeometry.ts plateProxyGeometry.test.ts \
       plateCameraCalibration.ts plateCameraCalibration.test.ts \
       plateManifest.ts plateManifest.test.ts
```

- [ ] **Step 2: Clean the comment references**

- `SimulationCanvas.test.tsx` lines 349 and 395: these are comment-only mentions asserting BackgroundPlateLayer is retired/not mounted. Reword the comments to not name the deleted module (e.g. "the retired background plate stays unmounted" → "no plate layer is mounted"), keeping the assertions themselves.
- `SimulationScene.tsx` lines ~373-376: the `BuildingLayerBoundary` comment says "BackgroundPlateLayer is retained in the repo as a reference asset" — now false. Change that sentence to "The plate system was deleted 2026-07-02."

- [ ] **Step 3: Verify zero references remain, run suite**

Run: `grep -rn "BackgroundPlateLayer\|plateProxyGeometry\|plateCameraCalibration\|plateManifest" apps/web --include=*.ts --include=*.tsx | grep -v node_modules`
Expected: no output.
Run: `cd apps/web && npx vitest run`
Expected: PASS (9 fewer test-file entries than baseline).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(r3f): delete the retired background-plate module island"
```

---

### Task 3: Identity vehicle placement — delete `plateVehicleCalibration`

**Files:**
- Delete: `apps/web/components/r3f/plateVehicleCalibration.ts`, `plateVehicleCalibration.test.ts`
- Modify: `apps/web/components/r3f/TrafficDensityLayer.tsx` (imports :58-62; call sites :~1351, :~1408, :~1417, :~1912)
- Modify: `apps/web/components/r3f/RoadSurfaceLayer.tsx` (imports :46-49; `rotateWestSpecAboutCenter` :~125-140 and its `.map()` call sites)
- Modify: `apps/web/components/r3f/laneAlignmentIntegration.test.ts`

**Interfaces:**
- Consumes: Task 1 (SimulationScene's `getCmpAGlobalXShiftMeters` import already removed).
- Produces: vehicles and markings always use RAW metric offsets (`getInboundLaneOffset` output, unmodified). No `plateVehicleCalibration` module. This is the behavior photobash mode already has (render-verified) — Task 4 relies on it.

**Why:** `applyCalibratedLaneOffset` applies plate-era per-approach offsets (v5 +1.3 m N/S, median-bus pin) in the DEFAULT code path and returns identity only when `?photobash=1` is in the URL (`plateVehicleCalibration.ts:260-263`). Promoting photobash to the default (no URL param) without this task would resurrect the plate offsets.

- [ ] **Step 1: Rewrite `laneAlignmentIntegration.test.ts` to raw-metric expectations first**

Open the file (imports `applyCalibratedLaneOffset`, `PLATE_VEHICLE_CALIBRATION` at :10-13). Rewrite every assertion that pipes `getInboundLaneOffset` through `applyCalibratedLaneOffset(raw, viewpoint, direction)` to use the raw value directly. Concretely: where a test computes `expected = cal.offset + cal.scale * raw`, the new expectation is `raw`. Delete the `PLATE_VEHICLE_CALIBRATION` import and any test that exists solely to verify calibration table entries. Keep every lane-geometry truth assertion (lane widths, lane counts, visible-lane alignment) — those pin `getInboundLaneOffset` behavior, which does not change.

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/web && npx vitest run components/r3f/laneAlignmentIntegration.test.ts`
Expected: FAIL — compilation error or mismatched expectations (module still exports calibrated values; TrafficDensityLayer still applies them).

- [ ] **Step 3: Strip `TrafficDensityLayer.tsx`**

- Delete the import block (lines 58-62):
```tsx
import {
  applyCalibratedLaneOffset,
  applyCmpAWestVehicleTransform,
  getBusLaneLateral
} from "./plateVehicleCalibration";
```
- Call site ~:1345-1360 (`applyCmpAWestVehicleTransform` on precise vehicles): remove the call and the cmp=A comment; use the untransformed values:
```tsx
const west = {
  x: lanePosition.x,
  z: lanePosition.z,
  rotationY: degreesToRadians(vehicle.heading_degrees)
};
```
then simplify by renaming `west` usages to direct values if the variable becomes trivial (keep the diff minimal — renaming is optional).
- Call site ~:1400-1420 (median-bus pin + calibrated offset): replace
```tsx
  const busLaneLateral = isMedianBus
    ? getBusLaneLateral(viewpoint, lanePlacement.direction)
    : null;
  const rawLaneOffset = getInboundLaneOffset(
    lanePlacement.direction,
    lanePlacement.laneIndex,
    getApproachInboundLaneCount(lanePlacement.direction)
  );
  const laneOffset =
    busLaneLateral ??
    applyCalibratedLaneOffset(
      rawLaneOffset,
      viewpoint,
      lanePlacement.direction
    );
```
with
```tsx
  // Metric grid is the truth: every vehicle (median bus included) rides its raw
  // getInboundLaneOffset lane. Plate-era calibration/bus-pin deleted 2026-07-02.
  const laneOffset = getInboundLaneOffset(
    lanePlacement.direction,
    lanePlacement.laneIndex,
    getApproachInboundLaneCount(lanePlacement.direction)
  );
```
and delete the now-unused `isMedianBus` computation ONLY if nothing else reads it (grep within the function first).
- Call site ~:1905-1915 (far/fill builder): replace
```tsx
  const laneOffset =
    applyCalibratedLaneOffset(rawLaneOffset, viewpoint, direction) + lateralJitterMeters;
```
with
```tsx
  const laneOffset = rawLaneOffset + lateralJitterMeters;
```
(keep `rawLaneOffset` as computed from `getInboundLaneOffset` on the line above). If `viewpoint` becomes unused in that helper's signature, leave the parameter in place (other callers pass it) unless TypeScript flags it — then remove it and its call-site arguments.

- [ ] **Step 4: Strip `RoadSurfaceLayer.tsx`**

- Delete the import (lines 46-49):
```tsx
import {
  getCmpAWestRotationRad,
  rotateAboutIntersectionCenter
} from "./plateVehicleCalibration";
```
- Delete the `rotateWestSpecAboutCenter` helper (~:117-140, including its comment block) and remove every `rotateWestSpecAboutCenter(...)` / `.map(rotateWestSpecAboutCenter)` application (grep the file; with cmp=A gone the yaw is always 0, so the wrapper was already a no-op in every surviving mode).

- [ ] **Step 5: Delete the module and its test**

```bash
git rm apps/web/components/r3f/plateVehicleCalibration.ts apps/web/components/r3f/plateVehicleCalibration.test.ts
```

- [ ] **Step 6: Run the full suite and typecheck**

Run: `cd apps/web && npx vitest run && npx tsc --noEmit`
Expected: PASS, zero `plateVehicleCalibration` references (`grep -rn "plateVehicleCalibration\|applyCalibratedLaneOffset\|getBusLaneLateral\|CmpA" apps/web --include=*.ts --include=*.tsx | grep -v node_modules` → no output).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(r3f): vehicles ride the raw metric lane grid — delete plate-era vehicle calibration"
```

---

### Task 4: Promote the photobash composition to THE default scene

**Files:**
- Modify: `apps/web/components/r3f/SimulationScene.tsx` (full rewrite below)
- Modify: `apps/web/components/r3f/SignalLayer.tsx` (full rewrite below)
- Modify: `apps/web/components/r3f/stage6Quality.ts:126` (default weather rain → clear)
- Rename+Modify: `apps/web/components/r3f/SimulationScenePhotoreal.test.tsx` → `SimulationScene.test.tsx`
- Modify: any test asserting the old stage5 default (expect `SimulationCanvas.test.tsx` and possibly `SceneEnvironment`/`CameraRig` tests — fix what vitest flags)

**Interfaces:**
- Consumes: Task 3 (identity placement — REQUIRED before this task).
- Produces: `SimulationScene({ sceneSnapshot, qualityPreset?, weather?, timeOfDay?, viewpoint? })` — same signature, `weather` default now `"clear"`; default render = photobash composition named `photobash-scene`. `SignalLayer` prop `lightingPreset` becomes REQUIRED; new export `deriveSignalLightingPreset(weather: Stage6WeatherPresetName, timeOfDay: Stage6TimeOfDay): SignalLayerLightingPreset`. Task 6 threads `viewpoint` into this signature.

- [ ] **Step 1: Write the failing tests (rename the test file, pin the new default)**

`git mv apps/web/components/r3f/SimulationScenePhotoreal.test.tsx apps/web/components/r3f/SimulationScene.test.tsx`

Inside, replace the `photobash mode (?photobash=1)` describe with (keep helpers `setSearch`/`snapshot`/`collectDeepDisplayNames`):

```tsx
describe("default scene (no URL params)", () => {
  test("mounts the photobash composition with pedestrians and orbit controls", () => {
    setSearch("");
    const scene = SimulationScene({ sceneSnapshot: snapshot() });
    const names = collectDeepDisplayNames(scene);
    expect(names).toContain("MarkingDecalLayer");
    expect(names).toContain("LimitedOrbitControls");
    expect(names).toContain("BuildingLayer");
    expect(names).toContain("DynamicPedestrianLayer");
    expect(names).toContain("SignalLayer");
    expect(names).not.toContain("StaticRoadLayer");
  });

  test("?photobash=1 is an accepted no-op alias of the default", () => {
    setSearch("?photobash=1");
    const withParam = collectDeepDisplayNames(
      SimulationScene({ sceneSnapshot: snapshot() })
    );
    setSearch("");
    const withoutParam = collectDeepDisplayNames(
      SimulationScene({ sceneSnapshot: snapshot() })
    );
    expect(withParam).toEqual(withoutParam);
  });

  test("?roadonly=1 strips buildings, vehicles, signals, post-FX", () => {
    setSearch("?roadonly=1");
    const names = collectDeepDisplayNames(
      SimulationScene({ sceneSnapshot: snapshot() })
    );
    expect(names).toContain("MarkingDecalLayer");
    expect(names).not.toContain("BuildingLayer");
    expect(names).not.toContain("DynamicVehicleLayer");
    expect(names).not.toContain("SignalLayer");
    setSearch("");
  });

  test("cctv viewpoint selects the operatorCctv camera preset", () => {
    setSearch("");
    const scene = SimulationScene({
      sceneSnapshot: snapshot(),
      viewpoint: "cctv"
    });
    const rig = findElementByDisplayName(scene, "CameraRig");
    expect(rig?.props.preset).toBe("operatorCctv");
  });
});
```

If the file has no `findElementByDisplayName` helper, add one beside `collectDeepDisplayNames` (same traversal, returns the first element whose resolved display name matches).

Add a `SignalLayer` derivation test in the same file:

```tsx
describe("deriveSignalLightingPreset", () => {
  test.each([
    ["clear", "day", "day"],
    ["cloudy", "day", "cloudy"],
    ["rain", "day", "rain"],
    ["clear", "night", "night"],
    ["rain", "night", "night"]
  ] as const)("%s + %s → %s", (weather, timeOfDay, expected) => {
    expect(deriveSignalLightingPreset(weather, timeOfDay)).toBe(expected);
  });
});
```

(import `deriveSignalLightingPreset` from `./SignalLayer`).

- [ ] **Step 2: Run to verify failures**

Run: `cd apps/web && npx vitest run components/r3f/SimulationScene.test.tsx`
Expected: FAIL — default scene lacks MarkingDecalLayer/orbit controls; `deriveSignalLightingPreset` not exported.

- [ ] **Step 3: Rewrite `SignalLayer.tsx`**

Full new content:

```tsx
"use client";

import { memo } from "react";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { SignalHardware } from "./SignalHardware";
import type { Stage6TimeOfDay, Stage6WeatherPresetName } from "./stage6Quality";

export type SignalLayerLightingPreset = "day" | "cloudy" | "rain" | "night";

export function deriveSignalLightingPreset(
  weather: Stage6WeatherPresetName,
  timeOfDay: Stage6TimeOfDay
): SignalLayerLightingPreset {
  if (timeOfDay === "night") return "night";
  if (weather === "rain") return "rain";
  if (weather === "cloudy") return "cloudy";
  return "day";
}

function SignalLayerComponent({
  signals,
  lightingPreset
}: {
  signals: SceneSnapshot["signals"];
  lightingPreset: SignalLayerLightingPreset;
}) {
  return (
    <group
      name="stage5-signal-layer"
      userData={{
        signalCount: signals.length,
        signalStateSource: "SceneSnapshot.signals",
        realSignalControlClaim: false,
        lightingPreset
      }}
    >
      <SignalHardware signals={signals} lightingPreset={lightingPreset} />
    </group>
  );
}

export const SignalLayer = memo(SignalLayerComponent);
SignalLayer.displayName = "SignalLayer";
```

(The module-level `ACTIVE_SIGNAL_LAYER_LIGHTING_PRESET = "rain"` pin is gone; the prop is required, so TypeScript flags every caller.)

- [ ] **Step 4: Rewrite `SimulationScene.tsx`**

Full new content (this is the Task-1/2/3 survivor tree reorganized — helpers `SceneLighting`, `SceneFinishing`, `BuildingLayerBoundary`, `DynamicVehicleLayerWithWeather` keep their existing bodies from the current file EXCEPT `StaticRoadLayerWithDetails`, which is deleted):

```tsx
"use client";

import { Suspense } from "react";

import type { SceneSnapshot } from "./buildSceneSnapshot";
import { BuildingLayer } from "./BuildingLayer";
import { CameraRig } from "./CameraRig";
import { DynamicPedestrianLayer } from "./DynamicPedestrianLayer";
import { DynamicVehicleLayer } from "./DynamicVehicleLayer";
import { LimitedOrbitControls } from "./LimitedOrbitControls";
import { MarkingDecalLayer } from "./MarkingDecalLayer";
import { NightVehicleTreatment } from "./NightVehicleTreatment";
import { RoadSurfaceLayer } from "./RoadSurfaceLayer";
import { SceneEnvironment } from "./SceneEnvironment";
import { ScenePostFX } from "./ScenePostFX";
import { deriveSignalLightingPreset, SignalLayer } from "./SignalLayer";
import { StructuralGuideLayer } from "./StructuralGuideLayer";
import { WheelSprayLayer } from "./WheelSprayLayer";
import type {
  Stage6QualityPreset,
  Stage6TimeOfDay,
  Stage6WeatherPresetName
} from "./stage6Quality";
import { getStage6QualityPreset } from "./stage6Quality";

export type SimulationViewpoint = "wide" | "cctv";

function resolveViewpoint(explicit?: SimulationViewpoint): SimulationViewpoint {
  if (explicit) return explicit;
  if (typeof window === "undefined") return "wide";
  return new URLSearchParams(window.location.search).get("viewpoint") === "cctv"
    ? "cctv"
    : "wide";
}

// Guide mode: ?guide=1 — suppresses buildings, vehicles, PostFX and renders a
// flat structural guide (road layout + lane markings + building massing) for use
// as imagegen conditioning input. The default scene is unaffected.
function resolveGuideMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("guide") === "1";
}

// ?roadonly=1 — imagegen base tooling: strips buildings, vehicles, signals and
// post-FX, leaving only the metric road + lane decals as a clean alignment
// anchor for image generation. Kept for the facade/backdrop regen workflows.
function resolveRoadOnlyMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("roadonly") === "1";
}

// The default scene IS the photobash composition (promoted 2026-07-02; the
// former vector-marking stage5 branch and the ?photoreal plate branch were
// retired — see apps/web/AGENTS.md locked decisions). ?photobash=1 is accepted
// as a no-op alias for old bookmarks and render tooling.
export function SimulationScene({
  sceneSnapshot,
  qualityPreset = getStage6QualityPreset("high"),
  weather = "clear",
  timeOfDay = "day",
  viewpoint
}: {
  sceneSnapshot: SceneSnapshot;
  qualityPreset?: Stage6QualityPreset;
  weather?: Stage6WeatherPresetName;
  timeOfDay?: Stage6TimeOfDay;
  viewpoint?: SimulationViewpoint;
}) {
  const isNight = timeOfDay === "night";
  const activeViewpoint = resolveViewpoint(viewpoint);
  const cameraPreset =
    activeViewpoint === "cctv" ? "operatorCctv" : "operatorWide";

  if (resolveGuideMode()) {
    // "nightAerialProof" for wide (= STAGE5_CAMERA, exact guide-camera match)
    // and "operatorCctv" for cctv. No vehicles, no PostFX.
    const guideCameraPreset =
      activeViewpoint === "cctv" ? "operatorCctv" : "nightAerialProof";
    return (
      <group name="structural-guide-scene">
        <CameraRig preset={guideCameraPreset} />
        <StructuralGuideLayer />
      </group>
    );
  }

  const isRoadOnly = resolveRoadOnlyMode();
  return (
    <group name="photobash-scene">
      <CameraRig
        key={cameraPreset}
        preset={cameraPreset}
        weather={weather}
        timeOfDay={timeOfDay}
      />
      <LimitedOrbitControls key={`orbit-${cameraPreset}`} />
      <SceneLighting
        isNight={isNight}
        sceneSnapshot={sceneSnapshot}
        qualityPreset={qualityPreset}
        weather={weather}
        timeOfDay={timeOfDay}
        suppressAtmosphericScenery={isRoadOnly}
      />
      {!isRoadOnly && (
        <BuildingLayerBoundary timeOfDay={timeOfDay} qualityPreset={qualityPreset} />
      )}
      <Suspense fallback={null}>
        <RoadSurfaceLayer isNight={isNight} suppressVectorMarkings />
      </Suspense>
      <MarkingDecalLayer />
      {!isRoadOnly && (
        <DynamicVehicleLayerWithWeather
          isNight={isNight}
          timeOfDay={timeOfDay}
          sceneSnapshot={sceneSnapshot}
          qualityPreset={qualityPreset}
          viewpoint={activeViewpoint}
        />
      )}
      {!isRoadOnly && <DynamicPedestrianLayer sceneSnapshot={sceneSnapshot} />}
      {!isRoadOnly && (
        <SignalLayer
          signals={sceneSnapshot.signals}
          lightingPreset={deriveSignalLightingPreset(weather, timeOfDay)}
        />
      )}
      {!isRoadOnly && (
        <SceneFinishing isNight={isNight} qualityPreset={qualityPreset} />
      )}
    </group>
  );
}
```

Below the component, keep the existing `SceneLighting`, `SceneFinishing`, `BuildingLayerBoundary`, and `DynamicVehicleLayerWithWeather` helper definitions verbatim from the current file (lines 325-456), minus `StaticRoadLayerWithDetails` (delete it — nothing references it now).

Notes for the implementer:
- `key={cameraPreset}` / `key={`orbit-${cameraPreset}`}` force a camera + orbit-target re-seat when the viewpoint toggle (Task 6) changes the preset — CameraRig applies presets on mount.
- The group name stays `photobash-scene` so existing telemetry/tests keyed on it keep working. The old `smart-intersection-stage5-*` group name is gone — fix any test asserting it (Step 6).

- [ ] **Step 5: Change the module-level weather default**

`apps/web/components/r3f/stage6Quality.ts` line 126: in `getStage6WeatherPreset`, change `return "rain";` to `return "clear";`. Also update the component default in `SimulationScene` (already `"clear"` in the rewrite above) and grep for other `= "rain"` prop defaults: `grep -rn '"rain"' apps/web/components --include=*.tsx | grep -v test | grep default` — align any found (expected: none besides the two above; `SimulationCanvas.tsx` takes weather as a required prop from R3FSimulationViewport).

- [ ] **Step 6: Run the full suite; fix assertions pinned to the old default**

Run: `cd apps/web && npx vitest run`
Expected failures to fix (update expectations, don't weaken):
- tests asserting default weather `"rain"` from `getStage6PresentationMode()` → now `"clear"`;
- tests asserting the `smart-intersection-stage5-…` group name or `StaticRoadLayer` presence → new default names;
- any `SignalLayer` usage without `lightingPreset` (TypeScript error) → pass `deriveSignalLightingPreset(...)` or a literal.
Then: `npx tsc --noEmit` — expected PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(r3f): promote the photobash composition to the default scene"
```

---

### Task 5: Live SUMO by default

**Files:**
- Modify: `.env` (repo root)
- Modify: `.env.example` (repo root)
- Modify: `apps/web/components/DashboardRoute.tsx:52`
- Modify: `apps/web/components/DashboardRoute.test.tsx` (default-scenario assertions)
- Modify: `docs/runtime-setup.md` (mode documentation)

**Interfaces:**
- Consumes: nothing (independent of Tasks 1-4).
- Produces: default deployment serves `source=sumo_traci` frames for the default dashboard scenario. `DEFAULT_SCENARIO_ID = "normal"`.

Background: `ScenarioRoutingFrameProvider` routes ONLY `"normal"` to live SUMO (`apps/api/app/services/simulation_frame_provider.py:91`); every other scenario intentionally stays fixture (Phase B). SUMO is proven working locally (`RUN_SUMO_LIVE=1` gate test passes in 1.89 s; binary at `apps/api/.venv/bin/sumo`). The SUMO-failure fallback chain (last-good 1 s cache → fixture, with degraded events) already exists — do not touch it.

- [ ] **Step 1: Update the default-scenario test first**

Grep BOTH `apps/web/components/DashboardRoute.test.tsx` and `apps/web/components/DashboardShell.test.tsx` for `"emergency"` — DashboardShell.test.tsx renders `<DashboardRoute />` in several tests and mocks its API via the hoisted `dashboardRouteApiMock` / `mockDashboardRouteApi()` helpers. Update any assertion expecting the initial scenario `"emergency"` to `"normal"`, and add one explicit pin (in DashboardShell.test.tsx, using its existing mock installers):

```tsx
test("defaults to the normal scenario (the live SUMO scenario)", async () => {
  mockDashboardRouteApi();
  render(<DashboardRoute />);
  await waitFor(() =>
    expect(dashboardRouteApiMock.getIntersectionStatus).toHaveBeenCalledWith("normal")
  );
});
```

(Match the mock-method name to what `dashboardRouteApiMock` actually exposes — `DashboardRoute.tsx:267` calls `getIntersectionStatus(scenarioId)`; if the mock names differ, assert on the closest scenario-keyed call the existing tests already inspect.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/web && npx vitest run components/DashboardRoute.test.tsx`
Expected: FAIL — default is still `"emergency"`.

- [ ] **Step 3: Flip the default scenario**

`apps/web/components/DashboardRoute.tsx:52`:

```tsx
const DEFAULT_SCENARIO_ID: ScenarioId = "normal";
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/web && npx vitest run components/DashboardRoute.test.tsx`
Expected: PASS.

- [ ] **Step 5: Flip the env defaults**

`.env` (repo root): change `SUMO_SIMULATION_MODE=fixture` → `SUMO_SIMULATION_MODE=sumo_traci`, and add below the `NEXT_PUBLIC_API_BASE_URL` line:

```
NEXT_PUBLIC_R3F_SIMULATION_ENABLED=true
```

`.env.example`: same two changes, PLUS comment out the active stream line (it short-circuits the viewport BEFORE the R3F gate — `SimulationViewport.tsx:17-51`):

```
# Optional hosted stream — leave commented so the R3F 3D scene renders.
# NEXT_PUBLIC_SIMULATION_STREAM_URL=http://127.0.0.1
NEXT_PUBLIC_R3F_SIMULATION_ENABLED=true
```

(delete the old uncommented `NEXT_PUBLIC_SIMULATION_STREAM_URL=http://127.0.0.1` line 5.)

- [ ] **Step 6: Update `docs/runtime-setup.md`**

Where it documents `SUMO_SIMULATION_MODE`, state the new default is `sumo_traci` (live) with automatic fixture fallback, fixture remains the CI/no-SUMO option, and `NEXT_PUBLIC_R3F_SIMULATION_ENABLED=true` is required for the 3D viewport. Keep edits to the existing wording style.

- [ ] **Step 7: Live proof (backend serves SUMO frames)**

```bash
cd apps/api
RUN_SUMO_LIVE=1 SUMO_SIMULATION_MODE=sumo_traci .venv/bin/python -m pytest tests/test_sumo_live_operation.py -q
```
Expected: `1 passed`.

Then boot the API with the new .env and assert the frame source end-to-end:

```bash
cd apps/api && .venv/bin/uvicorn app.main:app --port 8000 &
sleep 3
curl -s "http://127.0.0.1:8000/api/simulation/frame?scenario_id=normal" | python3 -c "import json,sys; f=json.load(sys.stdin); print(f.get('source')); assert f.get('source') == 'sumo_traci', f"
kill %1
```
Expected: prints `sumo_traci`. (If the query param name differs, check `apps/api/app/api/routes.py` for the frame endpoint's actual signature and adjust.)

- [ ] **Step 8: Full web suite, then commit**

Run: `cd apps/web && npx vitest run`
Expected: PASS.

```bash
git add -A
git commit -m "feat: live SUMO is the default — sumo_traci mode, normal scenario, R3F flag in env"
```

---

### Task 6: Scene UI controls (day/night, weather, camera)

**Files:**
- Modify: `apps/web/components/r3f/stage6Quality.ts` (new exported type)
- Modify: `apps/web/components/DashboardRoute.tsx` (state + URL init + props)
- Modify: `apps/web/components/DashboardShell.tsx` (scene-controls cluster + prop pass-through)
- Modify: `apps/web/components/DigitalTwin.tsx:87-96` (pass-through)
- Modify: `apps/web/components/SimulationViewportFallback.tsx` (`SimulationViewportProps` type extension)
- Modify: `apps/web/components/r3f/R3FSimulationViewport.tsx:68,155-160` (prop override)
- Modify: `apps/web/components/r3f/SimulationCanvas.tsx:139-144` (thread `viewpoint`)
- Test: `apps/web/components/DashboardShell.test.tsx`, `apps/web/components/r3f/SimulationCanvas.test.tsx`

**Interfaces:**
- Consumes: Task 4's `SimulationScene` signature (`viewpoint` prop, `weather`/`timeOfDay` props).
- Produces:
```ts
// stage6Quality.ts
export type ScenePresentationState = {
  weather: Stage6WeatherPresetName;
  timeOfDay: Stage6TimeOfDay;
  viewpoint: "wide" | "cctv";
};
```
`DashboardShellProps` gains `scenePresentation: ScenePresentationState` and `onScenePresentationChange: (next: ScenePresentationState) => void`. `SimulationViewportProps` gains optional `scenePresentation?: ScenePresentationState`.

- [ ] **Step 1: Write the failing DashboardShell test**

Add to `apps/web/components/DashboardShell.test.tsx`. The file already has `dashboardProps(overrides: Partial<Parameters<typeof DashboardShell>[0]>)` (line ~391) building full DashboardShell props, and imports `render`/`screen` from @testing-library/react. Add `import userEvent from "@testing-library/user-event";` (package installed):

```tsx
test("scene controls fire onScenePresentationChange", async () => {
  const user = userEvent.setup();
  const onScenePresentationChange = vi.fn();
  render(
    <DashboardShell
      {...dashboardProps({
        scenePresentation: { weather: "clear", timeOfDay: "day", viewpoint: "wide" },
        onScenePresentationChange
      })}
    />
  );

  await user.click(screen.getByRole("button", { name: /야간|Night/i }));
  expect(onScenePresentationChange).toHaveBeenCalledWith({
    weather: "clear",
    timeOfDay: "night",
    viewpoint: "wide"
  });

  await user.click(screen.getByRole("button", { name: /강우|Rain/i }));
  expect(onScenePresentationChange).toHaveBeenCalledWith({
    weather: "rain",
    timeOfDay: "day",
    viewpoint: "wide"
  });

  await user.click(screen.getByRole("button", { name: /CCTV/i }));
  expect(onScenePresentationChange).toHaveBeenCalledWith({
    weather: "clear",
    timeOfDay: "day",
    viewpoint: "cctv"
  });
});
```

And the failing SimulationCanvas threading test in `apps/web/components/r3f/SimulationCanvas.test.tsx` — that file already calls `SimulationScene(...)` as a plain function and traverses returned element trees (e.g. its "composes the R3F scene through stable static and dynamic layers" test at ~:342). Add, using the same tree-walk idiom (a recursive search over `element.props.children` for an element whose `type === SimulationScene`):

```tsx
test("threads viewpoint down to SimulationScene", () => {
  const tree = SimulationCanvas({
    sceneSnapshot,
    qualityPreset: getStage6QualityPreset("high"),
    weather: "clear",
    timeOfDay: "day",
    viewpoint: "cctv"
  });
  const scene = findElementByType(tree, SimulationScene);
  expect(scene?.props.viewpoint).toBe("cctv");
});
```

If the file lacks a `findElementByType` helper, add one beside its existing traversal helpers (recurse `React.Children` / `props.children`, return the first element with the given `type`).

- [ ] **Step 2: Run both to verify they fail**

Run: `cd apps/web && npx vitest run components/DashboardShell.test.tsx components/r3f/SimulationCanvas.test.tsx`
Expected: FAIL — unknown props / no scene-controls buttons.

- [ ] **Step 3: Add the type + state + URL init**

`stage6Quality.ts` — add after the existing type exports:

```ts
export type ScenePresentationState = {
  weather: Stage6WeatherPresetName;
  timeOfDay: Stage6TimeOfDay;
  viewpoint: "wide" | "cctv";
};

export const DEFAULT_SCENE_PRESENTATION: ScenePresentationState = {
  weather: "clear",
  timeOfDay: "day",
  viewpoint: "wide"
};
```

`DashboardRoute.tsx` — beside the scenario state (line ~78):

```tsx
const [scenePresentation, setScenePresentation] =
  useState<ScenePresentationState>(DEFAULT_SCENE_PRESENTATION);

// URL params are the INITIAL override (verify scripts drive scenarios via
// ?r3fWeather/?r3fTimeOfDay/?viewpoint); after mount the UI toggles own the state.
// useEffect (not useState initializer) keeps SSR hydration clean.
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const mode = getStage6PresentationMode(params);
  setScenePresentation({
    weather: mode.weather,
    timeOfDay: mode.timeOfDay,
    viewpoint: params.get("viewpoint") === "cctv" ? "cctv" : "wide"
  });
}, []);
```

Pass both down in the `<DashboardShell …>` JSX (line ~402):

```tsx
scenePresentation={scenePresentation}
onScenePresentationChange={setScenePresentation}
```

- [ ] **Step 4: DashboardShell — cluster UI + pass-through**

Extend `DashboardShellProps` with the two fields (exact types from the Interfaces block). In the component body add `const p = scenePresentation;`. Insert the cluster next to the operation-mode panel, following its exact button idiom:

```tsx
<section
  className="scene-controls-panel"
  aria-label={locale === "ko" ? "화면 설정" : "Scene controls"}
>
  <div
    className="operation-toggle motion-toggle"
    role="group"
    aria-label={locale === "ko" ? "주야간" : "Time of day"}
  >
    {(["day", "night"] as const).map((tod) => (
      <button
        key={tod}
        type="button"
        aria-pressed={p.timeOfDay === tod}
        className={`motion-pressable command-pressable${p.timeOfDay === tod ? " active" : ""}`}
        onClick={() => onScenePresentationChange({ ...p, timeOfDay: tod })}
      >
        <strong>
          {tod === "day"
            ? locale === "ko" ? "주간" : "Day"
            : locale === "ko" ? "야간" : "Night"}
        </strong>
      </button>
    ))}
  </div>
  <div
    className="operation-toggle motion-toggle"
    role="group"
    aria-label={locale === "ko" ? "날씨" : "Weather"}
  >
    {(["clear", "cloudy", "rain"] as const).map((w) => (
      <button
        key={w}
        type="button"
        aria-pressed={p.weather === w}
        className={`motion-pressable command-pressable${p.weather === w ? " active" : ""}`}
        onClick={() => onScenePresentationChange({ ...p, weather: w })}
      >
        <strong>
          {w === "clear"
            ? locale === "ko" ? "맑음" : "Clear"
            : w === "cloudy"
              ? locale === "ko" ? "흐림" : "Cloudy"
              : locale === "ko" ? "강우" : "Rain"}
        </strong>
      </button>
    ))}
  </div>
  <div
    className="operation-toggle motion-toggle"
    role="group"
    aria-label={locale === "ko" ? "카메라" : "Camera"}
  >
    {(["wide", "cctv"] as const).map((vp) => (
      <button
        key={vp}
        type="button"
        aria-pressed={p.viewpoint === vp}
        className={`motion-pressable command-pressable${p.viewpoint === vp ? " active" : ""}`}
        onClick={() => onScenePresentationChange({ ...p, viewpoint: vp })}
      >
        <strong>
          {vp === "wide" ? (locale === "ko" ? "운영 와이드" : "Operator wide") : "CCTV"}
        </strong>
      </button>
    ))}
  </div>
</section>
```

Style hook: `scene-controls-panel` — add CSS beside the `.operation-mode-panel` rules in the stylesheet that styles it (grep `operation-mode-panel` under `apps/web/app`), reusing its layout rules; do NOT invent a new design language.

Pass `scenePresentation` into `<DigitalTwin …>` (DashboardShell.tsx:329-339), then in `DigitalTwin.tsx:87-96` pass it into `<SimulationViewport …>`.

- [ ] **Step 5: Viewport plumbing**

`SimulationViewportFallback.tsx` — extend the exported `SimulationViewportProps`:

```ts
scenePresentation?: ScenePresentationState;
```

(import the type from `./r3f/stage6Quality`; the fallback component ignores it.)

`R3FSimulationViewport.tsx` — destructure `scenePresentation` from props; replace line 68 and the SimulationCanvas mount (155-160):

```tsx
const urlPresentation = useMemo(() => getStage6PresentationMode(), []);
const weather = scenePresentation?.weather ?? urlPresentation.weather;
const timeOfDay = scenePresentation?.timeOfDay ?? urlPresentation.timeOfDay;
```

```tsx
<SimulationCanvas
  sceneSnapshot={sceneSnapshot}
  qualityPreset={stage6QualityPreset}
  weather={weather}
  timeOfDay={timeOfDay}
  viewpoint={scenePresentation?.viewpoint}
/>
```

(`stage6QualityPreset` keeps its existing URL-only source — quality has no UI toggle by design.)

`SimulationCanvas.tsx` — add optional `viewpoint?: SimulationViewpoint` to its props and forward it (line ~139):

```tsx
<SimulationScene
  sceneSnapshot={sceneSnapshot}
  qualityPreset={qualityPreset}
  weather={weather}
  timeOfDay={timeOfDay}
  viewpoint={viewpoint}
/>
```

- [ ] **Step 6: Run the suite + typecheck**

Run: `cd apps/web && npx vitest run && npx tsc --noEmit`
Expected: PASS including the two new tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(dashboard): scene UI controls — day/night, weather, camera preset threaded to the R3F scene"
```

---

### Task 7: Gates, visual re-baseline, browser proof

**Files:**
- Modify: `scripts/baselines/r3f-dashboard-visual-baseline.json` (re-baseline — intentional visual change)
- No other source changes expected; fix regressions if gates fail.

**Interfaces:**
- Consumes: everything above.
- Produces: all six checks green; reviewed day/night × clear/rain screenshots.

- [ ] **Step 1: Full unit suite (both apps)**

```bash
cd apps/web && npx vitest run
cd ../api && .venv/bin/python -m pytest -q
```
Expected: PASS / PASS (api suite unaffected by this plan; run it anyway — .env changed).

- [ ] **Step 2: Dashboard verify (screenshot harness)**

From repo root: `npm run verify:r3f-dashboard`
Expected: PASS; writes `artifacts/r3f-dashboard-details.json` + screenshots (desktop/mobile/canvas/webgl-off + stage6 day-high/night-high/rain-high/rain-low scenarios). The stage6 scenarios drive `r3fWeather`/`r3fTimeOfDay` via URL — these must still work through the Task-6 URL-init path.

- [ ] **Step 3: Visual review BEFORE re-baselining (codex CLI — project rule)**

Send the fresh screenshots to codex for inspection (visual confirmation must go through codex, not self-Read):

```bash
/home/chan/.local/bin/codex exec "Review these R3F dashboard screenshots for visual defects: clipping, z-fighting, missing layers (buildings/vehicles/signals/marking decals), broken lighting, misaligned lane decals. Compare day vs night vs rain. Report PASS or a defect list." --image artifacts/<day-high>.png --image artifacts/<night-high>.png --image artifacts/<rain-high>.png
```

(Adjust to the actual artifact filenames listed in `artifacts/r3f-dashboard-details.json`.)
Expected: PASS verdict. If defects: STOP, fix, re-run from Step 2. Do not re-baseline over a known defect.

- [ ] **Step 4: Re-baseline the visual diff**

Run: `npm run verify:r3f-visual-diff`
Expected: FAIL against the old baseline (intentional scene change). Read the header of `scripts/verify-r3f-visual-diff.mjs` for the baseline schema, then regenerate `scripts/baselines/r3f-dashboard-visual-baseline.json` from the fresh `artifacts/r3f-dashboard-details.json` (mirror the existing baseline's structure — same keys, new metric values). Re-run: `npm run verify:r3f-visual-diff` → PASS.

- [ ] **Step 5: Remaining gates**

```bash
npm run verify:r3f-performance   # draw-call budgets: 900 peak / 180 high; headless rAF → PASS_WITH_CONCERNS is acceptable
npm run verify:r3f-assets        # 25 MB budget — no new assets in this plan
npm run verify:security
```
Expected: PASS (or PASS_WITH_CONCERNS for performance under headless rAF only).

- [ ] **Step 6: Commit the baseline**

```bash
git add scripts/baselines/r3f-dashboard-visual-baseline.json artifacts/ 2>/dev/null || git add scripts/baselines/
git commit -m "test(r3f): re-baseline visual diff for the promoted photobash default scene"
```

(Only commit `artifacts/` files if the repo already tracks them — check `git status` first; if untracked by convention, commit the baseline JSON only.)

- [ ] **Step 7: Hand off for user review**

Report: gates status table, screenshot paths for the user's own review, and the note that pedestrians are mounted but render zero people until sub-project B adds SUMO person demand. Do NOT merge to main — merging is a user decision (superpowers:finishing-a-development-branch).
