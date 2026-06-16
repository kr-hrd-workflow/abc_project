# 스마트 교차로 의사결정 지원 대시보드

교차로 운영자를 위한 **AI 의사결정 지원 MVP**입니다. 실제 교통 신호를 직접 제어하지 않고, 저장된 시나리오·비전 분석·시뮬레이션·정책 근거를 바탕으로 운영자에게 추천, 비교, 리포트, 채팅 답변을 제공합니다.

## 현재 상태

최신 `main` 기준으로 아래 범위가 구현되어 있습니다.

- `Next.js 15 + React 19 + TypeScript` 기반 웹 랜딩 페이지와 운영자 대시보드
- `FastAPI + SQLAlchemy + Alembic` 기반 API
- Docker Compose 기반 PostgreSQL/pgvector 개발 환경
- 긴급차량, 보행자 대기, 일반 흐름, 교차로 막힘 시나리오
- 교차로 상태, 이벤트, 추천, SUMO형 시뮬레이션 비교, 채팅, 리포트 API
- 이미지/영상/virtual CCTV fixture 목록, fixture ingest, 업로드 분석 job API
- 한국어/영어 전환 가능한 운영자 cockpit UI
- landing hero의 CSS-only 3D/isometric roadway scene
- Signal Assembly 섹션의 GSAP sticky scroll + depth ring scene
- 실사형 WebGL 스타일 가상 CCTV fallback
- `NEXT_PUBLIC_SIMULATION_STREAM_URL` 설정 시 hosted simulation iframe mount slot
- `NEXT_PUBLIC_UNITY_WEBGL_URL` legacy Unity WebGL 호환 alias
- Archived Unreal renderer scaffold and helper scripts: `archive/unreal/original/`
- OpenAI live 답변 gateway와 `openai_auto` fallback 모드
- OpenAI API 키/월 예산 guard 및 secret 미노출 readiness report
- keyword 기반 로컬 정책 근거 검색과 `KNOWLEDGE_SEARCH_MODE=pgvector` 옵션
- PostgreSQL `vector` extension, `knowledge_chunks.embedding` migration, pgvector 검색 경로
- `/api/runtime/readiness`와 CLI readiness checks
- Guarded OpenAI smoke CLI: `npm run openai:smoke`
- 통합 검증 스크립트: `npm run verify`

## 안전 경계

이 프로젝트는 **운영자 의사결정 지원 도구**입니다.

- 실제 신호 제어기와 직접 연결하지 않습니다.
- 추천은 “운영자 참고용”이며 자동 제어 명령이 아닙니다.
- WebGL/Unity viewport는 digital twin/시연 화면입니다. live CCTV라고 표현하면 안 됩니다.
- OpenAI API key, token, password, connection string은 git에 커밋하지 않습니다.

## 빠른 실행

필요 도구:

- Node.js/npm
- Python 3.12+
- Docker Desktop 또는 Docker Engine
- WSL 사용 시 Docker Desktop의 WSL integration 활성화 필요

가장 빠른 로컬 실행:

```bash
cp .env.example .env.local
# 선택: .env.local에 OPENAI_API_KEY를 넣으면 live AI 답변이 자동 활성화됩니다.
npm run launch:local
```

`npm run launch:local`은 다음을 수행합니다.

1. `.env.local`이 없으면 `.env.example`에서 생성
2. API venv가 없으면 생성
3. API dependencies 설치
4. npm dependencies 설치
5. PostgreSQL 컨테이너 실행
6. Alembic migration 실행
7. runtime readiness 출력
8. API `127.0.0.1:8000`와 web `127.0.0.1:3000` 실행

세부 런칭 체크리스트는 [`docs/launch-runbook.md`](docs/launch-runbook.md)를 참고하세요.

## Unreal / Pixel Streaming archive

The previous Unreal Engine renderer, Pixel Streaming helpers, UE plans, and proof artifacts are isolated under `archive/unreal/original/`.

To resume that path later, restore the archived original paths first:

```text
archive/unreal/original/renderer/unreal/
archive/unreal/original/scripts/
archive/unreal/original/docs/
archive/unreal/original/artifacts/
```

