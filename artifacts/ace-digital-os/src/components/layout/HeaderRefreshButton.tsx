import { RefreshCw } from "lucide-react";
import { useHardRefresh } from "@/hooks/useHardRefresh";
import { cn } from "@/lib/utils";

interface HeaderRefreshButtonProps {
  /** Mobile shell uses larger touch targets (44px). */
  variant?: "desktop" | "mobile";
}

export function HeaderRefreshButton({ variant = "desktop" }: HeaderRefreshButtonProps) {
  const { hardRefresh, isRefreshing } = useHardRefresh();
  const isMobile = variant === "mobile";

  return (
    <button
      type="button"
      data-testid="btn-refresh"
      onClick={hardRefresh}
      disabled={isRefreshing}
      className={cn(
        "relative shrink-0 text-muted-foreground transition-colors touch-manipulation",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isMobile
          ? "flex h-11 w-11 items-center justify-center rounded-xl active:bg-muted disabled:opacity-60"
          : cn(
              "rounded-lg p-2.5",
              "hover:bg-muted hover:text-foreground",
              "focus-visible:ring-offset-background",
              "disabled:pointer-events-none disabled:opacity-60",
            ),
      )}
      aria-label={isRefreshing ? "Refreshing…" : "Refresh page"}
      aria-busy={isRefreshing}
    >
      <RefreshCw
        size={isMobile ? 20 : 18}
        className={cn(isRefreshing && "animate-spin")}
        aria-hidden
      />
    </button>
  );
}
