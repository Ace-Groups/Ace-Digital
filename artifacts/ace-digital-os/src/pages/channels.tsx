import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListChannels,
  useGetChannelMessages,
  useSendMessage,
  getGetChannelMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePermissions } from "@/hooks/use-permissions";
import { canManageChannel, canPostInChannel } from "@workspace/rbac";
import { useToast } from "@/hooks/use-toast";
import { useMobileChromeFlags } from "@/contexts/MobileChromeContext";
import { ChannelList } from "@/components/channels/ChannelList";
import { CreateChannelDialog } from "@/components/channels/CreateChannelDialog";
import { ChannelSettingsSheet } from "@/components/channels/ChannelSettingsSheet";
import { ChannelThreadHeader } from "@/components/channels/ChannelThreadHeader";
import { MessageBubble } from "@/components/channels/MessageBubble";
import { MessageComposer } from "@/components/channels/MessageComposer";
import { cn } from "@/lib/utils";
import type { MessageAttachment } from "@workspace/api-client-react";

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
  const sendMessage = useSendMessage();
  const queryClient = useQueryClient();
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

  const { data: messages, isLoading: messagesLoading } = useGetChannelMessages(
    selectedChannelId ?? 0,
    {
      query: {
        enabled: !!selectedChannelId,
        queryKey: getGetChannelMessagesQueryKey(selectedChannelId ?? 0),
        refetchInterval: selectedChannelId && (!isMobile || mobileThreadOpen) ? 12_000 : false,
        refetchIntervalInBackground: false,
      },
    },
  );

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

  async function handleSend(payload: { body: string; attachments?: MessageAttachment[] }) {
    if (!selectedChannelId || !canPost) return;
    try {
      await sendMessage.mutateAsync({
        id: selectedChannelId,
        data: payload,
      });
      setShouldAutoScroll(true);
      queryClient.invalidateQueries({
        queryKey: getGetChannelMessagesQueryKey(selectedChannelId),
      });
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    }
  }

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
    <div className="flex min-h-0 flex-1 flex-col bg-background">
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
        className="touch-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6"
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
          messages?.map((msg, idx) => {
            const isMe = msg.senderId === user?.id;
            const showMeta =
              idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isMe={isMe}
                showMeta={showMeta}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {selectedChannelId && canPost && selectedChannel && (
        <MessageComposer
          channelName={selectedChannel.name}
          sending={sendMessage.isPending}
          onSend={handleSend}
        />
      )}

      {selectedChannelId && !canPost && selectedChannel && (
        <div className="shrink-0 border-t border-border px-4 py-4 text-center text-sm text-muted-foreground">
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
          <div className="fixed inset-0 z-[100] flex flex-col bg-background pt-[env(safe-area-inset-top)]">
            {threadContent}
          </div>,
          document.body,
        )
      : null;

  return (
    <AppLayout title="Chat">
      <div
        className={cn(
          "flex overflow-hidden",
          isMobile
            ? "min-h-[calc(100dvh-5rem)] flex-col"
            : "min-h-[calc(100dvh-8rem)] rounded-xl border border-border",
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
            <div className="flex min-w-0 flex-1 flex-col bg-card">{threadContent}</div>
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
