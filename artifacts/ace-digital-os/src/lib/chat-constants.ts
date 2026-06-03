/** Max photos + videos per single message. Overflow auto-splits into new messages. */
export const MAX_MEDIA_PER_MESSAGE = 30;

/** Max documents / generic files per single message. */
export const MAX_FILES_PER_MESSAGE = 20;

/** Pending attachment queue cap in composer before send. */
export const MAX_PENDING_ATTACHMENTS = 50;

export function isMediaAttachment(type: string): boolean {
  return type === "image" || type === "video";
}
