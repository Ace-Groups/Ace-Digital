import * as React from "react";
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
import { MobilePickerSheet } from "@/components/ui/mobile-picker-sheet";
import { useIsMobile } from "@/hooks/use-mobile";

export interface DateTimePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  sheetTitle?: string;
  "data-testid"?: string;
  id?: string;
  fromYear?: number;
  toYear?: number;
}

function defaultTimeParts(): TimeParts {
  return { hour12: 10, minute: 0, meridiem: "AM" };
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
      sheetTitle = "Date & time",
      "data-testid": dataTestId,
      id,
      fromYear,
      toYear,
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
      onChange?.(
        toDateTimeInputValue(
          applyTimeParts(date, parts.hour12, parts.minute, parts.meridiem),
        ),
      );
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

    const draftValue =
      draftDate != null
        ? toDateTimeInputValue(
            applyTimeParts(draftDate, timeParts.hour12, timeParts.minute, timeParts.meridiem),
          )
        : "";
    const selectedLabel = draftValue
      ? formatDateTimeLabel(draftValue)
      : parsed
        ? formatDateTimeLabel(value)
        : placeholder;

    const calendarPanel = (
      <DatePickerCalendarPanel
        selected={draftDate}
        onSelect={handleDateSelect}
        onClear={handleClear}
        onToday={handleToday}
        size={calendarSize}
        useLabelCaption={isMobile}
        className={isMobile ? undefined : "sm:min-w-[17rem]"}
        fromYear={fromYear}
        toYear={toYear}
      />
    );

    const timePanel = (
      <DatePickerTimePanel
        parts={timeParts}
        onChange={handleTimeChange}
        size={calendarSize}
        className={isMobile ? "border-t border-border/80" : undefined}
      />
    );

    const panel = isMobile ? (
      <div className="flex flex-col pb-2">
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
          "h-11 w-full touch-manipulation justify-between gap-3 px-3 text-base font-normal shadow-xs md:h-10 md:text-sm",
          !parsed && !draftDate && "text-muted-foreground",
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
          <MobilePickerSheet
            open={open}
            onClose={close}
            title={sheetTitle}
            selectedLabel={selectedLabel}
            zIndex={350}
          >
            {panel}
          </MobilePickerSheet>
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
        modal={false}
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
