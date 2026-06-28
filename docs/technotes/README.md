# SmartIntersection Technotes

This folder is the evidence shelf for SmartIntersection renderer and simulator work. Keep finished notes short, factual, and tied to committed artifacts, generated screenshots, verifier output, and known runtime boundaries.

## Current Notes

- [Complete Simulation Renderer Stage Evidence](complete-simulation-renderer-stage.md)
- [Commercial Photoreal Asset Fidelity Pass Evidence](commercial-photoreal-asset-fidelity-pass.md)
- [Poly Haven CC0 Licensed Asset Integration](polyhaven-cc0-licensed-asset-integration.md)
- [Unreal Asset-Backed CCTV Pass Evidence](unreal-assetbacked-cctv-pass.md)
- [Unreal Cinematic Final Pass Evidence](unreal-cinematic-final-pass.md)
- [SUMO-Ready Operator Map Stage 1-3 Evidence Seed](sumo-ready-operator-map-stage1-3-evidence.md)
- [Generated Screenshot Archive](generated-screenshot-archive.md)
- [Gangnam AI-Plate → Photoreal 3D Pivot](gangnam-plate-to-photoreal-3d-pivot.md)
- [Gangnam Photoreal Structure-Preserving Generation Pipeline](gangnam-photoreal-generation-pipeline.md)

## Asset Folders

- `assets/smart-intersection-generated-screenshots/` - flat archive of generated screenshots copied from `artifacts/` for future writing.
- `assets/unreal-complete-simulation-renderer-screenshots/` - final complete-renderer stage screenshots.
- `assets/unreal-commercial-photoreal-screenshots/` - commercial procedural fidelity pass screenshots.
- `assets/unreal-polyhaven-cc0-screenshots/` - Poly Haven CC0 integration proof screenshots.
- `assets/unreal-cinematic-final-screenshots/` - cinematic final pass screenshots.
- `assets/unreal-final-assetbacked-screenshots/` - Blender/FBX asset-backed final screenshots.

## Writing Rules

- Prefer evidence paths over prose claims.
- Mark screenshots as `final proof`, `operator proof`, `reference-only`, `diagnostic`, or `exploratory`.
- Keep runtime truth honest: SUMO/TraCI is traffic truth, FastAPI orchestrates, Unreal renders.
- Do not describe a static screenshot as live SUMO movement, real controller integration, or Pixel Streaming proof unless that path was actually exercised.
- When a note depends on a generated artifact, link the committed artifact and name the verifier command that checked it.

## Reusable Template

Start new notes from [templates/technote-template.md](templates/technote-template.md).
