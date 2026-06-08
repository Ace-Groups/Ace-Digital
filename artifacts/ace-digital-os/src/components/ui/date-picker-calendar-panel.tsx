import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { isFutureDay, isPastDay } from "@/lib/calendar-core";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { format, parse, isValid } from "date-fns";
import { Input } from "@/components/ui/input";

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

  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (selected && isValid(selected)) {
      setInputValue(format(selected, "dd-MM-yyyy"));
    } else {
      setInputValue("");
    }
  }, [selected]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    if (val.length === 10) {
      const parsed = parse(val, "dd-MM-yyyy", new Date());
      if (isValid(parsed)) {
        // Only select if it's within allowed bounds (roughly)
        const year = parsed.getFullYear();
        if (year >= (fromYear ?? defaultFrom) && year <= (toYear ?? defaultTo)) {
          onSelect(parsed);
        }
      }
    }
  };

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
      <div className={cn("px-4 pb-3", isLarge ? "" : "px-3 pb-2")}>
        <Input 
          placeholder="DD-MM-YYYY" 
          value={inputValue} 
          onChange={handleInputChange} 
          className={cn("text-center font-mono", isLarge ? "h-11 text-base" : "h-9 text-sm")}
          maxLength={10}
        />
      </div>
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
