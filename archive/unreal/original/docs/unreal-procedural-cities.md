# Unreal procedural city intersections

This folder now supports source-controlled city profiles for generating Unreal Engine intersection blockouts that can later be upgraded with marketplace, Quixel, or custom photoreal assets.

## Goal

Create distinct simulation-only intersection scenes for:

- Seoul
- New York
- Paris
- London

The profiles encode visual direction and procedural parameters. SUMO/TraCI remains the traffic truth source; Unreal is the photoreal presentation layer streamed into the dashboard through Pixel Streaming.

## File map

- `renderer/unreal/SmartIntersection/SceneProfiles/city-profile.schema.json`
- `renderer/unreal/SmartIntersection/SceneProfiles/cities/seoul.json`
- `renderer/unreal/SmartIntersection/SceneProfiles/cities/new_york.json`
- `renderer/unreal/SmartIntersection/SceneProfiles/cities/paris.json`
- `renderer/unreal/SmartIntersection/SceneProfiles/cities/london.json`
- `renderer/unreal/SmartIntersection/Content/Python/generate_city_scene.py`
- `scripts/generate-unreal-city.ps1`

## Lightweight checks, no Unreal runtime

```bash
python3 -m json.tool renderer/unreal/SmartIntersection/SmartIntersection.uproject >/dev/null
for f in renderer/unreal/SmartIntersection/SceneProfiles/cities/*.json; do python3 -m json.tool "$f" >/dev/null; done
python3 -m py_compile renderer/unreal/SmartIntersection/Content/Python/generate_city_scene.py
npm run unreal:generate-city:dry-run
```

## Generate a city map

Run from the repo root on the Windows/WSL machine with Unreal Engine installed:

```bash
npm run unreal:generate:seoul
npm run unreal:generate:new-york
npm run unreal:generate:paris
npm run unreal:generate:london
```

Each command launches Unreal Editor in unattended Python mode and writes a generated map under:

```text
/Game/Maps/Generated/<city_id>_Intersection
```

## City visual contracts

- **Seoul**: dense modern arterial, Korean/English wayfinding, red bus-lane accent, wide zebra crossings, overhead signal bars, wet dusk CCTV mood.
- **New York**: Manhattan-style grid, bold white stop bars, green bike-lane panels, clustered pole signage, brick and stone facades, overcast canyon mood.
- **Paris**: European boulevard, compact pole signals, cream Haussmann-inspired facades, dark street furniture, soft overcast 50mm mood.
- **London**: left-hand traffic, yellow box junction language, black signal poles, red bus-lane strip, brick/stone streetscape, after-rain overcast mood.

## Safety boundary

These scenes are simulation-only/operator decision-support visuals. They do not connect to real traffic-signal controllers.

## Next development steps

1. Run the four generation commands after Unreal is available.
2. Open each generated map in Unreal Editor and replace blockout primitives with curated assets.
3. Add CCTV camera presets per city and set one generated map as the default startup map.
4. Re-run Pixel Streaming and verify the dashboard iframe.
5. Capture city-by-city screenshots for review.
