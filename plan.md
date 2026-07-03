# Plan: Smart Intersection Evidence Readiness

## Current Review Gate: 2026-07-01

Implementation is focused on real-sample readiness because additional
synthetic-only work is no longer the most meaningful path. The local dashboard,
exports, guardrails, policy scorecards, and `live-input.v1` handoff surfaces
are already rich enough for rehearsal. The project now has an authorized
historical AI-Hub CCTV frame/label sample, a T-DATA key-backed live cardinal
signal response sample, fresh Gyeonggi HLS CCTV frames, and local YOLO detector
output samples. The unresolved blocker is operator-confirmed camera/ROI-to-approach
direction calibration for the exact source view.

Newest source-search pivot:

- `인계사거리` is no longer the only target. Current best replay-ready candidate
  is `서울특별시 시청`.
- TOPIS public CCTV `camId=190` / `시청` has a playable HLS stream and a clearer
  signalized intersection view than the earlier `선사사거리` frame.
- A fresh TOPIS frame and YOLO `authorized-camera-detector-output.v1` sample
  exist under ignored
  `output/real-samples/public-data/seoul-topis-cctv/`.
- The national traffic-signal coverage report already contains
  `서울특별시`, `crsrdId=2904`, `crsrdNm=시청`; the remaining signal-side
  blocker is a successful approved-key `tl_drct_info` row for the same
  `crsrdId`.
- `npm run real-sample:build-national-signal-snapshot` is now available to
  convert a key-backed `tl_drct_info` row into `LiveSignalSnapshot` once that
  row is fetched.
- `npm run real-sample:prepare-national-live-input` is now available to chain a
  national `tl_drct_info` response, detector output, camera calibration,
  envelope build, and offline validation without storing secrets.
- Do not describe the TOPIS detector output as replay-ready until both
  `camera-approach-calibration.v1` and a fresh same-intersection signal snapshot
  are supplied.
- A TOPIS `camId=190` camera calibration review packet now exists under ignored
  `output/real-samples/public-data/seoul-topis-cctv/`; it does not choose a
  direction and still requires operator/map confirmation.

Current branch management:

- Work only on `codex/smart-intersection-policy-readiness`.
- Do not merge into local or remote `main`.
- Commit and push completed parts only to the work branch.
- Keep `.playwright-cli/` untracked and out of staged changes.

Review artifact:

- `docs/reviews/smart-intersection-project-gap-review.md`

Stop rule:

- Stop implementation and review the project when the next proposed task only
  expands synthetic/dashboard proof without validating real input, reducing
  backend/frontend policy drift, strengthening truth boundaries, or fixing a
  concrete failure.

Next meaningful decision:

1. If an authorized sample bundle is available, convert it to `live-input.v1`
   and run:

   ```bash
   npm run real-sample:check -- --offline <live-input-envelope.json>
   npm run real-sample:check -- <live-input-envelope.json>
   ```

2. If no authorized sample is available, freeze feature expansion and present
   the current state as local evaluation plus adapter readiness.
3. If code work must continue before a sample, do only narrow maintenance that
   reduces backend/frontend policy-contract drift.
4. If the user approves another 공공데이터포털 활용신청/API-key use, fetch
   `경찰청_교차로기반정보서비스` `getCrossRoadInfoDetail` samples as
   signal-plan metadata only. Do not treat them as camera detections or
   camera-to-approach calibration.
5. If an operator/map reviewer can confirm the Gyeonggi camera approach
   direction, build `camera-approach-calibration.v1` with
   `npm run real-sample:build-camera-calibration -- ...`; otherwise keep the
   sample blocked instead of guessing.

Current maintenance slice:

- [x] Remove the retired R3F photoreal/background plate branch files and update
      `apps/web/AGENTS.md` so the active renderer contract points to
      `SimulationScene.test.tsx` instead of stale plate guardrails.
- [x] Add a backend/web policy scorecard contract drift checker.
- [x] Verify the checker fails when web policy order or scoring constants drift.
- [x] Verify the current backend constants and web contract are aligned.
- [x] Add the policy contract drift check to the root `npm run verify` path.
- [x] Extend the drift check to backend/web scorecard required evidence fields.
- [x] Add policy contract checker tests to the root `npm run verify` path.
- [x] Align `live-input.v1` unknown emergency direction handling with backend
      `safety_hold` behavior.
- [x] Download an authorized AI-Hub 71573 light sample and add a vehicle-label
      adapter that turns its CCTV frame/bbox evidence into a guarded
      `live-input.v1` envelope only when approach direction and signal timing
      calibration are supplied.
- [x] Download the Seoul/T-DATA V2X signal remaining-time service guide and add
      a signal adapter that maps cardinal straight-signal remaining-time fields
      into a guarded `live-input.v1.signalSnapshot`.
- [x] Add a stale camera-frame guardrail so historical CCTV samples cannot be
      accepted as current live observations in `/api/real-sample-drop-in` or
      offline `real-sample:check`.
- [x] Align real-sample readiness, intake package, demo evidence export, final
      readiness, and health check status with the acquired AI-Hub/V2X adapter
      state instead of reporting every real-sample slot as missing.
- [x] Add an AI-Hub camera-to-approach calibration contract so vehicle labels
      can become `live-input.v1` detections only when the sample camera has a
      matching operator/geometry direction mapping.
- [x] Submit and approve the T-DATA development application for
      `신호제어기 잔여시간 정보 서비스`, fetch a key-backed live response, and
      update the Seoul V2X adapter so it can select the latest live response
      row and handle numeric strings without inventing unsupported phases.
- [x] Fetch a broader key-backed T-DATA response, find a cardinal straight-signal
      row, and verify it can become a `LiveSignalSnapshot` without extending
      `live-input.v1` to diagonal phases.
- [x] Add an authorized camera detector output adapter contract so a fresh
      detector frame can become `live-input.v1` only when a matching
      camera-to-approach calibration and signal snapshot are supplied.
- [x] Add a local file builder that converts
      `authorized-camera-detector-output.v1`,
      `camera-approach-calibration.v1`, and a `LiveSignalSnapshot` JSON file
      into a `live-input.v1` envelope for `real-sample:check`.
- [x] Add a local T-DATA signal snapshot builder that converts a Seoul V2X raw
      response file into `LiveSignalSnapshot` only when operator/source
      calibration supplies `nextPhase`, `controllerMode`, and `manualOverride`.
- [x] Add a real-sample source schema endpoint so sample providers can inspect
      the source JSON contracts before building a `live-input.v1` envelope.
- [x] Add a single real-sample prepare command that chains Seoul V2X signal
      snapshot building, camera detector envelope building, and offline
      `real-sample:check` validation.
- [x] Download and inspect the `경찰청_교차로기반정보서비스` technical guide;
      classify it as signal-plan/intersection metadata that still requires a
      real ServiceKey and does not replace fresh camera detector output or
      camera-to-approach calibration.
- [x] Submit and approve a 공공데이터포털 development application for
      `경찰청_교차로기반정보서비스`; verify the approval page and fetch
      key-backed `getCrossRoadInfoList` / `getCrossRoadInfoDetail` metadata
      samples after selecting the portal key row that returns `NORMAL_SERVICE`.
- [x] Normalize the approved `경찰청_교차로기반정보서비스`
      `getCrossRoadInfoList` / `getCrossRoadInfoDetail` samples into project
      evidence as intersection and signal-plan metadata only, while preserving
      the live drop-in blockers for fresh camera detector output, direction
      calibration, and current signal timing.
- [x] Fetch a fresh Gyeonggi traffic CCTV HLS segment, extract a JPEG frame,
      install the approved local YOLO/OpenCV vision runtime, run YOLO on the
      extracted frame, and save an `authorized-camera-detector-output.v1`
      sample while preserving the camera-to-approach calibration blocker.
- [x] Inspect the Gyeonggi CCTV location and frame for approach-calibration
      evidence, then add a local calibration builder that requires explicit
      operator/map-reviewed direction evidence instead of inferring direction
      from the frame or YOLO output.
- [x] Probe alternative Gyeonggi urban intersection HLS feeds, select
      `1771` / `인계사거리`, extract a fresh frame, and add a reusable ROI
      frame builder so multi-direction CCTV views can be split before YOLO and
      calibration instead of forcing the whole frame into one direction.
- [x] Add a multi-camera detector envelope builder so multiple calibrated ROI
      detector outputs from the same intersection can become separate
      `cameraFrames[]` in one `live-input.v1` envelope.
- [x] Identify the 2026 nationwide traffic-signal real-time API as the strongest
      public candidate for the `인계사거리` same-intersection signal timing
      blocker, and record the key-gated probe result.
- [x] Submit and approve the publicDataPk `15157604` development application,
      then run redacted approved-key probes that initially returned gateway
      HTTP 403 instead of a documented API response envelope.
- [x] Retry publicDataPk `15157604` after propagation; confirm the API now
      reaches the documented response envelope, then page through coverage and
      rule it out for current Gyeonggi/Suwon/`인계사거리` signal timing.
- [x] Search beyond `인계사거리` for a replay-ready real-sample path; identify
      서울 `선사사거리` and then `시청` as same-name CCTV/signal candidates;
      prefer `시청` because the frame clearly shows a signalized intersection,
      then produce YOLO detector output.
- [ ] Recover the approved publicDataPk `15157604` key path and fetch
      `tl_drct_info` for `crsrdId=2904` / `시청`.
- [x] Add a national-traffic-signal snapshot builder so a key-backed
      `tl_drct_info` row can become `LiveSignalSnapshot` without inventing
      `nextPhase`, `controllerMode`, or `manualOverride`.
- [x] Add a national-traffic-signal one-shot prepare command so a key-backed
      `tl_drct_info` row can be chained with detector output and
      camera-approach calibration into `live-input.v1` plus offline validation.
- [x] Add a camera calibration review packet builder and generate a TOPIS
      `camId=190` review packet that records the required operator/map decision
      without guessing `approachDirection`.
- [ ] Build `camera-approach-calibration.v1` for TOPIS `camId=190` only with
      operator/map-reviewed approach direction evidence.

Maintenance evidence:

- `node --test scripts/policy-scorecard-contract-check.test.mjs`: 4 passed.
- `npm run policy-contract:check`: `policy scorecard contract aligned`.
- `npm run test:package-scripts`: 2 passed.
- `npm --workspace apps/web run test -- liveInputContract.test.ts liveInputSubmissionSchema.test.ts`:
  4 passed.
- `npm --workspace apps/web run test -- syntheticLiveInputDataset.test.ts realSampleDropIn.test.ts`:
  19 passed.
- `npm --workspace apps/web run test -- aiHubVehicleSampleAdapter.test.ts`:
  4 passed.
- `npm --workspace apps/web run test -- seoulV2xSignalAdapter.test.ts`:
  5 passed.
- `npm --workspace apps/web run test -- realSampleDropIn.test.ts realSampleIntakePackage.test.ts`:
  12 passed.
- `node --test scripts/real-sample-drop-in-check.test.mjs`: 10 passed.
- `npm --workspace apps/web run test -- realSampleDropIn.test.ts realSampleIntakePackage.test.ts demoEvidenceExport.test.ts finalLocalReadiness.test.ts app/api/real-sample-drop-in/route.test.ts app/api/real-sample-intake-package/route.test.ts app/api/final-local-readiness/route.test.ts`:
  25 passed.
- `node --test scripts/demo-health-check.test.mjs`: 2 passed.
- `npm --workspace apps/web run test -- realSampleDropIn.test.ts realSampleIntakePackage.test.ts demoEvidenceExport.test.ts finalLocalReadiness.test.ts DashboardShell.test.tsx app/api/demo-evidence-export/route.test.ts app/api/real-sample-drop-in/route.test.ts app/api/real-sample-intake-package/route.test.ts app/api/final-local-readiness/route.test.ts`:
  116 passed.
- `npm --workspace apps/web run test -- seoulV2xSignalAdapter.test.ts realSampleDropIn.test.ts demoEvidenceExport.test.ts finalLocalReadiness.test.ts app/api/final-local-readiness/route.test.ts`:
  19 passed.
- `npm run test:real-sample-prepare`: 2 passed.
- `npm --workspace apps/web run test -- realSampleIntakePackage.test.ts app/api/real-sample-intake-package/route.test.ts realSampleSourceSchema.test.ts app/api/real-sample-source-schema/route.test.ts`:
  4 passed.
- `curl ...CrossRoadInfoService/getCrossRoadInfoDetail?serviceKey=test...`:
  returned `Unauthorized`, confirming a real ServiceKey is required for
  경찰청 교차로기반정보서비스 live samples.
- 공공데이터포털 `경찰청_교차로기반정보서비스` approval page:
  `처리상태=승인`, 활용기간 `2026-07-02 ~ 2028-07-02`; issued ServiceKey was
  observed in the browser but not printed or stored.
- Key-backed `getCrossRoadInfoList` call using the working portal key row:
  HTTP 200 `NORMAL_SERVICE`, one `시청` intersection metadata row saved under
  ignored `output/real-samples/public-data/` with `serviceKey` redacted.
- Key-backed `getCrossRoadInfoDetail` call using the working portal key row:
  HTTP 200 `NORMAL_SERVICE`, signal-plan metadata with `MAP_NO`,
  `INT_MAINPHASE`, and A/B ring phase configuration fields saved under ignored
  `output/real-samples/public-data/` with `serviceKey` redacted.
- `apps/web/lib/policeCrossroadInfoAdapter.ts` now normalizes those list/detail
  response shapes into `police-crossroad-info-metadata.v1` evidence and keeps
  the limitations explicit: no live CCTV detections, no emergency telemetry, no
  camera-to-approach calibration, and no direct `live-input.v1` `currentPhase`.
- `npm --workspace apps/web run test -- policeCrossroadInfoAdapter.test.ts realSampleIntakePackage.test.ts demoEvidenceExport.test.ts finalLocalReadiness.test.ts realSampleSourceSchema.test.ts app/api/real-sample-intake-package/route.test.ts app/api/demo-evidence-export/route.test.ts app/api/final-local-readiness/route.test.ts app/api/real-sample-source-schema/route.test.ts`:
  11 passed.
- Gyeonggi traffic CCTV `getCctvInfoList` call returned 3,311 CCTV rows. The
  direct `cctvImg` JPEG URLs sampled returned HTTP 401, but the HLS `liveUrl`
  returned a current `playlist.m3u8` and MPEG transport stream segment.
- `/Applications/Shotcut.app/Contents/MacOS/ffmpeg` extracted a `1280x720`
  JPEG frame from the saved HLS segment:
  `output/real-samples/public-data/gyeonggi-cctv/gyeonggi-cctv-live-frame.jpg`.
- `apps/api/.venv/bin/python -m pip install -e "apps/api[vision]"`: installed
  the local vision runtime (`cv2`, `ultralytics`, `torch`).
- `apps/api/models/yolov8n.pt`: downloaded local YOLOv8n model weights outside
  git.
- `npm run runtime:readiness:strict -- --section vision`: `vision ready=True`.
- Local PyTorch reports Apple MPS available and CUDA unavailable, so this
  single-frame YOLO path does not require external GPU right now. Reconsider
  Colab/external GPU for batch video, multi-camera, or larger-model inference.
- `VISION_ANALYSIS_MODE=opencv_yolo YOLO_MODEL_PATH=models/yolov8n.pt ... OpenCVYoloFrameAnalyzer`:
  detected one `car` in the Gyeonggi live frame with confidence
  `0.3071170151233673`, mapped to one `vehicle`.
- `npm run real-sample:build-yolo-detector-output -- output/real-samples/public-data/gyeonggi-cctv/gyeonggi-cctv-live-frame.jpg output/real-samples/public-data/gyeonggi-cctv/gyeonggi-cctv-yolo-detector-output.json gyeonggi-cctv-61860 gyeonggi-cctv-61860 2026-07-02T16:35:48.659+09:00 apps/api/models/yolov8n.pt 0.25`:
  wrote an `authorized-camera-detector-output.v1` sample with one vehicle
  detection.
- GITS/OSM review placed CCTV `gyeonggi-cctv-61860` near `도곡로` / `삼성로`.
  Local review crops were created under ignored
  `output/real-samples/public-data/gyeonggi-cctv/calibration-review/`, but this
  evidence is not enough to assign an operator-trusted approach direction.
