# Complete Simulation Renderer Stage Plan

## User ask

Push SmartIntersection from cinematic proof toward a complete traffic simulation renderer, not a game.

## Non-negotiable framing

- Unreal is a **traffic simulation renderer** and Pixel Streaming viewport, not the simulation truth source and not a game product.
- SUMO/TraCI remains the future truth source.
- FastAPI remains orchestration/API/RAG.
- Unreal C++/Blueprint is for runtime controls and packaged simulation behavior.
- Editor Python remains valid for deterministic map generation and FBX import.

## Acceptance criteria

1. Unreal project contains a real C++ runtime module shell with simulation-oriented names.
2. The C++ module exposes a runtime controller actor for city profile, phase, signal timings, stream status, and simulation snapshot ingestion.
3. Generated maps include the runtime controller actor in addition to cinematic scene assets.
4. Landing page has per-section cinematic visual assets beyond the main hero image.
5. Web tests prove landing section assets are present and section-specific.
6. Unreal build or project-file generation succeeds, or any engine/compiler blocker is captured honestly.
7. UE maps and final screenshots are regenerated/validated after the runtime actor is introduced.
8. Full repo verify passes.
9. No UE config security tokens or secrets are committed.
10. Heavy UE/Blender/node proof processes are stopped after verification.

## TDD route

- RED: add web tests for section-specific landing visuals and repo tests for Unreal runtime C++ source presence.
- GREEN: add assets/source and minimal integration.
- REFACTOR: tighten naming/docs and remove game terminology.

## Implementation steps

1. Inspect current landing sections and Unreal project scaffold.
2. Add RED tests.
3. Add `Source/SmartIntersectionRuntime` C++ module files:
   - `SmartIntersectionRuntime.Build.cs`
   - `SmartIntersectionRuntimeModule.h/.cpp`
   - `TrafficSimulationController.h/.cpp`
4. Update `.uproject` Modules array with simulation category/runtime module.
5. Update map generator to spawn `TrafficSimulationController` when compiled class is available, with cube/material fallback marker if not yet compiled.
6. Generate section-specific landing visuals under `apps/web/public/landing/` using code-generated SVG/PNG assets from final Unreal screenshots and diagrams.
7. Wire landing sections to those assets with alt text and tests.
8. Run Unreal project-file generation/build if available.
9. Regenerate maps/screenshots and verify tokens.
10. Run full `npm run verify`, secret scan, process cleanup, commit/push.

## Known external limits

A literal commercial 100% photoreal city requires licensed Fab/Quixel/Megascans/vehicle/road texture packs and art direction time. This plan completes the repo-side production structure and proof stage without inventing licensed assets or credentials.
