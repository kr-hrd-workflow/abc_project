# SUMO-Ready Operator Map Stage 1-3 Evidence Seed

This is a seed note for later technical writing about the staged SUMO-ready operator map work.

## Scope

Stages 1-3 move the Unreal side from static city render proofs toward one operator-readable simulation viewport.

- Stage 1: large 3D operator intersection, lane semantics, queue zones, and readable all-approach proof capture.
- Stage 2: 3D context geometry around the operator map while preserving traffic-reading zones.
- Stage 3: normalized city signal and vehicle kits with stable pivots and lane-fit dimensions.

## Boundaries

- SUMO/TraCI remains the future traffic truth source.
- FastAPI remains the orchestration boundary.
- Unreal remains the rendering boundary.
- Image Gen references are reference-only and are not runtime map objects.
- No live SUMO movement, real traffic-controller integration, or Pixel Streaming proof is claimed by these stages.

## Evidence Paths

| Stage | Primary Proof | Reference | Verifier |
| --- | --- | --- | --- |
| Stage 1 | `docs/technotes/assets/smart-intersection-generated-screenshots/unreal-operator-map-stage1-proof.png` | `docs/technotes/assets/smart-intersection-generated-screenshots/sumo-ready-operator-map-stage1-reference.png` | `npm run verify:operator-map-stage1` |
| Stage 2 | `docs/technotes/assets/smart-intersection-generated-screenshots/unreal-operator-map-stage2-proof.png` | `docs/technotes/assets/smart-intersection-generated-screenshots/sumo-ready-operator-map-stage2-context-reference.png` | `npm run verify:operator-map-stage2` |
| Stage 3 | `docs/technotes/assets/smart-intersection-generated-screenshots/unreal-operator-map-stage3-proof.png` | `docs/technotes/assets/smart-intersection-generated-screenshots/sumo-ready-operator-map-stage3-asset-reference.png` | `npm run verify:operator-map-stage3` |

## Stage 3 Commit

- Commit: `d3d73c4b feat: add sumo operator map stage 3`
- Branch target: `main`
- Remote: `origin/main`

## Verification Lines To Preserve

Stage 3 verifier output to cite in a finished note:

```text
KIT_PROFILE_STAGE3_CHECK_PASS schema=operator-stage3-city-asset-kit-v1 cities=seoul,new_york,paris,london variants=passenger_car,bus,taxi,emergency_vehicle
MAP_STAGE3_TOKEN_CHECK_PASS bytes=896916
OPERATOR STAGE3 PROOF_CHECK_PASS size=(1600, 900) bytes=732573 mean=160.99 stddev=75.18
SUMO_READY_OPERATOR_STAGE3_PASS
```

Repo-wide validation from the Stage 3 publish turn:

```text
API: 70 passed, 1 warning
Web: 46 passed
Next.js build: passed
git diff --check: passed with LF-to-CRLF warnings only
```

## Future Writing Angles

- Why the work starts with traffic-readable geometry before visual polish.
- How semantic map tokens protect against backplates, proof strips, and asset lineups leaking into production maps.
- Why Stage 3 assets use stable pivots and lane-fit dimensions before live SUMO binding.
- What remains for realism: live SUMO/TraCI state binding, controller integration, Pixel Streaming, and performance budgets.
