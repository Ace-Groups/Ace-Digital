import type { MessageAttachment } from "@workspace/db";
import { store } from "@workspace/db";
import { messagePreview } from "./message-attachments";
import { notifyChannelMembers } from "./chat-notify";
import { extractMentionedUserIds } from "./chat-mentions";
import { triggerAceBot } from "./acebot";

export type PersistMessageJob = {
  channelId: number;
  senderId: number;
  clientId: string;
  body: string;
  attachments?: MessageAttachment[] | null;
  messageKind: string;
  metadata?: Record<string, unknown>;
  parentMessageId?: number | null;
  senderName: string | null;
  senderAvatar: string | null;
  channelName?: string;
};

/** Write a chat message and fan out notifications. Used inline when Redis is absent. */
export async function persistMessageJob(data: PersistMessageJob): Promise<void> {
  if (data.parentMessageId) {
    const root = await store.findMessageById(data.parentMessageId);
    if (!root || root.channelId !== data.channelId) {
      throw new Error("Invalid thread parent");
    }
  }

  const channel = await store.findChannelById(data.channelId);
  const channelName = data.channelName ?? channel?.name ?? "channel";

  const message = await store.createMessage({
    channelId: data.channelId,
    senderId: data.senderId,
    body: data.body,
    attachments: data.attachments ?? null,
    messageKind: data.messageKind,
    metadata: data.metadata ?? null,
    parentMessageId: data.parentMessageId ?? null,
    editedAt: null,
    deletedAt: null,
    deletedById: null,
    senderName: data.senderName,
    senderAvatar: data.senderAvatar,
  });

  if (data.body.includes("@AceBot")) {
    await triggerAceBot(data.channelId, message.id, data.body, data.senderId);
  }

  const members = await store.listChannelMembers(data.channelId);
  const mentioned = extractMentionedUserIds(data.body, members);
  const preview = messagePreview(message.body, message.attachments, message.messageKind);

  if (mentioned.length > 0) {
    await notifyChannelMembers(
      data.channelId,
      data.senderId,
      channelName,
      `${data.senderName ?? "Someone"} mentioned you: ${preview}`,
      mentioned,
    );
  } else {
    await notifyChannelMembers(data.channelId, data.senderId, channelName, preview);
  }

  await store.markChannelRead(data.channelId, data.senderId);
}
