# R3F Gangnam Night Plate Hybrid Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a photoreal Gangnam Teheran-ro night-neon background by projecting an imagegen-generated plate onto coarse proxy geometry, with real-time SUMO vehicles/pedestrians composited on top so they do not read as pasted-on.

**Architecture:** Three layers. A new background-plate layer projects a night plate onto reused road + building-block proxy geometry (which also writes depth for occlusion). The existing road layer stays SUMO-aligned. The existing dynamic layer renders SUMO truth, now lit/graded to match the plate. The plate is a visual enhancement that degrades to the current procedural background on failure.

**Tech Stack:** Next.js 16 (preview), React 19, React Three Fiber 9, three 0.184, @react-three/drei, @react-three/postprocessing, Vitest + Testing Library, Node ESM verify scripts. Plate pixels are produced by the `imagegen` skill in a Codex session.

## Global Constraints

- **Reuse policy — infra only.** Both the prior UE and prior R3F looks failed.
  Reuse is limited to **look-neutral infra**: SUMO/FastAPI bridge,
  `SimulationFrameSnapshot` data contract, asset manifest + verify gates, camera
  math (`STAGE5_CAMERA`), interpolation (`useInterpolatedSimulationFrame`), the
  test harness, `roadGeometry` constants/types, and the building blocks used
  ONLY as invisible depth occluders (`colorWrite` off). **All visual/look code
  is built fresh.** Existing visual components — `Stage6PostFX`,
  `WetRoadReflectors`, the `night` environment preset, `DynamicVehicleLayer`
  materials — are NOT assumed good and are NOT reused as the look; they are
  replaced. Underlying libraries (`@react-three/postprocessing`, `drei`) may be
  used directly. Any kept visual code must pass the photoreal browser-proof bar.
- Photorealism is the non-negotiable success bar. Toy/low-poly/pasted-on results are failures. Verified on browser-rendered night frames. (spec: Non-negotiable success criterion)
- The background plate never produces vehicle/pedestrian/signal truth. Vehicle positions come only from `SimulationFrameSnapshot`. (spec: Invariant)
- No real commercial brands, company logos, store names, or ad marks in any generated plate. (spec: User Decisions)
- Plate is optional: on plate load or WebGL failure, degrade to the existing procedural background. (spec: Fallback)
- Asset budget enforced by `npm run verify:r3f-assets` must still pass after adding plates/GLBs. (spec: Verification)
- New runtime assets MUST have a manifest entry with provenance + license and `visualRejectIfToyLike: true` where applicable. (spec: Asset License/Compliance)
- All units in meters; reuse existing `roadGeometry.ts` constants and `STAGE5_CAMERA` rather than introducing new coordinate systems.
- Test command: `npm --workspace apps/web run test`. Full gate: `npm run verify`.
- Branch already created: `feat/r3f-gangnam-night-plate-hybrid`. Commit after every task.

---

## File Structure

**New files:**
- `apps/web/components/r3f/plateCameraCalibration.ts` — single shared camera (FOV/position/target) used by the structural guide, imagegen framing notes, and the runtime plate. One responsibility: define+expose the calibrated camera.
- `apps/web/components/r3f/plateProxyGeometry.ts` — pure functions deriving the plate projection surface + occluder boxes from `roadGeometry.ts`. No React.
- `apps/web/components/r3f/BackgroundPlateLayer.tsx` — R3F component: load plate texture, project onto proxy, depth-only occluders, fallback.
- `apps/web/components/r3f/plateManifest.ts` — typed accessor for plate manifest entries (kind `texture`), mirroring `assetManifest.ts`.
- `apps/web/components/r3f/seamlessGrade.ts` — shared tonemap/exposure/grade + neon light config consumed by both plate and dynamic layers.
- `scripts/convert-seoul-vehicles-to-glb.mjs` — one-time OBJ→GLB conversion of archived Seoul vehicle meshes.
- Test files colocated: `plateCameraCalibration.test.ts`, `plateProxyGeometry.test.ts`, `BackgroundPlateLayer.test.tsx`, `plateManifest.test.ts`, `seamlessGrade.test.ts`.

**New visual components (built fresh, replacing the failed visual code):**
- `apps/web/components/r3f/NightSeamlessPostFX.tsx`, `NightSeamlessLighting.tsx`, `NightVehicleTreatment.tsx` — see Task 8.

**Modified files:**
- `apps/web/components/r3f/SimulationScene.tsx` — mount `BackgroundPlateLayer` and the fresh night visual components in the night path; do NOT mount the old `Stage6PostFX`/`WetRoadReflectors`/night-preset path at night.
- `apps/web/components/r3f/SimulationCanvas.tsx` / `R3FSimulationViewport.tsx` — default `timeOfDay` to `night` for the photoreal proof view.
- `apps/web/public/simulation/r3f/assets/manifest.json` — add plate + Seoul-vehicle GLB entries.
- `docs/compliance/r3f-asset-licenses.md` — record plate + GLB provenance.
- `scripts/verify-r3f-assets.mjs` — allow `runtimeUsage: "background-plate"` textures and verify plate provenance fields.

> Not reused as look (reuse policy): `EnvironmentLayer` night preset, `Stage6PostFX`, `WetRoadReflectors`, `DynamicVehicleLayer` materials. They stay for the legacy day path only.

---

## Task 1: Shared plate camera calibration

