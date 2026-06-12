# Unreal Cinematic Final Pass Evidence

Final proof screenshots for the UE 5.7 cinematic CCTV simulation-renderer pass.

## Scope

- Kept the Unreal project categorized as **Simulation**, not a game.
- Used Unreal Editor Python for deterministic map generation/import/lighting/post-process setup.
- Used Blender Python to generate/import local FBX proxy assets.
- Added cinematic map dressing:
  - wet-road reflection/decal FBX kit
  - PostProcessVolume film grade
  - SkyAtmosphere
  - ExponentialHeightFog urban haze
  - tuned camera filmback/lens/exposure
  - brighter cinematic key/skylight/street-light balance

## Final screenshots

- Seoul: `docs/technotes/assets/unreal-cinematic-final-screenshots/unreal-seoul-cinematic-final.png`
- New York: `docs/technotes/assets/unreal-cinematic-final-screenshots/unreal-new_york-cinematic-final.png`
- Paris: `docs/technotes/assets/unreal-cinematic-final-screenshots/unreal-paris-cinematic-final.png`
- London: `docs/technotes/assets/unreal-cinematic-final-screenshots/unreal-london-cinematic-final.png`

## Unreal implementation language

This stage is intentionally **Unreal Editor Python automation**, not Unreal C++ gameplay code. Python is used to generate/import editor assets and maps. Future live simulator behavior should move to Unreal C++/Blueprint when runtime SUMO/TraCI, Pixel Streaming input, or packaged simulation controls are needed.

## Verification notes

- Each map was regenerated from the city profile.
- Each map was checked for `/Game/PhotorealKit` references.
- Each map was checked for cinematic actor tokens such as `PostProcess`, `Fog`, and `SkyAtmosphere`/`Atmosphere`.
- Full project verification passed after reverting Unreal auto-generated config noise.
