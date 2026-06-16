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
3. Default renderer: internal R3F digital twin when implemented/enabled and WebGL is available.
4. Fallback renderer: existing CSS/canvas virtual CCTV when R3F is disabled, unavailable, or WebGL fails.

Stage 0 records the selected path; it does not mean the R3F runtime is already implemented or enabled. SUMO/TraCI/Tarcl remains simulation truth. Browser rendering may interpolate received state, but it cannot invent traffic truth. Image Gen references are visual targets only, not runtime evidence.

The hosted simulation render slot can mount any simulator page:

```env
NEXT_PUBLIC_SIMULATION_STREAM_URL=http://127.0.0.1
```

When this value is set, the dashboard mounts the stream page in the central simulation viewport. Without it, the dashboard uses the internal R3F path once implemented/enabled and WebGL is available, otherwise it keeps the committed CSS/canvas virtual CCTV fallback.

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

## 4. Production deployment checklist

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

## 5. Safety boundaries

- The UI may recommend an operator action, but it never directly changes a real signal controller.
- The dashboard renderer is presentation/digital-twin visualization unless an approved external simulator stream is configured.
- All OpenAI usage must keep keys in ignored env files or hosting secrets, not committed files.
