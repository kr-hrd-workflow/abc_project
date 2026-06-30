# 실 CCTV → YOLO 교통량(flow) → SUMO 캘리브레이션 — 설계 스펙

- 날짜: 2026-06-30
- 상태: 승인됨 (브레인스토밍 게이트 통과, 사용자 결정 반영)
- 브랜치(작업 시작 시): `feat/cctv-yolo-flow` (현재 `feat/sumo-live-phaseA`에서 분기)

## 0. 목표 한 줄

실제 강남대로 CCTV(라이브 HLS)를 YOLO로 분석해 **접근로별 교통량(flow, veh/h)** 과 **보행자 통행량**을 측정하고, 차량 교통량으로 **SUMO 수요(demand)를 캘리브레이션**한다. 보행자는 표시 전용.

## 1. 확정된 결정 (사용자)

| 항목 | 결정 |
|---|---|
| CCTV 소스 | 사용자 제공 **라이브 m3u8 URL** (env 주입). 검증 완료: KBS/loomex HLS 720×406, opencv 디코드 OK, 도심 간선 교차로+중앙 버스차로+횡단보도 화면. 장기 실데이터는 **경찰청/UTIC**(data.go.kr 15148511, 키 ~1일·출처표기). |
| 측정 지표 | **Flow** — ByteTrack 추적 + 접근로별 가상 라인 통과 카운트 → veh/min → veh/h. (기존 스냅샷 대기열은 밀도지 flow가 아님 → 재사용 안 함) |
| 보행자 | `person`(COCO class 0) 카운트 추가 — **표시 전용**(SUMO 보행자 수요 모델 없음, 캘리브레이션 제외) |
| 라이선스 | **레포 AGPL-3.0 공개** 전제 → `ultralytics` 그대로 사용. NOTICE에 ultralytics AGPL + (UTIC 사용 시) 경찰청 출처 표기 |
| 카운트 역할 | 차량: **대시보드 표시 + SUMO demand 캘리브레이션** / 보행자: **대시보드 표시만** |
| 샘플링 방식 | **동기식 윈도우 1회 샘플** (상시 백그라운드 스레드 없음) — ponytail |

### 운영상 주의 (검증에서 확인)
- 제공된 m3u8의 `wowzatoken`은 24h 롤링 → 만료 시 같은 URL 사망. MVP는 env 교체로 대응, 자동 재발급은 후속.
- 720×406 + 원근 뷰 → 먼 차량 작음. 카운트 라인을 근/중경에. 방향은 카메라 기하에 맞춘 라인 보정 필요(보정 knob).

## 2. 아키텍처 (신규 2 + 수정 3)

### 신규 ① `apps/api/app/adapters/flow_counter.py` — 시간축 flow 카운터
- 입력: 소스 식별자(라이브 m3u8 URL 또는 로컬 mp4 경로), 카운트 라인 설정, 윈도우 길이.
- 처리:
  - `cv2.VideoCapture(source)`로 프레임 스트림.
  - `model.track(frame, persist=True, tracker="bytetrack.yaml", classes=[0,2,3,5,7], verbose=False)` — person/car/moto/bus/truck.
  - 트랙 ID별 중심점 궤적을 유지하고, 설정된 **카운트 라인**(선분)을 지정 방향으로 통과하면 카운트++ (클래스·접근로 태깅).
  - `window_seconds` 경과(라이브) 또는 EOF(클립)에서 종료.
- 출력 도메인 타입 `FlowMeasurement`:
  ```
  FlowMeasurement(
    source: str, captured_at: datetime, window_seconds: float,
    approaches: dict[str, ApproachFlow],     # 차량 접근로별
    pedestrian: PedestrianFlow | None,        # 표시 전용
  )
  ApproachFlow(veh_per_hour: float, by_class: dict[str,int], crossings: int)
  PedestrianFlow(per_hour: float, crossings: int)
  ```
  - `veh_per_hour = crossings / window_seconds * 3600`.
- 모델/cv2 로더는 `app/adapters/vision.py`의 `_load_yolo_model` / `_load_cv2_module`를 재사용(중복 금지). 테스트용으로 `cv2_module`/`yolo_model` 주입 가능(기존 `OpenCVYoloFrameAnalyzer` 패턴 동일).