- `npm run real-sample:build-camera-calibration -- <camera-calibration.json> <intersectionId> <cameraId> <approachDirection> <evidence>`
  now writes `camera-approach-calibration.v1` only when a caller supplies an
  explicit `north`, `south`, `east`, or `west` direction plus evidence text.
- Additional Gyeonggi CCTV probing found accessible urban intersection frames,
  including `1771` / `인계사거리`. The fresh frame is much clearer than the
  `은마아파트` frame, but it contains both `서울` and `오산` directions, so the
  full frame must not be treated as a single-direction camera.
- `npm run real-sample:build-camera-roi-frame -- <frame-image.jpg> <roi-output.jpg> <x> <y> <width> <height>`
  now creates approach-specific ROI frames before YOLO. For the current
  `인계사거리` frame, the full-frame detector output found 24 vehicles, the
  `서울` ROI found 15 vehicles and 1 pedestrian, and the `오산` ROI found 18
  vehicles. The ROI direction candidates are `서울 -> north` and `오산 -> south`,
  pending operator/map confirmation.
- `node --test scripts/build-yolo-detector-output.test.mjs scripts/package-scripts.test.mjs`:
  4 passed.
- `node --test scripts/build-camera-approach-calibration.test.mjs scripts/package-scripts.test.mjs`:
  4 passed.
- `node --test scripts/build-camera-roi-frame.test.mjs scripts/package-scripts.test.mjs`:
  4 passed.
- `npm run test:real-sample-camera-roi-frame`: 2 passed.
- `npm --workspace apps/web run test -- realSampleIntakePackage.test.ts authorizedCameraDetectorAdapter.test.ts app/api/real-sample-intake-package/route.test.ts`:
  5 passed.
- `npm --workspace apps/web run test -- realSampleIntakePackage.test.ts app/api/real-sample-intake-package/route.test.ts`:
  2 passed.
- `node --test scripts/build-multi-camera-detector-live-input.test.mjs scripts/package-scripts.test.mjs`:
  4 passed.
- `npm run test:real-sample-multi-camera-build`: 2 passed.
- `npm --workspace apps/web run test -- realSampleIntakePackage.test.ts app/api/real-sample-intake-package/route.test.ts`:
  2 passed.
- `https://www.data.go.kr/data/15157604/openapi.do`: official public portal
  page for `행정안전부 한국지역정보개발원_(전국 통합데이터) 교통안전 신호등 실시간 정보`,
  registered 2026-03-12 and marked real-time, nationwide, free, and
  auto-approved for development/operation accounts.
- Embedded Swagger for public data `15157604` exposes
  `https://apis.data.go.kr/B551982/rti/crsrd_map_info` and
  `https://apis.data.go.kr/B551982/rti/tl_drct_info` with `serviceKey`,
  `pageNo`, `numOfRows`, `type`, and `stdgCd` query parameters.
- Local probes against the national traffic-signal candidate using
  `serviceKey=test`, `type=json`, and `stdgCd=4111514100` returned
  `Unauthorized` for both `crsrd_map_info` and `tl_drct_info`, so a
  service-approved key is required before proving `인계사거리` coverage.
- On 2026-07-03, the logged-in public data portal account submitted and
  received automatic approval for publicDataPk `15157604`; the detail page
  showed `처리상태=승인`, 활용기간 `2026-07-03 ~ 2028-07-03`, endpoint
  `https://apis.data.go.kr/B551982/rti`, and both approved operations
  `/crsrd_map_info` / `/tl_drct_info`.
- Approved-key probes for both operations with `stdgCd=4111514100` were saved
  under ignored
  `output/real-samples/public-data/national-traffic-signal/` with
  `serviceKey` redacted. Both returned HTTP 403 body `Forbidden`; https/http
  and `type=json` / `_type=json` / no type variants all returned 403, so this
  is currently a gateway/access issue rather than evidence that `인계사거리` is
  absent.
- A later approved-key retry reached the documented API envelope. Exact
  `stdgCd=4111514100` calls for `crsrd_map_info` and `tl_drct_info` returned
  HTTP 200 with `resultCode=K3`, `resultMsg=NODATA_ERROR`, and `totalCount=0`.
- A paged approved-key coverage probe using 100 rows per page saved
  `output/real-samples/public-data/national-traffic-signal/national-traffic-signal-coverage-probe.json`
  outside git. `crsrd_map_info` returned 4,237 rows for 서울특별시, 울산광역시,
  and 제주특별자치도 only. `tl_drct_info` returned 1,377 fetched rows for
  서울특별시 and 울산광역시 only. No Gyeonggi/Suwon/`인계사거리` rows were found.
- UTIC signal-open data was checked as a fallback, but its public reference
  describes Incheon/Daegu TOD and SIGNALMAP data collected daily or on change,
  not a Suwon `인계사거리` real-time remaining-time source.
- Public news reports show Suwon started providing real-time signal information
  to KakaoNavi for 20 Gwanggyo-area intersections in 2025, which supports the
  plausibility of Suwon signal data infrastructure but does not expose a public
  API or prove `인계사거리` coverage.
- `apps/api/.venv/bin/python -m pytest apps/api/tests/test_adapters.py -q`:
  6 passed.
- The portal key table also showed a `재발급` row that still returned HTTP 401
  during this check, while the `신규발급` row returned `NORMAL_SERVICE`.
- `npm --workspace apps/web run test -- seoulV2xSignalAdapter.test.ts realSampleDropIn.test.ts realSampleIntakePackage.test.ts demoEvidenceExport.test.ts finalLocalReadiness.test.ts app/api/real-sample-drop-in/route.test.ts app/api/real-sample-intake-package/route.test.ts app/api/demo-evidence-export/route.test.ts app/api/final-local-readiness/route.test.ts DashboardShell.test.tsx`:
  122 passed.
- `npm --workspace apps/web run test -- authorizedCameraDetectorAdapter.test.ts realSampleIntakePackage.test.ts`:
  4 passed.
- `npm --workspace apps/web run test -- realSampleIntakePackage.test.ts app/api/real-sample-intake-package/route.test.ts app/api/final-local-readiness/route.test.ts finalLocalReadiness.test.ts`:
  4 passed.
- `node --test scripts/build-camera-detector-live-input.test.mjs scripts/package-scripts.test.mjs`:
  4 passed.
- `npm run test:real-sample-build`: 2 passed.
- `node --test scripts/build-seoul-v2x-signal-snapshot.test.mjs scripts/package-scripts.test.mjs`:
  5 passed.
- `npm run test:real-sample-signal-build`: 3 passed.
- `npm --workspace apps/web run test -- realSampleSourceSchema.test.ts app/api/real-sample-source-schema/route.test.ts`:
  2 passed.
- `npm --workspace apps/web run test -- finalLocalReadiness.test.ts app/api/final-local-readiness/route.test.ts`:
  2 passed.
- `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "downloadable demo evidence"`:
  1 passed, 89 skipped.
- `npm run test:web`: 66 files, 394 tests passed.
- `npm run build:web`: passed.
- `git diff --check`: passed.

Real sample intake evidence:

- Downloaded AI-Hub dataset 71573 `Sample.zip` light sample to the local
  Downloads folder. The archive contains 1,394 jpg files and 1,394 json labels.
- Extracted one vehicle-appearance sample frame locally under ignored
  `output/real-samples/aihub-71573/`:
  - `labels/C-221008_14_CR06_01_A0341.json`
  - `images/C-221008_14_CR06_01_A0341.jpg`
  - `provenance.json`
- The extracted sample provides authorized CCTV frame and bbox label evidence
  for `호계사거리`, but it does not include approach direction or live signal
  phase/remaining-time data. The remaining blocker is therefore narrowed from
  "no real sample" to "direction calibration plus signal timing sample needed."
- Downloaded `경상남도_긴급차량 우선신호시스템 위치_20251231.csv`
  from the public data portal and copied it to ignored
  `output/real-samples/public-data/`. This provides 205 emergency-priority
  infrastructure locations, useful as background/provenance evidence, but it
  is not live emergency-vehicle telemetry or signal timing.
- Downloaded `신호제어기 잔여시간 정보 서비스 설명서_v1.0.pdf` from the
  T-DATA V2X signal remaining-time page and converted it to ignored local text.
- Submitted and approved a T-DATA development application for
  `신호제어기 잔여시간 정보 서비스` on 2026-07-02. A development API key was issued
  in the account, but the key is not stored in the repository or output files.
- Fetched a key-backed live response for `data_id=10120`, `itstId=23665` and
  saved it under ignored `output/real-samples/public-data/`:
  - `seoul-v2x-signal-live-sample-10120.json`
  - `seoul-v2x-signal-live-sample-10120-provenance.json`
- The initial fixed-`itstId` response exposed diagonal straight-signal fields
  such as `seStsgRmdrCs` and `nwStsgRmdrCs`. Current `live-input.v1` phases are
  cardinal only, so the adapter summarizes that evidence without inventing a
  compatible phase.
- Fetched a broader key-backed T-DATA response without fixed `itstId`; 82 of
  100 rows had cardinal straight-signal fields. Saved ignored samples:
  - `seoul-v2x-signal-live-broad-sample-10120.json`
  - `seoul-v2x-signal-live-broad-sample-10120-provenance.json`
  - `seoul-v2x-signal-live-cardinal-sample-10120.json`
  - `seoul-v2x-signal-live-cardinal-sample-10120-provenance.json`
- The cardinal sample row has `itstId=4765`, `eqmnId=CIB1000020300`, and
  `etStsgRmdrCs=1120` / `wtStsgRmdrCs=1120`. The adapter converts it to
  `east_priority` with `remainingSeconds=112`.
- Historical AI-Hub frames remain valid detector evidence, but they now require
  manual review as live observations unless `cameraFrames[].capturedAt` is
  within 30 seconds of `receivedAt`.
- AI-Hub vehicle labels can now be converted through
  `buildAiHubVehicleLiveInputEnvelopeFromCalibration` only when an
  `aihub-camera-approach-calibration.v1` mapping matches both `locationId` and
  `cameraId`. This prevents the adapter from guessing an approach direction.
- Fresh camera-side detector output now has a separate
  `authorized-camera-detector-output.v1` adapter contract. It summarizes fresh
  detector rows without guessing direction, and only builds `live-input.v1`
  when a matching `camera-approach-calibration.v1` mapping supplies the
  operator-verified approach direction. The adapter-created envelope is covered
  by `validateRealSampleDropInEnvelope` when paired with a fresh signal snapshot.
- `npm run real-sample:build-camera-envelope -- <detector-output.json> <camera-calibration.json> <signal-snapshot.json> <live-input-envelope.json>`
  now builds the same `live-input.v1` envelope from local files, so an
  authorized sample provider can immediately run the existing offline and local
  drop-in checks after supplying fresh detector output and calibration.
- `npm run real-sample:build-signal-snapshot -- <seoul-v2x-response.json> <signal-snapshot.json> <nextPhase> <controllerMode> <manualOverride>`
  now builds the `LiveSignalSnapshot` input from a Seoul V2X raw response file
  without inventing source fields that T-DATA does not prove.
- `/api/real-sample-source-schema` now exposes source JSON schema contracts for
  detector output, camera approach calibration, Seoul V2X raw response, and
  signal snapshot files. `npm run demo:health` now checks this endpoint, so the
  presenter-facing health count is `16/16`.
- `/api/real-sample-drop-in`, `/api/real-sample-intake-package`,
  `/api/demo-evidence-export`, and `/api/final-local-readiness` now report
  `signal_ready_waiting_for_fresh_camera_and_calibration`. This means the local
  signal evidence is now key-backed and cardinal-compatible, while live drop-in
  is still blocked by:
  - `fresh_camera_frame_required_for_live_drop_in`
  - `camera_approach_calibration_required`
  - for replay-ready `인계사거리` evidence, same-intersection current signal
    timing is also required; the Seoul V2X cardinal sample proves the adapter
    path, not that exact Gyeonggi controller state
  - publicDataPk `15157604` is no longer blocked by authentication, but current
    coverage does not include Gyeonggi/Suwon/`인계사거리`; the next concrete
    signal-data step is finding a Suwon/Gyeonggi-specific signal source or
    obtaining a partner/controller sample

## Historical Plan: Synthetic Scenario Evaluation

## Target Outcome

Shift the project from a mostly static operations dashboard demo to a local
evaluation system that generates realistic detection/signal data at scale,
replays it, evaluates recommendation logic, and reports measurable results.

Work remains local. Completed parts may be committed and pushed only on the
work branch named above.
OpenAI API calls are limited to approved smoke and explanation-evaluation
checks. Secrets remain local in `.env.local`.

## Product Message

Instead of saying:

- "Assume CCTV and signal data arrive, then AI recommends an action."

The project should demonstrate:

- "Before live CCTV/signal integration, we generate realistic detection and
  signal datasets, run many traffic situations through the recommendation
  pipeline, and show measurable pass/fail evidence."

## Execution Order

1. Synthetic dataset schema and generator
   - Generate realistic object-detection snapshots and signal-state snapshots.
   - Include expected recommendation outcomes for each case.
   - Start small and deterministic, then scale count.

2. Replay runner
   - Replay generated cases in timestamp order.
   - Produce state snapshots that look like live pipeline inputs.

3. Recommendation evaluator
   - Run local recommendation policy against each generated case.
   - Compare actual recommendation to expected outcome.
   - Record pass/fail, reason, scenario family, and risk notes.

4. Evaluation report
   - Summarize pass rate, failures by scenario type, and notable edge cases.
   - Connect report data to the dashboard.

5. Optional LLM evaluation
   - Add OpenAI-backed explanation checks after local policy evaluation is
     useful and the user provides/approves `OPENAI_API_KEY`.

## Current Implementation Step

- [x] Define TypeScript types for synthetic detection/signal/evaluation data.
- [x] Implement deterministic synthetic scenario generator.
- [x] Add unit tests for count, schema shape, scenario diversity, and expected
      outcomes.
- [x] Expose a local script or library entry that future replay/evaluation can
      consume.

Completed evidence:

- `npm --workspace apps/web run test -- syntheticScenarios.test.ts`: 4 passed.
- `npm run test:web`: 36 files, 287 tests passed.
- `npm run build:web`: passed.

- [x] Implement a replay runner that turns generated cases into timestamped
      state snapshots for future evaluation and dashboard playback.

Replay evidence:

- `npm --workspace apps/web run test -- syntheticReplay.test.ts`: 3 passed.
- `npm run test:web`: 37 files, 290 tests passed.
- `npm run build:web`: passed.

- [x] Implement a local recommendation evaluator that scores replay frames
      against expected outcomes without OpenAI calls.

Evaluator evidence:

- `npm --workspace apps/web run test -- syntheticEvaluation.test.ts`: 2 passed.
- `npm run test:web`: 38 files, 292 tests passed.
- `npm run build:web`: passed.

Next active slice:

- [x] Build an evaluation report model that turns generated evaluation results
      into a presentation-ready summary with pass rate, family breakdown,
      failures, and risk notes.

Evaluation report evidence:

- `npm --workspace apps/web run test -- syntheticEvaluationReport.test.ts`: 2 passed.
- `npm run test:web`: 39 files, 294 tests passed.
- `npm run build:web`: passed.

- [x] Connect the evaluation report data to the dashboard so the demo can show
      measurable pass/fail evidence in the UI.

Dashboard evidence:

- `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "shows synthetic evaluation evidence"`:
  1 passed.
- `npm run test:web`: 39 files, 295 tests passed.
- `npm run build:web`: passed.
- Playwright desktop/mobile layout check:
  - `output/playwright/synthetic-evaluation-desktop-card.png`
  - `output/playwright/synthetic-evaluation-mobile-card.png`
  - horizontal overflow: 0 on desktop and mobile
  - report-panel child overlaps: 0

- [x] Prepare the presentation flow and screen-by-screen explanation around
      synthetic data generation, replay, local recommendation evaluation, and
      dashboard evidence.

Presentation evidence:

- Added `docs/presentation/synthetic-evaluation-demo-flow.md`.
- The document covers the 5-minute demo story, screen-by-screen roles,
  recommended talk track, architecture diagram, presentation boundaries, and
  next upgrade order.
