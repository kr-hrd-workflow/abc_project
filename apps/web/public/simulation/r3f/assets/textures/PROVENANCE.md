# R3F Texture and Sprite Provenance

## Stage 6 Weather/Material Source Atlas

Generated with the built-in ImageGen tool on 2026-06-19 and copied into the
project by the primary agent:

- Runtime/source path: `apps/web/public/simulation/r3f/assets/sprites/stage6-weather-material-source-atlas.png`
- Built-in ImageGen original: `C:\Users\100ri\.codex\generated_images\019edd58-c84a-7cb1-9a2f-f7a69157fd98\ig_0bba982a5dc6403f016a3493590b6c81918b343d03996e4806.png`
- Generation mode: built-in `image_gen`
- Asset role: Stage 6 runtime/source atlas for wet-road, weather, spray, pedestrian silhouette, billboard, sign, and guardrail sprite or mask cells.
- Runtime usage: sampled directly by the Stage 6 renderer via named UV cells for wet asphalt, rain-reflective road, puddles, lane/crosswalk wear, billboard panels, road signs, guardrails, rain streaks, splash puffs, and wheel spray.
- Dimensions: 1254x1254 PNG, intentionally non-power-of-two as copied from ImageGen output. The renderer clamps named atlas cells and disables mipmap generation to avoid NPOT repeat artifacts.
- License/authorship: project-authored generated source atlas; no external downloads, stock packs, third-party assets, logos, text, or watermarks.

Prompt summary: 4x4 atlas with wet asphalt, worn lane/crosswalk, puddle masks,
rain streaks, splash puffs, wheel spray, billboard panels without brands,
pedestrian silhouettes, road signs/guardrail decals; no logos/text/watermarks.

This atlas is runtime source material, not standalone proof. Runtime proof comes
from browser-rendered `/dashboard` R3F screenshots showing the sampled cells in
the scene.

## Ambient Pedestrian Commuter Atlas

Generated with the built-in ImageGen tool on 2026-07-06 and copied into the
project by the primary agent:

- Runtime/source path: `apps/web/public/simulation/r3f/assets/sprites/pedestrian-commuter-atlas.png`
- Built-in ImageGen original: `C:\Users\100ri\.codex\generated_images\019f35cf-a322-71a1-964f-3cdd305c7a6c\ig_04c80e2eb64a0316016a4b49fca3e081918a8396253a075ff2.png`
- Generation mode: built-in `image_gen`
- Asset role: runtime alpha sprite atlas for ambient sidewalk pedestrians in the R3F dashboard scene.
- Runtime usage: sampled by `AmbientPedestrianLayer` through fixed UV cells as 3D-positioned sprite impostors for sidewalk/background pedestrian visual context only.
- Truth boundary: these sprites are never SUMO pedestrian truth, TraCI truth, detector truth, CCTV truth, or signal-control input. Runtime telemetry labels them as `ambient_background_proxy`.
- Processing: repo-installed `sharp` converted the solid green chroma background into alpha and applied a small despill pass before copying the PNG into the runtime sprite directory.
- Dimensions: 1254x1254 PNG with alpha, intentionally non-power-of-two as generated. The renderer clamps fixed atlas cells and does not tile or repeat it as a material.
- License/authorship: project-authored generated runtime sprite atlas; no external downloads, stock packs, third-party assets, logos, text, or watermarks.

Prompt summary: 4x2 atlas of eight photoreal Seoul/Gangnam commuter
pedestrians on solid green chroma background; neutral clothing, no logos, no
text, no watermarks.

This atlas is runtime source material, not standalone proof. Runtime proof comes
from browser-rendered `/dashboard` R3F screenshots showing the sampled sprite
impostors in the scene.

## Stage 4.1 Texture Provenance

Generated locally for the R3F dashboard asset pipeline on 2026-06-17 with the repo-installed `sharp` package and deterministic project-authored procedural routines.

The runtime maps are concrete repo assets authored from seeded noise, geometric masks, erosion masks, paver/window grids, and hand-defined decal sheet layout rules. No external downloads, purchases, stock assets, or third-party texture sources were used.

Image Gen was used only for non-runtime material direction. Prompt summary: a seven-swatch realistic material board for wet urban asphalt, grayscale puddle roughness variation, cracked worn lane markings, eroded crosswalk paint, dirty chipped curb concrete, stained sidewalk pavers, and varied warm/cool facade window emissive panes. The generated reference was not copied into the runtime asset directory and is not runtime proof.

Runtime proof comes later from browser-rendered `/dashboard` R3F screenshots, not from Image Gen output or this provenance note.

The asset manifest is the authoritative runtime record for each shipped texture
or decal/sprite. Every generated entry must name its PBR channel coverage,
texture budget, compression status, license/authorship, runtime usage, and this
provenance evidence path before `npm run verify:r3f-assets` can pass.

Seed: `0x7419d2ab`

Runtime maps:
- `wet_asphalt_albedo.webp`: cool dark asphalt albedo with aggregate speckle, tar streaks, oil stain patches, and nonrepeating large patch variation.
- `wet_asphalt_roughness.webp`: grayscale roughness map with low-roughness puddle islands, tar/oil streaks, higher-roughness aggregate grit, and vehicle-track scuff variation.
- `worn_lane_markings.png`: transparent decal sheet with cracked white/yellow paint, tire scuffs, eroded edges, alpha breakup, stop-bar fragments, and arrow marking wear.
- `crosswalk_wear.png`: transparent crosswalk decal sheet with eroded zebra bars, vehicle-worn crossing bands, edge chipping, crack lines, and nonuniform opacity.
- `curb_grime.png`: transparent curb grime strip with road-contact dirt buildup, vertical runoff drips, seam grime, and chipped lower-edge variation.
- `sidewalk_paver_variation.webp`: paver material variation with offset slab seams, concrete mottling, stains, and small cracks.
- `facade_window_emissive.webp`: facade/window emissive sheet with dark mullions, varied warm/cool lit panes, unlit panes, and subtle blind-line variation.

Compression status:
- WebP material sheets ship as runtime WebP assets.
- PNG decal sheets keep alpha transparency and are budgeted as `png-alpha-runtime`.
- KTX2/BasisU remains future tooling until the decoder path and encoder are approved and verified.
