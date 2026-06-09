import { useCallback } from "react";
import {
  useSendMessage,
  type Message,
  type MessageInput,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getFirebaseDb,
  ensureFirebaseAuth,
  isFirebaseChatEnabled,
  isFirebaseRealtimeEnabled,
} from "@/lib/firebase-client";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Firestore-native message sender. Writes directly to channels/{channelId}/messages
 * via addDoc. Falls back to REST API (useSendMessage) if Firebase auth is unavailable.
 */
export function useSendChannelMessageFirestore(channelId: number | null) {
  const { user } = useAuth();
  const sendMessage = useSendMessage();

  const send = useCallback(
    async (payload: MessageInput): Promise<Message> => {
      if (!channelId || !user) throw new Error("Not ready");

      if (isFirebaseChatEnabled()) {
        try {
          const authed = await ensureFirebaseAuth();
          if (authed && isFirebaseRealtimeEnabled()) {
            const db = getFirebaseDb();
            const messagesRef = collection(
              db,
              "channels",
              String(channelId),
              "messages",
            );

            const docRef = await addDoc(messagesRef, {
              channelId,
              senderId: user.id,
              senderName: user.fullName,
              senderAvatar: user.avatarUrl ?? null,
              body: payload.body ?? "",
              attachments: payload.attachments ?? [],
              messageKind: payload.messageKind ?? "text",
              metadata: payload.metadata ?? {},
              parentMessageId: payload.parentMessageId ?? null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            const now = new Date().toISOString();
            return {
              id: -Date.now(), // negative temp ID — real ID arrives via onSnapshot
              channelId,
              senderId: user.id,
              senderName: user.fullName,
              senderAvatar: user.avatarUrl,
              body: payload.body ?? "",
              attachments: payload.attachments,
              messageKind: payload.messageKind ?? "text",
              metadata: payload.metadata,
              parentMessageId: payload.parentMessageId ?? null,
              createdAt: now,
              editedAt: null,
              deleted: false,
            };
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn("[firestore-send] addDoc failed, falling back to REST", err);
          }
        }
      }

      // Fallback: REST API
      const result = await sendMessage.mutateAsync({
        id: channelId,
        data: payload,
      });
      return result;
    },
    [channelId, user, sendMessage],
  );

  return { send, isPending: sendMessage.isPending };
}
