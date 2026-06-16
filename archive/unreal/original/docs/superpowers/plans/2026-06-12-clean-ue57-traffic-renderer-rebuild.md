# Clean UE 5.7 Traffic Renderer Rebuild Plan

> Required workflow: use Superpowers process skills and the repo-local `docs/agents/simulator-builder-agent.md` before implementation.

## Goal

Replace the current visually weird Unreal traffic renderer composition with a clean UE 5.7 doc-grounded operator viewport. Keep SUMO/TraCI as truth source, FastAPI as orchestration/API, Unreal as renderer, and the existing dashboard Pixel Streaming slot as delivery.

## Constraints

- Do not modify landing-page files or landing assets.
- Do not add production proof strips, oversized asset lineups, plinths, or debug prop rows.
- Python remains Editor automation only.
- Runtime simulation state belongs in `ATrafficSimulationController` / C++ / Blueprint.
- Build one credible operator viewport first, then regenerate all city maps only after it passes semantic checks.

## Task 1: Remove production proof-strip composition

Files:
- `renderer/unreal/SmartIntersection/Content/Python/generate_city_scene.py`
- `scripts/verify-complete-simulation-renderer.py`

Steps:
- [ ] Delete the foreground proof strip in `spawn_polyhaven_cc0_city_pass`.
- [ ] Delete generated actor labels containing `VISIBLE`, `foreground proof`, and `foreground plinth` from production generation.
- [ ] Add verifier checks that fail if generated maps contain those proof-strip tokens.

Verification:

```bash
python3 scripts/verify-complete-simulation-renderer.py
```

## Task 2: Add clean operator composition helpers

Files:
- `renderer/unreal/SmartIntersection/Content/Python/generate_city_scene.py`

Steps:
- [ ] Add explicit clean operator labels so generated maps prove the rebuild path is used.
- [ ] Improve the road/intersection composition with medians, turning pockets, lane queue zones, stop bars, crosswalk readability, and signal controller zones.
- [ ] Keep imported CC0/photoreal assets only as normal-scale scene dressing on sidewalks/shoulders.
- [ ] Avoid close giant foreground props that block the camera.

Verification:

```bash
npm run unreal:generate-city -- -Profile seoul
python3 scripts/verify-complete-simulation-renderer.py
```

## Task 3: Add runtime snapshot state fields

Files:
- `renderer/unreal/SmartIntersection/Source/SmartIntersectionRuntime/Public/TrafficSimulationController.h`
- `renderer/unreal/SmartIntersection/Source/SmartIntersectionRuntime/Private/TrafficSimulationController.cpp`
- `scripts/verify-complete-simulation-renderer.py`

Steps:
- [ ] Extend `ATrafficSimulationController` with visible snapshot fields:
  - active signal group,
  - cycle second,
  - directional queues,
  - emergency approach flag/direction.
- [ ] Parse a minimal JSON snapshot in `ApplySimulationSnapshotJson`.
- [ ] Keep raw `LastSnapshotJson` and timestamp behavior.
- [ ] Add verifier tokens for the new fields.

Verification:

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& 'C:\Program Files\Epic Games\UE_5.7\Engine\Build\BatchFiles\Build.bat' SmartIntersectionEditor Win64 Development -Project='C:\Users\100ri\abc_project\renderer\unreal\SmartIntersection\SmartIntersection.uproject' -WaitMutex -NoHotReloadFromIDE"
```

## Task 4: Regenerate maps and capture proof

Files:
- generated `.umap` files under `renderer/unreal/SmartIntersection/Content/Maps/Generated/`
- proof artifact under `docs/technotes/assets/`

Steps:
- [ ] Regenerate Seoul first.
- [ ] Inspect UE logs for no Python errors.
- [ ] Regenerate all cities after Seoul passes.
- [ ] Capture at least one visual proof screenshot of the clean renderer.
- [ ] Ensure no landing files changed.

Verification:

```bash
npm run unreal:generate:seoul
npm run unreal:generate:new-york
npm run unreal:generate:paris
npm run unreal:generate:london
python3 scripts/verify-simulator-builder-agent.py
python3 scripts/verify-complete-simulation-renderer.py
npm run verify
```

## Task 5: Commit and push

Steps:
- [ ] Secret scan staged diff.
- [ ] `git diff --check`.
- [ ] Commit and push.

Expected final state:
- Clean git status against origin.
- Commit pushed to `origin/main`.
- Final response includes verification results and visual proof path if available.
