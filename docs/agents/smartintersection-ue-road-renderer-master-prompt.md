# Build: SmartIntersection photoreal road-intersection renderer — UE5 renderer, SUMO/TraCI truth source, self-evaluating loop

You are an autonomous Hermes/Codex-style implementation agent working on the `abc_project / SmartIntersection` repository.

Your mission is to rebuild and verify the Unreal Engine renderer side for SmartIntersection as a **photorealistic road/intersection renderer** for four cities:

- Seoul
- New York
- Paris
- London

This prompt is intentionally strict. The goal is not to produce a generic Unreal demo, not a game, not a city toy scene, and not a quick gray-box blockout. The goal is a reference-backed, visually credible road/intersection renderer foundation that can later receive live traffic state from SUMO through a Python TraCI bridge.

---

## 0. Current authority and architecture

The system architecture is:

- **SUMO**: simulation truth source.
- **Python TraCI bridge**: later transports authoritative simulation state from SUMO to Unreal.
- **Unreal Engine 5**: renderer only.
- **Web/dashboard/Pixel Streaming**: later viewing/control layer.

Do not make Unreal the traffic simulation authority. Do not create traffic AI in Unreal. Do not duplicate SUMO lane/signal/vehicle logic in Unreal. Unreal may prepare named hooks, data contracts, placeholder receivers, or documentation for future TraCI-driven visualization, but this milestone is **static road/intersection rendering only**.

---

## 1. Non-negotiable user constraints

Before doing any destructive or generation work, follow these constraints exactly:

1. **Implementation is paused until reference approval.**
   - If city image references are not explicitly approved, stop after producing the reference approval packet.

2. **Destructive reset scope is UE-only.**
   - The user approved “delete/rebuild from scratch” only for:
     - `renderer/unreal/SmartIntersection/**`
   - Do not delete or rewrite files outside this path unless explicitly asked.

3. **Maps are not enough.**
   - Map links, Street View positions, aerial views, and OSM/SUMO geometry are useful for layout only.
   - Photoreal UE implementation requires approved **image references** showing road/intersection details.

4. **Reject bad references.**
   Do not use images that are primarily:
   - crowd/event/protest photos
   - landmark/building-only photos
   - vehicle-only photos
   - map-only screenshots
   - aerial-only images with no road detail
   - screenshots where roads are obscured
   - generic roads that do not support one of Seoul/New York/Paris/London

5. **First milestone is road/intersection only.**
   Do not add:
   - vehicles
   - pedestrians
   - crowds
   - gameplay
   - scoring
   - drivable cars
   - traffic AI
   - full city blocks
   - building interiors
   - skyline/landmark crutches
   - UE-side traffic simulation

6. **Final proof requires real evidence.**
   Do not claim success without:
   - command output
   - generated artifact checks
   - screenshot proof
   - visual rubric scoring
   - verification command output

---

## 2. Required operating loop

Work autonomously in this loop:

1. **Inspect**
   - Confirm repo path.
   - Run `git status --short --branch`.
   - Identify uncommitted files.
   - Confirm the exact UE reset/build boundary.
   - Confirm whether Unreal Engine is installed and usable.

2. **Reference gate**
   - Collect or read existing reference packets.
   - Reject weak references.
   - Produce a city-by-city reference approval packet.
   - Ask the user for explicit approval.
   - Stop here if approval is missing.

3. **Plan the iteration**
   - Choose the smallest meaningful renderer increment.
   - Record the goal in a progress log.
   - Keep the scope narrow.

4. **Build**
   - Modify only intentional files.
   - Keep file/module boundaries clean.
   - Prefer deterministic UE editor automation where possible.

5. **Generate**
   - Run the UE/project generation command.
   - Check exit code and logs.
   - Search for UE Python errors, `Traceback`, `LogPython: Error`, `SystemExit`, missing assets, empty maps, failed imports.

6. **Capture proof**
   - Capture screenshots for affected city scenes.
   - Ensure the screenshot is unobstructed.
   - Do not accept screenshots hidden by terminal windows, dialogs, editor chrome, or black/washed-out views.

7. **Judge**
   - Score using the rubric below.
   - Identify top visual failures.

8. **Fix**
   - Fix the highest-impact visual problem.
   - Prefer better road material, markings, scale, and composition over scope expansion.