### 신규 ② `apps/api/app/services/flow_calibration.py` — veh/h → SUMO period
- 입력: `FlowMeasurement`, 베이스 라우트파일(`networks/intersection.rou.xml`), 출력 디렉토리.
- 처리:
  - 접근로 → `<flow>` id 매핑(설정): 예) `north`→`flow_north_through`, `south`→`flow_south_through`, 버스는 클래스별 `flow_bus_north/south`.
  - `period = clamp(round(3600 / veh_per_hour), period_min, period_max)`. `veh_per_hour <= 0`이거나 매핑 없으면 **베이스 period 유지**(폴백).
  - 베이스 `.rou.xml`을 파싱(stdlib `xml.etree.ElementTree`)해 해당 flow의 `period` 속성만 갱신 → `{out_dir}/{scenario}.rou.xml` 기록.
  - 동일 디렉토리에 `{scenario}.sumocfg` 기록(net=기존 절대/상대경로, route=갱신 파일). 기존 `sumo_config_dir` + `_scenario_config_path_from_dir`(sumo_runtime.py:300) 메커니즘이 그대로 픽업.
- **순수/결정적**: 파일 입출력 외 부작용 없음, traci 호출 없음 → 단위테스트 용이.

### 수정 ③ `apps/api/app/core/config.py` — 설정 추가
```
traffic_video_url: str | None = None
flow_window_seconds: float = Field(default=30.0, gt=0)
flow_counting_lines: str | None = None   # JSON: 접근로→{line:[x1,y1,x2,y2](정규화), dir, classes}; None이면 기본 강남대로 N/S+버스+횡단보도
flow_period_min: int = Field(default=1, ge=1)
flow_period_max: int = Field(default=120, ge=1)
sumo_calibrate_from_cctv: bool = False    # 기본 OFF → 소스+플래그 둘 다 켜야 캘리브레이션
sumo_calibrated_config_dir: str | None = None  # 캘리브레이션 산출물 위치(미지정 시 임시 디렉토리)
```
- 기존 `yolo_model_path`, `yolo_confidence_threshold`, `vision_analysis_mode`, `sumo_config_dir` 재사용.

### 수정 ④ `apps/api/app/api/routes.py` — 엔드포인트
- `GET /api/traffic/cctv-flow`:
  - `traffic_video_url` 미설정 → **503**(`{detail:"no CCTV source configured"}`).
  - `vision_analysis_mode != "opencv_yolo"` (또는 vision extra 미설치) → 명확한 503/diagnostic. fixture 모드 무영향.
  - flow_counter로 1회 샘플 → `{per_approach:{veh_per_hour,by_class,crossings}, pedestrian:{per_hour,crossings}, window_seconds, source, captured_at}` 투영.
  - 싱글톤 카운터 인스턴스는 `upload_vision_adapter`와 동일하게 모듈 로드 시 1회 구성.

### 수정 ⑤ `apps/api/app/services/sumo_runtime.py` — 캘리브레이션 hook
- `SumoRuntime` 세션 생성 경로에서: `settings.sumo_calibrate_from_cctv` ON **그리고** 대상 시나리오(예: normal)일 때만:
  1. flow_counter 1회 샘플 → `FlowMeasurement`,
  2. `flow_calibration`으로 per-run `.rou.xml`/`.sumocfg` 생성(`sumo_calibrated_config_dir`),
  3. 그 디렉토리를 `sumo_config_dir`로 사용해 `traci.start`.
- 측정 실패/소스 없음 → **베이스 정적 라우트로 폴백**(현행 동작 유지, 크래시 없음). 로깅만.
- 경계: **신호 제어는 건드리지 않음**(프로젝트 'no real signal control' 가드레일). demand 입력만.

### 수정 ⑥ `apps/web` — 대시보드 타일
- `apps/web/lib/api.ts`에 `getCctvFlow()` 추가, `apps/web/components/DashboardShell.tsx`에 타일 1개.
- 표시: 접근로별 veh/h(차량) + 보행자/h, 라벨 **"측정 CCTV"** (SUMO 자체 카운트와 구분). `MetricsPanel.tsx` 패턴 복사.
- 소스 없음/503 → "측정 소스 없음" 빈 상태.

