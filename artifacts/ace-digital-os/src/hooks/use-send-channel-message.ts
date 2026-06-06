import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSendMessage,
  getGetChannelMessagesQueryKey,
  type Message,
  type MessageInput,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEnsureChannelJoined, useSocket, useSocketEmit } from "@/contexts/SocketContext";
import { CHANNEL_MESSAGE_PARAMS } from "@/hooks/use-room-message-list";
import { messageClientId, tempMessageIdFromClientId } from "@/lib/chat-message-ids";

export type PendingMessage = Message & {
  clientId: string;
  status: "sending" | "failed" | "delivered";
};

type SendAck =
  | { status: "success"; clientId: string; message: Message & { clientId?: string } }
  | { status: "error"; error: string; clientId?: string };

function messageQueryKey(channelId: number) {
  return getGetChannelMessagesQueryKey(channelId, CHANNEL_MESSAGE_PARAMS);
}

function makePendingMessage(
  channelId: number,
  user: { id: number; fullName: string; avatarUrl: string | null },
  payload: MessageInput,
  clientId: string,
): PendingMessage {
  return {
    id: tempMessageIdFromClientId(clientId),
    clientId,
    channelId,
    senderId: user.id,
    senderName: user.fullName,
    senderAvatar: user.avatarUrl,
    body: payload.body ?? "",
    attachments: payload.attachments,
    messageKind: payload.messageKind ?? "text",
    metadata: payload.metadata,
    createdAt: new Date().toISOString(),
    status: "sending",
  };
}

type SendOptions = {
  onAppend?: (msg: Message | PendingMessage) => void;
  onReplace?: (clientId: string, msg: Message) => void;
};

export function useSendChannelMessage(channelId: number | null, options?: SendOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const sendMessage = useSendMessage();
  const { connected } = useSocket();
  const ensureJoined = useEnsureChannelJoined();
  const socketEmit = useSocketEmit();
  const pendingRef = useRef<Map<string, PendingMessage>>(new Map());
  const onAppend = options?.onAppend;
  const onReplace = options?.onReplace;

  const appendPending = useCallback(
    (pending: PendingMessage) => {
      if (!channelId) return;
      pendingRef.current.set(pending.clientId, pending);
      queryClient.setQueryData<Message[]>(messageQueryKey(channelId), (old) => [
        ...(old ?? []),
        pending,
      ]);
      onAppend?.(pending);
    },
    [channelId, queryClient, onAppend],
  );

  const replacePending = useCallback(
    (clientId: string, serverMsg: Message) => {
      if (!channelId) return;
      pendingRef.current.delete(clientId);
      queryClient.setQueryData<Message[]>(messageQueryKey(channelId), (old) =>
        (old ?? []).map((m) =>
          "clientId" in m && (m as PendingMessage).clientId === clientId ? serverMsg : m,
        ),
      );
      onReplace?.(clientId, serverMsg);
    },
    [channelId, queryClient, onReplace],
  );

  const markFailed = useCallback(
    (clientId: string) => {
      if (!channelId) return;
      queryClient.setQueryData<Message[]>(messageQueryKey(channelId), (old) =>
        (old ?? []).map((m) =>
          "clientId" in m && (m as PendingMessage).clientId === clientId
            ? { ...(m as PendingMessage), status: "failed" as const }
            : m,
        ),
      );
    },
    [channelId, queryClient],
  );

  const queuePending = useCallback(
    (payload: MessageInput, previewAttachments?: MessageInput["attachments"]) => {
      if (!channelId || !user) throw new Error("Not ready");
      const clientId = crypto.randomUUID();
      appendPending(
        makePendingMessage(
          channelId,
          user,
          {
            ...payload,
            attachments: previewAttachments ?? payload.attachments,
          },
          clientId,
        ),
      );
      return clientId;
    },
    [channelId, user, appendPending],
  );

  const flushPendingHttp = useCallback(
    async (clientId: string, payload: MessageInput) => {
      if (!channelId || !user) throw new Error("Not ready");
      const result = await sendMessage.mutateAsync({ id: channelId, data: payload });
      replacePending(clientId, result);
      return result;
    },
    [channelId, user, replacePending, sendMessage],
  );

  const flushPending = useCallback(
    async (
      clientId: string,
      payload: MessageInput,
      _previewAttachments?: MessageInput["attachments"],
    ) => {
      if (!channelId || !user) throw new Error("Not ready");

      if (connected) {
        try {
          await ensureJoined(channelId);
          const ack = (await socketEmit("message:send", {
            channelId,
            clientId,
            body: payload.body,
            attachments: payload.attachments,
            messageKind: payload.messageKind,
            metadata: payload.metadata,
            parentMessageId: payload.parentMessageId,
          })) as SendAck;
          if (ack.status === "success" && ack.message) {
            const { clientId: _c, ...msg } = ack.message;
            replacePending(clientId, msg as Message);
            return msg as Message;
          }
          throw new Error(ack.status === "error" ? ack.error : "Send failed");
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn("[chat-send] socket failed, falling back to HTTP", err);
          }
        }
      }

      try {
        return await flushPendingHttp(clientId, payload);
      } catch (err) {
        markFailed(clientId);
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err && "error" in err
              ? String((err as { error: unknown }).error)
              : "Send failed";
        throw new Error(message);
      }
    },
    [
      channelId,
      user,
      connected,
      ensureJoined,
      socketEmit,
      replacePending,
      markFailed,
      flushPendingHttp,
    ],
  );

  const send = useCallback(
    async (payload: MessageInput, previewAttachments?: MessageInput["attachments"]) => {
      const clientId = queuePending(payload, previewAttachments);
      return flushPending(clientId, payload, previewAttachments);
    },
    [queuePending, flushPending],
  );

  return {
    send,
    queuePending,
    flushPending,
    markPendingFailed: markFailed,
    isPending: sendMessage.isPending,
  };
}
