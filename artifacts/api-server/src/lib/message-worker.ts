import type { MessageAttachment } from "@workspace/db";
import { Worker } from "bullmq";
import { store } from "@workspace/db";
import { getRedisConnectionOptions } from "./redis";
import { MESSAGE_QUEUE_NAME } from "./message-queue";
import { messagePreview, messageToJson } from "./message-attachments";
import { notifyChannelMembers } from "./chat-notify";
import { extractMentionedUserIds } from "./chat-mentions";
import { triggerAceBot } from "./acebot";
import { getIo } from "./socket-server";
import { logger } from "./logger";

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

let worker: Worker<PersistMessageJob> | null = null;

export function startMessageWorker(): Worker<PersistMessageJob> {
  if (worker) return worker;

  worker = new Worker<PersistMessageJob>(
    MESSAGE_QUEUE_NAME,
    async (job) => {
      const data = job.data;
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

      const persisted = messageToJson(
        message,
        data.senderName ?? "Former teammate",
        data.senderAvatar ?? null,
      );

      const { broadcastMessagePersisted } = await import("./chat-socket-broadcast");
      broadcastMessagePersisted(data.channelId, {
        clientId: data.clientId,
        message: persisted,
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
    },
    { connection: getRedisConnectionOptions(), concurrency: 5 },
  );

  worker.on("failed", (job, err) => {
    logger.error({ err, jobId: job?.id, clientId: job?.data.clientId }, "Message worker failed");
  });

  return worker;
}

export async function stopMessageWorker(): Promise<void> {
  if (!worker) return;
  const current = worker;
  worker = null;
  await current.close();
}
