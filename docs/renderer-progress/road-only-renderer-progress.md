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
- `renderer/unreal/SmartIntersection/SceneProfiles/cities/*.json`
- `renderer/unreal/SmartIntersection/Content/Maps/Generated/*_RoadOnly.umap`
- `renderer/unreal/SmartIntersection/GeneratedProof/*_road_only_manifest.json`
- `scripts/verify-road-only-ue-renderer.py`
- `scripts/generate-unreal-city.ps1`
- `scripts/capture-unreal-renderer-proof.ps1`

### Commands run

```bash
python3 scripts/verify-road-only-ue-renderer.py
npm run unreal:precheck
npm run unreal:generate-city:dry-run -- -Profile london
npm run unreal:generate:london
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/capture-unreal-renderer-proof.ps1 -Profile london
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/tmp-capture-london-roadonly.ps1
npm run unreal:generate:seoul
npm run unreal:generate:new-york
npm run unreal:generate:paris
npm run unreal:generate:london
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

Attempted proof paths:

```text
artifacts/unreal-road-only-london.png
artifacts/unreal-road-only-london-internal.png
```

Result: **not accepted as visual proof yet**. Both screenshot workflows produced black/dark images or obstructed editor views. The UE map assets and actor labels are generated, but screenshot capture still needs a dedicated visible viewport/camera capture fix before claiming visual acceptance.

### Rubric scores — London first pass

These are semantic/source-artifact scores, not final visual acceptance scores:

- Geometry and scale: 2 — road/intersection actors exist with lane, stop bar, crosswalk, curb, island, and signal-placeholder geometry.
- City-specific road identity: 2 — London yellow-box, double-yellow, cycle-box, and bus-lane markers are present in map strings.
- Materials: 1 — material assets exist, but visible screenshot proof is not accepted yet.
- Markings and crossings: 2 — semantic actor markers for yellow box, lane dashes, stop bars, cycle box, and crosswalks exist.
- Signals and roadside infrastructure: 1 — signal placeholders and utility covers exist, but need visible proof and refinement.
- Lighting and rendering: 0 — screenshot capture failed visual acceptance; black/dark proof means this category fails for now.
- Scope control: 3 — no vehicles, no pedestrians, no gameplay, no UE-side simulation authority in the road-only generator contract.
- SUMO/TraCI architecture alignment: 3 — manifest and generator document SUMO truth source, future TraCI bridge, Unreal renderer-only role.

### Issues found

- Initial screenshot capture opened the map but showed a dark editor viewport with lighting rebuild warnings.
- Internal UE screenshot via `AutomationLibrary.take_high_res_screenshot` also produced black output.
- Camera rotation bug was fixed (`yaw` had been accidentally placed in `roll`), but the internal screenshot path still needs additional UE viewport/camera rendering work.

### Fixes made

- Added named road-only maps: `/Game/Maps/Generated/{city}_RoadOnly`.
- Added movable DirectionalLight and SkyLight for no-baked-light visibility.
- Added city materials under `/Game/Materials/RoadOnlyRenderer`.
- Added city manifests under `GeneratedProof/`.
- Added semantic verifier for road-only scope and city features.
- Patched capture script to target `*_RoadOnly` maps.

### Verification result

- `python3 scripts/verify-road-only-ue-renderer.py`: passing after cache cleanup.
- UE generation commands: exit code 0 for Seoul, New York, Paris, London.
- Map artifacts exist and have plausible non-empty sizes.
- Visual screenshot proof: blocked/not accepted yet.

### Commit

Pending final verification and git hygiene.
