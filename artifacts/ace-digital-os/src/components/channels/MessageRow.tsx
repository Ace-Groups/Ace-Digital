import { useMemo, type ReactNode } from "react";
import type { Message } from "@workspace/api-client-react";
import { UserAvatar } from "@/components/UserAvatar";
import { MessageBody } from "@/components/channels/MessageBody";
import { cn, formatRelativeTime } from "@/lib/utils";

const GROUP_MS = 5 * 60 * 1000;

export function shouldGroupWithPrevious(
  prev: Message | null,
  current: Message,
): boolean {
  if (!prev || prev.messageKind === "system" || current.messageKind === "system") return false;
  if (prev.senderId !== current.senderId) return false;
  const a = new Date(prev.createdAt).getTime();
  const b = new Date(current.createdAt).getTime();
  return b - a <= GROUP_MS;
}

interface MessageRowProps {
  msg: Message;
  showHeader: boolean;
  children?: ReactNode;
  footer?: ReactNode;
  toolbar?: ReactNode;
  className?: string;
}

export function MessageRow({
  msg,
  showHeader,
  children,
  footer,
  toolbar,
  className,
}: MessageRowProps) {
  const timeLabel = useMemo(
    () =>
      new Date(msg.createdAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    [msg.createdAt],
  );

  if (msg.messageKind === "system") {
    return (
      <div
        data-testid={`message-${msg.id}`}
        className={cn("py-2 text-center text-xs text-muted-foreground", className)}
      >
        {msg.body}
      </div>
    );
  }

  return (
    <article
      data-testid={`message-${msg.id}`}
      className={cn(
        "group relative flex gap-2 rounded-md px-1 py-0.5 transition-colors duration-150 sm:gap-3 sm:px-2 sm:py-1",
        "hover:bg-[var(--chat-row-hover)] active:bg-[var(--chat-row-hover)]",
        className,
      )}
    >
      <div className="w-8 shrink-0 sm:w-9">
        {showHeader ? (
          <UserAvatar
            fullName={msg.senderName ?? "?"}
            avatarUrl={msg.senderAvatar}
            className="size-8 rounded-md sm:size-9"
          />
        ) : (
          <span className="block pt-0.5 text-[10px] tabular-nums text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            {timeLabel}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {showHeader && (
          <div className="mb-0.5 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-foreground">{msg.senderName}</span>
            <time className="text-xs text-muted-foreground" dateTime={msg.createdAt}>
              {timeLabel}
            </time>
            {msg.editedAt && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>
        )}
        <div className="text-[15px] leading-snug text-foreground sm:text-sm">
          {children ?? <MessageBody body={msg.body} />}
        </div>
        {footer}
      </div>
      {toolbar ? <div className="shrink-0 pt-0.5">{toolbar}</div> : null}
    </article>
  );
}
