import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetChannelMessagesQueryKey,
  getListChannelsQueryKey,
  type Channel,
  type Message,
} from "@workspace/api-client-react";
import { useEnsureChannelJoined, useSocket } from "@/contexts/SocketContext";
import { CHANNEL_MESSAGE_PARAMS } from "@/hooks/use-room-message-list";
import { messagePreviewText } from "@/lib/chat-reply";
import { messageClientId, tempMessageIdFromClientId } from "@/lib/chat-message-ids";

type WsMessage = Message & { clientId?: string };

function messageKey(channelId: number) {
  return getGetChannelMessagesQueryKey(channelId, CHANNEL_MESSAGE_PARAMS);
}

function hasMessage(list: Message[], incoming: WsMessage): boolean {
  if (list.some((m) => m.id === incoming.id)) return true;
  if (incoming.clientId) {
    const tempId = tempMessageIdFromClientId(incoming.clientId);
    return list.some(
      (m) => messageClientId(m) === incoming.clientId || m.id === tempId,
    );
  }
  return false;
}

function upsertMessage(list: Message[], incoming: WsMessage): Message[] {
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

function replacePersistedMessage(
  list: Message[],
  clientId: string,
  message: Message,
): Message[] {
  const tempId = tempMessageIdFromClientId(clientId);
  const kept = list.filter(
    (m) => messageClientId(m) !== clientId && m.id !== tempId && m.id !== message.id,
  );
  return [...kept, message];
}

export type ChannelMessagesRealtimeHandlers = {
  onUpsert?: (msg: Message) => void;
  onPersisted?: (clientId: string, msg: Message) => void;
};

export function useChannelMessagesRealtime(
  channelId: number | null,
  enabled: boolean,
  handlers?: ChannelMessagesRealtimeHandlers,
) {
  const queryClient = useQueryClient();
  const { socket, connected } = useSocket();
  const ensureJoined = useEnsureChannelJoined();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled || !channelId || !socket) return;

    const join = () => {
      void ensureJoined(channelId).catch((err) => {
        if (import.meta.env.DEV) {
          console.warn("[chat-realtime] join_channel", err);
        }
      });
    };

    if (connected) join();
    socket.on("connect", join);

    const onNew = (incoming: WsMessage) => {
      if (incoming.channelId !== channelId) return;
      const key = messageKey(channelId);
      const prev = queryClient.getQueryData<Message[]>(key) ?? [];
      if (hasMessage(prev, incoming)) return;
      const next = upsertMessage(prev, incoming);
      queryClient.setQueryData<Message[]>(key, next);

      const latest = [...next].reverse().find((message) => !message.deleted);
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
      handlersRef.current?.onUpsert?.(incoming as Message);
    };

    const onPersisted = ({
      clientId,
      message,
    }: {
      clientId: string;
      message: Message;
    }) => {
      if (message.channelId !== channelId) return;
      const key = messageKey(channelId);
      queryClient.setQueryData<Message[]>(key, (old) =>
        replacePersistedMessage(old ?? [], clientId, message),
      );
      handlersRef.current?.onPersisted?.(clientId, message);
    };

    socket.on("message:new", onNew);
    socket.on("message:persisted", onPersisted);

    return () => {
      socket.off("connect", join);
      socket.off("message:new", onNew);
      socket.off("message:persisted", onPersisted);
      socket.emit("leave_channel", channelId);
    };
  }, [channelId, enabled, socket, connected, queryClient, ensureJoined]);
}
