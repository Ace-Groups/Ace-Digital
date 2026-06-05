import {
  Hash, Megaphone, Lock, Star, Briefcase, Zap, Heart, Radio,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const CHANNEL_ICON_PREFIX = "icon:";

export const CHANNEL_ICONS = [
  { id: "hash", icon: Hash, label: "Channel" },
  { id: "megaphone", icon: Megaphone, label: "Announcement" },
  { id: "lock", icon: Lock, label: "Private" },
  { id: "star", icon: Star, label: "Starred" },
  { id: "briefcase", icon: Briefcase, label: "Work" },
  { id: "zap", icon: Zap, label: "Urgent" },
  { id: "heart", icon: Heart, label: "Social" },
  { id: "radio", icon: Radio, label: "Broadcast" },
] as const;

export type ChannelIconId = (typeof CHANNEL_ICONS)[number]["id"];

export function encodeChannelIcon(id: ChannelIconId): string {
  return `${CHANNEL_ICON_PREFIX}${id}`;
}

export function parseChannelIcon(avatarUrl: string | null | undefined): ChannelIconId | null {
  if (!avatarUrl?.startsWith(CHANNEL_ICON_PREFIX)) return null;
  const id = avatarUrl.slice(CHANNEL_ICON_PREFIX.length) as ChannelIconId;
  return CHANNEL_ICONS.some((i) => i.id === id) ? id : null;
}

export function getChannelIconComponent(id: ChannelIconId): LucideIcon {
  return CHANNEL_ICONS.find((i) => i.id === id)?.icon ?? Hash;
}

export function defaultIconForChannelType(type: string): string {
  return type === "ANNOUNCEMENT" ? encodeChannelIcon("megaphone") : encodeChannelIcon("hash");
}
