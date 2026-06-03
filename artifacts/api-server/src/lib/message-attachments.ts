import {
  MAX_ATTACHMENT_DATA_URL_LENGTH,
  MAX_FILES_PER_MESSAGE,
  MAX_MEDIA_PER_MESSAGE,
  normalizeMessageAttachments,
  sanitizeMessageAttachments,
  validateAttachmentBatch,
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
    if (
      att.thumbUrl?.startsWith("data:") &&
      att.thumbUrl.length > MAX_ATTACHMENT_DATA_URL_LENGTH
    ) {
      delete att.thumbUrl;
    }
    if (!att.url.startsWith("https://")) {
      throw new Error("Invalid attachment URL");
    }
  }

  validateAttachmentBatch(normalized);
  return sanitizeMessageAttachments(normalized) ?? undefined;
}

export function validateMessagePayload(
  body: unknown,
  attachments: unknown,
  messageKind?: unknown,
  metadata?: unknown,
): {
  body: string;
  attachments?: MessageAttachment[];
  messageKind: string;
  metadata?: Record<string, unknown>;
} {
  const text = typeof body === "string" ? body.trim() : "";
  const parsed = parseMessageAttachmentsInput(attachments);
  const kind =
    messageKind === "poll" || messageKind === "event" ? messageKind : "text";
  const meta =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : undefined;

  if (!text && !parsed?.length && kind === "text") {
    throw new Error("Message must include text or an attachment");
  }
  if (kind === "poll" && !meta?.question) {
    throw new Error("Poll requires a question");
  }
  if (kind === "poll" && meta?.closesAt != null && typeof meta.closesAt !== "string") {
    throw new Error("Poll closesAt must be an ISO date string");
  }
  if (kind === "event" && !meta?.title) {
    throw new Error("Event requires a title");
  }

  const cleanMeta =
    meta &&
    Object.fromEntries(
      Object.entries(meta).filter(([, v]) => v !== null && v !== undefined),
    );

  return { body: text, attachments: parsed, messageKind: kind, metadata: cleanMeta };
}

export function messagePreview(body: string, attachments?: MessageAttachment[] | null, kind?: string): string {
  if (kind === "poll") return "Poll";
  if (kind === "event") return "Event";
  if (body.trim()) return body.trim().slice(0, 120);
  if (!attachments?.length) return "Message";
  const first = attachments[0]!;
  if (first.type === "audio") return "Voice message";
  if (first.type === "image") return attachments.length > 1 ? `${attachments.length} photos` : "Photo";
  if (first.type === "video") return attachments.length > 1 ? `${attachments.length} videos` : "Video";
  return attachments.length > 1 ? `${attachments.length} files` : first.name ?? "File";
}

export function messageToJson(
  m: {
    id: number;
    channelId: number;
    senderId: number;
    body: string;
    attachments?: MessageAttachment[] | null;
    messageKind?: string | null;
    metadata?: Record<string, unknown> | null;
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
    messageKind: m.messageKind ?? "text",
    metadata: m.metadata ?? undefined,
    createdAt: m.createdAt.toISOString(),
  };
}
