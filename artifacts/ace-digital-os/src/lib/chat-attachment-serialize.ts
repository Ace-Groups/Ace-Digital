import type { MessageAttachment } from "@workspace/api-client-react";

/** Omit optional fields when unset — API/Firestore reject explicit `undefined`. */
export function compactMessageAttachment(att: MessageAttachment): MessageAttachment {
  const out: MessageAttachment = { type: att.type, url: att.url };
  if (att.name) out.name = att.name;
  if (att.mimeType) out.mimeType = att.mimeType;
  if (typeof att.size === "number") out.size = att.size;
  if (att.thumbUrl) out.thumbUrl = att.thumbUrl;
  return out;
}

export function compactMessageAttachments(
  attachments: MessageAttachment[],
): MessageAttachment[] {
  return attachments.map(compactMessageAttachment);
}
