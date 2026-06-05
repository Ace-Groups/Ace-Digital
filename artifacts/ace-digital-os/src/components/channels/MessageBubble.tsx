import { useCallback, useRef, useState } from "react";
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
import { MessageRow } from "@/components/channels/MessageRow";
import { MessageBody } from "@/components/channels/MessageBody";
import { MessageHoverToolbar } from "@/components/channels/MessageHoverToolbar";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  onOpenThread?: (msg: Message) => void;
  onEdit?: (msg: Message) => void;
  canEdit?: boolean;
}

function isPending(msg: Message | PendingMessage): msg is PendingMessage {
  return "status" in msg && (msg.status === "sending" || msg.status === "failed");
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉"];
const LONG_PRESS_MS = 450;

export function MessageBubble({
  msg,
  isMe,
  showMeta,
  channelId: _channelId,
  currentUserId,
  canDelete = false,
  onDelete,
  onReply,
  onScrollToQuotedMessage,
  liveMessagesById,
  onToggleReaction,
  onVotePoll,
  onRsvpEvent,
  onOpenThread,
  onEdit,
  canEdit = false,
}: MessageBubbleProps) {
  const isMobile = useIsMobile();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const onBubblePointerDown = useCallback(() => {
    if (!isMobile || !showActions) return;
    clearLongPress();
    longPressTimer.current = setTimeout(() => setMenuOpen(true), LONG_PRESS_MS);
  }, [isMobile, showActions, clearLongPress]);

  function handleDeleteClick() {
    if (!onDelete) return;
    if (!isMe && canDelete) {
      setConfirmDelete(true);
      return;
    }
    void onDelete();
  }

  const menuItems = (
    <>
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
      {onOpenThread && !pending && (
        <DropdownMenuItem
          className="min-h-11 sm:min-h-9"
          onClick={() => onOpenThread(msg as Message)}
        >
          <Reply size={14} className="mr-2" />
          Reply in thread
        </DropdownMenuItem>
      )}
      {onReply && !onOpenThread && (
        <DropdownMenuItem
          className="min-h-11 sm:min-h-9"
          onClick={() => onReply(replyTargetFromMessage(msg as Message))}
        >
          <Reply size={14} className="mr-2" />
          Reply
        </DropdownMenuItem>
      )}
      {canEdit && onEdit && (
        <DropdownMenuItem className="min-h-11 sm:min-h-9" onClick={() => onEdit(msg as Message)}>
          Edit message
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
    </>
  );

  const replyCount = Number((msg as Message).metadata?.replyCount ?? 0);
  const isSystem = !pending && (msg as Message).messageKind === "system";

  if (!pending && isSystem) {
    return <MessageRow msg={msg as Message} showHeader={false} />;
  }

  const bodyContent = (
    <div className="space-y-1">
      {deleted ? (
        <p className="text-sm italic text-muted-foreground">Message deleted</p>
      ) : (
        <>
          {quote && (
            <button
              type="button"
                      className="mb-1 w-full rounded-md border-l-2 border-primary bg-muted/50 px-3 py-2 text-left text-xs hover:bg-muted/80 dark:bg-muted/60"
              onClick={() => onScrollToQuotedMessage?.(quote.id)}
            >
              <p className="font-medium">{quote.senderName ?? "Message"}</p>
              <p className="line-clamp-2 opacity-70">
                {quote.isDeleted ? "Original message deleted" : quote.preview}
              </p>
            </button>
          )}
          {msg.messageKind === "poll" && (
            <PollCard msg={msg} channelId={_channelId} isMe={isMe} onVote={onVotePoll} />
          )}
          {msg.messageKind === "event" && (
            <EventCard msg={msg} channelId={_channelId} isMe={isMe} onRsvp={onRsvpEvent} />
          )}
          {mediaAttachments.length > 0 && (
            <MediaAlbum attachments={mediaAttachments} isMe={false} />
          )}
          {otherAttachments.map((att, i) => (
            <AttachmentPreview key={`${msg.id}-att-${i}`} attachment={att} isMe={false} />
          ))}
          {displayBody && msg.messageKind !== "poll" && msg.messageKind !== "event" ? (
            <MessageBody body={msg.body ?? ""} />
          ) : null}

          {/* Cyberpunk Table Info Block */}
          {(!pending && !deleted && (msg as Message).metadata?.layout === "table") && (() => {
            const tableData = (msg as Message).metadata?.tableData as {
              columns: string[];
              rows: Record<string, any>[];
            } | undefined;
            if (!tableData || !tableData.columns || !tableData.rows) return null;
            return (
              <div className="mt-2 overflow-hidden rounded-md border border-cyan-500/30 bg-background/50 font-mono text-xs backdrop-blur-sm">
                <div className="border-b border-cyan-500/30 bg-cyan-950/20 px-3 py-1.5 text-cyan-400 font-semibold uppercase tracking-wider flex justify-between items-center">
                  <span>System Data Feed</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                </div>
                <div className="overflow-x-auto">
                  <Table className="min-w-[400px]">
                    <TableHeader className="border-b border-cyan-500/20 bg-muted/30">
                      <TableRow className="hover:bg-transparent">
                        {tableData.columns.map((col, idx) => (
                          <TableHead key={idx} className="h-8 text-[10px] text-cyan-400/70 font-bold uppercase py-1 px-3">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData.rows.map((row, rowIdx) => (
                        <TableRow key={rowIdx} className="border-b border-cyan-500/10 hover:bg-cyan-500/5">
                          {tableData.columns.map((col, colIdx) => (
                            <TableCell key={colIdx} className="py-2 px-3 text-foreground/90 font-mono">
                              {row[col] ?? ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })()}

          {/* System Permission Alert Card */}
          {(!pending && !deleted && (msg as Message).metadata?.layout === "permission_denied") && (
            <div className="mt-2 overflow-hidden rounded-md border border-rose-500/50 bg-rose-950/10 backdrop-blur-sm p-3 font-mono text-xs">
              <div className="flex items-center gap-2 text-rose-400 font-bold uppercase tracking-wider mb-2">
                <AlertCircle size={16} className="text-rose-500 animate-pulse" />
                <span>Security Alert: Access Denied</span>
              </div>
              <div className="border border-rose-500/20 bg-rose-950/20 rounded p-2 text-rose-300">
                <p className="font-semibold text-rose-400 mb-1">RBAC POLICY VIOLATION</p>
                <p>{msg.body || "Insufficient clearance to view financial records."}</p>
              </div>
              <div className="mt-2 flex items-center justify-between text-[9px] text-rose-500/70 uppercase">
                <span>Code: SEC-403-RBAC</span>
                <span>Auth: System Admin</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div
      onPointerDown={onBubblePointerDown}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onPointerCancel={clearLongPress}
    >
      <MessageRow
        msg={msg as Message}
        showHeader={showMeta}
        toolbar={
          showActions ? (
            <MessageHoverToolbar
              onReact={(emoji) => onToggleReaction?.(emoji)}
              onReply={
                onOpenThread
                  ? () => onOpenThread(msg as Message)
                  : onReply
                    ? () => onReply(replyTargetFromMessage(msg as Message))
                    : undefined
              }
              onMore={() => setMenuOpen(true)}
            />
          ) : undefined
        }
        footer={
          <>
            {pending && isMe && msg.status === "failed" && (
              <span className="mt-1 inline-flex text-muted-foreground">
                <AlertCircle size={12} className="text-destructive" />
              </span>
            )}
            {!pending && onToggleReaction && (
              <MessageReactions
                msg={msg}
                currentUserId={currentUserId}
                onToggle={(emoji) => onToggleReaction(emoji)}
              />
            )}
            {replyCount > 0 && onOpenThread && (
              <button
                type="button"
                className="mt-1 text-xs font-medium text-primary hover:underline"
                onClick={() => onOpenThread(msg as Message)}
              >
                {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </button>
            )}
          </>
        }
      >
        {bodyContent}
      </MessageRow>

      {showActions && menuOpen && (
        <div className="absolute right-4 top-10 z-20">
          <MessageActionsMenu isMe={isMe} menuOpen={menuOpen} onMenuOpenChange={setMenuOpen}>
            {menuItems}
          </MessageActionsMenu>
        </div>
      )}

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
