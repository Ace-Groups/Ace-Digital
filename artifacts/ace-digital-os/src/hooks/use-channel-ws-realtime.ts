import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetChannelMessagesQueryKey,
  getListChannelsQueryKey,
  type Message,
  type Channel,
} from "@workspace/api-client-react";
import { CHANNEL_MESSAGE_PARAMS } from "@/hooks/use-room-message-list";
import { useRealtime } from "@/contexts/RealtimeContext";
import type { PatchMessageFn } from "@/lib/optimistic";

type Options = {
  channelId: number | null;
  enabled: boolean;
  applyRealtime?: (messages: Message[]) => void;
  appendMessage?: (msg: Message) => void;
  patchMessage?: PatchMessageFn;
};

function upsertMessage(list: Message[], msg: Message): Message[] {
  const idx = list.findIndex((m) => m.id === msg.id);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = msg;
    return next;
  }
  return [...list, msg];
}

export function useChannelWsRealtime({
  channelId,
  enabled,
  applyRealtime,
  appendMessage,
  patchMessage,
}: Options): { wsActive: boolean } {
  const { wsLive, subscribe } = useRealtime();
  const queryClient = useQueryClient();
  const active = enabled && !!channelId && wsLive;

  useEffect(() => {
    if (!active || !channelId) return;

    return subscribe((event) => {
      const key = getGetChannelMessagesQueryKey(channelId, CHANNEL_MESSAGE_PARAMS);

      if (event.type === "message:new" && event.message.channelId === channelId) {
        const msg = event.message as Message;
        queryClient.setQueryData<Message[]>(key, (old) => upsertMessage(old ?? [], msg));
        appendMessage?.(msg);
        return;
      }

      if (
        event.type === "message:updated" &&
        event.channelId === channelId
      ) {
        const msg = event.message as Message;
        queryClient.setQueryData<Message[]>(key, (old) =>
          (old ?? []).map((m) => (m.id === msg.id ? msg : m)),
        );
        patchMessage?.(msg.id, () => msg);
        return;
      }

      if (
        event.type === "message:deleted" &&
        event.channelId === channelId
      ) {
        queryClient.setQueryData<Message[]>(key, (old) =>
          (old ?? []).map((m) =>
            m.id === event.messageId
              ? { ...m, deleted: true, body: "", attachments: undefined, metadata: undefined }
              : m,
          ),
        );
        patchMessage?.(event.messageId, (m) => ({
          ...m,
          deleted: true,
          body: "",
          attachments: undefined,
          metadata: undefined,
        }));
        return;
      }

      if (event.type === "channel:activity") {
        const { activity } = event;
        queryClient.setQueryData<Channel[]>(getListChannelsQueryKey(), (old) =>
          (old ?? []).map((c) =>
            c.id === activity.channelId
              ? {
                  ...c,
                  lastPostAt: activity.lastPostAt,
                  lastMessagePreview: activity.lastMessagePreview,
                  ...(activity.messageCount != null
                    ? { messageCount: activity.messageCount }
                    : {}),
                }
              : c,
          ),
        );
      }
    });
  }, [
    active,
    channelId,
    subscribe,
    queryClient,
    appendMessage,
    patchMessage,
  ]);

  return { wsActive: active };
}
