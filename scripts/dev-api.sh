#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export PORT="${PORT:-8080}"
export USE_FIRESTORE="${USE_FIRESTORE:-false}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Copy .env.example to .env and run: pnpm db:setup"
  exit 1
fi

pnpm --filter @workspace/api-server build
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
