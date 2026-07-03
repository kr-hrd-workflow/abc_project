# R3F Photobash — Phase 0 (마킹 데칼 → 차선 정렬 증명) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 metric 마킹 specs(`CENTER_LINE_MARKINGS`/`CROSSWALK_STRIPES`/`STOP_LINE_MARKINGS` 등)를 **플랫 색상 평면이 아니라 텍스처 데칼**로 렌더하는 `MarkingDecalLayer`를 만들고, plate 없는 `?photobash=1` 씬 모드 + 제한 오비트 카메라로 띄워 **마킹이 차로·차량과 정확히 정렬됨을 codex로 증명**한다.

**Architecture:** 마킹 데칼은 imagegen이 아니라 **R3F가 소유한 동일 metric specs**의 position/size/rotation을 그대로 쓴다(정렬은 구조적으로 정확). 텍스처는 Phase 0에선 placeholder 페인트(흰 차선/횡단보도/정지선)를 쓰고, imagegen 추출 포토리얼 페인트로 스왑하는 건 Phase 0 후속 authoring. plate(`PhotorealPlate`)는 이 모드에서 마운트하지 않는다.

**Tech Stack:** React Three Fiber, three.js, drei(`useTexture`/`OrbitControls`), vitest(jsdom), Next.js(non-standard — `apps/web`).

## Global Constraints

- 좌표 규약: **1 three-unit = 1 meter, 지면 = x–z 평면, y = up, north = −z, 씬 중심 = [0,0,0]** (`apps/web/components/r3f/roadGeometry.ts:57` `STAGE3_SCENE_UNITS`). 차량은 `x:x_meters, z:y_meters`로 앉음.
- 마킹 평면 눕히기: `rotation={[-Math.PI/2, rotationY, 0]}` (Stage6 데칼 레시피; yaw는 2번째 슬롯).
- z-fighting 방지: 데칼은 아스팔트(`y=0.002`) 위로 `MARKING_HEIGHT=0.018`(`roadGeometry.ts:144`) 이상 살짝 띄우고 `depthWrite={false} toneMapped={false} transparent`.
- 마킹 데칼 머티리얼: `meshBasicMaterial`(라이팅 영향 X — 페인트는 평평).
- draw-call 예산 ~900, 에셋 예산 ~25MB (`verify:r3f-performance`/`verify:r3f-assets`).
- **v5 plate 더블링 금지:** 새 레이어는 `?photobash=1` 전용 모드에만 마운트 — 기존 photoreal v5 분기는 건드리지 않는다(`apps/web/AGENTS.md` 락트 규약). 가드레일은 `SimulationScenePhotoreal.test.tsx`에 핀.
- 시각/정렬 확인은 **codex CLI**(`/home/chan/.local/bin/codex`, `codex exec -i <img> "..."`)로 컨펌 후 사용자 최종 사인오프.

---

### Task 1: 마킹 데칼 디스크립터 (pure 데이터 변환)

기존 마킹 specs를 "텍스처 데칼 디스크립터"로 변환하는 순수 모듈. 위치/크기/회전은 specs 그대로(정렬 보존), 텍스처 키 + y-lift만 부여.

**Files:**
- Create: `apps/web/components/r3f/markingDecalDescriptors.ts`
- Test: `apps/web/components/r3f/markingDecalDescriptors.test.ts`

