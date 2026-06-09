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
    const resolved = fromChannels ?? fromDms;
    // #region agent log
    fetch("http://127.0.0.1:7752/ingest/0a1917d0-6bbb-48b6-8f35-a60640186c6d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c7ba17" },
      body: JSON.stringify({
        sessionId: "c7ba17",
        location: "use-resolved-channel.ts",
        message: "channel resolved",
        data: {
          channelId,
          source: fromChannels ? "channels" : fromDms ? "dms" : "none",
          type: resolved?.type,
          dmPeerUnavailable: resolved?.dmPeerUnavailable,
        },
        hypothesisId: "H2",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return resolved;
  }, [channelId, channels, dms]);
}

export function isDmPeerUnavailable(channel: Channel | undefined): boolean {
  return Boolean(channel?.dmPeerUnavailable);
}
