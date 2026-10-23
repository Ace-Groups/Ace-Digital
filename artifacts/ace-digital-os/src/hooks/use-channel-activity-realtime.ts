import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListChannelsQueryKey,
  getListDmsQueryKey,
  type Channel,
} from "@workspace/api-client-react";
import { subscribeChannelActivity } from "@/lib/firebase-client";
import { isFirebaseChatEnabled } from "@/lib/firebase-config";

function patchChannelActivity(
  channels: Channel[] | undefined,
  channelId: number,
  activity: {
    lastPostAt: string | null;
    messageCount?: number;
    lastMessagePreview?: string | null;
  },
): Channel[] {
  return (channels ?? []).map((channel) =>
    channel.id === channelId
      ? {
          ...channel,
          lastPostAt: activity.lastPostAt ?? channel.lastPostAt,
          ...(activity.messageCount != null ? { messageCount: activity.messageCount } : {}),
          ...(activity.lastMessagePreview != null
            ? { lastMessagePreview: activity.lastMessagePreview }
            : {}),
        }
      : channel,
  );
}

export function useChannelActivityRealtime(
  channelId: number | null,
  enabled: boolean,
): void {
  useChannelsActivityRealtime(channelId ? [channelId] : [], enabled);
}

/** Firestore listeners for channel docs the user belongs to. Does not hold the API open. */
export function useChannelsActivityRealtime(channelIds: number[], enabled: boolean): void {
  const queryClient = useQueryClient();
  const idsKey = channelIds.slice().sort((a, b) => a - b).join(",");

  useEffect(() => {
    if (!enabled || !idsKey || !isFirebaseChatEnabled()) return;

    const ids = idsKey.split(",").map((id) => Number(id));
    const unsubs = ids.map((channelId) =>
      subscribeChannelActivity(
        channelId,
        (activity) => {
          const patch = (old: Channel[] | undefined) =>
            patchChannelActivity(old, channelId, activity);
          queryClient.setQueryData<Channel[]>(getListChannelsQueryKey(), patch);
          queryClient.setQueryData<Channel[]>(getListDmsQueryKey(), patch);
        },
        (err) => {
          if (import.meta.env.DEV) {
            console.warn("[channel-activity-realtime]", err);
          }
        },
      ),
    );

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [enabled, idsKey, queryClient]);
}