**Interfaces:**
- Consumes (from `apps/web/components/r3f/roadGeometry.ts`): `CENTER_LINE_MARKINGS`, `LANE_DIVIDER_MARKINGS`, `BUS_LANE_BORDER_MARKINGS`, `EDGE_LINE_MARKINGS`, `STOP_LINE_MARKINGS`, `CROSSWALK_STRIPES` — each `PlanePrimitiveSpec[]` where `PlanePrimitiveSpec = { id: string; direction: Direction; position: [number,number,number]; size: [number,number]; rotationY?: number }`; and `MARKING_HEIGHT: number` (=0.018).
- Produces: `type MarkingTextureKey = "lane_dashed" | "lane_solid" | "center_yellow" | "bus_border" | "stop_bar" | "crosswalk";` `type MarkingDecalDescriptor = { id: string; position: [number,number,number]; size: [number,number]; rotationY: number; textureKey: MarkingTextureKey };` `function buildMarkingDecalDescriptors(): MarkingDecalDescriptor[]`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/components/r3f/markingDecalDescriptors.test.ts
import { describe, expect, test } from "vitest";
import { buildMarkingDecalDescriptors } from "./markingDecalDescriptors";
import {
  CENTER_LINE_MARKINGS,
  CROSSWALK_STRIPES,
  STOP_LINE_MARKINGS,
  MARKING_HEIGHT,
} from "./roadGeometry";

