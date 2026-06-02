import {
  MAX_ATTACHMENT_DATA_URL_LENGTH,
  MAX_MESSAGE_ATTACHMENTS,
  normalizeMessageAttachments,
  type MessageAttachment,
} from "@workspace/db";

export function parseMessageAttachmentsInput(raw: unknown): MessageAttachment[] | undefined {
  const normalized = normalizeMessageAttachments(raw);
  if (!normalized?.length) return undefined;

  for (const att of normalized) {
    if (att.url.startsWith("data:")) {
      if (att.url.length > MAX_ATTACHMENT_DATA_URL_LENGTH) {
        throw new Error("Attachment is too large");
      }
      continue;
    }
    if (!att.url.startsWith("https://")) {
      throw new Error("Invalid attachment URL");
    }
  }

  return normalized;
}

export function validateMessagePayload(body: unknown, attachments: unknown): {
  body: string;
  attachments?: MessageAttachment[];
} {
  const text = typeof body === "string" ? body.trim() : "";
  const parsed = parseMessageAttachmentsInput(attachments);
  if (!text && !parsed?.length) {
    throw new Error("Message must include text or an attachment");
  }
  if (parsed && parsed.length > MAX_MESSAGE_ATTACHMENTS) {
    throw new Error(`Maximum ${MAX_MESSAGE_ATTACHMENTS} attachments per message`);
  }
  return { body: text, attachments: parsed };
}

export function messageToJson(
  m: {
    id: number;
    channelId: number;
    senderId: number;
    body: string;
    attachments?: MessageAttachment[] | null;
    createdAt: Date;
  },
  senderName: string,
  senderAvatar: string | null,
) {
  return {
    id: m.id,
    channelId: m.channelId,
    senderId: m.senderId,
    senderName,
    senderAvatar,
    body: m.body,
    attachments: m.attachments?.length ? m.attachments : undefined,
    createdAt: m.createdAt.toISOString(),
  };
}
