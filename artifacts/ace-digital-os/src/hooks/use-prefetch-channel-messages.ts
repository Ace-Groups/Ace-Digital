import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetChannelMessagesQueryOptions } from "@workspace/api-client-react";
import { CHANNEL_MESSAGE_PARAMS } from "@/hooks/use-room-message-list";

/** Warm message caches for sidebar channels so thread opens instantly. */
export function usePrefetchChannelMessages(
  channelIds: number[] | undefined,
  priorityChannelId: number | null,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!channelIds?.length) return;
    const ordered = [
      ...(priorityChannelId ? [priorityChannelId] : []),
      ...channelIds.filter((id) => id !== priorityChannelId),
    ].slice(0, 16);

    for (const id of ordered) {
      void queryClient.prefetchQuery(
        getGetChannelMessagesQueryOptions(id, CHANNEL_MESSAGE_PARAMS),
      );
    }
  }, [channelIds, priorityChannelId, queryClient]);
}
