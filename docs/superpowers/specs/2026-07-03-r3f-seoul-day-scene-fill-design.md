# R3F 서울 주간 씬 완성 — 빈 공간 실사 채우기 + Seoul 고정 (설계 스펙)

- 날짜: 2026-07-03
- 상태: 승인됨 (브레인스토밍 게이트 통과 — "진행해")
- 브랜치: `feat/r3f-seoul-day-scene-fill` (main 9656f98에서 분기)
- 로드맵 맥락: A(기본 화면) 완료 후 사용자 방향 전환 — B(심화)보다 **주간 씬 시각 완성**을 먼저.
  "아직 빈공간이 많음. 서울 주간부터 완벽하게."

## 0. 한 줄 목표

파라미터 없는 `/dashboard` 주간 씬에서, 운영 와이드 카메라와 제한 오비트 범위 안에 **빈 공간이 없고
채워진 모든 것이 실사(photoreal)로 읽히게** 한다. 서울(강남역) 단일 도시로 고정한다.

## 1. 배경 (2026-07-03 3축 감사 근거)

codex 시각 감사 + 미장착 레이어 맵 + 예산 조사로 확인된 사실:

- **최대 공백 = 지면.** 도로 아스팔트와 건물 풋프린트 밖은 지오메트리가 아예 없어 스카이돔 색이
  그대로 보인다(흰/회색 평면). 보도·연석·지반 에이프런 지오메트리는 `ApproachCorridors`에 이미
  존재하지만(`SIDEWALK_SLABS`/`CURB_SEGMENTS`/`CITY_GROUND_APRON`) 기본 씬에 미장착.
- 가로 시설물 GLB(가로등·가로수·벤치·야외테이블)는 이미 manifest에 있고(신규 MB 0) `Stage5SceneAssets`에
  배치 데이터까지 있으나 미장착. `RoadDetailProps`(볼라드·가드레일·표지판·버스쉘터·배수구·점자포장)도 미장착.
- 주변부: distant 5박스가 단일 재질 공유(전부 같은 색), 북측은 3D 박스와 `WeatherAndAtmosphere`의
  캔버스 스카이라인 플레인이 **중복**. 4방향 도로 끝이 빈 공간으로 끊김.
- `StaticRoadLayer` 통째 재장착은 불가 — `SimulationScene.test.tsx:100`이 의도적으로 잠가뒀고
  plate 시대 짐(정적 차량 GLB, rain 데칼)이 섞여 있다.
- 유령 텔레메트리: `R3FSimulationViewport`가 미장착 레이어의 상수에서 `data-r3f-ambient-pedestrian-count`,
  `glb-vehicle-count`, `street-shadow-count`를 파생 — 그리지도 않는 콘텐츠를 보고하며 verifier가 이를 읽는다.
- 죽은 코드: `EnvironmentLayer`, `NightSeamlessLighting`은 `SceneEnvironment`로 대체 완료된 사체 — 삭제 대상.
- **에셋 예산 여유 2.75MB** (22.25/25MB). draw call 게이트는 900 peak/180 high인데 현재 기록값
  `drawCalls=1`은 불신뢰(직전 신뢰 측정은 94/250 시대) — 작업 전 실측 기준선 필요.

## 2. 사용자 확정 사항

1. 완성 기준 = **운영뷰 빈 공간 제로 + 전부 실사** (프로시저럴 회색 박스 금지).
2. 에셋 예산 = **재압축으로 공간 확보, 25MB 게이트 유지.** 재압축은 codex A/B 검수 통과분만 적용
   (화질 저하 감지 텍스처는 원본 유지). 그래도 부족하면 게이트 소폭 상향(≈28MB)을 **그때 다시 물어본다**.
3. 도시 = **선택기 제거, Seoul 고정.**
4. 접근 = **A+B 하이브리드**: 기본은 재장착+실사 리스킨(A), 교차로 모서리 광장 4곳만 소형 유니크
   플레이트(B).

## 3. 성공 기준 (전부 검증 가능)

1. 운영 와이드 + 오비트 전 범위(현행 polar/azimuth/distance 클램프)에서 스카이돔 색 지면 노출 0.
   지면은 실사 보도/연석/에이프런 텍스처로 연속 피복.
2. 가로등·가로수·벤치·볼라드·버스쉘터가 4개 접근로 보도에 배치 (정적 차량 GLB는 미장착 유지 —
   live SUMO와 충돌 금지).
