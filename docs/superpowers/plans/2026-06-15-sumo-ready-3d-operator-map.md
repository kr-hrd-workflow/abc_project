# SUMO-Ready 3D Operator Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task, and use `karpathy-guidelines` before planning, writing, reviewing, refactoring, or debugging code. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move SmartIntersection from polished static city render proofs into one large, SUMO-ready, 3D operator simulation viewport where traffic volume, lanes, signals, and vehicle movement can be read clearly.

**Architecture:** SUMO/TraCI remains the traffic truth source, FastAPI exposes normalized renderer snapshots, and Unreal renders the operator viewport through `ATrafficSimulationController` and Pixel Streaming. The first implementation slice must prove scale and lane readability in one map before adding city variants, generated vehicle/signal asset packs, or full multi-city motion.

**Tech Stack:** Unreal Engine 5.7, UE Editor Python, C++ `SmartIntersectionRuntime`, SUMO/TraCI, FastAPI renderer snapshots, Next.js dashboard Pixel Streaming iframe, Image Gen for reference/texture direction only.

---

## Current Diagnosis

The current road-only city renders are useful visual proof, but they are still too narrow for traffic-volume judgment:

- Queue length and congestion are hard to read because the intersection frame is demo-sized.
- Some city road lines and asphalt markings feel broken or card-like.
- Backplates still carry too much visual responsibility and should be replaced near the traffic-reading area with real 3D context.
- City-specific signals and vehicles are needed, but they should become normalized 3D assets that SUMO can drive, not flat image cards.
- The next product risk is motion and simulation truth, not another static screenshot polish pass.

## Non-Negotiable Boundaries

- SUMO/TraCI is truth; FastAPI orchestrates; Unreal renders.
- Do not connect to real traffic signal controllers.
- Do not modify landing-page imagery or landing layout unless explicitly requested.
- Do not add proof strips, plinths, asset lineups, or debug props to production maps.
- Do not treat script success as visual success. Human visual inspection remains a hard gate.
- Image Gen outputs may guide city-specific vehicles, signal heads, textures, and reference sheets, but moving simulation objects must be 3D meshes/actors with stable pivots, bounds, and lane alignment.
- Build one believable operator map first; only then expand to all cities.

## Implementation Stages

### Stage 1: Large SUMO-Ready Operator Map

Build one large operator intersection map, preferably `smart_intersection_rebuild`, with enough road length to show traffic pressure.

Deliverable:

- A generated Unreal map at `renderer/unreal/SmartIntersection/Content/Maps/Generated/smart_intersection_rebuild.umap` or an explicitly named first-city equivalent.
- Four approaches with readable lane structure, turn lanes, stop bars, crosswalks, medians/curbs/sidewalks, and queue space for at least 20-40 visible vehicles.
- Road markings built as Unreal geometry, decals, or spline-driven meshes, not as fragile 2D backplate paint.
- No 2D card/backplate artifacts inside the traffic-reading zone.
- A fresh proof capture showing the whole operator-view intersection.

Stage 1 intentionally does **not** need final city-specific vehicles, all four cities, or live SUMO movement. It must prove the map scale and visual grammar can support simulation.

### Stage 2: 3D Foreground And City Context Replacement

Replace traffic-area backplates with limited 3D context:

- sidewalks, curbs, medians, traffic cabinets, CCTV poles, mast arms, street lights, guardrails, signs, nearby low-rise facade blocks
- low-detail 3D distant facades only where needed
- distant cards allowed only outside the traffic-reading zone

Success means the operator can read the intersection without seeing billboard/card composition in the road, signal, or queue area.

### Stage 3: City-Specific Signal And Vehicle Asset Pipeline

Use Image Gen to produce reference sheets and texture direction for each city, then convert the direction into normalized 3D asset kits:

- signal heads and poles per city
- passenger vehicles, buses, taxi/emergency variants
- material variants for Seoul, New York, Paris, and London
- UE mesh pivots aligned for lane placement and SUMO heading updates

Image Gen is reference/input, not the runtime object format.

### Stage 4: SUMO/TraCI Motion Binding

Connect simulated motion to Unreal:

