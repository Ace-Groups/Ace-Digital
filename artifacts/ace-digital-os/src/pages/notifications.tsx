import { Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { CanvasPanel, PageCanvasShell } from "@/components/canvas";
import { useAuth } from "@/contexts/AuthContext";
import { resolveSafeHref } from "@/lib/safe-nav";
import {
  getListNotificationsQueryKey,
  useListApprovals,
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type Notification,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck } from "lucide-react";
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
  const { data: approvals, isLoading: approvalsLoading } = useListApprovals({ status: "PENDING" });
  const waiting = (approvals ?? []).filter((item) => item.status === "PENDING").slice(0, 6);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

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
        title="Inbox"
        description={
          waiting.length > 0
            ? `${waiting.length} waiting for a decision.`
            : unreadCount > 0
              ? `${unreadCount} update${unreadCount === 1 ? "" : "s"} you have not opened.`
              : "Nothing needs you right now."
        }
        actions={
          unreadCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 gap-2"
              onClick={() => void handleMarkAll()}
            >
              <CheckCheck size={16} />
              Mark all read
            </Button>
          ) : undefined
        }
      >
        <section className="mb-6" aria-labelledby="needs-you">
          <h2 id="needs-you" className="mb-2 text-base font-semibold">Needs a decision</h2>
          {approvalsLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : waiting.length === 0 ? (
            <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
              No approvals are waiting. When someone applies for leave or sends an expense, it shows up here.
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {waiting.map((item) => (
                <li key={item.id}>
                  <Link href="/approvals" className="flex min-h-11 items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.type === "LEAVE" ? "Leave" : item.type.replaceAll("_", " ").toLowerCase()}
                        {item.requesterName ? ` · ${item.requesterName}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-medium text-primary">Review</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <CanvasPanel title="Updates" icon={Bell} noPadding>
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : !notifications?.length ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <Bell size={40} className="opacity-30" />
              <p>No updates yet. Approvals and reviews will land here when they happen.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void handleTap(n.id, n.link, n.read)}
                    className={cn(
                      "min-h-11 w-full px-5 py-4 text-left transition-colors hover:bg-muted/50",
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
