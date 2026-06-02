import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListChannels,
  useGetChannelMessages,
  useSendMessage,
  getGetChannelMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/UserAvatar";
import { Send } from "lucide-react";
import { formatRelativeTime, cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePermissions } from "@/hooks/use-permissions";
import { canManageChannel, canPostInChannel } from "@workspace/rbac";
import { useToast } from "@/hooks/use-toast";
import { ChannelList } from "@/components/channels/ChannelList";
import { CreateChannelDialog } from "@/components/channels/CreateChannelDialog";
import { ChannelSettingsSheet } from "@/components/channels/ChannelSettingsSheet";
import { ChannelThreadHeader } from "@/components/channels/ChannelThreadHeader";

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
  const [message, setMessage] = useState("");
  const sendMessage = useSendMessage();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        refetchInterval: 5000,
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!message.trim() || !selectedChannelId || !canPost) return;
    const body = message.trim();
    setMessage("");
    try {
      await sendMessage.mutateAsync({ id: selectedChannelId, data: { body } });
      queryClient.invalidateQueries({
        queryKey: getGetChannelMessagesQueryKey(selectedChannelId),
      });
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
      setMessage(body);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
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

  const threadView = (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col bg-card",
        isMobile && mobileThreadOpen && "fixed inset-0 z-50 min-h-[100dvh]",
      )}
    >
      {selectedChannel && (
        <ChannelThreadHeader
          channel={selectedChannel}
          isMobile={isMobile}
          onBack={backToList}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {!selectedChannelId ? (
          <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
            Select a channel to start chatting
          </div>
        ) : messagesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-12 w-64 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : messages?.length === 0 ? (
          <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
            No messages yet. Be the first to say hello!
          </div>
        ) : (
          messages?.map((msg, idx) => {
            const isMe = msg.senderId === user?.id;
            const showAvatar =
              idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
            return (
              <div
                key={msg.id}
                data-testid={`message-${msg.id}`}
                className={cn("flex gap-3", isMe && "flex-row-reverse")}
              >
                {showAvatar ? (
                  <UserAvatar
                    avatarUrl={msg.senderAvatar}
                    fullName={msg.senderName}
                    className="h-8 w-8 shrink-0"
                    fallbackClassName={cn(
                      "text-xs",
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                    iconSize={14}
                  />
                ) : (
                  <div className="w-8 shrink-0" />
                )}
                <div
                  className={cn(
                    "max-w-[85%] sm:max-w-md lg:max-w-lg",
                    isMe && "flex flex-col items-end",
                  )}
                >
                  {showAvatar && (
                    <div
                      className={cn(
                        "mb-1 flex items-center gap-2",
                        isMe && "flex-row-reverse",
                      )}
                    >
                      <p className="text-xs font-medium text-foreground">
                        {msg.senderName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(msg.createdAt)}
                      </p>
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm",
                      isMe
                        ? "rounded-tr-sm bg-primary text-primary-foreground"
                        : "rounded-tl-sm bg-muted text-foreground",
                    )}
                  >
                    {msg.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {selectedChannelId && canPost && (
        <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-2">
            <input
              data-testid="input-message"
              type="text"
              placeholder={`Message #${selectedChannel?.name ?? "channel"}...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-sm"
            />
            <button
              type="button"
              data-testid="btn-send-message"
              onClick={() => void handleSend()}
              disabled={!message.trim() || sendMessage.isPending}
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {selectedChannelId && !canPost && selectedChannel && (
        <div className="shrink-0 border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
          {selectedChannel.archived
            ? "This channel is archived."
            : "You have read-only access in this channel."}
        </div>
      )}
    </div>
  );

  return (
    <AppLayout title="Channels">
      <div
        className={cn(
          "flex overflow-hidden rounded-xl border border-border",
          isMobile ? "min-h-[calc(100dvh-12rem)] flex-col" : "min-h-[calc(100dvh-8rem)]",
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
            {showThread && threadView}
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
            {threadView}
          </>
        )}
      </div>

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
