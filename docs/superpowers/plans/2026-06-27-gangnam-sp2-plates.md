# Gangnam Station SP2 — Real-Landmark Plates (day/night × wide/cctv) — Implementation Plan

> **For agentic workers:** This plan is a HYBRID. The mechanical tasks (structural-guide render, manifest/compliance mount, validation) follow superpowers:subagent-driven-development / executing-plans with checkbox steps. The image-generation task (Phase B) is an inherently creative, iterative `codex` image_gen loop whose acceptance gate is **human visual review** — it is NOT TDD and must not be auto-accepted by a subagent.

**Goal:** Replace the four placeholder "generic Gangnam" background plates with photoreal plates of the REAL 강남역 사거리, generated to match SP1's recalibrated cameras + asymmetric geometry, mounted with relaxed (real-location) compliance, all gates green and browser proofs accepted by the user.

**Architecture:** Render clean structural guides from the SP1 geometry at the two fixed cameras (operator-wide, operator-cctv) → condition `codex exec` image_gen on each guide + a verified real-강남역 prompt to produce day/night × wide/cctv plates → swap the image files behind the EXISTING plate asset IDs (mount/`plateManifest` unchanged) → relax the compliance doc (real-location reproduction, IP risk owned by user) + refresh manifest provenance → revalidate gates + browser proofs.

**Tech Stack:** `codex exec` image_gen (codex-cli 0.142.2, chatgpt-authed; outputs land in `~/.codex/generated_images`, copied into the repo); Playwright bundled chromium render harness (`scripts/verify-r3f-dashboard.mjs`); R3F `BackgroundPlateLayer`/`plateManifest`/`seamlessGrade`; `verify-r3f-assets.mjs` + `docs/compliance/r3f-asset-licenses.md`.

## Global Constraints

- **Reuse the existing 4 plate asset IDs** (mount stays unchanged): `plates/gangnam_night_operator_wide` (.png), `plates/gangnam_day_operator_wide` (.png), `plates/gangnam_night_operator_cctv` (.webp), `plates/gangnam_day_operator_cctv` (.webp). SP2 swaps the image CONTENT + updates provenance; it does NOT add new IDs or change `plateManifest.ts` mappings.
- **Camera framing = SP1 recalibrated values** (the OLD plates were framed for the old box and are now misaligned): operator-wide = `STAGE5_CAMERA` `[26,82,116]→[0,0,-34]` fov 50; operator-cctv `[38,20,44]→[-4,1,-14]` fov 50. Plates MUST be generated/conditioned for these.
- **Real 강남역 fidelity (verified facts, do not re-derive):** 강남대로 N–S ~10-lane arterial with a **central red median bus lane** (중앙버스전용차로) + island stops; 테헤란로 (E) comparable ~10-lane; 서초대로 (W) the narrow ~8-lane leg; **NO surface crosswalk across 강남대로** (most distinctive); Korean 가로형 4색등 signals; **Samsung Town 3 glass towers to the SW** (tallest ~200 m); **NE/east frontage giant LED billboards + the I♡GANGNAM heart at 강남스퀘어**; **G-Light media poles** on the east sidewalk; **street trees = London plane (양버즘나무) / zelkova — NOT ginkgo**; dense glass-and-steel canyon. Day = bright beige/grey glass canyon, plane-tree canopy; night = saturated LED neon night-tourism look.
- **Compliance / IP (user decision, recorded):** reproduce the real place faithfully including recognizable landmark/brand-like signage. There is no hard brand-detection code gate; relax the compliance DOC prose (remove the "no real brands/logos/store names; signage abstract/illegible" claim for these plates) and document a deliberate real-location reconstruction with associated trademark/copyright risk owned by the user. Plates remain **background visual only — never a vehicle/pedestrian/signal truth surface** (this invariant is asserted by `BackgroundPlateLayer.truth.test.tsx` and must stay true). Keep `verify-r3f-assets.mjs` banned-term + manifest-sync gates passing (do NOT introduce banned terms like "toy"/"placeholder").
- **Alignment is the hard acceptance bar:** because the plate is screen-space projected, the generated road/junction geometry must line up with the SP1 proxy (road widths, lane count, median bus lane, junction box) at the matching camera; vehicles/signals must not look pasted-on or off-road.
- Plates stay **1536×1024** (current dimensions) unless a manifest change is justified; respect the asset payload budget (verify:r3f-assets, currently 20.32/25 MB).
- Dependencies: SP1 merged (HEAD has the recalibrated cameras + asymmetric geometry). Work on a new branch `feat/gangnam-sp2-plates`.

---

## File Structure

