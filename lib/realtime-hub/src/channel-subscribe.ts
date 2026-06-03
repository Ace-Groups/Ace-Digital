import { store, type AccessContext } from "@workspace/db";
import { canAccessChannel, hasPermission } from "@workspace/rbac";
import type { SubscribeChecker } from "./hub.js";

export function createChannelSubscribeChecker(): SubscribeChecker {
  return async (userId, auth, channelIds) => {
    const ctx: AccessContext = {
      userId,
      role: auth.role,
      teamId: auth.teamId,
    };
    const allowed: number[] = [];
    for (const channelId of channelIds) {
      const channel = await store.findChannelById(channelId);
      if (!channel) continue;
      const membership = await store.findChannelMembership(channelId, userId);
      const effectiveMembership =
        membership ??
        (hasPermission(ctx, "channels:all") ? { role: "owner" as const } : null);
      if (canAccessChannel(ctx, channel, effectiveMembership)) {
        allowed.push(channelId);
      }
    }
    return allowed;
  };
}
