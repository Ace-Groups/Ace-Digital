import { useState } from "react";
import {
  Download,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  Reply,
  Copy,
  Trash2,
} from "lucide-react";
import { MessageActionsMenu } from "@/components/channels/MessageActionsMenu";
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
import {
  replyQuoteFromMetadata,
  replyTargetFromMessage,
  resolveReplyQuoteDisplay,
} from "@/lib/chat-reply";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";

interface MessageBubbleProps {
  msg: Message | PendingMessage;
  isMe: boolean;
  showMeta: boolean;
  channelId: number;
  currentUserId?: number;
  canDelete?: boolean;
  onDelete?: () => void | Promise<void>;
  onReply?: (target: ReplyTarget) => void;
  onScrollToQuotedMessage?: (messageId: number) => void;
  liveMessagesById?: Map<number, Message>;
  onToggleReaction?: (emoji: string) => void;
  onVotePoll?: (optionId: string) => void;
  onRsvpEvent?: (status: "going" | "maybe" | "no") => void;
}

function isPending(msg: Message | PendingMessage): msg is PendingMessage {
  return "status" in msg && (msg.status === "sending" || msg.status === "failed");
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉"];

export function MessageBubble({
  msg,
  isMe,
  showMeta,
  channelId,
  currentUserId,
  canDelete = false,
  onDelete,
  onReply,
  onScrollToQuotedMessage,
  liveMessagesById,
  onToggleReaction,
  onVotePoll,
  onRsvpEvent,
}: MessageBubbleProps) {
  const isMobile = useIsMobile();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const attachments = msg.attachments ?? [];
  const mediaAttachments = attachments.filter((a) => a.type === "image" || a.type === "video");
  const otherAttachments = attachments.filter((a) => a.type !== "image" && a.type !== "video");
  const pending = isPending(msg);
  const deleted = !pending && Boolean((msg as Message).deleted);
  const quoteSnapshot =
    !pending && !deleted ? replyQuoteFromMetadata(msg.metadata) : null;
  const quote = quoteSnapshot
    ? resolveReplyQuoteDisplay(quoteSnapshot, liveMessagesById ?? new Map())
    : null;
  const displayBody = deleted ? "" : displayMessageBody(msg.body ?? "");
  const showActions = !pending && !deleted && (onToggleReaction || onReply || canDelete);

  function handleDeleteClick() {
    if (!onDelete) return;
    if (!isMe && canDelete) {
      setConfirmDelete(true);
      return;
    }
    void onDelete();
  }

  return (
    <div
      data-testid={`message-${msg.id}`}
      className={cn(
        "group flex gap-2.5 sm:gap-3",
        isMe && "flex-row-reverse",
        showActions && "mt-1",
      )}
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
          "relative min-w-0 max-w-[min(88vw,28rem)] sm:max-w-md lg:max-w-lg",
          isMe && "flex flex-col items-end",
          showActions && "pt-9 sm:pt-8",
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

        {showActions && (
          <>
            <MessageActionsMenu
              messageId={msg.id}
              channelId={channelId}
              isMe={isMe}
              menuOpen={menuOpen}
              onMenuOpenChange={setMenuOpen}
            >
              {onToggleReaction &&
                QUICK_REACTIONS.map((emoji) => (
                  <DropdownMenuItem
                    key={emoji}
                    onClick={() => void onToggleReaction(emoji)}
                    className="min-h-11 sm:min-h-9"
                  >
                    React {emoji}
                  </DropdownMenuItem>
                ))}
              {onReply && (
                <DropdownMenuItem
                  className="min-h-11 sm:min-h-9"
                  onClick={() => onReply(replyTargetFromMessage(msg as Message))}
                >
                  <Reply size={14} className="mr-2" />
                  Reply
                </DropdownMenuItem>
              )}
              {msg.body?.trim() && (
                <DropdownMenuItem
                  className="min-h-11 sm:min-h-9"
                  onClick={() => void navigator.clipboard.writeText(msg.body)}
                >
                  <Copy size={14} className="mr-2" />
                  Copy
                </DropdownMenuItem>
              )}
              {canDelete && onDelete && (
                <DropdownMenuItem
                  className="min-h-11 text-destructive focus:text-destructive sm:min-h-9"
                  onClick={handleDeleteClick}
                >
                  <Trash2 size={14} className="mr-2" />
                  Delete
                  {isMe ? (
                    <span className="ml-auto text-[10px] text-muted-foreground">24h</span>
                  ) : null}
                </DropdownMenuItem>
              )}
            </MessageActionsMenu>
            {!isMobile && onToggleReaction && (
              <div
                className={cn(
                  "absolute top-0 z-10 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100",
                  isMe ? "right-10" : "left-10",
                )}
              >
                {QUICK_REACTIONS.map((emoji) => (
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
              </div>
            )}
          </>
        )}

        <div className="space-y-2">
          {deleted ? (
            <p className="text-sm italic text-muted-foreground">Message deleted</p>
          ) : (
            <>
          {quote && (
            <button
              type="button"
              className={cn(
                "w-full rounded-lg border-l-2 px-3 py-2 text-left text-xs transition-colors",
                isMe ? "border-primary-foreground/50 bg-primary/20 hover:bg-primary/30" : "border-primary bg-muted/80 hover:bg-muted",
              )}
              onClick={() => onScrollToQuotedMessage?.(quote.id)}
            >
              <p className="font-medium opacity-80">{quote.senderName ?? "Message"}</p>
              <p className="line-clamp-2 opacity-70">
                {quote.isDeleted ? "Original message deleted" : quote.preview}
              </p>
            </button>
          )}

          {msg.messageKind === "poll" && (
            <PollCard msg={msg} channelId={channelId} isMe={isMe} onVote={onVotePoll} />
          )}
          {msg.messageKind === "event" && (
            <EventCard msg={msg} channelId={channelId} isMe={isMe} onRsvp={onRsvpEvent} />
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
              onToggle={(emoji) => onToggleReaction(emoji)}
              className={isMe ? "justify-end" : undefined}
            />
          )}
            </>
          )}
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the message for everyone in the channel. You can only delete messages
              within 24 hours of sending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmDelete(false);
                void onDelete?.();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
