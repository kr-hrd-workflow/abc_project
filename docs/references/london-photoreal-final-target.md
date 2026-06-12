# London photoreal final target

Reference artifact: `docs/references/assets/london-photoreal-final-target.png`

User acceptance target: implement the Unreal London renderer to follow this visual as closely as possible.

## Required visible traits

- Elevated oblique corner camera, wide 16:9, road/intersection fills foreground and midground.
- Wet overcast London morning mood: dark asphalt, rain sheen, visible reflections, soft fog/depth.
- Central yellow box junction with worn thermoplastic lines.
- Red bus lane along the left/near approach.
- Foreground bicycle box/green cycle lane marking.
- Black UK signal heads and slim poles, several visible in foreground/midground.
- Pedestrian guard railings in the foreground corners.
- Double yellow curb markings and curb stones.
- Brick/stone London building frontage, repeated windows, shopfront depth.
- Streetlights/CCTV/utility details; no crowd and no vehicle-dominated frame.

## Known implementation boundary

This repo currently uses legal project-owned procedural assets and ambientCG CC0 material sources. The target image is an AI-generated visual goal. The Unreal implementation should converge toward it with replaceable assets, camera, lighting, materials, and verifier gates, but it is not yet a licensed AAA scanned-asset scene.


Latest target-match comparison: `docs/references/assets/unreal-london-final-target-match-comparison.png`