- Secret scan against the new presentation doc did not find an API key.
- `npm run test:web`: 39 files, 295 tests passed.
- `npm run build:web`: passed.

- [x] Add failed-case drilldown so the dashboard can demonstrate not only
      success evidence but also how failures are inspected and improved.

Failed-case drilldown evidence:

- Added `buildSyntheticFailureDemoReport()` for a deterministic failing
  synthetic suite.
- Added Reports panel controls for `Pass suite` and `Failure drilldown`.
- Failure drilldown shows case id, family, expected recommendation, and actual
  recommendation.
- `npm --workspace apps/web run test -- syntheticEvaluationReport.test.ts -t "buildSyntheticFailureDemoReport"`:
  1 passed.
- `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "failed synthetic case drilldown"`:
  1 passed.
- `npm run test:web`: 39 files, 297 tests passed.
- `npm run build:web`: passed.
- Playwright desktop/mobile layout check:
  - `output/playwright/synthetic-failure-drilldown-desktop-card.png`
  - `output/playwright/synthetic-failure-drilldown-mobile-card.png`
  - horizontal overflow: 0 on desktop and mobile
  - synthetic evaluation card child overlaps: 0

- [x] Add multi-seed benchmark report so the dashboard can demonstrate scale
      beyond the current 100-case pass suite and 8-case failure drilldown suite.

Multi-seed benchmark evidence:

- Added `buildSyntheticBenchmarkReport()` for deterministic multi-seed
  benchmark aggregation.
- Dashboard Reports panel now shows `Benchmark Report`, `5 seeds`,
  `5,000 cases`, and `100% benchmark pass`.
- Updated presentation flow with benchmark report talk track.
- `npm --workspace apps/web run test -- syntheticEvaluationReport.test.ts -t "buildSyntheticBenchmarkReport"`:
  1 passed.
- `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "multi-seed benchmark evidence"`:
  1 passed.
- Playwright desktop/mobile card screenshots:
  - `output/playwright/synthetic-benchmark-desktop-card.png`
  - `output/playwright/synthetic-benchmark-mobile-card.png`
  - horizontal overflow: 0 on desktop and mobile
  - synthetic evaluation card child overlaps: 0
- `npm run test:web`: 39 files, 299 tests passed.
- `npm run build:web`: passed.
- Secret and stub-marker scan against touched files found no API key pattern or
  unfinished placeholder marker.

Next active slice:

- [x] Add noisy edge-case suites so the benchmark can cover low-confidence
      detections, missing/stale signal states, and conflicting emergency plus
      pedestrian situations.

Noisy edge-case suite evidence:

- Added `buildSyntheticEdgeCaseReport()` for low-confidence detection, stale
  signal state, missing signal state, and emergency/pedestrian conflict
  guardrails.
- Dashboard Reports panel now shows `Edge-case Suite`, `4 edge cases`,
  `4 guarded`, and `0 misses`.
- `npm --workspace apps/web run test -- syntheticEvaluationReport.test.ts -t "buildSyntheticEdgeCaseReport"`:
  1 passed.
- `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "noisy edge-case suite evidence"`:
  1 passed.
- Playwright desktop/mobile card screenshots:
  - `output/playwright/synthetic-edge-cases-desktop-card.png`
  - `output/playwright/synthetic-edge-cases-mobile-card.png`
  - horizontal overflow: 0 on desktop and mobile
  - synthetic evaluation card child overlaps: 0
- `npm run test:web`: 39 files, 301 tests passed.
- `npm run build:web`: passed.

Next active slice:

- [x] Add user-selectable larger suite size or seed controls for presentation
      handoff, such as 10,000-case and 50,000-case local benchmark options.

Benchmark suite selector evidence:

- Dashboard Reports panel now has `5K`, `10K`, and `50K` benchmark suite
  controls.
- Selecting `10K` shows `10,000 cases`; selecting `50K` shows
  `50,000 cases`.
- `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "switches the benchmark suite size"`:
  1 passed.
- `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "multi-seed benchmark evidence|noisy edge-case suite evidence|switches the benchmark suite size"`:
  3 passed.
- Playwright desktop/mobile card screenshots after selecting `50K`:
  - `output/playwright/synthetic-benchmark-suite-desktop-card.png`
  - `output/playwright/synthetic-benchmark-suite-mobile-card.png`
  - horizontal overflow: 0 on desktop and mobile
  - synthetic evaluation card child overlaps: 0
- `npm run test:web`: 39 files, 302 tests passed.
- `npm run build:web`: passed.

Next active slice:

- [x] Add OpenAI-backed explanation evaluation only after confirming the local
      pass/fail evaluator is useful enough to judge LLM explanations.

OpenAI explanation evaluation evidence:

- `.env.local` contains `OPENAI_API_KEY`; the value was not printed or copied
  into tracked files.
- `npm run runtime:readiness -- --section openai`: `openai ready=True
  mode=gpt-5.5`.
- Live OpenAI smoke check:
  - `openai smoke ready=True`
  - `embedding_dimensions=1536`
  - `response_text_present=True`
- Added `apps/api/app/services/openai_explanation_evaluation.py` to score LLM
  explanation text against local safety/evidence criteria:
  `simulation_only_boundary`, `no_real_signal_control`, and
  `policy_evidence_grounding`.
- Added `apps/api/app/cli/openai_explanation_eval.py` to run an approved live
  explanation evaluation without printing secrets or full model output.
- Live OpenAI explanation evaluation:
  - `openai explanation evaluation ready=True`
  - `passed=True`

  - `criteria=3/3`
  - `response_text_present=True`
- Added test isolation so ordinary API flow tests stay in local answer mode even
  when `.env.local` has a real OpenAI key.
- `apps/api/.venv/bin/python -m pytest tests/test_openai_explanation_evaluation.py -v`:
  3 passed.
- `apps/api/.venv/bin/python -m pytest tests/test_openai_explanation_eval_cli.py -v`:
  3 passed.
- `npm run test:api`: 149 passed, 2 skipped.

Next active slice:

- [x] Surface OpenAI explanation evaluation evidence in the dashboard Reports
      panel, without exposing raw model output or API secrets.

Dashboard OpenAI explanation evidence:

- Added `apps/web/lib/openAIExplanationEvaluationReport.ts` for a local,
  presentation-safe summary of the approved live explanation evaluation.
- Dashboard Reports panel now shows `OpenAI Explanation Evaluation`,
  `gpt-5.5`, `3/3 criteria passed`, and `response text present`.
- The card lists only criterion names and pass/fail status:
  `Simulation-only boundary`, `No real signal control`, and
  `Policy evidence grounding`.
- Raw model output and API secrets are not shown in the UI.
- `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "OpenAI explanation evaluation evidence"`:
  1 passed.
- `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "multi-seed benchmark evidence|noisy edge-case suite evidence|OpenAI explanation evaluation evidence|switches the benchmark suite size"`:
  4 passed.
- `npm run test:web`: 39 files, 303 tests passed.
- `npm run build:web`: passed.
- Playwright desktop/mobile card screenshots:
  - `output/playwright/openai-explanation-evaluation-desktop-card.png`
  - `output/playwright/openai-explanation-evaluation-mobile-card.png`
  - horizontal overflow: 0 on desktop and mobile
  - synthetic evaluation card child overlaps: 0

Next active slice:

- [x] Add an explicit operator-triggered live recheck flow only if the user
      approves additional OpenAI API calls from the dashboard UI.

Operator-triggered live recheck evidence:

- User approved using the charged OpenAI API budget for real verification.
- Added `POST /api/openai/explanation-evaluation/recheck`, gated by
  `OPENAI_API_KEY` and `OPENAI_MONTHLY_BUDGET_USD`.
- The API returns only a safe summary: model, pass/fail counts,
  `response_text_present`, and criterion pass/fail statuses. It does not return
  raw model output or secrets.
- Added `recheckOpenAIExplanationEvaluation()` to the web API client.
- Dashboard Reports panel now has an explicit `Live recheck` button on the
  `OpenAI Explanation Evaluation` card. The live check is not called on page
  load.
- Actual dashboard-driven OpenAI verification was run through Playwright:
  - model: `gpt-5.5`
  - passed: `true`
  - criteria: `3/3`
  - response text present: `true`
- Playwright live recheck screenshots:
  - `output/playwright/openai-live-recheck-desktop-card.png`
  - `output/playwright/openai-live-recheck-mobile-card.png`
- Playwright layout checks after the live recheck:
  - horizontal overflow: 0 on desktop and mobile
  - report sibling overlaps: 0 on desktop and mobile
  - synthetic evidence sibling overlaps: 0 on desktop and mobile
- `npm --workspace apps/web run test -- api.test.ts -t "OpenAI explanation recheck"`:
  1 passed.
- `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "OpenAI explanation live recheck"`:
  1 passed.
- `npm run test:api`: 151 passed, 2 skipped.
- `npm run test:web`: 39 files, 305 tests passed.
- `npm run build:web`: passed.

Next active slice:

- [x] Create the final presenter rehearsal script and demo runbook.

Final demo runbook evidence:

- Added `docs/presentation/final-demo-runbook.md`.
- The runbook covers:
  - core presentation claim
  - pre-demo readiness checklist
  - exact dashboard URL guidance: use `http://localhost:3000/dashboard`
  - step-by-step demo flow from problem framing to `Live recheck`
  - expected results for benchmark controls and OpenAI live recheck
  - recovery notes for loading, API readiness, and OpenAI recheck failure
  - screenshot evidence artifacts for backup slides
  - next technical upgrade recommendation
- Updated `docs/presentation/synthetic-evaluation-demo-flow.md` to point to the
  runbook and record the latest validation evidence.
- Secret scan against the presentation docs and plan found no API key pattern.

Next active slice:

- [x] Define the real CCTV/signal adapter contract so future live inputs can
      enter the same replay/evaluation pipeline without changing the dashboard
      story.

Live input adapter contract evidence:

- Added `apps/web/lib/liveInputContract.ts`.
- The contract defines `live-input.v1` envelopes for future CCTV object
  detections and signal-controller snapshots.
- Added validation for:
  - schema version
  - ids and timestamps
  - supported detection classes
  - supported directions and signal phases
  - confidence range from 0 to 1
  - non-negative integer counts and remaining signal seconds
- Added `toSyntheticReplayInput()` so validated live input can map into the
  same replay-compatible shape used by synthetic evaluation.
- Added `apps/web/lib/liveInputContract.test.ts`.
- Added `docs/architecture/live-input-adapter-contract.md` with envelope,
  camera frame, detection, signal snapshot, validation, replay mapping, and
  presentation framing.
- Updated `docs/presentation/final-demo-runbook.md` so the next technical step
  is implementing a source-specific adapter against the contract.
- `npm --workspace apps/web run test -- liveInputContract.test.ts`: 2 passed.

Next active slice:

- [x] Implement a source-specific local fixture adapter that produces a
      `live-input.v1` envelope, then feed it through the contract normalizer.

Local fixture live-input adapter evidence:

- Added `apps/web/lib/liveInputFixtureAdapter.ts`.
- `buildFixtureLiveInputEnvelope()` converts a `SyntheticScenarioCase` into a
  validated `live-input.v1` envelope.
- `buildFixtureReplayInput()` runs the envelope through
  `toSyntheticReplayInput()` so the local adapter output can enter the same
  replay-compatible shape as future real CCTV/signal adapters.
- Added `apps/web/lib/liveInputFixtureAdapter.test.ts`.
- Updated `docs/architecture/live-input-adapter-contract.md` with the local
  fixture adapter path:
  `SyntheticScenarioCase -> live-input.v1 envelope -> normalizer -> replay input`.
- Updated `docs/presentation/final-demo-runbook.md` so the next technical step
  is exposing the local adapter as a visible demo/API surface.
- `npm --workspace apps/web run test -- liveInputFixtureAdapter.test.ts`: 2 passed.

Next active slice:

- [x] Expose the local `live-input.v1` fixture adapter as a visible demo step
      or API route so the live-input contract path can be shown outside tests.

Visible live-input contract demo evidence:

- Added a `Live Input Contract` card to the dashboard Reports evidence stack.
- The card shows:
  - `live-input.v1`
  - `1 camera frame`
  - `emergency_vehicle`
  - `contract normalized`
  - `replay input ready`
- The card is powered by the local fixture adapter:
  `SyntheticScenarioCase -> live-input.v1 envelope -> normalizer -> replay input`.
- Added `DashboardShell` coverage for the visible evidence card.
- Updated `docs/presentation/synthetic-evaluation-demo-flow.md` and
  `docs/presentation/final-demo-runbook.md` with the dashboard card and
  presentation wording.
- Playwright desktop/mobile card screenshots:
  - `output/playwright/live-input-contract-desktop-card.png`
  - `output/playwright/live-input-contract-mobile-card.png`
- Playwright layout checks:
  - horizontal overflow: 0 on desktop and mobile
  - report sibling overlaps: 0 on desktop and mobile
  - synthetic evidence sibling overlaps: 0 on desktop and mobile
- `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "live input contract adapter evidence"`:
  1 passed.
- `npm run test:web`: 41 files, 310 tests passed.
- `npm run build:web`: passed.

Next active slice:

- [x] Add a small API endpoint or export artifact for the local `live-input.v1`
      fixture adapter so external demos can inspect the contract payload outside
      the dashboard.

Local live-input fixture export evidence:

- Added `apps/web/lib/liveInputFixtureExport.ts`.
- Added `GET /api/live-input-fixture`.
- The JSON artifact includes:
  - `source: local_fixture_adapter`
  - `schemaVersion: live-input.v1`
  - local emergency fixture scenario metadata
  - normalized `live-input.v1` envelope
  - replay readiness summary with detection classes and signal phase
- Added `apps/web/lib/liveInputFixtureExport.test.ts`.
- Updated the live input architecture doc and final demo runbook with the local
  API inspection path.
- `npm --workspace apps/web run test -- liveInputFixtureExport.test.ts`: 1
  passed.
- `npm run test:web`: 42 files, 311 tests passed.
- `npm run build:web`: passed and listed `/api/live-input-fixture` as a dynamic
  app route.
- Local HTTP check against `http://localhost:3000/api/live-input-fixture`:
  `status=200`, `schemaVersion=live-input.v1`, `family=emergency`,
  `ready=replay_input_ready`, detection types include `emergency_vehicle`.
- Secret and unfinished-marker scan against touched files found no matching
  API-key pattern or placeholder marker.

Next active slice:

- [x] Add a benchmark export artifact so generated pass/fail evidence can be
      inspected or downloaded outside the dashboard UI.

Synthetic benchmark export evidence:

- Added `apps/web/lib/syntheticBenchmarkExport.ts`.
- Added `GET /api/synthetic-benchmark-export`.
- The JSON artifact includes:
  - `source: synthetic_benchmark`
  - `format: json`
  - suite label, `caseCountPerSeed`, and seed list
  - the deterministic 5K local benchmark report
  - presentation summary from the benchmark headline
- Added `apps/web/lib/syntheticBenchmarkExport.test.ts`.
- Updated the final demo runbook and synthetic evaluation demo flow with the
  external benchmark inspection path.
- `npm --workspace apps/web run test -- syntheticBenchmarkExport.test.ts`: 1
  passed.
- `npm run test:web`: 43 files, 312 tests passed.
- `npm run build:web`: passed and listed `/api/synthetic-benchmark-export` as a
  dynamic app route.
- Local HTTP check against `http://localhost:3000/api/synthetic-benchmark-export`:
  `status=200`, `source=synthetic_benchmark`, `format=json`,
  `total=5000`, `passed=5000`, `failed=0`, `passRate=100`.
- Secret and unfinished-marker scan against touched files found no matching
  API-key pattern or placeholder marker.

Next active slice:

- [x] Add a presenter-facing local health check that verifies web/API
      readiness and the local export endpoints before rehearsal.

Presenter-facing local health check evidence:

- Added `scripts/demo-health-check.mjs`.
- Added root npm scripts:
  - `npm run demo:health`
  - `npm run test:demo-health`
- The health check verifies:
  - `http://localhost:3000/dashboard`
  - `http://localhost:3000/api/live-input-fixture`
  - `http://localhost:3000/api/synthetic-benchmark-export`
  - `http://127.0.0.1:8000/health`
  - `http://127.0.0.1:8000/api/runtime/readiness?section=openai`
