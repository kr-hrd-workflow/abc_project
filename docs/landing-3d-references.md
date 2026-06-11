# Landing 3D Reference Notes

Date: 2026-06-11

## Design read

Smart-intersection landing for technical and public-sector buyers. The direction is cinematic infrastructure, spatial operations, and digital-twin depth. The page should feel more like an operator-grade 3D scene than a generic SaaS hero.

## Reference families used

The live web search backend returned HTTP 429 during this pass, so the implementation used known canonical reference families and direct public reference URLs instead of relying on search snippets.

### 1. Spline-style spatial product marketing

- URL: https://spline.design/
- Useful pattern: layered 3D object as a marketing proof point without requiring a full Three.js runtime in the landing page.
- Applied as: CSS-only stacked roadway planes in the hero, with perspective and subtle drift.

### 2. Three.js/WebGL scene vocabulary

- URL: https://threejs.org/examples/
- Useful pattern: camera perspective, transform depth, scene layers, and objects that read as spatial rather than flat overlays.
- Applied as: `perspective`, `transform-style: preserve-3d`, `translateZ`, tilted route planes, and foreground evidence card.

### 3. Unreal Engine photoreal renderer direction

- URL: https://www.unrealengine.com/en-US/features
- Useful pattern: dark cinematic lighting, aerial realism, and route overlays as a believable simulation surface.
- Applied as: darker aerial hero treatment and depth objects that align with the later Pixel Streaming/UE renderer direction.

### 4. CesiumJS geospatial digital twin language

- URL: https://cesium.com/platform/cesiumjs/
- Useful pattern: geospatial/urban scenes with camera perspective and operational overlays.
- Applied as: digital-twin framing, tilted map surface, and reviewable evidence layers.

### 5. NVIDIA Omniverse / simulation-control visual language

- URL: https://www.nvidia.com/en-us/omniverse/
- Useful pattern: simulation tooling should show layers, scene composition, and real-time system context.
- Applied as: assembly rings, route layers, and an operator brief card floating over the scene.

### 6. Mapbox 3D maps / urban visualization language

- URL: https://www.mapbox.com/
- Useful pattern: roads and urban maps gain depth through tilt, route highlighting, and data overlays.
- Applied as: teal/amber route planes and a grid surface over the aerial map.

### 7. ArcGIS Urban / planning review language

- URL: https://www.esri.com/en-us/arcgis/products/arcgis-urban/overview
- Useful pattern: planning tools communicate decisions by showing scenario layers, not just final answers.
- Applied as: persistent assembly object with separate pressure, current route, candidate route, and evidence layers.

## Implementation choices

- Avoided adding a heavy runtime 3D dependency for the landing pass.
- Used CSS 3D instead: faster, easier to test, lower risk for LCP/INP.
- Kept the existing real aerial image asset as the hero base so the opening scene still matches the smart-intersection product.
- Generated section-specific imagery for non-hero sections so the page no longer repeats the hero image across every visual slot.
- Added testable DOM markers so the stronger 3D contract does not regress silently:
  - `data-landing-depth-scene="hero-3d"`
  - five `data-depth-plane` elements
  - three `data-assembly-depth-ring` elements
  - four `data-section-asset` markers

## Generated asset map

The main hero image remains preserved. The following generated assets are section-specific:

```text
apps/web/public/landing/signal-overview-3d.png
apps/web/public/landing/signal-assembly-layers.png
apps/web/public/landing/operator-proof-room.png
apps/web/public/landing/final-cta-city.png
```

Prompts used:

1. `signal-overview-3d.png`: oblique 3D city intersection at night with teal sensor-pressure fields and amber candidate timing paths, photoreal Unreal-style digital twin, no text or logos.
2. `signal-assembly-layers.png`: circular layered 3D intersection model with base road, pressure layer, teal current route, amber alternative route, and floating evidence layer, no text or logos.
3. `operator-proof-room.png`: realistic traffic operations review room with a digital twin intersection wall display, calm municipal control center mood, no readable text or logos.
4. `final-cta-city.png`: atmospheric urban intersection transitioning from simulation to reviewed decision, teal route light and amber signal glow, no text or logos.

## Follow-up ideas

When the Unreal install is complete, replace or augment this CSS-only treatment with a captured Pixel Streaming still or a lightweight generated hero render. Until then, this gives the landing page a stronger 3D/digital-twin feel without blocking on UE installation.
