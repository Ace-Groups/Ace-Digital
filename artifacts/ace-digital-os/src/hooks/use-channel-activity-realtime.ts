import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListChannelsQueryKey,
  type Channel,
} from "@workspace/api-client-react";
import { subscribeChannelActivity } from "@/lib/firebase-client";
import { isFirebaseChatEnabled } from "@/lib/firebase-config";

export function useChannelActivityRealtime(
  channelId: number | null,
  enabled: boolean,
): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !channelId || !isFirebaseChatEnabled()) return;

    return subscribeChannelActivity(
      channelId,
      (activity) => {
        queryClient.setQueryData<Channel[]>(getListChannelsQueryKey(), (old) =>
          (old ?? []).map((channel) =>
            channel.id === channelId
              ? {
                  ...channel,
                  lastPostAt: activity.lastPostAt,
                  ...(activity.messageCount != null
                    ? { messageCount: activity.messageCount }
                    : {}),
                }
              : channel,
          ),
        );
      },
      (err) => {
        if (import.meta.env.DEV) {
          console.warn("[channel-activity-realtime]", err);
        }
      },
    );
  }, [channelId, enabled, queryClient]);
}
