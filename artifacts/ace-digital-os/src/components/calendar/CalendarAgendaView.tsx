import { Link } from "wouter";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { CalendarFeedItem } from "@workspace/api-client-react";
import { KIND_COLORS } from "@/components/calendar/CalendarMonthView";
import { CheckSquare, MessageSquare } from "lucide-react";

interface CalendarAgendaViewProps {
  items: CalendarFeedItem[];
  selectedDate: Date;
  onSelectItem: (item: CalendarFeedItem) => void;
}

export function CalendarAgendaView({ items, selectedDate, onSelectItem }: CalendarAgendaViewProps) {
  const dayKey = selectedDate.toDateString();
  const dayItems = items.filter((it) => new Date(it.startAt).toDateString() === dayKey);

  if (!dayItems.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Nothing scheduled for this day</p>
    );
  }

  return (
    <div className="space-y-2">
      {dayItems.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onSelectItem(it)}
          className="flex w-full items-start gap-3 rounded-xl border border-border/70 bg-card/50 px-3 py-3 text-left transition-colors hover:bg-muted/40"
        >
          <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", KIND_COLORS[it.kind] ?? "bg-primary")} />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{it.title}</p>
            <p className="text-xs text-muted-foreground">{formatRelativeTime(it.startAt)}</p>
            {it.location ? <p className="text-xs text-muted-foreground">{it.location}</p> : null}
          </div>
          {it.readOnly && it.kind === "task" && it.taskId ? (
            <Link href={`/tasks?task=${it.taskId}`} className="shrink-0 text-muted-foreground hover:text-primary">
              <CheckSquare size={18} />
            </Link>
          ) : null}
          {(it.kind === "chat_event" || it.kind === "chat_poll") && it.channelId ? (
            <Link
              href={`/channels?channel=${it.channelId}`}
              className="shrink-0 text-muted-foreground hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageSquare size={18} />
            </Link>
          ) : null}
        </button>
      ))}
    </div>
  );
}
