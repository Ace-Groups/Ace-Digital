import { useMemo } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { CanvasPanel, PageCanvasShell } from "@/components/canvas";
import { useAuth } from "@/contexts/AuthContext";
import { resolveSafeHref } from "@/lib/safe-nav";
import {
  getListNotificationsQueryKey,
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type Notification,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { patchList, setList, snapshotList } from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const notificationsKey = getListNotificationsQueryKey();

  const { data: notifications, isLoading } = useListNotifications({
    query: { queryKey: notificationsKey },
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;
  const readCount = (notifications?.length ?? 0) - unreadCount;

  const metrics = useMemo(
    () => [
      {
        key: "unread",
        label: "Unread",
        value: unreadCount,
        icon: Bell,
        iconBg: "bg-red-500/10",
        iconColor: "text-red-600 dark:text-red-400",
      },
      {
        key: "read",
        label: "Read",
        value: readCount,
        icon: Inbox,
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-600 dark:text-emerald-400",
      },
    ],
    [unreadCount, readCount],
  );

  async function handleMarkAll() {
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Notification>(queryClient, notificationsKey);
          patchList<Notification>(queryClient, notificationsKey, (list) =>
            list.map((n) => ({ ...n, read: true })),
          );
          return prev;
        },
        rollback: (prev) => setList(queryClient, notificationsKey, prev),
        commit: () => markAllRead.mutateAsync(),
      });
      toast({ title: "All notifications marked read" });
    } catch {
      toast({ title: "Could not update notifications", variant: "destructive" });
    }
  }

  async function handleTap(id: number, link: string | null | undefined, read: boolean) {
    if (!read) {
      patchList<Notification>(queryClient, notificationsKey, (list) =>
        list.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      void markRead.mutateAsync({ id }).catch(() => {
        void queryClient.invalidateQueries({ queryKey: notificationsKey });
      });
    }
    if (link && user?.role) {
      setLocation(resolveSafeHref(user.role, link));
    }
  }

  return (
    <AppLayout title="">
      <PageCanvasShell
        eyebrow="Inbox"
        title="Notifications"
        description={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"} waiting for you.`
            : "You're all caught up — no unread notifications."
        }
        metrics={metrics}
        actions={
          unreadCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => void handleMarkAll()}
            >
              <CheckCheck size={16} />
              Mark all read
            </Button>
          ) : undefined
        }
      >
        <CanvasPanel title="All notifications" icon={Bell} noPadding>
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : !notifications?.length ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <Bell size={40} className="opacity-30" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void handleTap(n.id, n.link, n.read)}
                    className={cn(
                      "w-full px-5 py-4 text-left transition-colors hover:bg-muted/50",
                      n.read ? "bg-transparent" : "bg-primary/5",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm font-medium", !n.read && "text-foreground")}>
                        {n.title}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>
                    {n.body ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.body}</p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CanvasPanel>
      </PageCanvasShell>
    </AppLayout>
  );
}
