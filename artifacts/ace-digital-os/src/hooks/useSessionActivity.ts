import { useEffect } from "react";
import { getAuthToken } from "@/lib/api";
import { isSessionExpired, setLastActivity, shouldRefreshToken } from "@/lib/session";

const ACTIVITY_DEBOUNCE_MS = 30_000;

export function useSessionActivity({
  isAuthenticated,
  logout,
  refreshSession,
}: {
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}) {
  useEffect(() => {
    if (isSessionExpired()) {
      void logout();
      return;
    }

    if (!isAuthenticated) return;

    setLastActivity();

    const token = getAuthToken();
    if (token && shouldRefreshToken(token)) {
      void refreshSession().catch(() => undefined);
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const touch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setLastActivity();
        const currentToken = getAuthToken();
        if (currentToken && shouldRefreshToken(currentToken)) {
          void refreshSession().catch(() => undefined);
        }
      }, ACTIVITY_DEBOUNCE_MS);
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      setLastActivity();
      const currentToken = getAuthToken();
      if (currentToken && shouldRefreshToken(currentToken)) {
        void refreshSession().catch(() => undefined);
      }
    };

    window.addEventListener("focus", touch);
    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("focus", touch);
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isAuthenticated, logout, refreshSession]);
}
