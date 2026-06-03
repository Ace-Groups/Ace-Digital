import { useEffect } from "react";
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

export function useChannelMessagesRealtime(
  channelId: number | null,
  enabled: boolean,
  onMessages?: (messages: Message[]) => void,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !channelId || !isFirebaseChatEnabled()) return;

    let unsub = () => {};

    void (async () => {
      const authed = await ensureFirebaseAuth();
      if (!authed || !isFirebaseRealtimeEnabled()) return;

      unsub = subscribeChannelMessages(
        channelId,
        (messages) => {
          queryClient.setQueryData<Message[]>(
            getGetChannelMessagesQueryKey(channelId, { limit: 50 }),
            messages,
          );
          onMessages?.(messages);
        },
        (err) => {
          if (import.meta.env.DEV) {
            console.warn("[chat-realtime]", err);
          }
        },
      );
    })();

    return () => unsub();
  }, [channelId, enabled, queryClient, onMessages]);
}
