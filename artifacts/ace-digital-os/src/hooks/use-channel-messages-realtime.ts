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

function sameMessageIds(a: Message[], b: Message[] | undefined): boolean {
  if (!b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.id !== b[i]!.id) return false;
  }
  return true;
}

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
          if (!sameMessageIds(messages, prev)) {
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
