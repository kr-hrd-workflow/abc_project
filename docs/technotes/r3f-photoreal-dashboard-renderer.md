# R3F Photoreal Dashboard Renderer

## Decision

R3F is the active dashboard renderer path for this implementation plan; Stage 0 records the selected direction and does not mean the R3F runtime is already implemented or enabled.

Unreal/Pixel Streaming remains archived.

SUMO/TraCI/Tarcl is simulation truth.

The browser renderer can interpolate received state but cannot invent traffic truth.

Image Gen references are visual targets, not runtime evidence.

## Renderer Boundary

Stage 0 records the selected renderer path; it does not mean the R3F runtime is already implemented or enabled.

Renderer precedence for the `/dashboard` simulation viewport:

1. External renderer: `NEXT_PUBLIC_SIMULATION_STREAM_URL` iframe remains highest priority.
2. Legacy renderer: `NEXT_PUBLIC_UNITY_WEBGL_URL` only when the generic stream URL is absent.
3. Default renderer: internal R3F digital twin when implemented/enabled and WebGL is available.
4. Fallback renderer: existing CSS/canvas virtual CCTV when R3F is disabled, unavailable, or WebGL fails.

Photorealistic rendering remains required for future R3F stages. Stage 0 records direction only; runtime evidence must come from actual browser-rendered R3F screenshots in later stages, not from Image Gen references or archived Unreal proof.
