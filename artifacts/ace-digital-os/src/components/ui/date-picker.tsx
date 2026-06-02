import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn, formatDateLabel, parseDateInput, toDateInputValue } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Use inside Dialog/Sheet so focus trap does not block the popover. */
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
    const [open, setOpen] = React.useState(false);
    const selected = parseDateInput(value);

    const handleSelect = (date: Date | undefined) => {
      onChange?.(toDateInputValue(date));
      if (date) setOpen(false);
    };

    const handleClear = () => {
      onChange?.("");
      setOpen(false);
    };

    const handleToday = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      onChange?.(toDateInputValue(today));
      setOpen(false);
    };

    return (
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) onBlur?.();
        }}
        modal={!inModal}
      >
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            data-testid={dataTestId}
            className={cn(
              "h-10 w-full justify-between gap-2 px-3 font-normal shadow-xs",
              !selected && "text-muted-foreground",
              className,
            )}
          >
            <span className="truncate">
              {selected ? formatDateLabel(value) : placeholder}
            </span>
            <CalendarIcon className="size-4 shrink-0 opacity-60" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="z-[100] w-auto overflow-hidden rounded-xl border-border/80 p-0 shadow-brand-md"
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected}
            captionLayout="dropdown"
            fromYear={new Date().getFullYear() - 5}
            toYear={new Date().getFullYear() + 10}
            className="[--cell-size:2.35rem] p-3"
          />
          <div className="flex items-center justify-between gap-2 border-t border-border/80 bg-muted/30 px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs text-muted-foreground"
              onClick={handleClear}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs font-medium text-primary"
              onClick={handleToday}
            >
              Today
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);
DatePicker.displayName = "DatePicker";
