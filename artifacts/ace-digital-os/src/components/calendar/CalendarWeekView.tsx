import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { CalendarFeedItem } from "@workspace/api-client-react";
import { KIND_COLORS } from "@/components/calendar/CalendarMonthView";

interface CalendarWeekViewProps {
  weekStart: Date;
  items: CalendarFeedItem[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onSelectItem: (item: CalendarFeedItem) => void;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

export function CalendarWeekView({
  weekStart,
  items,
  selectedDate,
  onSelectDate,
  onSelectItem,
}: CalendarWeekViewProps) {
  const days = useMemo(() => {
    const start = startOfWeek(weekStart);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  }, [weekStart]);

  function itemsOnDay(day: Date) {
    const key = day.toDateString();
    return items
      .filter((it) => new Date(it.startAt).toDateString() === key)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {days.map((day) => (
          <div key={day.toISOString()} className="py-1">
            {day.toLocaleDateString("en-IN", { weekday: "short" })}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = day.toDateString() === selectedDate.toDateString();
          const dayItems = itemsOnDay(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex min-h-[8rem] flex-col rounded-xl border p-2 sm:min-h-[10rem]",
                isSelected ? "border-primary ring-1 ring-primary/30 bg-card/60" : "border-border/60 bg-card/40",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDate(day)}
                className={cn(
                  "mb-2 self-start rounded-md px-1.5 py-0.5 text-sm font-medium",
                  isSelected && "text-primary",
                )}
              >
                {day.getDate()}
              </button>
              <ul className="flex flex-1 flex-col gap-1 overflow-hidden">
                {dayItems.slice(0, 4).map((it) => (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => onSelectItem(it)}
                      className="flex w-full items-center gap-1 truncate rounded-md px-1 py-0.5 text-left text-[11px] hover:bg-muted/60"
                    >
                      <span
                        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", KIND_COLORS[it.kind] ?? "bg-muted-foreground")}
                      />
                      <span className="truncate">{it.title}</span>
                    </button>
                  </li>
                ))}
                {dayItems.length > 4 ? (
                  <li className="px-1 text-[10px] text-muted-foreground">+{dayItems.length - 4} more</li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { startOfWeek };
