import { store, type AccessContext } from "@workspace/db";
import { canAccessChannel } from "@workspace/rbac";

export async function resolveChannelAccess(ctx: AccessContext, channelId: number) {
  const channel = await store.findChannelById(channelId);
  if (!channel) return { error: "not_found" as const };
  const membership = await store.findChannelMembership(channelId, ctx.userId);
  if (!canAccessChannel(ctx, channel, membership)) {
    return { error: "forbidden" as const };
  }
  return { channel, membership };
}

export function socketAccessContext(user: {
  userId: number;
  role: string;
  teamId: number | null;
}): AccessContext {
  return {
    userId: user.userId,
    role: user.role,
    teamId: user.teamId ?? null,
  };
}

export function tempMessageIdFromClientId(clientId: string): number {
  return -Math.abs(clientId.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
}
