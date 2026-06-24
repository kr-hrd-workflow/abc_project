# R3F Public Asset Candidates

Research date: 2026-06-24

Scope: public candidate research for future R3F Seoul realism work. This document began as read-only research; the user later approved downloading and integrating `Outdoor Table Chair Set 01` on 2026-06-24, and that asset is now the selected first public GLB integration.

## Approved Integration

- Selected asset: `Outdoor Table Chair Set 01`
- Source: https://polyhaven.com/a/outdoor_table_chair_set_01
- License: CC0, documented at https://polyhaven.com/license
- Author/source: James Ray Cock / Poly Haven
- Runtime integration path: `apps/web/public/simulation/r3f/assets/glb/props/outdoor_table_chair_set_01.glb`
- Manifest ID: `props/outdoor_table_chair_set_01`
- Integration note: the 1K glTF package was downloaded after explicit user approval, converted to a single GLB with `gltf-transform copy`, recorded in `apps/web/public/simulation/r3f/assets/manifest.json`, and documented in `docs/compliance/r3f-asset-licenses.md`.

## Acceptance Boundary

- Prefer existing project-authored GLBs first.
- Allowed public licenses for future approval: CC0 preferred; CC-BY acceptable only with attribution in manifest, provenance, and compliance docs.
- Reject unclear license, personal-use-only, editorial-only, real brands/logos, no redistribution rights, budget/provenance failures, or source pages that cannot be verified.
- Every additional third-party download/integration still requires explicit user approval before asset acquisition.

## Sources Inspected

- Poly Haven license: https://polyhaven.com/license
- Poly Haven public API docs/source pages through asset pages and metadata endpoints:
  - https://polyhaven.com/a/concrete_road_barrier
  - https://polyhaven.com/a/modular_street_seating
  - https://polyhaven.com/a/outdoor_table_chair_set_01
  - https://polyhaven.com/a/modular_chainlink_fence
  - https://polyhaven.com/a/fire_hydrant
  - https://polyhaven.com/a/modular_electricity_poles
  - API metadata checked with `https://api.polyhaven.com/info/{assetId}` and `https://api.polyhaven.com/files/{assetId}` using metadata only.
- Poly Pizza / Quaternius:
  - https://poly.pizza/bundle/Ultimate-Modular-Men-Pack-ZiH8muWqwQ
  - https://poly.pizza/bundle/Animated-Men-Pack-DAC9SDgMQT
  - https://poly.pizza/bundle/Ultimate-Modular-Women-Pack-aCBDXDdTNN
- Sketchfab:
  - https://sketchfab.com/3d-models/traffic-lights-street-assets-vol-02-ab3efdd259a54d4aba5f878eacbe3f20
  - https://sketchfab.com/3d-models/barrier-traffic-cone-pack-23c4dfca76a24bf0b21894847867af2a
  - https://sketchfab.com/3d-models/free-city-road-layout-mockup-3260e3fef3434939bc8df94a0a15ead3
  - https://sketchfab.com/3d-models/city-bus-low-poly-v3-6dccb9e281bc46d097df19f6dc9650ac
  - https://sketchfab.com/3d-models/pedestrian-crossing-sign-c8c7210c40624b71bd5f4644fdaa60f3
  - Sketchfab public API metadata checked for selected bot-gated pages with `https://api.sketchfab.com/v3/models/{uid}` using metadata only.
- ambientCG:
  - https://ambientcg.com/
  - https://ambientcg.com/list

## Candidate Table

