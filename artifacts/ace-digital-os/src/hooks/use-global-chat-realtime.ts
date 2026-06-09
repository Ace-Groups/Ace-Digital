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
import { globalUpsertChannelMessage } from "@/hooks/use-room-message-list";
import { messagePreviewText } from "@/lib/chat-reply";
import { messageClientId, tempMessageIdFromClientId } from "@/lib/chat-message-ids";

type WsMessage = Message & { clientId?: string };

function messageKey(channelId: number) {
  return getGetChannelMessagesQueryKey(channelId, CHANNEL_MESSAGE_PARAMS);
}

function upsertInCache(list: Message[], incoming: WsMessage): Message[] {
  if (incoming.clientId) {
    const tempId = tempMessageIdFromClientId(incoming.clientId);
    const kept = list.filter(
      (m) =>
        messageClientId(m) !== incoming.clientId &&
        m.id !== tempId &&
        m.id !== incoming.id,
    );
    return [...kept, incoming as Message];
  }
  if (list.some((m) => m.id === incoming.id)) {
    return list.map((m) => (m.id === incoming.id ? (incoming as Message) : m));
  }
  return [...list, incoming as Message];
}

function replacePersisted(list: Message[], clientId: string, message: Message): Message[] {
  const tempId = tempMessageIdFromClientId(clientId);
  const kept = list.filter(
    (m) => messageClientId(m) !== clientId && m.id !== tempId && m.id !== message.id,
  );
  return [...kept, message];
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
      globalUpsertChannelMessage(channelId, message);
    };

    socket.on("message:new", onNew);
    socket.on("message:persisted", onPersisted);

    return () => {
      socket.off("message:new", onNew);
      socket.off("message:persisted", onPersisted);
    };
  }, [enabled, socket, connected, queryClient]);
}
