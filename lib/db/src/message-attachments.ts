export type MessageAttachmentType = "image" | "file" | "video" | "audio";

export type MessageAttachment = {
  type: MessageAttachmentType;
  url: string;
  name?: string;
  mimeType?: string;
  size?: number;
  thumbUrl?: string;
};

/** @deprecated use MAX_MEDIA_PER_MESSAGE / MAX_FILES_PER_MESSAGE */
export const MAX_MESSAGE_ATTACHMENTS = 30;
export const MAX_MEDIA_PER_MESSAGE = 30;
export const MAX_FILES_PER_MESSAGE = 20;
export const MAX_ATTACHMENT_DATA_URL_LENGTH = 520_000;

export function isMediaAttachment(type: MessageAttachmentType): boolean {
  return type === "image" || type === "video";
}

/** Firestore rejects explicit `undefined` on optional fields (e.g. thumbUrl). */
export function sanitizeMessageAttachment(att: MessageAttachment): MessageAttachment {
  const out: MessageAttachment = { type: att.type, url: att.url };
  if (att.name) out.name = att.name;
  if (att.mimeType) out.mimeType = att.mimeType;
  if (typeof att.size === "number") out.size = att.size;
  if (att.thumbUrl) out.thumbUrl = att.thumbUrl;
  return out;
}

export function sanitizeMessageAttachments(
  attachments?: MessageAttachment[] | null,
): MessageAttachment[] | null {
  if (!attachments?.length) return null;
  return attachments.map(sanitizeMessageAttachment);
}

export function validateAttachmentBatch(attachments: MessageAttachment[]): void {
  const media = attachments.filter((a) => isMediaAttachment(a.type)).length;
  const files = attachments.filter((a) => !isMediaAttachment(a.type)).length;
  if (media > MAX_MEDIA_PER_MESSAGE) {
    throw new Error(`Maximum ${MAX_MEDIA_PER_MESSAGE} photos/videos per message`);
  }
  if (files > MAX_FILES_PER_MESSAGE) {
    throw new Error(`Maximum ${MAX_FILES_PER_MESSAGE} files per message`);
  }
}

export function normalizeMessageAttachments(
  raw: unknown,
): MessageAttachment[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: MessageAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const type = (item as MessageAttachment).type;
    const url = (item as MessageAttachment).url;
    if (type !== "image" && type !== "file" && type !== "video" && type !== "audio") continue;
    if (typeof url !== "string" || !url.trim()) continue;
    const name =
      typeof (item as MessageAttachment).name === "string"
        ? (item as MessageAttachment).name
        : undefined;
    const mimeType =
      typeof (item as MessageAttachment).mimeType === "string"
        ? (item as MessageAttachment).mimeType
        : undefined;
    const size =
      typeof (item as MessageAttachment).size === "number"
        ? (item as MessageAttachment).size
        : undefined;
    const thumbUrl =
      typeof (item as MessageAttachment).thumbUrl === "string"
        ? (item as MessageAttachment).thumbUrl
        : undefined;
    out.push(
      sanitizeMessageAttachment({
        type,
        url: url.trim(),
        ...(name ? { name } : {}),
        ...(mimeType ? { mimeType } : {}),
        ...(size != null ? { size } : {}),
        ...(thumbUrl ? { thumbUrl } : {}),
      }),
    );
    if (out.length >= MAX_MEDIA_PER_MESSAGE + MAX_FILES_PER_MESSAGE) break;
  }
  return out.length ? out : undefined;
}
