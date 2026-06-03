import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListChannels,
  useGetChannelMessages,
  getGetChannelMessagesQueryKey,
  type MessageInput,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePermissions } from "@/hooks/use-permissions";
import { useChannelMessagesRealtime } from "@/hooks/use-channel-messages-realtime";
import { useSendChannelMessage } from "@/hooks/use-send-channel-message";
import { canManageChannel, canPostInChannel } from "@workspace/rbac";
import { useToast } from "@/hooks/use-toast";
import { useMobileChromeFlags } from "@/contexts/MobileChromeContext";
import { ChannelList } from "@/components/channels/ChannelList";
import { CreateChannelDialog } from "@/components/channels/CreateChannelDialog";
import { ChannelSettingsSheet } from "@/components/channels/ChannelSettingsSheet";
import { ChannelThreadHeader } from "@/components/channels/ChannelThreadHeader";
import { MessageBubble } from "@/components/channels/MessageBubble";
import { MessageComposer } from "@/components/channels/MessageComposer";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { isFirebaseRealtimeEnabled, ensureFirebaseAuth } from "@/lib/firebase-client";
import { isFirebaseChatEnabled } from "@/lib/firebase-config";

export default function ChannelsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { data: channels, isLoading: channelsLoading } = useListChannels();
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useMobileChromeFlags({
    immersivePage: isMobile,
    hideBottomNav: isMobile && mobileThreadOpen,
  });

  const selectedChannel = channels?.find((c) => c.id === selectedChannelId);

  const ctx = user
    ? { userId: user.id, role: user.role, teamId: user.teamId }
    : null;

  const membership = selectedChannel?.myRole
    ? { role: selectedChannel.myRole }
    : null;

  const canPost =
    selectedChannel &&
    ctx &&
    canPostInChannel(
      ctx,
      { archived: selectedChannel.archived ?? false, type: selectedChannel.type },
      membership,
    );

  const canManage = Boolean(ctx && canManageChannel(ctx, membership));

  const threadActive = Boolean(selectedChannelId && (!isMobile || mobileThreadOpen));

  const [firebaseLive, setFirebaseLive] = useState(false);

  useEffect(() => {
    if (!isFirebaseChatEnabled()) {
      setFirebaseLive(false);
      return;
    }
    void ensureFirebaseAuth().then((ok) => setFirebaseLive(ok && isFirebaseRealtimeEnabled()));
  }, [selectedChannelId]);

  const { data: messages, isLoading: messagesLoading } = useGetChannelMessages(
    selectedChannelId ?? 0,
    {
      query: {
        enabled: !!selectedChannelId,
        queryKey: getGetChannelMessagesQueryKey(selectedChannelId ?? 0),
        staleTime: 30_000,
        refetchInterval: firebaseLive ? false : 10_000,
      },
    },
  );

  const realtimeReady =
    threadActive && !!selectedChannelId && !messagesLoading && messages !== undefined;

  useChannelMessagesRealtime(selectedChannelId, realtimeReady);

  const { send, queuePending, flushPending, markPendingFailed, isPending: sending } =
    useSendChannelMessage(selectedChannelId);

  const rowVirtualizer = useVirtualizer({
    count: messages?.length ?? 0,
    getScrollElement: () => messagesContainerRef.current,
    estimateSize: () => 120,
    overscan: 10,
  });

  useEffect(() => {
    if (isMobile) return;
    if (channels && channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0]!.id);
    }
  }, [channels, selectedChannelId, isMobile]);

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    if (!shouldAutoScroll) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, shouldAutoScroll]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShouldAutoScroll(distanceFromBottom < 96);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [selectedChannelId, mobileThreadOpen]);

  const handleSend = useCallback(
    async (payload: MessageInput, previewAttachments?: MessageInput["attachments"]) => {
      if (!selectedChannelId || !canPost) return;
      try {
        await send(payload, previewAttachments);
        setShouldAutoScroll(true);
      } catch (err) {
        const detail =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err && "error" in err
              ? String((err as { error: unknown }).error)
              : undefined;
        toast({
          title: "Failed to send message",
          description: detail ?? "Check your connection and try again.",
          variant: "destructive",
        });
      }
    },
    [selectedChannelId, canPost, send, toast],
  );

  const handleQueuePending = useCallback(
    (payload: MessageInput, previewAttachments?: MessageInput["attachments"]) => {
      if (!selectedChannelId || !canPost) throw new Error("Not ready");
      return queuePending(payload, previewAttachments);
    },
    [selectedChannelId, canPost, queuePending],
  );

  const handleFlushPending = useCallback(
    async (
      clientId: string,
      payload: MessageInput,
      previewAttachments?: MessageInput["attachments"],
    ) => {
      if (!selectedChannelId || !canPost) return;
      try {
        await flushPending(clientId, payload, previewAttachments);
        setShouldAutoScroll(true);
      } catch (err) {
        const detail =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err && "error" in err
              ? String((err as { error: unknown }).error)
              : undefined;
        toast({
          title: "Failed to send message",
          description: detail ?? "Check your connection and try again.",
          variant: "destructive",
        });
        throw err;
      }
    },
    [selectedChannelId, canPost, flushPending, toast],
  );

  function selectChannel(id: number) {
    setSelectedChannelId(id);
    if (isMobile) setMobileThreadOpen(true);
  }

  function backToList() {
    setMobileThreadOpen(false);
  }

  const showList = !isMobile || !mobileThreadOpen;
  const showThread = !isMobile || mobileThreadOpen;
  const canCreate = can("channels:write");

  const threadContent = (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] bg-background">
      {selectedChannel && (
        <ChannelThreadHeader
          channel={selectedChannel}
          isMobile={isMobile}
          onBack={backToList}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      <div
        ref={messagesContainerRef}
        className="touch-scroll min-h-0 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6"
      >
        {!selectedChannelId ? (
          <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
            Select a channel to start chatting
          </div>
        ) : messagesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <Skeleton className="h-16 w-64 max-w-full rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages?.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <p>No messages yet</p>
            <p className="text-xs">Say hello to the team</p>
          </div>
        ) : (
          <div
            style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}
            className="w-full"
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const msg = messages![virtualRow.index]!;
              const prev = virtualRow.index > 0 ? messages![virtualRow.index - 1] : null;
              const isMe = msg.senderId === user?.id;
              const showMeta = !prev || prev.senderId !== msg.senderId;
              return (
                <div
                  key={msg.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute left-0 top-0 w-full pb-4"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <MessageBubble
                    msg={msg}
                    isMe={isMe}
                    showMeta={showMeta}
                    channelId={selectedChannelId!}
                  />
                </div>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {selectedChannelId && canPost && selectedChannel && (
        <MessageComposer
          channelId={selectedChannelId}
          channelName={selectedChannel.name}
          sending={sending}
          onSend={handleSend}
          onQueuePending={handleQueuePending}
          onFlushPending={handleFlushPending}
          onMarkPendingFailed={markPendingFailed}
        />
      )}

      {selectedChannelId && !canPost && selectedChannel && (
        <div className="sticky bottom-0 shrink-0 border-t border-border px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground">
          {selectedChannel.archived
            ? "This channel is archived."
            : "You have read-only access in this channel."}
        </div>
      )}
    </div>
  );

  const mobileThreadPortal =
    isMobile &&
    mobileThreadOpen &&
    selectedChannelId &&
    typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[100] grid h-[100dvh] grid-rows-[auto_minmax(0,1fr)_auto] bg-background pt-[env(safe-area-inset-top)]">
            {threadContent}
          </div>,
          document.body,
        )
      : null;

  return (
    <AppLayout title="Chat" fillViewport>
      <div
        className={cn(
          "flex h-full min-h-0 w-full flex-1 overflow-hidden",
          isMobile && "flex-col",
        )}
      >
        {isMobile ? (
          <>
            {showList && (
              <ChannelList
                channels={channels}
                isLoading={channelsLoading}
                selectedChannelId={selectedChannelId}
                onSelect={selectChannel}
                onCreateClick={() => setCreateOpen(true)}
                canCreate={canCreate}
                isMobile
              />
            )}
          </>
        ) : (
          <>
            <ChannelList
              channels={channels}
              isLoading={channelsLoading}
              selectedChannelId={selectedChannelId}
              onSelect={selectChannel}
              onCreateClick={() => setCreateOpen(true)}
              canCreate={canCreate}
            />
            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
              {threadContent}
            </div>
          </>
        )}
      </div>

      {mobileThreadPortal}

      <CreateChannelDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setSelectedChannelId(id);
          if (isMobile) setMobileThreadOpen(true);
        }}
      />

      <ChannelSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        channel={selectedChannel ?? null}
        canManage={!!canManage}
        onArchived={() => {
          setSelectedChannelId(null);
          setMobileThreadOpen(false);
        }}
      />
    </AppLayout>
  );
}
