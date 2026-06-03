import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetChannelMessagesQueryKey,
  type Message,
} from "@workspace/api-client-react";
import {
  subscribeChannelMessages,
  ensureFirebaseAuth,
  isFirebaseRealtimeEnabled,
} from "@/lib/firebase-client";
import { isFirebaseChatEnabled } from "@/lib/firebase-config";
import { CHANNEL_MESSAGE_PARAMS } from "@/hooks/use-room-message-list";
import { sameOrderedMessageIds } from "@/lib/message-list-equality";

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

    let unsub = () => {};

    void (async () => {
      const authed = await ensureFirebaseAuth();
      if (!authed || !isFirebaseRealtimeEnabled()) return;

      unsub = subscribeChannelMessages(
        channelId,
        (messages) => {
          const key = getGetChannelMessagesQueryKey(channelId, CHANNEL_MESSAGE_PARAMS);
          const prev = queryClient.getQueryData<Message[]>(key);
          if (!prev || !sameOrderedMessageIds(messages, prev)) {
            queryClient.setQueryData<Message[]>(key, messages);
          }
          onMessagesRef.current?.(messages);
        },
        (err) => {
          if (import.meta.env.DEV) {
            console.warn("[chat-realtime]", err);
          }
        },
      );
    })();

    return () => unsub();
  }, [channelId, enabled, queryClient]);
}
