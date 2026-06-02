import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  getListNotificationsQueryKey,
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notifications, isLoading } = useListNotifications({
    query: { queryKey: getListNotificationsQueryKey() },
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  async function handleMarkAll() {
    try {
      await markAllRead.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      toast({ title: "All notifications marked read" });
    } catch {
      toast({ title: "Could not update notifications", variant: "destructive" });
    }
  }

  async function handleTap(id: number, link: string | null | undefined, read: boolean) {
    if (!read) {
      try {
        await markRead.mutateAsync({ id });
        await queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      } catch {
        /* still navigate if link present */
      }
    }
    if (link) {
      setLocation(link.startsWith("/") ? link : `/${link}`);
    }
  }

  return (
    <AppLayout title="Notifications">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
        </p>
        {unreadCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-10 gap-2"
            disabled={markAllRead.isPending}
            onClick={() => void handleMarkAll()}
          >
            <CheckCheck size={16} />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !notifications?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Bell size={40} className="mb-3 text-muted-foreground/50" />
          <p className="font-medium text-foreground">No notifications yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            You will see updates here when tasks are assigned to you.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                data-testid={`notification-${n.id}`}
                onClick={() => void handleTap(n.id, n.link, n.read)}
                className={cn(
                  "flex w-full min-h-[3.5rem] flex-col gap-1 rounded-xl border px-4 py-3 text-left transition-colors active:bg-muted",
                  n.read
                    ? "border-border/60 bg-card/50 opacity-80"
                    : "border-primary/20 bg-primary/5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
                  {!n.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{n.body}</p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(n.createdAt)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
