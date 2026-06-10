#!/usr/bin/env bash
# Single clean dev server on port 5173 (kills stale Vite instances first).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash scripts/kill-dev-ports.sh

export PORT=5173
echo ""
echo "→ Ace Digital OS dev: http://localhost:5173"
echo "→ API proxy: ${VITE_DEV_API_PROXY:-https://ace-digital-api.onrender.com}"
echo ""

exec pnpm --filter @workspace/ace-digital-os dev
