import { Download, FileText } from "lucide-react";
import type { Message } from "@workspace/api-client-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { formatFileSize } from "@/lib/chat-media";
import { UserAvatar } from "@/components/UserAvatar";

interface MessageBubbleProps {
  msg: Message;
  isMe: boolean;
  showMeta: boolean;
}

export function MessageBubble({ msg, isMe, showMeta }: MessageBubbleProps) {
  const attachments = msg.attachments ?? [];

  return (
    <div
      data-testid={`message-${msg.id}`}
      className={cn("flex gap-2.5 sm:gap-3", isMe && "flex-row-reverse")}
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
          <div
            className={cn(
              "mb-1 flex items-center gap-2",
              isMe && "flex-row-reverse",
            )}
          >
            <p className="text-xs font-medium text-foreground">{msg.senderName}</p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(msg.createdAt)}
            </p>
          </div>
        )}
        <div className="space-y-2">
          {attachments.map((att, i) => (
            <AttachmentPreview key={`${msg.id}-att-${i}`} attachment={att} isMe={isMe} />
          ))}
          {msg.body?.trim() ? (
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 text-[0.9375rem] leading-relaxed break-words",
                isMe
                  ? "rounded-tr-md bg-primary text-primary-foreground"
                  : "rounded-tl-md bg-muted text-foreground",
              )}
            >
              {msg.body}
            </div>
          ) : null}
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

  if (attachment.type === "image") {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer" className={cn(frame, "block")}>
        <img
          src={attachment.url}
          alt={attachment.name ?? "Image"}
          className="max-h-64 w-full object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (attachment.type === "video") {
    return (
      <div className={frame}>
        <video
          src={attachment.url}
          controls
          playsInline
          className="max-h-64 w-full bg-black"
          preload="metadata"
        />
      </div>
    );
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
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.size)}
        </p>
      </div>
      <Download size={18} className="shrink-0 text-muted-foreground" />
    </a>
  );
}