**Files:**
- Create: `apps/web/components/r3f/plateCameraCalibration.ts`
- Test: `apps/web/components/r3f/plateCameraCalibration.test.ts`

**Interfaces:**
- Consumes: `STAGE5_CAMERA`, `getStage5CameraForAspect` from `roadGeometry.ts`.
- Produces: `PLATE_CAMERA_ANGLES: PlateCameraAngle[]`, `getPlateCameraAngle(id: string): PlateCameraAngle`, type `PlateCameraAngle = { id: string; position: Vector3Tuple; target: Vector3Tuple; fovDegrees: number }`.

- [ ] **Step 1: Write the failing test**

```ts
// plateCameraCalibration.test.ts
import { describe, expect, it } from "vitest";
import { PLATE_CAMERA_ANGLES, getPlateCameraAngle } from "./plateCameraCalibration";
import { STAGE5_CAMERA } from "./roadGeometry";

describe("plateCameraCalibration", () => {
  it("exposes at least one fixed operator angle", () => {
    expect(PLATE_CAMERA_ANGLES.length).toBeGreaterThan(0);
  });

  it("default operator angle matches the existing STAGE5 camera framing", () => {
    const operator = getPlateCameraAngle("operator-wide");
    expect(operator.position).toEqual(STAGE5_CAMERA.position);
    expect(operator.fovDegrees).toBeCloseTo(STAGE5_CAMERA.fov, 5);
  });

  it("throws on unknown angle id", () => {
    expect(() => getPlateCameraAngle("nope")).toThrow(/unknown plate camera/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace apps/web run test -- components/r3f/plateCameraCalibration.test.ts`
Expected: FAIL ("Cannot find module './plateCameraCalibration'").

- [ ] **Step 3: Write minimal implementation**

```ts
// plateCameraCalibration.ts
import { STAGE5_CAMERA, type Vector3Tuple } from "./roadGeometry";

export type PlateCameraAngle = {
  id: string;
  position: Vector3Tuple;
  target: Vector3Tuple;
  fovDegrees: number;
};

// Few fixed angles only (spec: fixed/few angles). The guide render, imagegen
// framing, and runtime plate all use these exact values.
export const PLATE_CAMERA_ANGLES: PlateCameraAngle[] = [
  {
    id: "operator-wide",
    position: STAGE5_CAMERA.position,
    target: STAGE5_CAMERA.target ?? [0, 0, 0],
    fovDegrees: STAGE5_CAMERA.fov
  }
];

export function getPlateCameraAngle(id: string): PlateCameraAngle {
  const angle = PLATE_CAMERA_ANGLES.find((candidate) => candidate.id === id);
  if (!angle) {
    throw new Error(`Unknown plate camera angle: ${id}`);
  }
  return angle;
}
```

> If `STAGE5_CAMERA` lacks a `target` field, read its actual shape first and copy the real property names; do not invent fields.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace apps/web run test -- components/r3f/plateCameraCalibration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/r3f/plateCameraCalibration.ts apps/web/components/r3f/plateCameraCalibration.test.ts
git commit -m "feat(r3f): add shared plate camera calibration"
```

---

## Task 2: Proxy geometry builder (projection surface + occluders)

**Files:**
- Create: `apps/web/components/r3f/plateProxyGeometry.ts`
- Test: `apps/web/components/r3f/plateProxyGeometry.test.ts`

**Interfaces:**
- Consumes: `BUILDING_EDGE_BLOCKS`, `STAGE6E_CITY_EDGE_BLOCKS`, `ROAD_WIDTH_METERS`, `INTERSECTION_BOX_METERS`, type `BoxPrimitiveSpec` from `roadGeometry.ts`.
- Produces: `buildPlateProxy(): PlateProxy` where `PlateProxy = { occluders: BoxPrimitiveSpec[]; groundPlane: { size: number; y: number } }`.

- [ ] **Step 1: Write the failing test**

```ts
// plateProxyGeometry.test.ts
import { describe, expect, it } from "vitest";
import { buildPlateProxy } from "./plateProxyGeometry";
import { BUILDING_EDGE_BLOCKS } from "./roadGeometry";

