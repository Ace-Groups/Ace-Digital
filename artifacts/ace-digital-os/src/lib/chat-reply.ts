import type { Message } from "@workspace/api-client-react";
import type { ReplyTarget } from "@/components/channels/ChannelMessageList";

export function replyTargetFromMessage(msg: Message): ReplyTarget {
  const deleted = Boolean(msg.deleted);
  const body = deleted
    ? "Original message deleted"
    : (msg.body?.trim() || (msg.attachments?.length ? "Attachment" : "Message")).slice(0, 280);
  return {
    id: msg.id,
    body,
    senderName: msg.senderName ?? null,
  };
}

export function replyMetadataFromTarget(target: ReplyTarget): Record<string, unknown> {
  return {
    replyTo: {
      id: target.id,
      body: target.body.slice(0, 280),
      senderName: target.senderName ?? null,
    },
  };
}
