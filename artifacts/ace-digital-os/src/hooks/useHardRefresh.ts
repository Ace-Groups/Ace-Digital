import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

const RELOAD_DELAY_MS = 120;

/**
 * Clears in-flight queries, busts the React Query cache, then reloads the document
 * so mobile PWA and desktop both get a full fresh fetch (not staleTime-only refetch).
 */
export function useHardRefresh() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const busyRef = useRef(false);

  const hardRefresh = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsRefreshing(true);

    void (async () => {
      try {
        await queryClient.cancelQueries();
        queryClient.clear();
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          await reg?.update().catch(() => undefined);
        }
      } catch {
        // Still reload on failure
      }

      window.setTimeout(() => {
        window.location.reload();
      }, RELOAD_DELAY_MS);
    })();
  }, [queryClient]);

  return { hardRefresh, isRefreshing };
}