describe("buildMarkingDecalDescriptors", () => {
  const decals = buildMarkingDecalDescriptors();
  const byKey = (k: string) => decals.filter((d) => d.textureKey === k);

  test("emits one decal per source marking spec, preserving x/z position", () => {
    expect(byKey("center_yellow")).toHaveLength(CENTER_LINE_MARKINGS.length);
    expect(byKey("crosswalk")).toHaveLength(CROSSWALK_STRIPES.length);
    expect(byKey("stop_bar")).toHaveLength(STOP_LINE_MARKINGS.length);

    const firstCw = byKey("crosswalk")[0];
    const srcCw = CROSSWALK_STRIPES[0];
    expect(firstCw.position[0]).toBeCloseTo(srcCw.position[0], 6); // x preserved
    expect(firstCw.position[2]).toBeCloseTo(srcCw.position[2], 6); // z preserved
    expect(firstCw.size).toEqual(srcCw.size);
    expect(firstCw.rotationY).toBeCloseTo(srcCw.rotationY ?? 0, 6);
  });

  test("lifts every decal above the asphalt to avoid z-fighting", () => {
    for (const d of decals) expect(d.position[1]).toBeGreaterThanOrEqual(MARKING_HEIGHT);
  });

  test("ids are unique", () => {
    expect(new Set(decals.map((d) => d.id)).size).toBe(decals.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run components/r3f/markingDecalDescriptors.test.ts`
Expected: FAIL — `Cannot find module './markingDecalDescriptors'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/components/r3f/markingDecalDescriptors.ts
import {
  CENTER_LINE_MARKINGS,
  LANE_DIVIDER_MARKINGS,
  BUS_LANE_BORDER_MARKINGS,
  EDGE_LINE_MARKINGS,
  STOP_LINE_MARKINGS,
  CROSSWALK_STRIPES,
  MARKING_HEIGHT,
} from "./roadGeometry";

export type MarkingTextureKey =
  | "lane_dashed"
  | "lane_solid"
  | "center_yellow"
  | "bus_border"
  | "stop_bar"
  | "crosswalk";

export type MarkingDecalDescriptor = {
  id: string;
  position: [number, number, number];
  size: [number, number];
  rotationY: number;
  textureKey: MarkingTextureKey;
};

type SpecLike = {
  id: string;
  position: [number, number, number];
  size: [number, number];
  rotationY?: number;
};

// Per-group y stagger above MARKING_HEIGHT so overlapping marking types never z-fight.
const GROUPS: { specs: SpecLike[]; key: MarkingTextureKey; lift: number }[] = [
  { specs: CENTER_LINE_MARKINGS, key: "center_yellow", lift: 0.004 },
  { specs: LANE_DIVIDER_MARKINGS, key: "lane_dashed", lift: 0.001 },
  { specs: EDGE_LINE_MARKINGS, key: "lane_solid", lift: 0.002 },
  { specs: BUS_LANE_BORDER_MARKINGS, key: "bus_border", lift: 0.003 },
  { specs: STOP_LINE_MARKINGS, key: "stop_bar", lift: 0.005 },
  { specs: CROSSWALK_STRIPES, key: "crosswalk", lift: 0.006 },
];

export function buildMarkingDecalDescriptors(): MarkingDecalDescriptor[] {
  const out: MarkingDecalDescriptor[] = [];
  for (const { specs, key, lift } of GROUPS) {
    for (const spec of specs) {
      out.push({
        id: `decal-${spec.id}`,
        position: [spec.position[0], MARKING_HEIGHT + lift, spec.position[2]],
        size: spec.size,
        rotationY: spec.rotationY ?? 0,
        textureKey: key,
      });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run components/r3f/markingDecalDescriptors.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/r3f/markingDecalDescriptors.ts apps/web/components/r3f/markingDecalDescriptors.test.ts
git commit -m "feat(r3f): marking decal descriptors from metric marking specs"
```

---

### Task 2: MarkingDecalLayer (디스크립터 → 텍스처 데칼 렌더)

디스크립터를 Stage6 데칼 레시피로 렌더. 텍스처 키 → placeholder 페인트 텍스처 맵(Phase 0). 정렬은 디스크립터(=metric specs)가 보장.

**Files:**
- Create: `apps/web/components/r3f/MarkingDecalLayer.tsx`
- Test: `apps/web/components/r3f/MarkingDecalLayer.test.tsx`

**Interfaces:**
- Consumes: `buildMarkingDecalDescriptors()`, `MarkingTextureKey` (Task 1).
- Produces: `export function MarkingDecalLayer(props: { textureUrls?: Partial<Record<MarkingTextureKey, string>> }): JSX.Element` with `MarkingDecalLayer.displayName = "MarkingDecalLayer"`. Renders one `<mesh>` per descriptor (named by `descriptor.id`) containing `<planeGeometry args={size}>` + `<meshBasicMaterial map transparent depthWrite={false} toneMapped={false}>`, `rotation={[-Math.PI/2, rotationY, 0]}`, `position={position}`, `renderOrder={7}`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/components/r3f/MarkingDecalLayer.test.tsx
// @vitest-environment jsdom
import { Children, isValidElement, type ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";

vi.mock("@react-three/drei", () => {
  const makeTex = () => ({ wrapS: 0, wrapT: 0, repeat: { set() {} }, needsUpdate: false, clone: () => makeTex() });
  return { useTexture: Object.assign((_: unknown) => ({ a: makeTex(), b: makeTex() }), { preload: () => {} }) };
});
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useMemo: (fn: () => unknown) => fn() };
});

import { MarkingDecalLayer } from "./MarkingDecalLayer";
import { buildMarkingDecalDescriptors } from "./markingDecalDescriptors";

function collect(node: unknown, acc: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) { node.forEach((n) => collect(n, acc)); return acc; }
  if (!isValidElement(node)) return acc;
  acc.push(node);
  Children.forEach((node.props as { children?: unknown }).children, (c) => collect(c, acc));
  return acc;
}

describe("MarkingDecalLayer", () => {
  const el = MarkingDecalLayer({}) as ReactElement;
  const all = collect(el);
  const meshes = all.filter((e) => e.type === "mesh");
  const mats = all.filter((e) => e.type === "meshBasicMaterial");

  test("renders one decal mesh per descriptor", () => {
    expect(meshes).toHaveLength(buildMarkingDecalDescriptors().length);
  });

  test("decals lie flat (rotation x = -PI/2) and never write depth", () => {
    const m = meshes[0].props as { rotation: number[] };
    expect(m.rotation[0]).toBeCloseTo(-Math.PI / 2, 6);
    for (const mat of mats) {
      expect((mat.props as { depthWrite: boolean }).depthWrite).toBe(false);
      expect((mat.props as { transparent: boolean }).transparent).toBe(true);
    }
  });

  test("mesh position matches its descriptor (alignment preserved)", () => {
    const desc = buildMarkingDecalDescriptors();
    const named = meshes.find((e) => (e.props as { name?: string }).name === desc[0].id);
    expect((named!.props as { position: number[] }).position).toEqual(desc[0].position);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run components/r3f/MarkingDecalLayer.test.tsx`
Expected: FAIL — `Cannot find module './MarkingDecalLayer'`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/web/components/r3f/MarkingDecalLayer.tsx
import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import {
  buildMarkingDecalDescriptors,
  type MarkingTextureKey,
} from "./markingDecalDescriptors";

// Phase 0 placeholder paint textures (worn white line / yellow / crosswalk / stop bar).
// Swap to imagegen-extracted photoreal paint in the Phase 0 authoring follow-on.
const PLACEHOLDER_URLS: Record<MarkingTextureKey, string> = {
  lane_dashed: "/simulation/r3f/assets/markings/lane_dashed.webp",
  lane_solid: "/simulation/r3f/assets/markings/lane_solid.webp",
  center_yellow: "/simulation/r3f/assets/markings/center_yellow.webp",
  bus_border: "/simulation/r3f/assets/markings/bus_border.webp",
  stop_bar: "/simulation/r3f/assets/markings/stop_bar.webp",
  crosswalk: "/simulation/r3f/assets/markings/crosswalk.webp",
};

type Props = { textureUrls?: Partial<Record<MarkingTextureKey, string>> };

export function MarkingDecalLayer({ textureUrls }: Props) {
  const urls = { ...PLACEHOLDER_URLS, ...(textureUrls ?? {}) };
  const keys = Object.keys(urls) as MarkingTextureKey[];
  const texList = useTexture(keys.map((k) => urls[k]));
  const texByKey = useMemo(() => {
    const m = new Map<MarkingTextureKey, unknown>();
    keys.forEach((k, i) => m.set(k, Array.isArray(texList) ? texList[i] : texList));
    return m;
  }, [texList]);

  const descriptors = useMemo(() => buildMarkingDecalDescriptors(), []);

  return (
    <group name="marking-decal-layer">
      {descriptors.map((d) => (
        <mesh
          key={d.id}
          name={d.id}
          position={d.position}
          rotation={[-Math.PI / 2, d.rotationY, 0]}
          renderOrder={7}
        >
          <planeGeometry args={d.size} />
          <meshBasicMaterial
            map={(texByKey.get(d.textureKey) as never) ?? null}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

MarkingDecalLayer.displayName = "MarkingDecalLayer";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run components/r3f/MarkingDecalLayer.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Add placeholder marking textures**

Create 6 small webp/png placeholders under `apps/web/public/simulation/r3f/assets/markings/` (white dashed line, white solid line, yellow double line, blue bus border, white stop bar, white crosswalk stripe), each a simple paint-on-transparent tile (≤64×256, transparent background). These only prove the decal system renders; photoreal imagegen paint replaces them in authoring.

```bash
mkdir -p apps/web/public/simulation/r3f/assets/markings
# author the 6 placeholder tiles (any tool); keep each < 30KB
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/r3f/MarkingDecalLayer.tsx apps/web/components/r3f/MarkingDecalLayer.test.tsx apps/web/public/simulation/r3f/assets/markings/
git commit -m "feat(r3f): MarkingDecalLayer renders metric marking specs as textured decals"
```

---

### Task 3: `?photobash=1` 씬 모드 (plate 없음, 데칼 마킹)

`SimulationScene.tsx`에 새 분기: 아스팔트(`RoadSurfaceLayer` 텍스처 노면, 벡터 마킹 OFF) + `MarkingDecalLayer` + 차량/보행자/신호. **plate 마운트 안 함.** 기존 v5 photoreal 분기는 불변.

**Files:**
- Modify: `apps/web/components/r3f/SimulationScene.tsx` (add `resolvePhotobashMode()` + a `isPhotobash` branch before the default branch)
- Test: `apps/web/components/r3f/SimulationScenePhotoreal.test.tsx` (add guardrail cases)

**Interfaces:**
- Consumes: `MarkingDecalLayer` (Task 2), existing `RoadSurfaceLayer` (prop `markingsOnly?: boolean`), `DynamicVehicleLayerWithWeather`, `SignalLayer`, `CameraRig`, `SceneLighting`, `SceneFinishing`, the existing `buildFixtureSceneSnapshot` test helper.
- Produces: `function resolvePhotobashMode(): boolean` (true when `?photobash=1`); a `<group name="photobash-scene">` branch mounting `MarkingDecalLayer` + asphalt-only `RoadSurfaceLayer` and NOT `PhotorealPlate`.

- [ ] **Step 1: Write the failing guardrail test**

```tsx
// add to apps/web/components/r3f/SimulationScenePhotoreal.test.tsx
test("photobash mode mounts MarkingDecalLayer and no PhotorealPlate", () => {
  setSearch("?photobash=1");
  const el = SimulationScene({
    sceneSnapshot: buildFixtureSceneSnapshot({ queues: {}, events: [] }),
    qualityPreset: HIGH_PRESET, weather: "clear", timeOfDay: "day", viewpoint: "wide",
  });
  const names = collectDeepDisplayNames(el);
  expect(names).toContain("MarkingDecalLayer");
  expect(names).not.toContain("PhotorealPlate");
  setSearch("");
});
```
(Use the file's existing `setSearch`, `collectDeepDisplayNames`, `buildFixtureSceneSnapshot`, and quality-preset import. If a preset const name differs, reuse whatever the neighbouring photoreal tests pass.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run components/r3f/SimulationScenePhotoreal.test.tsx -t "photobash mode"`
Expected: FAIL — `MarkingDecalLayer` not in tree (branch not implemented).

- [ ] **Step 3: Implement the branch**

In `SimulationScene.tsx`: add near the other `resolve*` helpers:
```tsx
function resolvePhotobashMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("photobash") === "1";
}
```
Add an `isPhotobash` const next to `isPhotoreal`/`isGuide`, and a branch BEFORE the default branch (mirror the default branch but: asphalt `RoadSurfaceLayer` WITHOUT vector markings, plus `MarkingDecalLayer`, NO plate):
```tsx
if (isPhotobash) {
  return (
    <group name="photobash-scene">
      <CameraRig preset="operatorWide" weather={weather} timeOfDay={timeOfDay} />
      <SceneLighting timeOfDay={timeOfDay} weather={weather} />
      <StaticRoadLayerWithDetails isNight={timeOfDay === "night"} markingsOnly={false} suppressVectorMarkings />
      <MarkingDecalLayer />
      <DynamicVehicleLayerWithWeather sceneSnapshot={sceneSnapshot} qualityPreset={qualityPreset} weather={weather} timeOfDay={timeOfDay} />
      <SignalLayer sceneSnapshot={sceneSnapshot} />
      <SceneFinishing weather={weather} timeOfDay={timeOfDay} />
    </group>
  );
}
```
`RoadSurfaceLayer` does not yet have `suppressVectorMarkings` — add that prop (default false) so its merged vector-marking meshes are skipped when true (the decals replace them). Minimal edit to `RoadSurfaceLayer.tsx`: gate the marking-mesh `return`s on `!suppressVectorMarkings`, keep the asphalt meshes. (Keep `markingsOnly` behaviour intact.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/web && npx vitest run components/r3f/SimulationScenePhotoreal.test.tsx`
Expected: PASS (incl. the existing v5 guardrails — confirm none regressed).

- [ ] **Step 5: Run the full web suite (no regressions)**

Run: `cd apps/web && npx vitest run`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/r3f/SimulationScene.tsx apps/web/components/r3f/RoadSurfaceLayer.tsx apps/web/components/r3f/SimulationScenePhotoreal.test.tsx
git commit -m "feat(r3f): photobash scene mode (decal markings, no plate)"
```

---

### Task 4: 제한 오비트 카메라 (photobash 모드)

photobash 모드에서 교차로 중심을 도는 제한 오비트. drei `OrbitControls`를 클램프(azimuth/polar/distance)와 함께 마운트.

**Files:**
- Create: `apps/web/components/r3f/LimitedOrbitControls.tsx`
- Test: `apps/web/components/r3f/LimitedOrbitControls.test.tsx`
- Modify: `apps/web/components/r3f/SimulationScene.tsx` (mount it in the photobash branch)

**Interfaces:**
- Produces: `export const ORBIT_LIMITS = { target: [0,0,-6] as const, minDistance: 60, maxDistance: 260, minPolarAngle: 0.55, maxPolarAngle: 1.15, minAzimuthAngle: -0.9, maxAzimuthAngle: 0.9 };` and `export function LimitedOrbitControls(): JSX.Element` rendering drei `<OrbitControls>` with those clamps + `enablePan={false}`. `LimitedOrbitControls.displayName = "LimitedOrbitControls"`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/components/r3f/LimitedOrbitControls.test.tsx
// @vitest-environment jsdom
import { type ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";
vi.mock("@react-three/drei", () => ({ OrbitControls: (p: unknown) => ({ type: "OrbitControls", props: p }) }));
import { LimitedOrbitControls, ORBIT_LIMITS } from "./LimitedOrbitControls";

describe("LimitedOrbitControls", () => {
  test("clamps azimuth, polar, and distance and disables pan", () => {
    const el = LimitedOrbitControls() as ReactElement<Record<string, unknown>>;
    expect(el.props.minDistance).toBe(ORBIT_LIMITS.minDistance);
    expect(el.props.maxDistance).toBe(ORBIT_LIMITS.maxDistance);
    expect(el.props.minPolarAngle).toBe(ORBIT_LIMITS.minPolarAngle);
    expect(el.props.maxPolarAngle).toBe(ORBIT_LIMITS.maxPolarAngle);
    expect(el.props.minAzimuthAngle).toBe(ORBIT_LIMITS.minAzimuthAngle);
    expect(el.props.maxAzimuthAngle).toBe(ORBIT_LIMITS.maxAzimuthAngle);
    expect(el.props.enablePan).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run components/r3f/LimitedOrbitControls.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/web/components/r3f/LimitedOrbitControls.tsx
import { OrbitControls } from "@react-three/drei";

export const ORBIT_LIMITS = {
  target: [0, 0, -6] as [number, number, number],
  minDistance: 60,
  maxDistance: 260,
  minPolarAngle: 0.55, // ~31.5deg from top — never below horizon
  maxPolarAngle: 1.15, // ~66deg — keeps an elevated 3/4 view
  minAzimuthAngle: -0.9,
  maxAzimuthAngle: 0.9, // ~±51deg arc around the intersection
} as const;

export function LimitedOrbitControls() {
  return (
    <OrbitControls
      makeDefault
      target={ORBIT_LIMITS.target}
      enablePan={false}
      minDistance={ORBIT_LIMITS.minDistance}
      maxDistance={ORBIT_LIMITS.maxDistance}
      minPolarAngle={ORBIT_LIMITS.minPolarAngle}
      maxPolarAngle={ORBIT_LIMITS.maxPolarAngle}
      minAzimuthAngle={ORBIT_LIMITS.minAzimuthAngle}
      maxAzimuthAngle={ORBIT_LIMITS.maxAzimuthAngle}
    />
  );
}

LimitedOrbitControls.displayName = "LimitedOrbitControls";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run components/r3f/LimitedOrbitControls.test.tsx`
Expected: PASS.

- [ ] **Step 5: Mount in the photobash branch**

In `SimulationScene.tsx` photobash branch, add `<LimitedOrbitControls />` after `<CameraRig .../>` (CameraRig sets the initial pose; OrbitControls then allows the clamped orbit). Add a guardrail line to the photobash test: `expect(names).toContain("LimitedOrbitControls")`.

- [ ] **Step 6: Run tests + commit**

Run: `cd apps/web && npx vitest run components/r3f/SimulationScenePhotoreal.test.tsx components/r3f/LimitedOrbitControls.test.tsx`
Expected: PASS.
```bash
git add apps/web/components/r3f/LimitedOrbitControls.tsx apps/web/components/r3f/LimitedOrbitControls.test.tsx apps/web/components/r3f/SimulationScene.tsx
git commit -m "feat(r3f): limited-orbit controls for photobash mode"
```

---

### Task 5: 정렬 증명 게이트 (렌더 + codex 컨펌)

코드가 아니라 **검증** 작업 — Phase 0의 done-gate. 마킹 데칼이 차로·차량과 정확히 정렬됨을 다각도 렌더로 증명.

**Files:** none (verification only). Produces render artifacts under `artifacts/`.

- [ ] **Step 1: 빌드 + photobash 다각도 캡처**

`render-traffic-photoreal.mjs` 하베스트(또는 동등 캡처)로 `?photobash=1`을 제한 오비트 아크의 3각도(좌/정/우)에서 렌더 → `artifacts/photobash-align-{left,center,right}.png`. 차량이 채워진 normal 프레임으로(차량-차로 정렬을 함께 봄).

- [ ] **Step 2: codex CLI로 정렬 컨펌**

```bash
/home/chan/.local/bin/codex exec -i artifacts/photobash-align-center.png \
  "이 교차로 렌더에서 흰 차선/정지선/횡단보도 데칼이 차량이 달리는 차로와 정확히 정렬돼 보이나? 어긋난 마킹이 있으면 어디인지 구체적으로."
```
좌/우 각도도 동일 확인. 어긋남 보고되면 Task 1의 디스크립터(또는 소스 spec) 위치를 점검·미세조정 후 재렌더.

- [ ] **Step 3: 사용자 최종 사인오프**

3각도 이미지를 `SendUserFile`로 보내 "차선 정렬 OK"를 받는다 (정렬은 사용자가 최종 판정 — 메모리 `visual-confirm-via-codex-cli`).

- [ ] **Step 4: 프로젝트 R3F 게이트**

Run: `cd apps/web && npx vitest run` → green. Repo root: `npm run verify:r3f-dashboard`, `npm run verify:r3f-performance`(~900 draw-call), `npm run verify:r3f-assets`(~25MB; 새 마킹 텍스처 포함), `npm run verify:security`. `verify:r3f-visual-diff`는 **photobash는 신규 뷰라 baseline 없음** — 기존 뷰 diff가 변하지 않았는지만 확인(기존 분기 불변).

- [ ] **Step 5: Phase 0 완료 커밋**

```bash
git add artifacts/photobash-align-*.png
git commit -m "test(r3f): photobash Phase 0 alignment proof (codex + user confirmed)"
```

---

## Phase 0 이후 (이 플랜 범위 밖, 별도 후속)

- **Phase 0 authoring:** placeholder 마킹 텍스처를 **imagegen 추출 포토리얼 페인트**로 스왑(닳은 흰/노란 페인트, 횡단보도 마모). 시스템은 그대로, 텍스처만 교체.
- **Phase 1:** 건물 facade 텍스처 슬롯 + 간판 emissive.
- **Phase 2:** 스카이/백드롭, 차량 위 정합.
- **Phase 3:** plate 6종 은퇴 마무리(`PhotorealPlate`/`BackgroundPlateLayer`/`plate*Calibration`/`plateManifest`/`plateProxyGeometry`) + 가드레일/락트-규약 갱신.