- SUMO lane/vehicle/signal state is normalized by FastAPI into renderer snapshots.
- `ATrafficSimulationController` applies snapshot state to vehicle actors, signal materials, queue markers, and pedestrian/emergency indicators.
- Two or more snapshots must visibly change vehicle positions and signal phase.
- Fixture mode remains available; live SUMO mode is only marked complete after real local runtime execution passes.

### Stage 5: Pixel Streaming And Dashboard Integration

Expose the working operator viewport through the existing dashboard stream slot:

- `NEXT_PUBLIC_SIMULATION_STREAM_URL=http://127.0.0.1`
- `npm run unreal:home`
- `/dashboard` iframe shows the Unreal stream
- simulation state is inspectable without claiming real-world control

### Stage 6: Multi-City Expansion

After Stage 1-5 pass on one map:

- expand profiles to Seoul, New York, Paris, and London
- keep shared SUMO lane semantics stable
- swap city-specific road markings, signals, vehicles, and nearby context
- rerun per-city capture and simulation smoke checks

## Detailed Stage Files

The original plan grew large enough to make retrieval and review noisy. Detailed task plans now live in split stage files while this file remains the stable index.

- [Stage 1: Large SUMO-Ready Operator Map](2026-06-15-sumo-ready-3d-operator-map/stage-1-large-operator-map.md)
- [Stage 2: 3D Foreground And City Context Replacement](2026-06-15-sumo-ready-3d-operator-map/stage-2-3d-context.md)
- [Stage 3: City-Specific Signal And Vehicle Asset Pipeline](2026-06-15-sumo-ready-3d-operator-map/stage-3-city-asset-pipeline.md)
- [Stage 4: SUMO/TraCI Motion Binding](2026-06-15-sumo-ready-3d-operator-map/stage-4-sumo-traci-motion-binding.md)
- [Stage 5: Pixel Streaming And Dashboard Integration](2026-06-15-sumo-ready-3d-operator-map/stage-5-pixel-streaming-dashboard.md)

## Current Status

- Stage 1 is implemented and verified with `SUMO_READY_OPERATOR_STAGE1_PASS`.
- Stage 2 is implemented and verified with `SUMO_READY_OPERATOR_STAGE2_PASS`.
- Stage 3 is implemented and verified with `SUMO_READY_OPERATOR_STAGE3_PASS`.
- Stage 4 fixture mode is implemented and verified with `SUMO_READY_OPERATOR_STAGE4_PASS`.
- Live SUMO/TraCI remains open until `traci`, `sumolib`, `sumo`, `netconvert`, a real SUMO config, and `SUMO_SIMULATION_MODE=sumo_traci` are available and a local run produces `simulation_source=sumo_traci`.
- Stage 5 is the next planned slice: Pixel Streaming plus dashboard proof for the Stage 4 operator viewport. It must not claim live SUMO or real traffic-control authority.
- Stage 6 remains future scope after Stage 5 passes on one map.

## Cookbook Goal Source

The Stage goal prompts follow the OpenAI Cookbook `Using Goals in Codex` shape: outcome, verification surface, constraints, boundaries, iteration policy, and blocked stop condition. Source: `https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex#how-to-write-a-goal`.

## Self-Review

- Spec coverage: covers map scale, broken line/marking concerns, 3D backplate replacement direction, Image Gen vehicle/signal direction, SUMO-driven vehicle motion, and next-session Stage 1 execution.
- Scope check: Stage 1 is intentionally limited to one large operator map and proof capture. Vehicle asset generation and live SUMO motion are later stages.
- Ambiguity check: Image Gen is constrained to reference/texture direction until normalized 3D assets exist.
- Verification check: Stage 1 has script, visual, git diff, and honest remaining-gate requirements.
- Stage 1 verification update: semantic checks pass through the bundled Python runtime and npm verifier alias; the Stage 1 proof was recaptured with acceptable exposure and central-median readability.
- Stage 2 coverage: plan covers Image Gen reference direction, generation mode, real 3D context geometry, no-traffic-zone-backplate policy, capture, semantic verifier, and visual inspection gates.
- Stage 2 Goal prompt update: explicitly requires live checkbox tracking with `- [ ]` and `- [x]` in this plan document.