- `apps/web/public/simulation/r3f/assets/plates/gangnam_{day,night}_operator_{wide,cctv}.{png,webp}` — the 4 plate image files (CONTENT replaced).
- `scripts/` (new) `render-plate-guides.mjs` OR a documented harness invocation — produces clean structural-guide PNGs from the two cameras for imagegen conditioning + alignment reference. (Reuses `plateProxyGeometry`/`plateCameraCalibration` + the existing chromium render path.)
- `docs/agents/plate-imagegen-brief.md` (new) — the verified real-강남역 prompt brief + per-camera framing notes + the gathered web reference URLs, handed to `codex exec` image_gen.
- `apps/web/public/simulation/r3f/assets/manifest.json` — refresh the 4 plate entries' provenance/source/dimensions/realismStatus.
- `docs/compliance/r3f-asset-licenses.md` — relax the 4 plate rows (real-location reproduction + IP-risk note); keep manifest↔compliance sync.
- `apps/web/components/r3f/seamlessGrade.ts` — retune day/night grade only if the new plates need it (deferred to SP4 unless the proof obviously needs it).
- Tests: `BackgroundPlateLayer.truth.test.tsx` (must stay green — plate is visual-only); `plateManifest.test.ts` (IDs unchanged); `verify-r3f-assets` (manifest/compliance sync, dimensions, payload, banned terms).

---

## Phase A — Structural guides + reference brief (autonomous)

### Task A1: Render structural guides from the SP1 cameras

**Files:** Create `scripts/render-plate-guides.mjs` (or a documented one-off using the existing harness); output `artifacts/plate-guides/{wide,cctv}-structural-guide.png`.

**Interfaces:** Consumes `plateCameraCalibration.PLATE_CAMERA_ANGLES` (operator-wide, operator-cctv) + `plateProxyGeometry.buildPlateProxy()` + `roadGeometry` (asymmetric corridors/lanes/median-bus markings). Produces two clean guide PNGs (gray building massing, white road edges + lane dividers + median bus lane highlighted + crosswalk topology with NO 강남대로 crossing) at 1536×1024 framed at each camera.

- [ ] Render each camera's view of the proxy geometry as a flat diagnostic (no plate, no PostFX): buildings as gray boxes, road/lanes/median-bus/crosswalks as white markings, at exactly the camera's position/target/fov. Reuse the chromium render path (it already loads the R3F scene; add a `?guide=1` query or a minimal standalone render that draws only the proxy + markings).
- [ ] Verify each guide visually shows the asymmetric layout (강남대로 wide N–S with the central median bus lane, 테헤란로 wide E, 서초대로 narrow W, no 강남대로 crosswalk) from the correct camera.
- [ ] Commit the guides under `artifacts/plate-guides/` (gitignored scenario PNGs aside, commit these as conditioning inputs) + the render script.

### Task A2: Author the real-강남역 imagegen brief

**Files:** Create `docs/agents/plate-imagegen-brief.md`.

- [ ] Write a per-plate prompt brief from the verified facts (Global Constraints) + the gathered web reference URLs (Getty drone aerial day; iStock night aerial; Seoul TOPIS CCTV oblique; Gangnam-gu archive; the landmark inventory — Samsung Town SW, NE LED billboards, I♡GANGNAM heart, G-Light media poles, plane trees, red median bus lane). For each of the 4 plates specify: camera (aerial-wide vs low-oblique-cctv), time (day/night look), and the alignment requirement (road/junction must match the attached structural guide).
- [ ] Commit the brief.

---

## Phase B — Generate the 4 plates (codex image_gen — ITERATIVE, human-reviewed; NOT TDD)

> Acceptance gate = **human visual review** + alignment check. A subagent MUST NOT self-accept a generated plate. Generate → render in scene → present to user → iterate.

**Chosen generation path (locked):** use the imagegen skill's **built-in `image_gen` tool in `edit`/img2img mode**, conditioning each plate on its structural guide (Phase A) so the road/junction composition is preserved and the plate aligns with the fixed-camera proxy. Drive it via `codex exec` (codex is **chatgpt-authed**, so the built-in tool works without an API key). Rationale: of the three CLI subcommands (`generate`/`edit`/`generate-batch`), only `edit` conditions on an input image — text-only `generate` cannot guarantee proxy alignment and `generate-batch` is just batching. Do NOT use the CLI fallback (`scripts/image_gen.py`, models gpt-image-2/1.5/1/mini): it **requires `OPENAI_API_KEY`, which is not set in this environment** (escalate to the user for a key only if the built-in tool fails). gpt-image-2 would be the model of choice if the CLI is ever used (photoreal, always-high input fidelity, fewer retries).

For each plate in {night-wide, day-wide, night-cctv, day-cctv}:

