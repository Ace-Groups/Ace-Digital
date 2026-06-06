import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListChannels,
  useGetChannelMessages,
  useListChannelMembers,
  getGetChannelMessagesQueryKey,
  getListChannelMembersQueryKey,
  type Message,
  type MessageInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CHANNEL_MESSAGE_PARAMS } from "@/hooks/use-room-message-list";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePermissions } from "@/hooks/use-permissions";
import { useChannelMessagesRealtime } from "@/hooks/use-channel-messages-realtime";
import { useChannelActivityRealtime } from "@/hooks/use-channel-activity-realtime";
import { useSocket } from "@/contexts/SocketContext";
import { useRoomMessageList, useMessageListSyncKey } from "@/hooks/use-room-message-list";
import { useSendChannelMessage } from "@/hooks/use-send-channel-message";
import { canDeleteMessage, canManageChannel, canPostInChannel } from "@workspace/rbac";
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
import { SlackComposer } from "@/components/channels/SlackComposer";
import { ChatWorkspace } from "@/components/channels/ChatWorkspace";
import { ThreadSidePanel } from "@/components/channels/ThreadSidePanel";
import { ChannelFilesPanel } from "@/components/channels/ChannelFilesPanel";
import { ChannelPinsPanel } from "@/components/channels/ChannelPinsPanel";
import { OpenDmDialog } from "@/components/channels/OpenDmDialog";
import {
  useStarChannel,
  useUnstarChannel,
  useListChannelPins,
  getListChannelPinsQueryKey,
  usePinMessage,
  useUnpinMessage,
} from "@workspace/api-client-react";
import { canEditMessage } from "@workspace/rbac";
import { cn } from "@/lib/utils";
import { isFirebaseRealtimeEnabled, ensureFirebaseAuth } from "@/lib/firebase-client";
import { isFirebaseChatEnabled } from "@/lib/firebase-config";
import { parseChannelIdFromSearch, setChannelIdInSearch } from "@/lib/channel-url";
import { useMarkChannelRead } from "@/hooks/use-mark-channel-read";
import { useChannelMessageOptimistic } from "@/hooks/use-channel-message-optimistic";
import { usePrefetchChannelMessages } from "@/hooks/use-prefetch-channel-messages";
import { replyMetadataFromTarget } from "@/lib/chat-reply";
import { channelDisplayLabel } from "@/lib/chat-mentions";

