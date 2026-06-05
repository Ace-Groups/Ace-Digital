# Channel chat

Chat uses REST for writes and Firestore `onSnapshot` listeners for realtime client updates.

## Data flow

1. The client sends messages, edits, reactions, polls, RSVPs, and deletes through the REST API.
2. The API writes to PostgreSQL through the shared store.
3. The store mirrors message and channel activity documents to Firestore.
4. Authenticated channel members receive read-only Firestore updates.

Firestore message documents use the top-level `messages/{messageId}` path and include a numeric `channelId`. Channel activity uses `channels/{channelId}`.

## Firestore indexes

Deploy [`firebase/firestore.indexes.json`](../firebase/firestore.indexes.json):

- `messages`: `channelId` + `createdAt`
- `messages`: `channelId` + `parentMessageId` + `createdAt`

## Local development

1. API: `pnpm --filter @workspace/api-server run dev`
2. UI: `pnpm --filter @workspace/ace-digital-os run dev`
3. Typecheck: `pnpm run typecheck`

See [PRODUCTION.md](PRODUCTION.md) for deployment.
