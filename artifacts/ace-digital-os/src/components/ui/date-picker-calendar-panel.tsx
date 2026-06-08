import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { isFutureDay, isPastDay } from "@/lib/calendar-core";
import { cn } from "@/lib/utils";

export type DatePickerCalendarSize = "default" | "large";

interface DatePickerCalendarPanelProps {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  onClear: () => void;
  onToday: () => void;
  size?: DatePickerCalendarSize;
  /** Label + chevrons — better on iOS/Android than native dropdowns inside sheets. */
  useLabelCaption?: boolean;
  className?: string;
  fromYear?: number;
  toYear?: number;
}

export function DatePickerCalendarPanel({
  selected,
  onSelect,
  onClear,
  onToday,
  size = "default",
  useLabelCaption = false,
  className,
  fromYear,
  toYear,
}: DatePickerCalendarPanelProps) {
  const isLarge = size === "large";

  const defaultFrom = new Date().getFullYear() - 100;
  const defaultTo = new Date().getFullYear() + 10;

  return (
    <div
      data-size={size}
      className={cn(
        "calendar-panel flex w-full flex-col",
        isLarge && "calendar-panel-large",
        className,
      )}
    >
      <Calendar
        mode="single"
        selected={selected}
        onSelect={onSelect}
        defaultMonth={selected ?? new Date()}
        captionLayout={useLabelCaption ? "label" : "dropdown"}
        fromYear={fromYear ?? defaultFrom}
        toYear={toYear ?? defaultTo}
        modifiers={{
          past: (date) => isPastDay(date),
          future: (date) => isFutureDay(date),
        }}
        className={cn(
          "w-full bg-transparent p-0",
          isLarge
            ? "[--cell-size:3.25rem] p-2 sm:[--cell-size:3rem]"
            : "[--cell-size:2.75rem] p-2",
        )}
      />
      <div
        className={cn(
          "relative z-10 flex items-center gap-2 border-t border-border/80 bg-muted/30",
          isLarge ? "px-4 py-3" : "px-3 py-2.5",
        )}
      >
        <Button
          type="button"
          variant="outline"
          className={cn("flex-1 touch-manipulation", isLarge ? "h-11 text-sm" : "h-9 text-xs")}
          onClick={onClear}
        >
          Clear
        </Button>
        <Button
          type="button"
          className={cn("flex-1 touch-manipulation", isLarge ? "h-11 text-sm" : "h-9 text-xs")}
          onClick={onToday}
        >
          Today
        </Button>
      </div>
    </div>
  );
}
