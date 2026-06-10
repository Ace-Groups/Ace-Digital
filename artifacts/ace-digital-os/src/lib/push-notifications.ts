import { getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { firebaseConfig, isFirebaseConfigured } from "@/lib/firebase-config";
import { authHeader, getAuthToken } from "@/lib/api";
import { ensureFirebaseAuth } from "@/lib/firebase-client";

let foregroundListenerAttached = false;

function getVapidKey(): string | null {
  const key = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim();
  return key && key.length > 20 ? key : null;
}

export function isWebPushConfigured(): boolean {
  return isFirebaseConfigured() && Boolean(getVapidKey());
}

async function registerTokenWithApi(token: string): Promise<void> {
  const jwt = getAuthToken();
  if (!jwt) return;

  await fetch("/api/v1/push-tokens", {
    method: "POST",
    credentials: "include",
    headers: {
      ...authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      platform: "web",
      token,
      deviceLabel: navigator.userAgent.slice(0, 200),
    }),
  });
}

/**
 * Registers the browser for FCM web push and stores the token server-side.
 */
export async function registerWebPushToken(): Promise<boolean> {
  if (!isWebPushConfigured()) return false;
  if (!(await isSupported())) return false;
  if (!("Notification" in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const authed = await ensureFirebaseAuth();
  if (!authed) return false;

  const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const token = await getToken(messaging, {
    vapidKey: getVapidKey()!,
    serviceWorkerRegistration: registration,
  });

  if (!token) return false;

  await registerTokenWithApi(token);

  if (!foregroundListenerAttached) {
    foregroundListenerAttached = true;
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? "Ace Digital";
      const body = payload.notification?.body ?? "";
      if (document.visibilityState === "visible" && Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/icons/icon-192.png",
          data: payload.data,
        });
      }
    });
  }

  return true;
}

export async function unregisterWebPushToken(token: string): Promise<void> {
  const jwt = getAuthToken();
  if (!jwt) return;

  await fetch("/api/v1/push-tokens", {
    method: "DELETE",
    credentials: "include",
    headers: {
      ...authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });
}
