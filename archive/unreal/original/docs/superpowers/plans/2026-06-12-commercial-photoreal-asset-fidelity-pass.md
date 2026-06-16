# Commercial Photoreal Asset Fidelity Pass

## Goal

Move SmartIntersection from procedural/proxy realism toward a commercial-grade photoreal asset layer while staying legal, reproducible, and verifiable.

## Non-negotiables

- Use only legal assets: project-authored procedural assets, local installed UE content, or clearly public/free/CC0 assets.
- Do not scrape or commit licensed Marketplace/Fab/Megascans content without user-provided license/install path.
- Keep SUMO/FastAPI/Unreal role split: Unreal is the simulation renderer, not the truth source.
- Verify in Unreal, not just by file creation.
- Revert UE auto-generated config secrets/noise before commit.

## Acceptance criteria

1. Asset source audit documents what was used and its license/source.
2. UE project receives a production-fidelity asset pack or generator upgrade with:
   - PBR road/asphalt material variants,
   - lane markings/crosswalk/decal detail,
   - curb/sidewalk/building facade detail,
   - street furniture/signage/traffic-signal hardware,
   - vehicle material/detail improvements,
   - city atmosphere/post-process compatibility.
3. Generated maps reference project asset paths beyond `/Engine/BasicShapes`, especially `/Game/PhotorealKit` or a new commercial-fidelity namespace.
4. Four city maps regenerate successfully.
5. Fresh screenshots are captured and visually checked.
6. Verification passes:
   - `python3 scripts/verify-complete-simulation-renderer.py`
   - UE asset-fidelity verification script if added,
   - `npm run verify`,
   - secret scan,
   - no heavy UE/Blender processes left running.
7. Commit and push to `origin/main`.

## Implementation sequence

1. Audit current `tools/asset-pipeline`, UE `Content/PhotorealKit`, generator, and current maps.
2. Research/download only legal free PBR references if useful, otherwise generate procedural PBR-like textures locally.
3. Build/import a higher-fidelity `CommercialPhotorealKit`:
   - high-resolution asphalt/sidewalk/crosswalk/road-marking textures,
   - FBX/mesh props for signal heads, CCTV mast, bollards, signs, lane arrows,
   - material instances and decals.
4. Patch `generate_city_scene.py` to place the new detail set in every city.
5. Regenerate maps; compile/run UE if native/source changes require it.
6. Capture screenshots and landing proof.
7. Verify/commit/push.

## Known limitation

True commercial/AAA asset quality generally requires licensed asset packs (Fab/Megascans/city packs/vehicle packs) and manual art direction. This pass should maximize reproducible, legal project-owned fidelity and leave a clear seam for swapping in licensed packs later.
