# Channel chat (Firestore realtime)

Chat UX patterns are inspired by [Rocket.Chat](https://github.com/RocketChat/Rocket.Chat) (MIT) and Mattermost-style unread/recency — implemented on Ace shadcn without Fuselage or Meteor.

## Environment

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_FIREBASE_CHAT` | ace-digital-os | Set to `false` to disable client Firebase chat |
| `FIREBASE_CHAT_ENABLED` | api-server | Set to `false` to disable mirror + custom token |
| `FIREBASE_CHAT_MIRROR` | api-server | Set to `false` to skip Postgres → Firestore message mirror |
| `GCLOUD_PROJECT` / `FIREBASE_PROJECT_ID` | api-server | Firebase Admin project for mirror when using Postgres |
| `FIRESTORE_EMULATOR_HOST` | api-server | Enables mirror against the emulator |

When `DATABASE_URL` is set, Postgres is canonical. Messages are mirrored to Firestore `messages` for client `onSnapshot` realtime.

## Firestore index

Deploy indexes from [`firebase/firestore.indexes.json`](../firebase/firestore.indexes.json). Required for live messages:

- `messages`: `channelId` ASC, `createdAt` ASC

## Schema

Run `pnpm --filter @workspace/db push` after pulling channel read-state columns.
