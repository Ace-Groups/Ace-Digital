import type { ServiceRecord } from "@workspace/api-client-react";
import {
  buildReportActivityEntries,
  formatServiceReportDate,
  formatServiceStatus,
} from "@/lib/service-report";
import { cn } from "@/lib/utils";

interface ServiceReportActivityTimelineProps {
  records: ServiceRecord[];
  className?: string;
}

export function ServiceReportActivityTimeline({
  records,
  className,
}: ServiceReportActivityTimelineProps) {
  const entries = buildReportActivityEntries(records);

  if (!entries.length) {
    return (
      <p className={cn("rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600", className)}>
        No follow-up activity recorded yet. Add updates on the ticket, then refresh this report.
      </p>
    );
  }

  return (
    <ol className={cn("space-y-0", className)}>
      {entries.map(({ record, label, extras }, index) => (
        <li
          key={record.id}
          className={cn(
            "relative border-l-2 border-sky-200 pl-5 pb-6",
            index === entries.length - 1 && "pb-0",
          )}
        >
          <span
            className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-sky-500 shadow-sm"
            aria-hidden
          />
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <time className="text-xs font-semibold text-slate-700">
              {formatServiceReportDate(record.createdAt)}
            </time>
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-sky-900">
              {label}
            </span>
            {record.authorName ? (
              <span className="text-xs text-slate-600">· {record.authorName}</span>
            ) : null}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-900">
            {record.body}
          </p>
          {extras.map((line) => (
            <p key={line} className="mt-2 text-xs font-medium text-slate-600">
              {line}
            </p>
          ))}
          {record.statusAfter && !extras.some((e) => e.startsWith("Status")) ? (
            <p className="mt-2 text-xs text-slate-600">
              Status →{" "}
              <span className="font-semibold text-slate-900">
                {formatServiceStatus(record.statusAfter)}
              </span>
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
