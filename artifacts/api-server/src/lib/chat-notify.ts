import { store } from "@workspace/db";
import { publishNotificationNew } from "./realtime-publish";

export async function notifyChannelMembers(
  channelId: number,
  senderId: number,
  channelName: string,
  preview: string,
  onlyUserIds?: number[],
): Promise<void> {
  const members = await store.listChannelMembers(channelId);
  let targets = members.filter((m) => m.userId !== senderId);
  if (onlyUserIds?.length) {
    const set = new Set(onlyUserIds);
    targets = targets.filter((m) => set.has(m.userId));
  }
  await Promise.all(
    targets.map(async (m) => {
      const notification = await store.createNotification({
        userId: m.userId,
        title: `#${channelName}`,
        body: preview,
        link: `/channels?channel=${channelId}`,
      });
      void publishNotificationNew({
        userId: notification.userId,
        id: notification.id,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        createdAt: notification.createdAt,
      }).catch((err) => console.error("[realtime-notify]", err));
    }),
  );
}
