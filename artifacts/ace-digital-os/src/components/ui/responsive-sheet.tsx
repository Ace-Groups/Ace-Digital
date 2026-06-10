import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ResponsiveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Accessible description (visually hidden when omitted from visible copy). */
  description?: string;
  children: ReactNode;
  className?: string;
}

export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: ResponsiveSheetProps) {
  const isMobile = useIsMobile();

  // Avoid mounting Radix Dialog (portal/focus trap) until the sheet is opened.
  if (!open) return null;

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "flex max-h-[94dvh] w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0",
            className,
          )}
        >
          <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-4 text-left">
            <DialogTitle className="text-lg">{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : (
              <DialogDescription className="sr-only">{title}</DialogDescription>
            )}
          </DialogHeader>
          <div className="mobile-form touch-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[min(92dvh,720px)] max-w-md overflow-y-auto", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </DialogHeader>
        <div className="mobile-form">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
