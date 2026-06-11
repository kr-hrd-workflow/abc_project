#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created .env.local from .env.example"
fi

if ! grep -q '^OPENAI_API_KEY=.' .env.local; then
  echo "OPENAI_API_KEY is not set in .env.local."
  echo "Add OPENAI_API_KEY to .env.local to enable live OpenAI answers."
  echo "The app can still launch in local fixture mode."
fi

if [ ! -d apps/api/.venv ]; then
  if command -v uv >/dev/null 2>&1; then
    uv venv apps/api/.venv --python 3.12
  elif command -v python3 >/dev/null 2>&1; then
    python3 -m venv apps/api/.venv
  else
    echo "python3 or uv is required" >&2
    exit 1
  fi
fi

if ! apps/api/.venv/bin/python -c 'import fastapi' >/dev/null 2>&1; then
  apps/api/.venv/bin/python -m pip install -e 'apps/api[dev,ai]'
fi

npm install

docker compose -f infra/docker-compose.yml up -d postgres
(cd apps/api && .venv/bin/alembic upgrade head)

npm run runtime:readiness

echo "Starting API on http://127.0.0.1:8000 and web on http://127.0.0.1:3000"
trap 'kill 0' EXIT
(cd apps/api && .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000) &
npm run dev:web
