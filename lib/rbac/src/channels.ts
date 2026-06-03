import type { AccessContext } from "./types";
import { hasPermission } from "./permissions";

export type ChannelAccessInfo = {
  archived: boolean;
  type: string;
};

export type ChannelMembershipInfo = {
  role: string;
} | null;

export function canAccessChannel(
  ctx: AccessContext,
  channel: ChannelAccessInfo,
  membership: ChannelMembershipInfo,
): boolean {
  if (hasPermission(ctx, "channels:all")) return true;
  if (!membership) return false;
  if (channel.archived) return true;
  return true;
}

export function canPostInChannel(
  ctx: AccessContext,
  channel: ChannelAccessInfo,
  membership: ChannelMembershipInfo,
): boolean {
  if (!hasPermission(ctx, "channels:post")) return false;
  if (hasPermission(ctx, "channels:all")) return true;
  if (!membership) return false;
  if (channel.archived) return false;
  if (channel.type === "ANNOUNCEMENT" && membership.role === "viewer") return false;
  return membership.role === "owner" || membership.role === "member";
}

function isChannelOwnerRole(role: string | undefined | null): boolean {
  return role?.toLowerCase() === "owner";
}

export function canManageChannel(
  ctx: AccessContext,
  membership: ChannelMembershipInfo,
  channel?: ChannelDeleteInfo | null,
): boolean {
  if (hasPermission(ctx, "channels:all")) return true;
  if (channel?.createdById != null && channel.createdById === ctx.userId) return true;
  return isChannelOwnerRole(membership?.role);
}

/** Messages can only be deleted within this window after they were sent. */
export const MESSAGE_DELETE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type MessageDeleteInfo = {
  senderId: number;
  createdAt?: Date | string | null;
};

export type ChannelDeleteInfo = {
  createdById: number | null;
};

export function isWithinMessageDeleteWindow(
  createdAt: Date | string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (createdAt == null || createdAt === "") return false;
  const ms =
    typeof createdAt === "string" ? new Date(createdAt).getTime() : createdAt.getTime();
  if (Number.isNaN(ms)) return false;
  return nowMs - ms >= 0 && nowMs - ms <= MESSAGE_DELETE_WINDOW_MS;
}

export function canDeleteMessage(
  ctx: AccessContext,
  message: MessageDeleteInfo,
  channel: ChannelDeleteInfo,
  membership: ChannelMembershipInfo,
): boolean {
  if (!isWithinMessageDeleteWindow(message.createdAt)) return false;
  if (ctx.role === "super_admin") return true;
  if (message.senderId === ctx.userId) return true;
  if (channel.createdById != null && channel.createdById === ctx.userId) return true;
  if (membership?.role === "owner") return true;
  return false;
}
