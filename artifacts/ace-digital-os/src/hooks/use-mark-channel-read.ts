import { useCallback, useRef } from "react";
import { useMarkChannelRead as useMarkChannelReadMutation } from "@workspace/api-client-react";

export function useMarkChannelRead() {
  const { mutateAsync } = useMarkChannelReadMutation();
  const inflight = useRef<Set<number>>(new Set());

  const markRead = useCallback(
    async (channelId: number) => {
      if (inflight.current.has(channelId)) return;
      inflight.current.add(channelId);
      try {
        await mutateAsync({ id: channelId });
      } catch {
        /* non-fatal */
      } finally {
        inflight.current.delete(channelId);
      }
    },
    [mutateAsync],
  );

  return { markRead };
}
