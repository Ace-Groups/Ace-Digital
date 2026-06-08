import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn, formatDateLabel, normalizeDateInput, parseDateInput, toDateInputValue } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DatePickerCalendarPanel } from "@/components/ui/date-picker-calendar-panel";
import { useIsMobile } from "@/hooks/use-mobile";

export interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Sheet header label on mobile. */
  sheetTitle?: string;
  /** Kept for API compatibility; mobile always uses a full-screen sheet. */
  inModal?: boolean;
  "data-testid"?: string;
  id?: string;
  fromYear?: number;
  toYear?: number;
}

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      value = "",
      onChange,
      onBlur,
      placeholder = "Pick a date",
      disabled,
      className,
      sheetTitle = "Date",
      "data-testid": dataTestId,
      id,
      fromYear,
      toYear,
    },
    ref,
  ) => {
    const isMobile = useIsMobile();
    const [open, setOpen] = React.useState(false);
    const [draft, setDraft] = React.useState<Date | undefined>(parseDateInput(value));
    const calendarSize = isMobile ? "large" : "default";

    React.useEffect(() => {
      if (open) return;
      setDraft(parseDateInput(value));
    }, [value, open]);

    const close = () => {
      setOpen(false);
      onBlur?.();
    };

    const handleSelect = (date: Date | undefined) => {
      setDraft(date);
      onChange?.(toDateInputValue(date));
    };

    const handleClear = () => {
      setDraft(undefined);
      onChange?.("");
      close();
    };

    const handleToday = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setDraft(today);
      onChange?.(toDateInputValue(today));
    };

    const displayDate = open ? draft : parseDateInput(value);
    const selectedLabel = displayDate ? formatDateLabel(toDateInputValue(displayDate)) : placeholder;

    const panel = (
      <DatePickerCalendarPanel
        selected={draft}
        onSelect={handleSelect}
        onClear={handleClear}
        onToday={handleToday}
        size={calendarSize}
        useLabelCaption={isMobile}
        fromYear={fromYear}
        toYear={toYear}
      />
    );

    const trigger = (
      <Button
        ref={ref}
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        data-testid={dataTestId}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
        className={cn(
          "h-11 w-full touch-manipulation justify-between gap-2 px-3 text-base font-normal shadow-xs md:h-10 md:text-sm",
          !displayDate && "text-muted-foreground",
          open && "border-primary/50 ring-1 ring-primary/30",
          className,
        )}
      >
        <span className="truncate text-left">{selectedLabel}</span>
        <CalendarIcon className="size-5 shrink-0 opacity-70 md:size-4" aria-hidden />
      </Button>
    );

    if (isMobile) {
      return (
        <Input
          id={id}
          value={value}
          disabled={disabled}
          data-testid={dataTestId}
          placeholder={placeholder === "Pick a date" ? "DD-MM-YYYY" : placeholder}
          inputMode="numeric"
          autoComplete="off"
          onChange={(event) => onChange?.(event.target.value)}
          onBlur={() => {
            const normalized = normalizeDateInput(value);
            if (normalized) onChange?.(normalized);
            onBlur?.();
          }}
          className={cn("h-11 text-base", className)}
        />
      );
    }

    return (
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) onBlur?.();
        }}
        modal={false}
      >
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          className="z-[100] w-[min(100vw-2rem,24rem)] overflow-hidden rounded-xl border-border/80 p-0 shadow-brand-md"
          align="start"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {panel}
        </PopoverContent>
      </Popover>
    );
  },
);
DatePicker.displayName = "DatePicker";
