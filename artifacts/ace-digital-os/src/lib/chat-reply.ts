import type { Message } from "@workspace/api-client-react";
import type { ReplyTarget } from "@/components/channels/ChannelMessageList";

export type ReplyQuoteDisplay = {
  id: number;
  senderName: string | null;
  preview: string;
  isDeleted: boolean;
  senderUnavailable?: boolean;
};

/** Short label for reply metadata and composer preview. */
export function messagePreviewText(msg: Pick<Message, "body" | "attachments" | "messageKind">): string {
  if (msg.body?.trim()) return msg.body.trim().slice(0, 280);
  const atts = msg.attachments ?? [];
  if (atts.length > 0) {
    const first = atts[0]!;
    if (first.type === "image") {
      return atts.length > 1 ? `${atts.length} photos` : "Photo";
    }
    if (first.type === "video") {
      return atts.length > 1 ? `${atts.length} videos` : "Video";
    }
    if (first.type === "audio") return "Voice message";
    return atts.length > 1 ? `${atts.length} files` : first.name ?? "File";
  }
  if (msg.messageKind === "poll") return "Poll";
  if (msg.messageKind === "event") return "Event";
  return "Message";
}

export function replyTargetFromMessage(msg: Message): ReplyTarget {
  return {
    id: msg.id,
    body: msg.deleted ? "Original message deleted" : messagePreviewText(msg),
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

export function replyQuoteFromMetadata(metadata: Message["metadata"]): ReplyTarget | null {
  if (!metadata || typeof metadata !== "object") return null;
  const r = (metadata as Record<string, unknown>).replyTo;
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  if (typeof o.id !== "number") return null;
  return {
    id: o.id,
    body: typeof o.body === "string" ? o.body : "",
    senderName: typeof o.senderName === "string" ? o.senderName : null,
  };
}

/**
 * Prefer the live message in the loaded thread (accurate deleted state + body).
 * Fall back to metadata snapshot when the parent is outside the loaded window.
 */
export function resolveReplyQuoteDisplay(
  snapshot: ReplyTarget,
  liveMessages: Map<number, Message>,
): ReplyQuoteDisplay {
  const live = liveMessages.get(snapshot.id);
  if (live) {
    if (live.deleted) {
      return {
        id: snapshot.id,
        senderName: live.senderName ?? snapshot.senderName ?? null,
        preview: "",
        isDeleted: true,
        senderUnavailable: live.senderUnavailable,
      };
    }
    return {
      id: snapshot.id,
      senderName: live.senderName ?? snapshot.senderName ?? null,
      preview: messagePreviewText(live),
      isDeleted: false,
      senderUnavailable: live.senderUnavailable,
    };
  }

  const snapBody = snapshot.body.trim();
  if (snapBody === "Original message deleted") {
    return {
      id: snapshot.id,
      senderName: snapshot.senderName ?? null,
      preview: "",
      isDeleted: true,
    };
  }

  return {
    id: snapshot.id,
    senderName: snapshot.senderName ?? null,
    preview: snapBody || "Message",
    isDeleted: false,
  };
}
