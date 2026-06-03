import type { Channel } from "@workspace/db";
import { store } from "@workspace/db";

export async function channelToJson(
  channel: Channel,
  options?: {
    myRole?: string | null;
    userId?: number;
    unreadCount?: number;
    lastMessagePreview?: string | null;
    lastReadMessageId?: number | null;
  },
) {
  const team = channel.teamId ? await store.findTeamById(channel.teamId) : null;
  const members = await store.listChannelMembers(channel.id);
  let unreadCount = options?.unreadCount ?? 0;
  let lastMessagePreview = options?.lastMessagePreview ?? null;
  let lastReadMessageId = options?.lastReadMessageId ?? null;

  if (options?.userId != null && options.unreadCount === undefined) {
    const meta = await store.listChannelListMeta([channel.id], options.userId);
    unreadCount = meta.unreadCounts.get(channel.id) ?? 0;
    lastMessagePreview = meta.lastMessagePreviews.get(channel.id) ?? null;
    lastReadMessageId = meta.lastReadMessageIds.get(channel.id) ?? null;
  }

  return {
    id: channel.id,
    name: channel.name,
    description: channel.description,
    teamId: channel.teamId,
    teamName: team?.name ?? null,
    type: channel.type,
    visibility: channel.visibility,
    archived: channel.archived,
    memberCount: members.length,
    myRole: options?.myRole ?? null,
    unreadCount,
    lastPostAt: channel.lastPostAt?.toISOString() ?? null,
    lastMessagePreview,
    lastReadMessageId,
    createdById: channel.createdById ?? null,
    createdAt: channel.createdAt.toISOString(),
  };
}

export function normalizeChannelName(raw: string): string | null {
  const name = raw.trim().toLowerCase().replace(/\s+/g, "-");
  if (name.length < 2 || name.length > 80) return null;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) return null;
  return name;
}