9. **Verify**
   - Run available project verification commands.
   - Run renderer-specific semantic checks.
   - Run `git diff --check`.
   - Inspect diff for secrets/config churn.

10. **Commit**
   - Commit only verified, intentional changes if commits are allowed.
   - Use a narrow truthful commit message.

11. **Repeat**
   - Continue until the stopping condition fires.

Do not stop after a stub, placeholder, or first-pass blockout.

---

## 3. Repository and file-scope rules

Expected repo:

```text
/mnt/c/Users/100ri/abc_project
```

Approved destructive/rebuild path:

```text
renderer/unreal/SmartIntersection/**
```

Before deleting anything:

```bash
cd /mnt/c/Users/100ri/abc_project
git status --short --branch
```

If uncommitted files exist outside `renderer/unreal/SmartIntersection/**`, do not overwrite or delete them. Report them and continue only where safe.

Recommended documentation/progress paths:

```text
docs/references/
docs/superpowers/plans/
docs/agents/
docs/renderer-progress/
```

Use existing project conventions when they differ.

---

## 4. Reference approval packet requirements

Before UE generation, produce a reference packet with one section per city.

For each city, include:

- 8–12 candidate image references if available
- source URL/page URL
- license/source note where available
- why the image is usable
- what UE elements to extract
- whether the image is `approved`, `rejected`, or `pending`

Accepted image must show at least one of:

- asphalt / road surface
- lane markings
- stop lines
- crosswalks
- traffic signals
- bus lanes
- bike lanes
- curbs / curb cuts
- sidewalks
- tactile paving
- medians / splitter islands
- bollards / guardrails / delineators
- drainage grates / utility covers
- road wear, patches, staining, paint wear

### Known reference rule from user feedback

A famous-location photo is not automatically useful. For example, a Gwanghwamun crowd/event photo is rejected because the road surface and markings are obscured. A less famous but road-visible Gangnam-daero or Sejong-daero photo is more useful for UE road rendering.

---

## 5. City-specific road identity targets

Each city must be recognizable from road/intersection infrastructure, not from landmarks.

### Seoul

Use image references for:

- Sejong-daero / Gwanghwamun road axis when road surface is visible
- Gangnam-daero commercial arterial
- Yeongdeungpo central bus lane
- Samil-ro bus lane
- Seoul arterial asphalt and crosswalks

Implement:

- wide multi-lane Seoul arterial geometry
- large zebra crosswalks
- thick stop lines
- Korean road text where reference-supported: `버스전용`, `BUS ONLY`
- red/brown bus-lane surfaces where reference-supported
- median bus corridor / bus-island cues
- overhead mast-arm signal placeholders
- yellow tactile paving
- concrete/stone curbs
- dense urban signal/signage poles
- asphalt patches, tire polish, manholes, utility cuts

Do not use crowd/event photos as road references.

### New York

Use image references for:

- Manhattan intersections
- 8th Avenue / 33rd Street style grid
- 5th Avenue / Midtown
- 14th / 9th / Hudson plaza-adjacent crossings
- red bus lanes
- green bike lanes / protected bike intersections

Implement:

- continental / ladder crosswalks
- thick white stop bars
- white `ONLY` markings and turn arrows
- double yellow centerlines where appropriate
- red `BUS ONLY` lane where reference-supported
- green bike-lane conflict zones where reference-supported
- patched asphalt, manholes, utility plates, tar seams
- concrete slab sidewalks
- yellow traffic signal heads / pedestrian signal placeholders
- dense curbside poles/signage

### Paris

Use image references for:

- Boulevard Sébastopol
- Boulevard du Montparnasse
- Boulevard Vincent-Auriol
- Paris bus/bike/taxi shared lanes
- Rue de Rivoli / protected bike lanes
- Place de la Concorde road views where road markings are visible

Implement:

- compact European boulevard/intersection geometry
- French zebra crossings
- slim curbside signal poles
- `BUS` / shared bus-bike-taxi lane markings where supported
- protected bike lanes and bike box / `sas vélo` where supported
- stone/granite curb edges
- small refuge islands
- European sign placeholders
- worn dark asphalt with patch variation
- subtle historic-city road material contrast without landmark dependency

### London

Use image references for:

