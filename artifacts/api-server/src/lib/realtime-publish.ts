import type { PublishedEvent, RealtimeMessage, ChannelActivity } from "@workspace/realtime-protocol";
import { realtimeMessageSchema } from "@workspace/realtime-protocol";
import { publishToRedis } from "@workspace/realtime-protocol/server";
import { messagePreview } from "./message-attachments";
import type { MessageAttachment } from "@workspace/db";
import { store } from "@workspace/db";

let inlineDispatch: ((event: PublishedEvent) => void) | null = null;

/** Registered by api-server index.ts for local dev inline WebSocket hub. */
export function registerInlineRealtimeDispatch(
  dispatch: ((event: PublishedEvent) => void) | null,
): void {
  inlineDispatch = dispatch;
}

export async function publishChatEvent(event: PublishedEvent): Promise<void> {
  inlineDispatch?.(event);

  if (process.env.REDIS_URL?.trim()) {
    try {
      await publishToRedis(event);
    } catch (err) {
      console.error("[realtime-publish]", err);
    }
  }
}

/** Normalize REST message JSON for WebSocket protocol validation. */
export function toRealtimeMessage(payload: unknown): RealtimeMessage {
  const raw =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const kind = raw.messageKind;
  const messageKind =
    kind === "poll" || kind === "event" ? kind : kind === "text" ? "text" : "text";
  return realtimeMessageSchema.parse({ ...raw, messageKind });
}

export async function publishMessageNew(payload: unknown): Promise<void> {
  const message = toRealtimeMessage(payload);
  await publishChatEvent({ type: "message:new", message });
  await publishChannelActivityForChannel(message.channelId, {
    body: message.body,
    messageKind: message.messageKind ?? "text",
  });
}

export async function publishMessageUpdated(payload: unknown): Promise<void> {
  const message = toRealtimeMessage(payload);
  await publishChatEvent({
    type: "message:updated",
    channelId: message.channelId,
    message,
  });
}

export async function publishMessageDeleted(
  channelId: number,
  messageId: number,
): Promise<void> {
  await publishChatEvent({ type: "message:deleted", channelId, messageId });
  await publishChannelActivityForChannel(channelId);
}

export async function publishChannelActivity(
  activity: ChannelActivity,
): Promise<void> {
  await publishChatEvent({ type: "channel:activity", activity });
}

async function publishChannelActivityForChannel(
  channelId: number,
  latestMessage?: {
    body: string;
    attachments?: MessageAttachment[] | null;
    messageKind?: string | null;
  },
): Promise<void> {
  const channel = await store.findChannelById(channelId);
  if (!channel) return;

  let preview: string | null = null;
  if (latestMessage) {
    preview = messagePreview(
      latestMessage.body,
      latestMessage.attachments,
      latestMessage.messageKind ?? undefined,
    );
  } else {
    const messages = await store.listMessagesByChannel(channelId, { limit: 1 });
    const m = messages[0];
    if (m && !m.deletedAt) {
      preview = messagePreview(m.body, m.attachments, m.messageKind);
    }
  }

  await publishChannelActivity({
    channelId,
    lastPostAt: channel.lastPostAt?.toISOString() ?? null,
    lastMessagePreview: preview,
    messageCount: channel.messageCount ?? undefined,
  });
}

export async function publishNotificationNew(payload: {
  userId: number;
  id: number;
  title: string;
  body: string;
  link: string | null;
  createdAt: Date;
}): Promise<void> {
  await publishChatEvent({
    type: "notification:new",
    notification: {
      userId: payload.userId,
      id: payload.id,
      title: payload.title,
      body: payload.body,
      link: payload.link,
      createdAt: payload.createdAt.toISOString(),
    },
  });
}
