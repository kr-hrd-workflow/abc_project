# AI-Hub 71573 Sample Intake

## Status

An authorized AI-Hub light sample was downloaded for dataset 71573,
`CCTV 기반 차량정보 및 교통정보 계측 데이터`.

The full downloaded archive is intentionally kept outside git:

```text
/Users/jeong-gwiin/Downloads/Sample.zip
```

The local ignored extract is:

```text
output/real-samples/aihub-71573/provenance.json
output/real-samples/aihub-71573/labels/C-221008_14_CR06_01_A0341.json
output/real-samples/aihub-71573/images/C-221008_14_CR06_01_A0341.jpg
```

## What The Sample Proves

- The project now has an authorized real CCTV image sample.
- The matching label JSON contains vehicle bbox annotations from an AI-Hub
  sample, not a synthetic fixture.
- The sample can ground detector evidence such as camera id, frame id,
  location, capture timestamp, image resolution, GPS, and vehicle bbox count.

## What The Sample Does Not Prove

- It does not include approach direction per detected vehicle.
- It does not include signal phase or signal remaining time.
- It does not prove live CCTV stream access.
- It does not prove a real signal-controller integration.
- Because the sample frame is historical, it should not be submitted as a live
  observation with a current `receivedAt` timestamp. The real-sample drop-in
  guardrail now routes camera frames older than 30 seconds to manual review with
  `fresh_camera_frame`.

## Adapter Boundary

`apps/web/lib/aiHubVehicleSampleAdapter.ts` converts AI-Hub vehicle appearance
labels into:

- an evidence summary, always safe to build from the label
- a `live-input.v1` envelope only when external calibration supplies:
  - `approachDirection`
  - `signalSnapshot`
- a calibrated `live-input.v1` envelope when an
  `aihub-camera-approach-calibration.v1` mapping matches the sample
  `locationId` and `cameraId`

This avoids inventing direction or signal timing from image labels that do not
contain those facts.

If the calibration mapping does not contain the exact AI-Hub camera, the adapter
throws:

```text
camera-to-approach calibration is required for <cameraId> at <locationId>
```

The code contract is now ready, but the actual field calibration evidence still
has to come from an operator camera survey, road geometry review, or another
trusted source.

## Next Data Need

The next required input is a camera-to-approach calibration for the fresh
Gyeonggi detector output. Signal timing is now represented by a key-backed
Seoul/T-DATA V2X cardinal sample, and the camera side now has a fresh HLS frame
plus YOLO detector output. The remaining live drop-in blocker is:

- `camera-approach-calibration.v1` for the operator-verified direction mapping

## Seoul V2X Signal Timing Adapter

The T-DATA service guide was downloaded to ignored local output:

```text
output/real-samples/public-data/seoul-v2x-signal-remaining-time-service-guide-v1.0.pdf
output/real-samples/public-data/seoul-v2x-signal-remaining-time-service-guide-v1.0.txt
```

The public T-DATA page exposes this endpoint:

```text
http://t-data.seoul.go.kr/apig/apiman-gateway/tapi/v2xSignalPhaseTimingInformation/1.0
```

The adapter in `apps/web/lib/seoulV2xSignalAdapter.ts` maps a T-DATA response
object into a `live-input.v1` `signalSnapshot` by using the strongest cardinal
straight-signal remaining-time field:

```text
ntStsgRmdrCs -> north_priority
etStsgRmdrCs -> east_priority
stStsgRmdrCs -> south_priority
wtStsgRmdrCs -> west_priority
```

T-DATA describes these values as remaining time in 1/10 seconds, so the adapter
converts them to integer seconds using ceiling division by 10.

The adapter does not invent a next phase. `nextPhase`, `controllerMode`, and
`manualOverride` must come from operator/source calibration when building the
`LiveSignalSnapshot`.

The same conversion is exposed as a local file builder:

```bash
npm run real-sample:build-signal-snapshot -- \
  <seoul-v2x-response.json> \
  <signal-snapshot.json> \
  <nextPhase> \
  <controllerMode> \
  <manualOverride>
```

Those last three values are required on purpose. T-DATA remaining-time rows do
not prove the next phase, controller mode, or manual override state by
themselves, so the builder will not invent defaults for them.

