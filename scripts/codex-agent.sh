#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROMPT_FILE="$ROOT/docs/agents/codex-worker-agent.md"

usage() {
  cat <<'USAGE'
Usage:
  npm run codex:agent -- "<scoped task>"
  scripts/codex-agent.sh "<scoped task>"

Examples:
  npm run codex:agent -- "Review apps/web/components/SimulationViewport.tsx for regressions. Do not edit."
  npm run codex:agent -- "Implement the Phase B route shell in apps/web only. Do not commit."

Notes:
  - Codex CLI must be installed and authenticated first.
  - Install: npm install -g @openai/codex
  - Login: codex
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 1 ]]; then
  usage >&2
  exit 2
fi

if ! command -v codex >/dev/null 2>&1; then
  cat >&2 <<'ERR'
BLOCKED: Codex CLI is not installed or not on PATH.
Install it first, then rerun this command:
  npm install -g @openai/codex
  codex
ERR
  exit 127
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "BLOCKED: missing prompt file: $PROMPT_FILE" >&2
  exit 1
fi

TASK="$*"
FULL_PROMPT="$(cat "$PROMPT_FILE")

---

$(cat <<TASKBLOCK
Task:
$TASK
TASKBLOCK
)"

cd "$ROOT"

# Use exec for bounded worker runs. Keep sandbox policy to Codex defaults so
# the user's Codex config / app rules remain the authority.
exec codex exec "$FULL_PROMPT"
