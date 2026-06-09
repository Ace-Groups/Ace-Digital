import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetChannelMessagesQueryKey,
  getListChannelsQueryKey,
  type Channel,
  type Message,
} from "@workspace/api-client-react";
import {
  getFirebaseDb,
  ensureFirebaseAuth,
  isFirebaseChatEnabled,
  isFirebaseRealtimeEnabled,
} from "@/lib/firebase-client";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { CHANNEL_MESSAGE_PARAMS } from "@/hooks/use-room-message-list";
import { messagePreviewText } from "@/lib/chat-reply";

function messageKey(channelId: number) {
  return getGetChannelMessagesQueryKey(channelId, CHANNEL_MESSAGE_PARAMS);
}

function mapFirestoreDoc(id: string, data: Record<string, unknown>): Message {
  return {
    id: Number(id),
    channelId: Number(data.channelId),
    senderId: Number(data.senderId),
    senderName: typeof data.senderName === "string" ? data.senderName : undefined,
    senderAvatar:
      typeof data.senderAvatar === "string" || data.senderAvatar === null
        ? (data.senderAvatar as string | null)
        : undefined,
    body: typeof data.body === "string" ? data.body : "",
    attachments: Array.isArray(data.attachments)
      ? (data.attachments as Message["attachments"])
      : undefined,
    messageKind:
      data.messageKind === "poll" ||
      data.messageKind === "event" ||
      data.messageKind === "system"
        ? data.messageKind
        : "text",
    metadata:
      data.metadata && typeof data.metadata === "object"
        ? (data.metadata as Message["metadata"])
        : undefined,
    deleted: Boolean(data.deletedAt),
    parentMessageId:
      typeof data.parentMessageId === "number" ? data.parentMessageId : null,
    editedAt: typeof data.editedAt === "string" ? data.editedAt : null,
    createdAt:
      typeof data.createdAt === "string"
        ? data.createdAt
        : data.createdAt instanceof Date
          ? data.createdAt.toISOString()
          : new Date().toISOString(),
  };
}

/**
 * Real-time Firestore subscription for channel messages.
 * Uses channels/{channelId}/messages subcollection, ordered by createdAt asc, limit 100.
 * Syncs into React Query cache for the message list.
 */
export function useChannelMessagesFirestore(
  channelId: number | null,
  enabled: boolean,
) {
  const queryClient = useQueryClient();
  const unsubRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (!enabled || !channelId || !isFirebaseChatEnabled()) return;

    let cancelled = false;

    void (async () => {
      const authed = await ensureFirebaseAuth();
      if (cancelled || !authed || !isFirebaseRealtimeEnabled()) return;

      const db = getFirebaseDb();
      const messagesRef = collection(db, "channels", String(channelId), "messages");

      const q = query(
        messagesRef,
        orderBy("createdAt", "asc"),
        limit(100),
      );

      const handleSnapshot = (snap: Parameters<NonNullable<Parameters<typeof onSnapshot>[1]>>[0]) => {
        const items = snap.docs.map((d) =>
          mapFirestoreDoc(d.id, d.data() as Record<string, unknown>),
        );

        const key = messageKey(channelId);
        queryClient.setQueryData<Message[]>(key, items);

        const latest = [...items].reverse().find((m) => !m.deleted);
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
      };

      const handleError = (err: Error) => {
        if (!isFirebaseRealtimeEnabled()) return;
        console.error("[firestore-chat] onSnapshot error:", err.message);
      };

      unsubRef.current = onSnapshot(q, handleSnapshot, handleError);

      // Write channel activity doc so the activity listener picks up changes
      try {
        await setDoc(
          doc(db, "channels", String(channelId)),
          { lastPostAt: serverTimestamp() },
          { merge: true },
        );
      } catch {
        // non-critical — activity listener will catch on first message
      }
    })();

    return () => {
      cancelled = true;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [channelId, enabled, queryClient]);
}