3. 교차로 4모서리에 유니크 플레이트(점자포장·연석램프 baked, albedo 위주 — 그림자 미포함) 적용.
4. 주변부: 파란 플레이스홀더 블록에 실사 파사드 텍스처, distant 5박스 개별 톤, 북측 스카이라인
   중복 해소(하나만 남김), 4방향 도로 끝 도시 연속감.
5. 도로: 맨홀/마모 데칼 추가 — `MarkingDecalLayer`의 textureKey별 병합 구조 유지(데칼 수가 늘어도
   메시 수는 텍스처 종류 수).
6. 옥상 헬리패드 중복 완화(변형 배치).
7. 도시 선택기 제거, Seoul 고정 (`cities.ts` 축소, 관련 테스트 갱신).
8. 유령 텔레메트리 3종을 실제 장착 레이어 기준으로 재배선하고 verifier를 같은 변경에서 갱신.
9. 죽은 코드 삭제: `EnvironmentLayer`, `NightSeamlessLighting` (verify:r3f-* 전체 게이트로 확인 —
   메모리 규칙: 죽어 보이는 knob도 verifier가 의존할 수 있음).
10. 게이트 전부 green: vitest, pytest, `verify:r3f-dashboard`, `verify:r3f-visual-diff`(의도적 변경 —
    codex PASS 후 재베이스라인), `verify:r3f-performance`(900/180, 작업 전 실측 기준선 대비 증가분 문서화),
    `verify:r3f-assets`(**25MB 유지**), `verify:security`.
11. codex 시각 검수 PASS: 운영 와이드 + 오비트 최소 2각도(줌인 1, 방위 회전 1), "빈 공간/블록아웃 느낌" 항목 명시 판정.

## 4. 설계

### 4.1 신규 `GroundDressingLayer` (A의 핵심)

- photobash 네이티브 신규 레이어. `ApproachCorridors`에서 보도/연석/에이프런 **배치 데이터만** 가져오고
  (import 또는 데이터 모듈 추출), 재질은 imagegen 실사 아틀라스로 교체:
  보도 포장 2~3종(기존 `sidewalk_paver_variation.webp` 재사용 + 신규), 연석, 배수구.
- 인스턴싱 유지(InstancedMesh 배치) — draw call 한 자릿수 목표.
- 대각 광장(도로가 못 덮는 모서리 구역)은 §4.2 유니크 플레이트가 덮는다.
- `StaticRoadLayer`/`ProceduralIntersection`은 건드리지 않는다(테스트 잠금 유지).

### 4.2 모서리 유니크 플레이트 4장 (B의 적용 지점)

- 교차로 4모서리 광장 각각 512~1024px webp 1장. imagegen으로 점자포장·연석램프·포장 패턴을 baked
  — **albedo 위주(그림자·AO 미포함)**로 생성해 3D 차량/프롭 그림자와 충돌 방지 (plate 시대 실패 회피).
- metric 좌표에 정합하는 고정 평면으로 장착, 기존 roadonly 가이드 렌더로 정렬 검증.

### 4.3 가로 시설물

- `Stage5SceneAssets`의 `STAGE5_STREET_FURNITURE_PLACEMENTS` 서브셋(가로등/가로수/벤치)을 photobash
  씬에 장착 — 배치 데이터 재사용, 정적 차량 배치(`STAGE5_VISIBLE_TRAFFIC_GLB_PLACEMENTS`)는 제외.
- `RoadDetailProps` 서브셋(볼라드·버스쉘터·표지판·점자포장 데칼) 장착. 배치 밀도는 서측/동측 보도
  중심으로 확장.

### 4.4 주변부

- distant 5박스: 풋프린트 tint를 재질에 실제 반영(공유 재질 1개 → 버텍스 컬러 또는 5개 저가 재질).
- `CITY_EDGE_BLOCKS` 밀도 확장 + 신규 주변부 파사드 아틀라스(윈도 그리드, 1~2장) 적용 —
  파란 플레이스홀더 블록 소멸.
- 북측 중복 해소: 3D 에지 블록이 지평선을 소유, `WeatherAndAtmosphere`의 캔버스 스카이라인 플레인은
  대기 헤이즈 역할로 뒤로 밀거나 제거(시각 판정은 codex).
- 4방향 도로 끝: 에지 블록 연장으로 "도시가 계속된다"는 인상.

### 4.5 도로·옥상 디테일

