# R3F Photoreal Dashboard Renderer

## Decision

R3F is the active dashboard renderer path for this implementation plan; Stage 0 records the selected direction and does not mean the R3F runtime is already implemented or enabled.

Unreal/Pixel Streaming remains archived.

SUMO/TraCI/Tarcl is simulation truth.

The browser renderer can interpolate received state but cannot invent traffic truth.

Image Gen references are visual targets, not runtime evidence.

## Renderer Boundary

Stage 0 records the selected renderer path; it does not mean the R3F runtime is already implemented or enabled.

Renderer precedence for the `/dashboard` simulation viewport:

1. External renderer: `NEXT_PUBLIC_SIMULATION_STREAM_URL` iframe remains highest priority.
2. Legacy renderer: `NEXT_PUBLIC_UNITY_WEBGL_URL` only when the generic stream URL is absent.
3. Default renderer: internal R3F digital twin when implemented/enabled and WebGL is available.
4. Fallback renderer: existing CSS/canvas virtual CCTV when R3F is disabled, unavailable, or WebGL fails.

Photorealistic rendering remains required for future R3F stages. Stage 0 records direction only; runtime evidence must come from actual browser-rendered R3F screenshots in later stages, not from Image Gen references or archived Unreal proof.

## Stage 4 Asset Pipeline Evidence

Stage 4 adds the photorealism-ready asset kit only. It does not change the Stage 2/3 `SimulationFrameSnapshot` truth boundary or the procedural renderer handoff.

Asset contract:

- Manifest: `apps/web/public/simulation/r3f/assets/manifest.json`
- Typed helper: `apps/web/components/r3f/assetManifest.ts`
- Verifier: `scripts/verify-r3f-assets.mjs`
- Runtime GLBs: `apps/web/public/simulation/r3f/assets/glb/`
- Runtime textures and decals: `apps/web/public/simulation/r3f/assets/textures/`

Every manifest entry records a stable ID, runtime path, kind, source, license, meter units, PBR flag, LOD, maximum texture size, maximum triangle budget, and maximum file-size budget. The verifier fails on invalid JSON, missing files, paths outside `/simulation/r3f/assets/`, archive paths, missing source/license fields, budget violations, non-power-of-two texture dimensions without an explicit exception, missing lower-detail vehicle options, near/hero assets without `pbr=true`, and placeholder-style names.

## Stage 4 GLB Sources And Optimization

The Stage 4 GLBs are project-authored primitive assets generated locally for this repository. No external downloads, purchases, stock models, or archived Unreal assets were used.

The GLB kit includes:

- Passenger car near, medium, and far LODs
- Taxi near and far LODs
- Bus near and far LODs
- Truck near and far LODs
- Emergency ambulance near and medium LODs
- Traffic signal pole, traffic signal heads, streetlight, tree cluster, and curb details

All GLBs are meter-scale, y-up, GLB 2.0 assets with embedded binary buffers and no external URIs. They were optimized with glTF Transform using meshopt compression. Current Drei `useGLTF` includes a Meshopt decoder path; any future raw `GLTFLoader` path must set a Meshopt decoder before loading these compressed assets.

The verifier parses concrete GLB files and checks file size, GLB header/version/declared length, triangle counts from mesh accessors, and embedded image dimensions when present. Current Stage 4 GLBs have no embedded images; material color/PBR metadata is authored in the GLB materials, while runtime texture maps are delivered separately.

## Stage 4 Texture And Decal Provenance

The runtime texture/decal maps are project-authored procedural assets generated locally with the repo-installed `sharp` package. The provenance note is stored at `apps/web/public/simulation/r3f/assets/textures/PROVENANCE.md`.

Runtime maps:

- `wet_asphalt_albedo.webp`
- `wet_asphalt_roughness.webp`
- `worn_lane_markings.png`
- `crosswalk_wear.png`
- `curb_grime.png`
- `sidewalk_paver_variation.webp`
- `facade_window_emissive.webp`

These files are runtime material/decal assets, not browser-rendering proof. Image Gen remains allowed as future source/target material direction, but Image Gen output by itself is not runtime evidence. Runtime proof for photoreal rendering must come from actual browser screenshots of the `/dashboard` R3F renderer in later stages.

KTX2/BasisU is intentionally not used in Stage 4 because the Next/R3F decoder path has not been separately verified for those texture formats.
