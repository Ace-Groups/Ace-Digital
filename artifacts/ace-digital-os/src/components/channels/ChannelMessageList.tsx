import { useEffect, useMemo, useRef, useState } from "react";
import type { Message } from "@workspace/api-client-react";
import { MessageBubble } from "@/components/channels/MessageBubble";
import { shouldGroupWithPrevious } from "@/components/channels/MessageRow";
import { DateSeparator } from "@/components/channels/DateSeparator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { messageDayKey } from "@/lib/chat-display";
import type { PendingMessage } from "@/hooks/use-send-channel-message";
import { captureScrollAnchor, restoreScrollAnchor } from "@/lib/scroll-preserve";
import { cn } from "@/lib/utils";

function isPendingMessage(msg: Message | PendingMessage): msg is PendingMessage {
  return "status" in msg && (msg.status === "sending" || msg.status === "failed");
}

export type ReplyTarget = {
  id: number;
  body: string;
  senderName?: string | null;
};

interface ChannelMessageListProps {
  channelId: number;
  messages: Message[] | undefined;
  isLoading: boolean;
  currentUserId?: number;
  lastReadMessageId?: number | null;
  shouldAutoScroll: boolean;
  onShouldAutoScrollChange: (value: boolean) => void;
  onMarkRead: () => void;
  onLoadOlder: () => Promise<boolean>;
  loadingOlder: boolean;
  hasMoreBefore: boolean;
  onReply?: (target: ReplyTarget) => void;
  onScrollToMessage?: (messageId: number) => void;
  searchQuery?: string;
  onMessagePatched?: (message: Message) => void;
  canDeleteMessage?: (message: Message) => boolean;
  onDeleteMessage?: (message: Message) => void | Promise<void>;
  onToggleReaction?: (message: Message, emoji: string) => void;
  onVotePoll?: (message: Message, optionId: string) => void;
  onRsvpEvent?: (message: Message, status: "going" | "maybe" | "no") => void;
  onOpenThread?: (message: Message) => void;
  onEditMessage?: (message: Message) => void;
  canEditMessage?: (message: Message) => boolean;
}