describe("buildPlateProxy", () => {
  it("reuses existing building edge blocks as depth occluders", () => {
    const proxy = buildPlateProxy();
    expect(proxy.occluders.length).toBeGreaterThanOrEqual(
      BUILDING_EDGE_BLOCKS.length
    );
  });

  it("ground plane is at least as wide as the intersection footprint", () => {
    const proxy = buildPlateProxy();
    expect(proxy.groundPlane.size).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace apps/web run test -- components/r3f/plateProxyGeometry.test.ts`
Expected: FAIL ("Cannot find module './plateProxyGeometry'").

- [ ] **Step 3: Write minimal implementation**

```ts
// plateProxyGeometry.ts
import {
  BUILDING_EDGE_BLOCKS,
  INTERSECTION_BOX_METERS,
  STAGE6E_CITY_EDGE_BLOCKS,
  type BoxPrimitiveSpec
} from "./roadGeometry";

export type PlateProxy = {
  occluders: BoxPrimitiveSpec[];
  groundPlane: { size: number; y: number };
};

// One coarse proxy reused four ways: structural guide source, depth occluders,
// projection surface, and vehicle occlusion. Reuses the building blocks already
// defined for the scene so the plate aligns with the procedural fallback.
export function buildPlateProxy(): PlateProxy {
  const occluders = [...BUILDING_EDGE_BLOCKS, ...STAGE6E_CITY_EDGE_BLOCKS];
  return {
    occluders,
    groundPlane: { size: INTERSECTION_BOX_METERS * 6, y: 0 }
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace apps/web run test -- components/r3f/plateProxyGeometry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/r3f/plateProxyGeometry.ts apps/web/components/r3f/plateProxyGeometry.test.ts
git commit -m "feat(r3f): add plate proxy geometry builder"
```

---

## Task 3: Shared seamless grade + neon light config

**Files:**
- Create: `apps/web/components/r3f/seamlessGrade.ts`
- Test: `apps/web/components/r3f/seamlessGrade.test.ts`

**Interfaces:**
- Produces: `GANGNAM_NIGHT_GRADE: SeamlessGrade` where `SeamlessGrade = { toneMappingExposure: number; neonColor: string; environmentIntensity: number; bloomIntensity: number; vehicleEmissiveIntensity: number }`, `getSeamlessGrade(timeOfDay: Stage6TimeOfDay): SeamlessGrade`.

This is the single source of truth that ties the dynamic layer's look to the plate (spec: "dynamic layer passes through the same image-formation pipeline as the plate").

- [ ] **Step 1: Write the failing test**

```ts
// seamlessGrade.test.ts
import { describe, expect, it } from "vitest";
import { GANGNAM_NIGHT_GRADE, getSeamlessGrade } from "./seamlessGrade";

describe("seamlessGrade", () => {
  it("night grade enables emissive headlights for grounding", () => {
    expect(GANGNAM_NIGHT_GRADE.vehicleEmissiveIntensity).toBeGreaterThan(0);
  });

  it("night grade lowers exposure relative to a notional 1.0 baseline", () => {
    expect(GANGNAM_NIGHT_GRADE.toneMappingExposure).toBeLessThan(1);
  });

  it("returns the night grade for night", () => {
    expect(getSeamlessGrade("night")).toBe(GANGNAM_NIGHT_GRADE);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace apps/web run test -- components/r3f/seamlessGrade.test.ts`
Expected: FAIL ("Cannot find module './seamlessGrade'").

- [ ] **Step 3: Write minimal implementation**

```ts
// seamlessGrade.ts
import type { Stage6TimeOfDay } from "./stage6Quality";

export type SeamlessGrade = {
  toneMappingExposure: number;
  neonColor: string;
  environmentIntensity: number;
  bloomIntensity: number;
  vehicleEmissiveIntensity: number;
};

// Tuned to the Gangnam night-neon plate. The dynamic layer reads these so cars
// share the plate's exposure, neon cast, and bloom (no per-layer ad hoc look).
export const GANGNAM_NIGHT_GRADE: SeamlessGrade = {
  toneMappingExposure: 0.85,
  neonColor: "#2e6cff",
  environmentIntensity: 0.34,
  bloomIntensity: 0.9,
  vehicleEmissiveIntensity: 1.6
};

const DAY_GRADE: SeamlessGrade = {
  toneMappingExposure: 1.0,
  neonColor: "#ffffff",
  environmentIntensity: 0.74,
  bloomIntensity: 0.4,
  vehicleEmissiveIntensity: 0.2
};

export function getSeamlessGrade(timeOfDay: Stage6TimeOfDay): SeamlessGrade {
  return timeOfDay === "night" ? GANGNAM_NIGHT_GRADE : DAY_GRADE;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace apps/web run test -- components/r3f/seamlessGrade.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/r3f/seamlessGrade.ts apps/web/components/r3f/seamlessGrade.test.ts
git commit -m "feat(r3f): add shared seamless grade and neon light config"
```

---

## Task 4: Plate manifest entry + accessor + compliance

**Files:**
- Create: `apps/web/components/r3f/plateManifest.ts`
- Test: `apps/web/components/r3f/plateManifest.test.ts`
- Modify: `apps/web/public/simulation/r3f/assets/manifest.json`
- Modify: `docs/compliance/r3f-asset-licenses.md`
- Modify: `scripts/verify-r3f-assets.mjs`

**Interfaces:**
- Consumes: `R3F_ASSET_MANIFEST`, `getR3FAssetEntry` from `assetManifest.ts`.
- Produces: `getPlateEntry(angleId: string): R3FAssetEntry`, `PLATE_ASSET_ID_BY_ANGLE: Record<string,string>`.

- [ ] **Step 1: Add the plate manifest entry (placeholder path until imagegen runs)**

Add to `apps/web/public/simulation/r3f/assets/manifest.json` (match the existing entry field set; copy a `texture` entry and adjust):

```json
"plates/gangnam_night_operator_wide": {
  "id": "plates/gangnam_night_operator_wide",
  "path": "/simulation/r3f/assets/plates/gangnam_night_operator_wide.png",
  "kind": "texture",
  "source": "imagegen-generated-night-plate",
  "license": "Project-generated via imagegen; no real brands/logos; provenance in r3f-asset-licenses.md",
  "authorship": "generated",
  "units": "meters",
  "pbr": false,
  "pbrChannels": ["baseColor"],
  "lod": "atlas",
  "maxTextureSize": 2048,
  "maxTriangles": 0,
  "maxFileSizeBytes": 4000000,
  "compression": {
    "status": "png-source-atlas",
    "geometry": "none-texture-only",
    "texture": "png-source-atlas",
    "evidence": "background plate projected onto proxy; not a runtime truth surface"
  },
  "provenanceEvidencePath": "docs/compliance/r3f-asset-licenses.md",
  "runtimeUsage": "background-plate",
  "realismStatus": "stage6_finishing_source_ready",
  "visualRejectIfToyLike": true
}
```

- [ ] **Step 2: Record provenance in compliance doc**

Append to `docs/compliance/r3f-asset-licenses.md`:

```markdown
## Background plates (imagegen-generated)

- `plates/gangnam_night_operator_wide.png` — generated via the imagegen skill
  from a SUMO-derived structural guide. Prompt themed "Gangnam Teheran-ro night
  neon, high-rise glass towers, wet asphalt"; avoid list excluded all real
  brands, logos, and store names. Background visual only; not a truth surface.
```

- [ ] **Step 3: Write the failing test**

```ts
// plateManifest.test.ts
import { describe, expect, it } from "vitest";
import { getPlateEntry } from "./plateManifest";

describe("plateManifest", () => {
  it("resolves the operator-wide night plate entry", () => {
    const entry = getPlateEntry("operator-wide");
    expect(entry.runtimeUsage).toBe("background-plate");
    expect(entry.visualRejectIfToyLike).toBe(true);
  });

  it("throws for an unmapped angle", () => {
    expect(() => getPlateEntry("nope")).toThrow(/no plate/i);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm --workspace apps/web run test -- components/r3f/plateManifest.test.ts`
Expected: FAIL ("Cannot find module './plateManifest'").

- [ ] **Step 5: Write minimal implementation**

```ts
// plateManifest.ts
import { getR3FAssetEntry, type R3FAssetEntry } from "./assetManifest";

export const PLATE_ASSET_ID_BY_ANGLE: Record<string, string> = {
  "operator-wide": "plates/gangnam_night_operator_wide"
};

export function getPlateEntry(angleId: string): R3FAssetEntry {
  const assetId = PLATE_ASSET_ID_BY_ANGLE[angleId];
  if (!assetId) {
    throw new Error(`No plate mapped for camera angle: ${angleId}`);
  }
  return getR3FAssetEntry(assetId);
}
```

- [ ] **Step 6: Allow background-plate textures in the verify script**

In `scripts/verify-r3f-assets.mjs`, where entries are validated, ensure a `texture` entry with `runtimeUsage: "background-plate"` is accepted and that its `provenanceEvidencePath` exists. Read the validation loop first, then add (near the kind/usage checks):

```js
// background plates are texture-only visual sources, not truth surfaces
if (entry.runtimeUsage === "background-plate" && entry.kind !== "texture") {
  errors.push(`${entry.id}: background-plate must use kind "texture"`);
}
```

- [ ] **Step 7: Run tests + asset verify**

Run: `npm --workspace apps/web run test -- components/r3f/plateManifest.test.ts`
Expected: PASS.
Run: `npm run verify:r3f-assets`
Expected: PASS (the placeholder PNG must exist; if the script checks file presence, add a 1x1 placeholder PNG at the path until imagegen produces the real plate, noted in Task 6).

- [ ] **Step 8: Commit**

```bash
git add apps/web/public/simulation/r3f/assets/manifest.json docs/compliance/r3f-asset-licenses.md scripts/verify-r3f-assets.mjs apps/web/components/r3f/plateManifest.ts apps/web/components/r3f/plateManifest.test.ts
git commit -m "feat(r3f): register gangnam night plate manifest entry"
```

---

## Task 5: BackgroundPlateLayer (projection + depth occluders + fallback)

**Files:**
- Create: `apps/web/components/r3f/BackgroundPlateLayer.tsx`
- Test: `apps/web/components/r3f/BackgroundPlateLayer.test.tsx`

**Interfaces:**
- Consumes: `buildPlateProxy` (Task 2), `getPlateCameraAngle` (Task 1), `getPlateEntry` (Task 4), `getSeamlessGrade` (Task 3).
- Produces: `<BackgroundPlateLayer angleId={string} timeOfDay={Stage6TimeOfDay} enabled?={boolean} />`.

Behavior: when enabled and the plate texture loads, render occluder boxes as depth-only (colorWrite off) plus the projected plate; emit `userData={{ truthSource: "background_plate_visual_only" }}`. When disabled or texture missing, render nothing (procedural fallback already present in the scene).

- [ ] **Step 1: Write the failing test**

```tsx
// BackgroundPlateLayer.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { BackgroundPlateLayer } from "./BackgroundPlateLayer";

// Render under R3F's test path mirrors existing layer tests (see
// CameraWeatherClutter.test.tsx for the canvas/test harness pattern to copy).
describe("BackgroundPlateLayer", () => {
  it("is a no-op when disabled (procedural fallback owns the background)", () => {
    const { container } = render(
      <BackgroundPlateLayer angleId="operator-wide" timeOfDay="night" enabled={false} />
    );
    expect(container).toBeTruthy();
  });

  it("never declares itself a vehicle/signal truth source", () => {
    // Asserts the userData truthSource marker string is the visual-only one.
    // Implement by exporting BACKGROUND_PLATE_TRUTH_SOURCE and asserting it.
    expect(true).toBe(true);
  });
});
```

> Copy the exact R3F test harness (Canvas wrapper / `@react-three/test-renderer` or jsdom approach) from `CameraWeatherClutter.test.tsx` so this test runs in the same environment as existing layer tests. Replace the placeholder second test with a concrete assertion on `BACKGROUND_PLATE_TRUTH_SOURCE`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace apps/web run test -- components/r3f/BackgroundPlateLayer.test.tsx`
Expected: FAIL ("Cannot find module './BackgroundPlateLayer'").

- [ ] **Step 3: Write minimal implementation**

```tsx
// BackgroundPlateLayer.tsx
"use client";

import { memo, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import type { Stage6TimeOfDay } from "./stage6Quality";
import { buildPlateProxy } from "./plateProxyGeometry";
import { getPlateCameraAngle } from "./plateCameraCalibration";
import { getPlateEntry } from "./plateManifest";
import { getSeamlessGrade } from "./seamlessGrade";

export const BACKGROUND_PLATE_TRUTH_SOURCE = "background_plate_visual_only";

function BackgroundPlateLayerComponent({
  angleId,
  timeOfDay,
  enabled = true
}: {
  angleId: string;
  timeOfDay: Stage6TimeOfDay;
  enabled?: boolean;
}) {
  if (!enabled || timeOfDay !== "night") return null;

  const proxy = useMemo(() => buildPlateProxy(), []);
  const angle = useMemo(() => getPlateCameraAngle(angleId), [angleId]);
  const grade = getSeamlessGrade(timeOfDay);
  const plate = getPlateEntry(angleId);
  const texture = useTexture(plate.path);

  return (
    <group
      name="gangnam-night-background-plate"
      userData={{ truthSource: BACKGROUND_PLATE_TRUTH_SOURCE, angleId, grade }}
    >
      {/* Depth-only occluders: cars behind buildings get correctly hidden. */}
      {proxy.occluders.map((box, index) => (
        <mesh key={`occluder-${index}`} position={box.position}>
          <boxGeometry args={box.size} />
          <meshBasicMaterial colorWrite={false} />
        </mesh>
      ))}
      {/* Projection surface: the plate textured onto the ground/backdrop proxy
          so the result reads as 3D, not a flat plane. Project from `angle`. */}
      <mesh position={[0, proxy.groundPlane.y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[proxy.groundPlane.size, proxy.groundPlane.size]} />
        <meshBasicMaterial map={texture} toneMapped />
      </mesh>
    </group>
  );
}

export const BackgroundPlateLayer = memo(BackgroundPlateLayerComponent);
BackgroundPlateLayer.displayName = "BackgroundPlateLayer";
```

> Projection detail: for the production look, replace the flat ground plane with camera-projected UVs onto the proxy (project from `angle.position`/`angle.target`). The minimal version above proves wiring + occlusion + fallback; the projection-mapping upgrade is Step 6.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace apps/web run test -- components/r3f/BackgroundPlateLayer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Guard the texture load with a fallback**

Wrap `useTexture` usage so a missing/failed plate renders `null` (procedural background remains). Use a `<Suspense fallback={null}>` boundary at the mount site (Task 7) and/or a try path. Add a test asserting no throw when the texture path is absent.

- [ ] **Step 6: Upgrade to camera projection mapping**

Replace the flat textured plane with projected UVs computed from `angle` so the plate drapes over the proxy boxes (set up a projection matrix from `angle.position` → `angle.target`, `angle.fovDegrees`). Add a unit test on the projection UV helper (extract it into `plateProxyGeometry.ts` as a pure function `projectPlateUVs(...)` so it is testable without a GPU).

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/r3f/BackgroundPlateLayer.tsx apps/web/components/r3f/BackgroundPlateLayer.test.tsx apps/web/components/r3f/plateProxyGeometry.ts
git commit -m "feat(r3f): add background plate layer with depth occluders and projection"
```

---

## Task 6: Generate the Gangnam night plate (imagegen, Codex session)

**Files:**
- Create: `apps/web/public/simulation/r3f/assets/plates/gangnam_night_operator_wide.png`
- Create (tooling): `scripts/render-plate-structural-guide.mjs` (renders the proxy from the calibrated angle into a guide image to condition imagegen)

This task produces pixels, not TDD code. It runs in a **Codex session** using the `imagegen` skill (built-in `image_gen`).

- [ ] **Step 1: Render the structural guide**

Write `scripts/render-plate-structural-guide.mjs` to draw `buildPlateProxy()` from `getPlateCameraAngle("operator-wide")` as a clean line/silhouette image (roads, lane lines, building boxes) to `artifacts/plate-guides/operator-wide-guide.png`. (Headless render via node-canvas projection of the proxy boxes; no GPU needed for a schematic guide.)

- [ ] **Step 2: Generate the plate via imagegen (Codex)**

Use the imagegen skill with the guide as the reference/edit base. Prompt:

> "Photorealistic Gangnam Teheran-ro arterial intersection at night, dense high-rise glass office towers, glowing neon signage in Korean, wet asphalt with reflections, red central bus-only lane, wide multi-lane road matching the reference layout, cinematic night photography, no people in foreground. Match the road and building layout of the reference image exactly."

Avoid list: real brand names, company logos, store names, ad marks, watermarks, text gibberish on signs.

- [ ] **Step 3: Validate + place**

- Confirm the plate visually matches the guide's road/building layout.
- Confirm no real brands/logos (manual review per Global Constraints).
- Copy the selected output to `apps/web/public/simulation/r3f/assets/plates/gangnam_night_operator_wide.png`.

- [ ] **Step 4: Verify assets + browser proof**

Run: `npm run verify:r3f-assets`
Expected: PASS (real plate now present, within `maxFileSizeBytes`).
Run: `npm --workspace apps/web run dev`, open the night proof view, capture a browser screenshot to `docs/technotes/assets/smart-intersection-generated-screenshots/r3f-gangnam-night-proof.png`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/public/simulation/r3f/assets/plates/ scripts/render-plate-structural-guide.mjs docs/technotes/assets/smart-intersection-generated-screenshots/r3f-gangnam-night-proof.png
git commit -m "feat(r3f): add generated gangnam night plate + structural guide tool"
```

---

## Task 7: Mount plate in the scene + default to night

**Files:**
- Modify: `apps/web/components/r3f/SimulationScene.tsx`
- Modify: `apps/web/components/r3f/SimulationCanvas.tsx:105` (default `timeOfDay`)
- Test: extend `apps/web/components/r3f/SimulationCanvas.test.tsx`

**Interfaces:**
- Consumes: `BackgroundPlateLayer` (Task 5).

- [ ] **Step 1: Write the failing test**

```tsx
// in SimulationCanvas.test.tsx (add case)
it("mounts the background plate layer for the night proof view", () => {
  // Render SimulationScene with timeOfDay="night" using the existing test
  // harness in this file; assert a node named "gangnam-night-background-plate"
  // exists in the scene graph.
});
```

> Use the existing render/scene-graph assertion style already in `SimulationCanvas.test.tsx` / `DashboardShell.test.tsx`; copy that harness rather than inventing one.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace apps/web run test -- components/r3f/SimulationCanvas.test.tsx`
Expected: FAIL (no plate node).

- [ ] **Step 3: Mount the layer (with Suspense fallback)**

In `SimulationScene.tsx`, import and mount inside the root group, before the dynamic layers:

```tsx
import { Suspense } from "react";
import { BackgroundPlateLayer } from "./BackgroundPlateLayer";
// ...
<Suspense fallback={null}>
  <BackgroundPlateLayer angleId="operator-wide" timeOfDay={timeOfDay} />
</Suspense>
```

In `SimulationCanvas.tsx`, change the photoreal proof view default `timeOfDay = "day"` to `timeOfDay = "night"` (line ~105). Leave the operator-wide flow view configurable via the existing `r3fTimeOfDay` query/env.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace apps/web run test -- components/r3f/SimulationCanvas.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/r3f/SimulationScene.tsx apps/web/components/r3f/SimulationCanvas.tsx apps/web/components/r3f/SimulationCanvas.test.tsx
git commit -m "feat(r3f): mount night background plate and default proof view to night"
```

---

## Task 8: Build the fresh night seamless visual layer (no reuse of failed visual code)

Per the reuse policy, do NOT reuse `Stage6PostFX`, `WetRoadReflectors`, the
`night` environment preset, or `DynamicVehicleLayer` materials. Build fresh
night-look components driven by `seamlessGrade.ts`, using the underlying
libraries (`@react-three/postprocessing`, `drei`) directly. The night scene path
mounts these new components instead of the old failed ones.

**Files:**
- Create: `apps/web/components/r3f/NightSeamlessPostFX.tsx` (fresh ACES tonemap + bloom from grade)
- Create: `apps/web/components/r3f/NightSeamlessLighting.tsx` (fresh env/ambient from grade neon cast)
- Create: `apps/web/components/r3f/NightVehicleTreatment.tsx` (fresh emissive head/taillights + contact shadow + wet reflection for the dynamic layer)
- Test: `apps/web/components/r3f/NightSeamlessPostFX.test.tsx`, `apps/web/components/r3f/NightVehicleTreatment.test.tsx`

> The old visual components remain in the repo for the legacy day path but are
> NOT mounted in the night photoreal path. A later cleanup task may remove them
> once the night path is the only supported look.

- [ ] **Step 1: Test — fresh postFX reads the shared grade**

```tsx
// NightSeamlessPostFX.test.tsx
import { describe, expect, it } from "vitest";
import { resolveNightPostFXConfig } from "./NightSeamlessPostFX";
import { getSeamlessGrade } from "./seamlessGrade";

describe("NightSeamlessPostFX", () => {
  it("derives exposure and bloom from the shared night grade", () => {
    const grade = getSeamlessGrade("night");
    const config = resolveNightPostFXConfig();
    expect(config.toneMappingExposure).toBe(grade.toneMappingExposure);
    expect(config.bloomIntensity).toBe(grade.bloomIntensity);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace apps/web run test -- components/r3f/NightSeamlessPostFX.test.tsx`
Expected: FAIL ("Cannot find module './NightSeamlessPostFX'").

- [ ] **Step 3: Implement fresh postFX**

```tsx
// NightSeamlessPostFX.tsx
"use client";

import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { GANGNAM_NIGHT_GRADE } from "./seamlessGrade";

export function resolveNightPostFXConfig() {
  return {
    toneMappingExposure: GANGNAM_NIGHT_GRADE.toneMappingExposure,
    bloomIntensity: GANGNAM_NIGHT_GRADE.bloomIntensity
  };
}

export function NightSeamlessPostFX() {
  const config = resolveNightPostFXConfig();
  return (
    <EffectComposer>
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Bloom intensity={config.bloomIntensity} mipmapBlur luminanceThreshold={0.6} />
    </EffectComposer>
  );
}
```

> Verify `@react-three/postprocessing` export names against the installed version
> before finalizing; adjust imports if the API differs. Apply
> `config.toneMappingExposure` to the renderer (`gl.toneMappingExposure`) via a
> small `useThree` effect so plate and dynamic layer share one exposure.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace apps/web run test -- components/r3f/NightSeamlessPostFX.test.tsx`
Expected: PASS.

- [ ] **Step 5: Fresh night lighting (neon cast from grade)**

Create `NightSeamlessLighting.tsx`: build IBL/ambient whose intensity is
`GANGNAM_NIGHT_GRADE.environmentIntensity` and color is biased to
`GANGNAM_NIGHT_GRADE.neonColor`, so vehicles receive the scene's neon light.
Use the PMREM/RoomEnvironment machinery pattern from `EnvironmentLayer.tsx` as a
reference for the API only — write it fresh, do not import the night preset.

- [ ] **Step 6: Fresh vehicle treatment (emissive + contact shadow + wet reflection)**

Create `NightVehicleTreatment.tsx` wrapping the dynamic vehicles to add:
emissive head/taillights at `grade.vehicleEmissiveIntensity` with bloom-driven
glow + small road light pools; a transparent shadow-catcher contact shadow; a
planar/SSR wet reflection. Add `NightVehicleTreatment.test.tsx` asserting
emissive intensity comes from the grade and is > 0 at night.

- [ ] **Step 7: Wire the fresh components into the night scene path**

In `SimulationScene.tsx`, when `timeOfDay === "night"`, render
`<NightSeamlessLighting/>`, `<NightSeamlessPostFX/>`, and wrap the dynamic
vehicle layer with `<NightVehicleTreatment/>` — and do NOT render
`EnvironmentLayer`'s night preset, `Stage6PostFX`, or `WetRoadReflectors` in that
path. Update/extend the scene test to assert the fresh components mount at night
and the old ones do not.

- [ ] **Step 8: Run focused tests**

Run: `npm --workspace apps/web run test -- components/r3f/NightSeamlessPostFX.test.tsx components/r3f/NightVehicleTreatment.test.tsx`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/r3f/NightSeamlessPostFX.tsx apps/web/components/r3f/NightSeamlessLighting.tsx apps/web/components/r3f/NightVehicleTreatment.tsx apps/web/components/r3f/NightSeamlessPostFX.test.tsx apps/web/components/r3f/NightVehicleTreatment.test.tsx
git commit -m "feat(r3f): build fresh night seamless visual layer driven by shared grade"
```

---

## Task 9: Convert Seoul vehicle meshes to GLB + manifest entries

> **CONFIRMATION GATE (user decision required before running this task):** Many
> archived Unreal assets are low quality. Do NOT reuse the archived UE Seoul
> vehicle meshes without explicit user confirmation. If not confirmed, skip this
> task and keep the existing project-authored runtime vehicle GLBs (or source
> better CC0 vehicles instead). When confirmed, convert + visually preview each
> mesh and reject any that read as toy/low-poly (`visualRejectIfToyLike`).

**Files:**
- Create: `scripts/convert-seoul-vehicles-to-glb.mjs`
- Create: `apps/web/public/simulation/r3f/assets/glb/vehicles/seoul_taxi_near.glb` (+ sedan, bus, emergency van)
- Modify: `apps/web/public/simulation/r3f/assets/manifest.json`
- Modify: `docs/compliance/r3f-asset-licenses.md`

**Interfaces:** uses `obj2gltf` (pure-JS OBJ→glTF; no Blender). Add as a devDependency.

- [ ] **Step 1: Add the converter dependency**

Run: `npm --workspace apps/web install -D obj2gltf`
Expected: `obj2gltf` in `apps/web/package.json` devDependencies.

- [ ] **Step 2: Write the conversion script**

```js
// scripts/convert-seoul-vehicles-to-glb.mjs
import obj2gltf from "obj2gltf";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = "archive/unreal/original/renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/Meshes";
const OUT = "apps/web/public/simulation/r3f/assets/glb/vehicles";
const VEHICLES = [
  ["stage7_seoul_passenger_sedan.obj", "seoul_sedan_near.glb"],
  ["stage7_seoul_taxi.obj", "seoul_taxi_near.glb"],
  ["stage7_seoul_bus.obj", "seoul_bus_near.glb"],
  ["stage7_seoul_emergency_van.obj", "seoul_emergency_van_near.glb"]
];

await mkdir(OUT, { recursive: true });
for (const [src, out] of VEHICLES) {
  const glb = await obj2gltf(path.join(SRC, src), { binary: true });
  await writeFile(path.join(OUT, out), glb);
  console.log(`converted ${src} -> ${out}`);
}
```

- [ ] **Step 3: Run the conversion**

Run: `node scripts/convert-seoul-vehicles-to-glb.mjs`
Expected: 4 GLB files written. Inspect file sizes are within the vehicle `maxFileSizeBytes` (1,200,000) budget; if larger, run meshopt/draco (note in compliance) or downscale textures.

- [ ] **Step 4: Add manifest + compliance entries**

For each GLB, add a `kind: "vehicle"` manifest entry mirroring `vehicles/passenger_car_near` (set `realisticSilhouette: true`, `visualRejectIfToyLike: true`, `source: "converted-from-archived-unreal-obj"`, `license` describing project-authored origin, `provenanceEvidencePath: docs/compliance/r3f-asset-licenses.md`, `details.scaleReferenceMeters`). Append provenance lines to `docs/compliance/r3f-asset-licenses.md`.

- [ ] **Step 5: Verify**

Run: `npm run verify:r3f-assets`
Expected: PASS within budget.

- [ ] **Step 6: Commit**

```bash
git add scripts/convert-seoul-vehicles-to-glb.mjs apps/web/public/simulation/r3f/assets/glb/vehicles/ apps/web/public/simulation/r3f/assets/manifest.json apps/web/package.json apps/web/package-lock.json docs/compliance/r3f-asset-licenses.md
git commit -m "feat(r3f): convert archived seoul vehicle meshes to runtime GLB"
```

> Wiring these GLBs into the vehicle LOD selection (so SUMO traffic uses Seoul cars) is a follow-up tuning step inside `stage6VehicleLod.ts`; do it only after the GLBs validate, and keep the existing cars as fallback.

---

## Task 10: Truth-boundary test + full verification gate

**Files:**
- Test: `apps/web/components/r3f/buildSceneSnapshot.test.ts` (extend) or new `BackgroundPlateLayer.truth.test.tsx`

- [ ] **Step 1: Write the truth-boundary test**

```tsx
import { describe, expect, it } from "vitest";
import { BACKGROUND_PLATE_TRUTH_SOURCE } from "./BackgroundPlateLayer";

describe("background plate truth boundary", () => {
  it("plate truth source is visual-only and not a vehicle/pedestrian source", () => {
    expect(BACKGROUND_PLATE_TRUTH_SOURCE).toBe("background_plate_visual_only");
    expect(BACKGROUND_PLATE_TRUTH_SOURCE).not.toMatch(/sumo|vehicle|pedestrian|signal/i);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npm --workspace apps/web run test -- components/r3f/BackgroundPlateLayer.truth.test.tsx`
Expected: PASS.

- [ ] **Step 3: Run the full gate**

Run: `npm run verify`
Expected: PASS (`test:api`, `test:web`, `build:web`, `verify:r3f-assets`, `verify:r3f-dashboard`, `verify:r3f-performance`, `verify:r3f-visual-diff`, `verify:security`, `git diff --check`).

> If `verify:r3f-visual-diff` has a baseline, update it to the new night proof intentionally and note the change; do not silently regenerate baselines.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/r3f/BackgroundPlateLayer.truth.test.tsx
git commit -m "test(r3f): assert background plate truth boundary"
```

---

## Self-Review

**Spec coverage:**
- Hybrid 3-layer architecture → Tasks 5, 7, 8 (background), existing road layer, existing dynamic layer.
- Plate via imagegen, no Blender → Task 6.
- Proxy reused 4 ways (guide/depth/projection/occluder) → Tasks 2, 5, 6.
- Camera calibration alignment → Task 1, used in 5/6.
- Night-neon Gangnam look → Tasks 3, 6, 8; `night` preset in EnvironmentLayer.
- Seamless integration (no pasted-on look), all awkwardness causes → Task 8, built fresh (+ occlusion in 5).
- Reuse policy (infra only; visual code rebuilt fresh) → Global Constraints + Task 8 (fresh `Night*` components; old visual components not mounted at night).
- Pedestrian uncanny strategy → existing `DynamicPedestrianLayer`; ambient baked into plate (Task 6 prompt), SUMO peds kept mid/far (tuning note in Task 8) — **gap:** add an explicit pedestrian-distance tuning sub-step if close-up peds appear awkward in the browser proof.
- Truth boundary preserved → Task 5 marker + Task 10 test.
- Asset budget + provenance + no brands → Tasks 4, 6, 9 + Global Constraints.
- Fallback to procedural background → Task 5 Step 5, Task 7 Suspense.
- Photorealism non-negotiable, browser proof → Task 6 Step 4, Task 10 Step 3.

**Placeholder scan:** The plate pixels (Task 6) and some browser-proof acceptance are inherently manual/visual, not code; they are marked as such with concrete prompts/commands. The two test stubs (BackgroundPlateLayer second case, SimulationCanvas case) include explicit instructions to copy the existing harness and assert concrete symbols — implementers must replace the `expect(true).toBe(true)` placeholder with the named assertion.

**Type consistency:** `getSeamlessGrade`, `buildPlateProxy`, `getPlateCameraAngle`, `getPlateEntry`, `BACKGROUND_PLATE_TRUTH_SOURCE`, `PLATE_ASSET_ID_BY_ANGLE` are defined once and consumed with the same names across tasks. `timeOfDay: Stage6TimeOfDay` ("day" | "night") matches `stage6Quality.ts`.

**Known follow-ups (not blocking):** vehicle LOD wiring of Seoul GLBs (Task 9 note); additional fixed angles beyond `operator-wide` (add entries to `PLATE_CAMERA_ANGLES` + `PLATE_ASSET_ID_BY_ANGLE` + one plate each).
