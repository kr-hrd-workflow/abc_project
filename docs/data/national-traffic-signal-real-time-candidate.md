# National Traffic Signal Real-Time Candidate

## Status

On 2026-07-03, a new candidate source was identified for the remaining
same-intersection signal-timing blocker:

```text
행정안전부 한국지역정보개발원_(전국 통합데이터) 교통안전 신호등 실시간 정보
https://www.data.go.kr/data/15157604/openapi.do
```

This was the strongest public candidate found so far for pairing the Gyeonggi
`인계사거리` CCTV/ROI detector evidence with real signal status and remaining
time. After approved-key retries, the API is reachable, but current coverage
does not include Gyeonggi/Suwon/`인계사거리`. It therefore cannot currently close
the same-intersection signal-timing blocker for the Ingye sample.

## Why It Matters

The service description says it provides nationwide local-government traffic
signal real-time information, including:

- intersection map information
- signal-controller direction status
- remaining time for bus, bicycle, left-turn, pedestrian, straight, and U-turn
  signals
- eight movement directions: north, east, south, west, northeast, southeast,
  southwest, northwest

This is a better fit for the current blocker than the already integrated Seoul
V2X sample because the service is nationwide, while the Seoul V2X sample proves
only the adapter path and not the current state of the Gyeonggi `인계사거리`
controller.

## Official API Shape Found In Swagger

The public portal page embeds the Swagger spec.

```text
host: apis.data.go.kr/B551982/rti
schemes: https, http
```

Available operations:

```text
GET /crsrd_map_info
GET /tl_drct_info
```

Common query parameters:

```text
serviceKey  required  공공데이터포털에서 받은 인증키
pageNo      optional  페이지번호
numOfRows   optional  한 페이지 결과 수
type        optional  요청파일 타입
stdgCd      optional  지자체코드/법정동코드
```

`/crsrd_map_info` returns intersection map metadata such as:

```text
stdgCd, lclgvNm, crsrdId, crsrdNm, mapCtptIntLat, mapCtptIntLot,
laneWdth, lmtSpdTypeNm, lmtSpd, crsrdEngNm, regId, regDt, totDt
```

`/tl_drct_info` returns signal remaining-time/status fields such as:

```text
ntStsgRmndCs, etStsgRmndCs, stStsgRmndCs, wtStsgRmndCs
ntStsgSttsNm, etStsgSttsNm, stStsgSttsNm, wtStsgSttsNm
```

The Swagger examples describe remaining time as centiseconds. A future adapter
must convert those values to `live-input.v1.signalSnapshot.remainingSeconds`
only after a key-backed sample confirms the response shape.

## Local Probe

`인계동` 법정동 candidate code:

```text
4111514100
```

Unauthenticated/test-key probes were attempted:

```bash
curl 'https://apis.data.go.kr/B551982/rti/crsrd_map_info?serviceKey=test&type=json&pageNo=1&numOfRows=20&stdgCd=4111514100'
curl 'https://apis.data.go.kr/B551982/rti/tl_drct_info?serviceKey=test&type=json&pageNo=1&numOfRows=20&stdgCd=4111514100'
```

Both returned:

```text
Unauthorized
```

This means the endpoint exists, but a service-approved key is required before
the project can verify whether `인계사거리` is present.

## Approved-Key Probe

On 2026-07-03, a public data portal development application for publicDataPk
`15157604` was submitted from the logged-in account and automatically approved.
The portal detail page showed:

```text
처리상태: 승인
활용기간: 2026-07-03 ~ 2028-07-03
End Point: https://apis.data.go.kr/B551982/rti
상세기능:
  - /crsrd_map_info
  - /tl_drct_info
```

The approved key was used only in-memory for local probes and was not written
to repository files or output provenance. The redacted local probe bundle is:

```text
output/real-samples/public-data/national-traffic-signal/national-traffic-signal-map-ingye-4111514100.json
output/real-samples/public-data/national-traffic-signal/national-traffic-signal-map-ingye-4111514100-provenance.json
output/real-samples/public-data/national-traffic-signal/national-traffic-signal-direction-ingye-4111514100.json
output/real-samples/public-data/national-traffic-signal/national-traffic-signal-direction-ingye-4111514100-provenance.json
```

The first approved-key calls returned HTTP 403 with body:

```text
Forbidden
```

The same result occurred across:

```text
https and http
type=json, _type=json, and no type parameter
crsrd_map_info and tl_drct_info
```

Because that response did not reach the API's documented `resultCode` /
`resultMsg` envelope, it was classified as a temporary gateway/access issue,
not as evidence that `인계사거리` was absent from the dataset.

After retrying, both exact `stdgCd=4111514100` calls reached the documented
response envelope:

```text
HTTP 200
resultCode: K3
resultMsg: NODATA_ERROR
totalCount: 0
```

The refreshed exact-response files remain in the same ignored output bundle.

## Coverage Probe

Because the exact `인계동` code returned no data, the approved key was also used
to page through the unfiltered API responses at 100 rows per page. The redacted
coverage report is:

```text
output/real-samples/public-data/national-traffic-signal/national-traffic-signal-coverage-probe.json
```

Coverage observed on 2026-07-03:

```text
crsrd_map_info:
  resultCode: K0
  totalCount: 4237
  fetchedItemCount: 4237
  local governments: 서울특별시 2777, 울산광역시 402, 제주특별자치도 1058

tl_drct_info:
  resultCode: K0
  totalCount: 1382
  fetchedItemCount: 1377
  local governments: 서울특별시 978, 울산광역시 399
```

No Gyeonggi/Suwon/`인계사거리` rows were found in the paged coverage scan. Some
name matches such as `경기고교앞` or `월드컵경기장` are Seoul/Jeju names and are
not Gyeonggi-do coverage.

## Comparison With Other Signal Sources

### Seoul V2X

Already integrated enough to prove the adapter path, but it must not be paired
with Gyeonggi CCTV as if it were the same controller.

### UTIC Signal Open Data

The UTIC reference page describes signal-open data for Incheon and Daegu
intersections, focused on TOD and SIGNALMAP information collected daily or on
change. It is useful background for signal-plan concepts, but it is not a
current public source for Suwon `인계사거리` real-time remaining time.

### Suwon/KakaoNavi Signal Information News

Public news reports say Suwon started providing real-time signal information to
KakaoNavi for 20 Gwanggyo-area intersections in 2025 and may expand to other
navigation providers. This proves that Suwon has a real signal-information
program, but it does not expose a public API or prove coverage for
`인계사거리`.

## Next Action

The next useful external actions are:

1. Do not build an `인계사거리` signal adapter from this API unless future
   coverage adds Gyeonggi/Suwon rows.
2. Search for a Suwon/Gyeonggi-specific traffic signal API, signal-controller
   data-sharing channel, or navigation/V2X partner sample.
3. If no same-intersection signal source can be obtained, keep the Ingye sample
   classified as camera-side detector evidence only.

Until same-intersection signal coverage or another trusted signal sample is
available, `인계사거리` remains blocked by:

```text
same_intersection_signal_timing_required
```

The Gyeonggi CCTV frame and ROI detector outputs remain useful camera-side
evidence, but not a complete replay-ready real sample.