| Candidate | Source URL | License | Author | Size if available | Intended runtime use | Expected optimization path | Attribution text | Risk notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Concrete Road Barrier | https://polyhaven.com/a/concrete_road_barrier | CC0 | Amal Kumar / Poly Haven | Page default 4K download: 75.83 MB. API 1K glTF package total: 3.75 MB; 2K: 10.97 MB. 81K tris. | Roadside safety barrier, construction divider, or camera-visible traffic-control detail. | If approved, start with 1K glTF, convert to GLB, strip unused maps, resize textures to <=1K unless foreground, simplify or create far LOD, run glTF validation, meshopt/Draco only if approved, update manifest/provenance/compliance. | "Concrete Road Barrier" by Amal Kumar / Poly Haven, CC0. Attribution not required but source should remain in provenance. | Good CC0 source, but not direct GLB on page; Poly Haven provides glTF package. 81K tris may be high for repeated instances. Checker paint may read non-Seoul if overused. |
| Modular Street Seating | https://polyhaven.com/a/modular_street_seating | CC0 | Stuart Attenborrow / Poly Haven | Page default 4K download: 176.91 MB. API 1K glTF package total: 7.62 MB; 2K: 26.43 MB. 25K tris. | Sidewalk seating, transit/plaza furniture, office-street context. | Use only selected modules, 1K glTF source, merge materials where safe, convert to GLB, cap textures, create far impostor or omit from low preset, update provenance. | "Modular Street Seating" by Stuart Attenborrow / Poly Haven, CC0. Attribution not required but source should remain in provenance. | Strong street-context candidate. Large texture set at higher resolutions. Not Seoul-specific, so use as generic urban furniture only. |
| Outdoor Table Chair Set 01 | https://polyhaven.com/a/outdoor_table_chair_set_01 | CC0 | James Ray Cock / Poly Haven | Page default 4K download: 172.87 MB. API 1K glTF package total: 1.24 MB; 2K: 3.20 MB. 10K tris. | Cafe/office-adjacent sidewalk detail near facades; optional human-scale realism prop. | Use 1K glTF, convert to GLB, atlas or retain small material set, generate lower LOD, update provenance and budget metadata. | "Outdoor Table Chair Set 01" by James Ray Cock / Poly Haven, CC0. Attribution not required but source should remain in provenance. | Low 1K payload and useful scale cue. Optional scene dressing; should not displace core traffic/signal work. |
| Modular Chainlink Fence | https://polyhaven.com/a/modular_chainlink_fence | CC0 | James Ray Cock; Amal Kumar for fence wire material / Poly Haven | Page default 4K download: 163.36 MB. API 1K glTF package total: 7.29 MB; 2K: 16.22 MB. 89K tris. | Background industrial boundary, construction perimeter, alley/road edge. | Use a small subset, bake/flatten alpha where possible, convert 1K glTF to GLB, produce simplified far LOD or billboard, verify alpha sorting and draw-call impact. | "Modular Chainlink Fence" by James Ray Cock and Amal Kumar / Poly Haven, CC0. Attribution not required but source should remain in provenance. | Alpha-heavy fence can be expensive/noisy in WebGL. 89K tris and transparency risk make this a second-pass candidate. |
| Fire Hydrant | https://polyhaven.com/a/fire_hydrant | CC0 | Goncalo Felicio / Poly Haven | Page default 4K download: 313.55 MB. API 1K glTF package total: 5.52 MB; 2K: 14.69 MB. 86K tris. | Foreground sidewalk utility prop where a hydrant style is acceptable. | 1K glTF only, decimate/simplify for medium/far, convert to GLB, limit instances, update manifest/provenance/compliance. | "Fire Hydrant" by Goncalo Felicio / Poly Haven, CC0. Attribution not required but source should remain in provenance. | Detailed and urban, but hydrant styling may not match Seoul street furniture. High triangle count for a small prop. |
| Ultimate Modular Men Pack | https://poly.pizza/bundle/Ultimate-Modular-Men-Pack-ZiH8muWqwQ | CC0 | Quaternius | Page says FBX + GLB formats; file size not shown. | Distant pedestrian silhouettes only: business/casual/worker variants for crosswalk or sidewalk background. | Select neutral characters, convert/normalize GLB if needed, remove animations not used, collapse materials, produce billboard/far impostors, never use close-camera photoreal pedestrians. | "Ultimate Modular Men Pack" by Quaternius, CC0. Attribution not required but source should remain in provenance. | Safe license and GLB availability, but low-poly stylized. Not suitable for close pedestrian realism. |
| Animated Men Pack | https://poly.pizza/bundle/Animated-Men-Pack-DAC9SDgMQT | CC0 | Quaternius | Page says FBX + GLB formats; file size not shown. | Distant walking/standing pedestrian silhouettes if runtime animation is later desired. | Use a single neutral model/animation clip, strip unused clips, convert/optimize GLB, texture/material simplification, LOD/billboard fallback. | "Animated Men Pack" by Quaternius, CC0. Attribution not required but source should remain in provenance. | Low-poly and game-stylized. Useful only if silhouettes improve the current pedestrian absence without close inspection. |
| Traffic Lights [Street Assets Vol. 02] | https://sketchfab.com/3d-models/traffic-lights-street-assets-vol-02-ab3efdd259a54d4aba5f878eacbe3f20 | CC-BY | Alt; concept art credited to Won Jun Tae | File size not shown. Page: 3.9K tris, 2K PBR texture; downloadable. | Korean-tagged traffic-light/pedestrian-signal upgrade candidate if existing project-authored signal GLBs are insufficient. | Download only after approval; preserve CC-BY attribution; convert/validate GLB; downsize 2K PBR if needed; compare against project-authored signal heads before integration. | "Traffic Lights [Street Assets Vol. 02]" by Alt, licensed CC-BY; concept art credited to Won Jun Tae; source: Sketchfab URL. Changes must be noted if modified. | CC-BY requires attribution. Concept-art credit adds provenance care. Existing project-authored signals should remain first choice unless this is materially better. |
| Barrier & Traffic Cone Pack | https://sketchfab.com/3d-models/barrier-traffic-cone-pack-23c4dfca76a24bf0b21894847867af2a | CC-BY | Sabri Ayes | File size not shown. Page: 5.1K tris, 2K PBR textures; downloadable. | Traffic cones/barriers/signs for construction or incident context if current props are insufficient. | Download only after approval; convert/validate source to GLB; use selected meshes only; reduce 2K textures where possible; record CC-BY attribution. | "Barrier & Traffic Cone Pack" by Sabri Ayes, licensed CC-BY; source: Sketchfab URL. Changes must be noted if modified. | Unity-oriented pack; page does not explicitly list GLB format. Need download-format confirmation before approval. CC-BY attribution required. |

