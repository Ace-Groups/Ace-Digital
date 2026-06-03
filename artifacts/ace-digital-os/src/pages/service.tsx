import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { CreateServiceTicketSheet } from "@/components/service/CreateServiceTicketSheet";
import {
  getListServiceTicketsQueryKey,
  useListServiceTickets,
  useListClients,
} from "@workspace/api-client-react";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Ticket, AlertCircle, Clock } from "lucide-react";
import { cn, formatRelativeTime, priorityColor, statusColor } from "@/lib/utils";

const ALL_STATUS = "__all__";
const ALL_CLIENTS = "__all_clients__";

const STATUS_TABS = [
  { value: ALL_STATUS, label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "WAITING_CLIENT", label: "Waiting" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
] as const;

export default function ServiceDeskPage() {
  const { can } = usePermissions();
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS);
  const [clientFilter, setClientFilter] = useState<string>(ALL_CLIENTS);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const listParams = useMemo(
    () => ({
      status: statusFilter !== ALL_STATUS ? statusFilter : undefined,
      clientId: clientFilter !== ALL_CLIENTS ? Number(clientFilter) : undefined,
      overdueFollowUp: overdueOnly ? true : undefined,
    }),
    [statusFilter, clientFilter, overdueOnly],
  );

  const { data: tickets, isLoading } = useListServiceTickets(listParams, {
    query: { queryKey: getListServiceTicketsQueryKey(listParams) },
  });
  const { data: clients } = useListClients();

  const canWrite = can("service_tickets:write");

  return (
    <AppLayout title="Service Desk">
      <div className="page-stack">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Service Desk
            </h1>
            <p className="text-sm text-muted-foreground">
              Client tickets and follow-up timeline
            </p>
          </div>
          {canWrite && (
            <Button className="min-h-11 shrink-0" onClick={() => setCreateOpen(true)}>
              <Plus size={18} className="mr-2" />
              New ticket
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex gap-1 overflow-x-auto pb-1 touch-scroll">
            {STATUS_TABS.map((tab) => (
              <Button
                key={tab.value}
                type="button"
                size="sm"
                variant={statusFilter === tab.value ? "default" : "outline"}
                className="shrink-0 min-h-9"
                onClick={() => setStatusFilter(tab.value)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-1 flex-wrap gap-2">
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="min-h-10 w-full sm:w-[11rem]">
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CLIENTS}>All clients</SelectItem>
                {(clients ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant={overdueOnly ? "default" : "outline"}
              className={cn("min-h-10 gap-1.5", overdueOnly && "bg-destructive hover:bg-destructive/90")}
              onClick={() => setOverdueOnly((v) => !v)}
            >
              <AlertCircle size={14} />
              Overdue follow-ups
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : !tickets?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Ticket className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {overdueOnly ? "No overdue follow-ups" : "No tickets match your filters"}
              </p>
              {canWrite && (
                <Button variant="outline" className="min-h-11" onClick={() => setCreateOpen(true)}>
                  Create first ticket
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2 sm:space-y-3">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/service/${t.id}`}>
                  <Card className="transition-colors hover:border-primary/40 hover:bg-muted/30 active:bg-muted/50">
                    <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {t.ticketNumber}
                          </span>
                          <Badge variant="outline" className={cn("text-[10px]", statusColor(t.status))}>
                            {t.status.replace("_", " ")}
                          </Badge>
                          <Badge variant="outline" className={cn("text-[10px]", priorityColor(t.priority))}>
                            {t.priority}
                          </Badge>
                          {t.followUpOverdue && (
                            <Badge variant="destructive" className="gap-1 text-[10px]">
                              <Clock size={10} />
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <p className="truncate font-medium text-foreground">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.linkType === "TODO" ? "To-do" : t.clientName ?? "—"}
                          {t.taskTitle ? ` · ${t.taskTitle}` : ""}
                          {t.projectName && t.linkType === "CLIENT" ? ` · ${t.projectName}` : ""}
                          {t.assigneeName ? ` · ${t.assigneeName}` : ""}
                          {t.recordCount ? ` · ${t.recordCount} follow-up${t.recordCount === 1 ? "" : "s"}` : ""}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-muted-foreground sm:text-right">
                        {formatRelativeTime(t.updatedAt)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateServiceTicketSheet open={createOpen} onOpenChange={setCreateOpen} />
    </AppLayout>
  );
}
