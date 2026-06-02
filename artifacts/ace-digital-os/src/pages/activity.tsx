import { AppLayout } from "@/components/layout/AppLayout";
import { useListActivity } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Activity, FolderKanban, CheckSquare, Users, Building2, ClipboardCheck, DollarSign } from "lucide-react";
import { getInitials, formatRelativeTime, cn } from "@/lib/utils";

function entityIcon(type: string) {
  switch (type) {
    case "project": return FolderKanban;
    case "task": return CheckSquare;
    case "client": return Building2;
    case "approval": return ClipboardCheck;
    case "payroll_run": return DollarSign;
    case "employee": return Users;
    default: return Activity;
  }
}

function entityColor(type: string) {
  switch (type) {
    case "project": return "bg-blue-50 text-blue-600";
    case "task": return "bg-emerald-50 text-emerald-600";
    case "client": return "bg-purple-50 text-purple-600";
    case "approval": return "bg-amber-50 text-amber-600";
    case "payroll_run": return "bg-green-50 text-green-600";
    default: return "bg-gray-50 text-gray-600";
  }
}

export default function ActivityPage() {
  const { data: logs, isLoading } = useListActivity({ limit: 50 });

  return (
    <AppLayout title="Activity Log">
      <div className="page-stack">
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs?.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">No activity recorded yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs?.map((log) => {
                const Icon = entityIcon(log.entityType ?? "");
                const iconColor = entityColor(log.entityType ?? "");
                return (
                  <div
                    key={log.id}
                    data-testid={`activity-log-${log.id}`}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs bg-primary/15 text-primary">
                        {getInitials(log.actorName ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-semibold">{log.actorName}</span>{" "}
                        <span className="text-gray-600">{log.action}</span>
                        {log.entityId && (
                          <span className="text-gray-500"> #{log.entityId}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRelativeTime(log.createdAt)}
                      </p>
                    </div>
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconColor)}>
                      <Icon size={14} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}