- [ ] Invoke generation: `codex exec` with an image_gen task = the plate's section of `plate-imagegen-brief.md` + the matching structural guide (`-i artifacts/plate-guides/<cam>-structural-guide.png`) + (optional) a web reference image. Target 1536×1024. The generated image lands in `~/.codex/generated_images`; copy the chosen candidate to the plate's repo path (.png for wide, .webp for cctv — convert via sharp if needed, respecting the payload budget).
- [ ] Render the plate in the scene at its camera (`npm run verify:r3f-dashboard` regenerates proofs; or a targeted capture) and inspect: does the road/junction align with the proxy + vehicles/signals (no off-road float, no pasted-on look)? Does it read as the real 강남역 (Samsung Town SW, NE billboards, median bus lane, no 강남대로 crosswalk, correct trees)?
- [ ] **Present the rendered proof to the user for accept/iterate.** On reject, refine the prompt/guide and regenerate. Only on user acceptance, proceed.
- [ ] Once all 4 accepted, the image files are in place under the existing IDs/paths.

---

## Phase C — Mount metadata + compliance (mechanical / TDD-able)

### Task C1: Refresh manifest provenance for the 4 plates

**Files:** Modify `apps/web/public/simulation/r3f/assets/manifest.json` (the 4 `plates/gangnam_*` entries).

- [ ] Update each plate entry's `source`/`details.spriteFeatures`/`realismStatus`/`maxFileSizeBytes`/dimensions to reflect the real-강남역 reconstruction (keep `id`/`path`/`kind:"texture"`/`runtimeUsage:"background-plate"`/`allowNonPowerOfTwo` unchanged). No banned terms.
- [ ] Run `npm run verify:r3f-assets` → expected PASS (manifest valid, payload within budget).
- [ ] Commit.

### Task C2: Relax the compliance doc for real-location plates

**Files:** Modify `docs/compliance/r3f-asset-licenses.md` (the 4 plate rows + the "Background plates" prose section).

- [ ] Replace the "no real brands/logos/store names; signage abstract/illegible" provenance text for the 4 plates with: a deliberate faithful reconstruction of the real 강남역 사거리 (recognizable landmarks/signage), trademark/copyright risk acknowledged and owned by the user, background-visual-only / never a truth surface. Keep every column the `verify-r3f-assets.mjs` manifest↔compliance sync requires (runtimePath, kind, source, license, provenance, status, pbrChannels, compression, provenanceEvidencePath) matching the manifest.
- [ ] Run `npm run verify:r3f-assets` → expected PASS (compliance↔manifest sync holds).
- [ ] Confirm `BackgroundPlateLayer.truth.test.tsx` still passes (plate = `background_plate_visual_only`, never sumo/vehicle/pedestrian/signal): `cd apps/web && npx vitest run BackgroundPlateLayer.truth`.
- [ ] Commit.

---

## Phase D — Validate + browser proofs (gates + user acceptance)

### Task D1: Full gate sweep + browser proofs

- [ ] Run the SP1 gate set from repo root: `cd apps/web && npx vitest run`; `npm run test:api`; `npm run build:web`; `npm run verify:r3f-assets`; `npm run verify:r3f-dashboard`; `npm run verify:r3f-performance`; `npm run verify:r3f-visual-diff`. All expected PASS.
- [ ] **Visual-diff baseline:** the new plates change the desktop canvas histogram → regenerate + commit `scripts/baselines/r3f-dashboard-visual-baseline.json` (same deterministic procedure as SP1 D4) and confirm `verify:r3f-visual-diff` passes with `self_baseline=false`, `mode=final`.
- [ ] Capture day/night × wide/cctv browser proofs and **present all four to the user for final acceptance** (the SP2 success criterion: "scene reads as the real 강남역, day+night, both viewpoints, vehicles/signals aligned, accepted by the user").
- [ ] Commit the regenerated baseline + artifacts.

---

## Success Criteria

- The 4 plates read as the **real 강남역 사거리** (Samsung Town SW skyline, NE LED billboards + media poles + I♡GANGNAM heart, red median bus lane, no 강남대로 surface crosswalk, plane/zelkova trees) at day and night, from both the wide and CCTV cameras.
- Generated road/junction aligns with the SP1 proxy at each camera; vehicles/signals do not look pasted-on.
- Mount unchanged (same plate IDs); compliance doc relaxed + manifest↔compliance sync green; plate stays visual-only.
- All seven gates green with a regenerated visual baseline; the four browser proofs reviewed and accepted by the user.

## Open Questions / Risks

- **imagegen quality + alignment is the hard part** — getting a generated photoreal plate to both look like the real 강남역 AND align with the fixed-camera proxy geometry typically takes several iterations; this is the user-reviewed loop in Phase B.
- **Literal brand fidelity in practice:** image_gen produces brand-LIKE signage, not pixel-exact trademarked logos; confirm with the user whether "recognizably 강남역" is sufficient or specific real logos are required (higher IP risk).
- **codex image_gen availability per run:** chatgpt-authed codex with image_gen worked for prior plates; if a run cannot produce an image, Phase B is blocked on the generation tool (escalate).
- Old plates were PNG(wide)/WebP(cctv); keep formats + payload budget.
