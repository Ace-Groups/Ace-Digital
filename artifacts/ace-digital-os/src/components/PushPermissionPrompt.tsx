import { useCallback, useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  enableWebPushNotifications,
  getNotificationPermission,
  isWebPushAvailable,
} from "@/lib/push-notifications";

const DISMISS_KEY = "ace-push-prompt-dismissed";

export function PushPermissionPrompt() {
  const { isSessionVerified, user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSessionVerified || !user) {
      setVisible(false);
      return;
    }

    void (async () => {
      if (!(await isWebPushAvailable())) return;
      const permission = getNotificationPermission();
      if (permission !== "granted") return;
      setVisible(false);
    })();
  }, [isSessionVerified, user]);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const result = await enableWebPushNotifications();
      if (result.ok) {
        sessionStorage.setItem(DISMISS_KEY, "1");
        setVisible(false);
        return;
      }
      if (result.reason === "denied") {
        sessionStorage.setItem(DISMISS_KEY, "1");
        setVisible(false);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Enable push notifications"
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[90] px-4 md:bottom-6 md:left-auto md:right-6 md:max-w-sm md:px-0"
    >
      <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-lg">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Bell className="size-5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Enable notifications</p>
            <p className="text-xs text-muted-foreground">
              Get alerts for chat, approvals, tasks, salary updates, and assignments.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="min-h-9" disabled={busy} onClick={() => void enable()}>
              {busy ? "Enabling…" : "Allow notifications"}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="min-h-9" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
          onClick={dismiss}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
