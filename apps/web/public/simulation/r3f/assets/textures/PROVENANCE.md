# Stage 4.1 Texture Provenance

Generated locally for the R3F dashboard asset pipeline on 2026-06-17 with the repo-installed `sharp` package and deterministic project-authored procedural routines.

The runtime maps are concrete repo assets authored from seeded noise, geometric masks, erosion masks, paver/window grids, and hand-defined decal sheet layout rules. No external downloads, purchases, stock assets, or third-party texture sources were used.

Image Gen was used only for non-runtime material direction. Prompt summary: a seven-swatch realistic material board for wet urban asphalt, grayscale puddle roughness variation, cracked worn lane markings, eroded crosswalk paint, dirty chipped curb concrete, stained sidewalk pavers, and varied warm/cool facade window emissive panes. The generated reference was not copied into the runtime asset directory and is not runtime proof.

Runtime proof comes later from browser-rendered `/dashboard` R3F screenshots, not from Image Gen output or this provenance note.

Seed: `0x7419d2ab`

Runtime maps:
- `wet_asphalt_albedo.webp`: cool dark asphalt albedo with aggregate speckle, tar streaks, oil stain patches, and nonrepeating large patch variation.
- `wet_asphalt_roughness.webp`: grayscale roughness map with low-roughness puddle islands, tar/oil streaks, higher-roughness aggregate grit, and vehicle-track scuff variation.
- `worn_lane_markings.png`: transparent decal sheet with cracked white/yellow paint, tire scuffs, eroded edges, alpha breakup, stop-bar fragments, and arrow marking wear.
- `crosswalk_wear.png`: transparent crosswalk decal sheet with eroded zebra bars, vehicle-worn crossing bands, edge chipping, crack lines, and nonuniform opacity.
- `curb_grime.png`: transparent curb grime strip with road-contact dirt buildup, vertical runoff drips, seam grime, and chipped lower-edge variation.
- `sidewalk_paver_variation.webp`: paver material variation with offset slab seams, concrete mottling, stains, and small cracks.
- `facade_window_emissive.webp`: facade/window emissive sheet with dark mullions, varied warm/cool lit panes, unlit panes, and subtle blind-line variation.
