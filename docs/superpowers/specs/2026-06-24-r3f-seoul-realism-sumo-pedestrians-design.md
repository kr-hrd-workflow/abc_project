# R3F Seoul Realism And SUMO Pedestrians Design

Date: 2026-06-24
Status: Approved design for implementation planning

## Target Outcome

Upgrade the existing R3F dashboard simulation so the Seoul scene reads as a
modern Gangnam and Teheran-ro inspired arterial intersection, while preserving
the existing SUMO truth boundary. The default operator view must make total
traffic flow easier to read, and a separate photoreal proof view must make
vehicles, pedestrians, road detail, and high-rise scale easy to inspect.

## User Decisions

- Use a staged realism upgrade rather than a broad asset-first rewrite.
- Allow both CC0 and CC-BY public GLB assets.
- Prefer CC0. Use CC-BY only when attribution is recorded in the asset manifest
  and license/provenance docs.
- Support both camera goals:
  - an operator-wide CCTV-style flow view
  - a closer photoreal proof view
- Use real public place text for Seoul context: `서울`, `강남`, `테헤란로`,
  `강남대로`, `Seoul`, `Gangnam`.
- Do not use real commercial brands, company logos, store names, or ad marks.
- Render both SUMO-backed pedestrians and ambient background pedestrians, but
  keep their truth labels, layer names, telemetry, and data attributes separate.

## Current Evidence

- `SimulationFrameSnapshot.vehicles` is the current precise vehicle truth
  surface in `apps/web/components/r3f/buildSceneSnapshot.ts`.
- Current web tests already protect against turning aggregate density into
  precise vehicle truth.
- Existing runtime vehicle GLBs are present under
  `apps/web/public/simulation/r3f/assets/glb/vehicles/`.
- `npm run verify:r3f-assets` passed before this spec with a first-pass GLB and
  texture payload of 11.95 MB / 25.00 MB.
- Related focused tests passed before this spec:
  - `npm --workspace apps/web run test -- components/r3f/CameraWeatherClutter.test.tsx components/r3f/useInterpolatedSimulationFrame.test.ts components/DashboardShell.test.tsx`
    passed 3 files / 83 tests.
  - `node scripts/run-api-python.mjs -m pytest tests/test_sumo_snapshot_mapping.py tests/test_simulation_snapshot.py -q`
    passed 16 tests with one existing Starlette/httpx deprecation warning.
- Official SUMO TraCI docs expose vehicle value retrieval for ID list, position,
  angle, speed, lane, type, and route data:
  https://sumo.dlr.de/docs/TraCI/Vehicle_Value_Retrieval.html
- Official SUMO TraCI docs expose a separate person value retrieval surface:
  https://sumo.dlr.de/docs/TraCI/Person_Value_Retrieval.html

## Architecture

Keep FastAPI/SUMO as the simulation truth and R3F as the renderer. Do not let
R3F invent live vehicles or live pedestrians.

The backend frame contract expands from:

```text
SimulationFrameSnapshot.vehicles[]
```

to:

```text
SimulationFrameSnapshot.vehicles[]
SimulationFrameSnapshot.pedestrians[]
```

Vehicles continue to render as precise traffic only when they come from
`SimulationFrameSnapshot.vehicles`. Pedestrians render as precise moving people
only when they come from `SimulationFrameSnapshot.pedestrians`. Ambient
pedestrians are visual city context only and must be labeled as ambient or proxy.

The frontend keeps the existing frame ingestion path:

```text
/api/simulation/frame
  -> useInterpolatedSimulationFrame
  -> buildSceneSnapshot
  -> DynamicVehicleLayer
  -> DynamicPedestrianLayer
```

The work should be implemented in small steps and must not refactor unrelated
dashboard or API surfaces.

## Data Contract

Add `SimulationPedestrianSnapshot` to the API and web contracts.

Required fields:

- `id`
- `x_meters`
- `y_meters`
- `heading_degrees`
- `speed_mps`
- `edge_id` or `lane_id` when available
- `waiting_seconds` when available, otherwise a documented default
- `source` or equivalent internal classification where needed to preserve truth

`SimulationFrameSnapshot.pedestrians` defaults to an empty list for fixture mode
and for live SUMO frames with no active people. Missing or unavailable SUMO
person APIs must not block vehicle rendering.

## SUMO Mapping

Vehicles remain mapped from SUMO vehicle APIs into `SimulationVehicleSnapshot`.
Add a normalization step so raw SUMO world coordinates can be aligned to the R3F
road and lane model instead of assuming raw `x/y` already match the visible
roadway.

Pedestrians are mapped from SUMO person APIs into
`SimulationPedestrianSnapshot`. If a person has no valid active position for the
current simulation step, skip that person for the frame rather than inventing a
position.

Queue and density data remain aggregate unless explicitly represented as
`vehicles[]`. Density segments must not become precise vehicles, and pedestrian
counts must not become precise pedestrians.

## Camera Design

Add or adjust camera presets without removing deterministic proof behavior.

- `operatorWide`: default operator view, higher and wider, with all four
  approaches, queues, stop lines, crosswalks, and movement direction readable.
