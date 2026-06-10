import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetDashboardQueryOptions,
  getGetChannelMessagesQueryOptions,
  getListChannelsQueryOptions,
  listChannels,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { parseChannelIdFromSearch } from "@/lib/channel-url";
import { CHANNEL_MESSAGE_PARAMS } from "@/hooks/use-room-message-list";

/** Warm critical caches right after login so navigation feels instant. */
export function usePrefetchAppData() {
  const { isSessionVerified } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSessionVerified) return;
    void queryClient.prefetchQuery(getListChannelsQueryOptions()).catch(() => {});
    void queryClient.prefetchQuery(getGetDashboardQueryOptions()).catch(() => {});
    const channelId = parseChannelIdFromSearch();
    if (channelId) {
      void queryClient
        .prefetchQuery(getGetChannelMessagesQueryOptions(channelId, CHANNEL_MESSAGE_PARAMS))
        .catch(() => {});
    }
    void listChannels()
      .then((channels) => {
        const ids = new Set<number>();
        if (channelId) ids.add(channelId);
        for (const ch of channels) {
          if ((ch.unreadCount ?? 0) > 0) ids.add(ch.id);
        }
        for (const ch of channels.slice(0, 8)) ids.add(ch.id);
        for (const id of ids) {
          void queryClient
            .prefetchQuery(getGetChannelMessagesQueryOptions(id, CHANNEL_MESSAGE_PARAMS))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [isSessionVerified, queryClient]);
}
