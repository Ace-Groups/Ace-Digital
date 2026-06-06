import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetChannelMessagesQueryKey,
  getListChannelsQueryKey,
  type Channel,
  type Message,
} from "@workspace/api-client-react";
import { useSocket } from "@/contexts/SocketContext";
import { CHANNEL_MESSAGE_PARAMS } from "@/hooks/use-room-message-list";
import { messagePreviewText } from "@/lib/chat-reply";

type WsMessage = Message & { clientId?: string };

function messageKey(channelId: number) {
  return getGetChannelMessagesQueryKey(channelId, CHANNEL_MESSAGE_PARAMS);
}

function hasMessage(list: Message[], incoming: WsMessage): boolean {
  if (list.some((m) => m.id === incoming.id)) return true;
  if (incoming.clientId) {
    return list.some(
      (m) => "clientId" in m && (m as WsMessage).clientId === incoming.clientId,
    );
  }
  return false;
}

function upsertMessage(list: Message[], incoming: WsMessage): Message[] {
  if (incoming.clientId) {
    const idx = list.findIndex(
      (m) => "clientId" in m && (m as WsMessage).clientId === incoming.clientId,
    );
    if (idx >= 0) {
      const next = [...list];
      next[idx] = { ...incoming, clientId: undefined } as Message;
      return next;
    }
  }
  if (list.some((m) => m.id === incoming.id)) {
    return list.map((m) => (m.id === incoming.id ? ({ ...incoming, clientId: undefined } as Message) : m));
  }
  return [...list, incoming as Message];
}

export function useChannelMessagesRealtime(
  channelId: number | null,
  enabled: boolean,
  onMessages?: (messages: Message[]) => void,
) {
  const queryClient = useQueryClient();
  const { socket, connected } = useSocket();
  const onMessagesRef = useRef(onMessages);
  onMessagesRef.current = onMessages;

  useEffect(() => {
    if (!enabled || !channelId || !socket) return;

    const join = () => {
      socket.emit("join_channel", channelId, (res: { ok?: boolean; error?: string }) => {
        if (res?.error && import.meta.env.DEV) {
          console.warn("[chat-realtime] join_channel", res.error);
        }
      });
    };

    if (connected) join();
    socket.on("connect", join);

    const onNew = (incoming: WsMessage) => {
      if (incoming.channelId !== channelId) return;
      const key = messageKey(channelId);
      const prev = queryClient.getQueryData<Message[]>(key) ?? [];
      if (hasMessage(prev, incoming) && !incoming.clientId) return;
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
      onMessagesRef.current?.(next);
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
      queryClient.setQueryData<Message[]>(key, (old) => {
        const list = old ?? [];
        const idx = list.findIndex(
          (m) =>
            ("clientId" in m && (m as WsMessage).clientId === clientId) || m.id === message.id,
        );
        if (idx >= 0) {
          const next = [...list];
          next[idx] = message;
          return next;
        }
        if (list.some((m) => m.id === message.id)) return list;
        return [...list, message];
      });
    };

    socket.on("message:new", onNew);
    socket.on("message:persisted", onPersisted);

    return () => {
      socket.off("connect", join);
      socket.off("message:new", onNew);
      socket.off("message:persisted", onPersisted);
      socket.emit("leave_channel", channelId);
    };
  }, [channelId, enabled, socket, connected, queryClient]);
}
