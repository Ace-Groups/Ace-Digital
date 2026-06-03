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

export function canManageChannel(
  ctx: AccessContext,
  membership: ChannelMembershipInfo,
): boolean {
  if (hasPermission(ctx, "channels:all")) return true;
  return membership?.role === "owner";
}

export type MessageDeleteInfo = {
  senderId: number;
};

export type ChannelDeleteInfo = {
  createdById: number | null;
};

export function canDeleteMessage(
  ctx: AccessContext,
  message: MessageDeleteInfo,
  channel: ChannelDeleteInfo,
  membership: ChannelMembershipInfo,
): boolean {
  if (ctx.role === "super_admin") return true;
  if (message.senderId === ctx.userId) return true;
  if (channel.createdById != null && channel.createdById === ctx.userId) return true;
  if (membership?.role === "owner") return true;
  return false;
}
