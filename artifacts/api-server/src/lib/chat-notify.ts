import { store } from "@workspace/db";

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
      await store.createNotification({
        userId: m.userId,
        title: `#${channelName}`,
        body: preview,
        link: `/channels?channel=${channelId}`,
      });
    }),
  );
}
