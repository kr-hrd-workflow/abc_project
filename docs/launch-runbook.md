# Launch Runbook

This project can launch in fixture/demo mode without secrets, then switch to live OpenAI answers by adding one secret value.

## 1. Local launch

```bash
cp .env.example .env.local
# edit .env.local and set OPENAI_API_KEY=sk-...
npm run launch:local
```

`OPENAI_MONTHLY_BUDGET_USD=10.00` is already present in `.env.example` as a safety budget guard. Change it if the approved budget is different.

## 2. OpenAI live answer mode

Default behavior:

```env
OPENAI_ANSWER_MODE=openai_auto
OPENAI_MONTHLY_BUDGET_USD=10.00
OPENAI_API_KEY=sk-...
```

- If `OPENAI_API_KEY` is present, `/api/chat` uses the OpenAI Responses gateway.
- If the key is missing, `/api/chat` falls back to the local deterministic answer so the demo still runs.
- If you want the API to fail instead of fallback when the key is missing, set `OPENAI_ANSWER_MODE=openai`.
- If you want local-only answers, set `OPENAI_ANSWER_MODE=local`.

No endpoint returns the API key value. Readiness reports presence only.

## 3. Dashboard renderer selection

The dashboard simulation viewport chooses renderers in this order:

1. External renderer: `NEXT_PUBLIC_SIMULATION_STREAM_URL` iframe remains highest priority.
2. Legacy renderer: `NEXT_PUBLIC_UNITY_WEBGL_URL` is used only when the generic stream URL is absent.
3. Default renderer: internal R3F digital twin when enabled and WebGL is available.
4. Fallback renderer: existing CSS/canvas virtual CCTV when R3F is disabled, unavailable, or WebGL fails.

R3F runtime is implemented through Stage 5 browser visual proof. Current repo evidence also implements Stage 6A frame-backed renderer state, Stage 6B signal-state hardware and operator overlays, and Stage 6C default verification gates. SUMO/TraCI/Tarcl remains simulation truth. Browser rendering may interpolate received state, but it cannot invent traffic truth or perform real signal control. Image Gen references are visual targets only, not runtime evidence.

Status vocabulary:

| Term | Meaning |
|---|---|
| implemented | Code or documentation exists and is wired locally. |
| verified | Fresh local tests, build, browser proof, or docs checks passed. |
| gated | Included in `npm run verify` and the checked-in R3F dashboard workflow. |
| not live truth | Fixture, aggregate, or received simulation state is being rendered; the browser is not a SUMO/Tarcl authority. |

Current R3F dashboard status:

| Stage | Status | Evidence and boundary |
|---|---|---|
| Stage 1 R3F island | implemented, verified | Browser-only R3F island is the internal renderer when enabled and WebGL is available. |
| Stage 2 frame contract | implemented, verified, not live truth | `/api/simulation/frame` and `SimulationFrameSnapshot` exist. |
| Stage 3 geometry and density | implemented, verified, not live truth | Procedural roads and density rendering exist without invented traffic truth. |
| Stage 4/4.1 assets and materials | implemented, verified, gated | Asset manifest, shipped GLBs/textures, proof images, and `verify:r3f-assets` enforce the asset bar. |
| Stage 5 browser proof | implemented, verified, gated, not live truth | Browser screenshots and verifier artifacts prove the R3F renderer, not live traffic control. |
| Stage 6A frame wiring | implemented, verified, not live truth | R3F prefers frame-backed snapshots and labels fixture fallback. |
| Stage 6B dynamic signals | implemented, verified, not live truth | Signal hardware and source badges render received signal state or explicit `unavailable`. |
| Stage 6C default gates | implemented, verified, gated | Root `npm run verify` and the R3F dashboard workflow include asset and browser proof. |
| Stage 6D docs reconciliation | implemented, verified | README, runbook, technote, and plan use implemented/verified/gated wording without production-ready claims. |

The hosted simulation render slot can mount any simulator page:

```env
NEXT_PUBLIC_SIMULATION_STREAM_URL=http://127.0.0.1
```

When this value is set, the dashboard mounts the stream page in the central simulation viewport. Without it, the dashboard uses the internal R3F path when enabled and WebGL is available, otherwise it keeps the committed CSS/canvas virtual CCTV fallback.

Legacy Unity WebGL exports remain supported through a compatibility alias:

```env
NEXT_PUBLIC_UNITY_WEBGL_URL=/unity/index.html
```

`NEXT_PUBLIC_SIMULATION_STREAM_URL` takes priority when both values are set.

Expected Unity export layout if a Unity build is kept for compatibility:

```text
apps/web/public/unity/index.html
apps/web/public/unity/Build/...
apps/web/public/unity/TemplateData/...
```

Keep the safety copy visible: this is a digital twin and operator decision-support surface. It does not control real traffic signals and it is not a live CCTV feed.

## 4. Local quality gate

Run the normal local quality gate before release or handoff:

```bash
npm run verify
```

`npm run verify` runs API tests, web tests, the web build, R3F asset proof, R3F dashboard browser proof, and `git diff --check`.

The checked-in R3F dashboard workflow runs the same test/build/proof commands for `push` and `pull_request`. Branch protection, required-check settings, and CodeQL configuration are external GitHub settings and are not changed by this workflow.

## 5. Production deployment checklist

1. Set environment variables in the hosting platform:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_API_BASE_URL`
   - `OPENAI_API_KEY`
   - `OPENAI_MONTHLY_BUDGET_USD`
   - optional `NEXT_PUBLIC_SIMULATION_STREAM_URL`
   - optional legacy alias `NEXT_PUBLIC_UNITY_WEBGL_URL`
2. Run migrations:
   - `cd apps/api && .venv/bin/alembic upgrade head`
3. Verify readiness:
   - `npm run runtime:readiness`
4. Run guarded OpenAI smoke after approved API credit is available:
   - `npm run openai:smoke`
5. Verify build:
   - `npm run test:api`
   - `npm run test:web`
   - `npm run build:web`
   - `npm run verify`

## 6. Safety boundaries

- The UI may recommend an operator action, but it never directly changes a real signal controller.
- The dashboard renderer is presentation/digital-twin visualization unless an approved external simulator stream is configured.
- All OpenAI usage must keep keys in ignored env files or hosting secrets, not committed files.