- Added `scripts/demo-health-check.test.mjs`.
- Updated the final demo runbook with `npm run demo:health` and recovery
  guidance.
- `npm run test:demo-health`: 2 passed.
- `npm run test:web`: 43 files, 312 tests passed.
- `npm run build:web`: passed.
- Secret and unfinished-marker scan against touched files found no matching
  API-key pattern or placeholder marker.
- Actual local `npm run demo:health` result:
  - web dashboard: pass
  - live input fixture export: pass
  - synthetic benchmark export: pass
  - API health: pass
  - OpenAI readiness: fail, because the currently running API process reports
    missing `OPENAI_API_KEY`
  - summary: 4/5 checks passed
- Fresh CLI readiness still reports `openai ready=True mode=gpt-5.5`, so the
  likely required action is restarting the local API server to reload
  `.env.local`.

Next active slice:

- [x] Restart or relaunch the local API process for rehearsal so
      `npm run demo:health` reaches 5/5, then rerun the dashboard live recheck
      only if another approved OpenAI verification is needed.

API restart and final rehearsal readiness evidence:

- Reproduced the issue:
  - `npm run demo:health`: 4/5, OpenAI readiness failed with missing
    `OPENAI_API_KEY`.
  - `npm run runtime:readiness -- --section openai`: ready=True,
    mode=gpt-5.5.
- Root cause: the running API process on `127.0.0.1:8000` had stale settings
  and did not see the updated `.env.local`; fresh CLI settings did.
- Relaunched the API with the project API environment on
  `http://127.0.0.1:8000`.
- `npm run demo:health`: 5/5 checks passed.
- `npm run runtime:readiness -- --section openai`: `openai ready=True
  mode=gpt-5.5`.
- Approved live OpenAI recheck endpoint was exercised after the API restart:
  `POST /api/openai/explanation-evaluation/recheck` returned `status=200`,
  `model=gpt-5.5`, `passed=true`, `passed_criteria=3`,
  `total_criteria=3`, and `response_text_present=true`.

Next active slice:

- [x] Capture or refresh final dashboard evidence screenshots only if the
      presenter needs new images after this API restart; otherwise move to the
      real-source adapter planning step.

Final dashboard evidence screenshot refresh:

- `npm run demo:health`: 5/5 checks passed before capture.
- Captured final desktop evidence under `output/playwright/final-demo/`:
  - `01-dashboard-full-desktop.png`
  - `02-dashboard-first-viewport-desktop.png`
  - `03-reports-panel-initial.png`
  - `04-synthetic-evaluation-pass-suite.png`
  - `05-synthetic-evaluation-failure-drilldown.png`
  - `06-benchmark-report-5k.png`
  - `07-benchmark-report-10k.png`
  - `08-benchmark-report-50k.png`
  - `09-edge-case-suite.png`
  - `10-live-input-contract.png`
  - `11-openai-evaluation-before-live-recheck.png`
  - `12-openai-evaluation-after-live-recheck.png`
  - `13-api-live-input-fixture-summary.json`
  - `14-api-synthetic-benchmark-summary.json`
  - `15-final-dashboard-layout-check.json`
- The capture flow clicked `Live recheck`; the final OpenAI card showed
  `gpt-5.5`, `3/3 criteria passed`, and `response text present`.
- Layout evidence:
  - full desktop screenshot: 1440 x 4392
  - first viewport screenshot: 1440 x 1100
  - `horizontalOverflow=0`
- Representative images were visually inspected:
  - first viewport dashboard
  - OpenAI evaluation after live recheck
  - 50K benchmark report
- API summary artifacts confirmed:
  - live input fixture: `status=200`, `schemaVersion=live-input.v1`,
    `family=emergency`, `replayStatus=replay_input_ready`
  - synthetic benchmark: `status=200`, `totalCases=5000`,
    `passedCases=5000`, `failedCases=0`, `passRatePercent=100`
- `npm run demo:health`: 5/5 checks passed after capture.

Next active slice:

- [x] Generate bulk `live-input.v1` JSON payloads and evaluate recommendations
      directly from those JSON payloads.

Bulk live-input JSON generation/evaluation evidence:

- Added `apps/web/lib/syntheticLiveInputDataset.ts`.
- Added `apps/web/lib/syntheticLiveInputDataset.test.ts`.
- Added `GET /api/synthetic-live-input-export`.
- The generator produces actual `live-input.v1` envelopes with attached
  expected recommendations:
  - `caseCount=100`
  - `seed=404`
  - 25 emergency cases
  - 25 pedestrian cases
  - 25 blocked cases
  - 25 normal cases
- The evaluator normalizes each generated JSON envelope, converts it through
  `toSyntheticReplayInput()`, computes the recommendation from the JSON-derived
  detections, and compares actual vs expected recommendation.
- Added the new export endpoint to `npm run demo:health`.
- Saved an inspectable artifact:
  `output/live-input-json/synthetic-live-input-export-100.json`.
- `npm --workspace apps/web run test -- syntheticLiveInputDataset.test.ts`: 3
  passed.
- `npm run test:demo-health`: 2 passed.
- `npm run test:web`: 44 files, 315 tests passed.
- `npm run build:web`: passed and listed `/api/synthetic-live-input-export` as
  a dynamic app route.
- Local HTTP check against `http://localhost:3000/api/synthetic-live-input-export`:
  `status=200`, `source=synthetic_live_input_json`,
  `schemaVersion=live-input.v1`, `count=100`, `passed=100`, `failed=0`.
- `npm run demo:health`: 6/6 checks passed.
- Secret and unfinished-marker scan against touched files found no matching
  API-key pattern or placeholder marker.

Next active slice:

- [x] Add larger bulk `live-input.v1` JSON export options, such as 1K/5K/10K,
      or move to the first real-source adapter fixture once a target input shape
      is chosen.

Bulk live-input JSON scale-up evidence:

- Extended `apps/web/lib/syntheticLiveInputDataset.ts` with supported export
  suites:
  - `100`: 100 cases
  - `1k`: 1,000 cases
  - `5k`: 5,000 cases
  - `10k`: 10,000 cases
- Updated `GET /api/synthetic-live-input-export` to accept `?size=100`,
  `?size=1k`, `?size=5k`, or `?size=10k`; unsupported sizes fall back to 100.
- Updated `npm run demo:health` so it verifies the `1k` live-input JSON export.
- Generated inspectable artifacts:
  - `output/live-input-json/synthetic-live-input-export-100.json`
  - `output/live-input-json/synthetic-live-input-export-1k.json`
  - `output/live-input-json/synthetic-live-input-export-5k.json`
  - `output/live-input-json/synthetic-live-input-export-10k.json`
- Artifact results:
  - 100 cases: 100 passed, 0 failed, 25 emergency cases
  - 1K cases: 1,000 passed, 0 failed, 250 emergency cases
  - 5K cases: 5,000 passed, 0 failed, 1,250 emergency cases
  - 10K cases: 10,000 passed, 0 failed, 2,500 emergency cases
- File sizes:
  - 100: 145 KB
  - 1K: 1.4 MB
  - 5K: 7.0 MB
  - 10K: 14 MB
- `npm --workspace apps/web run test -- syntheticLiveInputDataset.test.ts`: 5
  passed.
- `npm run test:demo-health`: 2 passed.
- `npm run test:web`: 44 files, 317 tests passed.
- `npm run build:web`: passed.
- `npm run demo:health`: 6/6 checks passed, including
  `1K live-input.v1 JSON cases passed`.
- Secret and unfinished-marker scan against touched files and generated JSON
  artifacts found no matching API-key pattern or placeholder marker.

Next active slice:

- [x] Surface the 100/1K/5K/10K live-input JSON benchmark in the
      dashboard/report visuals so the presenter can show input-contract
      payload evaluation from the Reports panel.

Live-input JSON benchmark dashboard evidence:

- Added a `Live-input JSON Benchmark` card to the dashboard Reports evidence
  stack.
- The card has `100`, `1K`, `5K`, and `10K` suite controls.
- The default view shows `100 JSON payloads`, `100 passed`, and `0 failed`.
- Selecting `10K` shows `10,000 JSON payloads`, `10,000 passed`, and
  `0 failed`.
- The card is powered by `buildSyntheticLiveInputEvaluationReport()`, which
  evaluates generated `live-input.v1` JSON payloads after normalizing and
  mapping them through the replay-compatible input shape.
- Updated presentation docs:
  - `docs/presentation/final-demo-runbook.md`
  - `docs/presentation/synthetic-evaluation-demo-flow.md`
- Playwright desktop/mobile card screenshots:
  - `output/playwright/live-input-json-benchmark-desktop.png`
  - `output/playwright/live-input-json-benchmark-mobile.png`
- Playwright layout checks:
  - horizontal overflow: 0 on desktop and mobile
  - live-input JSON benchmark card child overflow: 0 on desktop and mobile
- `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "shows live-input JSON benchmark evidence"`:
  1 passed.
- `npm run test:web`: 44 files, 318 tests passed.
- `npm run build:web`: passed.
- `npm run demo:health`: 6/6 checks passed.
- Secret scan against touched files and new screenshots found no matching
  API-key pattern.

Next active slice:

- [x] Add a live-input JSON failure/guardrail suite for malformed, stale,
      low-confidence, or contradictory `live-input.v1` payloads, then surface
      those misses/guarded cases in the dashboard.

Live-input JSON guardrail evidence:

- Added `buildSyntheticLiveInputGuardrailReport()` to evaluate risky
  `live-input.v1` payloads separately from the clean benchmark pass suite.
- The guardrail suite covers:
  - invalid schema version -> `reject_payload`
  - missing signal snapshot -> `reject_replay_input`
  - stale signal state -> `manual_review_stale_signal`
  - low-confidence emergency detection -> `manual_review_low_confidence`
  - emergency plus pedestrian conflict ->
    `emergency_priority_with_conflict_note`
- Dashboard Reports panel now shows `Live-input JSON Guardrails`, `5 guarded`,
  and `0 misses`.
- Updated presentation docs:
  - `docs/presentation/final-demo-runbook.md`
  - `docs/presentation/synthetic-evaluation-demo-flow.md`
- Playwright desktop/mobile card screenshots:
  - `output/playwright/live-input-json-guardrails-desktop.png`
  - `output/playwright/live-input-json-guardrails-mobile.png`
- Playwright layout checks:
  - horizontal overflow: 0 on desktop and mobile
  - live-input JSON guardrail card child overflow: 0 on desktop and mobile
- `npm --workspace apps/web run test -- syntheticLiveInputDataset.test.ts -t "guards malformed"`:
  1 passed.
- `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "live-input JSON guardrail evidence"`:
  1 passed.
- `npm --workspace apps/web run test -- syntheticLiveInputDataset.test.ts DashboardShell.test.tsx -t "live-input JSON"`:
  8 passed.
- `npm run test:web`: 44 files, 320 tests passed.
- `npm run build:web`: passed.
- `npm run demo:health`: 6/6 checks passed.
- Secret scan against touched files and new screenshots found no matching
  API-key pattern.

Next active slice:

- [x] Implement a source-specific detector/signal adapter fixture that maps a
      realistic external source shape into `live-input.v1`, then validate it
      through the same normalizer/replay path.

Source-specific adapter fixture evidence:

- Added `apps/web/lib/sourceLiveInputAdapter.ts`.
- The fixture starts from two source-shaped payloads:
  - detector: `road-vision.fixture.v1`
  - signal: `signal-controller.fixture.v1`
- The adapter maps source detector classes into `live-input.v1` classes:
  - `ambulance` / `fire_truck` -> `emergency_vehicle`
  - `pedestrian` -> `pedestrian`
  - `stopped_vehicle` -> `stalled_vehicle`
  - `car` / `bus` -> `vehicle`
- The adapter maps signal phases into local phases:
  - `E_GREEN` -> `east_priority`
  - `NORMAL` -> `normal_cycle`
- Added `GET /api/source-live-input-fixture`.
- Dashboard Reports panel now shows `Source Adapter Fixture`,
  `road-vision.fixture.v1`, `signal-controller.fixture.v1`, `live-input.v1`,
  `replay input ready`, and `emergency_vehicle`.
- Updated `npm run demo:health` so it verifies the source-specific fixture
  endpoint; latest result is 7/7 checks passed.
- Updated docs:
  - `docs/architecture/live-input-adapter-contract.md`
  - `docs/presentation/final-demo-runbook.md`
  - `docs/presentation/synthetic-evaluation-demo-flow.md`
- Playwright desktop/mobile screenshots:
  - `output/playwright/source-specific-adapter-desktop.png`
  - `output/playwright/source-specific-adapter-mobile.png`
- Playwright layout checks:
  - horizontal overflow: 0 on desktop and mobile
  - source-specific adapter card child overflow: 0 on desktop and mobile
- `npm --workspace apps/web run test -- sourceLiveInputAdapter.test.ts`:
  3 passed.
- `npm --workspace apps/web run test -- app/api/source-live-input-fixture/route.test.ts`:
  1 passed.
- `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "source-specific adapter evidence"`:
  1 passed.
- `npm --workspace apps/web run test -- sourceLiveInputAdapter.test.ts app/api/source-live-input-fixture/route.test.ts DashboardShell.test.tsx -t "source-specific|Source-specific"`:
  5 passed.
- `npm run test:demo-health`: 2 passed.
- `npm run test:web`: 46 files, 325 tests passed.
- `npm run build:web`: passed and listed `/api/source-live-input-fixture`.
- `npm run demo:health`: 7/7 checks passed.
- Local HTTP check against
  `http://localhost:3000/api/source-live-input-fixture` returned
  `source_specific_adapter_fixture`, `road-vision.fixture.v1`,
  `signal-controller.fixture.v1`, `live-input.v1`,
  `replay_input_ready`, and detection types including
  `emergency_vehicle`.
- Secret scan against touched files and new screenshots found no API-key
  pattern. The only flagged credential-like string was the literal `rtsp://`
  inside a negative test assertion that verifies raw stream credentials are not
  present.

Next active slice:

- [x] Add a small downloadable evidence export for benchmark/source-adapter
      reports because no real detector or signal sample is available yet.

Downloadable demo evidence export:

- Added `apps/web/lib/demoEvidenceExport.ts`.
- Added `GET /api/demo-evidence-export`.
- The export intentionally summarizes evidence without embedding the full 10K
  dataset:
  - synthetic benchmark: 5,000 total, 5,000 passed, 0 failed
  - live-input JSON suites: 100, 1K, 5K, 10K summaries
  - 10K live-input JSON: 10,000 total, 10,000 passed, 0 failed
  - live-input guardrails: 5 guarded, 0 misses
  - source adapter: `road-vision.fixture.v1` plus
    `signal-controller.fixture.v1`, `live-input.v1`, replay ready
- Updated `npm run demo:health` so it verifies `/api/demo-evidence-export`.
- Updated docs:
  - `docs/presentation/final-demo-runbook.md`
  - `docs/presentation/synthetic-evaluation-demo-flow.md`
- `npm --workspace apps/web run test -- demoEvidenceExport.test.ts`: 1
  passed.
- `npm --workspace apps/web run test -- app/api/demo-evidence-export/route.test.ts`:
  1 passed.
- `npm run test:demo-health`: 2 passed.
- Local HTTP check against `http://localhost:3000/api/demo-evidence-export`
  returned:
  - `source=demo_evidence_export`
  - `schemaVersion=demo-evidence.v1`
  - benchmark `5000/5000`
  - live-input JSON 10K `10000/10000`
  - guardrails `5/5`
  - source adapter `replay_input_ready`
- `npm run test:web`: 48 files, 327 tests passed.
- `npm run build:web`: passed and listed `/api/demo-evidence-export`.
- `npm run demo:health`: 8/8 checks passed.
- Secret scan against touched files found no API-key pattern. The only flagged
  credential-like string was the literal `rtsp://` inside a negative test
  assertion that verifies raw stream credentials are not present.

Presenter-facing demo evidence UI:

- Added a `Demo Evidence` card to the dashboard report panel because no real
  CCTV or signal sample is available yet.
- The card summarizes:
  - health `8/8`
  - synthetic benchmark `5,000/5,000`
  - live-input JSON `10,000/10,000`
  - guardrails `5 guarded / 0 misses`
  - source-adapter replay readiness
