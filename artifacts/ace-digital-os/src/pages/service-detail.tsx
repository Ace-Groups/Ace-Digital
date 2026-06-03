import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { ServiceRecordTimeline } from "@/components/service/ServiceRecordTimeline";
import { AddServiceRecordForm } from "@/components/service/AddServiceRecordForm";
import {
  getGetServiceTicketQueryKey,
  getListServiceTicketsQueryKey,
  useGetServiceTicket,
  useUpdateServiceTicket,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building2, User, Clock } from "lucide-react";
import { cn, formatRelativeTime, priorityColor, statusColor } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { patchListItem } from "@/lib/optimistic";
import type { ServiceTicket } from "@workspace/api-client-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function ServiceDetailPage() {
  const [, params] = useRoute("/service/:id");
  const ticketId = Number(params?.id);
  const isMobile = useIsMobile();
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateTicket = useUpdateServiceTicket();

  const detailKey = getGetServiceTicketQueryKey(ticketId);
  const { data: ticket, isLoading } = useGetServiceTicket(ticketId, {
    query: { enabled: ticketId > 0, queryKey: detailKey },
  });

  const canWrite = can("service_tickets:write");
  const records = useMemo(() => ticket?.records ?? [], [ticket?.records]);

  async function patchStatus(status: string) {
    if (!ticket) return;
    const listKey = getListServiceTicketsQueryKey();
    try {
      const updated = await updateTicket.mutateAsync({ id: ticketId, data: { status } });
      queryClient.setQueryData(detailKey, { ...ticket, ...updated, records });
      patchListItem(queryClient, listKey, ticketId, () => updated as ServiceTicket);
    } catch {
      toast({ title: "Could not update status", variant: "destructive" });
    }
  }

  if (!ticketId || Number.isNaN(ticketId)) {
    return (
      <AppLayout title="Service Desk">
        <p className="text-sm text-muted-foreground">Invalid ticket</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={ticket?.ticketNumber ?? "Ticket"}>
      <div className="page-stack pb-6">
        <Link href="/service">
          <Button variant="ghost" size="sm" className="min-h-10 -ml-2 gap-1.5 px-2">
            <ArrowLeft size={16} />
            Service Desk
          </Button>
        </Link>

        {isLoading || !ticket ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : (
          <>
            <header
              className={cn(
                "rounded-xl border border-border bg-card p-4 sm:p-5",
                isMobile && "space-y-3",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      {ticket.ticketNumber}
                    </span>
                    <Badge variant="outline" className={statusColor(ticket.status)}>
                      {ticket.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className={priorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                    {ticket.followUpOverdue && (
                      <Badge variant="destructive" className="gap-1">
                        <Clock size={12} />
                        Follow-up overdue
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-lg font-semibold leading-snug text-foreground sm:text-xl">
                    {ticket.title}
                  </h1>
                  {ticket.description && (
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {ticket.description}
                    </p>
                  )}
                </div>
                {canWrite && (
                  <Select value={ticket.status} onValueChange={(v) => void patchStatus(v)}>
                    <SelectTrigger className="min-h-11 w-full sm:w-[10rem]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "RESOLVED", "CLOSED"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 size={14} className="shrink-0" />
                  <span>{ticket.clientName ?? "Client"}</span>
                </div>
                {ticket.assigneeName && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User size={14} className="shrink-0" />
                    <span>{ticket.assigneeName}</span>
                  </div>
                )}
                {ticket.linkType === "TODO" && (
                  <div className="text-muted-foreground">
                    Linked to-do
                    {ticket.taskTitle ? `: ${ticket.taskTitle}` : ""}
                  </div>
                )}
                {ticket.projectName && (
                  <div className="text-muted-foreground">Project: {ticket.projectName}</div>
                )}
                {ticket.linkType === "CLIENT" && ticket.taskTitle && (
                  <div className="text-muted-foreground">Task: {ticket.taskTitle}</div>
                )}
                <div className="text-muted-foreground">
                  Category: {ticket.category} · Updated {formatRelativeTime(ticket.updatedAt)}
                </div>
                {ticket.nextFollowUpAt && (
                  <div className="text-muted-foreground sm:col-span-2">
                    Next follow-up:{" "}
                    {new Date(ticket.nextFollowUpAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                )}
              </dl>
            </header>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Follow-up timeline</h2>
              <ServiceRecordTimeline records={records} />
            </section>

            {canWrite && (
              <div className={cn(isMobile && "sticky bottom-0 z-10 pb-[env(safe-area-inset-bottom)]")}>
                <AddServiceRecordForm ticketId={ticketId} currentStatus={ticket.status} />
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
