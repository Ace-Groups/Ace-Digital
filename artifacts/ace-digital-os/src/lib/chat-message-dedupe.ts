import type { Message } from "@workspace/api-client-react";
import { messageClientId, tempMessageIdFromClientId } from "@/lib/chat-message-ids";

type ContentKeyed = { senderId?: number; body?: string };

/** Stable key to pair an optimistic row with its persisted twin (same send). */
export function optimisticContentKey(msg: ContentKeyed): string {
  return `${msg.senderId ?? 0}:${(msg.body ?? "").trim()}`;
}

/**
 * Remove optimistic rows (negative id) that already have a persisted twin
 * (positive id, same sender + body). Unmatched optimistic rows stay (in-flight sends).
 */
function optimisticPairKey(msg: ContentKeyed): string {
  const clientId = messageClientId(msg);
  if (clientId) return `cid:${clientId}`;
  return `body:${optimisticContentKey(msg)}`;
}

export function dedupeOptimisticPairs<T extends { id: number } & ContentKeyed>(
  messages: T[],
): T[] {
  const tempsByKey = new Map<string, T[]>();
  for (const m of messages) {
    if (m.id >= 0) continue;
    const key = optimisticPairKey(m);
    const bucket = tempsByKey.get(key) ?? [];
    bucket.push(m);
    tempsByKey.set(key, bucket);
  }

  const consumedTempIds = new Set<number>();
  const persisted: T[] = [];
  const unmatchedOptimistic: T[] = [];

  for (const m of messages) {
    if (m.id < 0) continue;
    persisted.push(m);
    const clientId = messageClientId(m);
    const key = clientId ? `cid:${clientId}` : `body:${optimisticContentKey(m)}`;
    const bucket = tempsByKey.get(key);
    if (!bucket?.length) continue;
    const temp = bucket.shift()!;
    consumedTempIds.add(temp.id);
  }

  for (const m of messages) {
    if (m.id < 0 && !consumedTempIds.has(m.id)) {
      unmatchedOptimistic.push(m);
    }
  }

  return [...persisted, ...unmatchedOptimistic].sort(
    (a, b) =>
      new Date((a as { createdAt?: string }).createdAt ?? 0).getTime() -
      new Date((b as { createdAt?: string }).createdAt ?? 0).getTime(),
  );
}

export function replaceMessageByClientIdInList(
  list: Message[],
  clientId: string,
  message: Message,
): Message[] {
  const tempId = tempMessageIdFromClientId(clientId);
  const kept = list.filter(
    (m) =>
      messageClientId(m) !== clientId &&
      m.id !== tempId &&
      m.id !== message.id,
  );
  return dedupeOptimisticPairs([...kept, message]);
}