- The card links to `/api/demo-evidence-export` through `Evidence JSON`.
- Browser proof:
  - `output/playwright/demo-evidence-summary-desktop.png`
  - `output/playwright/demo-evidence-summary-mobile.png`
  - `output/playwright/demo-evidence-summary-layout.json`
- Playwright layout check on `http://localhost:3000/dashboard`:
  - desktop `documentOverflowX=0`, card child overflow `0`
  - mobile `documentOverflowX=0`, card child overflow `0`

Next active slice:

- [ ] When a real detector or signal sample becomes available, replace the
      source-specific fixture with that sample and rerun the same export,
      dashboard, health, and OpenAI validation flow.

OpenAI-backed full validation run on 2026-07-01:

- Initial OpenAI CLI attempts failed before client creation because those CLI
  commands require `OPENAI_API_KEY` in `os.environ`; `runtime:readiness` was
  ready because settings can read `.env.local`.
- Re-ran the OpenAI CLI commands after loading `.env.local` into the shell
  environment without printing secrets.
- Live OpenAI smoke:
  - `openai smoke ready=True`
  - `model=gpt-5.5`
  - `embedding_model=text-embedding-3-small`
  - `embedding_dimensions=1536`
  - `response_text_present=True`
- Live OpenAI explanation evaluation CLI:
  - `openai explanation evaluation ready=True`
  - `model=gpt-5.5`
  - `passed=True`
  - `criteria=3/3`
  - `response_text_present=True`
- Live API recheck endpoint:
  - `POST /api/openai/explanation-evaluation/recheck`
  - `status=200`
  - `model=gpt-5.5`
  - `passed=true`
  - `criteria=3/3`
  - `responseTextPresent=true`
  - all criteria passed:
    `simulation_only_boundary`, `no_real_signal_control`,
    `policy_evidence_grounding`
- Local validation also completed:
  - `npm run test:api`: 151 passed, 2 skipped
  - `npm run test:web`: 44 files, 317 tests passed
  - `npm run build:web`: passed
  - `npm run test:demo-health`: 2 passed
  - `npm run demo:health`: 6/6 checks passed
  - `GET /api/synthetic-live-input-export?size=10k`:
    `status=200`, `count=10000`, `passed=10000`, `failed=0`,
    `passRate=100`
- Secret and unfinished-marker scan against touched files and generated JSON
  artifacts found no matching API-key pattern or placeholder marker.

Next active slice:

- [x] Refine the backend local policy engine from simple priority if-branches
      toward explicit safety gates and scored operational candidates.

Local policy engine evidence:

- Safety gate now outranks emergency priority when the intersection is blocked,
  returning `ALL_RED_SAFETY` with `policy_priority=safety_gate`.
- Unknown emergency direction still returns an all-red safety hold instead of
  guessing a lane.
- Operational candidates now expose `candidate_scores` and `constraints` for
  `queue_relief`, `pedestrian_efficiency`, and `maintain_cycle`.
- Pedestrian efficiency receives an explicit no-vehicle-pressure constraint when
  queues and vehicle object counts are zero.
- `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py`: 10
  passed.
- `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py apps/api/tests/test_api_flow.py apps/api/tests/test_agent_service.py`:
  38 passed, 1 existing Starlette/httpx warning.
- `apps/api/.venv/bin/pytest apps/api/tests`: 156 passed, 2 skipped, 1
  existing Starlette/httpx warning.

Next active slice:

- [x] Align backend and frontend local policy criteria around safety-gate-first
      ordering, shared reason codes, and operator-facing scorecard evidence.

Policy alignment evidence:

- Backend recommendation evidence now includes `policy_scorecard` for queue
  relief and unknown-emergency-direction safety hold paths.
- The scorecard records `selected_policy`, `candidate_scores`, `constraints`,
  `blocked_reasons`, `required_inputs`, `objective_metrics`, `confidence`, and
  `operator_note`.
- Queue relief scorecards include quantitative `max_queue` and
  `queue_over_threshold` metrics.
- Frontend replay and live-input JSON evaluators now apply the same
  safety-gate-first ordering as the backend: blocked-intersection safety gates
  outrank emergency priority.
- Synthetic expected reason codes now use backend names:
  `intersection_blocked` and `normal_flow`.
- Dashboard/digital-twin event label maps now use backend event keys:
  `queue_threshold_exceeded` and `intersection_blocked`.
- Updated presentation docs:
  - `docs/presentation/synthetic-evaluation-demo-flow.md`
  - `docs/presentation/final-demo-runbook.md`
- `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py`:
  12 passed.
- `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py apps/api/tests/test_api_flow.py apps/api/tests/test_agent_service.py`:
  40 passed, 1 existing Starlette/httpx warning.
- `npm --workspace apps/web run test -- syntheticScenarios.test.ts syntheticEvaluation.test.ts syntheticLiveInputDataset.test.ts`:
  15 passed.

Next active slice:

- [x] Surface backend policy scorecard evidence in the dashboard
      recommendation panel for operator review.

Operator scorecard UI evidence:

- `Recommendation.evidence` now accepts structured evidence objects.
- `RecommendationPanel` renders `policy_scorecard` separately instead of
  flattening nested objects into `[object Object]`.
- The scorecard shows selected policy, confidence, required inputs when present,
  and objective metrics such as `max_queue` and `queue_over_threshold`.
- `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "operator policy scorecard"`:
  1 passed.
- `apps/api/.venv/bin/pytest apps/api/tests`: 158 passed, 2 skipped, 1
  existing Starlette/httpx warning.
- `npm run test:web`: 48 files, 335 tests passed.
- `npm run build:web`: passed.

Next active slice:

- [x] Connect policy scorecards to an operator workflow status in the dashboard
      and downloadable demo evidence export.

Operator workflow evidence:

- `RecommendationPanel` now derives operator review state from
  `policy_scorecard`.
- High-confidence scorecards with no required inputs or blocked reasons show
  `승인 검토 준비` / `Ready for approval review`.
- Low-confidence scorecards, required inputs, or blocked reasons show
  `수동검토 필요` / `Manual review required`.
- `GET /api/demo-evidence-export` now includes `operatorWorkflow` with
  supported and demonstrated statuses plus required scorecard evidence fields.
- The export includes a presentation claim that workflow state is derived from
  policy scorecards, not autonomous signal control.
- `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "operator policy scorecard|low-confidence scorecards"`:
  2 passed.
- `npm --workspace apps/web run test -- demoEvidenceExport.test.ts app/api/demo-evidence-export/route.test.ts`:
  2 passed.
- `apps/api/.venv/bin/pytest apps/api/tests`: 158 passed, 2 skipped, 1
  existing Starlette/httpx warning.
- `npm run test:web`: 48 files, 336 tests passed.
- `npm run build:web`: passed.

Next active slice:

- [x] Add real-sample readiness evidence while preserving the boundary that no
      authorized live CCTV frames or real signal samples are currently
      available.

Historical real-sample readiness evidence before AI-Hub/V2X adapter alignment:

- `GET /api/demo-evidence-export` now includes `realSampleReadiness`.
- The readiness summary states:
  - `status=blocked_waiting_for_authorized_samples`
  - `adapterBoundary=live-input.v1`
  - `fixtureReplayStatus=replay_input_ready`
  - CCTV status is `metadata_only` because authorized frame/stream access is
    required.
  - Signal status is `blocked_without_api_key` because a Seoul V2X or signal
    controller timing sample is required.
- The next required inputs are:
  - authorized CCTV frame or video sample
  - signal phase and remaining-time sample
  - detector output mapped through `live-input.v1`
- The Demo Evidence dashboard card now shows `real sample blocked` and
  `live-input.v1 boundary ready`.
- `npm --workspace apps/web run test -- demoEvidenceExport.test.ts app/api/demo-evidence-export/route.test.ts`:
  2 passed.
- `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "downloadable demo evidence"`:
  1 passed.
- `apps/api/.venv/bin/pytest apps/api/tests`: 158 passed, 2 skipped, 1
  existing Starlette/httpx warning.
- `npm run test:web`: 48 files, 336 tests passed.
- `npm run build:web`: passed.

Next active slice:

- [x] Add a real-sample drop-in checklist/API surface so authorized samples can
      be routed into the existing `live-input.v1` validation path without
      inventing live data.

Historical real-sample drop-in evidence before AI-Hub/V2X adapter alignment:

- Added `apps/web/lib/realSampleDropIn.ts`.
- Added `GET /api/real-sample-drop-in`.
- The route returns:
  - `source=real_sample_drop_in_readiness`
  - `schemaVersion=real-sample-drop-in.v1`
  - `status=waiting_for_authorized_samples`
  - `adapterBoundary=live-input.v1`
  - sample slots for authorized CCTV frame/video, signal phase remaining-time
    JSON, and detector output
  - validation flow through `live-input.v1`, replay input, local recommendation
    policy, operator workflow status, and demo evidence export
- `/api/demo-evidence-export` now points to `/api/real-sample-drop-in`.
- The Demo Evidence dashboard card now links to `Drop-in Checklist`.
- `npm run test:demo-health` now checks the real sample drop-in endpoint.
- `npm --workspace apps/web run test -- realSampleDropIn.test.ts app/api/real-sample-drop-in/route.test.ts`:
  2 passed.
- `npm --workspace apps/web run test -- demoEvidenceExport.test.ts app/api/demo-evidence-export/route.test.ts realSampleDropIn.test.ts app/api/real-sample-drop-in/route.test.ts`:
  4 passed.
- `npm run test:demo-health`: 2 passed.
- `apps/api/.venv/bin/pytest apps/api/tests`: 158 passed, 2 skipped, 1
  existing Starlette/httpx warning.
- `npm run test:web`: 50 files, 338 tests passed.
- `npm run build:web`: passed and listed `/api/real-sample-drop-in`.

Next active slice:

- [x] Add POST validation to the real-sample drop-in route so an authorized
      `live-input.v1` envelope can be tested without persistence.

Real-sample POST validation evidence:

- `validateRealSampleDropInEnvelope()` validates a supplied `live-input.v1`
  envelope, converts it to replay input, runs the local live-input
  recommendation helper, and derives operator workflow status.
- `POST /api/real-sample-drop-in` returns:
  - accepted validation with `replayStatus=replay_input_ready`,
    `recommendation=emergency_priority`, and
    `operatorWorkflowStatus=approval_review_ready`
  - rejected validation with `operatorWorkflowStatus=manual_review_required`
    and required input hints when the payload cannot become replay input
- The POST route does not persist samples.
- `npm --workspace apps/web run test -- realSampleDropIn.test.ts app/api/real-sample-drop-in/route.test.ts`:
  6 passed.
- `npm run test:demo-health`: 2 passed.
- `apps/api/.venv/bin/pytest apps/api/tests`: 158 passed, 2 skipped, 1
  existing Starlette/httpx warning.
- `npm run test:web`: 50 files, 342 tests passed.
- `npm run build:web`: passed and listed `/api/real-sample-drop-in`.

Next active slice:

- [x] Add low-confidence guardrail validation to the real-sample drop-in POST
      path so replay-ready but weak evidence is not treated as approval-ready.

Real-sample low-confidence guardrail evidence:

- `validateRealSampleDropInEnvelope()` now routes detections with
  `confidence < 0.5` to `manual_review_required`.
- Low-confidence payloads keep `replayStatus=replay_input_ready` because the
  envelope can be normalized and replayed, but return `accepted=false`,
  `recommendation=null`, `requiredInputs=["higher_confidence_detection"]`, and
  `validationErrors=["detection confidence below 0.5"]`.
- `POST /api/real-sample-drop-in` returns `400` for low-confidence posted
  detections without persisting the sample.
- Updated presentation docs:
  - `docs/presentation/final-demo-runbook.md`
  - `docs/presentation/synthetic-evaluation-demo-flow.md`
- TDD RED check:
  - `npm --workspace apps/web run test -- realSampleDropIn.test.ts -t "low-confidence"`:
    failed before implementation because the old behavior returned
    `accepted=true` and `recommendation=emergency_priority`.
- Targeted GREEN check:
  - `npm --workspace apps/web run test -- realSampleDropIn.test.ts -t "low-confidence"`:
    1 passed.
- Route/lib check:
  - `npm --workspace apps/web run test -- realSampleDropIn.test.ts app/api/real-sample-drop-in/route.test.ts`:
    8 passed.
- `npm run test:demo-health`: 2 passed.
- `npm run test:web`: 50 files, 344 tests passed.
- `npm run build:web`: passed and listed `/api/real-sample-drop-in`.

Next active slice:

- [x] Extend real-sample POST validation to route stale signal snapshots and
      contradictory emergency/pedestrian evidence into explicit operator review
      states, matching the existing live-input JSON guardrail suite.

Real-sample stale/conflict guardrail evidence:

- Stale signal snapshots now return `accepted=false`,
  `replayStatus=replay_input_ready`, `operatorWorkflowStatus=manual_review_required`,
  `requiredInputs=["fresh_signal_snapshot"]`, and
  `validationErrors=["signal snapshot older than 30 seconds"]`.
- Emergency plus long-waiting pedestrian conflicts keep
  `recommendation=emergency_priority` visible, but return
  `operatorWorkflowStatus=manual_review_required` with
  `requiredInputs=["operator_conflict_review"]`.
- `POST /api/real-sample-drop-in` returns `400` for both stale-signal and
  emergency/pedestrian conflict guardrails without persisting the sample.
- Updated presentation docs:
  - `docs/presentation/final-demo-runbook.md`
  - `docs/presentation/synthetic-evaluation-demo-flow.md`
- TDD RED check:
  - `npm --workspace apps/web run test -- realSampleDropIn.test.ts -t "stale signal|conflict review"`:
    failed before implementation because the old behavior returned
    `accepted=true` and `operatorWorkflowStatus=approval_review_ready`.
- Targeted GREEN checks:
  - `npm --workspace apps/web run test -- realSampleDropIn.test.ts -t "stale signal|conflict review"`:
    2 passed.
  - `npm --workspace apps/web run test -- realSampleDropIn.test.ts app/api/real-sample-drop-in/route.test.ts`:
    12 passed.
- `npm run test:demo-health`: 2 passed.
- `npm run test:web`: 50 files, 348 tests passed.
- `npm run build:web`: passed and listed `/api/real-sample-drop-in`.

Next active slice:

- [x] Expand backend policy scorecards so all major recommendation paths expose
      the same operator-facing scorecard fields, not only queue relief and
      selected safety-hold paths.

Backend policy scorecard expansion evidence:

- `apps/api/app/services/recommendations.py` now emits `policy_scorecard` for:
  - blocked-intersection `safety_gate`
  - known-direction `emergency_clearance`
  - unknown-direction `safety_hold`
  - `queue_relief`
  - `pedestrian_efficiency`
  - `maintain_cycle`
- The added scorecards use the shared fields:
  `selected_policy`, `candidate_scores`, `constraints`, `blocked_reasons`,
  `required_inputs`, `objective_metrics`, `confidence`, and `operator_note`.
- Emergency clearance scorecards include direction and estimated arrival.
- Safety-gate scorecards include all-red duration and the blocked reason.
- Pedestrian and maintain-cycle scorecards expose the operational candidate
  scores and constraints used by the local policy engine.
- Updated presentation docs:
  - `docs/presentation/final-demo-runbook.md`
  - `docs/presentation/synthetic-evaluation-demo-flow.md`
- TDD RED check:
  - `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py -k "scorecard and (emergency_priority_evidence or blocked_intersection_evidence or pedestrian_efficiency_evidence or normal_flow_evidence)" -q`:
    failed before implementation with missing `policy_scorecard` keys.
- Targeted GREEN checks:
  - `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py -k "scorecard and (emergency_priority_evidence or blocked_intersection_evidence or pedestrian_efficiency_evidence or normal_flow_evidence)" -q`:
    4 passed.
  - `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py -q`:
    16 passed.
  - `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py apps/api/tests/test_api_flow.py apps/api/tests/test_agent_service.py -q`:
    44 passed, 1 existing Starlette/httpx warning.
- Full validation:
  - `apps/api/.venv/bin/pytest apps/api/tests -q`:
    162 passed, 2 skipped, 1 existing Starlette/httpx warning.
  - `npm run test:web`: 50 files, 348 tests passed.
  - `npm run build:web`: passed and listed `/api/real-sample-drop-in`.

