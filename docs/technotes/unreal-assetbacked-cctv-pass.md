# Unreal Asset-Backed CCTV Pass Evidence

Final proof screenshots for the Blender/FBX asset-backed Unreal city pass.

## Scope

- Installed/generated local asset pipeline support with Blender + Python `trimesh` environment.
- Generated FBX proxy assets under `renderer/unreal/SmartIntersection/SourceAssets/PhotorealKit/`.
- Imported those assets into Unreal under `/Game/PhotorealKit`.
- Regenerated Seoul, New York, Paris, and London maps so they reference imported vehicle/CCTV/signal/tree/bollard meshes instead of only primitive blockout actors.

## Final screenshots

- Seoul: `docs/technotes/assets/unreal-final-assetbacked-screenshots/unreal-seoul-assetbacked-final.png`
- New York: `docs/technotes/assets/unreal-final-assetbacked-screenshots/unreal-new_york-assetbacked-final.png`
- Paris: `docs/technotes/assets/unreal-final-assetbacked-screenshots/unreal-paris-assetbacked-final.png`
- London: `docs/technotes/assets/unreal-final-assetbacked-screenshots/unreal-london-assetbacked-final.png`

## Verification notes

- Final screenshots are intentionally the only archived proof images for this stage.
- Intermediate captures were not preserved in the technote archive.
- Each generated `.umap` was checked for `/Game/PhotorealKit` references.
- Full project verification passed with `npm run verify` after reverting Unreal auto-generated config noise.
