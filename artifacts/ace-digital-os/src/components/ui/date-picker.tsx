import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn, formatDateLabel, parseDateInput, toDateInputValue } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { DatePickerCalendarPanel } from "@/components/ui/date-picker-calendar-panel";
import { useIsMobile } from "@/hooks/use-mobile";

export interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Use inside Dialog/Sheet — on mobile opens an inline calendar instead of a nested drawer. */
  inModal?: boolean;
  "data-testid"?: string;
  id?: string;
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
      inModal = true,
      "data-testid": dataTestId,
      id,
    },
    ref,
  ) => {
    const isMobile = useIsMobile();
    const [open, setOpen] = React.useState(false);
    const selected = parseDateInput(value);
    const useInlinePanel = isMobile && inModal;
    const calendarSize = isMobile || inModal ? "large" : "default";

    const close = () => {
      setOpen(false);
      onBlur?.();
    };

    const handleSelect = (date: Date | undefined) => {
      onChange?.(toDateInputValue(date));
      if (date) close();
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

    const usePopover = !useInlinePanel && !isMobile;

    const trigger = (
      <Button
        ref={ref}
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        data-testid={dataTestId}
        aria-expanded={open}
        onClick={
          usePopover
            ? undefined
            : () => {
                if (!disabled) setOpen((prev) => !prev);
              }
        }
        className={cn(
          "h-11 w-full justify-between gap-2 px-3 text-base font-normal shadow-xs md:h-10 md:text-sm",
          !selected && "text-muted-foreground",
          open && useInlinePanel && "border-primary/50 ring-1 ring-primary/30",
          className,
        )}
      >
        <span className="truncate text-left">
          {selected ? formatDateLabel(value) : placeholder}
        </span>
        <CalendarIcon className="size-5 shrink-0 opacity-70 md:size-4" aria-hidden />
      </Button>
    );

    const panel = (
      <DatePickerCalendarPanel
        selected={selected}
        onSelect={handleSelect}
        onClear={handleClear}
        onToday={handleToday}
        size={calendarSize}
      />
    );

    if (useInlinePanel) {
      return (
        <div className="w-full">
          {trigger}
          {open && (
            <div
              className="mt-2 overflow-hidden rounded-xl border border-border/80 bg-card shadow-brand-md animate-in fade-in-0 slide-in-from-top-1 duration-200"
              role="dialog"
              aria-label="Choose date"
            >
              {panel}
            </div>
          )}
        </div>
      );
    }

    if (isMobile) {
      return (
        <>
          {trigger}
          <Drawer
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) onBlur?.();
            }}
          >
            <DrawerContent className="z-[120] max-h-[min(92dvh,640px)] pb-[max(1rem,env(safe-area-inset-bottom))]">
              <DrawerHeader className="border-b border-border/60 pb-3 text-left">
                <DrawerTitle>Select date</DrawerTitle>
              </DrawerHeader>
              <div className="px-2 pt-2">{panel}</div>
            </DrawerContent>
          </Drawer>
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
        modal={!inModal}
      >
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          className="z-[100] w-[min(100vw-2rem,22.5rem)] overflow-hidden rounded-xl border-border/80 p-0 shadow-brand-md"
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
