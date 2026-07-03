# National Traffic Signal Real-Time Candidate

## Status

On 2026-07-03, a new candidate source was identified for the remaining
same-intersection signal-timing blocker:

```text
행정안전부 한국지역정보개발원_(전국 통합데이터) 교통안전 신호등 실시간 정보
https://www.data.go.kr/data/15157604/openapi.do
```

This is the strongest public candidate found so far for pairing the Gyeonggi
`인계사거리` CCTV/ROI detector evidence with real signal status and remaining
time. It is not yet accepted as project evidence because a key-backed response
has not been fetched and the API has not yet proven that it contains the exact
`인계사거리` intersection.

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

The next useful external action is to apply for:

```text
행정안전부 한국지역정보개발원_(전국 통합데이터) 교통안전 신호등 실시간 정보
publicDataPk: 15157604
```

After approval/key availability:

1. Fetch `/crsrd_map_info` with `stdgCd=4111514100`.
2. Search the returned `crsrdNm` values for `인계사거리` or nearby Suwon
   intersections.
3. If a matching `crsrdId` exists, fetch `/tl_drct_info` for the same
   `stdgCd`.
4. Confirm freshness through `totDt`.
5. Only then design a small adapter from the key-backed response to
   `LiveSignalSnapshot`.

Until that key-backed check succeeds, `인계사거리` remains blocked by:

```text
same_intersection_signal_timing_required
```

The Gyeonggi CCTV frame and ROI detector outputs remain useful camera-side
evidence, but not a complete replay-ready real sample.
