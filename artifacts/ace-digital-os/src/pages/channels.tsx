import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListChannels, useGetChannelMessages, useSendMessage,
  getGetChannelMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Hash, Megaphone } from "lucide-react";
import { getInitials, formatRelativeTime, cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function ChannelsPage() {
  const { user } = useAuth();
  const { data: channels, isLoading: channelsLoading } = useListChannels();
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const sendMessage = useSendMessage();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const selectedChannel = channels?.find((c) => c.id === selectedChannelId);

  const { data: messages, isLoading: messagesLoading } = useGetChannelMessages(
    selectedChannelId ?? 0,
    {
      query: {
        enabled: !!selectedChannelId,
        queryKey: getGetChannelMessagesQueryKey(selectedChannelId ?? 0),
        refetchInterval: 5000,
      },
    }
  );

  useEffect(() => {
    if (channels && channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!message.trim() || !selectedChannelId) return;
    const body = message.trim();
    setMessage("");
    await sendMessage.mutateAsync({ id: selectedChannelId, data: { body } });
    queryClient.invalidateQueries({ queryKey: getGetChannelMessagesQueryKey(selectedChannelId) });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Channel list */}
      <div className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="border-b border-sidebar-border px-4 py-5">
          <h2 className="text-sm font-semibold text-sidebar-foreground">Team Channels</h2>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {channelsLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full bg-white/10" />)}
            </div>
          ) : (
            channels?.map((ch) => (
              <button
                key={ch.id}
                data-testid={`channel-item-${ch.id}`}
                onClick={() => setSelectedChannelId(ch.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                  selectedChannelId === ch.id
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                {ch.type === "ANNOUNCEMENT" ? (
                  <Megaphone size={14} className="shrink-0" />
                ) : (
                  <Hash size={14} className="shrink-0" />
                )}
                <span className="truncate">{ch.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex min-w-0 flex-1 flex-col border-l border-border bg-card">
        {/* Channel header */}
        {selectedChannel && (
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4">
            {selectedChannel.type === "ANNOUNCEMENT" ? (
              <Megaphone size={18} className="text-primary" />
            ) : (
              <Hash size={18} className="text-primary" />
            )}
            <div>
              <p className="font-semibold text-foreground">{selectedChannel.name}</p>
              {selectedChannel.teamName && (
                <p className="text-xs text-muted-foreground">{selectedChannel.teamName} team</p>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!selectedChannelId ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Select a channel to start chatting
            </div>
          ) : messagesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-12 w-64" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages?.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No messages yet. Be the first to say hello!
            </div>
          ) : (
            messages?.map((msg, idx) => {
              const isMe = msg.senderId === user?.id;
              const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
              return (
                <div
                  key={msg.id}
                  data-testid={`message-${msg.id}`}
                  className={cn("flex gap-3", isMe && "flex-row-reverse")}
                >
                  {showAvatar ? (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={cn(
                        "text-xs",
                        isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {getInitials(msg.senderName ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}
                  <div className={cn("max-w-xs lg:max-w-md", isMe && "items-end flex flex-col")}>
                    {showAvatar && (
                      <div className={cn("flex items-center gap-2 mb-1", isMe && "flex-row-reverse")}>
                        <p className="text-xs font-medium text-foreground">{msg.senderName}</p>
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(msg.createdAt)}</p>
                      </div>
                    )}
                    <div className={cn(
                      "px-4 py-2 rounded-2xl text-sm",
                      isMe
                        ? "rounded-tr-sm bg-primary text-primary-foreground"
                        : "rounded-tl-sm bg-muted text-foreground"
                    )}>
                      {msg.body}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {selectedChannelId && (
          <div className="shrink-0 border-t border-border px-6 py-4">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-2">
              <input
                data-testid="input-message"
                type="text"
                placeholder={`Message #${selectedChannel?.name ?? "channel"}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                type="button"
                data-testid="btn-send-message"
                onClick={handleSend}
                disabled={!message.trim() || sendMessage.isPending}
                className="rounded-lg bg-primary p-1.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-1">Press Enter to send</p>
          </div>
        )}
      </div>
    </div>
  );
}
