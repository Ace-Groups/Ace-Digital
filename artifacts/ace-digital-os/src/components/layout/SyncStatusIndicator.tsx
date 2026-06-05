import { useEffect, useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncStatusIndicator() {
  const isMutating = useIsMutating();
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [showSyncing, setShowSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isOnline && wasOffline) {
      if (isMutating > 0) {
        setShowSyncing(true);
      } else {
        // Show syncing briefly even if no mutating calls are left to visual feedback
        setShowSyncing(true);
        timer = setTimeout(() => {
          setShowSyncing(false);
          setWasOffline(false);
        }, 3000);
      }
    } else if (isOnline && isMutating === 0) {
      setShowSyncing(false);
      setWasOffline(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOnline, wasOffline, isMutating]);

  // State 1: Offline with pending mutations
  if (!isOnline && isMutating > 0) {
    return (
      <div
        data-testid="sync-paused"
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)] animate-pulse",
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
        <span>Sync Paused ({isMutating})</span>
      </div>
    );
  }

  // State 2: Online & currently Syncing changes
  if (isOnline && (showSyncing || (isMutating > 0 && wasOffline))) {
    return (
      <div
        data-testid="syncing"
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.15)]",
        )}
      >
        <RefreshCw className="h-3 w-3 animate-spin text-cyan-400" />
        <span>Syncing...</span>
      </div>
    );
  }

  // State 3: Offline but no mutations pending
  if (!isOnline) {
    return (
      <div
        data-testid="offline-status"
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-muted-foreground/30 bg-muted/10 px-2.5 py-1 text-[11px] font-medium text-muted-foreground",
        )}
      >
        <WifiOff className="h-3 w-3" />
        <span>Offline</span>
      </div>
    );
  }

  return null;
}