On 2026-07-02, a T-DATA development application for data `10120` was submitted
and approved in the logged-in account. A key-backed live response was fetched
and stored outside git:

```text
output/real-samples/public-data/seoul-v2x-signal-live-sample-10120.json
output/real-samples/public-data/seoul-v2x-signal-live-sample-10120-provenance.json
output/real-samples/public-data/seoul-v2x-signal-live-broad-sample-10120.json
output/real-samples/public-data/seoul-v2x-signal-live-broad-sample-10120-provenance.json
output/real-samples/public-data/seoul-v2x-signal-live-cardinal-sample-10120.json
output/real-samples/public-data/seoul-v2x-signal-live-cardinal-sample-10120-provenance.json
```

The API key is not stored. The captured response uses an array of messages, so
`selectLatestSeoulV2xSignalMessage` picks the newest message by `trsmUtcTime`.

The first `itstId=23665` sample contained diagonal straight-signal fields such
as `seStsgRmdrCs` and `nwStsgRmdrCs`, while `live-input.v1` currently models
only cardinal phases:

```text
north_priority, east_priority, south_priority, west_priority, normal_cycle
```

A broader key-backed request without fixed `itstId` returned 100 rows, including
82 rows with cardinal straight-signal fields. One cardinal row was saved as
`seoul-v2x-signal-live-cardinal-sample-10120.json`. The adapter can now build a
`LiveSignalSnapshot` from this real cardinal sample.

## Police CrossRoadInfo Metadata Adapter

The public data portal application for `경찰청_교차로기반정보서비스` was approved
for local development use on 2026-07-02. The working portal key row returned
`NORMAL_SERVICE` for both:

```text
getCrossRoadInfoList
getCrossRoadInfoDetail
```

The raw key-backed responses are stored outside git with credentials redacted:

```text
output/real-samples/public-data/police-crossroad-info-list-live-sample.json
output/real-samples/public-data/police-crossroad-info-list-live-sample-provenance.json
output/real-samples/public-data/police-crossroad-info-detail-live-sample.json
output/real-samples/public-data/police-crossroad-info-detail-live-sample-provenance.json
```

`apps/web/lib/policeCrossroadInfoAdapter.ts` normalizes this response shape into:

- intersection metadata from `REGION_CD`, `INT_NO`, `INT_NM`, `X_COORD`,
  `Y_COORD`, and `UPD_DTIME`
- signal-plan metadata from `MAP_NO`, `INT_MAINPHASE`, and non-empty
  `A_RING_*_PHASE_CONF_CD` / `B_RING_*_PHASE_CONF_CD` values

This evidence is exported as `police-crossroad-info-metadata.v1` through the
real-sample intake package, demo evidence export, final readiness summary, and
real-sample source schema endpoint.

The adapter deliberately does not interpret the phase configuration code
semantics. It preserves the codes as metadata only. This data does not prove:

- live CCTV detections
- emergency-vehicle telemetry
- camera-to-approach direction calibration
- the current active `live-input.v1` signal phase
- direct signal-controller integration

## Freshness Guardrail

`/api/real-sample-drop-in` and `npm run real-sample:check -- --offline` both
require fresh observations before accepting a replay-ready sample:

```text
signalSnapshot.capturedAt must be within 30 seconds of receivedAt
cameraFrames[].capturedAt must be within 30 seconds of receivedAt
```

This keeps historical AI-Hub frames useful as authorized detector evidence, but
prevents them from being mistaken for current live CCTV truth.

## Authorized Camera Detector Adapter

`apps/web/lib/authorizedCameraDetectorAdapter.ts` defines the next source
contract for fresh camera-side input:

```text
authorized-camera-detector-output.v1
```

This source format supplies:

- `intersectionId`
- `cameraId`
- `frameId`
- `capturedAt`
- detector rows with `objectId`, `classLabel`, `confidence`, and `count`

The adapter intentionally does not accept direction from the detector output.
It only builds a `live-input.v1` envelope when a matching
`camera-approach-calibration.v1` mapping supplies the operator-verified
approach direction for the exact `intersectionId` and `cameraId`.

