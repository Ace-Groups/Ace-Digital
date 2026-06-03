import { Download, FileText, Check, AlertCircle, Loader2, Reply, Copy } from "lucide-react";
import { VoiceMessagePlayer } from "@/components/channels/VoiceMessagePlayer";
import { MediaAlbum } from "@/components/channels/MediaAlbum";
import { PollCard } from "@/components/channels/PollCard";
import { EventCard } from "@/components/channels/EventCard";
import { MessageReactions } from "@/components/channels/MessageReactions";
import type { Message } from "@workspace/api-client-react";
import type { PendingMessage } from "@/hooks/use-send-channel-message";
import type { ReplyTarget } from "@/components/channels/ChannelMessageList";
import { cn, formatRelativeTime } from "@/lib/utils";
import { formatFileSize } from "@/lib/chat-media";
import { displayMessageBody } from "@/lib/chat-mentions";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  msg: Message | PendingMessage;
  isMe: boolean;
  showMeta: boolean;
  channelId: number;
  currentUserId?: number;
  onReply?: (target: ReplyTarget) => void;
  onToggleReaction?: (emoji: string) => void | Promise<void>;
}

function isPending(msg: Message | PendingMessage): msg is PendingMessage {
  return "status" in msg && (msg.status === "sending" || msg.status === "failed");
}

function replyQuote(metadata: Message["metadata"]): ReplyTarget | null {
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

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉"];

export function MessageBubble({
  msg,
  isMe,
  showMeta,
  channelId,
  currentUserId,
  onReply,
  onToggleReaction,
}: MessageBubbleProps) {
  const attachments = msg.attachments ?? [];
  const mediaAttachments = attachments.filter((a) => a.type === "image" || a.type === "video");
  const otherAttachments = attachments.filter((a) => a.type !== "image" && a.type !== "video");
  const pending = isPending(msg);
  const quote = !pending ? replyQuote(msg.metadata) : null;
  const displayBody = displayMessageBody(msg.body ?? "");

  return (
    <div
      data-testid={`message-${msg.id}`}
      className={cn("group flex gap-2.5 sm:gap-3", isMe && "flex-row-reverse")}
    >
      {showMeta ? (
        <UserAvatar
          avatarUrl={msg.senderAvatar}
          fullName={msg.senderName}
          className="h-9 w-9 shrink-0 sm:h-8 sm:w-8"
          fallbackClassName={cn(
            "text-xs",
            isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
          iconSize={14}
        />
      ) : (
        <div className="w-9 shrink-0 sm:w-8" />
      )}
      <div
        className={cn(
          "min-w-0 max-w-[min(88vw,28rem)] sm:max-w-md lg:max-w-lg",
          isMe && "flex flex-col items-end",
        )}
      >
        {showMeta && (
          <div className={cn("mb-1 flex items-center gap-2", isMe && "flex-row-reverse")}>
            <p className="text-xs font-medium text-foreground">{msg.senderName}</p>
            <p className="text-xs text-muted-foreground">{formatRelativeTime(msg.createdAt)}</p>
            {isMe && pending && (
              <span className="text-muted-foreground">
                {msg.status === "sending" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : msg.status === "failed" ? (
                  <AlertCircle size={12} className="text-destructive" />
                ) : (
                  <Check size={12} />
                )}
              </span>
            )}
          </div>
        )}

        {!pending && (onToggleReaction || onReply) && (
          <div
            className={cn(
              "mb-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100",
              isMe && "justify-end",
            )}
          >
            {onToggleReaction &&
              QUICK_REACTIONS.map((emoji) => (
                <Button
                  key={emoji}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-base"
                  onClick={() => void onToggleReaction(emoji)}
                  aria-label={`React ${emoji}`}
                >
                  {emoji}
                </Button>
              ))}
            {onReply && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  onReply({
                    id: msg.id,
                    body: msg.body,
                    senderName: msg.senderName,
                  })
                }
                aria-label="Reply"
              >
                <Reply size={14} />
              </Button>
            )}
            {msg.body?.trim() && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => void navigator.clipboard.writeText(msg.body)}
                aria-label="Copy"
              >
                <Copy size={14} />
              </Button>
            )}
          </div>
        )}

        <div className="space-y-2">
          {quote && (
            <div
              className={cn(
                "rounded-lg border-l-2 px-3 py-2 text-xs",
                isMe ? "border-primary-foreground/50 bg-primary/20" : "border-primary bg-muted/80",
              )}
            >
              <p className="font-medium opacity-80">{quote.senderName ?? "Message"}</p>
              <p className="line-clamp-2 opacity-70">{quote.body}</p>
            </div>
          )}

          {msg.messageKind === "poll" && (
            <PollCard msg={msg} channelId={channelId} isMe={isMe} />
          )}
          {msg.messageKind === "event" && (
            <EventCard msg={msg} channelId={channelId} isMe={isMe} />
          )}

          {mediaAttachments.length > 0 && (
            <MediaAlbum attachments={mediaAttachments} isMe={isMe} />
          )}

          {otherAttachments.map((att, i) => (
            <AttachmentPreview key={`${msg.id}-att-${i}`} attachment={att} isMe={isMe} />
          ))}

          {displayBody && msg.messageKind !== "poll" && msg.messageKind !== "event" ? (
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 text-[0.9375rem] leading-relaxed break-words",
                isMe
                  ? "rounded-tr-md bg-primary text-primary-foreground"
                  : "rounded-tl-md bg-muted text-foreground",
                pending && msg.status === "sending" && "opacity-80",
              )}
            >
              {displayBody}
            </div>
          ) : null}

          {!pending && onToggleReaction && (
            <MessageReactions
              msg={msg}
              currentUserId={currentUserId}
              onToggle={(emoji) => void onToggleReaction(emoji)}
              className={isMe ? "justify-end" : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AttachmentPreview({
  attachment,
  isMe,
}: {
  attachment: NonNullable<Message["attachments"]>[number];
  isMe: boolean;
}) {
  const frame = cn(
    "overflow-hidden rounded-2xl border",
    isMe ? "border-primary/30 bg-primary/10" : "border-border bg-muted/50",
  );

  if (attachment.type === "audio") {
    return <VoiceMessagePlayer url={attachment.url} isMe={isMe} />;
  }

  return (
    <a
      href={attachment.url}
      download={attachment.name}
      className={cn(frame, "flex min-h-14 items-center gap-3 px-4 py-3 active:opacity-80")}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/80">
        <FileText size={20} className="text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{attachment.name ?? "File"}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
      </div>
      <Download size={18} className="shrink-0 text-muted-foreground" />
    </a>
  );
}
