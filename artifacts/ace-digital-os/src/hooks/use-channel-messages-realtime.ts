import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetChannelMessagesQueryKey,
  getListChannelsQueryKey,
  type Channel,
  type Message,
} from "@workspace/api-client-react";
import {
  subscribeChannelMessages,
} from "@/lib/firebase-client";
import { isFirebaseChatEnabled } from "@/lib/firebase-config";
import { CHANNEL_MESSAGE_PARAMS } from "@/hooks/use-room-message-list";
import { sameOrderedMessageIds } from "@/lib/message-list-equality";
import { messagePreviewText } from "@/lib/chat-reply";

export function useChannelMessagesRealtime(
  channelId: number | null,
  enabled: boolean,
  onMessages?: (messages: Message[]) => void,
) {
  const queryClient = useQueryClient();
  const onMessagesRef = useRef(onMessages);
  onMessagesRef.current = onMessages;

  useEffect(() => {
    if (!enabled || !channelId || !isFirebaseChatEnabled()) return;

    const unsub = subscribeChannelMessages(
      channelId,
      (messages, changes) => {
        const key = getGetChannelMessagesQueryKey(channelId, CHANNEL_MESSAGE_PARAMS);
        const prev = queryClient.getQueryData<Message[]>(key);
        const hasModifiedMessages = changes.some((change) => change.type !== "added");
        if (!prev || hasModifiedMessages || !sameOrderedMessageIds(messages, prev)) {
          queryClient.setQueryData<Message[]>(key, messages);
        }
        const latest = [...messages].reverse().find((message) => !message.deleted);
        queryClient.setQueryData<Channel[]>(getListChannelsQueryKey(), (old) =>
          (old ?? []).map((channel) =>
            channel.id === channelId
              ? {
                  ...channel,
                  lastPostAt: latest?.createdAt ?? null,
                  lastMessagePreview: latest ? messagePreviewText(latest) : null,
                }
              : channel,
          ),
        );
        onMessagesRef.current?.(messages);
      },
      (err) => {
        if (import.meta.env.DEV) {
          console.warn("[chat-realtime]", err);
        }
      },
    );

    return unsub;
  }, [channelId, enabled, queryClient]);
}
