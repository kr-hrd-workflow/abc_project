<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Locked rendering decisions — do not "fix" these

- **The default scene is the photobash composition: metric marking DECALS
  (`MarkingDecalLayer`), NOT the flat vector markings, and NOT an imagegen
  plate.** The monolithic-plate approach (`?photoreal=1`, v5/roadlock plates)
  was retired 2026-07-02 (spec:
  `docs/superpowers/specs/2026-07-02-r3f-default-scene-completion-design.md`).
  Vehicles ride the RAW metric lane grid (identity calibration — plate-era
  per-approach offsets and the median-bus pin were compensations for off-metric
  plates and were deleted with them). If vehicles look offset from lanes, fix
  geometry/decals — do NOT reintroduce per-approach calibration tables.