Next active slice:

- [x] Reconcile frontend operator workflow evidence/export with the expanded
      backend scorecard coverage so downloadable evidence describes the full
      set of scorecard-backed policies.

Frontend/export scorecard coverage evidence:

- `GET /api/demo-evidence-export` now includes
  `operatorWorkflow.scorecardBackedPolicies` for:
  - `safety_gate`
  - `emergency_clearance`
  - `safety_hold`
  - `queue_relief`
  - `pedestrian_efficiency`
  - `maintain_cycle`
- `operatorWorkflow.requiredEvidence` now lists the full shared scorecard
  fields: `selected_policy`, `candidate_scores`, `constraints`,
  `blocked_reasons`, `confidence`, `required_inputs`, `objective_metrics`, and
  `operator_note`.
- The Demo Evidence dashboard card now surfaces `6 scorecard policies` so the
  presenter can show that scorecard coverage is not limited to one example.
- The export presentation claims now state that backend policy scorecards cover
  safety gates, emergency clearance, queue relief, pedestrian efficiency, and
  normal-cycle decisions.
- Updated presentation docs:
  - `docs/presentation/final-demo-runbook.md`
  - `docs/presentation/synthetic-evaluation-demo-flow.md`
- TDD RED check:
  - `npm --workspace apps/web run test -- demoEvidenceExport.test.ts DashboardShell.test.tsx -t "demo evidence|downloadable demo evidence"`:
    failed before implementation because the export did not include
    `scorecardBackedPolicies` and the dashboard card did not show
    `6 scorecard policies`.
- Targeted GREEN check:
  - `npm --workspace apps/web run test -- demoEvidenceExport.test.ts DashboardShell.test.tsx -t "demo evidence|downloadable demo evidence"`:
    2 passed.
- Full validation:
  - `npm run test:web`: 50 files, 348 tests passed.
  - `npm run build:web`: passed and listed `/api/demo-evidence-export`.
  - `apps/api/.venv/bin/pytest apps/api/tests -q`:
    162 passed, 2 skipped, 1 existing Starlette/httpx warning.
  - `npm run test:demo-health`: 2 passed.

Next active slice:

- [x] Add explicit backend/frontend contract coverage for scorecard-backed
      policy names so future changes cannot silently drift between API evidence,
      demo export, and dashboard labels.

Policy scorecard contract coverage evidence:

- Backend now exports `POLICY_SCORECARD_BACKED_POLICIES` from
  `apps/api/app/services/recommendations.py`.
- Backend recommendation tests now collect `selected_policy` from representative
  safety gate, emergency clearance, safety hold, queue relief, pedestrian
  efficiency, and maintain-cycle observations and compare that set with the
  backend policy contract.
- Frontend now defines `apps/web/lib/policyScorecardContract.ts` with:
  - `POLICY_SCORECARD_BACKED_POLICIES`
  - `POLICY_SCORECARD_REQUIRED_EVIDENCE`
- `GET /api/demo-evidence-export` now builds
  `operatorWorkflow.scorecardBackedPolicies` and `requiredEvidence` from the
  frontend contract constants instead of duplicating inline strings.
- Presentation docs now state that backend/frontend contract tests keep policy
  names aligned across API evidence, demo export, and dashboard summary.
- TDD RED checks:
  - `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py -k "policy_scorecard_contract" -q`:
    failed before implementation because
    `POLICY_SCORECARD_BACKED_POLICIES` was not exported.
  - `npm --workspace apps/web run test -- demoEvidenceExport.test.ts`:
    failed before implementation because `policyScorecardContract` did not
    exist.
- Targeted GREEN checks:
  - `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py -k "policy_scorecard_contract" -q`:
    1 passed.
  - `npm --workspace apps/web run test -- demoEvidenceExport.test.ts`:
    1 passed.
  - `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "downloadable demo evidence"`:
    1 passed.
  - `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py -q`:
    17 passed.
  - `npm --workspace apps/web run test -- demoEvidenceExport.test.ts DashboardShell.test.tsx -t "demo evidence|downloadable demo evidence"`:
    2 passed.
- Full validation:
  - `apps/api/.venv/bin/pytest apps/api/tests -q`:
    163 passed, 2 skipped, 1 existing Starlette/httpx warning.
  - `npm run test:web`: 50 files, 348 tests passed.
  - `npm run build:web`: passed and listed `/api/demo-evidence-export`.
  - `npm run test:demo-health`: 2 passed.

Next active slice:

- [x] Add a small scorecard contract export or local inspection artifact so the
      presenter can show the policy contract directly, without reading source
      code or relying only on tests.

Policy scorecard contract inspection evidence:

- Added `apps/web/lib/policyScorecardContractExport.ts`.
- Added `GET /api/policy-scorecard-contract`.
- The JSON artifact includes:
  - `source=policy_scorecard_contract`
  - `schemaVersion=policy-scorecard-contract.v1`
  - `operatorWorkflowSource=policy_scorecard`
  - `adapterBoundary=live-input.v1`
  - `decisionBoundary=operator_decision_support_not_signal_control`
  - six `scorecardBackedPolicies`
  - required scorecard evidence fields
  - supported operator workflow statuses
- `GET /api/demo-evidence-export` now includes
  `operatorWorkflow.contractEndpoint=/api/policy-scorecard-contract`.
- `npm run demo:health` now checks the policy scorecard contract export; the
  presenter-facing health count is now `11/11`.
- The Demo Evidence dashboard card now shows `Health 11/11`.
- Updated presentation docs:
  - `docs/presentation/final-demo-runbook.md`
  - `docs/presentation/synthetic-evaluation-demo-flow.md`
- TDD RED checks:
  - `npm --workspace apps/web run test -- policyScorecardContractExport.test.ts app/api/policy-scorecard-contract/route.test.ts`:
    failed before implementation because the export builder and route did not
    exist.
  - `npm run test:demo-health`:
    failed before implementation because the health check still had 10 checks.
  - `npm --workspace apps/web run test -- demoEvidenceExport.test.ts`:
    failed before adding `operatorWorkflow.contractEndpoint`.
  - `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "downloadable demo evidence"`:
    failed before updating the dashboard health label from `8/8` to `11/11`.
- Targeted GREEN checks:
  - `npm --workspace apps/web run test -- policyScorecardContractExport.test.ts app/api/policy-scorecard-contract/route.test.ts`:
    2 passed.
  - `npm run test:demo-health`: 2 passed.
  - `npm --workspace apps/web run test -- demoEvidenceExport.test.ts`:
    1 passed.
  - `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "downloadable demo evidence"`:
    1 passed.
  - `npm --workspace apps/web run test -- policyScorecardContractExport.test.ts app/api/policy-scorecard-contract/route.test.ts demoEvidenceExport.test.ts DashboardShell.test.tsx -t "policy scorecard contract|demo evidence|downloadable demo evidence"`:
    4 passed.
- Full validation:
  - `apps/api/.venv/bin/pytest apps/api/tests -q`:
    163 passed, 2 skipped, 1 existing Starlette/httpx warning.
  - `npm run test:web`: 52 files, 350 tests passed.
  - `npm run build:web`: passed and listed `/api/policy-scorecard-contract`.
  - `npm run test:demo-health`: 2 passed.

Next active slice:

- [x] Run a final local readiness reconciliation across demo evidence,
      scorecard contract, real-sample drop-in, health checks, and presentation
      docs so the remaining work is clearly separated from the blocker of
      missing authorized CCTV/signal samples.

Historical final local readiness reconciliation evidence before AI-Hub/V2X adapter alignment:

- Added `apps/web/lib/finalLocalReadiness.ts`.
- Added `GET /api/final-local-readiness`.
- The JSON artifact includes:
  - `source=final_local_readiness_reconciliation`
  - `schemaVersion=final-local-readiness.v1`
  - `localRehearsalStatus=ready_for_local_rehearsal`
  - `realSampleStatus=blocked_waiting_for_authorized_samples`
  - `decisionBoundary=operator_decision_support_not_signal_control`
  - `adapterBoundary=live-input.v1`
  - `healthCheck.expectedSummary=12/12 checks passed`
  - links to demo evidence, policy scorecard contract, real-sample drop-in,
    live-input fixture, source adapter fixture, and 10K live-input JSON export
  - local evidence summaries for benchmark, live-input JSON, guardrails,
    scorecard policy count, and source adapter replay status
  - real-sample blockers and next required inputs
- `npm run demo:health` now includes the final local readiness export in the
  health flow.
- The Demo Evidence dashboard card now links to `Final Readiness`.
- The presenter-facing health label is now `Health 12/12`.
- Updated presentation docs:
  - `docs/presentation/final-demo-runbook.md`
  - `docs/presentation/synthetic-evaluation-demo-flow.md`
- TDD RED checks:
  - `npm --workspace apps/web run test -- finalLocalReadiness.test.ts app/api/final-local-readiness/route.test.ts`:
    failed before implementation because the builder and route did not exist.
  - `npm run test:demo-health`:
    failed before implementation because the health flow still had 11 checks.
  - `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "downloadable demo evidence"`:
    failed before adding the `Final Readiness` link.
- Targeted GREEN checks:
  - `npm --workspace apps/web run test -- finalLocalReadiness.test.ts app/api/final-local-readiness/route.test.ts`:
    2 passed.
  - `npm run test:demo-health`: 2 passed.
  - `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "downloadable demo evidence"`:
    1 passed.
  - `npm --workspace apps/web run test -- finalLocalReadiness.test.ts app/api/final-local-readiness/route.test.ts DashboardShell.test.tsx -t "final local readiness|downloadable demo evidence"`:
    3 passed.
- Full validation:
  - `apps/api/.venv/bin/pytest apps/api/tests -q`:
    163 passed, 2 skipped, 1 existing Starlette/httpx warning.
  - `npm run test:web`: 54 files, 352 tests passed.
  - `npm run build:web`: passed and listed `/api/final-local-readiness`.
  - `npm run test:demo-health`: 2 passed.

Next active slice:

- [x] Add a real-sample intake package so authorized sample providers can see
      the exact `live-input.v1` submission fields, guardrails, prohibited
      inputs, and POST steps before a real sample is available.

Historical real-sample intake package evidence before AI-Hub/V2X adapter alignment:

- Added `apps/web/lib/realSampleIntakePackage.ts`.
- Added `GET /api/real-sample-intake-package`.
- The JSON artifact includes:
  - `source=real_sample_intake_package`
  - `schemaVersion=real-sample-intake-package.v1`
  - `status=waiting_for_authorized_samples`
  - `adapterBoundary=live-input.v1`
  - `dropInEndpoint=/api/real-sample-drop-in`
  - `finalReadinessEndpoint=/api/final-local-readiness`
  - `noPersistence=true`
  - required top-level, detection, and signal fields for `live-input.v1`
  - validation guardrails for invalid envelopes, stale signal snapshots,
    low-confidence detections, and emergency/pedestrian conflicts
  - prohibited inputs: raw stream credentials, unauthorized CCTV frames/video,
    and secret API keys
  - submission steps for authorized samples
- `GET /api/final-local-readiness` now links to
  `/api/real-sample-intake-package`.
- `npm run demo:health` now includes the real-sample intake package; the
  presenter-facing health count is now `13/13`.
- The Demo Evidence dashboard card now links to `Intake Package` and shows
  `Health 13/13`.
- Updated presentation docs:
  - `docs/presentation/final-demo-runbook.md`
  - `docs/presentation/synthetic-evaluation-demo-flow.md`
- TDD RED checks:
  - `npm --workspace apps/web run test -- realSampleIntakePackage.test.ts app/api/real-sample-intake-package/route.test.ts DashboardShell.test.tsx -t "real sample intake|downloadable demo evidence"`:
    failed before implementation because the builder/route did not exist and
    the dashboard card did not expose `Intake Package`.
  - `npm run test:demo-health`:
    failed before implementation because the health flow still had 12 checks.
- Targeted GREEN checks:
  - `npm --workspace apps/web run test -- realSampleIntakePackage.test.ts app/api/real-sample-intake-package/route.test.ts DashboardShell.test.tsx -t "real sample intake|downloadable demo evidence"`:
    3 passed.
  - `npm run test:demo-health`: 2 passed.
  - `npm --workspace apps/web run test -- realSampleIntakePackage.test.ts app/api/real-sample-intake-package/route.test.ts finalLocalReadiness.test.ts app/api/final-local-readiness/route.test.ts DashboardShell.test.tsx -t "real sample intake|final local readiness|downloadable demo evidence"`:
    5 passed.
- Full validation:
  - `apps/api/.venv/bin/pytest apps/api/tests -q`:
    163 passed, 2 skipped, 1 existing Starlette/httpx warning.
  - `npm run test:web`: 56 files, 354 tests passed.
  - `npm run build:web`: passed and listed `/api/real-sample-intake-package`.
  - `npm run test:demo-health`: 2 passed.

Next active slice:

- [x] Add a machine-readable replay-ready `live-input.v1` submission schema so
      authorized sample providers can validate envelope shape before posting to
      the real-sample drop-in path.

Live-input submission schema evidence:

- Added `apps/web/lib/liveInputSubmissionSchema.ts`.
- Added `GET /api/live-input-submission-schema`.
- The JSON artifact includes:
  - `source=live_input_submission_schema`
  - `schemaVersion=live-input-submission-schema.v1`
  - `adapterBoundary=live-input.v1`
  - `dropInEndpoint=/api/real-sample-drop-in`
  - `decisionBoundary=operator_decision_support_not_signal_control`
  - JSON Schema draft 2020-12 metadata
  - required replay-ready top-level fields, including `signalSnapshot`
  - detection class enum with `emergency_vehicle`
  - confidence bounds from 0 to 1
  - signal phase/controller-mode enums
  - guardrail notes for low confidence, stale signal snapshots, required
    signal snapshots, and no autonomous signal control
- `GET /api/real-sample-intake-package` now links to
  `/api/live-input-submission-schema` and tells providers to validate envelope
  shape before POST.
- `GET /api/final-local-readiness` now links to
  `/api/live-input-submission-schema`.
- `npm run demo:health` now includes the live-input submission schema; the
  presenter-facing health count is now `14/14`.
- The Demo Evidence dashboard card now links to `Submission Schema` and shows
  `Health 14/14`.
- Updated presentation docs:
  - `docs/presentation/final-demo-runbook.md`
  - `docs/presentation/synthetic-evaluation-demo-flow.md`
- TDD RED checks:
  - `npm --workspace apps/web run test -- liveInputSubmissionSchema.test.ts app/api/live-input-submission-schema/route.test.ts`:
    failed before implementation because the builder and route did not exist.
  - `npm --workspace apps/web run test -- realSampleIntakePackage.test.ts app/api/real-sample-intake-package/route.test.ts finalLocalReadiness.test.ts app/api/final-local-readiness/route.test.ts DashboardShell.test.tsx -t "real sample intake|final local readiness|downloadable demo evidence"`:
    failed before connecting the schema endpoint, final readiness summary, and
    dashboard link.
- Targeted GREEN checks:
  - `npm --workspace apps/web run test -- liveInputSubmissionSchema.test.ts app/api/live-input-submission-schema/route.test.ts`:
    2 passed.
  - `npm --workspace apps/web run test -- realSampleIntakePackage.test.ts app/api/real-sample-intake-package/route.test.ts finalLocalReadiness.test.ts app/api/final-local-readiness/route.test.ts DashboardShell.test.tsx -t "real sample intake|final local readiness|downloadable demo evidence"`:
    5 passed.
  - `node --test scripts/demo-health-check.test.mjs`:
    2 passed.
- Full validation:
  - `apps/api/.venv/bin/pytest apps/api/tests -q`:
    163 passed, 2 skipped, 1 existing Starlette/httpx warning.
  - `npm run test:demo-health`:
    2 passed.
  - `npm run test:web`:
    58 files, 356 tests passed.
  - `npm run build:web`:
    passed and listed `/api/live-input-submission-schema`.

Next active slice:

- [x] Extend the policy scorecard contract so backend/frontend evidence exposes
      decision order and scoring constants, not only policy names.

Policy scorecard contract detail evidence:

