# Road-only UE Renderer Progress

## Iteration 1 — 2026-06-12

### Goal

After user approval of `docs/references/city-road-intersection-image-reference-approval-packet.md`, destructively reset/rebuild only the approved UE renderer boundary and generate a road/intersection-only renderer foundation for Seoul, New York, Paris, and London.

Approved destructive boundary:

```text
renderer/unreal/SmartIntersection/**
```

### References used

- `docs/references/city-road-intersection-image-reference-approval-packet.md`
- First-pass city focus: London yellow-box junction identity.

### Files changed

- `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`
- `renderer/unreal/SmartIntersection/Content/Python/capture_road_only_proof.py`
- `renderer/unreal/SmartIntersection/Content/Python/capture_road_only_render_target.py`
- `renderer/unreal/SmartIntersection/Content/Python/prepare_road_only_viewport.py`
- `renderer/unreal/SmartIntersection/SceneProfiles/cities/*.json`
- `renderer/unreal/SmartIntersection/Content/Maps/Generated/*_RoadOnly.umap`
- `renderer/unreal/SmartIntersection/GeneratedProof/*_road_only_manifest.json`
- `scripts/verify-road-only-ue-renderer.py`
- `scripts/generate-unreal-city.ps1`
- `scripts/capture-unreal-renderer-proof.ps1`
- `scripts/capture-unreal-road-render-target.ps1`
- `scripts/capture-unreal-road-viewport.ps1`

### Commands run

```bash
python3 scripts/verify-road-only-ue-renderer.py
npm run unreal:precheck
npm run unreal:generate-city:dry-run -- -Profile london
npm run unreal:generate:london
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/capture-unreal-renderer-proof.ps1 -Profile london
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/capture-unreal-road-render-target.ps1 -Profile london
npm run unreal:generate:seoul
npm run unreal:generate:new-york
npm run unreal:generate:paris
npm run unreal:generate:london
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/capture-unreal-road-render-target.ps1 -Profile seoul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/capture-unreal-road-render-target.ps1 -Profile new_york
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/capture-unreal-road-render-target.ps1 -Profile paris
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/capture-unreal-road-render-target.ps1 -Profile london
```

### Generated artifacts

```text
renderer/unreal/SmartIntersection/Content/Maps/Generated/london_RoadOnly.umap
renderer/unreal/SmartIntersection/Content/Maps/Generated/new_york_RoadOnly.umap
renderer/unreal/SmartIntersection/Content/Maps/Generated/paris_RoadOnly.umap
renderer/unreal/SmartIntersection/Content/Maps/Generated/seoul_RoadOnly.umap
renderer/unreal/SmartIntersection/GeneratedProof/london_road_only_manifest.json
renderer/unreal/SmartIntersection/GeneratedProof/new_york_road_only_manifest.json
renderer/unreal/SmartIntersection/GeneratedProof/paris_road_only_manifest.json
renderer/unreal/SmartIntersection/GeneratedProof/seoul_road_only_manifest.json
```

### Screenshot proof

Visible render-target proofs generated locally:

```text
artifacts/unreal-road-only-seoul-rendertarget.png
artifacts/unreal-road-only-new_york-rendertarget.png
artifacts/unreal-road-only-paris-rendertarget.png
artifacts/unreal-road-only-london-rendertarget.png
```

Earlier failed proof attempts:

```text
artifacts/unreal-road-only-london.png
artifacts/unreal-road-only-london-internal.png
```

Root cause of black/dark captures:

- UE 5.7 Python `Rotator(...)` constructor ordering differed from the assumed pitch/yaw/roll order. The proof camera was looking away from the generated map.
- `AutomationLibrary.take_high_res_screenshot` in unattended mode produced black output.
- The replacement capture path uses `SceneCapture2D` + `TextureRenderTarget2D` export and corrected `Rotator(roll, pitch, yaw)` ordering.

### Rubric scores — first technical proof

These are first technical proof scores, not final photoreal scores.

#### Seoul

- Geometry and scale: 2
- City-specific road identity: 2 — red bus lane, wide zebra crossings, tactile-paving cue.
- Materials: 1 — readable colors, but still simple/blockout materials.
- Markings and crossings: 2
- Signals and roadside infrastructure: 1
- Lighting and rendering: 2 — visible render-target proof.
- Scope control: 3
- SUMO/TraCI architecture alignment: 3

#### New York

- Geometry and scale: 2
- City-specific road identity: 1 — road/crosswalk proof is visible, but first pass still resembles Paris too closely.
- Materials: 1
- Markings and crossings: 2
- Signals and roadside infrastructure: 1
- Lighting and rendering: 2
- Scope control: 3
- SUMO/TraCI architecture alignment: 3

#### Paris

- Geometry and scale: 2
- City-specific road identity: 1 — road/crosswalk proof is visible, but first pass still resembles New York too closely.
- Materials: 1
- Markings and crossings: 2
- Signals and roadside infrastructure: 1
- Lighting and rendering: 2
- Scope control: 3
- SUMO/TraCI architecture alignment: 3

#### London

- Geometry and scale: 2
- City-specific road identity: 2 — yellow-box junction, double-yellow/cycle-box/bus-lane cues visible.
- Materials: 1
- Markings and crossings: 2
- Signals and roadside infrastructure: 1
- Lighting and rendering: 2
- Scope control: 3
- SUMO/TraCI architecture alignment: 3

### Issues found

- New York and Paris need stronger city-specific differentiation in the next visual pass.
- Materials remain simple emissive/base-color proof materials, not photoreal asphalt/paint yet.
- Signal placeholders are present semantically but not visually strong in the proof frame.
- GUI window capture remains less reliable than render-target capture; render target is now the preferred proof path.

### Fixes made

- Added named road-only maps: `/Game/Maps/Generated/{city}_RoadOnly`.
- Added movable DirectionalLight and SkyLight for no-baked-light visibility.
- Added emissive/base-color city materials under `/Game/Materials/RoadOnlyRenderer`.
- Added city manifests under `GeneratedProof/`.
- Added semantic verifier for road-only scope and city features.
- Patched capture scripts to target `*_RoadOnly` maps.
- Added render-target capture script and PowerShell wrapper.
- Fixed UE 5.7 Python `Rotator` constructor ordering for proof cameras.

### Verification result

- `python3 scripts/verify-road-only-ue-renderer.py`: passing.
- UE generation commands: exit code 0 for Seoul, New York, Paris, London.
- Map artifacts exist and have plausible non-empty sizes.
- Visible render-target screenshots exist for all four cities.
- Next step: refine city-specific visual language and material realism.

### Commit

Pending final verification and git hygiene for the capture-pipeline fix.
