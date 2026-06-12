import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn, formatDateLabel, parseDateInput, toDateInputValue } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  sheetTitle?: string;
  /** Use dialog calendar — required inside modals/sheets so the picker is not clipped. */
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
      sheetTitle = "Select date",
      inModal = false,
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
    const useDialog = inModal || isMobile;
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
      if (useDialog) close();
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
      if (useDialog) close();
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
        useLabelCaption={useDialog}
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
          if (!disabled && useDialog) setOpen(true);
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

    if (useDialog) {
      return (
        <>
          {trigger}
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) onBlur?.();
            }}
          >
            <DialogContent className="max-h-[min(92dvh,640px)] w-[min(100vw-1.5rem,24rem)] gap-0 overflow-hidden p-0">
              <DialogHeader className="border-b border-border/60 px-4 py-3 text-left">
                <DialogTitle className="text-base">{sheetTitle}</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto p-2">{panel}</div>
            </DialogContent>
          </Dialog>
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