export default function ChannelsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { data: channels, isLoading: channelsLoading } = useListChannels();
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(() =>
    parseChannelIdFromSearch(),
  );
  const channelIds = useMemo(() => channels?.map((c) => c.id), [channels]);
  usePrefetchChannelMessages(channelIds, selectedChannelId);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const replyToRef = useRef<ReplyTarget | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const [roomSearch, setRoomSearch] = useState("");
  const [headerTab, setHeaderTab] = useState<"messages" | "files" | "pins">("messages");
  const [threadRoot, setThreadRoot] = useState<Message | null>(null);
  const [openDmOpen, setOpenDmOpen] = useState(false);
  const { markRead } = useMarkChannelRead();
  const starChannel = useStarChannel();
  const unstarChannel = useUnstarChannel();
  const pinMessage = usePinMessage();
  const unpinMessage = useUnpinMessage();

  const { data: channelPins } = useListChannelPins(selectedChannelId ?? 0, {
    query: {
      enabled: !!selectedChannelId,
      queryKey: getListChannelPinsQueryKey(selectedChannelId ?? 0),
    },
  });

  const pinnedMessageIds = useMemo(
    () => new Set((channelPins ?? []).map((p) => p.messageId)),
    [channelPins],
  );

  const setActiveReply = useCallback((target: ReplyTarget | null) => {
    replyToRef.current = target;
    setReplyTo(target);
  }, []);

  useMobileChromeFlags({
    immersivePage: isMobile,
    hideBottomNav: isMobile,
  });

  const selectedChannel = channels?.find((c) => c.id === selectedChannelId);

  const ctx = user
    ? { userId: user.id, role: user.role, teamId: user.teamId }
    : null;

  const { data: channelMembers } = useListChannelMembers(selectedChannelId ?? 0, {
    query: {
      enabled: !!selectedChannelId,
      queryKey: getListChannelMembersQueryKey(selectedChannelId ?? 0),
      staleTime: 60_000,
    },
  });

  const myRoleFromMembers = channelMembers?.find((m) => m.userId === user?.id)?.role;
  const mentionNameMaps = useMemo(
    () => ({
      userNames: new Map((channelMembers ?? []).map((m) => [m.userId, m.fullName] as const)),
      channelNames: new Map(
        (channels ?? []).map((c) => [c.id, channelDisplayLabel(c)] as const),
      ),
    }),
    [channelMembers, channels],
  );
  const membership =
    selectedChannel?.myRole || myRoleFromMembers
      ? { role: selectedChannel?.myRole ?? myRoleFromMembers ?? "member" }
      : null;

  const canPost =
    selectedChannel &&
    ctx &&
    canPostInChannel(
      ctx,
      { archived: selectedChannel.archived ?? false, type: selectedChannel.type },
      membership,
    );

  const canManage = Boolean(
    ctx &&
      selectedChannel &&
      canManageChannel(ctx, membership, {
        createdById: selectedChannel.createdById ?? null,
      }),
  );

  const threadActive = Boolean(selectedChannelId);

  const [firebaseLive, setFirebaseLive] = useState(false);

  useEffect(() => {
    if (!isFirebaseChatEnabled()) {
      setFirebaseLive(false);
      return;
    }
    void ensureFirebaseAuth().then((ok) => setFirebaseLive(ok && isFirebaseRealtimeEnabled()));
  }, []);

  const { connected: socketConnected } = useSocket();

  const { data: latestMessages, isPending: messagesPending } = useGetChannelMessages(
    selectedChannelId ?? 0,
    CHANNEL_MESSAGE_PARAMS,
    {
      query: {
        enabled: !!selectedChannelId,
        queryKey: getGetChannelMessagesQueryKey(selectedChannelId ?? 0, CHANNEL_MESSAGE_PARAMS),
        staleTime: 120_000,
        refetchInterval: firebaseLive ? false : 30_000,
        placeholderData: (previousData) =>
          previousData ??
          (selectedChannelId
            ? queryClient.getQueryData<Message[]>(
                getGetChannelMessagesQueryKey(selectedChannelId, CHANNEL_MESSAGE_PARAMS),
              )
            : undefined),
      },
    },
  );

  const realtimeReady = threadActive && !!selectedChannelId && socketConnected;
  const activityRealtimeReady =
    threadActive && !!selectedChannelId && isFirebaseChatEnabled() && firebaseLive;

  const {
    messages: roomMessages,
    hasMoreBefore,
    loadOlder,
    syncFromQuery,
    appendMessage,
    patchMessage,
    replaceMessageByClientId,
    upsertMessage,
    isLoading: roomLoading,
  } = useRoomMessageList(selectedChannelId, !!selectedChannelId);

  const showMessageSkeleton =
    roomMessages.length === 0 &&
    (roomLoading || (messagesPending && latestMessages === undefined));

  const latestMessagesRef = useRef(latestMessages);
  latestMessagesRef.current = latestMessages;
  const messageSyncKey = useMessageListSyncKey(latestMessages);

  useEffect(() => {
    const msgs = latestMessagesRef.current;
    if (msgs !== undefined) syncFromQuery(msgs);
  }, [messageSyncKey, syncFromQuery]);

  useChannelMessagesRealtime(selectedChannelId, realtimeReady, {
    onUpsert: upsertMessage,
    onPersisted: replaceMessageByClientId,
  });
  useChannelActivityRealtime(selectedChannelId, activityRealtimeReady);

  const { queuePending, flushPending, markPendingFailed } = useSendChannelMessage(
    selectedChannelId,
    { onAppend: appendMessage, onReplace: replaceMessageByClientId },
  );

  const { toggleReactionInstant, deleteMessage, editMessageInstant, votePollInstant, rsvpInstant } =
    useChannelMessageOptimistic(selectedChannelId, patchMessage);

  const canEditForMessage = useCallback(
    (msg: Message) => {
      if (!ctx) return false;
      return canEditMessage(ctx, { senderId: msg.senderId, createdAt: msg.createdAt });
    },
    [ctx],
  );

  const handleSaveEditMessage = useCallback(
    (msg: Message, body: string) => {
      if (body.trim() && body.trim() !== msg.body) {
        editMessageInstant(msg, body.trim());
      }
    },
    [editMessageInstant],
  );

  const canPinForMessage = useCallback(
    (msg: Message) => {
      if (!ctx || !user) return false;
      return (
        msg.senderId === user.id ||
        canManageChannel(ctx, membership, {
          createdById: selectedChannel?.createdById ?? null,
        })
      );
    },
    [ctx, user, membership, selectedChannel],
  );

  const handlePinMessage = useCallback(
    (msg: Message) => {
      if (!selectedChannelId) return;
      void pinMessage
        .mutateAsync({ id: selectedChannelId, messageId: msg.id })
        .then(() => {
          void queryClient.invalidateQueries({
            queryKey: getListChannelPinsQueryKey(selectedChannelId),
          });
        })
        .catch(() => {
          toast({ title: "Could not pin message", variant: "destructive" });
        });
    },
    [selectedChannelId, pinMessage, queryClient, toast],
  );

  const handleUnpinMessage = useCallback(
    (msg: Message) => {
      if (!selectedChannelId) return;
      void unpinMessage
        .mutateAsync({ id: selectedChannelId, messageId: msg.id })
        .then(() => {
          void queryClient.invalidateQueries({
            queryKey: getListChannelPinsQueryKey(selectedChannelId),
          });
        })
        .catch(() => {
          toast({ title: "Could not unpin message", variant: "destructive" });
        });
    },
    [selectedChannelId, unpinMessage, queryClient, toast],
  );

  const handleToggleStar = useCallback(() => {
    if (!selectedChannelId || !selectedChannel) return;
    const starred = selectedChannel.starred ?? false;
    const action = starred ? unstarChannel : starChannel;
    void action.mutateAsync({ id: selectedChannelId }).then(() => {
      void queryClient.invalidateQueries({ queryKey: ["/v1/channels"] });
      void queryClient.invalidateQueries({ queryKey: ["/v1/dms"] });
    });
  }, [selectedChannelId, selectedChannel, starChannel, unstarChannel, queryClient]);

  const canDeleteForMessage = useCallback(
    (msg: Message) => {
      if (!ctx || !selectedChannel) return false;
      return canDeleteMessage(
        ctx,
        { senderId: msg.senderId, createdAt: msg.createdAt },
        { createdById: selectedChannel.createdById ?? null },
        membership,
      );
    },
    [ctx, selectedChannel, membership],
  );

  const handleDeleteMessage = useCallback(
    (msg: Message) => {
      void deleteMessage(msg);
    },
    [deleteMessage],
  );

  useEffect(() => {
    if (!channels?.length) return;
    const fromUrl = parseChannelIdFromSearch();
    if (fromUrl && channels.some((c) => c.id === fromUrl)) {
      if (selectedChannelId !== fromUrl) {
        setSelectedChannelId(fromUrl);
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
    setActiveReply(null);
    setShouldAutoScroll(true);
    setRoomSearch("");
    setHeaderTab("messages");
    setThreadRoot(null);
  }, [selectedChannelId, setActiveReply]);

  const latestPersistedMessageId = useMemo(() => {
    for (let i = roomMessages.length - 1; i >= 0; i--) {
      const m = roomMessages[i]!;
      if (!("status" in m)) return m.id;
    }
    return null;
  }, [roomMessages]);

  const handleMarkRead = useCallback(() => {
    if (selectedChannelId) markRead(selectedChannelId, latestPersistedMessageId);
  }, [selectedChannelId, markRead, latestPersistedMessageId]);

  useEffect(() => {
    if (!selectedChannelId || !latestPersistedMessageId || !shouldAutoScroll) return;
    markRead(selectedChannelId, latestPersistedMessageId);
  }, [selectedChannelId, latestPersistedMessageId, shouldAutoScroll, markRead]);

  const handleLoadOlder = useCallback(async () => {
    setLoadingOlder(true);
    try {
      return await loadOlder();
    } finally {
      setLoadingOlder(false);
    }
  }, [loadOlder]);

  const handleScrollToMessage = useCallback((messageId: number) => {
    document
      .querySelector(`[data-testid="message-${messageId}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleReply = useCallback(
    (target: ListReplyTarget) => {
      setActiveReply(target);
      setShouldAutoScroll(true);
      requestAnimationFrame(() => {
        composerRef.current?.focus();
        composerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    },
    [setActiveReply],
  );

  const wrapPayload = useCallback((payload: MessageInput): MessageInput => {
    const target = replyToRef.current;
    if (!target) return payload;
    return {
      ...payload,
      metadata: {
        ...(payload.metadata ?? {}),
        ...replyMetadataFromTarget(target),
      },
    };
  }, []);

  const handleSend = useCallback(
    async (payload: MessageInput, previewAttachments?: MessageInput["attachments"]) => {
      if (!selectedChannelId || !canPost) return;
      const wrapped = wrapPayload(payload);
      setActiveReply(null);
      setShouldAutoScroll(true);
      const hasFiles =
        (previewAttachments?.length ?? 0) > 0 ||
        (wrapped.attachments?.length ?? 0) > 0;
      if (hasFiles) {
        const clientId = queuePending(wrapped, previewAttachments);
        void flushPending(clientId, wrapped, previewAttachments).catch((err) => {
          const detail = err instanceof Error ? err.message : undefined;
          toast({
            title: "Failed to send message",
            description: detail ?? "Check your connection and try again.",
            variant: "destructive",
          });
        });
        return;
      }
      const clientId = queuePending(wrapped, previewAttachments);
      void flushPending(clientId, wrapped, previewAttachments).catch((err) => {
        const detail = err instanceof Error ? err.message : undefined;
        toast({
          title: "Failed to send message",
          description: detail ?? "Check your connection and try again.",
          variant: "destructive",
        });
      });
    },
    [selectedChannelId, canPost, queuePending, flushPending, wrapPayload, toast],
  );

  const handleQueuePending = useCallback(
    (payload: MessageInput, previewAttachments?: MessageInput["attachments"]) => {
      if (!selectedChannelId || !canPost) throw new Error("Not ready");
      const wrapped = wrapPayload(payload);
      if (replyToRef.current) setActiveReply(null);
      return queuePending(wrapped, previewAttachments);
    },
    [selectedChannelId, canPost, queuePending, wrapPayload, setActiveReply],
  );

  const handleFlushPending = useCallback(
    async (
      clientId: string,
      payload: MessageInput,
      previewAttachments?: MessageInput["attachments"],
    ) => {
      if (!selectedChannelId || !canPost) return;
      const wrapped = wrapPayload(payload);
      try {
        await flushPending(clientId, wrapped, previewAttachments);
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
    [selectedChannelId, canPost, flushPending, wrapPayload, toast],
  );

  const handleShouldAutoScrollChange = useCallback((value: boolean) => {
    setShouldAutoScroll(value);
  }, []);

  function selectChannel(id: number) {
    setSelectedChannelId(id);
    setChannelIdInSearch(id);
    if (isMobile && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
  }

  function backToList() {
    setSelectedChannelId(null);
    setChannelIdInSearch(null);
    setThreadRoot(null);
    setHeaderTab("messages");
  }
  const canCreate = can("channels:write");

  const channelLabel =
    selectedChannel?.type === "DM"
      ? (selectedChannel.dmPeerName ?? selectedChannel.name)
      : (selectedChannel?.name ?? "");

  const threadContent = (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] bg-[var(--chat-bg)]">
      {selectedChannel && (
        <ChannelThreadHeader
          channel={selectedChannel}
          channelId={selectedChannelId!}
          isMobile={isMobile}
          onBack={backToList}
          onOpenSettings={() => setSettingsOpen(true)}
          searchQuery={roomSearch}
          onSearchChange={setRoomSearch}
          activeTab={headerTab}
          onTabChange={setHeaderTab}
          starred={selectedChannel.starred ?? false}
          onToggleStar={handleToggleStar}
        />
      )}

      {selectedChannelId && headerTab === "files" ? (
        <ChannelFilesPanel channelId={selectedChannelId} />
      ) : selectedChannelId && headerTab === "pins" ? (
        <ChannelPinsPanel
          channelId={selectedChannelId}
          onJumpToMessage={(messageId) => {
            setHeaderTab("messages");
            handleScrollToMessage(messageId);
          }}
        />
      ) : selectedChannelId ? (
        <ChannelMessageList
          channelId={selectedChannelId}
          messages={roomMessages}
          isLoading={showMessageSkeleton}
          currentUserId={user?.id}
          lastReadMessageId={selectedChannel?.lastReadMessageId}
          shouldAutoScroll={shouldAutoScroll}
          onShouldAutoScrollChange={handleShouldAutoScrollChange}
          onMarkRead={handleMarkRead}
          onLoadOlder={handleLoadOlder}
          loadingOlder={loadingOlder}
          hasMoreBefore={hasMoreBefore}
          onReply={handleReply}
          onScrollToMessage={handleScrollToMessage}
          searchQuery={roomSearch}
          onMessagePatched={(updated) => patchMessage(updated.id, () => updated)}
          canDeleteMessage={canDeleteForMessage}
          onDeleteMessage={handleDeleteMessage}
          onToggleReaction={
            user
              ? (msg, emoji) => toggleReactionInstant(msg, emoji, user.id)
              : undefined
          }
          onVotePoll={
            user ? (msg, optionId) => votePollInstant(msg, optionId, user.id) : undefined
          }
          onRsvpEvent={
            user
              ? (msg, status) => rsvpInstant(msg, status, user.id)
              : undefined
          }
          onOpenThread={(msg) => setThreadRoot(msg)}
          onSaveEditMessage={handleSaveEditMessage}
          canEditMessage={canEditForMessage}
          canPinMessage={canPinForMessage}
          pinnedMessageIds={pinnedMessageIds}
          onPinMessage={handlePinMessage}
          onUnpinMessage={handleUnpinMessage}
          mentionNameMaps={mentionNameMaps}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Select a channel to start chatting
        </div>
      )}

      {selectedChannelId && canPost && selectedChannel && headerTab === "messages" && (
        <SlackComposer
          channelId={selectedChannelId}
          channelName={channelLabel}
          sending={false}
          replyTo={replyTo}
          composerRef={composerRef}
          onClearReply={() => setActiveReply(null)}
          onSend={handleSend}
          onQueuePending={handleQueuePending}
          onFlushPending={handleFlushPending}
          onMarkPendingFailed={markPendingFailed}
        />
      )}

      {selectedChannelId && !canPost && selectedChannel && (
        <div className="sticky bottom-0 shrink-0 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground">
          {selectedChannel.archived
            ? "This channel is archived."
            : "You have read-only access in this channel."}
        </div>
      )}
    </div>
  );

  const threadPanel =
    threadRoot && selectedChannel && selectedChannelId ? (
      <ThreadSidePanel
        channel={selectedChannel}
        channelId={selectedChannelId}
        rootMessage={threadRoot}
        currentUserId={user?.id}
        canPost={Boolean(canPost)}
        isMobile={isMobile}
        onClose={() => setThreadRoot(null)}
      />
    ) : null;

  return (
    <AppLayout title="" fillViewport>
      <ChatWorkspace
        sidebar={
          <RoomSidebar
            channels={channels}
            isLoading={channelsLoading && !channels}
            selectedChannelId={selectedChannelId}
            onSelect={selectChannel}
            onCreateClick={() => setCreateOpen(true)}
            onOpenDmClick={() => setOpenDmOpen(true)}
            canCreate={canCreate}
            isMobile={isMobile}
          />
        }
        main={threadContent}
        threadPanel={threadPanel}
        selectedChannelId={selectedChannelId}
        onClearSelection={backToList}
      />

      <CreateChannelDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => selectChannel(id)}
      />

      <ChannelSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        channel={selectedChannel ?? null}
        onArchived={() => {
          backToList();
        }}
      />

      <OpenDmDialog
        open={openDmOpen}
        onClose={() => setOpenDmOpen(false)}
        onOpened={(id) => {
          selectChannel(id);
        }}
      />
    </AppLayout>
  );
}
