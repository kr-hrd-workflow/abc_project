# R3F 기본 화면 완성 — photobash 풀 승격 + 라이브 기본화 + 씬 UI 컨트롤 (설계 스펙)

- 날짜: 2026-07-02
- 상태: 승인됨 (브레인스토밍 게이트 통과)
- 브랜치: `feat/r3f-default-scene-completion` (main에서 분기)
- 로드맵 맥락: "3D 시뮬레이션 완성"을 A→B→C 3개 하위 프로젝트로 분해하기로 사용자 확정.
  이 스펙은 **A(기본 화면 완성)**. B(시뮬레이션 심화: 전 시나리오 live·closed loop·보행자 수요),
  C(비주얼 마감: 밤 파사드·거리 디테일·UX 정리)는 각자 별도 스펙으로 진행.

## 0. 한 줄 목표

아무 URL 파라미터 없이 대시보드에 들어온 방문자가 **photobash 씬(마모 페인트 데칼 + 제한 오비트 카메라 + 보행자 레이어) 위에서 라이브 SUMO로 움직이는 교통**을 보고, **주야간·날씨·카메라를 UI 토글**로 바꿀 수 있게 한다.

## 1. 배경 (근거 갭)

2026-07-02 4축 병렬 분석(장면·스펙·데이터 흐름·품질)에서 확인된 "기본 화면 vs 만들어둔 최고 상태" 간극:

- 피벗 방향(photobash 데칼 씬)이 `?photobash=1` 뒤에 숨어 있고 기본 화면은 구식 벡터 마킹 + 고정 카메라 (`SimulationScene.tsx:246-294` vs `:296-319`). photobash 분기는 `DynamicPedestrianLayer`를 빠뜨림.
- 기본 배포가 fixture 모드(`.env: SUMO_SIMULATION_MODE=fixture`)라 방문자는 sim_time 0.0 고정의 **멈춘 합성 차량 0~3대**를 봄. live SUMO는 `normal` 시나리오만 타는데 대시보드 기본 시나리오는 `emergency`라 SUMO를 켜도 기본 화면은 fixture.
- `NEXT_PUBLIC_R3F_SIMULATION_ENABLED` 플래그가 `.env`/`.env.example`에 없어 신규 배포에서 3D 자체가 안 뜸 (`SimulationViewport.tsx:21`).
- 날씨/주야간/화질/카메라가 전부 URL 파라미터 전용 — 사용자 토글 없음.
- 폐기 결정된 plate 6모듈 + 진단용 URL 게이트가 프로덕션 씬 컴포넌트에 잔존.
- 기본 분기 `SignalLayer`가 `lightingPreset` 미전달로 모듈 상수 'rain'에 고정 (`SignalLayer.tsx:9-13`).

라이브 SUMO 구동 가능성은 검증됨: `RUN_SUMO_LIVE=1` 게이트 테스트 1.89s 통과 (차량 30+, 버스 중앙차로 준수, 신호 동작; SUMO는 `apps/api/.venv/bin/sumo`).

## 2. 성공 기준 (전부 검증 가능)

1. 파라미터 없는 `/dashboard` 방문 시: 데칼 마킹 + 제한 오비트 + 보행자 레이어 마운트, 시나리오 `normal`, live SUMO 프레임(`source=sumo_traci`)으로 차량이 움직임.
2. SUMO 실패 시 기존 폴백 체인(last-good 1s 캐시 → fixture) 그대로 동작, 폴백 배지 표시.
3. 대시보드 UI에서 주야간(day/night)·날씨(clear/cloudy/rain)·카메라 프리셋(운영 와이드/CCTV 시점) 전환 가능. URL 파라미터는 초기값 override로 계속 동작 (verify 스크립트 호환).
4. plate 6모듈 + `?photoreal`/`?cmp`/`?calB`/`?busLat`/`?plate=roadlock` 경로 삭제. `?guide=1`·`?roadonly=1`(imagegen 도구)·`?viewpoint=cctv`(카메라 프리셋 백엔드)는 유지.
5. `cd apps/web && npx vitest run` green, `verify:r3f-dashboard`·`verify:r3f-visual-diff`(재베이스라인)·`verify:r3f-performance`(900 draw-call 예산)·`verify:r3f-assets`·`verify:security` 전부 통과.
6. day/night × clear/rain 브라우저 스크린샷을 codex CLI로 검수해 시각 이상 없음 확인.

## 3. 설계

### 3.1 씬 승격 — `SimulationScene.tsx`

- photobash 분기 구성을 **기본 렌더 경로**로 만들고 구 기본 분기(벡터 마킹 + 고정 카메라)는 삭제. `?photobash=1`은 no-op으로 수용 (북마크 호환).
- 승격된 기본 경로에 추가:
  - `DynamicPedestrianLayer` 마운트 (구 기본 분기와 parity. 단, 보행자 데이터는 B까지 0명 — rou.xml에 `<person>` 없음. 레이어 마운트만으로 A 완료).
  - `SignalLayer`에 `lightingPreset`을 주야간/날씨 상태에서 파생해 명시 전달 ('rain' 고정 버그 수정).
- 기본 프리젠테이션 **clear + day** (기존 기본 rain은 토글 옵션으로 이동). 노면 asphalt + `MarkingDecalLayer` 데칼 조합은 기존 photobash 구성 그대로.

### 3.2 레거시 정리 — 의존성 매핑 선행 후 삭제

