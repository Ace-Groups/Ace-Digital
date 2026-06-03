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

/** Warm critical caches right after login so navigation feels instant. */
export function usePrefetchAppData() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return;
    void queryClient.prefetchQuery(getListChannelsQueryOptions());
    void queryClient.prefetchQuery(getGetDashboardQueryOptions());
    const channelId = parseChannelIdFromSearch();
    if (channelId) {
      void queryClient.prefetchQuery(
        getGetChannelMessagesQueryOptions(channelId, { limit: 50 }),
      );
    } else {
      void listChannels().then((channels) => {
        const unread = channels
          .filter((c) => (c.unreadCount ?? 0) > 0)
          .slice(0, 3);
        for (const ch of unread) {
          void queryClient.prefetchQuery(
            getGetChannelMessagesQueryOptions(ch.id, { limit: 50 }),
          );
        }
      });
    }
  }, [isAuthenticated, queryClient]);
}
