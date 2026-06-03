import { useEffect, useRef } from "react";
import {
  getGetServiceTicketQueryKey,
  useGetServiceTicket,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import aceLogo from "@/assets/ace-logo.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, RefreshCw } from "lucide-react";
import { ServiceReportActivityTimeline } from "@/components/service/ServiceReportActivityTimeline";
import {
  buildReportHtmlDocument,
  formatServiceReportDate,
  formatServiceStatus,
  reportClientLine,
} from "@/lib/service-report";
import { priorityColor, statusColor, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ServiceTicketClientReportProps {
  ticketId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceTicketClientReport({
  ticketId,
  open,
  onOpenChange,
}: ServiceTicketClientReportProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const detailKey = getGetServiceTicketQueryKey(ticketId);

  const { data: ticket, isLoading, isFetching, refetch } = useGetServiceTicket(ticketId, {
    query: {
      enabled: open && ticketId > 0,
      queryKey: detailKey,
      staleTime: 0,
    },
  });

  useEffect(() => {
    if (open && ticketId > 0) {
      void queryClient.invalidateQueries({ queryKey: detailKey });
    }
  }, [open, ticketId, detailKey, queryClient]);

  const records = ticket?.records ?? [];
  const clientLine = ticket ? reportClientLine(ticket) : "";

  function handlePrint() {
    if (!ticket || !printRef.current) return;
    const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!win) return;
    win.document.write(buildReportHtmlDocument(ticket));
    win.document.close();
    win.focus();
    win.print();
  }

  function handleDownload() {
    if (!ticket) return;
    const html = buildReportHtmlDocument(ticket);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ticket.ticketNumber}-service-report.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto print:max-w-none">
        <DialogHeader>
          <DialogTitle>Client report</DialogTitle>
          <DialogDescription>
            Live snapshot of ticket activity for sharing with your client. Refresh after adding
            follow-ups.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 min-h-10"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={14} className={cn(isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="default"
            className="gap-2 min-h-10"
            onClick={handlePrint}
            disabled={!ticket}
          >
            <Printer size={16} />
            Print / PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2 min-h-10"
            onClick={handleDownload}
            disabled={!ticket}
          >
            <Download size={16} />
            Download HTML
          </Button>
        </div>

        {isLoading || !ticket ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : (
          <div
            ref={printRef}
            className="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm print:border-0 print:shadow-none"
          >
            <div className="mb-6 flex items-start justify-between gap-4 border-b-2 border-sky-500 pb-5">
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-slate-500">
                  Ace Digital
                </p>
                <h2 className="text-2xl font-bold text-slate-900">Service Update Report</h2>
                <p className="mt-2 text-xs text-slate-600">
                  Generated {formatServiceReportDate(new Date().toISOString())}
                  {ticket.lastRecordAt
                    ? ` · Last activity ${formatServiceReportDate(ticket.lastRecordAt)}`
                    : ""}
                </p>
              </div>
              <img src={aceLogo} alt="" className="h-14 w-14 shrink-0 object-contain" />
            </div>

            <dl className="mb-6 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Ticket
                </dt>
                <dd className="mt-0.5 font-mono font-semibold text-slate-900">
                  {ticket.ticketNumber}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Client
                </dt>
                <dd className="mt-0.5 font-medium text-slate-900">{clientLine}</dd>
              </div>
              {ticket.projectName ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Project
                  </dt>
                  <dd className="mt-0.5 text-slate-900">{ticket.projectName}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status
                </dt>
                <dd className="mt-1">
                  <Badge variant="outline" className={statusColor(ticket.status)}>
                    {formatServiceStatus(ticket.status)}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Priority
                </dt>
                <dd className="mt-1">
                  <Badge variant="outline" className={priorityColor(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                </dd>
              </div>
              {ticket.assigneeName ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Account lead
                  </dt>
                  <dd className="mt-0.5 text-slate-900">{ticket.assigneeName}</dd>
                </div>
              ) : null}
              {ticket.nextFollowUpAt ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Next follow-up
                  </dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">
                    {formatServiceReportDate(ticket.nextFollowUpAt)}
                  </dd>
                </div>
              ) : null}
            </dl>

            <section className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Issue summary</h3>
              <p className="mb-2 text-lg font-semibold text-slate-900">{ticket.title}</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {ticket.description || "No additional description provided."}
              </p>
            </section>

            <section>
              <h3 className="mb-4 text-sm font-semibold text-slate-900">
                Activity & follow-ups ({records.length})
              </h3>
              <ServiceReportActivityTimeline records={records} />
            </section>

            <p className="mt-8 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-600">
              Prepared by Ace Digital. Reference ticket {ticket.ticketNumber} for follow-up
              questions.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
