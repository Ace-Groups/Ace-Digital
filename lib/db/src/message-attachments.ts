export type MessageAttachmentType = "image" | "file" | "video";

export type MessageAttachment = {
  type: MessageAttachmentType;
  url: string;
  name?: string;
  mimeType?: string;
  size?: number;
};

export const MAX_MESSAGE_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_DATA_URL_LENGTH = 520_000;

export function normalizeMessageAttachments(
  raw: unknown,
): MessageAttachment[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: MessageAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const type = (item as MessageAttachment).type;
    const url = (item as MessageAttachment).url;
    if (type !== "image" && type !== "file" && type !== "video") continue;
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
    });
    if (out.length >= MAX_MESSAGE_ATTACHMENTS) break;
  }
  return out.length ? out : undefined;
}
