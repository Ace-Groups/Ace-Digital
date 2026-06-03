import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useMarkChannelRead as useMarkChannelReadMutation,
  getListChannelsQueryKey,
  type Channel,
} from "@workspace/api-client-react";

const DEBOUNCE_MS = 300;

function mergeLastReadId(
  current: number | null | undefined,
  latest: number | null | undefined,
): number | null | undefined {
  if (latest == null) return current;
  if (current == null) return latest;
  return Math.max(current, latest);
}

export function useMarkChannelRead() {
  const { mutateAsync } = useMarkChannelReadMutation();
  const queryClient = useQueryClient();
  const inflight = useRef<Set<number>>(new Set());
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const markReadNow = useCallback(
    async (channelId: number, latestReadMessageId?: number | null) => {
      if (inflight.current.has(channelId)) return;
      inflight.current.add(channelId);
      try {
        await mutateAsync({ id: channelId });
        queryClient.setQueryData<Channel[]>(getListChannelsQueryKey(), (old) =>
          (old ?? []).map((c) => {
            if (c.id !== channelId) return c;
            return {
              ...c,
              unreadCount: 0,
              lastReadMessageId: mergeLastReadId(
                c.lastReadMessageId,
                latestReadMessageId,
              ),
            };
          }),
        );
      } catch {
        /* non-fatal */
      } finally {
        inflight.current.delete(channelId);
      }
    },
    [mutateAsync, queryClient],
  );

  const markRead = useCallback(
    (channelId: number, latestReadMessageId?: number | null) => {
      const existing = timers.current.get(channelId);
      if (existing) clearTimeout(existing);
      timers.current.set(
        channelId,
        setTimeout(() => {
          timers.current.delete(channelId);
          void markReadNow(channelId, latestReadMessageId);
        }, DEBOUNCE_MS),
      );
    },
    [markReadNow],
  );

  return { markRead };
}
