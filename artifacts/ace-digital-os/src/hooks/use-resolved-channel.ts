import { useMemo } from "react";
import {
  useListChannels,
  useListDms,
  getListDmsQueryKey,
  type Channel,
} from "@workspace/api-client-react";

/** Resolve a channel by id from team channels or DMs list (sidebar uses separate DM query). */
export function useResolvedChannel(channelId: number | null): Channel | undefined {
  const { data: channels } = useListChannels();
  const { data: dms } = useListDms({
    query: { queryKey: getListDmsQueryKey(), staleTime: 30_000 },
  });

  return useMemo(() => {
    if (channelId == null) return undefined;
    const fromChannels = channels?.find((c) => c.id === channelId);
    const fromDms = dms?.find((c) => c.id === channelId);
    return fromChannels ?? fromDms;
  }, [channelId, channels, dms]);
}

export function isDmPeerUnavailable(channel: Channel | undefined): boolean {
  return Boolean(channel?.dmPeerUnavailable);
}
