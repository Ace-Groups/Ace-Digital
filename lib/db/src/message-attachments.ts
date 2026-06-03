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
    out.push({
      type,
      url: url.trim(),
      name: typeof (item as MessageAttachment).name === "string" ? (item as MessageAttachment).name : undefined,
      mimeType:
        typeof (item as MessageAttachment).mimeType === "string"
          ? (item as MessageAttachment).mimeType
          : undefined,
      size:
        typeof (item as MessageAttachment).size === "number"
          ? (item as MessageAttachment).size
          : undefined,
      thumbUrl:
        typeof (item as MessageAttachment).thumbUrl === "string"
          ? (item as MessageAttachment).thumbUrl
          : undefined,
    });
    if (out.length >= MAX_MEDIA_PER_MESSAGE + MAX_FILES_PER_MESSAGE) break;
  }
  return out.length ? out : undefined;
}