- `photorealProof`: closer and lower, used to inspect vehicle GLBs, pedestrian
  assets, wet road materials, Seoul signage, and high-rise scale.
- `proofDeterministic`: remains stable for visual regression and verification.

The dashboard verifier should be able to capture or assert both the operator
flow view and the photoreal proof view.

## Seoul Scene Design

The scene should read as Gangnam and Teheran-ro inspired without claiming exact
real-world brand or storefront reproduction.

Add or strengthen:

- taller segmented glass and office towers
- denser facade window variation
- public Korean road signage and direction signage
- `서울`, `강남`, `테헤란로`, `강남대로`, `Seoul`, and `Gangnam` text where useful
- bus stop shelters and transit cues
- Seoul-like taxi and bus color cues
- wider crosswalks, stop bars, lane arrows, and road surface wear
- curb, drain, tactile paving, streetlight, and rain reflection details

Exclude:

- real company logos
- real store names
- real advertising marks
- unclear trademark-like signs

## Asset Policy

Use existing project-authored GLBs first when they are good enough. Add public
GLBs only when they materially improve realism or pedestrian quality.

Allowed:

- CC0 assets
- CC-BY assets with attribution

Not allowed:

- unclear license terms
- personal-use-only assets
- editorial-only assets
- assets with real brands/logos that cannot be cleanly removed
- assets without redistribution rights
- assets that fail budget, provenance, or visual proof gates

Before any third-party asset is downloaded into the repo, prepare a candidate
list with source URL, license, author, intended runtime use, file size, expected
optimization path, and attribution text. Download and integration require
explicit approval of those candidates.

Every runtime asset must be recorded in:

- `apps/web/public/simulation/r3f/assets/manifest.json`
- `apps/web/public/simulation/r3f/assets/textures/PROVENANCE.md` or the
  appropriate provenance file
- `docs/compliance/r3f-asset-licenses.md`

## Renderer Layers

Vehicle rendering should first make the existing GLB use visibly effective:
correct LOD selection, scale, orientation, light/glass/material readability, and
lane alignment. Public vehicle assets should be integrated only after this path
is verified.

Add `DynamicPedestrianLayer` or equivalent:

- SUMO pedestrians render from `sceneSnapshot.pedestrians`.
- Ambient pedestrians render from a separate scene-context layer.
- Names, userData, DOM attributes, and telemetry distinguish SUMO pedestrians
  from ambient pedestrians.

## Error Handling

- If SUMO person APIs are unavailable, return `pedestrians: []` and keep the
  rest of the frame valid.
- If a third-party asset fails loading, fall back to an existing project-authored
  or procedural proxy only when the UI labels it honestly and the verifier can
  detect the fallback.
- If coordinate normalization cannot map a lane or person cleanly, preserve the
  raw data in logs/telemetry where appropriate and avoid silently relabeling it
  as lane-aligned truth.
- If public assets exceed budget or license checks, do not ship them.

## Validation Plan

Required targeted validation:

- API tests for SUMO vehicle and pedestrian mapping.
- API tests proving fixture frames include `pedestrians: []`.
- Web tests for `SimulationFrameSnapshot.pedestrians` parsing and interpolation.
- Web tests proving ambient pedestrians do not enter SUMO pedestrian truth.
- Web tests proving density segments still do not become precise vehicles.
- Camera preset tests for `operatorWide`, `photorealProof`, and
  `proofDeterministic`.
- Asset manifest/provenance tests for new public assets.

Required gates before claiming implementation readiness:

```bash
npm run test:api
npm --workspace apps/web run test
npm run build:web
npm run verify:r3f-assets
npm run verify:r3f-dashboard
git diff --check
```

Run `npm run verify` when the implementation touches both API and web surfaces
and the environment can complete the full gate.

Browser proof must show:

- nonblank desktop and mobile R3F canvases
- readable operator-wide flow view
- readable photoreal proof view
- visible vehicle GLB detail
- visible SUMO pedestrian layer when pedestrian truth exists
- clearly separated ambient pedestrians
- Seoul/Gangnam public place cues without commercial brand claims

## Stop Conditions

Stop and report instead of continuing if:

- no redistribution-safe public asset candidate can be found
- asset license terms are unclear
- candidate assets require acceptance of nonstandard terms
- SUMO person data cannot be mapped without inventing positions
- lane normalization would break the existing vehicle truth boundary
- verifier-generated artifact drift appears outside the intended implementation
  slice

## Implementation Sequence

1. Add tests for the expanded snapshot contract and pedestrian truth separation.
2. Add backend `SimulationPedestrianSnapshot` and SUMO person mapping.
3. Add frontend pedestrian contract, interpolation, scene snapshot, and layer
   separation.
4. Add camera presets and tests.
5. Improve Seoul/Gangnam scene layers with project-authored geometry and existing
   assets.
6. Prepare public CC0/CC-BY asset candidate list for approval.
7. After candidate approval, download, optimize, register, and verify selected
   assets.
8. Run targeted gates, browser proof, and final verification.
