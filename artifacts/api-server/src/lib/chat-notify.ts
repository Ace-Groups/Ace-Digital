import { store } from "@workspace/db";

export async function notifyChannelMembers(
  channelId: number,
  senderId: number,
  channelName: string,
  preview: string,
): Promise<void> {
  const members = await store.listChannelMembers(channelId);
  const targets = members.filter((m) => m.userId !== senderId);
  await Promise.all(
    targets.map((m) =>
      store.createNotification({
        userId: m.userId,
        title: `#${channelName}`,
        body: preview,
        link: `/channels?channel=${channelId}`,
      }),
    ),
  );
}