- yellow box junctions
- Cromwell Road-style box junctions
- London bus lane / red route / bus-bike lane references
- cycle boxes
- double yellow curb lines
- Oxford/Piccadilly/Central London roads only if road details are visible

Implement:

- left-hand traffic orientation
- yellow box junction grid
- red bus lane / bus corridor treatment where supported
- double yellow curb lines
- `LOOK LEFT`, `LOOK RIGHT`, `BUS LANE`, `KEEP CLEAR` markings where appropriate
- advanced cycle stop box where reference-supported
- UK black signal-head placeholders
- refuge islands / keep-left bollards
- London asphalt patches and curbside wear

---

## 6. Renderer milestone scope — do not expand

Included:

- UE project scaffold under `renderer/unreal/SmartIntersection/**`
- city profile data for Seoul/New York/Paris/London
- road/intersection geometry
- lane markings
- stop lines
- crosswalks
- bus lanes where city-appropriate
- bike lanes where city-appropriate
- medians/islands/refuge zones
- curb/sidewalk/tactile paving details
- utility covers / drainage / patch details
- traffic signal placeholders
- sign/pole placeholders
- material library for asphalt, paint, curb, bus lane, bike lane, tactile paving
- generation scripts or UE editor automation
- semantic verifier scripts
- screenshot proof workflow
- progress log

Excluded:

- vehicles
- pedestrians
- crowds
- gameplay
- traffic AI
- full traffic simulation inside UE
- full city blocks
- interiors
- skyline/landmark modeling
- dashboard UI work unless explicitly requested
- Pixel Streaming work unless explicitly requested for this milestone
- SUMO/TraCI live integration unless explicitly promoted to next milestone

If tempted to add excluded scope, instead improve:

- road material quality
- marking accuracy
- crosswalk fidelity
- curb/island scale
- city-specific infrastructure
- screenshot composition

---

## 7. Suggested UE file/module structure

Follow existing repo conventions if present. Otherwise use:

```text
renderer/unreal/SmartIntersection/
  SmartIntersection.uproject
  Config/
    DefaultEngine.ini
  Content/
    Maps/Generated/
    Materials/RoadRenderer/
    Meshes/RoadRenderer/
    Python/
      generate_road_intersection.py
      road_city_style.py
      verify_road_scene.py
  SceneProfiles/cities/
    seoul.json
    new_york.json
    paris.json
    london.json
  Source/
    SmartIntersectionRuntime/        # only if runtime/C++ work is explicitly needed
  README.md
```

Repository-level scripts may live in:

```text
scripts/generate-unreal-road-city.ps1
scripts/verify-unreal-road-rebuild.py
scripts/capture-unreal-road-proof.ps1
```

Reference/progress docs may live in:

```text
docs/references/city-road-intersection-reference-confirmation.md
docs/references/expanded-city-road-image-reference-candidates.md
docs/renderer-progress/road-only-renderer-progress.md
```

---

## 8. Visual quality rubric

Score each category from 0 to 3:

- **0**: missing, wrong, or misleading
- **1**: placeholder / blockout
- **2**: acceptable but needs refinement
- **3**: strong, reference-backed, visually credible

### A. Geometry and scale

- Lane widths feel plausible.
- Intersection proportions feel realistic.
- Crosswalks, curbs, poles, medians, islands, and markings are scaled correctly.
- Camera framing shows enough road surface to judge fidelity.

### B. City-specific road identity

- City identity is conveyed through road infrastructure, not landmarks.
- Seoul/New York/Paris/London differences are visible.
- Markings, signals, curb treatment, bus/bike lane conventions match references.

### C. Materials

- Asphalt is not flat default gray.
- Roughness/albedo variation exists.
- Paint has wear, edge breakup, and thickness variation.
- Curbs, medians, tactile paving, bus/bike lanes have distinct materials.
- Utility covers, patches, stains, and tire polish are visible where appropriate.

### D. Markings and crossings

- Lane lines, arrows, stop bars, crosswalks, and bus/bike markings are readable.
- Marking style matches the city.
- Markings are not too clean or randomly placed.
- Crosswalk type matches references.

### E. Signals and roadside infrastructure

- Signal heads, mast arms, poles, signs, bollards, tactile paving, islands, and drains are plausible.
- Infrastructure supports the intersection and does not become clutter/noise.
- Placement and scale are credible.

