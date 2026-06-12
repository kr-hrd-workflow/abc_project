# Prompt gap and correction plan — SmartIntersection UE road renderer

## Why the previous implementation did not satisfy the user prompt

The master prompt at `docs/agents/smartintersection-ue-road-renderer-master-prompt.md` requires a **photorealistic road/intersection renderer** and explicitly says:

- not a generic Unreal demo
- not a game
- not a city toy scene
- not a quick gray-box blockout
- do not stop after a stub, placeholder, or first-pass blockout
- city proofs pass only if the visual rubric average is >= 2.3 and Materials / Markings / City identity are each >= 2

The current implementation shipped a **technical visibility/semantic blockout** instead. It made maps, labels, and visible PNGs, but it did not meet the photoreal visual target.

## Current implementation state

Current generator:

- `renderer/unreal/SmartIntersection/Content/Python/generate_road_intersection.py`

Current scene characteristics:

- Uses `/Engine/BasicShapes/Cube.Cube` for nearly every visible element.
- Uses flat base/emissive colors, deliberately brightened for Telegram proof visibility.
- No real mesh detail for curbs, tactile paving, signals, utility covers, arrows, bus-lane text, bike symbols, drains, manholes, bollards, or road edge geometry.
- No texture maps, normal maps, roughness maps, decal wear, stains, cracks, tire polish, or paint edge breakup.
- No reference-backed material layer beyond feature names and simple colors.
- New York and Paris remain visually too similar.
- Proof camera is top-down technical view, useful for visibility but not photoreal evaluation.

Current verifiers:

- `scripts/verify-road-only-ue-renderer.py`: checks semantic tokens and forbidden scope.
- `scripts/verify-road-proof-visibility.py`: checks brightness/visible-pixel coverage.

Verifier gap:

- No verifier enforces photoreal material presence.
- No verifier checks source texture dimensions/variation.
- No verifier checks actual mesh/proxy asset presence.
- No verifier checks city-specific visual differentiation beyond profile feature tokens.
- No verifier checks visual rubric pass threshold.

## Requirement vs current status

### Seoul

Prompt requires:

- wide multi-lane Seoul arterial geometry
- large zebra crosswalks
- thick stop lines
- Korean road text: `버스전용`, `BUS ONLY` where reference-supported
- red/brown bus-lane surfaces
- median bus corridor / bus-island cues
- overhead mast-arm signal placeholders
- yellow tactile paving
- concrete/stone curbs
- dense urban signal/signage poles
- asphalt patches, tire polish, manholes, utility cuts

Current status:

- Partial: road plane, crosswalk bars, red bus lane color, tactile marker token.
- Missing/weak: Korean road text, mast-arm geometry, dense poles/signage, realistic curbs, manholes, utility cuts, tire polish, asphalt/paint wear.
- Photoreal status: fail.

### New York

Prompt requires:

- continental / ladder crosswalks
- thick white stop bars
- white `ONLY` markings and turn arrows
- double yellow centerlines
- red `BUS ONLY` lane
- green bike-lane conflict zones
- patched asphalt, manholes, utility plates, tar seams
- concrete slab sidewalks
- yellow traffic signal heads / pedestrian signal placeholders
- dense curbside poles/signage

Current status:

- Partial: road plane, crosswalk bars, bus/bike lane color token.
- Missing/weak: ONLY markings, arrows, double yellow centerline detail, utility plates, tar seams, slab sidewalks, signal head visual language, curbside pole/signage density.
- New York visually resembles Paris too much.
- Photoreal status: fail.

### Paris

Prompt requires:

- compact European boulevard/intersection geometry
- French zebra crossings
- slim curbside signal poles
- `BUS` / shared bus-bike-taxi lane markings
- protected bike lanes and bike box / `sas vélo`
- stone/granite curb edges
- small refuge islands
- European sign placeholders
- worn dark asphalt with patch variation
- subtle historic-city road material contrast without landmark dependency

Current status:

- Partial: road plane, European zebra/crosswalk token, bike lane token, island token.
- Missing/weak: French text/marking cues, slim poles, sas vélo, granite curb edge geometry/material, European signs, historic-city material contrast.
- Paris visually resembles New York too much.
- Photoreal status: fail.

