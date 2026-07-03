# Replay-Ready Real Sample Source Search

## Status

Updated on 2026-07-03.

The strongest replay-ready path is no longer `인계사거리`. The current best
candidate is:

```text
Intersection: 서울특별시 선사사거리
Camera: TOPIS CCTV camId=299, camName=선사사거리
Signal candidate: 전국 통합데이터 교통안전 신호등 실시간 정보 crsrdId=1014
```

This pair is promising because the public TOPIS CCTV page exposes a playable
HLS stream for `선사사거리`, and the national traffic-signal coverage report
already shows a 서울특별시 `선사사거리` row with `crsrdId=1014`.

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
output/real-samples/public-data/seoul-topis-cctv/topis-cctv-299.raw.json
output/real-samples/public-data/seoul-topis-cctv/topis-cctv-299.redacted.json
```

The raw file is ignored output and contains the fetched TOPIS detail response.
The redacted file removes `hlsUrl`.

Frame extraction:

```text
output/real-samples/public-data/seoul-topis-cctv/topis-seonsa-cctv-299-live-frame.jpg
output/real-samples/public-data/seoul-topis-cctv/topis-seonsa-cctv-299-live-frame-provenance.json
```

Detector output:

```text
output/real-samples/public-data/seoul-topis-cctv/topis-seonsa-cctv-299-yolo-detector-output.json
```

Observed detector result:

```text
schemaVersion: authorized-camera-detector-output.v1
intersectionId: seoul-topis-seonsa-1014
cameraId: topis-cctv-299
capturedAt: 2026-07-03T03:04:46.591Z
detectionCount: 4
classCounts: vehicle=4
```

The frame visually shows a real Seoul roadway CCTV view near `올림픽대로` /
`구리화도TG` direction labels. This is real camera-side evidence, not synthetic
or fixture data.

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
crsrdId: 1014
crsrdNm: 선사사거리
totDt: 20260703050031
```

This proves that the national signal API contains a map/intersection metadata
candidate for the same named intersection as TOPIS CCTV `camId=299`.

Current blocker:

```text
same_intersection_signal_direction_row_required
```

The project still needs a successful approved-key `tl_drct_info` probe for
`crsrdId=1014` before building a `LiveSignalSnapshot`. A retry with a
different previously provided public-data key returned HTTP 401, so that key is
not authorized for publicDataPk `15157604`. The logged-in Chrome extension was
temporarily unavailable during this pass, so the service-approved key could not
be recovered automatically.

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
  direct `선사사거리` match.

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
   `crsrdId=1014` is found.
3. Convert the matched row into a signal snapshot only after confirming field
   freshness and converting centiseconds to seconds.
4. Add an operator/map-reviewed `camera-approach-calibration.v1` for TOPIS
   `camId=299`; do not infer approach direction from the frame.
5. Build the final envelope:

   ```bash
   npm run real-sample:build-multi-camera-envelope -- \
     output/real-samples/public-data/seoul-topis-cctv/topis-seonsa-cctv-299-yolo-detector-output.json \
     <camera-calibration.json> \
     <signal-snapshot.json> \
     <live-input-envelope.json>
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
