import { isMediaAttachment, MAX_FILES_PER_MESSAGE, MAX_MEDIA_PER_MESSAGE } from "@/lib/chat-constants";

export { isMediaAttachment, MAX_FILES_PER_MESSAGE, MAX_MEDIA_PER_MESSAGE };

export function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function partitionAttachments<T extends { type: string }>(
  attachments: T[],
): { media: T[]; files: T[] } {
  const media: T[] = [];
  const files: T[] = [];
  for (const att of attachments) {
    if (isMediaAttachment(att.type as "image" | "video" | "file" | "audio")) {
      media.push(att);
    } else {
      files.push(att);
    }
  }
  return { media, files };
}

export function buildSendBatches<T>(attachments: T[], type: "media" | "file"): T[][] {
  const max = type === "media" ? MAX_MEDIA_PER_MESSAGE : MAX_FILES_PER_MESSAGE;
  return chunkArray(attachments, max);
}
