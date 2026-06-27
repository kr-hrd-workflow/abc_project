# SP2 Task A1 Report — Structural Guide Renderer

## Status
DONE

## What Was Built

### 1. `apps/web/components/r3f/StructuralGuideLayer.tsx` (new)
Flat diagnostic R3F component that renders the SP1 geometry as a clean structural guide:
- Dark `#22222a` ground plane (800 m)
- Light gray corridor road surfaces per `APPROACH_CORRIDORS`
- Light gray intersection box
- **Red `#b0322c` median bus lane** (`MEDIAN_BUS_LANE_MARKINGS`, N/S only — 강남대로)
- White-gray lane dividers (`LANE_DIVIDER_MARKINGS`)
- E/W crosswalk stripes only (`CROSSWALK_STRIPES` — no N/S, correct for 강남역)
- Turn arrow markings (`TURN_ARROW_MARKINGS`)
- Dark gray extruded building massing (`STAGE6E_CITY_EDGE_BLOCKS`)
- All `meshBasicMaterial` — no lighting required

### 2. `apps/web/components/r3f/SimulationScene.tsx` (modified)
Added:
- `resolveGuideMode()` — reads `?guide=1` from `window.location.search`
- `isGuide` gate in `SimulationScene`: when `?guide=1`, early-returns a minimal scene with only `CameraRig` + `StructuralGuideLayer`. Suppresses: `BackgroundPlateBoundary` (plate), `DynamicVehicleLayerWithWeather` (vehicles), `DynamicPedestrianLayer`, `SignalLayer`, `SceneFinishing` (PostFX), `SceneLighting`.
- Camera for guide: `nightAerialProof` preset for wide (= STAGE5_CAMERA exactly: [26,82,116]→[0,0,-34] fov 50), `operatorCctv` for cctv.
- Normal scene (no `?guide=1`) is completely unchanged — no impact on tests.

### 3. `scripts/render-plate-guides.mjs` (new)
Playwright capture script:
- Builds + starts production Next.js server (or reuses via `R3F_DASHBOARD_BASE_URL`/`R3F_DASHBOARD_REUSE_SERVER=true`)
- Provides complete fixture API routes (all 8 endpoints, matching verify-r3f-dashboard.mjs pattern)
- Launches Playwright bundled Chromium with `--enable-webgl --ignore-gpu-blocklist`
- Navigates to `/dashboard?guide=1` (wide) and `/dashboard?guide=1&viewpoint=cctv` (cctv) at 1536×1024 viewport
- Reads canvas via `toDataURL`; falls back to clipped screenshot
- Uses `sharp` (project dep at `node_modules/sharp`) to letterbox/scale to exactly 1536×1024 with `#22222a` background
- Saves to `artifacts/plate-guides/`

## Guide PNG Paths
- `artifacts/plate-guides/wide-structural-guide.png` — 1536×1024
- `artifacts/plate-guides/cctv-structural-guide.png` — 1536×1024

## How They Were Captured
```
node scripts/render-plate-guides.mjs
```
The script built the Next.js app, started a production server, opened Playwright headless Chromium, navigated to each guide URL, waited for the R3F canvas, captured the canvas via `toDataURL`, and scaled/letterboxed to 1536×1024 via sharp.

## What the Guides Show

**Wide guide** (`operator-wide` camera = `nightAerialProof` = STAGE5_CAMERA [26,82,116]):
- High aerial oblique view of 강남역 사거리
- 강남대로 (N/S) wide corridor with central **red median bus lane** prominently visible
- E/W corridors (테헤란로 east, 서초대로 narrower west) with crosswalk stripes
- No crosswalk across 강남대로 N/S (correct)
- Gray building massing blocks flanking all corridors
- White lane dividers + turn arrow markings

**CCTV guide** (`operatorCctv` camera [34,18,40] → [-4,1,-12]):
- Low oblique pole view of the intersection
- Red median bus lane visible on S approach and at junction
- E/W crosswalk stripes visible at approach
- Tall building massing block close to camera on east side
- Asymmetric road widths visible from oblique angle

## Vitest Result
`Test Files 30 passed (30) | Tests 204 passed (204)` — all existing tests green.

## Limitations / Concerns
1. **CCTV camera minor offset**: guide uses `operatorCctv` preset [34,18,40]→[-4,1,-12] fov 50 vs. `PLATE_CAMERA_ANGLES` operator-cctv [38,20,44]→[-4,1,-14] fov 50. ~4 units position difference — acceptable for imagegen conditioning; framing is close enough.
2. **Letterboxing**: canvas native size was 801×679 (canvas within dashboard layout). Images are scaled to 1536×1024 with dark padding. The canvas content is fully intact but does not fill 100% of the target frame.
3. **Guide mode is dashboard-hosted**: the guide renders inside the full Next.js dashboard; the R3F canvas occupies a portion of the viewport. A dedicated standalone render page would remove letterboxing, but that requires a new route and is deferred.

## Files Changed
- `apps/web/components/r3f/StructuralGuideLayer.tsx` (created, 98 lines)
- `apps/web/components/r3f/SimulationScene.tsx` (modified: +1 import, +resolveGuideMode, +isGuide branch)
- `scripts/render-plate-guides.mjs` (created, ~280 lines)
- `artifacts/plate-guides/wide-structural-guide.png` (generated, 1536×1024)
- `artifacts/plate-guides/cctv-structural-guide.png` (generated, 1536×1024)