With a fresh detector output, matching calibration, and the T-DATA-backed
`LiveSignalSnapshot`, the produced envelope is accepted by
`validateRealSampleDropInEnvelope`. Without the calibration, conversion fails
with:

```text
camera-to-approach calibration is required for <cameraId> at <intersectionId>
```

The same conversion is also exposed as a local file builder:

```bash
npm run real-sample:build-camera-envelope -- \
  <detector-output.json> \
  <camera-calibration.json> \
  <signal-snapshot.json> \
  <live-input-envelope.json>
```

The builder writes a `live-input.v1` envelope, then the existing validation
commands should be run:

```bash
npm run real-sample:check -- --offline <live-input-envelope.json>
npm run real-sample:check -- <live-input-envelope.json>
```

## Gyeonggi Live CCTV Frame And YOLO Detector Output

On 2026-07-02, the Gyeonggi traffic information CCTV list API returned live CCTV
metadata and HLS URLs. The direct `cctvImg` JPEG URLs returned HTTP 401 during
sampling, but the HLS `liveUrl` returned a current playlist and MPEG transport
stream segment.

The local ignored evidence bundle is:

```text
output/real-samples/public-data/gyeonggi-cctv/gyeonggi-cctv-live-segment.ts
output/real-samples/public-data/gyeonggi-cctv/gyeonggi-cctv-live-frame.jpg
output/real-samples/public-data/gyeonggi-cctv/gyeonggi-cctv-live-segment-provenance.json
output/real-samples/public-data/gyeonggi-cctv/gyeonggi-cctv-yolo-detector-output.json
```

The frame was extracted from the HLS segment using:

```text
/Applications/Shotcut.app/Contents/MacOS/ffmpeg
```

The extracted frame is `1280x720`. Local vision runtime setup was re-enabled by
installing the API `vision` extra and downloading `yolov8n.pt` to the ignored
model path:

```text
apps/api/models/yolov8n.pt
```

`npm run runtime:readiness:strict -- --section vision` now reports
`vision ready=True`. PyTorch reports Apple MPS availability on this machine, so
this single-frame YOLO run does not currently require Colab or another external
GPU. If future work needs batch video inference, multi-camera processing, or a
larger model, external GPU execution should be reconsidered.

The new local builder converts an extracted frame into
`authorized-camera-detector-output.v1`:

```bash
npm run real-sample:build-yolo-detector-output -- \
  <frame-image.jpg> \
  <detector-output.json> \
  <intersectionId> \
  <cameraId> \
  <capturedAt> \
  [modelPath] \
  [confidenceThreshold]
```

For the captured Gyeonggi frame, YOLO detected one vehicle with confidence
`0.3071170151233673`, producing:

```text
output/real-samples/public-data/gyeonggi-cctv/gyeonggi-cctv-yolo-detector-output.json
```

This is now fresh camera-side detector evidence, but it still does not prove
camera-to-approach direction. A matching `camera-approach-calibration.v1` file
is still required before building a replay-ready `live-input.v1` envelope.

The local calibration builder is available, but must only be run after
operator/map review supplies an explicit direction for the exact intersection
and camera:

```bash
npm run real-sample:build-camera-calibration -- \
  <camera-calibration.json> \
  <intersectionId> \
  <cameraId> \
  <approachDirection> \
  <evidence>
```

The builder accepts only `north`, `south`, `east`, or `west` for
`approachDirection`. It does not infer direction from the detector box position,
the YOLO class label, or the CCTV frame alone.

For `gyeonggi-cctv-61860`, the current review packet is intentionally kept as a
non-calibration artifact because the evidence is not enough to truthfully set
the approach direction:

```text
output/real-samples/public-data/gyeonggi-cctv/calibration-review/
```

The CCTV coordinate is near `도곡로` / `삼성로`, and cropped review images were
created for operator inspection. That narrows the map review, but it is not a
trusted direction mapping by itself.

## Ingye Intersection ROI Detector Sample

On 2026-07-03, the same Gyeonggi CCTV API was used to probe additional urban
intersection HLS feeds. `1771` / `인계사거리` produced a clearer fresh frame
than the `은마아파트` sample. The ignored local bundle is:

