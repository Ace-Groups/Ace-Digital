import * as React from "react";
import { createPortal } from "react-dom";
import { CalendarIcon } from "lucide-react";
import { cn, formatDateLabel, parseDateInput, toDateInputValue } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  /** Kept for API compatibility; mobile always uses a full-screen sheet. */
  inModal?: boolean;
  "data-testid"?: string;
  id?: string;
}

function MobileDateSheet({
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
      aria-label="Choose date"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
        aria-label="Close calendar"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(94dvh,720px)] w-full flex-col rounded-t-3xl border-t border-border/80 bg-card shadow-brand-md animate-in slide-in-from-bottom duration-200">
        <div className="mx-auto mt-3 h-1.5 w-14 shrink-0 rounded-full bg-muted-foreground/30" />
        <div className="border-b border-border/60 px-5 pb-4 pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Due date
          </p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {selectedLabel}
          </p>
        </div>
        <div className="touch-scroll min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {children}
        </div>
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

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      value = "",
      onChange,
      onBlur,
      placeholder = "Pick a date",
      disabled,
      className,
      "data-testid": dataTestId,
      id,
    },
    ref,
  ) => {
    const isMobile = useIsMobile();
    const [open, setOpen] = React.useState(false);
    const selected = parseDateInput(value);
    const calendarSize = isMobile ? "large" : "default";

    const close = () => {
      setOpen(false);
      onBlur?.();
    };

    const handleSelect = (date: Date | undefined) => {
      onChange?.(toDateInputValue(date));
    };

    const handleClear = () => {
      onChange?.("");
      close();
    };

    const handleToday = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      onChange?.(toDateInputValue(today));
      close();
    };

    const selectedLabel = selected ? formatDateLabel(value) : placeholder;

    const panel = (
      <DatePickerCalendarPanel
        selected={selected}
        onSelect={handleSelect}
        onClear={handleClear}
        onToday={handleToday}
        size={calendarSize}
        useLabelCaption={isMobile}
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
          "h-11 w-full justify-between gap-2 px-3 text-base font-normal shadow-xs md:h-10 md:text-sm",
          !selected && "text-muted-foreground",
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
        <>
          {trigger}
          <MobileDateSheet open={open} onClose={close} selectedLabel={selectedLabel}>
            {panel}
          </MobileDateSheet>
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
