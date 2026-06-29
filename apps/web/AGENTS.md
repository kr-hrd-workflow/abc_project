<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Locked rendering decisions — do not "fix" these

- **Photoreal plate default is `v5`, with the R3F lane-markings overlay OFF for it.**
  `?photoreal=1` renders the cover-v5 road-lock plate using the plate's own baked
  lanes. Do NOT enable the R3F markings overlay (`RoadSurfaceLayer`) for v5: v5's
  baked lanes are offset from the metric projection, so overlaying the metric R3F
  lanes **doubles** them (render-verified 2026-06-30). This was attempted once and
  reverted. The geometry-locked `roadlock` plate is the escape hatch
  (`?photoreal=1&plate=roadlock`) and it *does* get the overlay. The contract is
  pinned by the guardrail tests in
  `components/r3f/SimulationScenePhotoreal.test.tsx` — if you think v5 should draw
  the R3F lanes, stop and raise it with the human first.