## Rejected Or Deferred

| Candidate/source | Reason |
| --- | --- |
| Poly Haven Modular Electricity Poles, https://polyhaven.com/a/modular_electricity_poles | CC0 and visually relevant, but page default 4K download is 188.66 MB, API 1K glTF package is 12.42 MB, and model is 201K tris. Too heavy for first-pass web runtime unless heavily split/decimated. Defer. |
| Sketchfab [FREE] City Road Layout Mockup, https://sketchfab.com/3d-models/free-city-road-layout-mockup-3260e3fef3434939bc8df94a0a15ead3 | CC-BY, explicit .glb, 8K tris, but tagged USA/New York/highway/blockout and overlaps procedural road truth-boundary work. Use at most as visual reference; do not integrate as Seoul runtime road geometry. |
| Sketchfab CITY BUS (LOW POLY) V3, https://sketchfab.com/3d-models/city-bus-low-poly-v3-6dccb9e281bc46d097df19f6dc9650ac | CC-BY and lightweight, but Blockbench/low-poly style is not materially better than existing project-authored buses. Reject for runtime upgrade. |
| Sketchfab Pedestrian Crossing Sign, https://sketchfab.com/3d-models/pedestrian-crossing-sign-c8c7210c40624b71bd5f4644fdaa60f3 | CC-BY and lightweight, but visible quality concerns on the source page and not a meaningful realism upgrade over project-authored/generative signage. Reject. |
| Sketchfab Generic Sedan Car, https://sketchfab.com/3d-models/generic-sedan-car-58c33766470d46e7b2aed542650494e5 | Source page was bot-gated in text browser; public API metadata shows CC Attribution, downloadable, 113K faces. Not enough direct page evidence plus not clearly better than existing project-authored vehicles. Reject. |
| Sketchfab Free Low Poly Vehicles Pack, https://sketchfab.com/3d-models/free-low-poly-vehicles-pack-cb7640039e7a40679a53be705ebff50e | Source page was bot-gated in text browser; public API metadata shows CC Attribution, not CC0 despite snippet-level claims. Low-poly vehicle pack is not materially better than existing project-authored vehicle GLBs. Reject. |
| Sketchfab FREE Concept Car 006, https://sketchfab.com/3d-models/free-concept-car-006-public-domain-cc0-a4e19bb6e6394c4a95d4319ef7d265ba | Description claims public domain, but visible license field says Free Standard, not CC0/CC-BY. Also 544K tris. Reject for license mismatch and budget risk. |
| Meshy pedestrian tag pages, https://www.meshy.ai/tags/pedestrian | Category page claims CC0/GLB availability, but no specific asset page, author, source model, or file size was verified. Reject until a specific model page with stable license/provenance is inspected. |
| ambientCG 3D/list pages, https://ambientcg.com/ and https://ambientcg.com/list | Strong CC0 material/HDRI source, but this pass did not find a directly useful public GLB street/pedestrian/vehicle candidate. Keep as texture/HDRI source, not GLB candidate. |

## Approval Gate

All candidates require explicit user approval before download or integration because this repo's plan/runbook requires approval for third-party asset downloads. For CC-BY candidates, approval must also cover exact attribution text and updates to manifest, provenance, and compliance docs before verifier merge.