```text
output/real-samples/public-data/gyeonggi-cctv-ingye-1771/ingye-live-segment.ts
output/real-samples/public-data/gyeonggi-cctv-ingye-1771/ingye-live-frame.jpg
output/real-samples/public-data/gyeonggi-cctv-ingye-1771/ingye-live-segment-provenance.json
output/real-samples/public-data/gyeonggi-cctv-ingye-1771/ingye-yolo-detector-output.json
output/real-samples/public-data/gyeonggi-cctv-ingye-1771/ingye-seoul-yolo-detector-output.json
output/real-samples/public-data/gyeonggi-cctv-ingye-1771/ingye-osan-yolo-detector-output.json
```

The full-frame YOLO detector output found 24 vehicles. The frame visibly mixes
opposing directions, with `서울` and `오산` overlays in the same camera view.
Therefore the full frame must not be mapped to a single
`camera-approach-calibration.v1` direction.

The local ROI builder exposes the safer approach:

```bash
npm run real-sample:build-camera-roi-frame -- \
  <frame-image.jpg> \
  <roi-output.jpg> \
  <x> \
  <y> \
  <width> \
  <height>
```

For the current `인계사거리` frame:

- the `서울` ROI detector output found 15 vehicles and 1 pedestrian
- the `오산` ROI detector output found 18 vehicles
- `서울` is a `north` candidate and `오산` is a `south` candidate, but both
  remain operator-confirmation candidates, not final calibration

The ROI review artifact is:

```text
output/real-samples/public-data/gyeonggi-cctv-ingye-1771/calibration-review/ingye-1771-roi-calibration-candidate.json
```

After operator/map review confirms the ROI directions, multiple ROI detector
outputs for the same intersection can be combined into one `live-input.v1`
envelope instead of forcing one direction onto the full CCTV frame:

```bash
npm run real-sample:build-multi-camera-envelope -- \
  <detector-output-a.json,detector-output-b.json> \
  <camera-calibration.json> \
  <signal-snapshot.json> \
  <live-input-envelope.json>
```

For `인계사거리`, those detector outputs should share the same
`intersectionId` such as `gyeonggi-cctv-1771`, while using distinct ROI camera
ids such as `gyeonggi-cctv-1771-seoul-roi` and
`gyeonggi-cctv-1771-osan-roi`. The builder rejects mixed intersection ids and
still requires a matching `camera-approach-calibration.v1` entry for each ROI
camera id. It also still requires a current signal snapshot for the same
intersection context before the resulting envelope can be treated as an
accepted real sample.

The strongest public candidate found for that missing same-intersection signal
snapshot is now tracked separately:

```text
docs/data/national-traffic-signal-real-time-candidate.md
```

That source is the 2026 nationwide traffic-signal real-time API from
행정안전부/한국지역정보개발원. It exposes `crsrd_map_info` and `tl_drct_info`
operations in Swagger. The development application was automatically approved
on 2026-07-03. A retry reached the documented response envelope, but exact
`stdgCd=4111514100` returned `K3` / `NODATA_ERROR`, and a paged coverage scan
found only 서울특별시, 울산광역시, and 제주특별자치도 map data plus 서울특별시
and 울산광역시 signal remaining-time data. It therefore does not currently prove
`인계사거리` signal timing coverage.

This keeps the project boundary honest: multi-direction CCTV frames need
approach-specific crops or detector lane/track geometry before detections can
be mapped into `live-input.v1.direction`.

When a fresh detector output, matching camera calibration, and Seoul V2X raw
response are all available, the same preparation can be run as one local
command:

```bash
npm run real-sample:prepare-live-input -- \
  <detector-output.json> \
  <camera-calibration.json> \
  <seoul-v2x-response.json> \
  <signal-snapshot.json> \
  <live-input-envelope.json> \
  <nextPhase> \
  <controllerMode> \
  <manualOverride>
```

This command builds the `signal-snapshot.json`, builds the
`live-input-envelope.json`, and runs the offline `real-sample:check` guardrail
path. It does not bypass the freshness, provenance, confidence, queue-conflict,
or calibration checks.

The source-side JSON contracts are exposed without sample data at:

```text
/api/real-sample-source-schema
```

