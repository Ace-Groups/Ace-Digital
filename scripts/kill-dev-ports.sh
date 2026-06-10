#!/usr/bin/env bash
# Free Ace Digital OS dev ports (stale Vite instances cause broken API proxies).
set -euo pipefail
for port in $(seq 5173 5185); do
  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "Killing process on port $port (pid $pids)"
    kill -9 $pids 2>/dev/null || true
  fi
done
