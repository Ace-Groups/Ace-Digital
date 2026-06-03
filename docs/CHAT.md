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
| `REDIS_URL` | api-server, realtime-server | Pub/sub between Firebase Functions API and Cloud Run realtime |
| `JWT_SECRET` | api-server, realtime-server, Functions | Must match across services (32+ chars in production) |
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

## Production (Firebase + Cloud Run)

1. Provision **Redis** (e.g. Upstash, Memorystore).
2. Deploy **realtime server**: `pnpm run deploy:realtime` (or `gcloud run deploy` with [`artifacts/realtime-server/Dockerfile`](../artifacts/realtime-server/Dockerfile)).
3. Set `REDIS_URL` on Cloud Functions (Firebase secret or env).
4. Set Hosting build env `VITE_REALTIME_WS_URL=wss://<cloud-run-url>/ws`.
5. Keep Firebase chat enabled for fallback and attachment Storage.

REST remains on Firebase Functions; WebSocket runs on Cloud Run and subscribes to Redis.

## Firestore index (fallback)

Deploy indexes from [`firebase/firestore.indexes.json`](../firebase/firestore.indexes.json):

- `messages`: `channelId` ASC, `createdAt` ASC

## Schema

Run `pnpm --filter @workspace/db push` after pulling channel read-state columns.
