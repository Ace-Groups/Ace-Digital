import { store } from "@workspace/db";
import { createNotificationWithPush } from "./push-notify";

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
  const channel = await store.findChannelById(channelId);
  const sender = members.find((m) => m.userId === senderId);

  await Promise.all(
    targets.map(async (m) => {
      const title = channel?.type === "DM"
        ? (sender?.fullName ?? "Direct Message")
        : `#${channelName}`;
      await createNotificationWithPush({
        userId: m.userId,
        title,
        body: preview,
        link: `/channels?channel=${channelId}`,
      });
    }),
  );
}
