# Dashboard Concept Notes

Approved concept path: `docs/design/assets/dashboard-concept-approved.png`

Approved visual direction:

- Glassy translucent panel UI with an Apple-style premium feel, without Apple branding or copied proprietary assets.
- Calm civic operations dashboard, not a marketing page.
- Soft light/graphite base, frosted panels, hairline borders, restrained teal/green accents, amber warnings, and red only for emergency or safety states.
- Avoid neon cyberpunk styling, gradient orbs, bokeh decoration, oversized hero typography, and decorative stock backgrounds.

Required information architecture:

- Top system bar
- Korean/English language selector
- Central digital twin / simulation viewport
- Event timeline
- Recommendation / AI Agent panel
- Metrics panel
- Chat/report panel
- Recommendation and simulation-only safety boundary

Implementation constraints:

- Use code-native text and controls.
- Use a lightweight frontend dictionary for Korean and English labels in Phase 1.
- Keep backend API identifiers stable and localize labels in the frontend.
- Do not copy the old mockup literally.
- Keep the UI operations-first, not a landing page.
- Preserve the approved Phase 1 API contracts.
- Treat the central digital twin as a replaceable simulation viewport, so Phase 2 can swap in real SUMO/TraCI or another simulation renderer without rewriting the surrounding dashboard.
