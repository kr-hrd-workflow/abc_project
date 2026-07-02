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

The next required sample is a fresh authorized camera detector output plus a
camera-to-approach calibration. Signal timing is now represented by a
key-backed Seoul/T-DATA V2X cardinal sample, so the remaining live drop-in
blocker is the camera side:

- `authorized-camera-detector-output.v1` for a current frame and object counts
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

## Readiness Contract

The real-sample readiness APIs now report:

```text
status=signal_ready_waiting_for_fresh_camera_and_calibration
```

This means the project is no longer missing every authorized sample. It has:

- an authorized historical AI-Hub CCTV frame and vehicle bbox label sample
- a local AI-Hub label adapter for evidence summaries and guarded
  `live-input.v1` conversion
- a Seoul V2X remaining-time adapter based on the downloaded T-DATA service
  guide fields and key-backed live response samples, including a cardinal
  signal row that can populate `live-input.v1.signalSnapshot`
- an authorized camera detector output adapter contract for fresh frame
  detections once a matching camera approach calibration is supplied

The remaining blockers are narrower:

- `fresh_camera_frame_required_for_live_drop_in`
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
