#!/usr/bin/env bash
# Render build — do not use global/corepack pnpm (read-only /usr on Render).
# Do not npm-install pnpm into package.json (breaks frozen lockfile).
set -euo pipefail

cd "$(dirname "$0")/.."

PNPM_VERSION="10.33.2"

npx --yes "pnpm@${PNPM_VERSION}" install --frozen-lockfile
npx --yes "pnpm@${PNPM_VERSION}" --filter @workspace/api-server run build