This endpoint describes the accepted shapes for
`authorized-camera-detector-output.v1`, `camera-approach-calibration.v1`,
Seoul V2X raw responses, and `signal-snapshot-input.v1`. It does not replace
`real-sample:check`; freshness, provenance, and policy guardrails still run
through the drop-in validation path.

## Readiness Contract

The real-sample readiness APIs now report:

```text
status=signal_ready_waiting_for_fresh_camera_and_calibration
```

This means the project is no longer missing every authorized sample. It has:

- an authorized historical AI-Hub CCTV frame and vehicle bbox label sample
- a fresh Gyeonggi live CCTV HLS frame and local YOLO detector output sample
- a local AI-Hub label adapter for evidence summaries and guarded
  `live-input.v1` conversion
- a Seoul V2X remaining-time adapter based on the downloaded T-DATA service
  guide fields and key-backed live response samples, including a cardinal
  signal row that can populate `live-input.v1.signalSnapshot`
- an authorized camera detector output adapter contract for fresh frame
  detections once a matching camera approach calibration is supplied
- a source schema endpoint for the detector output, calibration, Seoul V2X raw
  response, and signal snapshot files used by the local builders
- a single local prepare command that chains the signal snapshot builder,
  camera detector envelope builder, and offline real-sample validation

The remaining blockers are narrower:

- `camera_approach_calibration_required`

## Related Public Data Sample

The public data portal file
`경상남도_긴급차량 우선신호시스템 위치_20251231.csv` was also downloaded and
copied to ignored local output:

```text
output/real-samples/public-data/gyeongnam-emergency-priority-locations-20251231.csv
```

This CSV contains emergency-priority signal-system installation locations. It is
useful as real infrastructure provenance for the emergency-priority problem, but
it is not emergency vehicle telemetry and it does not provide signal phase or
remaining-time samples.

The public data portal technical guide for
`경찰청_교차로기반정보서비스` was also downloaded to ignored local output:

```text
output/real-samples/public-data/police-intersection-base-info-service-guide-20230925.docx
output/real-samples/public-data/police-intersection-base-info-service-guide-20230925.txt
```

This API is a candidate source for intersection and signal-plan metadata. The
guide documents:

- `getCrossRoadInfoList`, returning `REGION_CD`, `INT_NO`, `INT_NM`,
  `X_COORD`, `Y_COORD`, and `UPD_DTIME`
- `getCrossRoadInfoDetail`, returning `MAP_NO` and
  `A_RING_*_PHASE_CONF_CD` / `B_RING_*_PHASE_CONF_CD`
- phase direction codes where the first character indicates straight,
  left-turn, or pedestrian movement, followed by entry/exit angles

This data can strengthen signal-plan provenance, but it is not a camera frame,
detector output, emergency vehicle telemetry, or operator-verified
camera-to-approach calibration. A `serviceKey=test` request returned
`Unauthorized`, so a real 공공데이터포털 ServiceKey or 활용신청 is required
before collecting live response samples.

On 2026-07-02, a 공공데이터포털 development application for
`경찰청_교차로기반정보서비스` was submitted and approved in the logged-in
account. The approval page showed `처리상태=승인` and an availability window
from 2026-07-02 to 2028-07-02. The issued key is not stored in git or local
output provenance.

After the portal key page showed both `신규발급` and `재발급` rows, the
`신규발급` row key was the one that returned `NORMAL_SERVICE`; the `재발급`
row still returned HTTP 401 during this check. The working-key samples for both
operations were saved outside git:

```text
output/real-samples/public-data/police-crossroad-info-list-live-sample.json
output/real-samples/public-data/police-crossroad-info-list-live-sample-provenance.json
output/real-samples/public-data/police-crossroad-info-detail-live-sample.json
output/real-samples/public-data/police-crossroad-info-detail-live-sample-provenance.json
```

`getCrossRoadInfoList` returned a normal response with one `시청` intersection
metadata row, including `REGION_CD`, `INT_NO`, `INT_NM`, `X_COORD`, `Y_COORD`,
and `UPD_DTIME`. `getCrossRoadInfoDetail` returned normal signal-plan metadata
with `MAP_NO`, `INT_MAINPHASE`, and A/B ring phase configuration code fields.
The provenance files redact the key and keep the same truth boundary: this
source can only support intersection and signal-plan metadata, not live detector
truth.