- Added backend recommendation constants in
  `apps/api/app/services/recommendations.py`:
  - `POLICY_DECISION_ORDER`
  - `POLICY_SCORING_CONSTANTS`
- Extended frontend contract constants in
  `apps/web/lib/policyScorecardContract.ts` with the same decision order and
  scoring values.
- `GET /api/policy-scorecard-contract` now includes:
  - `decisionOrder`
  - `scoringConstants`
- `npm run demo:health` now validates those policy contract details while
  keeping the health count at `14/14`.
- Updated presentation docs:
  - `docs/presentation/final-demo-runbook.md`
  - `docs/presentation/synthetic-evaluation-demo-flow.md`
- TDD RED checks:
  - `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py -k "policy_contract_exposes_decision_order" -q`:
    failed before implementation because `POLICY_DECISION_ORDER` was not
    exported.
  - `npm --workspace apps/web run test -- policyScorecardContractExport.test.ts app/api/policy-scorecard-contract/route.test.ts`:
    failed before implementation because `decisionOrder` and
    `scoringConstants` were missing.
- Targeted GREEN checks:
  - `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py -k "policy_contract_exposes_decision_order" -q`:
    1 passed.
  - `npm --workspace apps/web run test -- policyScorecardContractExport.test.ts app/api/policy-scorecard-contract/route.test.ts`:
    2 passed.
  - `node --test scripts/demo-health-check.test.mjs`:
    2 passed.
- Full validation:
  - `apps/api/.venv/bin/pytest apps/api/tests -q`:
    164 passed, 2 skipped, 1 existing Starlette/httpx warning.
  - `npm run test:demo-health`:
    2 passed.
  - `npm run test:web`:
    58 files, 356 tests passed.
  - `npm run build:web`:
    passed and listed `/api/policy-scorecard-contract`.

Next active slice:

- [x] Add operator-facing workflow summary fields to real-sample drop-in POST
      responses so authorized sample validation can be audited without opening
      separate source code.

Real-sample drop-in operator workflow evidence:

- `validateRealSampleDropInEnvelope()` now returns `operatorWorkflow` in
  addition to the existing top-level `operatorWorkflowStatus`.
- The nested `operatorWorkflow` includes:
  - `source=policy_scorecard`
  - `contractEndpoint=/api/policy-scorecard-contract`
  - `status`
  - `selectedPolicy`
  - `confidence`
  - `requiredInputs`
  - `blockedReasons`
- Approval-ready emergency validation maps to
  `selectedPolicy=emergency_clearance` with high confidence.
- Rejected or uncertain inputs map to `selectedPolicy=safety_hold` with low
  confidence unless a visible recommendation remains useful, such as emergency
  priority plus pedestrian conflict.
- `npm run demo:health` now validates the drop-in POST operator workflow
  summary while keeping the health count at `14/14`.
- Updated presentation docs:
  - `docs/presentation/final-demo-runbook.md`
  - `docs/presentation/synthetic-evaluation-demo-flow.md`
- TDD RED checks:
  - `npm --workspace apps/web run test -- realSampleDropIn.test.ts app/api/real-sample-drop-in/route.test.ts`:
    failed before implementation because `operatorWorkflow` was missing.
- Targeted GREEN checks:
  - `npm --workspace apps/web run test -- realSampleDropIn.test.ts app/api/real-sample-drop-in/route.test.ts`:
    12 passed.
  - `node --test scripts/demo-health-check.test.mjs`:
    2 passed.
- Full validation:
  - `apps/api/.venv/bin/pytest apps/api/tests -q`:
    164 passed, 2 skipped, 1 existing Starlette/httpx warning.
  - `npm run test:demo-health`:
    2 passed.
  - `npm run test:web`:
    58 files, 356 tests passed.
  - `npm run build:web`:
    passed and listed `/api/real-sample-drop-in`.

Next active slice:

- [x] Add a local LLM explanation contract so the project can show that LLM
      output explains and reviews policy evidence, rather than deciding signal
      plans.

LLM explanation contract evidence:

- Added `apps/web/lib/llmExplanationContract.ts`.
- Added `GET /api/llm-explanation-contract`.
- The JSON artifact includes:
  - `source=llm_explanation_contract`
  - `schemaVersion=llm-explanation-contract.v1`
  - `role=explanation_review_only`
  - `decisionSource=local_policy_scorecard`
  - `decisionBoundary=operator_decision_support_not_signal_control`
  - `noOpenAICallRequired=true`
  - allowed responsibilities for explaining local recommendations, summarizing
    scorecard evidence, flagging missing evidence, and checking explanation
    text against guardrails
  - prohibited responsibilities for choosing signal plans, overriding local
    policy recommendations, claiming autonomous signal control, or inventing
    live CCTV/signal-controller evidence
  - evaluation criteria matching the backend OpenAI explanation evaluator:
    `simulation_only_boundary`, `no_real_signal_control`, and
    `policy_evidence_grounding`
- `GET /api/demo-evidence-export` now links
  `operatorWorkflow.llmExplanationContractEndpoint=/api/llm-explanation-contract`
  and records the presentation claim that LLM explanations review local policy
  evidence and do not choose signal plans.
- `GET /api/final-local-readiness` now links to
  `/api/llm-explanation-contract`.
- `npm run demo:health` now validates the LLM explanation contract; the
  presenter-facing health count is now `15/15`.
- Updated presentation docs:
  - `docs/presentation/final-demo-runbook.md`
  - `docs/presentation/synthetic-evaluation-demo-flow.md`
- TDD RED checks:
  - `npm --workspace apps/web run test -- llmExplanationContract.test.ts app/api/llm-explanation-contract/route.test.ts demoEvidenceExport.test.ts finalLocalReadiness.test.ts app/api/final-local-readiness/route.test.ts`:
    failed before implementation because the builder/route did not exist and
    demo/final readiness did not link the contract.
  - `node --test scripts/demo-health-check.test.mjs`:
    failed before adding the 15th health check.
- Targeted GREEN checks:
  - `npm --workspace apps/web run test -- llmExplanationContract.test.ts app/api/llm-explanation-contract/route.test.ts demoEvidenceExport.test.ts finalLocalReadiness.test.ts app/api/final-local-readiness/route.test.ts`:
    5 passed.
  - `node --test scripts/demo-health-check.test.mjs`:
    2 passed.
- Full validation:
  - `apps/api/.venv/bin/pytest apps/api/tests -q`:
    164 passed, 2 skipped, 1 existing Starlette/httpx warning.
  - `npm run test:demo-health`:
    2 passed.
  - `npm run test:web`:
    60 files, 358 tests passed.
  - `npm run build:web`:
    passed and listed `/api/llm-explanation-contract`.

Next active slice:

- [x] Align the dashboard Demo Evidence card with the new LLM explanation
      contract and 15-check health flow.

Dashboard LLM contract link evidence:

- The Demo Evidence card now shows `Health 15/15`.
- The card now links to `LLM Contract` at `/api/llm-explanation-contract`.
- This keeps the visible dashboard shortcut aligned with:
  - `GET /api/demo-evidence-export`
  - `GET /api/final-local-readiness`
  - `npm run demo:health`
- TDD RED check:
  - `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "downloadable demo evidence"`:
    failed before implementation because the card still showed `Health 14/14`
    and did not expose `LLM Contract`.
- Targeted GREEN check:
  - `npm --workspace apps/web run test -- DashboardShell.test.tsx -t "downloadable demo evidence"`:
    1 passed.

Next active slice:

- [x] Add a local policy safety hold for conflicting queue axes so the
      recommendation engine does not choose a single green extension when both
      north/south and east/west movement axes exceed the queue threshold.

Conflicting queue axes safety-hold evidence:

- Backend recommendation policy now detects conflicting queue axes after
  existing safety/emergency gates and before ordinary queue relief.
- When both movement axes exceed the queue threshold, the policy returns:
  - `RecommendationAction.ALL_RED_SAFETY`
  - `reason=conflicting_queue_axes`
  - `policy_priority=safety_hold`
  - low-confidence policy scorecard requiring
    `signal_phase.remaining_seconds`
- The inspectable policy scorecard contract now exposes
  `conflictingQueueAxesAllRedSeconds=6` /
  `conflicting_queue_axes_all_red_seconds=6`.
- TDD RED checks:
  - `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py -k "conflicting_queue_axes" -q`:
    failed before implementation because the policy returned
    `green_extension`.
  - `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py -k "policy_contract_exposes" -q`:
    failed before adding the new scoring constant to the backend contract.
  - `npm --workspace apps/web run test -- policyScorecardContractExport.test.ts app/api/policy-scorecard-contract/route.test.ts`:
    failed before adding the frontend contract constant.
- Targeted GREEN checks:
  - `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py -q`:
    19 passed.
  - `npm --workspace apps/web run test -- policyScorecardContractExport.test.ts app/api/policy-scorecard-contract/route.test.ts`:
    2 passed.
  - `node --test scripts/demo-health-check.test.mjs`:
    2 passed.
- Full validation:
  - `apps/api/.venv/bin/pytest apps/api/tests -q`:
    165 passed, 2 skipped, 1 existing Starlette/httpx warning.
  - `npm run test:demo-health`:
    2 passed.
  - `npm run test:web`:
    60 files, 358 tests passed.
  - `npm run build:web`:
    passed and listed `/api/policy-scorecard-contract`.

Next active slice:

- [x] Add the same conflicting queue axes scenario to the synthetic
      `live-input.v1` guardrail suite so local evaluation catches the new
      safety-hold condition before real samples are available.

Synthetic conflicting queue axes guardrail evidence:

- `buildSyntheticLiveInputGuardrailReport()` now includes a sixth case:
  `Conflicting queue axes`.
- The case builds a replay-compatible `live-input.v1` envelope with vehicle
  queues over threshold on both north/south and east/west movement axes.
- `detectLiveInputGuardrail()` now maps that case to
  `manual_review_conflicting_queue_axes` when no higher emergency priority is
  present.
- Demo evidence, final local readiness, dashboard copy, health test fixtures,
  and presentation docs now report `6 guarded / 0 misses`.
- TDD RED check:
  - `npm --workspace apps/web run test -- syntheticLiveInputDataset.test.ts demoEvidenceExport.test.ts finalLocalReadiness.test.ts DashboardShell.test.tsx -t "guardrail|downloadable demo evidence"`:
    failed before implementation because reports still showed 5 guardrails and
    the new case was missing.
- Targeted GREEN checks:
  - `npm --workspace apps/web run test -- syntheticLiveInputDataset.test.ts demoEvidenceExport.test.ts finalLocalReadiness.test.ts DashboardShell.test.tsx -t "guardrail|downloadable demo evidence"`:
    3 passed, 96 skipped.
  - `npm --workspace apps/web run test -- syntheticLiveInputDataset.test.ts demoEvidenceExport.test.ts finalLocalReadiness.test.ts DashboardShell.test.tsx`:
    99 passed.
  - `npm --workspace apps/web run test -- app/api/demo-evidence-export/route.test.ts`:
    1 passed after updating the stale route assertion.
- Full validation:
  - `apps/api/.venv/bin/pytest apps/api/tests -q`:
    165 passed, 2 skipped, 1 existing Starlette/httpx warning.
  - `npm run test:demo-health`:
    2 passed.
  - `npm run test:web`:
    60 files, 358 tests passed.
  - `npm run build:web`:
    passed and listed `/api/demo-evidence-export` and
    `/api/final-local-readiness`.
- Playwright desktop/mobile guardrail card proof:
  - `output/playwright/live-input-json-guardrails-conflict-desktop.png`
  - `output/playwright/live-input-json-guardrails-conflict-mobile.png`
  - `output/playwright/live-input-json-guardrails-conflict-layout.json`
  - horizontal overflow: 0 on desktop and mobile.

Next active slice:

- [x] Add a local file-based real-sample check command so an authorized
      `live-input.v1` envelope can be validated through the same drop-in route
      as soon as a sample is available.

Real-sample file check evidence:

- Added `scripts/real-sample-drop-in-check.mjs`.
- Added root script:
  `npm run real-sample:check -- <live-input-envelope.json>`.
- The command reads a local JSON envelope and POSTs it to
  `http://localhost:3000/api/real-sample-drop-in` by default.
- The command prints a compact operator-facing summary:
  `accepted`, `replayStatus`, `recommendation`, `operatorWorkflowStatus`,
  `selectedPolicy`, `confidence`, `requiredInputs`, and `validationErrors`.
- The command exits `0` for accepted samples, `1` for manual-review/rejected
  validation, and `2` for local file/JSON usage errors.
- `GET /api/real-sample-intake-package` now exposes the local CLI command in
  addition to the POST endpoint.
- `GET /api/final-local-readiness` now exposes `realSampleCheck` with the
  command, route, and running-web-server requirement.
- Presentation docs now mention the file-based command for authorized
  `live-input.v1` envelopes.
- TDD RED checks:
  - `node --test scripts/real-sample-drop-in-check.test.mjs`:
    failed before implementation because `scripts/real-sample-drop-in-check.mjs`
    did not exist.
  - `npm --workspace apps/web run test -- realSampleIntakePackage.test.ts finalLocalReadiness.test.ts app/api/real-sample-intake-package/route.test.ts app/api/final-local-readiness/route.test.ts`:
    failed before adding CLI metadata to the intake and readiness artifacts.
- Targeted GREEN checks:
  - `node --test scripts/real-sample-drop-in-check.test.mjs`:
    2 passed.
  - `node --test scripts/real-sample-drop-in-check.test.mjs scripts/demo-health-check.test.mjs`:
    4 passed.
  - `npm --workspace apps/web run test -- realSampleIntakePackage.test.ts finalLocalReadiness.test.ts app/api/real-sample-intake-package/route.test.ts app/api/final-local-readiness/route.test.ts`:
    4 passed.
- Full validation:
  - `apps/api/.venv/bin/pytest apps/api/tests -q`:
    165 passed, 2 skipped, 1 existing Starlette/httpx warning.
  - `npm run test:demo-health`:
    2 passed.
  - `npm run test:web`:
    60 files, 358 tests passed.
  - `npm run build:web`:
    passed and listed `/api/real-sample-drop-in`,
    `/api/real-sample-intake-package`, and `/api/final-local-readiness`.

Next active slice:

- [x] Align the real-sample drop-in validator with the conflicting queue axes
      safety hold so authorized sample submissions use the same guardrail as
      backend policy and synthetic `live-input.v1` evaluation.

Real-sample conflicting queue axes evidence:

- `validateRealSampleDropInEnvelope()` now detects vehicle queues above the
  local threshold on both north/south and east/west movement axes when no
  emergency vehicle is present.
- The validator returns:
  - `accepted=false`
  - `replayStatus=replay_input_ready`
  - `operatorWorkflowStatus=manual_review_required`
  - `selectedPolicy=safety_hold`
  - `requiredInputs=["signal_phase.remaining_seconds"]`
  - `validationErrors=["conflicting_queue_axes"]`
- `POST /api/real-sample-drop-in` returns `400` for the same condition.
- The real-sample intake package now lists this guardrail:
  `manual review when vehicle queues exceed threshold on conflicting movement axes`.
- Presentation docs now describe the same file/POST validation behavior without
  claiming live CCTV or signal-controller integration.
- TDD RED checks:
  - `npm --workspace apps/web run test -- realSampleDropIn.test.ts app/api/real-sample-drop-in/route.test.ts -t "conflicting queue axes"`:
    failed before implementation because the sample was accepted as
    `normal_cycle`.
  - `npm --workspace apps/web run test -- realSampleIntakePackage.test.ts app/api/real-sample-intake-package/route.test.ts`:
    failed before the intake artifact documented the new guardrail.
- Targeted GREEN checks:
  - `npm --workspace apps/web run test -- realSampleDropIn.test.ts app/api/real-sample-drop-in/route.test.ts -t "conflicting queue axes"`:
    2 passed, 12 skipped.
  - `npm --workspace apps/web run test -- realSampleDropIn.test.ts app/api/real-sample-drop-in/route.test.ts`:
    14 passed.
  - `npm --workspace apps/web run test -- realSampleIntakePackage.test.ts app/api/real-sample-intake-package/route.test.ts`:
    2 passed.
  - `npm --workspace apps/web run test -- realSampleDropIn.test.ts app/api/real-sample-drop-in/route.test.ts realSampleIntakePackage.test.ts app/api/real-sample-intake-package/route.test.ts`:
    16 passed.
  - `node --test scripts/real-sample-drop-in-check.test.mjs`:
    2 passed.
