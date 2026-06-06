import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

interface MobilePickerSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  selectedLabel: string;
  children: React.ReactNode;
  /** Higher z-index when opened from nested drawers (e.g. event creation). */
  zIndex?: number;
}

export function MobilePickerSheet({
  open,
  onClose,
  title,
  selectedLabel,
  children,
  zIndex = 300,
}: MobilePickerSheetProps) {
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
      className="fixed inset-0 flex flex-col justify-end"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
        style={{ zIndex: 0 }}
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[min(94dvh,820px)] w-full flex-col rounded-t-3xl border-t border-border/80 bg-card shadow-brand-md animate-in slide-in-from-bottom duration-200"
        style={{ zIndex: 1 }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1.5 w-14 shrink-0 rounded-full bg-muted-foreground/30" />
        <div className="shrink-0 border-b border-border/60 px-5 pb-4 pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{selectedLabel}</p>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </div>
        <div className="shrink-0 border-t border-border/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button type="button" className="h-12 w-full touch-manipulation text-base" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