- **선행 단계(필수):** plate 6모듈(`PhotorealPlate`, `BackgroundPlateLayer`, `plateProxyGeometry`, `plateCameraCalibration`, `plateVehicleCalibration`, `plateManifest`)과 삭제 대상 URL 게이트에 대해 (a) photobash 경로의 런타임 의존(주의: photobash는 identity vehicle calibration을 사용 — `plateVehicleCalibration`에서 identity 상수/함수를 가져올 수 있음), (b) verify 스크립트 의존(메모리 경고: 죽은 듯 보이는 debug knob에 verifier가 의존)을 grep으로 전수 매핑.
- photobash가 쓰는 identity 보정은 인라인 상수로 이전 후 plate 모듈 삭제. verifier가 쓰는 knob은 보존하거나 verifier를 같은 변경에서 갱신.
- `apps/web/AGENTS.md`의 plate v5 락트 가드레일 블록을 photobash 기본 체제로 갱신 (구 스펙 §4.4의 "인간 확인 게이트" — 스펙 리뷰 시점에 사용자에게 명시 고지).
- 미마운트 레거시 레이어(StaticRoadLayer 스택, WetRoadReflectors 등)는 A에서 **건드리지 않음** — 가로등/가로수 등 거리 디테일은 C에서 결정.

### 3.3 라이브 기본화

- `.env` + `.env.example`: `SUMO_SIMULATION_MODE=sumo_traci`, `NEXT_PUBLIC_R3F_SIMULATION_ENABLED=true` 추가. `.env.example`에 R3F 플래그 부재 문제 동시 해결.
- 대시보드 기본 시나리오 `emergency` → `normal` (`DashboardRoute.tsx`). `normal`만 live SUMO로 라우팅되므로(`LIVE_SCENARIO_IDS`) 기본 화면 = 움직이는 교통.
- fixture 애니메이션화는 하지 않음 — fixture는 폴백 전용, 폴백 배지 이미 존재 (YAGNI).

### 3.4 씬 UI 컨트롤 — `DashboardShell`

- 씬 컨트롤 클러스터 3종: 주야간(day/night), 날씨(clear/cloudy/rain), 카메라 프리셋(운영 와이드/CCTV 시점). 화질(r3fQuality)은 URL 전용 유지.
- 구현: URL에서만 읽는 `stage6Quality`의 weather/timeOfDay(및 카메라 프리셋)를 React 상태로 리프트. URL 파라미터는 **초기값 override**로 유지 — verify 스크립트가 URL로 시나리오를 고정하므로 호환 필수.
- 기존 ko/en i18n 패턴·디자인 시스템 준수. 기존 컨트롤(시나리오 레일 등)과 같은 스타일 문법.

## 4. 검증 계획

- TDD 대상 (구현 전 테스트 먼저):
  1. 파라미터 없는 기본 씬 = 데칼 마킹 + 오비트 컨트롤 + 보행자 레이어 마운트.
  2. `SignalLayer` lightingPreset이 주야간/날씨 상태에서 파생되어 전달됨.
  3. 기본 시나리오 = `normal`.
  4. UI 토글 → 씬 프리젠테이션 상태 배선 (URL 초기값 override 포함).
  5. plate 모듈 삭제 후 identity 보정 동작 유지 (차량이 metric 차선 위).
- 게이트 순서: `npx vitest run` → `verify:r3f-dashboard` → `verify:r3f-visual-diff` **재베이스라인**(의도적 시각 변경) → `verify:r3f-performance`(데칼·오비트 추가분 draw-call 확인, 900 예산) → `verify:r3f-assets` → `verify:security`.
- 최종: day/night × clear/rain 스크린샷 codex CLI 검수 (시각 확인은 codex — 프로젝트 메모리 규칙).

## 5. 리스크 & 가드레일

| 리스크 | 가드레일 |
|---|---|
| verifier가 삭제 대상 debug knob에 의존 (전례 있음) | §3.2 선행 매핑 + 전체 verify 스위트를 삭제 커밋마다 실행 |
| photobash가 plateVehicleCalibration의 identity 경로 사용 | identity 상수 인라인 이전 후 삭제, 차량 차선 정렬 테스트로 고정 |
| 시각 재베이스라인이 회귀를 가림 | 재베이스라인 전 codex 시각 검수를 먼저 통과시킨 뒤 베이스라인 갱신 |
| live SUMO가 CI/다른 머신에 없음 | 폴백 체인 유지 + skip-aware live 테스트 패턴 그대로 (RUN_SUMO_LIVE 게이트) |
| AGENTS.md 락트 가드레일 임의 변경 금지 | 스펙 리뷰에서 사용자 고지 후 갱신 (이 스펙 승인 = 갱신 승인) |

## 6. 범위 밖 (B/C 이월)

- **B (시뮬레이션 심화):** emergency/pedestrian/blocked 시나리오 live화(시나리오별 .sumocfg), AI 신호 추천 → 라이브 TLS 반영 closed loop, 실제 신호 잔여시간(getNextSwitch), SUMO 보행자 수요 + crossing 있는 net 재생성, CCTV 보정 4접근 확장·재보정, 전송(폴링→SSE/WS) 재검토.
- **C (비주얼 마감):** 밤 히어로 파사드 31동(에셋 예산 22.25/25MB 작업 포함), 마킹 데칼 kind별 전용 텍스처, 가로등·가로수·미디어폴, 보행자 비주얼(캡슐→사람), 도시 선택기·운영 모드 토글 실동작화, 하드코딩 인시던트/오퍼레이터 헤더, CCTV 타일 주기 갱신.
- **주의:** A 완료 시점에도 화면에 보행자는 안 보임(데이터 0명). 실제 등장은 B.