- Full validation:
  - `apps/api/.venv/bin/pytest apps/api/tests -q`:
    165 passed, 2 skipped, 1 existing Starlette/httpx warning.
  - `npm run test:demo-health`:
    2 passed.
  - `npm run test:web`:
    60 files, 360 tests passed.
  - `npm run build:web`:
    passed and listed `/api/real-sample-drop-in` and
    `/api/real-sample-intake-package`.

Next active slice:

- [x] Add a real-sample provenance guardrail so fixture or synthetic payloads
      cannot be accepted as authorized real-sample submissions.

Real-sample fixture/synthetic identifier guard evidence:

- `validateRealSampleDropInEnvelope()` now detects `fixture` or `synthetic`
  identifiers in the submitted `intersectionId`, camera/frame ids, detection
  ids, or signal controller id.
- The validator returns:
  - `accepted=false`
  - `replayStatus=replay_input_ready`
  - `operatorWorkflowStatus=manual_review_required`
  - `selectedPolicy=safety_hold`
  - `requiredInputs=["authorized_real_sample_identifiers"]`
  - `validationErrors=["fixture_or_synthetic_sample_not_allowed"]`
- `POST /api/real-sample-drop-in` returns `400` for the same condition.
- The real-sample intake package and live-input submission schema now document
  the guardrail so fixture/demo payloads cannot be presented as real CCTV or
  signal-controller evidence.
- Presentation docs now describe this boundary without claiming live CCTV or
  signal-controller integration.
- TDD RED check:
  - `npm --workspace apps/web run test -- realSampleDropIn.test.ts app/api/real-sample-drop-in/route.test.ts realSampleIntakePackage.test.ts liveInputSubmissionSchema.test.ts -t "fixture|synthetic|real sample intake|submission schema"`:
    failed before implementation because fixture/synthetic payloads were
    accepted and the intake/schema artifacts lacked the guardrail.
- Targeted GREEN checks:
  - `npm --workspace apps/web run test -- realSampleDropIn.test.ts app/api/real-sample-drop-in/route.test.ts realSampleIntakePackage.test.ts liveInputSubmissionSchema.test.ts -t "fixture|synthetic|real sample intake|submission schema"`:
    4 passed, 14 skipped.
  - `npm --workspace apps/web run test -- realSampleDropIn.test.ts app/api/real-sample-drop-in/route.test.ts realSampleIntakePackage.test.ts app/api/real-sample-intake-package/route.test.ts liveInputSubmissionSchema.test.ts app/api/live-input-submission-schema/route.test.ts`:
    20 passed.

Next active slice:

- [x] Add offline real-sample file validation so authorized sample providers
      can check replay-ready shape and provenance before running the local web
      server.

Offline real-sample file check evidence:

- `npm run real-sample:check -- --offline <live-input-envelope.json>` now reads
  a local JSON envelope without calling the drop-in HTTP route.
- Offline mode validates the core replay-ready `live-input.v1` shape:
  schema version, intersection id, received timestamp, camera frame fields,
  detection class/direction/confidence/count, and signal snapshot fields.
- Offline mode also rejects `fixture` or `synthetic` identifiers before the
  sample reaches the POST route.
- The real-sample intake package and final local readiness export now expose
  both commands:
  - offline shape/provenance check
  - online `/api/real-sample-drop-in` validation
- Presentation docs now separate the server-free first pass from the local POST
  validation step.
- TDD RED checks:
  - `node --test scripts/real-sample-drop-in-check.test.mjs`:
    failed before implementation because `offline` still called `fetch`.
  - `npm --workspace apps/web run test -- realSampleIntakePackage.test.ts app/api/real-sample-intake-package/route.test.ts finalLocalReadiness.test.ts app/api/final-local-readiness/route.test.ts -t "offline|real sample intake|final local readiness"`:
    failed before the intake/readiness artifacts exposed the offline command.
- Targeted GREEN checks:
  - `node --test scripts/real-sample-drop-in-check.test.mjs`:
    4 passed.
  - `npm --workspace apps/web run test -- realSampleIntakePackage.test.ts app/api/real-sample-intake-package/route.test.ts finalLocalReadiness.test.ts app/api/final-local-readiness/route.test.ts -t "offline|real sample intake|final local readiness"`:
    4 passed.

Next active slice:

- [x] Extend real-sample provenance guardrails to reject placeholder, mock,
      example, or demo identifiers in addition to fixture/synthetic identifiers.

Real-sample placeholder/mock provenance guard evidence:

- `validateRealSampleDropInEnvelope()` now routes `placeholder`, `example`,
  `mock`, or `demo` identifiers in submitted intersection, camera/frame,
  detection, or signal-controller ids to manual review.
- The validator returns:
  - `accepted=false`
  - `replayStatus=replay_input_ready`
  - `operatorWorkflowStatus=manual_review_required`
  - `selectedPolicy=safety_hold`
  - `requiredInputs=["authorized_real_sample_identifiers"]`
  - `validationErrors=["placeholder_or_demo_sample_not_allowed"]`
- `POST /api/real-sample-drop-in` returns `400` for the same condition.
- `npm run real-sample:check -- --offline <live-input-envelope.json>` applies
  the same placeholder/mock/example/demo provenance guard without calling the
  local web server.
- The real-sample intake package, submission schema, and presentation docs now
  explain that template/demo/mock identifiers are not accepted as authorized
  real-sample evidence.
- TDD RED checks:
  - `npm --workspace apps/web run test -- realSampleDropIn.test.ts app/api/real-sample-drop-in/route.test.ts -t "placeholder|fixture"`:
    failed before implementation because placeholder/mock/example identifiers
    were accepted as `emergency_priority`.
  - `node --test scripts/real-sample-drop-in-check.test.mjs`:
    failed before implementation because offline mode accepted placeholder/mock
    identifiers.
- Targeted GREEN checks:
  - `npm --workspace apps/web run test -- realSampleDropIn.test.ts app/api/real-sample-drop-in/route.test.ts -t "placeholder|fixture"`:
    4 passed, 14 skipped.
  - `node --test scripts/real-sample-drop-in-check.test.mjs`:
    5 passed.

Next active slice:

- [x] Mirror real-sample drop-in guardrails in offline file validation so sample
      providers can catch weak or contradictory evidence before starting the
      local web server.

Offline guardrail mirror evidence:

- `npm run real-sample:check -- --offline <live-input-envelope.json>` now
  routes replay-ready but weak evidence to manual review before HTTP POST.
- Offline mode now mirrors these drop-in guardrails:
  - low-confidence detections -> `requiredInputs=["higher_confidence_detection"]`
    and `validationErrors=["detection confidence below 0.5"]`
  - stale signal snapshots -> `requiredInputs=["fresh_signal_snapshot"]` and
    `validationErrors=["signal snapshot older than 30 seconds"]`
  - conflicting queue axes -> `requiredInputs=["signal_phase.remaining_seconds"]`
    and `validationErrors=["conflicting_queue_axes"]`
  - emergency plus long-waiting pedestrian conflict ->
    `selectedPolicy=emergency_clearance`,
    `requiredInputs=["operator_conflict_review"]`, and
    `validationErrors=["emergency priority conflicts with waiting pedestrian"]`
- The real-sample intake package and presentation docs now describe offline
  validation as shape, provenance, and guardrail checking.
- TDD RED check:
  - `node --test scripts/real-sample-drop-in-check.test.mjs`:
    failed before implementation because offline mode accepted low-confidence,
    stale-signal, conflicting-queue, and emergency/pedestrian conflict payloads.
- Targeted GREEN check:
  - `node --test scripts/real-sample-drop-in-check.test.mjs`:
    9 passed.

Next active slice:

- [x] Add blocked reasons to the real-sample file-check summary so offline and
      online manual-review results are auditable from the CLI output.

Real-sample file-check blocked-reason evidence:

- `checkRealSampleDropInFile()` now includes `blockedReasons` in both online
  POST summaries and offline shape/guardrail summaries.
- The CLI output now prints `blockedReasons=...` alongside `requiredInputs`
  and `validationErrors`.
- Online summaries copy `operatorWorkflow.blockedReasons` from
  `/api/real-sample-drop-in`.
- Offline summaries derive `blockedReasons` from the same guardrail errors
  used for `validationErrors`.
- Presentation docs now state that manual-review file-check output can be
  audited without opening source code.
- TDD RED check:
  - `node --test scripts/real-sample-drop-in-check.test.mjs`:
    failed before implementation because `blockedReasons` was missing from the
    summary and output.
- Targeted GREEN check:
  - `node --test scripts/real-sample-drop-in-check.test.mjs`:
    9 passed.

Next active slice:

- [x] Align the frontend synthetic replay evaluator with the backend policy
      rule that an emergency vehicle without known direction must not be
      guessed into an emergency-priority lane.

Frontend/backend policy alignment evidence:

- `SyntheticDetection.direction` can now represent `null` for synthetic
  replay-only evidence gaps, while `live-input.v1` still requires a supported
  direction before it becomes replay-compatible real-source input.
- `buildSyntheticReplayTimeline()` now derives
  `summary.emergencyDirectionKnown`.
- `recommendFromSyntheticFrame()` now keeps `blocked_response` as the first
  safety gate, then returns `safety_hold` for emergency detections whose
  direction is unknown, matching the backend `safety_hold` behavior instead of
  guessing `emergency_priority`.
- TDD RED check:
  - `npm --workspace apps/web run test -- syntheticReplay.test.ts syntheticEvaluation.test.ts`:
    failed before implementation because `emergencyDirectionKnown` was missing
    and unknown-direction emergency frames returned `emergency_priority`.
- Targeted GREEN check:
  - `npm --workspace apps/web run test -- syntheticReplay.test.ts syntheticEvaluation.test.ts`:
    8 passed.

Next active slice:

- [x] Add congestion/queue-relief coverage to synthetic evaluation so the
      benchmark measures the second project target, congestion mitigation,
      instead of only emergency, pedestrian, blocked, and normal cases.

Synthetic congestion evaluation evidence:

- `generateSyntheticScenarioDataset()` now includes a `congestion` family
  whose expected recommendation is `queue_relief` with reason
  `queue_threshold_exceeded`.
- Synthetic congestion cases keep a single-axis queue above the local backend
  threshold, while pedestrian and normal synthetic cases clamp baseline queues
  below that threshold so their expected outcomes stay distinct.
- `recommendFromSyntheticFrame()` and `recommendFromLiveReplayInput()` now
  return `queue_relief` for high single-axis vehicle pressure after safety and
  emergency gates.
- Synthetic evaluation reports and `live-input.v1` JSON exports now include
  the `congestion` family in their family summaries.
- TDD RED check:
  - `npm --workspace apps/web run test -- syntheticScenarios.test.ts syntheticEvaluation.test.ts syntheticEvaluationReport.test.ts syntheticLiveInputDataset.test.ts`:
    failed before implementation because `congestion` family summaries were
    missing and high-queue replay detections returned `normal_cycle`.
- Targeted GREEN check:
  - `npm --workspace apps/web run test -- syntheticScenarios.test.ts syntheticEvaluation.test.ts syntheticEvaluationReport.test.ts syntheticLiveInputDataset.test.ts`:
    24 passed.
- Broader checks:
  - `npm run test:web`: 61 files, 373 tests passed.
  - `npm run build:web`: passed.
  - `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py -q`:
    19 passed.
- Playwright dashboard check with local web/API servers:
  - desktop synthetic evaluation card visible, `congestion` row present,
    horizontal overflow 0.
  - mobile synthetic evaluation card visible, `congestion` row present,
    horizontal overflow 0.
  - `/api/traffic/cctv-flow` returned 503 in the local environment, but it did
    not block the synthetic evaluation card proof.

Next active slice:

- [x] Add no-vehicle pedestrian-wait coverage to synthetic evaluation so the
      benchmark measures the third project target: pedestrians should not wait
      unnecessarily when there is no vehicle pressure.

Synthetic no-vehicle pedestrian evidence:

- `generateSyntheticScenarioDataset()` now models `pedestrian` cases without
  positive-count vehicle detections, while keeping long-waiting pedestrian
  detections and the `pedestrian_priority` expected recommendation.
- `buildSyntheticReplayTimeline()` now exposes
  `summary.vehiclePressurePresent`, so reports and future scorecards can
  distinguish pedestrian waiting with and without vehicle pressure.
- TDD RED check:
  - `npm --workspace apps/web run test -- syntheticScenarios.test.ts syntheticReplay.test.ts`:
    failed before implementation because pedestrian cases still included a
    positive vehicle queue and replay summaries did not expose
    no-vehicle pressure.
- Targeted GREEN checks:
  - `npm --workspace apps/web run test -- syntheticScenarios.test.ts syntheticReplay.test.ts`:
    12 passed.
  - `npm --workspace apps/web run test -- syntheticScenarios.test.ts syntheticReplay.test.ts syntheticEvaluation.test.ts syntheticEvaluationReport.test.ts syntheticLiveInputDataset.test.ts`:
    30 passed.
- Broader checks:
  - `npm run test:web`: 61 files, 375 tests passed.
  - `npm run build:web`: passed.
  - `apps/api/.venv/bin/pytest apps/api/tests/test_recommendations.py -q`:
    19 passed.

Next active slice:

- [x] Add presentation-ready policy evidence to the synthetic evaluation report
      so the dashboard explains which local policy each scenario family proves,
      not only aggregate pass/fail counts.

Synthetic policy evidence evidence:

- `SyntheticEvaluationDashboardReport` now includes `policyEvidence` entries
  for:
  - `safety_gate` from `blocked_response` and `intersection_blocked`
  - `emergency_clearance` from `emergency_priority` and
    `emergency_vehicle_approach`
  - `queue_relief` from `queue_relief` and `queue_threshold_exceeded`
  - `pedestrian_efficiency` from `pedestrian_priority` and
    `pedestrian_waiting`
  - `maintain_cycle` from `normal_cycle` and `normal_flow`
- The dashboard synthetic evaluation card now renders a compact
  `Policy Evidence` block with policy id, reason code, and passed/total count.
- TDD RED check:
  - `npm --workspace apps/web run test -- syntheticEvaluationReport.test.ts DashboardShell.test.tsx -t "presentation-ready report|shows synthetic evaluation evidence"`:
    failed before implementation because `policyEvidence` was missing from the
    report and the dashboard card did not render `Policy Evidence`.
- Targeted GREEN check:
  - `npm --workspace apps/web run test -- syntheticEvaluationReport.test.ts DashboardShell.test.tsx -t "presentation-ready report|shows synthetic evaluation evidence"`:
    2 passed, 93 skipped.
- Broader checks:
  - `npm run test:web`: 61 files, 375 tests passed.
  - `npm run build:web`: passed.
- Playwright dashboard check with local web/API servers:
  - desktop synthetic evaluation card visible, `Policy Evidence` present,
    `queue_relief` and `intersection_blocked` present, horizontal overflow 0.
  - mobile synthetic evaluation card visible, `Policy Evidence` present,
    `queue_relief` and `intersection_blocked` present, horizontal overflow 0.
- Process note:
  - If future work starts repeating synthetic-only polish without improving
    the requested end state, stop implementation and review project problems
    before continuing.

Next active slice:

- [ ] Once an authorized CCTV frame/video and signal timing sample are
      available, POST the real `live-input.v1` envelope to
      `/api/real-sample-drop-in` and refresh the same demo evidence,
      scorecard contract, final readiness, intake package, health, and
      presentation flow.

## Validation

Run after each completed slice:

- `npm run test:web`
- `npm run build:web`

For dashboard UI changes, also use Playwright screenshots and overflow checks.

## Constraints

- Use the dedicated work branch only for this thread.
- Do not merge into local or remote `main`.
- At the end of each completed part, commit and push the work branch.
- Do not call OpenAI unless the user approves the specific live check or budget
  scope. Current approval covered real dashboard verification within the stated
  test budget.
- Keep changes local and scoped.
- Prefer existing TypeScript/Vitest patterns.
- Preserve the current dashboard while adding evaluation capability.
