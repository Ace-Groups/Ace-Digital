import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isWebPushConfigured, registerWebPushToken } from "@/lib/push-notifications";

/**
 * Registers FCM web push after sign-in when VAPID is configured.
 * Fails silently when permission is denied or push is unavailable.
 */
export function usePushNotifications(): void {
  const { user } = useAuth();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!user || attemptedRef.current || !isWebPushConfigured()) return;
    attemptedRef.current = true;

    void registerWebPushToken().catch((err) => {
      console.warn("[push] registration failed", err);
    });
  }, [user]);
}