## 3. 데이터 흐름

```
m3u8(env) → cv2.VideoCapture → YOLO.track(ByteTrack, classes=[0,2,3,5,7])
   → 접근로/횡단보도 라인 통과 (window초) → FlowMeasurement(veh/h + 보행자/h)
       ├─(a) GET /api/traffic/cctv-flow → 대시보드 타일 "측정 CCTV"   [차량+보행자]
       └─(b) flow_calibration → rou.xml period 재작성 → calibrated traci.start  [차량만]
```

## 4. 에러 처리 / 폴백

| 상황 | 동작 |
|---|---|
| `traffic_video_url` 미설정 | 엔드포인트 503; 캘리브레이션은 정적 period 폴백 |
| 스트림 unreadable / 토큰 만료 | 윈도우 bounded; 엔드포인트 503; 캘리브레이션 폴백; 다음 샘플 재오픈 |
| vision extra(ultralytics/cv2) 미설치 | graceful 503 + diagnostic; fixture 모드 무영향 |
| 매핑 없는 접근로 / veh_h≤0 | 해당 flow는 베이스 period 유지 |
| 라인 설정 파싱 실패 | 기본 강남대로 라인으로 폴백 + 경고 로그 |

## 5. 테스트 (TDD)

- **flow_counter** (`tests/test_flow_counter.py`): 스크립트된 트랙(라인을 넘는/안 넘는 중심점 시퀀스)을 내는 stub `yolo_model`/`cv2_module` 주입 → 접근로별 crossings·veh/h 계산, 클래스 분해, 보행자 라인 통과 검증. 실모델·GPU 없음.
- **flow_calibration** (`tests/test_flow_calibration.py`): `FlowMeasurement` → period 재작성(veh/h→period, clamp, 매핑없음/0대 폴백, 생성된 `.rou.xml`/`.sumocfg` 내용) 순수함수 검증. SUMO 불필요.
- **endpoint** (`tests/test_api_flow.py` 확장): TestClient — 소스 미설정 503, stub 카운터로 정상 응답 shape.
- **sumo hook** (`tests/test_sumo_runtime.py` 확장): 플래그 ON+측정 stub → 캘리브레이션 config 경로 사용; 측정 실패 → 정적 폴백.

## 6. 범위 / SKIP (ponytail)

- **포함**: flow_counter, flow_calibration, config, `/api/traffic/cctv-flow`, sumo_runtime 캘리브레이션 hook, 대시보드 타일, 보행자 카운트(표시).
- **SKIP (필요 시 추가)**: 상시 백그라운드 샘플러, 멀티카메라, flow 이력 DB 저장, 토큰 자동 재발급, ITS/TOPIS 연동, 보행자 SUMO 수요, 모델 사이즈 업/파인튜닝/GPU(실 클립 recall 측정 후에만).

## 7. 단계화

- **Phase 1 — 측정/표시**: flow_counter + `/api/traffic/cctv-flow` + 대시보드 타일(차량+보행자). 실 영상→교통량 표시 end-to-end.
- **Phase 2 — 캘리브레이션**: flow_calibration + sumo_runtime hook. 실측 veh/h → SUMO demand.
- P1이 P2를 디리스크(측정이 맞는지 먼저 눈으로 검증).

## 8. 검증 게이트 (done 기준)

- `cd apps/api && pytest` (신규/확장 테스트 포함) 그린.
- vision extra 설치 후 실 m3u8로 `/api/traffic/cctv-flow` 수동 호출 → 합리적 veh/h(육안 카운트와 자릿수 일치) 확인.
- 캘리브레이션 ON으로 SUMO 세션 1회 → 생성된 `.rou.xml` period가 측정값과 일치, 시뮬 기동 OK.
- 대시보드 타일 렌더 + "측정 CCTV" 라벨 표시 확인.
- R3F/대시보드 변경분 있으면 프로젝트 R3F verify 게이트.
