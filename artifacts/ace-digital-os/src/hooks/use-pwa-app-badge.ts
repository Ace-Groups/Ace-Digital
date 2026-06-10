import { useEffect } from "react";
import {
  getListNotificationsQueryKey,
  useListNotifications,
  useListChannels,
} from "@workspace/api-client-react";
import { useStandaloneMode } from "@/hooks/use-standalone-mode";

type NavigatorWithBadge = Navigator & {
  setAppBadge?: (count: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/** Shows combined unread count on the installed app icon (Badging API). */
export function usePwaAppBadge() {
  const isStandalone = useStandaloneMode();
  const { data: notifications } = useListNotifications({
    query: {
      queryKey: getListNotificationsQueryKey(),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  });
  const { data: channels } = useListChannels({
    query: { staleTime: 60_000, refetchOnWindowFocus: false },
  });

  useEffect(() => {
    const nav = navigator as NavigatorWithBadge;
    if (!isStandalone || typeof nav.setAppBadge !== "function") return;

    const notifUnread = notifications?.filter((n) => !n.read).length ?? 0;
    const chatUnread = (channels ?? []).reduce((n, c) => n + (c.unreadCount ?? 0), 0);
    const total = notifUnread + chatUnread;

    if (total > 0) {
      void nav.setAppBadge(Math.min(total, 99));
    } else if (typeof nav.clearAppBadge === "function") {
      void nav.clearAppBadge();
    }
  }, [isStandalone, notifications, channels]);
}
