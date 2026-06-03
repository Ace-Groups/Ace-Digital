import type { ServiceRecord, ServiceTicket, ServiceTicketDetail } from "@workspace/api-client-react";

export const SERVICE_RECORD_LABELS: Record<string, string> = {
  NOTE: "Update",
  PHONE: "Phone call",
  EMAIL: "Email",
  ONSITE: "On-site visit",
  STATUS_CHANGE: "Status change",
  RESOLUTION: "Resolution",
};

export function formatServiceReportDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatServiceStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export function reportClientLine(ticket: ServiceTicket): string {
  if (ticket.clientName) return ticket.clientName;
  if (ticket.linkType === "TODO") return "Internal work item";
  if (ticket.projectName) return ticket.projectName;
  return "—";
}

/** Oldest first — natural read order for client case notes. */
export function sortRecordsForReport(records: ServiceRecord[]): ServiceRecord[] {
  return [...records].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function buildReportActivityEntries(records: ServiceRecord[]) {
  return sortRecordsForReport(records).map((record) => {
    const label = SERVICE_RECORD_LABELS[record.recordType] ?? record.recordType;
    const extras: string[] = [];
    if (record.statusAfter) {
      extras.push(`Status set to ${formatServiceStatus(record.statusAfter)}`);
    }
    if (record.nextFollowUpAt) {
      extras.push(`Next follow-up scheduled: ${formatServiceReportDate(record.nextFollowUpAt)}`);
    }
    return { record, label, extras };
  });
}

export function escapeReportHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildReportHtmlDocument(ticket: ServiceTicketDetail): string {
  const clientLine = reportClientLine(ticket);
  const entries = buildReportActivityEntries(ticket.records ?? []);
  const timelineHtml = entries
    .map(
      ({ record, label, extras }) => `
      <article style="margin:0 0 20px;padding:0 0 20px;border-bottom:1px solid #e2e8f0;">
        <div style="margin-bottom:8px;">
          <span style="font-size:12px;font-weight:600;color:#334155;">${formatServiceReportDate(record.createdAt)}</span>
          <span style="display:inline-block;margin-left:8px;padding:2px 10px;border-radius:999px;background:#e0f2fe;color:#0369a1;font-size:11px;font-weight:700;">${escapeReportHtml(label)}</span>
          ${record.authorName ? `<span style="margin-left:8px;font-size:12px;color:#64748b;">by ${escapeReportHtml(record.authorName)}</span>` : ""}
        </div>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#0f172a;white-space:pre-wrap;">${escapeReportHtml(record.body)}</p>
        ${extras.map((e) => `<p style="margin:8px 0 0;font-size:12px;color:#475569;">${escapeReportHtml(e)}</p>`).join("")}
      </article>`,
    )
    .join("");

  const body = `
  <div style="max-width:720px;margin:0 auto;font-family:'Segoe UI',system-ui,sans-serif;color:#0f172a;">
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0ea5e9;padding-bottom:20px;margin-bottom:28px;">
      <div>
        <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Ace Digital</div>
        <h1 style="margin:0;font-size:26px;font-weight:700;">Service Update Report</h1>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:14px;">
      <tr><td style="padding:6px 0;color:#64748b;width:160px;">Ticket</td><td style="font-weight:600;font-family:ui-monospace,monospace;">${escapeReportHtml(ticket.ticketNumber)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Client</td><td style="color:#0f172a;">${escapeReportHtml(clientLine)}</td></tr>
      ${ticket.projectName ? `<tr><td style="padding:6px 0;color:#64748b;">Project</td><td style="color:#0f172a;">${escapeReportHtml(ticket.projectName)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#64748b;">Status</td><td><span style="display:inline-block;padding:4px 10px;border-radius:6px;background:#e0f2fe;color:#0369a1;font-weight:600;font-size:13px;">${formatServiceStatus(ticket.status)}</span></td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Priority</td><td style="color:#0f172a;">${escapeReportHtml(ticket.priority)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Category</td><td style="color:#0f172a;">${escapeReportHtml(ticket.category.replace(/_/g, " "))}</td></tr>
      ${ticket.assigneeName ? `<tr><td style="padding:6px 0;color:#64748b;">Account lead</td><td style="color:#0f172a;">${escapeReportHtml(ticket.assigneeName)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#64748b;">Report generated</td><td style="color:#0f172a;">${formatServiceReportDate(new Date().toISOString())}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Last activity</td><td style="color:#0f172a;">${ticket.lastRecordAt ? formatServiceReportDate(ticket.lastRecordAt) : "—"}</td></tr>
      ${ticket.nextFollowUpAt ? `<tr><td style="padding:6px 0;color:#64748b;">Next follow-up</td><td style="color:#0f172a;font-weight:600;">${formatServiceReportDate(ticket.nextFollowUpAt)}</td></tr>` : ""}
    </table>
    <h2 style="font-size:16px;margin:0 0 10px;color:#0f172a;">Issue summary</h2>
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#0f172a;">${escapeReportHtml(ticket.title)}</p>
    <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap;">${escapeReportHtml(ticket.description || "No additional description provided.")}</p>
    <h2 style="font-size:16px;margin:0 0 16px;color:#0f172a;">Activity & follow-ups (${entries.length})</h2>
    ${timelineHtml || `<p style="color:#64748b;font-size:14px;">No follow-up activity recorded yet.</p>`}
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;line-height:1.5;">
      Prepared by Ace Digital. Reference ticket <strong>${escapeReportHtml(ticket.ticketNumber)}</strong> for any follow-up questions.
    </div>
  </div>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>${escapeReportHtml(ticket.ticketNumber)} — Service Report</title></head><body style="margin:0;padding:40px;background:#fff;">${body}</body></html>`;
}
