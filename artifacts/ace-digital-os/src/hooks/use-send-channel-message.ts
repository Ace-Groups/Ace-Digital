import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSendMessage,
  getGetChannelMessagesQueryKey,
  type Message,
  type MessageInput,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

export type PendingMessage = Message & {
  clientId: string;
  status: "sending" | "failed";
};

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

export function useSendChannelMessage(channelId: number | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const sendMessage = useSendMessage();
  const pendingRef = useRef<Map<string, PendingMessage>>(new Map());

  const appendPending = useCallback(
    (pending: PendingMessage) => {
      if (!channelId) return;
      pendingRef.current.set(pending.clientId, pending);
      queryClient.setQueryData<Message[]>(
        getGetChannelMessagesQueryKey(channelId),
        (old) => [...(old ?? []), pending],
      );
    },
    [channelId, queryClient],
  );

  const replacePending = useCallback(
    (clientId: string, serverMsg: Message) => {
      if (!channelId) return;
      pendingRef.current.delete(clientId);
      queryClient.setQueryData<Message[]>(
        getGetChannelMessagesQueryKey(channelId),
        (old) =>
          (old ?? []).map((m) =>
            "clientId" in m && (m as PendingMessage).clientId === clientId ? serverMsg : m,
          ),
      );
    },
    [channelId, queryClient],
  );

  const markFailed = useCallback(
    (clientId: string) => {
      if (!channelId) return;
      queryClient.setQueryData<Message[]>(
        getGetChannelMessagesQueryKey(channelId),
        (old) =>
          (old ?? []).map((m) =>
            "clientId" in m && (m as PendingMessage).clientId === clientId
              ? { ...(m as PendingMessage), status: "failed" as const }
              : m,
          ),
      );
    },
    [channelId, queryClient],
  );

  const send = useCallback(
    async (payload: MessageInput, previewAttachments?: MessageInput["attachments"]) => {
      if (!channelId || !user) throw new Error("Not ready");

      const clientId = crypto.randomUUID();
      const pending = makePendingMessage(
        channelId,
        user,
        {
          ...payload,
          attachments: previewAttachments ?? payload.attachments,
        },
        clientId,
      );
      appendPending(pending);

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
    [channelId, user, appendPending, replacePending, markFailed, sendMessage],
  );

  return {
    send,
    isPending: sendMessage.isPending,
  };
}
