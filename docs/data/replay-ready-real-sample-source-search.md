# Replay-Ready Real Sample Source Search

## Status

Updated on 2026-07-03.

The strongest replay-ready path is no longer `인계사거리`. After visual review,
the current best candidate is:

```text
Intersection: 서울특별시 시청
Camera: TOPIS CCTV camId=190, camName=시청
Signal candidate: 전국 통합데이터 교통안전 신호등 실시간 정보 crsrdId=2904
```

This pair is stronger than the earlier `선사사거리` candidate because the TOPIS
`시청` frame visibly contains a multi-leg signalized intersection, crosswalks,
vehicles, and pedestrians. The national traffic-signal coverage report also
contains 서울특별시 `시청` rows, including `crsrdId=2904`.

It is not yet a complete replay-ready sample because the current
same-intersection signal-direction row still needs a valid approved key probe
for `tl_drct_info`.

## Verified Camera-Side Evidence

TOPIS public CCTV page:

```text
https://topis.seoul.go.kr/map/openCctvMap.do
```

Public page behavior inspected:

- `POST /map/cctv/selectCctvList.do` returns CCTV search rows.
- `POST /map/selectCctvInfo.do` returns the selected CCTV detail row.
- The detail row includes an HLS URL used by the TOPIS web player.

Local candidate probes:

```text
output/real-samples/public-data/seoul-topis-cctv/topis-cctv-190.raw.json
output/real-samples/public-data/seoul-topis-cctv/topis-cctv-190.redacted.json
output/real-samples/public-data/seoul-topis-cctv/topis-cctv-299.raw.json
output/real-samples/public-data/seoul-topis-cctv/topis-cctv-299.redacted.json
```

The raw file is ignored output and contains the fetched TOPIS detail response.
The redacted file removes `hlsUrl`.

Frame extraction:

```text
output/real-samples/public-data/seoul-topis-cctv/topis-시청-190-live-frame.jpg
output/real-samples/public-data/seoul-topis-cctv/topis-시청-190-live-frame-provenance.json
output/real-samples/public-data/seoul-topis-cctv/topis-seonsa-cctv-299-live-frame.jpg
output/real-samples/public-data/seoul-topis-cctv/topis-seonsa-cctv-299-live-frame-provenance.json
```

Detector output:

```text
output/real-samples/public-data/seoul-topis-cctv/topis-cityhall-cctv-190-yolo-detector-output.json
output/real-samples/public-data/seoul-topis-cctv/topis-seonsa-cctv-299-yolo-detector-output.json
```

Calibration review packet:

```text
output/real-samples/public-data/seoul-topis-cctv/topis-cityhall-cctv-190-calibration-review-packet.json
```

This packet is intentionally not a calibration file. It records the frame,
detector output, allowed approach directions, and the exact
`real-sample:build-camera-calibration` command template, while keeping
`status=needs_operator_direction_confirmation` and omitting
`approachDirection`.

Best observed detector result:

```text
schemaVersion: authorized-camera-detector-output.v1
intersectionId: seoul-topis-cityhall-2904
cameraId: topis-cctv-190
capturedAt: 2026-07-03T04:55:20.271Z
detectionCount: 9
classCounts: vehicle=9
```

The `시청` frame visually shows a real Seoul signalized intersection with
crosswalks and multiple approach lanes. This is real camera-side evidence, not
synthetic or fixture data.

The earlier `선사사거리` frame remains useful as proof that TOPIS HLS can be
captured, but it is weaker as a replay-ready intersection sample because the
visible view is mostly a straight roadway corridor rather than an intersection
decision scene.

## Signal-Side Evidence

Official public-data candidate:

```text
행정안전부 한국지역정보개발원_(전국 통합데이터) 교통안전 신호등 실시간 정보
https://www.data.go.kr/data/15157604/openapi.do
```

Previous approved-key coverage probe:

```text
output/real-samples/public-data/national-traffic-signal/national-traffic-signal-coverage-probe.json
```

Relevant row from that report:

```text
operation: crsrd_map_info
stdgCd: 1100000000
lclgvNm: 서울특별시
crsrdId: 2904
crsrdNm: 시청
totDt: 20260703050032
```

This proves that the national signal API contains a map/intersection metadata
candidate for the same named intersection as TOPIS CCTV `camId=190`.

Current blocker:

```text
same_intersection_signal_direction_row_required
```

The project still needs a successful approved-key `tl_drct_info` probe for
`crsrdId=2904` before building a `LiveSignalSnapshot`. A retry with a
different previously provided public-data key returned HTTP 401, so that key is
not authorized for publicDataPk `15157604`. Chrome, the Codex Chrome Extension,
and the native host were installed and enabled, but extension communication
still failed after opening a fresh Chrome window, so the service-approved key
could not be recovered automatically in this pass.

The local conversion path is now ready once that key-backed row is available:

