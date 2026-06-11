import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { CanvasPanel, PageCanvasShell } from "@/components/canvas";
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
import { EditServiceTicketSheet } from "@/components/service/EditServiceTicketSheet";
import { ServiceTicketClientReport } from "@/components/service/ServiceTicketClientReport";
import {
  NO_ASSIGNEE,
  ServiceTicketAssigneeSelect,
} from "@/components/service/ServiceTicketAssigneeSelect";
import {
  ArrowLeft,
  Building2,
  User,
  Clock,
  Pencil,
  FileOutput,
  Ticket,
  MessageSquare,
  Flag,
} from "lucide-react";
import type { ServiceTicket, ServiceTicketDetail } from "@workspace/api-client-react";
import { cn, formatRelativeTime, priorityColor, statusColor } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { patchListItem } from "@/lib/optimistic";
import { useIsMobile } from "@/hooks/use-mobile";

export default function ServiceDetailPage() {
  const [, params] = useRoute("/service/:id");
  const ticketId = Number(params?.id);
  const isMobile = useIsMobile();
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateTicket = useUpdateServiceTicket();
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const detailKey = getGetServiceTicketQueryKey(ticketId);
  const { data: ticket, isLoading } = useGetServiceTicket(ticketId, {
    query: { enabled: ticketId > 0, queryKey: detailKey },
  });

  const canWrite = can("service_tickets:write");
  const records = useMemo(() => ticket?.records ?? [], [ticket?.records]);

  const metrics = useMemo(() => {
    if (!ticket) return [];
    return [
      {
        key: "status",
        label: "Status",
        value: ticket.status.replace("_", " "),
        icon: Ticket,
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
      },
      {
        key: "priority",
        label: "Priority",
        value: ticket.priority,
        icon: Flag,
        iconBg: "bg-amber-500/10",
        iconColor: "text-amber-600 dark:text-amber-400",
      },
      {
        key: "follow-ups",
        label: "Follow-ups",
        value: records.length,
        icon: MessageSquare,
        iconBg: "bg-sky-500/10",
        iconColor: "text-sky-600 dark:text-sky-400",
      },
    ];
  }, [ticket, records.length]);

  async function patchAssignee(assigneeValue: string) {
    if (!ticket) return;
    const listKey = getListServiceTicketsQueryKey();
    const nextId =
      assigneeValue && assigneeValue !== NO_ASSIGNEE ? Number(assigneeValue) : null;
    try {
      const updated = await updateTicket.mutateAsync({
        id: ticketId,
        data: { assigneeId: nextId },
      });
      queryClient.setQueryData(detailKey, { ...ticket, ...updated, records });
      patchListItem(queryClient, listKey, ticketId, () => updated as ServiceTicket);
      toast({ title: nextId ? "Assignee updated" : "Ticket unassigned" });
    } catch {
      toast({ title: "Could not update assignee", variant: "destructive" });
    }
  }

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
      <AppLayout title="">
        <PageCanvasShell title="Invalid ticket" showCommandBar={false}>
          <CanvasPanel title="Ticket not found" icon={Ticket}>
            <p className="text-sm text-muted-foreground">This ticket link is invalid.</p>
          </CanvasPanel>
        </PageCanvasShell>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="">
      <PageCanvasShell
        eyebrow={ticket?.ticketNumber ?? "Service Desk"}
        title={ticket?.title ?? "Ticket"}
        description={ticket?.description ?? undefined}
        metrics={metrics}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="min-h-9 gap-1.5">
              <Link href="/service">
                <ArrowLeft size={14} />
                Back
              </Link>
            </Button>
            {canWrite && ticket && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-9 gap-1.5"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil size={14} />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-9 gap-1.5"
                  onClick={() => setReportOpen(true)}
                >
                  <FileOutput size={14} />
                  Client report
                </Button>
              </>
            )}
          </div>
        }
      >
        {isLoading || !ticket ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : (
          <>
            <CanvasPanel title="Ticket details" icon={Ticket}>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
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

                {canWrite && (
                  <Select value={ticket.status} onValueChange={(v) => void patchStatus(v)}>
                    <SelectTrigger className="min-h-11 w-full sm:max-w-xs">
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

                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 size={14} className="shrink-0" />
                    <span>
                      {ticket.clientName ??
                        (ticket.linkType === "TODO" ? "Internal to-do" : ticket.projectName ?? "—")}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-xs font-medium text-muted-foreground">Assigned to</span>
                    {canWrite ? (
                      <ServiceTicketAssigneeSelect
                        value={ticket.assigneeId ? String(ticket.assigneeId) : NO_ASSIGNEE}
                        onValueChange={(v) => void patchAssignee(v)}
                        triggerClassName="min-h-10 max-w-xs"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User size={14} className="shrink-0" />
                        <span>{ticket.assigneeName ?? "Unassigned"}</span>
                      </div>
                    )}
                  </div>
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
              </div>
            </CanvasPanel>

            <CanvasPanel title="Follow-up timeline" icon={MessageSquare}>
              <ServiceRecordTimeline records={records} />
            </CanvasPanel>

            {canWrite && (
              <div className={cn(isMobile && "sticky bottom-0 z-10 pb-[env(safe-area-inset-bottom)]")}>
                <AddServiceRecordForm ticketId={ticketId} currentStatus={ticket.status} />
              </div>
            )}

            <EditServiceTicketSheet
              ticket={ticket as ServiceTicketDetail}
              open={editOpen}
              onOpenChange={setEditOpen}
            />
            <ServiceTicketClientReport
              ticketId={ticketId}
              open={reportOpen}
              onOpenChange={setReportOpen}
            />
          </>
        )}
      </PageCanvasShell>
    </AppLayout>
  );
}
