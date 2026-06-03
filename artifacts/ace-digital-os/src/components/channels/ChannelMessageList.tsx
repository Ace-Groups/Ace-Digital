import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  toggleMessageReaction,
  type Message,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetChannelMessagesQueryKey } from "@workspace/api-client-react";
import { MessageBubble } from "@/components/channels/MessageBubble";
import { DateSeparator } from "@/components/channels/DateSeparator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { messageDayKey } from "@/lib/chat-display";
import type { PendingMessage } from "@/hooks/use-send-channel-message";

function isPendingMessage(msg: Message | PendingMessage): msg is PendingMessage {
  return "status" in msg && (msg.status === "sending" || msg.status === "failed");
}
import { captureScrollAnchor, restoreScrollAnchor } from "@/lib/scroll-preserve";
import { cn } from "@/lib/utils";

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
  searchQuery?: string;
  onMessagePatched?: (message: Message) => void;
  canDeleteMessage?: (message: Message) => boolean;
  onDeleteMessage?: (message: Message) => void | Promise<void>;
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
  searchQuery = "",
  onMessagePatched,
  canDeleteMessage,
  onDeleteMessage,
}: ChannelMessageListProps) {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [pendingNewCount, setPendingNewCount] = useState(0);
  const prevLenRef = useRef(0);
  const jumpedUnreadRef = useRef(false);
  const loadOlderLockRef = useRef(false);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !messages) return messages ?? [];
    return messages.filter((m) => m.body.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  const newMessagesDividerIndex = useMemo(() => {
    const anchor = lastReadMessageId;
    if (!anchor || !filtered.length) return -1;
    const idx = filtered.findIndex((m) => m.id > anchor);
    return idx > 0 ? idx : -1;
  }, [filtered, lastReadMessageId]);

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 128,
    overscan: 10,
  });

  useEffect(() => {
    jumpedUnreadRef.current = false;
    prevLenRef.current = 0;
    setPendingNewCount(0);
  }, [channelId]);

  useEffect(() => {
    if (!filtered.length || jumpedUnreadRef.current) return;
    if (newMessagesDividerIndex < 0) return;
    jumpedUnreadRef.current = true;
    onShouldAutoScrollChange(false);
    const index = newMessagesDividerIndex;
    requestAnimationFrame(() => {
      rowVirtualizer.scrollToIndex(index, { align: "start" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rowVirtualizer identity changes each render
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
      onShouldAutoScrollChange(nearBottom);
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
      <div className="space-y-4 px-3 py-4 sm:px-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <Skeleton className="h-16 w-64 max-w-full rounded-2xl" />
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
    <div ref={containerRef} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6">
      {loadingOlder && (
        <p className="mb-3 text-center text-xs text-muted-foreground">Loading older messages…</p>
      )}
      <div
        style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}
        className="w-full"
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const msg = filtered[virtualRow.index]!;
          const prev = virtualRow.index > 0 ? filtered[virtualRow.index - 1] : null;
          const isMe = msg.senderId === currentUserId;
          const showMeta = !prev || prev.senderId !== msg.senderId;
          const showDay =
            !prev || messageDayKey(prev.createdAt) !== messageDayKey(msg.createdAt);
          const showNewDivider = virtualRow.index === newMessagesDividerIndex;

          return (
            <div
              key={msg.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className="absolute left-0 top-0 w-full pb-4"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {showDay && <DateSeparator createdAt={msg.createdAt} />}
              {showNewDivider && (
                <div
                  className="mb-4 flex items-center gap-3 text-xs font-medium text-primary"
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
                onToggleReaction={
                  !isPendingMessage(msg)
                    ? async (emoji) => {
                        const updated = await toggleMessageReaction(channelId, msg.id, {
                          emoji,
                        });
                        onMessagePatched?.(updated);
                        queryClient.setQueryData<Message[]>(
                          getGetChannelMessagesQueryKey(channelId, { limit: 50 }),
                          (prev) =>
                            prev?.map((m) => (m.id === updated.id ? updated : m)) ?? prev,
                        );
                      }
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>
      <div ref={endRef} />
      {pendingNewCount > 0 && !shouldAutoScroll && (
        <div className="pointer-events-none sticky bottom-4 flex justify-center">
          <Button
            type="button"
            size="sm"
            className={cn("pointer-events-auto shadow-md")}
            onClick={() => {
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
