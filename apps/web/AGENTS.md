<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Locked rendering decisions — do not "fix" these

- **The photoreal plate branch is retired.** The dashboard renderer uses the
  default `photobash-scene`; `?photoreal=1` must remain a no-op alias that does
  not mount `PhotorealPlate`. Do not restore `BackgroundPlateLayer`,
  `PhotorealPlate`, or the plate camera/proxy/manifest calibration stack unless
  the human explicitly reopens that renderer direction. The current contract is
  pinned by `components/r3f/SimulationScene.test.tsx`.
