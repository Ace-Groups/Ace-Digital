# Channel chat (WebSocket + Firestore fallback)

Chat UX follows Slack-style patterns (flat rows, threads, DMs, stars, pins, files) on Ace shadcn — inspired by Rocket.Chat/Mattermost for unread/recency.

## Slack parity matrix

| Slack pattern | Ace Digital |
|---------------|-------------|
| Flat message rows (avatar + name + time) | `MessageRow` + `MessageHoverToolbar` |
| Sidebar: Starred, Channels (#), DMs | `RoomSidebar` + `starred` on `channel_members` |
| Header tabs: Messages, Files | `ChannelThreadHeader` + `ChannelFilesPanel` |
| Thread side panel | `ThreadSidePanel` + `parentMessageId` |
| Edit message (24h) | `PATCH /v1/channels/{id}/messages/{messageId}` |
| Star channel | `POST/DELETE /v1/channels/{id}/star` |
| Pins | `channel_pins` + pin routes |
| Markdown composer | `SlackComposer` + `react-markdown` render |
| System join lines | `messageKind: system` |
| Canvas / Huddle / Workflows | Out of scope |

## Realtime transport

| Layer | Role |
|-------|------|
| **REST** | Send messages, reactions, polls, RSVP, edits, threads, pins, files |
| **WebSocket** | Primary realtime (`message:new`, `message:updated`, `message:deleted`, `channel:activity`) |
| **Firestore** | Fallback when WebSocket is unavailable |

Protocol: [`lib/realtime-protocol`](../lib/realtime-protocol).

## Schema (Postgres / Firestore)

- `messages.parentMessageId`, `messages.editedAt`
- `channel_members.starred`
- `channel_pins` (channelId, messageId, pinnedById, pinnedAt)
- `channels.type` includes `DM`

Run `pnpm --filter @workspace/db push` after pulling.

## API highlights

- `GET /v1/channels/{id}/messages?threadRootId=` — thread replies (main feed excludes replies)
- `PATCH /v1/channels/{id}/messages/{messageId}` — edit body
- `POST /v1/dms/open`, `GET /v1/dms`
- `GET /v1/channels/{id}/files`, `GET /v1/channels/{id}/pins`

Codegen: `pnpm --filter @workspace/api-spec run codegen`

## Firestore indexes

Deploy [`firebase/firestore.indexes.json`](../firebase/firestore.indexes.json):

- `messages`: `channelId` + `createdAt`
- `messages`: `channelId` + `parentMessageId` + `createdAt` (threads)

## Subagent

Use `.cursor/agents/slack-chat-ux.md` for consistent Slack-parity UI work.

## Local development

1. API: `pnpm --filter @workspace/api-server run dev`
2. UI: `pnpm --filter @workspace/ace-digital-os run dev`
3. Typecheck: `pnpm run typecheck`

See [PRODUCTION.md](PRODUCTION.md) for deployment.