export function ChannelMessageList({
  channelId,
  messages,
  isLoading,
  currentUserId,
  lastReadMessageId,
  shouldAutoScroll,
  onShouldAutoScrollChange,
  onMarkRead,
  onLoadOlder,
  loadingOlder,
  hasMoreBefore,
  onReply,
  onScrollToMessage,
  searchQuery = "",
  onMessagePatched,
  canDeleteMessage,
  onDeleteMessage,
  onToggleReaction,
  onVotePoll,
  onRsvpEvent,
  onOpenThread,
  onEditMessage,
  canEditMessage,
}: ChannelMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [pendingNewCount, setPendingNewCount] = useState(0);
  const prevLenRef = useRef(0);
  const jumpedUnreadRef = useRef(false);
  const loadOlderLockRef = useRef(false);
  const autoScrollRef = useRef(shouldAutoScroll);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !messages) return messages ?? [];
    return messages.filter((m) => m.body.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  const liveMessagesById = useMemo(() => {
    const map = new Map<number, Message>();
    for (const m of messages ?? []) {
      if (!("status" in m)) map.set(m.id, m);
    }
    return map;
  }, [messages]);

  const newMessagesDividerIndex = useMemo(() => {
    const anchor = lastReadMessageId;
    if (!anchor || !filtered.length) return -1;
    const last = filtered[filtered.length - 1];
    if (last && !isPendingMessage(last) && last.id <= anchor) return -1;
    const idx = filtered.findIndex((m) => !isPendingMessage(m) && m.id > anchor);
    return idx > 0 ? idx : -1;
  }, [filtered, lastReadMessageId]);

  useEffect(() => {
    autoScrollRef.current = shouldAutoScroll;
  }, [shouldAutoScroll]);

  useEffect(() => {
    jumpedUnreadRef.current = false;
    prevLenRef.current = 0;
    setPendingNewCount(0);
  }, [channelId]);

  useEffect(() => {
    if (!filtered.length || jumpedUnreadRef.current) return;
    if (newMessagesDividerIndex < 0) return;
    jumpedUnreadRef.current = true;
    if (autoScrollRef.current) {
      autoScrollRef.current = false;
      onShouldAutoScrollChange(false);
    }
    const el = containerRef.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(
      `[data-message-index="${newMessagesDividerIndex}"]`,
    );
    requestAnimationFrame(() => {
      target?.scrollIntoView({ block: "start" });
    });
  }, [filtered.length, newMessagesDividerIndex, onShouldAutoScrollChange]);

  useEffect(() => {
    if (!filtered.length) return;
    const grew = filtered.length > prevLenRef.current;
    prevLenRef.current = filtered.length;
    if (!grew) return;
    if (shouldAutoScroll) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      setPendingNewCount(0);
    } else {
      setPendingNewCount((n) => n + 1);
    }
  }, [filtered.length, shouldAutoScroll]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      const nearBottom = distanceFromBottom < 96;
      if (nearBottom !== autoScrollRef.current) {
        autoScrollRef.current = nearBottom;
        onShouldAutoScrollChange(nearBottom);
      }
      if (nearBottom) {
        onMarkRead();
        setPendingNewCount(0);
      }
      if (
        el.scrollTop < 80 &&
        filtered.length &&
        hasMoreBefore &&
        !loadingOlder &&
        !loadOlderLockRef.current
      ) {
        loadOlderLockRef.current = true;
        const anchor = captureScrollAnchor(el);
        void onLoadOlder().then(() => {
          requestAnimationFrame(() => restoreScrollAnchor(el, anchor));
        }).finally(() => {
          loadOlderLockRef.current = false;
        });
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [
    filtered.length,
    hasMoreBefore,
    loadingOlder,
    onLoadOlder,
    onMarkRead,
    onShouldAutoScrollChange,
  ]);

  if (isLoading) {
    return (
      <div className="w-full space-y-2 px-5 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <Skeleton className="h-12 w-48 max-w-[75%] rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
        <p>{searchQuery ? "No messages match your search" : "No messages yet"}</p>
        {!searchQuery && <p className="text-xs">Say hello to the team</p>}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth [-webkit-overflow-scrolling:touch]"
    >
      <div className="flex w-full max-w-none flex-col overflow-visible px-3 py-2 sm:px-5 sm:py-3">
      {loadingOlder && (
        <p className="mb-2 text-center text-xs text-muted-foreground">Loading older messages…</p>
      )}
      <div className="flex w-full flex-col">
        {filtered.map((msg, index) => {
          const prev = index > 0 ? filtered[index - 1]! : null;
          const isMe = msg.senderId === currentUserId;
          const prevMsg = prev && !isPendingMessage(prev) ? (prev as Message) : null;
          const curMsg = !isPendingMessage(msg) ? (msg as Message) : null;
          const showMeta = !curMsg || !prevMsg || !shouldGroupWithPrevious(prevMsg, curMsg);
          const showDay =
            !prev || messageDayKey(prev.createdAt) !== messageDayKey(msg.createdAt);
          const showNewDivider = index === newMessagesDividerIndex;
          const sameSenderAsPrev = prev && prev.senderId === msg.senderId;

          return (
            <div
              key={msg.id}
              data-message-index={index}
              className={cn(
                showMeta ? "pt-3 first:pt-0" : sameSenderAsPrev ? "pt-0.5" : "pt-1",
              )}
            >
              {showDay && <DateSeparator createdAt={msg.createdAt} />}
              {showNewDivider && (
                <div
                  className="mb-2 flex items-center gap-2 text-xs font-medium text-primary"
                  role="separator"
                >
                  <span className="h-px flex-1 bg-primary/30" />
                  New messages
                  <span className="h-px flex-1 bg-primary/30" />
                </div>
              )}
              <MessageBubble
                msg={msg}
                isMe={isMe}
                showMeta={showMeta}
                channelId={channelId}
                currentUserId={currentUserId}
                canDelete={canDeleteMessage?.(msg) ?? false}
                onDelete={onDeleteMessage ? () => void onDeleteMessage(msg) : undefined}
                onReply={onReply}
                onScrollToQuotedMessage={onScrollToMessage}
                liveMessagesById={liveMessagesById}
                onToggleReaction={
                  !isPendingMessage(msg) && onToggleReaction
                    ? (emoji) => onToggleReaction(msg as Message, emoji)
                    : undefined
                }
                onVotePoll={
                  !isPendingMessage(msg) && onVotePoll
                    ? (optionId) => onVotePoll(msg as Message, optionId)
                    : undefined
                }
                onRsvpEvent={
                  !isPendingMessage(msg) && onRsvpEvent
                    ? (status) => onRsvpEvent(msg as Message, status)
                    : undefined
                }
                onOpenThread={
                  !isPendingMessage(msg) && onOpenThread
                    ? () => onOpenThread(msg as Message)
                    : undefined
                }
                onEdit={onEditMessage}
                canEdit={canEditMessage?.(msg as Message) ?? false}
              />
            </div>
          );
        })}
      </div>
      <div ref={endRef} className="h-px shrink-0" />
      </div>
      {pendingNewCount > 0 && !shouldAutoScroll && (
        <div className="pointer-events-none sticky bottom-[max(1rem,env(safe-area-inset-bottom))] flex justify-center pb-2">
          <Button
            type="button"
            size="sm"
            className={cn(
              "pointer-events-auto rounded-full bg-primary px-4 text-primary-foreground shadow-md hover:bg-primary/90",
            )}
            onClick={() => {
              autoScrollRef.current = true;
              onShouldAutoScrollChange(true);
              setPendingNewCount(0);
              endRef.current?.scrollIntoView({ behavior: "smooth" });
              onMarkRead();
            }}
          >
            {pendingNewCount === 1 ? "New message" : `${pendingNewCount} new messages`}
          </Button>
        </div>
      )}
    </div>
  );
}
