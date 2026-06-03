import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { CalendarFeedItem } from "@workspace/api-client-react";

const KIND_COLORS: Record<string, string> = {
  event: "bg-primary",
  task: "bg-amber-500",
  chat_event: "bg-sky-500",
  chat_poll: "bg-violet-500",
};

interface CalendarMonthViewProps {
  month: Date;
  items: CalendarFeedItem[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}

export function CalendarMonthView({
  month,
  items,
  selectedDate,
  onSelectDate,
}: CalendarMonthViewProps) {
  const weeks = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - start.getDay());
    const gridEnd = new Date(end);
    gridEnd.setDate(end.getDate() + (6 - end.getDay()));

    const days: Date[] = [];
    const cur = new Date(gridStart);
    while (cur <= gridEnd) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }

    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [month]);

  function itemsOnDay(day: Date) {
    const key = day.toDateString();
    return items.filter((it) => new Date(it.startAt).toDateString() === key);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((day) => {
          const inMonth = day.getMonth() === month.getMonth();
          const isSelected = day.toDateString() === selectedDate.toDateString();
          const dayItems = itemsOnDay(day);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              className={cn(
                "flex min-h-[3.25rem] flex-col items-center rounded-xl border p-1 text-sm transition-colors sm:min-h-[4.5rem]",
                inMonth ? "border-border/60 bg-card/40" : "border-transparent bg-muted/20 text-muted-foreground",
                isSelected && "border-primary ring-1 ring-primary/30",
              )}
            >
              <span className={cn("font-medium", isSelected && "text-primary")}>{day.getDate()}</span>
              <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                {dayItems.slice(0, 3).map((it) => (
                  <span
                    key={it.id}
                    className={cn("h-1.5 w-1.5 rounded-full", KIND_COLORS[it.kind] ?? "bg-muted-foreground")}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { KIND_COLORS };
