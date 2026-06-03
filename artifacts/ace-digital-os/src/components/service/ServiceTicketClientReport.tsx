import { useMemo, useRef } from "react";
import type { ServiceTicketDetail } from "@workspace/api-client-react";
import aceLogo from "@/assets/ace-logo.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

const RECORD_LABELS: Record<string, string> = {
  NOTE: "Update",
  PHONE: "Phone call",
  EMAIL: "Email",
  ONSITE: "On-site visit",
  STATUS_CHANGE: "Status update",
  RESOLUTION: "Resolution",
};

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildReportHtml(ticket: ServiceTicketDetail, records: ServiceTicketDetail["records"]) {
  const clientLine =
    ticket.clientName ??
    (ticket.linkType === "TODO" ? "Internal work item" : "—");
  const timeline = (records ?? [])
    .filter((r) => r.recordType !== "STATUS_CHANGE")
    .slice()
    .reverse()
    .map(
      (r) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e8ecf4;vertical-align:top;width:140px;color:#5c6b8a;font-size:13px;">
          ${formatDate(r.createdAt)}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e8ecf4;vertical-align:top;width:120px;color:#0f172a;font-size:13px;font-weight:600;">
          ${RECORD_LABELS[r.recordType] ?? r.recordType}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e8ecf4;color:#334155;font-size:14px;line-height:1.55;white-space:pre-wrap;">
          ${escapeHtml(r.body)}
          ${r.statusAfter ? `<div style="margin-top:8px;font-size:12px;color:#5c6b8a;">Status → ${formatStatus(r.statusAfter)}</div>` : ""}
        </td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(ticket.ticketNumber)} — Service Report</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 40px; color: #0f172a; background: #fff; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  ${reportBodyInner(ticket, clientLine, timeline)}
</body>
</html>`;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function reportBodyInner(
  ticket: ServiceTicketDetail,
  clientLine: string,
  timeline: string,
) {
  return `
  <div style="max-width:720px;margin:0 auto;">
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0ea5e9;padding-bottom:20px;margin-bottom:28px;">
      <div>
        <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c6b8a;margin-bottom:6px;">Ace Digital</div>
        <h1 style="margin:0;font-size:26px;font-weight:700;color:#0f172a;">Service Update Report</h1>
      </div>
      <img src="${aceLogo}" alt="Ace Digital" width="56" height="56" style="object-fit:contain;" />
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:14px;">
      <tr><td style="padding:6px 0;color:#5c6b8a;width:140px;">Ticket</td><td style="font-weight:600;font-family:ui-monospace,monospace;">${escapeHtml(ticket.ticketNumber)}</td></tr>
      <tr><td style="padding:6px 0;color:#5c6b8a;">Client</td><td>${escapeHtml(clientLine)}</td></tr>
      ${ticket.projectName ? `<tr><td style="padding:6px 0;color:#5c6b8a;">Project</td><td>${escapeHtml(ticket.projectName)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#5c6b8a;">Status</td><td><span style="display:inline-block;padding:4px 10px;border-radius:6px;background:#e0f2fe;color:#0369a1;font-weight:600;font-size:13px;">${formatStatus(ticket.status)}</span></td></tr>
      <tr><td style="padding:6px 0;color:#5c6b8a;">Priority</td><td>${escapeHtml(ticket.priority)}</td></tr>
      <tr><td style="padding:6px 0;color:#5c6b8a;">Category</td><td>${escapeHtml(ticket.category.replace("_", " "))}</td></tr>
      ${ticket.assigneeName ? `<tr><td style="padding:6px 0;color:#5c6b8a;">Account lead</td><td>${escapeHtml(ticket.assigneeName)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#5c6b8a;">Report date</td><td>${formatDate(new Date().toISOString())}</td></tr>
      ${ticket.nextFollowUpAt ? `<tr><td style="padding:6px 0;color:#5c6b8a;">Next follow-up</td><td>${formatDate(ticket.nextFollowUpAt)}</td></tr>` : ""}
    </table>

    <h2 style="font-size:16px;margin:0 0 10px;color:#0f172a;">Issue summary</h2>
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#0f172a;">${escapeHtml(ticket.title)}</p>
    <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap;">${escapeHtml(ticket.description || "No additional description provided.")}</p>

    <h2 style="font-size:16px;margin:0 0 12px;color:#0f172a;">Activity timeline</h2>
    ${
      timeline
        ? `<table style="width:100%;border-collapse:collapse;"><tbody>${timeline}</tbody></table>`
        : `<p style="color:#5c6b8a;font-size:14px;">No client-facing updates recorded yet.</p>`
    }

    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e8ecf4;font-size:12px;color:#5c6b8a;line-height:1.5;">
      This report was prepared by Ace Digital for your records. For questions, reply to your usual Ace Digital contact or reference ticket <strong>${escapeHtml(ticket.ticketNumber)}</strong>.
    </div>
  </div>`;
}

interface ServiceTicketClientReportProps {
  ticket: ServiceTicketDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceTicketClientReport({
  ticket,
  open,
  onOpenChange,
}: ServiceTicketClientReportProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const records = useMemo(
    () =>
      [...(ticket.records ?? [])]
        .filter((r) => r.recordType !== "STATUS_CHANGE")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [ticket.records],
  );

  const clientLine =
    ticket.clientName ?? (ticket.linkType === "TODO" ? "Internal work item" : "—");

  function handlePrint() {
    const root = printRef.current;
    if (!root) return;
    const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!win) return;
    win.document.write(
      `<!DOCTYPE html><html><head><title>${ticket.ticketNumber} report</title></head><body>${root.innerHTML}</body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  }

  function handleDownload() {
    const html = buildReportHtml(ticket, records);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ticket.ticketNumber}-service-report.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const timelineRows = records
    .slice()
    .reverse()
    .map((r) => (
      <tr key={r.id} className="border-b border-border/80">
        <td className="py-3 pr-4 align-top text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(r.createdAt)}
        </td>
        <td className="py-3 pr-4 align-top text-xs font-semibold text-foreground whitespace-nowrap">
          {RECORD_LABELS[r.recordType] ?? r.recordType}
        </td>
        <td className="py-3 align-top text-sm text-foreground/90 whitespace-pre-wrap">
          {r.body}
          {r.statusAfter && (
            <span className="mt-2 block text-xs text-muted-foreground">
              Status → {formatStatus(r.statusAfter)}
            </span>
          )}
        </td>
      </tr>
    ));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto print:max-w-none">
        <DialogHeader>
          <DialogTitle>Client report</DialogTitle>
          <DialogDescription>
            Preview a polished update for {ticket.clientName ?? "your client"}. Print or save as HTML
            to share.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 print:hidden">
          <Button type="button" variant="default" className="gap-2 min-h-10" onClick={handlePrint}>
            <Printer size={16} />
            Print / PDF
          </Button>
          <Button type="button" variant="outline" className="gap-2 min-h-10" onClick={handleDownload}>
            <Download size={16} />
            Download HTML
          </Button>
        </div>

        <div
          ref={printRef}
          className="rounded-xl border border-border bg-white p-6 text-slate-900 shadow-sm print:border-0 print:shadow-none"
        >
          <div className="flex items-start justify-between border-b-2 border-sky-500 pb-5 mb-6">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Ace Digital</p>
              <h2 className="text-2xl font-bold text-slate-900">Service Update Report</h2>
            </div>
            <img src={aceLogo} alt="" className="h-14 w-14 object-contain" />
          </div>

          <dl className="grid gap-1 text-sm mb-6 sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="text-slate-500 w-28 shrink-0">Ticket</dt>
              <dd className="font-mono font-semibold">{ticket.ticketNumber}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-500 w-28 shrink-0">Client</dt>
              <dd>{clientLine}</dd>
            </div>
            {ticket.projectName && (
              <div className="flex gap-2">
                <dt className="text-slate-500 w-28 shrink-0">Project</dt>
                <dd>{ticket.projectName}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="text-slate-500 w-28 shrink-0">Status</dt>
              <dd>
                <span className="inline-block rounded-md bg-sky-100 px-2 py-0.5 text-sky-800 font-semibold text-xs">
                  {formatStatus(ticket.status)}
                </span>
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-500 w-28 shrink-0">Priority</dt>
              <dd>{ticket.priority}</dd>
            </div>
            {ticket.assigneeName && (
              <div className="flex gap-2">
                <dt className="text-slate-500 w-28 shrink-0">Account lead</dt>
                <dd>{ticket.assigneeName}</dd>
              </div>
            )}
          </dl>

          <h3 className="text-sm font-semibold text-slate-900 mb-2">Issue summary</h3>
          <p className="text-lg font-semibold text-slate-900 mb-2">{ticket.title}</p>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap mb-6">
            {ticket.description || "No additional description provided."}
          </p>

          <h3 className="text-sm font-semibold text-slate-900 mb-3">Activity timeline</h3>
          {timelineRows.length ? (
            <table className="w-full text-left text-sm">
              <tbody>{timelineRows}</tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-500">No client-facing updates recorded yet.</p>
          )}

          <p className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-500 leading-relaxed">
            Prepared by Ace Digital. Reference ticket {ticket.ticketNumber} for any follow-up
            questions.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
