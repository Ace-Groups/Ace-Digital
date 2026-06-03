/** Mattermost-inspired unread helpers (count-based and timestamp-based). */

export function calculateUnreadCount(
  messageCountSinceRead: number,
): number {
  return Math.max(0, messageCountSinceRead);
}

export function formatUnreadBadge(count: number): string {
  if (count <= 0) return "";
  if (count > 99) return "99+";
  return String(count);
}

export function isMessageUnread(
  messageCreatedAt: Date,
  lastReadAt: Date | null | undefined,
  joinedAt: Date,
  senderId: number,
  viewerId: number,
): boolean {
  if (senderId === viewerId) return false;
  const baseline = lastReadAt ?? joinedAt;
  return messageCreatedAt > baseline;
}
