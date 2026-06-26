# R3F Day Plate + CCTV Viewpoint + Seoul Signals — Screenshot Set

Evidence images for the weekly technote covering this work.

- **Week:** 2026-W26 (week of 2026-06-26)
- **Source root:** `artifacts/` and `apps/web/public/simulation/r3f/assets/plates/`
- **Related commits:** `a1cdc82` (day plate + GLB-material vehicles), `900e872` (CCTV viewpoint + Seoul signals + vehicle color variety)

## What was done this week

- **Day plate + photoreal mount:** the day scene now projects a photoreal daytime Gangnam plate (was a procedural blockout). Both day and night project a plate; the procedural road is suppressed for both.
- **Vehicle quality (Task 9 redo):** vehicles render with real GLB geometry + per-material PBR (glass / wheels / emissive head-tail-lightbar) instead of flat silhouettes, with matte tone-matching, a tiling paint detail + normal map, and per-instance Korean color variety.
- **CCTV viewpoint:** a second low-oblique `operator-cctv` camera + day/night CCTV plates, switchable via `?viewpoint=cctv`. The low angle is intended to make traffic signals readable.
- **Seoul traffic signals:** horizontal 4-aspect heads (red / yellow / green-left-arrow / green) on a black backplate, on a mast arm cantilevering over the stop line, state-driven from `SceneSnapshot.signals` (no real control).
- **Plates cleaned:** lane arrows removed, two-way roads with a red median bus lane per direction, night asphalt reflections toned down.

## Image index

| File | What it is |
| --- | --- |
| `01-day-plate-wide.png` | Daytime wide operator plate (imagegen) |
| `02-night-plate-wide.png` | Night wide operator plate (imagegen) |
| `03-day-plate-cctv.png` | Daytime low-oblique CCTV plate |
| `04-night-plate-cctv.png` | Night low-oblique CCTV plate |
| `05-day-render-glb-vehicles.png` | Day dashboard render: plate + real GLB-material vehicles (color variety) |
| `06-night-render-glb-vehicles.png` | Night dashboard render: plate + vehicles |

> Note: the CCTV plates ship as WebP in the runtime asset bundle (payload budget); PNG copies are kept here for the technote. The CCTV *composite* render (plate + vehicles + signals at the low angle) still needs a render-harness fixture capture — pending follow-up.