```bash
npm run real-sample:build-national-signal-snapshot -- \
  <national-tl-drct-info-response.json> \
  <signal-snapshot.json> \
  2904 \
  <nextPhase> \
  <controllerMode> \
  <manualOverride>
```

The one-shot local prepare path is also wired for the same source. Once the
detector output, camera calibration, and approved-key `tl_drct_info` response
are all available, this command builds the signal snapshot, builds the
`live-input.v1` envelope, and runs offline validation:

```bash
npm run real-sample:prepare-national-live-input -- \
  <detector-output.json> \
  <camera-calibration.json> \
  <national-tl-drct-info-response.json> \
  <signal-snapshot.json> \
  <live-input-envelope.json> \
  2904 \
  <nextPhase> \
  <controllerMode> \
  <manualOverride>
```

## Other Sources Checked

### Gyeonggi GITS CCTV

Official API/manual:

```text
https://openapigits.gg.go.kr/api/jsp/manual_getCctvInfoList.jsp?m1=2&m2=0
https://openapigits.gg.go.kr/api/jsp/manual_getCctvKtictInfo.jsp?m1=2&m2=7
```

Status:

- Successfully produced fresh HLS frames and YOLO detector output earlier.
- `인계사거리` camera evidence is useful, but the national signal API currently
  has no Gyeonggi/Suwon/`인계사거리` coverage.
- Therefore it remains camera-side evidence only.

### UTIC

Public CCTV/map page:

```text
https://www.utic.go.kr/map/map.do?menu=cctv
```

Status:

- Page exposes CCTV UI and traffic APIs.
- A 2026-05-28 notice indicates CCTV video-use restrictions.
- Less promising than TOPIS for immediate replay-ready work.

### Seoul Police Traffic Center

Public page:

```text
https://www.spatic.go.kr/
```

Status:

- The page contains an HLS player and sample live HLS references.
- It is potentially useful as another Seoul camera source.
- TOPIS is currently better because it has searchable CCTV metadata and a
  direct `시청` and `선사사거리` matches.

### Seoul TOPIS Open API Page

Reference page:

```text
https://topis.seoul.go.kr/refRoom/openRefRoom_4.do
```

Status:

- Useful for official TOPIS API discovery.
- The immediate camera frame was obtained from the public TOPIS CCTV web page,
  not from a TOPIS API key.

## Replay-Ready Completion Path

The shortest honest path to a complete `live-input.v1` real sample is:

1. Reopen or recover the logged-in 공공데이터포털 development account page for
   publicDataPk `15157604`.
2. Use the approved key only in memory to fetch `tl_drct_info` pages until
   `crsrdId=2904` is found.
3. Convert the matched row into a signal snapshot with:

   ```bash
   npm run real-sample:build-national-signal-snapshot -- \
     <national-tl-drct-info-response.json> \
     <signal-snapshot.json> \
     2904 \
     <nextPhase> \
     <controllerMode> \
     <manualOverride>
   ```

   This builder converts national API centiseconds to seconds and still
   requires operator-supplied `nextPhase`, `controllerMode`, and
   `manualOverride`.
4. Add an operator/map-reviewed `camera-approach-calibration.v1` for TOPIS
   `camId=190`; do not infer approach direction from the frame.
   The current review packet is:

   ```text
   output/real-samples/public-data/seoul-topis-cctv/topis-cityhall-cctv-190-calibration-review-packet.json
   ```

   To regenerate it:

   ```bash
   npm run real-sample:build-camera-calibration-review -- \
     output/real-samples/public-data/seoul-topis-cctv/topis-cityhall-cctv-190-yolo-detector-output.json \
     output/real-samples/public-data/seoul-topis-cctv/topis-시청-190-live-frame.jpg \
     output/real-samples/public-data/seoul-topis-cctv/topis-cityhall-cctv-190-calibration-review-packet.json \
     "<operator/map review context>"
   ```
5. Build the final envelope either as separate steps:

   ```bash
   npm run real-sample:build-multi-camera-envelope -- \
     output/real-samples/public-data/seoul-topis-cctv/topis-cityhall-cctv-190-yolo-detector-output.json \
     <camera-calibration.json> \
     <signal-snapshot.json> \
     <live-input-envelope.json>
   ```

   Or as a one-shot single-camera national signal prepare command:

   ```bash
   npm run real-sample:prepare-national-live-input -- \
     output/real-samples/public-data/seoul-topis-cctv/topis-cityhall-cctv-190-yolo-detector-output.json \
     <camera-calibration.json> \
     <national-tl-drct-info-response.json> \
     <signal-snapshot.json> \
     <live-input-envelope.json> \
     2904 \
     <nextPhase> \
     <controllerMode> \
     <manualOverride>
   ```

6. Validate:

   ```bash
   npm run real-sample:check -- --offline <live-input-envelope.json>
   npm run real-sample:check -- <live-input-envelope.json>
   ```

Until steps 2-4 are complete, the current state should be described as:

```text
real camera-side detector sample acquired
same-intersection signal candidate identified
replay-ready live-input.v1 still blocked
```
