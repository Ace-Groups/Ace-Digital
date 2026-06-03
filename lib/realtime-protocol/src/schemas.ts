import { z } from "zod";

export const REDIS_REALTIME_CHANNEL = "ace:realtime";

const messageAttachmentSchema = z
  .object({
    url: z.string(),
    name: z.string().optional(),
    mimeType: z.string().optional(),
    size: z.number().optional(),
    thumbUrl: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();

export const realtimeMessageSchema = z.object({
  id: z.number(),
  channelId: z.number(),
  senderId: z.number(),
  senderName: z.string().optional(),
  senderAvatar: z.string().nullable().optional(),
  body: z.string(),
  attachments: z.array(messageAttachmentSchema).optional(),
  messageKind: z.enum(["text", "poll", "event", "system"]).optional(),
  metadata: z.record(z.unknown()).optional(),
  parentMessageId: z.number().optional(),
  editedAt: z.string().optional(),
  deleted: z.boolean().optional(),
  createdAt: z.string(),
});

export const channelActivitySchema = z.object({
  channelId: z.number(),
  lastPostAt: z.string().nullable(),
  lastMessagePreview: z.string().nullable(),
  messageCount: z.number().optional(),
});

export const notificationPayloadSchema = z.object({
  userId: z.number(),
  id: z.number(),
  title: z.string(),
  body: z.string(),
  link: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const clientAuthSchema = z.object({
  type: z.literal("auth"),
  token: z.string().min(1),
});

export const clientSubscribeSchema = z.object({
  type: z.literal("subscribe"),
  channelIds: z.array(z.number().int().positive()),
});

export const clientUnsubscribeSchema = z.object({
  type: z.literal("unsubscribe"),
  channelIds: z.array(z.number().int().positive()),
});

export const clientPingSchema = z.object({
  type: z.literal("ping"),
});

export const clientFrameSchema = z.discriminatedUnion("type", [
  clientAuthSchema,
  clientSubscribeSchema,
  clientUnsubscribeSchema,
  clientPingSchema,
]);

export const serverMessageNewSchema = z.object({
  type: z.literal("message:new"),
  message: realtimeMessageSchema,
});

export const serverMessageUpdatedSchema = z.object({
  type: z.literal("message:updated"),
  channelId: z.number(),
  message: realtimeMessageSchema,
});

export const serverMessageDeletedSchema = z.object({
  type: z.literal("message:deleted"),
  channelId: z.number(),
  messageId: z.number(),
});

export const serverChannelActivitySchema = z.object({
  type: z.literal("channel:activity"),
  activity: channelActivitySchema,
});

export const serverNotificationNewSchema = z.object({
  type: z.literal("notification:new"),
  notification: notificationPayloadSchema.omit({ userId: true }),
});

export const serverPongSchema = z.object({
  type: z.literal("pong"),
});

export const serverErrorSchema = z.object({
  type: z.literal("error"),
  code: z.string(),
  message: z.string(),
});

export const serverAuthenticatedSchema = z.object({
  type: z.literal("authenticated"),
  userId: z.number(),
});

export const serverSubscribedSchema = z.object({
  type: z.literal("subscribed"),
  channelIds: z.array(z.number()),
});

export const serverEventSchema = z.discriminatedUnion("type", [
  serverMessageNewSchema,
  serverMessageUpdatedSchema,
  serverMessageDeletedSchema,
  serverChannelActivitySchema,
  serverNotificationNewSchema,
  serverPongSchema,
  serverErrorSchema,
  serverAuthenticatedSchema,
  serverSubscribedSchema,
]);

/** Events published to Redis (may include routing hints). */
export const publishedEventSchema = z.discriminatedUnion("type", [
  serverMessageNewSchema,
  serverMessageUpdatedSchema,
  serverMessageDeletedSchema,
  serverChannelActivitySchema,
  z.object({
    type: z.literal("notification:new"),
    notification: notificationPayloadSchema,
  }),
]);

export type RealtimeMessage = z.infer<typeof realtimeMessageSchema>;
export type ChannelActivity = z.infer<typeof channelActivitySchema>;
export type ClientFrame = z.infer<typeof clientFrameSchema>;
export type ServerEvent = z.infer<typeof serverEventSchema>;
export type PublishedEvent = z.infer<typeof publishedEventSchema>;

export function parseClientFrame(raw: unknown): ClientFrame | null {
  const result = clientFrameSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function parsePublishedEvent(raw: unknown): PublishedEvent | null {
  const result = publishedEventSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function parseServerEvent(raw: unknown): ServerEvent | null {
  const result = serverEventSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function serializeEvent(event: PublishedEvent | ServerEvent): string {
  return JSON.stringify(event);
}