- `MarkingDecalLayer` 아틀라스에 맨홀/배수구/마모 얼룩 kind 추가 — 병합 구조 유지.
- 옥상: 헬리패드 데칼 재사용 축소, HVAC/물탱크 등 기존 프리미티브 변형 배치.

### 4.6 Seoul 고정

- `apps/web/lib/cities.ts`를 Seoul 단일로 축소, `CityId` 타입 축소, `DashboardShell` 선택기 UI 제거,
  관련 테스트 갱신. API/시뮬레이션엔 원래 미배선(장식)이라 동작 변화 없음.

### 4.7 정리 + 텔레메트리 재배선

- `EnvironmentLayer.tsx`, `NightSeamlessLighting.tsx` 삭제 (전체 verify 스위트로 회귀 확인).
- `data-r3f-ambient-pedestrian-count`(→ 0 또는 속성 제거 — 보행자는 B까지 0명),
  `glb-vehicle-count`(→ 실제 장착 차량 레이어 기준), `street-shadow-count`(→ 신규 시설물 레이어 기준)
  재배선. `scripts/verify-r3f-dashboard.mjs`의 해당 검증을 같은 변경에서 갱신(검증 강도 유지 — 완화 금지).

### 4.8 에셋 파이프라인 (순서 고정)

1. **draw-call 실측 기준선**: 현재 `drawCalls=1` 기록의 원인 확인 포함, 신뢰 가능한 실측을 먼저 확보.
2. **재압축**: `optimize-r3f-assets.mjs`로 히어로 파사드 등 재압축(해상도 맞춤 우선, 그다음 품질
   재인코딩). 원본 vs 재압축 렌더를 codex A/B 검수 — 저하 감지 텍스처는 원본 유지. 목표 여유 ≥5MB.
3. **imagegen 아틀라스 생성**: codex exec(병렬 세션 출력 충돌 주의 — 세션별 고유 출력 디렉터리),
   보도 2~3종 + 연석 + 주변부 파사드 1~2종 + 모서리 플레이트 4장. 전부 webp.
4. manifest + `docs/compliance/r3f-asset-licenses.md` 갱신, `verify:r3f-assets` 25MB 이내 확인.

## 5. 검증 계획

- TDD 대상: (1) 기본 씬 트리에 GroundDressingLayer/시설물 레이어 장착 + StaticRoadLayer 부재 유지,
  (2) 텔레메트리 재배선 값이 장착 레이어에서 파생, (3) cities Seoul 단일 + 선택기 부재,
  (4) MarkingDecalLayer 메시 수 = textureKey 종류 수 (기존 병합 회귀 방지 강화),
  (5) distant 박스 tint 반영.
- 게이트 순서: 실측 기준선 → vitest → verify:r3f-dashboard → codex 검수 → visual-diff 재베이스라인 →
  performance(기준선 대비 증가분 기록) → assets → security.
- codex 검수 각도: 운영 와이드 + 오비트 최소 2각도(줌인 1, 방위 회전 1) — "빈 공간 잔존 여부"를
  명시적 판정 항목으로.

## 6. 리스크 & 가드레일

| 리스크 | 가드레일 |
|---|---|
| draw-call 현재 측정 불신뢰("1") | 작업 전 실측 기준선 필수; 원인(헤드리스 계측 경로) 확인을 선행 태스크로 |
| 재압축 화질 저하 | codex A/B 검수 통과분만 적용; 부족 시 게이트 상향은 사용자 재확인 |
| 유니크 플레이트 vs 3D 그림자 충돌 | albedo 위주 생성(그림자/AO 미포함), roadonly 가이드로 정렬 검증 |
| StaticRoadLayer 테스트 잠금과 충돌 | 통째 재장착 금지 — 배치 데이터만 추출해 신규 레이어로 |
| verifier가 유령 카운트에 의존 | 재배선과 verifier 갱신을 같은 커밋에서 (완화 금지) |
| 아틀라스 타일링 티 | 운영뷰/오비트 거리 기준으로 codex 판정 (극단 줌은 범위 밖) |
| 게이트 완화 유혹 | 25MB·900/180·visual-diff 임계값 변경 금지 (완화 = 자동 Critical) |

## 7. 범위 밖

- 건물 1층 상가/입구/간판 밴드 (별도 스펙 — 다음 비주얼 사이클)
- 야간 씬 개선 전반 (밤 파사드·야간 건물 조명 — 기존 C 이월 목록 유지)
- 보행자 등장 (B단계: SUMO person 수요)
- 극단 줌 클로즈업 품질 (오비트 클램프 밖)