### London

Prompt requires:

- left-hand traffic orientation
- yellow box junction grid
- red bus lane / bus corridor treatment
- double yellow curb lines
- `LOOK LEFT`, `LOOK RIGHT`, `BUS LANE`, `KEEP CLEAR` markings
- advanced cycle stop box
- UK black signal-head placeholders
- refuge islands / keep-left bollards
- London asphalt patches and curbside wear

Current status:

- Partial: yellow-box grid, bus lane color, cycle box, double yellow marker token.
- Missing/weak: text markings, UK signal-head geometry, keep-left bollards, curbside wear, realistic asphalt/paint breakup.
- Photoreal status: fail.

## Corrected acceptance gate

Do not call the next iteration complete unless:

1. At least one city, initially London or Seoul, has a real fidelity pass beyond cube blockout.
2. The generator creates visible non-cube or assembled proxy meshes for signals, poles, utility covers, curbs, tactile paving, signs, arrows, road text, and marking wear.
3. Materials include procedural/source texture assets with visible variation.
4. A new verifier checks for fidelity tokens/assets such as:
   - `PhotorealRoadKit` or replacement approved namespace
   - `road_wear_decal`
   - `paint_edge_breakup`
   - `utility_cover_mesh`
   - `curb_profile_mesh`
   - `signal_head_mesh`
   - city-specific text/marking tokens
5. Screenshot proof is not just top-down semantic visibility; it must include an oblique/operator/camera proof where road material and infrastructure detail can be judged.
6. Visual rubric is scored honestly. A blockout cannot score Materials >= 2.

## Next corrected implementation plan

### Milestone 1 — One-city fidelity pass, London first

Reason:

- London has the clearest current geometry cue: yellow box junction.
- Prompt target has concrete visible items: yellow box, double yellow curb lines, bus lane, LOOK LEFT/RIGHT, cycle box, black signal heads, keep-left bollards.

Tasks:

1. Add a project-owned procedural asset namespace:

```text
renderer/unreal/SmartIntersection/SourceAssets/PhotorealRoadKit/
renderer/unreal/SmartIntersection/Content/PhotorealRoadKit/
```

2. Generate/import simple but real geometry proxies:

- beveled curb modules
- thin road paint strips with varied edge geometry
- circular/rectangular utility covers
- drain grates
- signal poles and black signal-head assemblies
- keep-left bollards
- tactile paving tiles
- road text mesh/decal proxies

3. Generate procedural texture source assets:

- asphalt albedo variation
- asphalt roughness variation
- paint wear masks
- curb concrete/granite variation
- red bus-lane surface variation
- yellow line/box worn paint variation

4. Update UE Python generator:

- import/replace assets instead of only using BasicShapes cubes
- add London-specific road text labels: `LOOK LEFT`, `LOOK RIGHT`, `BUS LANE`, `KEEP CLEAR`
- add curbside wear/patch decals in the proof camera frustum
- add signal-head assemblies and keep-left bollards
- keep vehicles/pedestrians excluded

5. Add verifier:

```text
scripts/verify-road-photoreal-fidelity.py
```

Checks:

- source texture files exist and are > minimum dimensions
- UE asset paths/tokens include `PhotorealRoadKit`
- London map contains required visible fidelity labels
- no vehicles/pedestrians/gameplay tokens
- proof image visibility still passes

6. Generate London only.

7. Capture two proofs:

- oblique operator proof for visual realism
- top-down semantic proof for layout

8. Score rubric honestly.

Stop condition for Milestone 1:

- London reaches at least partial pass: Materials >= 2, Markings >= 2, City identity >= 2.
- If it does not, keep iterating London before generating the other cities.

### Milestone 2 — Extend fidelity system to Seoul

Only after London visual acceptance.

### Milestone 3 — Differentiate New York and Paris

Only after the one-city fidelity pipeline is real.

## Immediate correction

Do not continue claiming the current screenshots are photoreal. They are only regression/visibility artifacts. The next implementation should target the London fidelity pass above.
