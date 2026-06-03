import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSendMessage,
  getGetChannelMessagesQueryKey,
  type Message,
  type MessageInput,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { CHANNEL_MESSAGE_PARAMS } from "@/hooks/use-room-message-list";

export type PendingMessage = Message & {
  clientId: string;
  status: "sending" | "failed";
};

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
    id: -Math.abs(clientId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)),
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
};

export function useSendChannelMessage(channelId: number | null, options?: SendOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const sendMessage = useSendMessage();
  const pendingRef = useRef<Map<string, PendingMessage>>(new Map());
  const onAppend = options?.onAppend;

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
      onAppend?.(serverMsg);
    },
    [channelId, queryClient, onAppend],
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

  const flushPending = useCallback(
    async (
      clientId: string,
      payload: MessageInput,
      previewAttachments?: MessageInput["attachments"],
    ) => {
      if (!channelId || !user) throw new Error("Not ready");

      try {
        const result = await sendMessage.mutateAsync({
          id: channelId,
          data: payload,
        });
        replacePending(clientId, result);
        return result;
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
    [channelId, user, replacePending, markFailed, sendMessage],
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
