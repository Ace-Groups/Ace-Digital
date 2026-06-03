import type { QueryClient } from "@tanstack/react-query";
import { getGetChannelMessagesQueryKey, type Message } from "@workspace/api-client-react";
import { CHANNEL_MESSAGE_PARAMS } from "@/hooks/use-room-message-list";
import { snapshotList, setList } from "@/lib/optimistic/query-cache";

export type PatchMessageFn = (id: number, updater: (m: Message) => Message) => void;

export function channelMessagesQueryKey(channelId: number) {
  return getGetChannelMessagesQueryKey(channelId, CHANNEL_MESSAGE_PARAMS);
}

export function snapshotChannelMessages(
  queryClient: QueryClient,
  channelId: number,
): Message[] | undefined {
  return snapshotList<Message>(queryClient, channelMessagesQueryKey(channelId));
}

export function applyChannelMessageUpdate(
  channelId: number,
  messageId: number,
  updater: (m: Message) => Message,
  opts: { queryClient: QueryClient; patchMessage?: PatchMessageFn },
): void {
  opts.patchMessage?.(messageId, updater);
  opts.queryClient.setQueryData<Message[]>(
    channelMessagesQueryKey(channelId),
    (prev) => prev?.map((m) => (m.id === messageId ? updater(m) : m)) ?? prev,
  );
}

export function rollbackChannelMessages(
  queryClient: QueryClient,
  channelId: number,
  snapshot: Message[] | undefined,
  patchMessage?: PatchMessageFn,
): void {
  if (snapshot === undefined) return;
  setList(queryClient, channelMessagesQueryKey(channelId), snapshot);
  if (patchMessage) {
    for (const m of snapshot) {
      const id = m.id;
      const row = snapshot.find((x) => x.id === id);
      if (row) patchMessage(id, () => row);
    }
  }
}

/** Restore RecordList rows from a full message snapshot. */
export function syncRecordListFromSnapshot(
  snapshot: Message[] | undefined,
  patchMessage?: PatchMessageFn,
): void {
  if (!snapshot || !patchMessage) return;
  for (const m of snapshot) {
    patchMessage(m.id, () => m);
  }
}

export function rollbackChannelMessagesDual(
  queryClient: QueryClient,
  channelId: number,
  snapshot: Message[] | undefined,
  patchMessage?: PatchMessageFn,
): void {
  rollbackChannelMessages(queryClient, channelId, snapshot, undefined);
  syncRecordListFromSnapshot(snapshot, patchMessage);
}
