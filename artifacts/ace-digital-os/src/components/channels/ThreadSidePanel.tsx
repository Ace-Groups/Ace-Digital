import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  useGetChannelMessages,
  getGetChannelMessagesQueryKey,
  type Message,
  type MessageInput,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { MessageRow } from "@/components/channels/MessageRow";
import { MessageBody } from "@/components/channels/MessageBody";
import { SlackComposer } from "@/components/channels/SlackComposer";
import { useSendChannelMessage } from "@/hooks/use-send-channel-message";
import { cn } from "@/lib/utils";
import type { Channel } from "@workspace/api-client-react";

interface ThreadSidePanelProps {
  channel: Channel;
  channelId: number;
  rootMessage: Message;
  currentUserId?: number;
  canPost: boolean;
  isMobile?: boolean;
  onClose: () => void;
  onMessagePatched?: (message: Message) => void;
}

export function ThreadSidePanel({
  channel,
  channelId,
  rootMessage,
  currentUserId,
  canPost,
  isMobile,
  onClose,
}: ThreadSidePanelProps) {
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const [replies, setReplies] = useState<Message[]>([]);

  const { data } = useGetChannelMessages(
    channelId,
    { limit: 50, threadRootId: rootMessage.id },
    {
      query: {
        enabled: channelId > 0 && rootMessage.id > 0,
        queryKey: getGetChannelMessagesQueryKey(channelId, {
          limit: 50,
          threadRootId: rootMessage.id,
        }),
      },
    },
  );

  useEffect(() => {
    if (data) setReplies(data);
  }, [data]);

  const { queuePending, flushPending, markPendingFailed } = useSendChannelMessage(channelId, {
    onAppend: (msg) => setReplies((prev) => [...prev, msg as Message]),
  });

  const handleSend = useCallback(
    async (payload: MessageInput) => {
      const wrapped: MessageInput = {
        ...payload,
        parentMessageId: rootMessage.id,
      };
      const clientId = queuePending(wrapped);
      await flushPending(clientId, wrapped);
    },
    [queuePending, flushPending, rootMessage.id],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const panel = (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-background",
        isMobile ? "w-full" : "w-[400px] shrink-0 border-l border-border",
      )}
      role="dialog"
      aria-label="Thread"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Thread</h2>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close thread">
          <X size={18} />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <MessageRow msg={rootMessage} showHeader>
          <MessageBody body={rootMessage.body} />
        </MessageRow>
        <p className="my-3 text-xs font-medium text-muted-foreground">
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </p>
        {replies.map((r) => (
          <MessageRow
            key={r.id}
            msg={r}
            showHeader={r.senderId !== rootMessage.senderId}
          />
        ))}
      </div>
      {canPost && (
        <SlackComposer
          channelId={channelId}
          channelName={channel.type === "DM" ? (channel.dmPeerName ?? channel.name) : channel.name}
          composerRef={composerRef}
          onSend={handleSend}
          onQueuePending={(p: MessageInput) =>
            queuePending({ ...p, parentMessageId: rootMessage.id })
          }
          onFlushPending={async (clientId, payload, preview) => {
            await flushPending(clientId, payload, preview);
          }}
          onMarkPendingFailed={markPendingFailed}
        />
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[110] flex flex-col bg-background pt-[env(safe-area-inset-top)]">
        {panel}
      </div>
    );
  }
  return panel;
}
