import { cn, type TimeParts } from "@/lib/utils";

export type DatePickerTimeSize = "default" | "large";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

interface DatePickerTimePanelProps {
  parts: TimeParts;
  onChange: (parts: TimeParts) => void;
  size?: DatePickerTimeSize;
  className?: string;
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

  return (
    <div className="flex min-w-0 flex-1 flex-col items-stretch">
      <span
        className={cn(
          "mb-2 text-center font-medium uppercase tracking-wider text-muted-foreground",
          isLarge ? "text-xs" : "text-[10px]",
        )}
      >
        {label}
      </span>
      <div
        className={cn(
          "touch-scroll flex max-h-[13.5rem] flex-col gap-1 overflow-y-auto rounded-lg bg-muted/20 px-1.5 py-2",
          isLarge && "max-h-[15rem] gap-1.5 px-2 py-2.5",
        )}
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
              onClick={() => onSelect(opt.value)}
              className={cn(
                "rounded-md text-center font-medium tabular-nums transition-colors",
                isLarge ? "px-4 py-3 text-base" : "px-3 py-2.5 text-sm",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground hover:bg-muted",
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

  return (
    <div
      className={cn(
        "flex w-full flex-col border-border/80 bg-card",
        isLarge ? "gap-4 px-4 py-4" : "gap-3 border-t px-4 py-4 sm:border-t-0 sm:border-l sm:py-3",
        className,
      )}
    >
      <p
        className={cn(
          "text-center font-medium text-muted-foreground",
          isLarge ? "text-sm" : "text-xs",
        )}
      >
        Time
      </p>
      <div className={cn("flex gap-3 sm:gap-4", isLarge && "gap-4")}>
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
          selected={String(parts.minute)}
          options={MINUTES.map((m) => ({
            value: String(m),
            label: pad(m),
          }))}
          onSelect={(v) => onChange({ ...parts, minute: Number(v) })}
          size={size}
        />
        <TimeColumn
          label=" "
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
