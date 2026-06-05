# Channel chat

Ace Digital OS channel chat follows a Slack-like UX: flat message rows, sidebar sections (Starred / Channels / DMs), hover toolbars, threads, markdown composer, pins, and a Files tab.

## Data flow

1. The client sends messages, edits, reactions, polls, RSVPs, threads, pins, and deletes through the REST API.
2. The API writes to PostgreSQL (dev) or Firestore (prod) through the shared store layer.
3. The store mirrors message and channel activity documents to Firestore.
4. Authenticated channel members receive read-only Firestore `onSnapshot` updates in production.

Firestore message documents use `messages/{messageId}` with a numeric `channelId`. Channel activity uses `channels/{channelId}`.

## Firestore indexes

Deploy [`firebase/firestore.indexes.json`](../firebase/firestore.indexes.json):

- `messages`: `channelId` + `createdAt`
- `messages`: `channelId` + `parentMessageId` + `createdAt`

## Slack parity matrix

| Slack pattern | Ace Digital | Notes |
|---------------|-------------|-------|
| Flat rows (avatar, name · time, body) | `MessageRow` | No iMessage bubbles for text |
| Sidebar: Starred, Channels, DMs | `RoomSidebar` | Star from API; DM picker via **Message someone** |
| Header: name, Messages / Files / Pins tabs | `ChannelThreadHeader` | Search, members, star, settings |
| Hover toolbar (react, reply, ⋯) | `MessageHoverToolbar` | Always visible on mobile (long-press menu) |
| Boxed composer + format bar | `SlackComposer` | Wraps `MessageComposer` send pipeline |
| Thread side panel | `ThreadSidePanel` | `parentMessageId` model |
| Direct messages | `type: DM`, `POST /v1/dms/open` | Sidebar DM section |
| Edit message (24h own) | `PATCH` + inline `MessageEditInline` | `editedAt` label on row |
| Starred channels | `channel_members.starred` | Header + sidebar section |
| Pinned messages | `channel_pins` table | Pins tab + message menu |
| Files tab | `GET /v1/channels/{id}/files` | `ChannelFilesPanel` |
| Markdown body | `MessageBody` + toolbar inserts | `react-markdown` / GFM |
| System / join lines | `messageKind: system` | Centered subtle row |
| Canvas, Huddle, Workflows | — | Out of scope |

## Key UI files

- Page: `artifacts/ace-digital-os/src/pages/channels.tsx`
- Layout: `ChatWorkspace`, `RoomSidebar`, `ChannelThreadHeader`
- Messages: `ChannelMessageList`, `MessageRow`, `MessageBubble`, `MessageHoverToolbar`
- Composer: `SlackComposer`, `MessageComposer`
- Threads: `ThreadSidePanel`
- Tabs: `ChannelFilesPanel`, `ChannelPinsPanel`
- DMs: `OpenDmDialog`

## Local development

1. API: `pnpm --filter @workspace/api-server run dev`
2. UI: `pnpm --filter @workspace/ace-digital-os run dev`
3. Typecheck: `pnpm run typecheck`

See [PRODUCTION.md](PRODUCTION.md) for deployment.