UE technotes remain in `docs/technotes/` as reference material.

## 랜딩 페이지 3D 방향

현재 랜딩 페이지는 heavy Three.js runtime을 추가하지 않고 CSS 3D로 3D/digital-twin 느낌을 강화했습니다.

구현된 것:

- hero의 tilted roadway plane
- teal current route plane과 amber candidate route plane
- floating operator brief card
- Signal Assembly의 depth ring 3개
- reduced-motion을 고려한 subtle drift animation
- 테스트 contract: `data-landing-depth-scene`, `data-depth-plane`, `data-assembly-depth-ring`

참고 레퍼런스와 디자인 의도는 [`docs/landing-3d-references.md`](docs/landing-3d-references.md)에 정리되어 있습니다.

시각 QA 산출물:

```text
artifacts/landing-3d.png
```

## 수동 실행

```bash
npm install
apps/api/.venv/bin/python -m pip install -e "apps/api[dev,ai]"
docker compose -f infra/docker-compose.yml up -d postgres
cd apps/api
.venv/bin/alembic upgrade head
```

API 실행:

```bash
cd apps/api
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

웹 실행:

```bash
npm run dev:web
```

대시보드:

```text
http://127.0.0.1:3000/dashboard
```

## 환경 변수

기본값은 `.env.example`에 있습니다.

중요 변수:

- `DATABASE_URL`: PostgreSQL 연결 문자열
- `NEXT_PUBLIC_API_BASE_URL`: 웹에서 호출할 API base URL
- `VISION_ANALYSIS_MODE`: `fixture` 또는 `opencv_yolo`
- `SUMO_SIMULATION_MODE`: `fixture` 또는 `sumo_traci`
- `OPENAI_ANSWER_MODE`: `local`, `openai_auto`, `openai`
- `OPENAI_API_KEY`: live OpenAI 답변 활성화용 secret
- `OPENAI_MONTHLY_BUDGET_USD`: live OpenAI 호출 전 예산 guard
- `KNOWLEDGE_SEARCH_MODE`: `keyword` 또는 `pgvector`
- `NEXT_PUBLIC_SIMULATION_STREAM_URL`: hosted simulation stream mount URL
- `NEXT_PUBLIC_UNITY_WEBGL_URL`: legacy Unity WebGL build mount URL alias

`openai_auto` 동작:

- `OPENAI_API_KEY`가 있으면 `/api/chat`이 OpenAI Responses gateway를 사용합니다.
- 키가 없으면 deterministic local answer로 fallback해서 demo가 계속 동작합니다.
- 키 누락 시 실패시키고 싶으면 `OPENAI_ANSWER_MODE=openai`를 사용합니다.
- 완전 local-only로 고정하려면 `OPENAI_ANSWER_MODE=local`을 사용합니다.

## 검증 명령

전체 검증:

```bash
npm run verify
```

`npm run verify`는 다음을 순서대로 실행합니다.

```bash
npm run test:api
npm run test:web
npm run build:web
git diff --check
```

개별 검증:

```bash
npm run test:api
npm run test:web
npm run build:web
npm run runtime:readiness
npm run runtime:readiness:strict
```

특정 readiness section만 strict 확인:

```bash
npm run runtime:readiness:strict -- --section vision
npm run runtime:readiness:strict -- --section simulation
npm run runtime:readiness:strict -- --section openai
npm run runtime:readiness:strict -- --section pgvector
```

OpenAI 키와 월 예산 승인 후 live smoke:

```bash
npm run openai:smoke
```

이 명령은 `OPENAI_API_KEY`와 `OPENAI_MONTHLY_BUDGET_USD`가 없으면 외부 호출 전에 실패하며, 성공해도 API key 값을 출력하지 않습니다.

## 주요 API

기본 흐름:

```text
GET  /health
POST /api/scenarios/{scenario_id}/load
GET  /api/intersection/status?scenario_id=emergency
GET  /api/events?scenario_id=emergency
POST /api/recommend-signal?scenario_id=emergency
POST /api/simulate-signal?scenario_id=emergency
POST /api/chat?scenario_id=emergency
POST /api/report?scenario_id=emergency
```

샘플/업로드 분석:

```text
GET  /api/fixtures
POST /api/fixtures/{fixture_id}/ingest
POST /api/uploads/analyze?filename=sample.jpg
GET  /api/analysis-jobs/{job_id}
```

Runtime readiness:

```text
GET /api/runtime/readiness
GET /api/runtime/readiness?section=vision
GET /api/runtime/readiness?section=simulation
GET /api/runtime/readiness?section=openai
GET /api/runtime/readiness?section=pgvector
```

## 프로젝트 구조

```text
apps/api/                 FastAPI backend
apps/api/app/api/         API routes
apps/api/app/adapters/    Vision and SUMO/TraCI adapter boundaries
apps/api/app/services/    Chat, recommendation, knowledge, runtime readiness services
apps/api/alembic/         Database migrations
apps/api/networks/        SUMO network fixture
apps/web/                 Next.js landing page and frontend
apps/web/app/page.tsx     Cinematic landing page
apps/web/components/      Dashboard cockpit, digital twin, simulation viewport components
artifacts/                Local QA screenshots and generated evidence, not required for runtime
archive/unreal/original/  Archived Unreal renderer, scripts, docs, plans, and tracked proof artifacts
docs/                     Runtime docs, runbooks, design notes
infra/docker-compose.yml  PostgreSQL/pgvector dev service
scripts/launch-local.sh   Local launch helper
```

## 개발 문서

처음 작업자는 아래 순서로 읽으면 됩니다.

1. [`AGENTS.md`](AGENTS.md)
   - 프로젝트 작업 규칙, Superpowers/Karpathy 사용, 커밋/푸시 규칙
2. [`docs/launch-runbook.md`](docs/launch-runbook.md)
   - 로컬 런칭, OpenAI live mode, simulation stream mount, production checklist
3. `archive/unreal/original/docs/unreal-pixel-streaming.md`
   - Archived Unreal Engine 5 project opening and Pixel Streaming connection procedure
4. [`docs/landing-3d-references.md`](docs/landing-3d-references.md)
   - 랜딩 페이지 3D/digital-twin 레퍼런스와 이미지 방향
5. [`docs/runtime-setup.md`](docs/runtime-setup.md)
   - YOLO/OpenCV, SUMO/TraCI, OpenAI, pgvector runtime setup
6. `docs/superpowers/plans/2026-06-08-smart-intersection-mvp.md`
   - 최초 MVP 계획
7. `docs/superpowers/specs/2026-06-08-smart-intersection-mvp-design.md`
   - 시스템 설계와 확장 방향
8. `docs/superpowers/plans/2026-06-11-phase-b-vite-react-spa-migration.md`
   - Next.js에서 Vite React SPA로 전환하는 Phase B 계획
9. `docs/superpowers/plans/2026-06-11-launch-grade-unity-openai.md`
   - launch-grade Unity/OpenAI polish 계획

## 남은 개발 범위

우선순위 기준으로 아직 더 개발해야 할 부분은 아래와 같습니다.

### 1. 3D renderer direction

The previous Unreal Engine / Pixel Streaming path is archived under `archive/unreal/original/`. If this path is resumed, restore those files first and use the archived docs/scripts from that directory.

### 2. SUMO/TraCI live simulation 강화
- fixture comparison에서 실제 TraCI stepping으로 전환
- scenario별 route file과 detector output 추가
- queue length, waiting time, emergency priority를 실제 simulation metrics로 계산
- API response와 dashboard metric copy를 fixture/live 공통 contract로 고정

### 3. Landing page production polish

- 새 section-specific 이미지의 최종 crop/압축 최적화
- mobile hero에서 3D layer가 본문 가독성을 가리지 않는지 추가 QA
- generated image alt/usage 정책 문서화
- Lighthouse 기준 LCP/INP/CLS 확인
- 필요 시 hero만 preload하고 나머지 section 이미지는 lazy strategy로 전환

### 4. Phase B frontend migration

- `docs/superpowers/plans/2026-06-11-phase-b-vite-react-spa-migration.md` 기준으로 Vite React SPA 전환
- 현재 Next.js page/component를 route 단위로 이동
- Hosted stream viewer를 browser-only SPA island로 단순화
- Cloudflare Pages/static deploy 기준 env와 build pipeline 정리

### 5. RAG / policy knowledge 품질 개선

- 실제 교통 정책 문서 ingest
- chunk metadata와 citation 표시 개선
- pgvector 검색 결과를 chat/report UI에 출처별로 표시
- OpenAI live mode의 budget guard와 smoke test는 유지

### 6. 운영 안정화

- Docker Desktop WSL integration 활성화 확인
- local launch script의 실패 복구 메시지 개선
- CI에서 `npm run verify` 고정
- security/audit advisory는 breaking fix 없이 안전하게 올릴 수 있는 Next/PostCSS 경로가 나오면 별도 처리

## 다음 확장 포인트

### YOLO/OpenCV

- 관련 파일:
  - `apps/api/app/adapters/vision.py`
  - `apps/api/tests/test_adapters.py`
  - `apps/api/tests/test_api_flow.py`
  - `.env.example`
- `VISION_ANALYSIS_MODE=opencv_yolo`로 업로드 이미지 분석 경로를 live YOLO로 전환합니다.
- 로컬 모델 파일은 `apps/api/models/yolov8n.pt`에 둘 수 있으며 git에는 커밋하지 않습니다.

### SUMO/TraCI

- 관련 파일:
  - `apps/api/app/adapters/simulation.py`
  - `apps/api/app/services/runtime_readiness.py`
  - `apps/api/networks/intersection.sumocfg`
- `SUMO_SIMULATION_MODE=sumo_traci`와 `SUMO_CONFIG_PATH=networks/intersection.sumocfg`로 live SUMO 경로를 사용합니다.

### OpenAI/pgvector RAG

- 관련 파일:
  - `apps/api/app/services/openai_clients.py`
  - `apps/api/app/services/knowledge.py`
  - `apps/api/app/services/chat.py`
  - `apps/api/app/db/models.py`
  - `apps/api/alembic/versions/`
- live OpenAI 사용 전 `OPENAI_API_KEY`와 `OPENAI_MONTHLY_BUDGET_USD`를 설정합니다.
- pgvector 검색을 켜려면 `KNOWLEDGE_SEARCH_MODE=pgvector`를 설정합니다.
- OpenAI embedding client 생성도 월 예산 guard를 통과해야 합니다.

## 디자인 방향

랜딩 페이지는 **cinematic infrastructure + digital twin** 방향입니다. 메인 hero 이미지는 유지하되, 각 섹션에는 별도 생성 이미지를 사용해 같은 이미지를 반복하지 않도록 구성했습니다.

현재 landing image map:

```text
apps/web/public/landing/intersection-hero-cinematic.png  hero main background, preserved
apps/web/public/landing/signal-overview-3d.png           signal intelligence overview inline image
apps/web/public/landing/signal-assembly-layers.png       Signal Assembly layered intersection object
apps/web/public/landing/operator-proof-room.png          proof / operator validation visual
apps/web/public/landing/final-cta-city.png               final CTA background
```

대시보드는 차분한 유리 질감의 운영 도구 UI를 지향합니다. 중앙 시뮬레이션 영역은 `apps/web/components/SimulationViewport.tsx`로 분리되어 있으며, 현재는 WebGL-style fallback, hosted stream mount slot, legacy Unity WebGL alias를 제공합니다.

관련 기록:

```text
docs/landing-3d-references.md
archive/unreal/original/docs/unreal-pixel-streaming.md
docs/design/assets/dashboard-concept-approved.png
docs/design/dashboard-concept-notes.md
```

## Archived Unreal road render captures

The previous Unreal road-render capture workflow and tracked proof images are archived under:

```text
archive/unreal/original/scripts/
archive/unreal/original/artifacts/
archive/unreal/original/docs/
```

Ignored local UE proof/cache artifacts were deleted after the tracked checkpoint commit. Restore from commit `4faf3281` or the tracked archive paths if that renderer path is resumed.