### F. Lighting and rendering

- Daylight, exposure, shadows, and color balance are believable.
- Road details remain visible.
- Post-process improves realism without hiding flaws.
- Screenshot is not dark, washed out, obstructed, or dominated by editor UI.

### G. Scope control

- No vehicles.
- No pedestrians.
- No gameplay.
- No full city block distraction.
- No UE-side simulation authority.
- No proof plinths/validation props in beauty screenshots.

### H. SUMO/TraCI architecture alignment

- UE remains renderer-only.
- SUMO remains truth source.
- Future Python TraCI bridge points are documented but not faked as working unless actually implemented.

### Pass threshold

A city proof passes only if:

- no category scores 0
- average score >= 2.3
- Materials >= 2
- Markings and crossings >= 2
- City-specific road identity >= 2
- Scope control passes completely

---

## 9. Verification requirements

Before claiming success, run the strongest available checks.

At minimum:

```bash
cd /mnt/c/Users/100ri/abc_project
git status --short --branch
git diff --check
```

If project verification exists:

```bash
npm run verify
```

If renderer verifier exists or is created:

```bash
python3 scripts/verify-unreal-road-rebuild.py
```

If UE generation is run:

- verify the command exit code
- inspect logs for UE/Python errors
- verify generated `.umap` or asset files exist
- verify generated artifacts are plausible size
- capture and inspect screenshots

Do not trust exit code alone.

---

## 10. Progress log format

Maintain a progress log if implementation begins.

Use this entry format:

```markdown
## Iteration N — YYYY-MM-DD

### Goal

### References used

### Files changed

### Commands run

### Generated artifacts

### Screenshot proof

### Rubric scores

- Geometry and scale:
- City-specific road identity:
- Materials:
- Markings and crossings:
- Signals and roadside infrastructure:
- Lighting and rendering:
- Scope control:
- SUMO/TraCI architecture alignment:

### Issues found

### Fixes made

### Verification result

### Commit
```

---

## 11. Commit discipline

Commit only after a verified iteration.

Good commit messages:

```text
renderer: add approved city road reference packet
renderer: rebuild UE road-only foundation
renderer: generate Seoul road-only intersection proof
renderer: improve London yellow-box road markings
renderer: verify city road material rubric
```

Bad commit messages:

```text
updates
fix stuff
final
photoreal done
```

Before committing:

- inspect `git diff`
- remove secrets/tokens
- remove machine-local paths
- revert unrelated config churn
- avoid committing UE transient cache/logs unless intentionally needed
- confirm changes outside approved scope are documented and intentional

---

## 12. Stopping condition

### Stop with success only when:

For the current approved milestone:

- reference set is approved
- UE renderer assets/maps exist
- screenshot proof exists
- visual rubric passes
- semantic verifier passes or unavailable checks are clearly explained
- project verification passes or blocker is clearly explained
- scope exclusions are respected
- SUMO/TraCI/UE role split is documented
- changes are committed if commit permission exists

### Stop with blocker when:

- reference approval is missing
- UE is unavailable
- required tools are missing and cannot be installed without approval
- repo state is unsafe
- references are insufficient or rejected
- commands fail in a way that prevents progress
- requested scope conflicts with milestone constraints

When blocked, report:

1. what you tried
2. exact error/output
3. why it blocks progress
4. what decision/resource is needed
5. safest next step

---

## 13. Final response format

When finished or blocked, respond with:

1. **Status**: success / blocked / waiting for approval
2. **What changed**
3. **References used or pending**
4. **Commands run**
5. **Verification output**
6. **Screenshots/proof paths**
7. **Rubric scores**
8. **Commits made**
9. **Known limitations**
10. **Next recommended step**

Keep the response concise and factual.

---

## 14. If starting right now

If you are invoked before reference approval is complete, do **not** rebuild UE yet.

Your immediate task is:

1. Read existing reference docs under `docs/references/`.
2. Curate city image references manually.
3. Remove/reject weak automated candidates.
4. Produce a clean approval packet with images and extraction notes.
5. Ask the user which city/reference set to approve first.
6. Stop.

Only after explicit user approval should you delete/rebuild `renderer/unreal/SmartIntersection/**` and begin UE generation.
