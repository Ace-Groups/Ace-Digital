import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

function ConfirmActions({
  cancelLabel,
  confirmLabel,
  variant,
  loading,
  onCancel,
  onConfirm,
  layout,
}: {
  cancelLabel: string;
  confirmLabel: string;
  variant: "destructive" | "default";
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  layout: "drawer" | "dialog";
}) {
  const isDrawer = layout === "drawer";
  return (
    <div
      className={cn(
        "gap-2",
        isDrawer ? "flex w-full flex-col-reverse" : "flex flex-col-reverse sm:flex-row sm:justify-end",
      )}
    >
      <Button
        type="button"
        variant="outline"
        className={cn("min-h-11 touch-manipulation", isDrawer && "w-full")}
        disabled={loading}
        onClick={onCancel}
      >
        {cancelLabel}
      </Button>
      <Button
        type="button"
        variant={variant === "destructive" ? "destructive" : "default"}
        className={cn("min-h-11 touch-manipulation", isDrawer && "w-full")}
        disabled={loading}
        onClick={onConfirm}
      >
        {loading ? "Please wait…" : confirmLabel}
      </Button>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "destructive",
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const isMobile = useIsMobile();

  const handleConfirm = () => {
    void Promise.resolve(onConfirm());
  };

  const handleCancel = () => {
    if (!loading) onOpenChange(false);
  };

  if (isMobile) {
    if (!open) return null;
    return (
      <AlertDialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
        <AlertDialogContent className="confirm-dialog-content pb-[max(1rem,env(safe-area-inset-bottom))]">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description ? (
              <AlertDialogDescription asChild={typeof description !== "string"}>
                {typeof description === "string" ? description : <div>{description}</div>}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <div className="pt-2">
            <ConfirmActions
              layout="drawer"
              cancelLabel={cancelLabel}
              confirmLabel={confirmLabel}
              variant={variant}
              loading={loading}
              onCancel={handleCancel}
              onConfirm={handleConfirm}
            />
          </div>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <AlertDialogContent className="confirm-dialog-content">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription asChild={typeof description !== "string"}>
              {typeof description === "string" ? description : <div>{description}</div>}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} className="min-h-10 touch-manipulation">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            className={cn(
              "min-h-10 touch-manipulation",
              variant === "destructive" &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
          >
            {loading ? "Please wait…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
