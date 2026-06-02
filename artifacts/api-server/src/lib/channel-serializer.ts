import type { Channel } from "@workspace/db";
import { store } from "@workspace/db";

export async function channelToJson(
  channel: Channel,
  options?: { myRole?: string | null; includeArchived?: boolean },
) {
  const team = channel.teamId ? await store.findTeamById(channel.teamId) : null;
  const members = await store.listChannelMembers(channel.id);
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
    unreadCount: 0,
    createdAt: channel.createdAt.toISOString(),
  };
}

export function normalizeChannelName(raw: string): string | null {
  const name = raw.trim().toLowerCase().replace(/\s+/g, "-");
  if (name.length < 2 || name.length > 80) return null;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) return null;
  return name;
}
