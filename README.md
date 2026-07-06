# 스마트 교차로 의사결정 지원 대시보드

교차로 운영자를 위한 **AI 의사결정 지원 MVP**입니다. 실제 교통 신호를 직접 제어하지 않고, 저장된 시나리오·비전 분석·시뮬레이션·정책 근거를 바탕으로 운영자에게 추천, 비교, 리포트, 채팅 답변을 제공합니다.

## 현재 상태

최신 `main` 기준으로 아래 범위가 구현되어 있습니다.

- `Next.js 16 preview + React 19 + TypeScript` 기반 웹 랜딩 페이지와 운영자 대시보드
- `FastAPI + SQLAlchemy + Alembic` 기반 API
- Docker Compose 기반 PostgreSQL/pgvector 개발 환경
- 긴급차량, 보행자 대기, 일반 흐름, 교차로 막힘 시나리오
- 교차로 상태, 이벤트, 추천, SUMO형 시뮬레이션 비교, 채팅, 리포트 API
- 이미지/영상/virtual CCTV fixture 목록, fixture ingest, 업로드 분석 job API
- 한국어/영어 전환 가능한 운영자 cockpit UI
- landing hero의 CSS-only 3D/isometric roadway scene
- Signal Assembly 섹션의 GSAP sticky scroll + depth ring scene
- `/dashboard` 기본 R3F digital twin renderer
- Stage 6 R3F 실사형 마감: postFX, 젖은 PBR 도로, 반사/비/스프레이, 신호등/전조등, 차량 LOD, CCTV 스타일 카메라, 도로 소품, visual regression proof
- Low/Medium/High/Ultra 품질 preset과 heavy feature gating
- R3F telemetry: quality preset, postFX chain, reflection/weather state, draw calls, visible vehicles, source/stale/fallback labels
- 실사형 WebGL 스타일 가상 CCTV fallback 및 WebGL-off fallback proof
- `NEXT_PUBLIC_SIMULATION_STREAM_URL` 설정 시 hosted simulation iframe mount slot
- `NEXT_PUBLIC_UNITY_WEBGL_URL` legacy Unity WebGL 호환 alias
- 보관된 Unreal renderer scaffold와 helper scripts: `archive/unreal/original/`
- OpenAI live 답변 gateway와 `openai_auto` fallback 모드
- OpenAI API 키/월 예산 guard 및 secret 미노출 readiness report
- keyword 기반 로컬 정책 근거 검색과 `KNOWLEDGE_SEARCH_MODE=pgvector` 옵션
- PostgreSQL `vector` extension, `knowledge_chunks.embedding` migration, pgvector 검색 경로
- `/api/runtime/readiness`와 CLI readiness checks
- Guarded OpenAI smoke CLI: `npm run openai:smoke`
- 통합 검증 스크립트와 GitHub Actions workflow: `npm run verify`, `.github/workflows/r3f-dashboard-verify.yml`

## 안전 경계

이 프로젝트는 **운영자 의사결정 지원 도구**입니다.

- 실제 신호 제어기와 직접 연결하지 않습니다.
- 추천은 “운영자 참고용”이며 자동 제어 명령이 아닙니다.
- R3F/WebGL/Unity/stream viewport는 digital twin/시연 화면입니다. live CCTV라고 표현하면 안 됩니다.
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

Windows PowerShell에서 `npm` 또는 bash 환경이 잡혀 있지 않으면:

```powershell
.\scripts\launch-local.ps1
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

## Unreal / Pixel Streaming 보관본

이전 Unreal Engine renderer, Pixel Streaming helper, UE 계획, proof artifact는 `archive/unreal/original/` 아래에 격리되어 있습니다.

나중에 이 경로를 재개하려면 먼저 아래 archived original path를 복원하세요.

```text
archive/unreal/original/renderer/unreal/
archive/unreal/original/scripts/
archive/unreal/original/docs/
archive/unreal/original/artifacts/
```

UE technote는 참고 자료로 `docs/technotes/`에 남아 있습니다.

## 대시보드 렌더러 방향

`/dashboard` simulation viewport의 renderer 우선순위는 다음과 같습니다.

- 외부 renderer: `NEXT_PUBLIC_SIMULATION_STREAM_URL` iframe이 가장 높은 우선순위입니다.
- Legacy renderer: generic stream URL이 없을 때만 `NEXT_PUBLIC_UNITY_WEBGL_URL` alias를 사용합니다.
- 기본 renderer: WebGL 사용 가능 시 내부 R3F digital twin을 사용합니다.
- Fallback renderer: R3F가 비활성화되었거나 WebGL이 실패하면 CSS/canvas virtual CCTV fallback을 사용합니다.

R3F runtime은 Stage 6 finishing wave까지 구현되어 있습니다. 현재 `/dashboard` proof는 젖은 도시 교통 카메라 장면을 목표로 postFX, PBR 도로, wet reflection, rain/spray, signal/headlight lighting, vehicle LOD/material, CCTV camera framing, road props, generated atlas source asset, quality preset, telemetry, visual regression gate를 포함합니다.

중요한 truth boundary:

- `SimulationFrameSnapshot.vehicles`만 precise vehicle truth입니다.
- `density_segments` 또는 fixture fallback은 aggregate density 표현에만 사용하며 source/stale/fallback label을 표시합니다.
- 브라우저 renderer는 수신된 simulation state를 보간할 수 있지만 차량 truth를 발명하거나 실제 신호 제어를 수행하지 않습니다.
- Image Gen으로 만든 atlas는 repo-bound runtime source asset입니다. proof는 browser-rendered `/dashboard` screenshot과 telemetry에서 확인합니다.

상태 용어:

| 용어 | 의미 |
|---|---|
| implemented | 코드 또는 문서가 존재하고 로컬에서 wiring되어 있습니다. |
| verified | 최신 로컬 test, build, browser proof, docs check가 통과했습니다. |
| gated | `npm run verify`와 checked-in R3F dashboard workflow에 포함되어 있습니다. |
| not live truth | fixture, aggregate, 또는 수신된 simulation state를 렌더링합니다. 브라우저는 SUMO/TraCI authority가 아닙니다. |

현재 R3F dashboard 상태:

| Stage | Status | 증거와 경계 |
|---|---|---|
| Stage 1-3 R3F island/frame/geometry | implemented, verified, not live truth | R3F island, `/api/simulation/frame`, `SimulationFrameSnapshot`, procedural road, density rendering이 있습니다. fixture/aggregate data는 label로 표시합니다. |
| Stage 4/4.1 assets/materials | implemented, verified, gated | Asset manifest, GLB, texture, proof image, generated atlas가 있으며 `verify:r3f-assets`가 payload/provenance boundary를 강제합니다. |
| Stage 5 browser proof | implemented, verified, gated, not live truth | `/dashboard` desktop/mobile/WebGL-off screenshot은 browser rendering proof이며 live traffic control proof가 아닙니다. |
| Stage 6A-6C frame/signals/default gates | implemented, verified, gated, not live truth | Frame-backed renderer state, signal hardware, source badge, telemetry field, default R3F CI gate가 연결되어 있습니다. |
| Stage 6D-6F docs/telemetry/security | implemented, verified, gated | Runbook, technote, asset license note, telemetry normalization, security verifier, artifact retention, CI workflow가 업데이트되어 있습니다. |
| Stage 6 finishing wave | implemented, verified, gated, not live truth | Stage6PostFX, wet PBR road, reflection/decal atlas, rain/weather particle, wheel spray, vehicle LOD/material smoothing, camera/clutter/road props, quality preset, performance/visual-diff gate, proof artifact가 포함되어 있습니다. |

최신 proof artifact:

```text
artifacts/r3f-dashboard-desktop-canvas.png
artifacts/r3f-dashboard-mobile-canvas.png
artifacts/r3f-dashboard-webgl-off.png
artifacts/r3f-dashboard-details.json
artifacts/r3f-security-gates.json
```

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

렌더러(CCTV/3D/photoreal viewport) 결정을 보류한 상태에서 현재 로컬 MVP
흐름만 확인할 때는 아래 세트를 사용합니다. 이 세트는 git 명령을 실행하지
않고, R3F visual/performance gate도 제외합니다.

```bash
npm run test:api
npm run test:web
npm run build:web
npm run runtime:readiness
```

2026-07-06 KST 로컬 재검증 참고:

- API 시나리오 연결 확인: `normal`, `emergency`, `pedestrian`, `blocked`
  모두 `/api/simulation/frame`에서 `source=sumo_traci`를 반환합니다.
- `/api/simulate-signal`은 현재 `source=sumo_traci_fixture`의 시나리오
  비교 지표입니다. 실시간 TraCI 최적화 결과로 표현하지 않습니다.
- `/api/runtime/readiness`: simulation과 OpenAI는 ready, vision은
  fixture mode, pgvector는 PostgreSQL `vector` extension 미준비 상태입니다.
- `pnpm` 환경에서 `sharp` build script 승인이 필요하면 web test 실행 전
  `pnpm approve-builds` 정책을 확인해야 합니다.

전체 검증:

```bash
npm run verify
```

`npm run verify`는 다음을 순서대로 실행합니다.

```bash
npm run test:api
npm run test:web
npm run build:web
npm run verify:r3f-assets
npm run verify:r3f-dashboard
npm run verify:r3f-performance
npm run verify:r3f-visual-diff
npm run verify:security
git diff --check
```

`npm run verify`는 기본 local quality gate입니다. API/web test, production build, R3F asset proof, R3F dashboard browser proof, performance telemetry proof, visual scenario proof, security gate, whitespace diff check를 순서대로 실행합니다.

개별 검증:

```bash
npm run test:api
npm run test:web
npm run build:web
npm run verify:r3f-assets
npm run verify:r3f-dashboard
npm run verify:r3f-performance
npm run verify:r3f-visual-diff
npm run verify:security
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
apps/web/                 Next.js landing page와 frontend
apps/web/app/page.tsx     cinematic landing page
apps/web/components/      dashboard cockpit, digital twin, simulation viewport component
apps/web/components/r3f/  R3F dashboard renderer, Stage 6 postFX/weather/vehicle/road layer
apps/web/public/simulation/r3f/assets/
                          R3F GLB, texture, sprite, generated atlas runtime asset
