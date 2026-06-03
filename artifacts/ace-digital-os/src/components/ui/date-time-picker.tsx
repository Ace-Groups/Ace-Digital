import * as React from "react";
import { createPortal } from "react-dom";
import { CalendarClock } from "lucide-react";
import {
  cn,
  applyTimeParts,
  formatDateTimeLabel,
  getTimeParts,
  parseDateTimeInput,
  toDateTimeInputValue,
  type TimeParts,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerCalendarPanel } from "@/components/ui/date-picker-calendar-panel";
import { DatePickerTimePanel } from "@/components/ui/date-picker-time-panel";
import { useIsMobile } from "@/hooks/use-mobile";

export interface DateTimePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
  id?: string;
}

function defaultTimeParts(): TimeParts {
  return { hour12: 10, minute: 0, meridiem: "AM" };
}

function MobileDateTimeSheet({
  open,
  onClose,
  selectedLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  selectedLabel: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Choose date and time"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(94dvh,780px)] w-full flex-col rounded-t-3xl border-t border-border/80 bg-card shadow-brand-md animate-in slide-in-from-bottom duration-200">
        <div className="mx-auto mt-3 h-1.5 w-14 shrink-0 rounded-full bg-muted-foreground/30" />
        <div className="border-b border-border/60 px-5 pb-4 pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Date & time
          </p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {selectedLabel}
          </p>
        </div>
        <div className="touch-scroll min-h-0 flex-1 overflow-y-auto">{children}</div>
        <div className="shrink-0 border-t border-border/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button type="button" className="h-12 w-full text-base" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export const DateTimePicker = React.forwardRef<HTMLButtonElement, DateTimePickerProps>(
  (
    {
      value = "",
      onChange,
      onBlur,
      placeholder = "Pick date & time",
      disabled,
      className,
      "data-testid": dataTestId,
      id,
    },
    ref,
  ) => {
    const isMobile = useIsMobile();
    const [open, setOpen] = React.useState(false);

    const parsed = parseDateTimeInput(value);
    const [draftDate, setDraftDate] = React.useState<Date | undefined>(parsed);
    const [timeParts, setTimeParts] = React.useState<TimeParts>(
      parsed ? getTimeParts(parsed) : defaultTimeParts(),
    );

    React.useEffect(() => {
      if (open) return;
      const next = parseDateTimeInput(value);
      setDraftDate(next);
      setTimeParts(next ? getTimeParts(next) : defaultTimeParts());
    }, [value, open]);

    const calendarSize = isMobile ? "large" : "default";

    const close = () => {
      setOpen(false);
      onBlur?.();
    };

    const commit = (date: Date | undefined, parts: TimeParts) => {
      if (!date) {
        onChange?.("");
        return;
      }
      onChange?.(toDateTimeInputValue(applyTimeParts(date, parts.hour12, parts.minute, parts.meridiem)));
    };

    const handleDateSelect = (date: Date | undefined) => {
      setDraftDate(date);
      if (date) commit(date, timeParts);
    };

    const handleTimeChange = (parts: TimeParts) => {
      setTimeParts(parts);
      const base = draftDate ?? parseDateTimeInput(value);
      if (base) {
        const dayOnly = new Date(base.getFullYear(), base.getMonth(), base.getDate());
        setDraftDate(dayOnly);
        commit(dayOnly, parts);
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setDraftDate(today);
        commit(today, parts);
      }
    };

    const handleClear = () => {
      setDraftDate(undefined);
      onChange?.("");
      close();
    };

    const handleToday = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setDraftDate(today);
      commit(today, timeParts);
    };

    const selectedLabel = parsed ? formatDateTimeLabel(value) : placeholder;

    const calendarPanel = (
      <DatePickerCalendarPanel
        selected={draftDate}
        onSelect={handleDateSelect}
        onClear={handleClear}
        onToday={handleToday}
        size={calendarSize}
        useLabelCaption={isMobile}
        className={isMobile ? undefined : "sm:min-w-[17rem]"}
      />
    );

    const timePanel = (
      <DatePickerTimePanel
        parts={timeParts}
        onChange={handleTimeChange}
        size={calendarSize}
        className={isMobile ? "border-t" : undefined}
      />
    );

    const panel = isMobile ? (
      <div className="flex flex-col">
        {calendarPanel}
        {timePanel}
      </div>
    ) : (
      <div className="flex flex-row">
        {calendarPanel}
        {timePanel}
      </div>
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
          "h-11 w-full justify-between gap-3 px-3 text-base font-normal shadow-xs md:h-10 md:text-sm",
          !parsed && "text-muted-foreground",
          open && "border-primary/50 ring-1 ring-primary/30",
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">{selectedLabel}</span>
        <CalendarClock className="size-5 shrink-0 opacity-70 md:size-4" aria-hidden />
      </Button>
    );

    if (isMobile) {
      return (
        <>
          {trigger}
          <MobileDateTimeSheet open={open} onClose={close} selectedLabel={selectedLabel}>
            {panel}
          </MobileDateTimeSheet>
        </>
      );
    }

    return (
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) onBlur?.();
        }}
        modal
      >
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          className="z-[100] w-auto max-w-[min(100vw-1.5rem,40rem)] overflow-hidden rounded-xl border-border/80 p-0 shadow-brand-md"
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
DateTimePicker.displayName = "DateTimePicker";
