import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getListChannelsQueryKey,
  useListChannels,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { realtimeClient, type RealtimeListener } from "@/lib/realtime-client";
import { isRealtimeConfigured } from "@/lib/realtime-config";
import type { ServerEvent } from "@workspace/realtime-protocol";

type RealtimeContextValue = {
  wsLive: boolean;
  subscribe: (listener: RealtimeListener) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [wsLive, setWsLive] = useState(false);
  const channelsQueryEnabled = !!user && isRealtimeConfigured();
  const { data: channels } = useListChannels({
    query: {
      enabled: channelsQueryEnabled,
      queryKey: getListChannelsQueryKey(),
    },
  });

  useEffect(() => {
    if (!user || !isRealtimeConfigured()) {
      realtimeClient.disconnect();
      setWsLive(false);
      return;
    }

    realtimeClient.connect();
    const interval = window.setInterval(() => realtimeClient.ping(), 25_000);

    const unsub = realtimeClient.subscribe((event) => {
      if (event.type === "authenticated") {
        setWsLive(true);
      }
      if (event.type === "error" && event.code === "unauthorized") {
        setWsLive(false);
      }
    });

    const syncAvailable = () => setWsLive(realtimeClient.available);
    syncAvailable();
    const tick = window.setInterval(syncAvailable, 2000);

    return () => {
      clearInterval(interval);
      clearInterval(tick);
      unsub();
      realtimeClient.disconnect();
      setWsLive(false);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!wsLive || !channels?.length) return;
    realtimeClient.setChannelSubscriptions(channels.map((c) => c.id));
  }, [wsLive, channels]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      wsLive,
      subscribe: (listener) => realtimeClient.subscribe(listener),
    }),
    [wsLive],
  );

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    return {
      wsLive: false,
      subscribe: () => () => {},
    };
  }
  return ctx;
}

export type { ServerEvent };
