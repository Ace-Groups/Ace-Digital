import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetChannelMessagesQueryKey,
  getListChannelsQueryKey,
  getListDmsQueryKey,
  type Channel,
  type Message,
} from "@workspace/api-client-react";
import { useSocket } from "@/contexts/SocketContext";
import { CHANNEL_MESSAGE_PARAMS } from "@/hooks/use-room-message-list";
import {
  globalReplaceChannelMessageByClientId,
  globalUpsertChannelMessage,
  syncChannelMessagesFromCache,
} from "@/hooks/use-room-message-list";
import { replaceMessageByClientIdInList } from "@/lib/chat-message-dedupe";
import { messagePreviewText } from "@/lib/chat-reply";
import { dedupeOptimisticPairs } from "@/lib/chat-message-dedupe";
import { messageClientId, tempMessageIdFromClientId } from "@/lib/chat-message-ids";

type WsMessage = Message & { clientId?: string };

function messageKey(channelId: number) {
  return getGetChannelMessagesQueryKey(channelId, CHANNEL_MESSAGE_PARAMS);
}

function upsertInCache(list: Message[], incoming: WsMessage): Message[] {
  let next: Message[];
  if (incoming.clientId) {
    const tempId = tempMessageIdFromClientId(incoming.clientId);
    const kept = list.filter(
      (m) =>
        messageClientId(m) !== incoming.clientId &&
        m.id !== tempId &&
        m.id !== incoming.id,
    );
    next = [...kept, incoming as Message];
  } else if (list.some((m) => m.id === incoming.id)) {
    next = list.map((m) => (m.id === incoming.id ? (incoming as Message) : m));
  } else {
    next = [...list, incoming as Message];
  }
  return dedupeOptimisticPairs(next);
}

function replacePersisted(list: Message[], clientId: string, message: Message): Message[] {
  return replaceMessageByClientIdInList(list, clientId, message);
}

function patchChannelListPreview(
  channels: Channel[] | undefined,
  channelId: number,
  latest: Message | undefined,
): Channel[] {
  return (channels ?? []).map((channel) =>
    channel.id === channelId
      ? {
          ...channel,
          lastPostAt: latest?.createdAt ?? channel.lastPostAt ?? null,
          lastMessagePreview: latest ? messagePreviewText(latest) : channel.lastMessagePreview,
        }
      : channel,
  );
}

/**
 * Global socket listener: delivers messages to any open channel thread within milliseconds,
 * even when the per-channel hook has not finished joining.
 */
export function useGlobalChatRealtime(enabled: boolean) {
  const queryClient = useQueryClient();
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!enabled || !socket || !connected) return;

    const onNew = (incoming: WsMessage) => {
      const channelId = incoming.channelId;
      if (!channelId) return;

      const key = messageKey(channelId);
      const prev = queryClient.getQueryData<Message[]>(key) ?? [];
      const next = upsertInCache(prev, incoming);
      queryClient.setQueryData<Message[]>(key, next);

      globalUpsertChannelMessage(channelId, incoming as Message);
      syncChannelMessagesFromCache(channelId, next);

      const latest = [...next].reverse().find((m) => !m.deleted);
      queryClient.setQueryData<Channel[]>(getListChannelsQueryKey(), (old) =>
        patchChannelListPreview(old, channelId, latest),
      );
      queryClient.setQueryData<Channel[]>(getListDmsQueryKey(), (old) =>
        patchChannelListPreview(old, channelId, latest),
      );
    };

    const onPersisted = ({
      clientId,
      message,
    }: {
      clientId: string;
      message: Message;
    }) => {
      const channelId = message.channelId;
      if (!channelId) return;

      const key = messageKey(channelId);
      queryClient.setQueryData<Message[]>(key, (old) =>
        replacePersisted(old ?? [], clientId, message),
      );
      globalReplaceChannelMessageByClientId(channelId, clientId, message);
    };

    socket.on("message:new", onNew);
    socket.on("message:persisted", onPersisted);

    return () => {
      socket.off("message:new", onNew);
      socket.off("message:persisted", onPersisted);
    };
  }, [enabled, socket, connected, queryClient]);
}
