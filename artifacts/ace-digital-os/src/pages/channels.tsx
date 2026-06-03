import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
import { useRoomMessageList } from "@/hooks/use-room-message-list";
import { useSendChannelMessage } from "@/hooks/use-send-channel-message";
import { canManageChannel, canPostInChannel } from "@workspace/rbac";
import { useToast } from "@/hooks/use-toast";
import { useMobileChromeFlags } from "@/contexts/MobileChromeContext";
import { RoomSidebar } from "@/components/channels/RoomSidebar";
import { CreateChannelDialog } from "@/components/channels/CreateChannelDialog";
import { ChannelSettingsSheet } from "@/components/channels/ChannelSettingsSheet";
import {
  ChannelThreadHeader,
  type ReplyTarget,
} from "@/components/channels/ChannelThreadHeader";
import {
  ChannelMessageList,
  type ReplyTarget as ListReplyTarget,
} from "@/components/channels/ChannelMessageList";
import { MessageComposer } from "@/components/channels/MessageComposer";
import { cn } from "@/lib/utils";
import { isFirebaseRealtimeEnabled, ensureFirebaseAuth } from "@/lib/firebase-client";
import { isFirebaseChatEnabled } from "@/lib/firebase-config";
import { parseChannelIdFromSearch, setChannelIdInSearch } from "@/lib/channel-url";
import { useMarkChannelRead } from "@/hooks/use-mark-channel-read";

export default function ChannelsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { data: channels, isLoading: channelsLoading } = useListChannels();
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(() =>
    parseChannelIdFromSearch(),
  );
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [roomSearch, setRoomSearch] = useState("");
  const { markRead } = useMarkChannelRead();

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

  const messageParams = { limit: 50 } as const;

  const { data: latestMessages, isLoading: messagesLoading } = useGetChannelMessages(
    selectedChannelId ?? 0,
    messageParams,
    {
      query: {
        enabled: !!selectedChannelId,
        queryKey: getGetChannelMessagesQueryKey(selectedChannelId ?? 0, messageParams),
        staleTime: 30_000,
        refetchInterval: firebaseLive ? false : 10_000,
      },
    },
  );

  const realtimeReady =
    threadActive && !!selectedChannelId && !messagesLoading && latestMessages !== undefined;

  const room = useRoomMessageList(selectedChannelId, !!selectedChannelId);

  useEffect(() => {
    if (latestMessages) room.syncFromQuery(latestMessages);
  }, [latestMessages, room]);

  useChannelMessagesRealtime(selectedChannelId, realtimeReady, room.applyRealtime);

  const { send, queuePending, flushPending, markPendingFailed, isPending: sending } =
    useSendChannelMessage(selectedChannelId);

  useEffect(() => {
    if (!channels?.length) return;
    const fromUrl = parseChannelIdFromSearch();
    if (fromUrl && channels.some((c) => c.id === fromUrl)) {
      if (selectedChannelId !== fromUrl) {
        setSelectedChannelId(fromUrl);
        if (isMobile) setMobileThreadOpen(true);
      }
      return;
    }
    if (!isMobile && !selectedChannelId) {
      const first = channels[0]!.id;
      setSelectedChannelId(first);
      setChannelIdInSearch(first);
    }
  }, [channels, selectedChannelId, isMobile]);

  useEffect(() => {
    setReplyTo(null);
    setShouldAutoScroll(true);
    setRoomSearch("");
  }, [selectedChannelId]);

  const handleMarkRead = useCallback(() => {
    if (selectedChannelId) void markRead(selectedChannelId);
  }, [selectedChannelId, markRead]);

  const handleLoadOlder = useCallback(async () => {
    setLoadingOlder(true);
    try {
      return await room.loadOlder();
    } finally {
      setLoadingOlder(false);
    }
  }, [room]);

  const handleReply = useCallback((target: ListReplyTarget) => {
    setReplyTo(target);
  }, []);

  const wrapPayload = useCallback(
    (payload: MessageInput): MessageInput => {
      if (!replyTo) return payload;
      const metadata = {
        ...(payload.metadata ?? {}),
        replyTo: {
          id: replyTo.id,
          body: replyTo.body.slice(0, 280),
          senderName: replyTo.senderName ?? null,
        },
      };
      return { ...payload, metadata };
    },
    [replyTo],
  );

  const handleSend = useCallback(
    async (payload: MessageInput, previewAttachments?: MessageInput["attachments"]) => {
      if (!selectedChannelId || !canPost) return;
      try {
        await send(wrapPayload(payload), previewAttachments);
        setShouldAutoScroll(true);
        setReplyTo(null);
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
    [selectedChannelId, canPost, send, wrapPayload, toast],
  );

  const handleQueuePending = useCallback(
    (payload: MessageInput, previewAttachments?: MessageInput["attachments"]) => {
      if (!selectedChannelId || !canPost) throw new Error("Not ready");
      return queuePending(wrapPayload(payload), previewAttachments);
    },
    [selectedChannelId, canPost, queuePending, wrapPayload],
  );

  const handleFlushPending = useCallback(
    async (
      clientId: string,
      payload: MessageInput,
      previewAttachments?: MessageInput["attachments"],
    ) => {
      if (!selectedChannelId || !canPost) return;
      try {
        await flushPending(clientId, wrapPayload(payload), previewAttachments);
        setShouldAutoScroll(true);
        setReplyTo(null);
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
    [selectedChannelId, canPost, flushPending, wrapPayload, toast],
  );

  function selectChannel(id: number) {
    setSelectedChannelId(id);
    setChannelIdInSearch(id);
    if (isMobile) setMobileThreadOpen(true);
  }

  function backToList() {
    setMobileThreadOpen(false);
  }

  const showList = !isMobile || !mobileThreadOpen;
  const canCreate = can("channels:write");

  const threadContent = (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] bg-background">
      {selectedChannel && (
        <ChannelThreadHeader
          channel={selectedChannel}
          channelId={selectedChannelId!}
          isMobile={isMobile}
          onBack={backToList}
          onOpenSettings={() => setSettingsOpen(true)}
          searchQuery={roomSearch}
          onSearchChange={setRoomSearch}
        />
      )}

      {selectedChannelId ? (
        <ChannelMessageList
          channelId={selectedChannelId}
          messages={room.messages}
          isLoading={room.isLoading || messagesLoading}
          currentUserId={user?.id}
          lastReadMessageId={selectedChannel?.lastReadMessageId}
          shouldAutoScroll={shouldAutoScroll}
          onShouldAutoScrollChange={setShouldAutoScroll}
          onMarkRead={handleMarkRead}
          onLoadOlder={handleLoadOlder}
          loadingOlder={loadingOlder}
          hasMoreBefore={room.hasMoreBefore}
          onReply={handleReply}
          searchQuery={roomSearch}
          onMessagePatched={(updated) => room.patchMessage(updated.id, () => updated)}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Select a channel to start chatting
        </div>
      )}

      {selectedChannelId && canPost && selectedChannel && (
        <MessageComposer
          channelId={selectedChannelId}
          channelName={selectedChannel.name}
          sending={sending}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
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
          <div className="fixed inset-0 z-[100] grid h-[100dvh] grid-rows-[auto_minmax(0,1fr)_auto] bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
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
        {showList && (
          <RoomSidebar
            channels={channels}
            isLoading={channelsLoading && !channels}
            selectedChannelId={selectedChannelId}
            onSelect={selectChannel}
            onCreateClick={() => setCreateOpen(true)}
            canCreate={canCreate}
            isMobile={isMobile}
          />
        )}
        {!isMobile && (
          <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
            {threadContent}
          </div>
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
