import type { ServiceRecord } from "@workspace/api-client-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { FileText, Mail, MapPin, MessageSquare, Phone, RefreshCw, CheckCircle2 } from "lucide-react";

const TYPE_META: Record<
  string,
  { label: string; icon: typeof FileText; className: string }
> = {
  NOTE: { label: "Note", icon: MessageSquare, className: "bg-muted text-muted-foreground" },
  PHONE: { label: "Phone", icon: Phone, className: "bg-blue-500/15 text-blue-600" },
  EMAIL: { label: "Email", icon: Mail, className: "bg-violet-500/15 text-violet-600" },
  ONSITE: { label: "On-site", icon: MapPin, className: "bg-amber-500/15 text-amber-700" },
  STATUS_CHANGE: {
    label: "Status",
    icon: RefreshCw,
    className: "bg-purple-500/15 text-purple-600",
  },
  RESOLUTION: {
    label: "Resolution",
    icon: CheckCircle2,
    className: "bg-emerald-500/15 text-emerald-600",
  },
};

interface ServiceRecordTimelineProps {
  records: ServiceRecord[];
  className?: string;
}

export function ServiceRecordTimeline({ records, className }: ServiceRecordTimelineProps) {
  if (!records.length) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No follow-ups yet. Add the first record below.
      </p>
    );
  }

  return (
    <ul className={cn("space-y-3", className)}>
      {records.map((record) => {
        const meta = TYPE_META[record.recordType] ?? TYPE_META.NOTE;
        const Icon = meta.icon;
        return (
          <li
            key={record.id}
            className="flex gap-3 rounded-xl border border-border bg-card/60 p-3 sm:p-4"
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                meta.className,
              )}
            >
              <Icon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{meta.label}</span>
                <span>·</span>
                <span>{record.authorName ?? "Team"}</span>
                <span>·</span>
                <span>{formatRelativeTime(record.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {record.body}
              </p>
              {record.statusAfter && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Status → <span className="font-medium text-foreground">{record.statusAfter}</span>
                </p>
              )}
              {record.nextFollowUpAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Next follow-up:{" "}
                  <span className="font-medium text-foreground">
                    {new Date(record.nextFollowUpAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
