# Poly Haven CC0 Licensed Asset Integration

## Scope

The project is a non-commercial test project, but the committed asset set is still restricted to legally downloadable assets. This pass integrates real downloaded **Poly Haven CC0** assets instead of scraped or paid Marketplace/Fab content.

## Asset source

Provider: Poly Haven

- Site: https://polyhaven.com
- API: https://api.polyhaven.com
- License: CC0-1.0
- License page: https://polyhaven.com/license

Audit manifest:

- `renderer/unreal/SmartIntersection/SourceAssets/ExternalLicensedKit/PolyHavenCC0/polyhaven_cc0_manifest.json`

The manifest records:

- source asset id,
- source URL,
- API URL,
- role in scene,
- resolution,
- license,
- downloaded file paths,
- file sizes,
- md5 checksums.

## Downloaded CC0 assets

Models:

- `concrete_road_barrier` — road/incident barriers.
- `fire_hydrant` — sidewalk emergency/utility prop.
- `street_lamp_01` — real street lamp geometry.
- `metal_trash_can` — sidewalk prop/detail.
- `water_manhole_cover` — road surface utility cover.
- `modular_street_seating` — sidewalk seating/bench detail.

Textures:

- `asphalt_02` — asphalt material source.
- `brick_pavement` — pavement/sidewalk material source.
- `concrete_tile_facade` — building facade material source.

Downloaded footprint:

- Assets: 9
- Files: 61
- Bytes: 80,202,857
- Resolution target: mostly 1k, to keep the repo manageable.

## Unreal integration

Source path:

- `renderer/unreal/SmartIntersection/SourceAssets/ExternalLicensedKit/PolyHavenCC0/`

Unreal import path:

- `/Game/ExternalLicensedKit/PolyHavenCC0/Models/...`

Generator functions added:

- `import_polyhaven_cc0_models(...)`
- `spawn_polyhaven_cc0_city_pass(...)`

Scene placements added:

- concrete road barriers near work/incident zones,
- street lamps on sidewalks,
- fire hydrants near corners,
- modular street seating,
- metal trash cans,
- water manhole covers replacing key procedural covers.

## Verification

Commands passed:

```text
python3 scripts/verify-polyhaven-cc0-assets.py
python3 scripts/verify-commercial-photoreal-assets.py
python3 scripts/verify-complete-simulation-renderer.py
npm run verify
```

Generated map sizes after integration:

- Seoul: `1206026` bytes
- New York: `1278314` bytes
- Paris: `1295337` bytes
- London: `1337436` bytes

Screenshot proof:

- `docs/technotes/assets/unreal-polyhaven-cc0-screenshots/`

## Important note

Because the requested project is non-commercial, these CC0 assets are safe for testing and remain safe even if the project later becomes commercial. Paid Marketplace/Fab assets can be added only if the user signs in through the official launcher/plugin flow and the license allows repository storage or local machine use. This repo now has a clean seam for such assets under `/Game/ExternalLicensedKit/...`.
