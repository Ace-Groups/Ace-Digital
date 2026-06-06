import * as React from "react";
import { cn, type TimeParts } from "@/lib/utils";

export type DatePickerTimeSize = "default" | "large";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
/** 5-minute steps — fewer targets, easier on mobile. */
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

interface DatePickerTimePanelProps {
  parts: TimeParts;
  onChange: (parts: TimeParts) => void;
  size?: DatePickerTimeSize;
  className?: string;
}

function snapMinute(minute: number): number {
  return Math.min(55, Math.round(minute / 5) * 5);
}

function TimeColumn({
  label,
  selected,
  options,
  onSelect,
  size,
}: {
  label: string;
  selected: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  size: DatePickerTimeSize;
}) {
  const isLarge = size === "large";
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector('[data-active="true"]');
    if (active instanceof HTMLElement) {
      active.scrollIntoView({ block: "center", behavior: "auto" });
    }
  }, [selected]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <span
        className={cn(
          "mb-2 shrink-0 text-center font-medium uppercase tracking-wider text-muted-foreground",
          isLarge ? "text-xs" : "text-[10px]",
        )}
      >
        {label}
      </span>
      <div
        ref={listRef}
        className={cn(
          "relative z-10 flex max-h-[11rem] min-h-[8rem] flex-col gap-1 overflow-y-auto overscroll-contain rounded-lg border border-border/50 bg-muted/15 px-1 py-2",
          isLarge && "max-h-[12rem] min-h-[9rem] gap-1.5 px-1.5 py-2.5",
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
        role="listbox"
        aria-label={label}
      >
        {options.map((opt) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={active}
              data-active={active ? "true" : "false"}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(opt.value);
              }}
              className={cn(
                "touch-manipulation shrink-0 rounded-md text-center font-medium tabular-nums transition-colors",
                isLarge ? "min-h-[2.75rem] px-3 py-2.5 text-base" : "min-h-[2.25rem] px-2 py-2 text-sm",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground hover:bg-muted active:bg-muted/80",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DatePickerTimePanel({
  parts,
  onChange,
  size = "default",
  className,
}: DatePickerTimePanelProps) {
  const isLarge = size === "large";
  const pad = (n: number) => String(n).padStart(2, "0");
  const snappedMinute = snapMinute(parts.minute);

  return (
    <div
      className={cn(
        "relative z-10 flex w-full shrink-0 flex-col border-border/80 bg-card",
        isLarge ? "gap-3 px-4 py-4" : "gap-3 border-t px-3 py-3 sm:border-t-0 sm:border-l sm:px-4 sm:py-3",
        className,
      )}
    >
      <p
        className={cn(
          "shrink-0 text-center font-medium text-muted-foreground",
          isLarge ? "text-sm" : "text-xs",
        )}
      >
        Time
      </p>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <TimeColumn
          label="Hour"
          selected={String(parts.hour12)}
          options={HOURS.map((h) => ({
            value: String(h),
            label: String(h).padStart(2, "0"),
          }))}
          onSelect={(v) => onChange({ ...parts, hour12: Number(v) })}
          size={size}
        />
        <TimeColumn
          label="Min"
          selected={String(snappedMinute)}
          options={MINUTES.map((m) => ({
            value: String(m),
            label: pad(m),
          }))}
          onSelect={(v) => onChange({ ...parts, minute: Number(v) })}
          size={size}
        />
        <TimeColumn
          label="AM/PM"
          selected={parts.meridiem}
          options={[
            { value: "AM", label: "AM" },
            { value: "PM", label: "PM" },
          ]}
          onSelect={(v) => onChange({ ...parts, meridiem: v as "AM" | "PM" })}
          size={size}
        />
      </div>
    </div>
  );
}
