import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getNotificationPermission,
  isWebPushAvailable,
  registerWebPushToken,
} from "@/lib/push-notifications";

/**
 * Registers FCM web push after a verified session when permission is already granted.
 * Use PushPermissionPrompt for the initial permission request.
 */
export function usePushNotifications(): void {
  const { isSessionVerified, user } = useAuth();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!isSessionVerified || !user || attemptedRef.current) return;

    void (async () => {
      if (!(await isWebPushAvailable())) return;
      if (getNotificationPermission() !== "granted") return;

      attemptedRef.current = true;
      await registerWebPushToken().catch((err) => {
        console.warn("[push] registration failed", err);
        attemptedRef.current = false;
      });
    })();
  }, [isSessionVerified, user]);
}