artifacts/                local QA screenshot과 generated evidence, runtime 필수 아님
archive/unreal/original/  보관된 Unreal renderer, script, docs, plan, tracked proof artifact
docs/                     runtime docs, runbook, design note
infra/docker-compose.yml  PostgreSQL/pgvector dev service
scripts/launch-local.sh   Local launch helper
scripts/verify-r3f-*.mjs  R3F asset, dashboard, performance, visual proof verifier
```

## 개발 문서

처음 작업자는 아래 순서로 읽으면 됩니다.

1. [`AGENTS.md`](AGENTS.md)
   - 프로젝트 작업 규칙, Superpowers/Karpathy 사용, 커밋/푸시 규칙
2. [`docs/launch-runbook.md`](docs/launch-runbook.md)
   - 로컬 런칭, OpenAI live mode, simulation stream mount, production checklist
3. `archive/unreal/original/docs/unreal-pixel-streaming.md`
   - 보관된 Unreal Engine 5 project opening과 Pixel Streaming 연결 절차
4. [`docs/landing-3d-references.md`](docs/landing-3d-references.md)
   - 랜딩 페이지 3D/digital-twin 레퍼런스와 이미지 방향
5. [`docs/runtime-setup.md`](docs/runtime-setup.md)
   - YOLO/OpenCV, SUMO/TraCI, OpenAI, pgvector runtime setup
6. [`docs/technotes/r3f-photoreal-dashboard-renderer.md`](docs/technotes/r3f-photoreal-dashboard-renderer.md)
   - R3F dashboard renderer, proof artifact, telemetry, verification notes
7. `docs/superpowers/plans/2026-06-19-r3f-photoreal-finishing-wave.md`
   - Stage 6 R3F photoreal finishing wave 실행 계획과 acceptance gate
8. `docs/superpowers/plans/2026-06-08-smart-intersection-mvp.md`
   - 최초 MVP 계획
9. `docs/superpowers/specs/2026-06-08-smart-intersection-mvp-design.md`
   - 시스템 설계와 확장 방향
10. `docs/superpowers/plans/2026-06-11-phase-b-vite-react-spa-migration.md`
   - Next.js에서 Vite React SPA로 전환하는 Phase B 계획
11. `docs/superpowers/plans/2026-06-11-launch-grade-unity-openai.md`
   - launch-grade Unity/OpenAI polish 계획

## 남은 개발 범위

우선순위 기준으로 아직 더 개발해야 할 부분은 아래와 같습니다.

### 1. R3F dashboard 운영 고도화

- 현재 기본 renderer는 R3F입니다. 새 장면/효과를 추가할 때도 `SimulationFrameSnapshot.vehicles` truth boundary와 fallback label을 유지해야 합니다.
- Low/Medium/High/Ultra preset별 heavy feature budget을 유지하고, 새 visual scenario를 추가하면 `verify:r3f-visual-diff` baseline도 함께 갱신합니다.
- 이전 Unreal Engine / Pixel Streaming 경로는 `archive/unreal/original/`에 보관되어 있습니다. 해당 경로를 재개할 때만 archived docs/scripts를 먼저 복원합니다.

### 2. SUMO/TraCI live simulation 강화
- `/api/simulation/frame`은 live SUMO/TraCI 차량/보행자 frame을 사용합니다.
- `/api/simulate-signal` fixture comparison을 실제 TraCI stepping 기반
  plan comparison으로 전환
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

대시보드는 차분한 유리 질감의 운영 도구 UI를 지향합니다. 중앙 시뮬레이션 영역은 `apps/web/components/SimulationViewport.tsx`가 renderer 우선순위를 정하고, 기본 화면은 `apps/web/components/r3f/R3FSimulationViewport.tsx`의 R3F digital twin이 담당합니다. WebGL failure, hosted stream mount slot, legacy Unity WebGL alias는 fallback/compatibility 경로입니다.

관련 기록:

```text
docs/landing-3d-references.md
archive/unreal/original/docs/unreal-pixel-streaming.md
docs/design/assets/dashboard-concept-approved.png
docs/design/dashboard-concept-notes.md
```

## 보관된 Unreal road render capture

이전 Unreal road-render capture workflow와 tracked proof image는 아래 경로에 보관되어 있습니다.

```text
archive/unreal/original/scripts/
archive/unreal/original/artifacts/
archive/unreal/original/docs/
```

Git에 추적되지 않던 local UE proof/cache artifact는 tracked checkpoint commit 이후 삭제되었습니다. 해당 renderer 경로를 재개한다면 commit `4faf3281` 또는 tracked archive path에서 복원하세요.
