# Channel chat (WebSocket + Firestore fallback)

Chat UX patterns are inspired by [Rocket.Chat](https://github.com/RocketChat/Rocket.Chat) (MIT) and Mattermost-style unread/recency — implemented on Ace shadcn without Fuselage or Meteor.

## Realtime transport

| Layer | Role |
|-------|------|
| **REST** | Send messages, reactions, polls, RSVP; initial history load |
| **WebSocket** | Primary realtime (`message:new`, `message:updated`, `message:deleted`, `channel:activity`, `notification:new`) |
| **Firestore** | Fallback when WebSocket is unavailable (`onSnapshot` on `messages`) |

Protocol definitions live in [`lib/realtime-protocol`](../lib/realtime-protocol).

## Environment

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_REALTIME_WS_URL` | ace-digital-os | Production WebSocket URL (`wss://…`). Unset in dev → Vite proxies `/ws` to api-server |
| `REDIS_URL` | api-server (Render) | Optional pub/sub; single Render instance uses in-process hub |
| `JWT_SECRET` | api-server (Render), Functions (if used) | Must match token signing (32+ chars in production) |
| `VITE_FIREBASE_CHAT` | ace-digital-os | Set to `false` to disable Firestore fallback + Storage chat |
| `FIREBASE_CHAT_ENABLED` | api-server | Set to `false` to disable mirror + custom token |
| `FIREBASE_CHAT_MIRROR` | api-server | Set to `false` to skip Postgres → Firestore message mirror |
| `GCLOUD_PROJECT` / `FIREBASE_PROJECT_ID` | api-server | Firebase Admin project for mirror when using Postgres |
| `FIRESTORE_EMULATOR_HOST` | api-server | Enables mirror against the emulator |

When `DATABASE_URL` is set (local dev), Postgres is canonical. Messages may still be mirrored to Firestore for fallback realtime.

## Local development

1. Start API (HTTP + WebSocket on `/ws`): `pnpm --filter @workspace/api-server run dev`
2. Start UI: `pnpm --filter @workspace/ace-digital-os run dev`
3. Optional: run dedicated realtime + Redis to mimic production:
   - `REDIS_URL=redis://localhost:6379 pnpm --filter @workspace/realtime-server run dev`
   - Set `REDIS_URL` on api-server as well (inline hub still works without Redis locally)

## Production (Firebase Hosting + Render)

See **[PRODUCTION.md](PRODUCTION.md)** for URLs and verify steps.

1. **Render** runs api-server (REST + `/ws`). Env: `JWT_SECRET`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `USE_FIRESTORE=true`, optional `REDIS_URL`. Deploy: push to `main` or manual deploy; build `bash scripts/render-build.sh`.
2. **Hosting** build: `pnpm run build:web:render` then `firebase deploy --only hosting` (sets `VITE_API_BASE_URL` and `VITE_REALTIME_WS_URL` to Render).
3. Keep **`VITE_FIREBASE_CHAT=true`** for Firestore fallback and Storage attachments.
4. External **cron** pings `/api/healthz` every 10–14 min on the free Render plan ([RENDER_KEEPALIVE_CRON.md](RENDER_KEEPALIVE_CRON.md)).

**Legacy:** separate Cloud Run realtime (`pnpm run deploy:realtime`) + Functions-only REST — not used in the live Render setup.

## Firestore index (fallback)

Deploy indexes from [`firebase/firestore.indexes.json`](../firebase/firestore.indexes.json):

- `messages`: `channelId` ASC, `createdAt` ASC

## Schema

Run `pnpm --filter @workspace/db push` after pulling channel read-state columns.
