# Generated Screenshot Archive

This note indexes the bulk screenshot archive created for future SmartIntersection technical notes.

## Archive

- Folder: `docs/technotes/assets/smart-intersection-generated-screenshots/`
- Manifest: `docs/technotes/assets/smart-intersection-generated-screenshots/manifest.json`
- Source root: `artifacts/`
- Capture date: `2026-06-15`

The archive is intentionally broad. It includes final proof images, operator-map stage evidence, Image Gen references, dashboard screenshots, Pixel Streaming experiments, diagnostic captures, retakes, and exploratory renderer images.

## Use Carefully

Not every image in this archive is final-quality evidence. Several filenames explicitly indicate diagnostic or exploratory work, such as `debug-*`, `diagnostic-*`, `fresh-*`, `retake-*`, and intermediate `dashboard-unreal-*` captures.

For polished technotes, prefer:

- `unreal-operator-map-stage1-proof.png`
- `unreal-operator-map-stage2-proof.png`
- `unreal-operator-map-stage3-proof.png`
- `sumo-ready-operator-map-stage1-reference.png`
- `sumo-ready-operator-map-stage2-context-reference.png`
- `sumo-ready-operator-map-stage3-asset-reference.png`
- `unreal-road-only-*-final-visible.png`
- `dashboard-*-desktop.png` and `dashboard-*-mobile.png` only when discussing dashboard UI passes

## Archive Categories

The manifest assigns coarse categories from filenames:

- `operator_map_stage` - SUMO-ready operator-map stage references and proofs.
- `dashboard` - dashboard/UI/Pixel Streaming screenshot work.
- `road_only_renderer` - road-only and city renderer captures.
- `photoreal_renderer` - photoreal, commercial, asset-backed, or London target captures.
- `diagnostic` - debug, diagnostic, fresh, retake, or probe captures.
- `landing` - landing-section generated visuals.
- `other` - images that do not fit a stable category yet.

## Future Technote Candidates

- Operator Map Stage 1-3: why the staged plan moved from traffic-readable geometry to city asset kits.
- Screenshot Quality Regression: why DOM/build checks are not enough for visual work.
- Renderer Evidence Taxonomy: final proof vs reference-only vs diagnostic captures.
- Pixel Streaming Evidence Path: which dashboard screenshots show integration progress and which remain only UI scaffolding.
