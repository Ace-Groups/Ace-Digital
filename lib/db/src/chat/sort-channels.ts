export type ChannelSortInput = {
  id: number;
  name: string;
  unreadCount: number;
  lastPostAt: Date | null | undefined;
};

/** Sidebar order: unread first, then recency, then name. */
export function sortChannelsForSidebar<T extends ChannelSortInput>(channels: T[]): T[] {
  return [...channels].sort((a, b) => {
    const aUnread = (a.unreadCount ?? 0) > 0 ? 1 : 0;
    const bUnread = (b.unreadCount ?? 0) > 0 ? 1 : 0;
    if (bUnread !== aUnread) return bUnread - aUnread;

    const aTime = a.lastPostAt?.getTime() ?? 0;
    const bTime = b.lastPostAt?.getTime() ?? 0;
    if (bTime !== aTime) return bTime - aTime;

    return a.name.localeCompare(b.name);
  });
}
