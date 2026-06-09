# 스마트 교차로 의사결정 지원 MVP

이 저장소는 교차로 운영자를 위한 **의사결정 지원 대시보드**입니다.
실제 교통 신호를 제어하지 않고, 저장된 시나리오와 시뮬레이션 결과를
기반으로 추천과 리포트를 보여줍니다.

## 지금 어디까지 됐나

### 완료된 범위

- `Next.js + React + TypeScript` 기반 운영자 대시보드
- `FastAPI + SQLAlchemy + Alembic` 기반 API
- Docker Compose 기반 PostgreSQL 개발 환경
- 긴급차량, 보행자 대기, 일반 흐름, 교차로 막힘 시나리오
- YOLO 형태의 비전 분석 어댑터 경계
- SUMO/TraCI 형태의 시뮬레이션 어댑터 경계
- 이미지/영상 샘플 업로드 및 분석 작업 상태 API
- 추천, 시뮬레이션 비교, 채팅 답변, 리포트 생성
- 한국어/영어 전환이 가능한 대시보드 UI
- 교체 가능한 중앙 시뮬레이션 뷰포트
- 정책/운영 가이드 문서 기반의 로컬 근거 검색
- `/api/runtime/readiness` 런타임 준비 상태 점검 API
- `/api/runtime/readiness`에서 PostgreSQL `vector` 확장 활성화 여부 조회
- `/api/runtime/readiness`에서 누락된 모듈, 바이너리, 모델 파일, API 키,
  DB 확장에 대한 다음 설정 힌트 제공
- 실제 OpenCV 4.13.0.92, Ultralytics 8.4.62, YOLOv8n 모델 기반 라이브
  샘플 추론 검증
- 실제 SUMO/TraCI 1.27.0 로컬 실행 검증
- `apps/api/networks/intersection.sumocfg` 기반 라이브 시뮬레이션 스모크
  검증
- `apps/api[ai]`로 OpenAI/pgvector Python 패키지 설치
- OpenAI Responses/embeddings 클라이언트 경계와 목업 테스트
- 공식 OpenAI API 가격 문서 재확인
- `AGENTS.md`에 팀원/에이전트 작업 규칙 정리

### 아직 끝나지 않은 범위

아래 항목은 문서의 체크박스에도 아직 미완료로 남아 있습니다.

- PostgreSQL `vector` 확장과 pgvector 컬럼/검색
- OpenAI API 키 설정 후 실제 OpenAI 클라이언트 호출
- 실제 임베딩 검색과 RAG 연결

현재 로컬 런타임 준비 상태 기준으로 YOLO/OpenCV 비전 섹션과
SUMO/TraCI 시뮬레이션 섹션은 준비됐고, `openai`와 `pgvector` Python
패키지도 설치됐습니다. 아직 남은 것은 `OPENAI_API_KEY`와 PostgreSQL
`vector` 확장입니다. 단, `/api/runtime/readiness`는 데이터베이스가
연결될 경우 `pg_extension`에서 `vector` 확장 활성화 여부를 직접
조회합니다.

## 처음 시작할 때 읽을 문서

1. `AGENTS.md`
   - 이 프로젝트에서 Codex/작업자가 따라야 하는 규칙입니다.
   - Superpowers와 `karpathy-guidelines` 사용, 작업자 역할, 커밋/푸시 규칙이 있습니다.
2. `docs/superpowers/plans/2026-06-08-smart-intersection-mvp.md`
   - 전체 MVP 작업 계획과 완료/미완료 체크박스입니다.
3. `docs/superpowers/specs/2026-06-08-smart-intersection-mvp-design.md`
   - 시스템 설계, API 경계, Phase 2/3 확장 방향입니다.
4. `docs/superpowers/plans/2026-06-08-phase-2-integration-notes.md`
   - YOLO, SUMO, OpenAI, pgvector로 넘어갈 때 지켜야 하는 통합 메모입니다.
5. `docs/superpowers/plans/2026-06-08-dashboard-ui-implementation.md`
   - 대시보드 UI 구현 현황과 검증 기록입니다.
6. `docs/runtime-setup.md`
   - 실제 YOLO/OpenCV, SUMO/TraCI, OpenAI, pgvector 설정을 승인 후 진행할
     때 쓰는 체크리스트입니다.

## 로컬 실행 준비

Python 3.12 이상, Node.js/npm, Docker Desktop이 필요합니다.

```bash
npm install
python3 -m venv apps/api/.venv
apps/api/.venv/bin/python -m pip install -e "apps/api[dev]"
docker compose -f infra/docker-compose.yml up -d postgres
cd apps/api
.venv/bin/alembic upgrade head
```

## 검증 명령

백엔드 테스트:

```bash
npm run test:api
```

프론트엔드 테스트:

```bash
npm run test:web
```

프론트엔드 빌드:

```bash
npm run build:web
```

Docker/PostgreSQL 상태:

```bash
docker compose -f infra/docker-compose.yml ps
```

런타임 준비 상태 확인:

```bash
npm run runtime:readiness
```

런타임 게이트가 끝났다고 판단할 때 실패 코드까지 확인:

```bash
npm run runtime:readiness:strict
```

특정 게이트만 확인할 때:

```bash
npm run runtime:readiness:strict -- --section vision
npm run runtime:readiness:strict -- --section simulation
npm run runtime:readiness:strict -- --section openai
npm run runtime:readiness:strict -- --section pgvector
```

## API 스모크 경로

PostgreSQL 실행 및 Alembic 마이그레이션 후 기본 API 흐름은 다음과 같습니다.

```text
POST /api/scenarios/emergency/load
GET  /api/intersection/status
GET  /api/events
POST /api/analyze
POST /api/recommend-signal
POST /api/simulate-signal
POST /api/chat
POST /api/report
GET  /api/runtime/readiness
GET  /api/runtime/readiness?section=vision
GET  /api/runtime/readiness?section=simulation
GET  /api/runtime/readiness?section=openai
GET  /api/runtime/readiness?section=pgvector
```

샘플 입력 관련 API:

```text
GET  /api/fixtures
POST /api/fixtures/{fixture_id}/ingest
POST /api/uploads/analyze
GET  /api/analysis-jobs/{job_id}
```

## 다음 작업자는 어디서 시작하면 되나

### YOLO/OpenCV 추론 확장 또는 유지보수

- 시작 파일:
  - `docs/runtime-setup.md`
  - `apps/api/app/adapters/vision.py`
  - `apps/api/tests/test_adapters.py`
  - `apps/api/tests/test_api_flow.py`
  - `.env.example`
- 현재 상태:
  - `apps/api[vision]`으로 OpenCV/Ultralytics 런타임을 설치합니다.
  - 로컬 모델 파일은 `apps/api/models/yolov8n.pt`에 있으며 git에는
    커밋하지 않습니다.
  - `VISION_ANALYSIS_MODE=opencv_yolo`로 `/api/uploads/analyze` 라이브
    추론이 검증됐습니다.
  - 다음 작업은 더 좋은 카메라 샘플, 방향 추정 로직, 또는 실제
    교차로 영상으로 검증 범위를 넓힐 때 시작하면 됩니다.

### SUMO/TraCI 실행 확장 또는 유지보수

- 시작 파일:
  - `docs/runtime-setup.md`
  - `apps/api/app/adapters/simulation.py`
  - `apps/api/app/services/runtime_readiness.py`
  - `apps/api/tests/test_adapters.py`
  - `apps/api/networks/intersection.sumocfg`
  - `docs/superpowers/plans/2026-06-08-phase-2-integration-notes.md`
- 현재 상태:
  - `apps/api[simulation]`으로 TraCI/sumolib과 packaged SUMO 바이너리를
    설치합니다.
  - `SUMO_SIMULATION_MODE=sumo_traci`와
    `SUMO_CONFIG_PATH=networks/intersection.sumocfg`로 라이브 실행이
    검증됐습니다.
  - 다음 작업은 더 현실적인 네트워크/교통량으로 확장하거나, UI
    시뮬레이션 뷰포트와 더 깊게 연결할 때 시작하면 됩니다.

### OpenAI/pgvector 기반 RAG

- 시작 파일:
  - `docs/runtime-setup.md`
  - `apps/api/app/services/knowledge.py`
  - `apps/api/app/services/chat.py`
  - `apps/api/app/db/models.py`
  - `apps/api/alembic/versions/`
  - `apps/api/app/services/runtime_readiness.py`
  - `apps/api/app/services/openai_clients.py`
- 현재 상태:
  - `apps/api[ai]` 설치로 `openai`와 `pgvector` Python 패키지는
    준비됐습니다.
  - `OpenAITextGateway`와 `OpenAIEmbeddingGateway`는 목업 클라이언트로
    테스트되어 있고, 실제 API 호출은 아직 하지 않았습니다.
  - 2026-06-09 기준 공식 OpenAI API 가격 문서에서 `gpt-5.5`와
    `text-embedding-3-small` 가격을 확인했습니다.
  - `/api/runtime/readiness` 기준 남은 OpenAI 게이트는
    `OPENAI_API_KEY`입니다.
  - `/api/runtime/readiness` 기준 남은 pgvector 게이트는 PostgreSQL
    `vector` 확장입니다.
- 해야 할 일:
  - OpenAI API 키 설정 승인 및 검증
  - 실제 호출 전 월 예산/사용량 제한 결정
  - 승인된 live API smoke call 실행
  - PostgreSQL `vector` 확장과 pgvector 컬럼 마이그레이션
  - 로컬 키워드 검색을 임베딩 검색으로 교체
  - `/api/runtime/readiness`로 `OPENAI_API_KEY`와 PostgreSQL `vector`
    확장 활성화 상태 재확인

## 안전 경계

이 앱의 추천과 시뮬레이션은 **운영자 참고용**입니다. UI, API, 문서 어디에서도
실제 교통 신호를 직접 제어한다고 표현하면 안 됩니다.

## 디자인 방향

승인된 대시보드 방향은 차분한 유리 질감의 운영 도구 UI입니다.
관련 기록은 아래에 있습니다.

```text
docs/design/assets/dashboard-concept-approved.png
docs/design/dashboard-concept-notes.md
```

중앙 뷰포트는 `apps/web/components/SimulationViewport.tsx`에 분리되어
있습니다. 나중에 실제 SUMO/TraCI 렌더러나 다른 시뮬레이션 화면으로 바꿀 때
주변 대시보드 API 계약을 깨지 않도록 유지해야 합니다.
