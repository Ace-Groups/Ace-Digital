import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CanvasPanel, PageCanvasShell } from "@/components/canvas";
import { useListActivity } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Activity,
  FolderKanban,
  CheckSquare,
  Users,
  Building2,
  ClipboardCheck,
  DollarSign,
} from "lucide-react";
import { getInitials, formatRelativeTime, cn } from "@/lib/utils";

function entityIcon(type: string) {
  switch (type) {
    case "project":
      return FolderKanban;
    case "task":
      return CheckSquare;
    case "client":
      return Building2;
    case "approval":
      return ClipboardCheck;
    case "payroll_run":
      return DollarSign;
    case "employee":
      return Users;
    default:
      return Activity;
  }
}

function entityColor(type: string) {
  switch (type) {
    case "project":
      return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400";
    case "task":
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
    case "client":
      return "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400";
    case "approval":
      return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
    case "payroll_run":
      return "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function ActivityPage() {
  const { data: logs, isLoading } = useListActivity({ limit: 50 });

  const metrics = useMemo(() => {
    const types = new Set((logs ?? []).map((l) => l.entityType).filter(Boolean));
    return [
      {
        key: "events",
        label: "Recent events",
        value: logs?.length ?? 0,
        icon: Activity,
      },
      {
        key: "types",
        label: "Entity types",
        value: types.size,
        icon: FolderKanban,
        iconBg: "bg-sky-500/10",
        iconColor: "text-sky-600 dark:text-sky-400",
      },
    ];
  }, [logs]);

  return (
    <AppLayout title="">
      <PageCanvasShell
        eyebrow="Audit trail"
        title="Activity"
        description="A live feed of workspace changes across projects, tasks, clients, and finance."
        metrics={metrics}
      >
        <CanvasPanel title="Activity log" icon={Activity} noPadding>
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs?.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No activity recorded yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs?.map((log) => {
                const Icon = entityIcon(log.entityType ?? "");
                const iconColor = entityColor(log.entityType ?? "");
                return (
                  <div
                    key={log.id}
                    data-testid={`activity-log-${log.id}`}
                    className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-primary/15 text-xs text-primary">
                        {getInitials(log.actorName ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{log.actorName}</span>{" "}
                        <span className="text-muted-foreground">{log.action}</span>
                        {log.entityId && (
                          <span className="text-muted-foreground"> #{log.entityId}</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatRelativeTime(log.createdAt)}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        iconColor,
                      )}
                    >
                      <Icon size={14} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CanvasPanel>
      </PageCanvasShell>
    </AppLayout>
  );
}
