import { getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import {
  firebaseConfig,
  isFirebaseConfigured,
  PROD_WEB_PUSH_VAPID_KEY,
} from "@/lib/firebase-config";
import { authHeader, getAuthToken } from "@/lib/api";
import { ensureFirebaseAuth } from "@/lib/firebase-client";

let foregroundListenerAttached = false;
let cachedVapidKey: string | null = null;
let vapidFetchPromise: Promise<string | null> | null = null;

function readBuildVapidKey(): string | null {
  const key = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim();
  return key && key.length > 20 ? key : null;
}

async function fetchVapidKeyFromApi(): Promise<string | null> {
  try {
    const res = await fetch("/api/v1/push/config", { credentials: "include" });
    if (!res.ok) return null;
    const data = (await res.json()) as { vapidPublicKey?: string | null };
    const key = data.vapidPublicKey?.trim();
    return key && key.length > 20 ? key : null;
  } catch {
    return null;
  }
}

/** Resolves the VAPID public key from build env, API, or production fallback. */
export async function resolveVapidKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey;

  const buildKey = readBuildVapidKey();
  if (buildKey) {
    cachedVapidKey = buildKey;
    return buildKey;
  }

  if (!vapidFetchPromise) {
    vapidFetchPromise = fetchVapidKeyFromApi().then((apiKey) => {
      const key = apiKey ?? PROD_WEB_PUSH_VAPID_KEY;
      cachedVapidKey = key;
      return key;
    });
  }

  return vapidFetchPromise;
}

export async function isWebPushAvailable(): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;
  if (!(await isSupported())) return false;
  if (!("Notification" in window)) return false;
  const key = await resolveVapidKey();
  return Boolean(key);
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

async function registerTokenWithApi(token: string): Promise<void> {
  const jwt = getAuthToken();
  if (!jwt) return;

  const res = await fetch("/api/v1/push-tokens", {
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

  if (!res.ok) {
    throw new Error(`Push token registration failed (${res.status})`);
  }
}

/**
 * Registers the browser for FCM web push and stores the token server-side.
 * Caller must ensure Notification.permission === "granted".
 */
export async function registerWebPushToken(): Promise<boolean> {
  if (!(await isWebPushAvailable())) return false;
  if (Notification.permission !== "granted") return false;

  const vapidKey = await resolveVapidKey();
  if (!vapidKey) return false;

  const authed = await ensureFirebaseAuth();
  if (!authed) return false;

  const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const token = await getToken(messaging, {
    vapidKey,
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

/** Requests permission (if needed) and registers for push notifications. */
export async function enableWebPushNotifications(): Promise<{
  ok: boolean;
  reason?: "unavailable" | "denied" | "registration_failed";
}> {
  if (!(await isWebPushAvailable())) {
    return { ok: false, reason: "unavailable" };
  }

  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, reason: "denied" };
    }
  } else if (Notification.permission !== "granted") {
    return { ok: false, reason: "denied" };
  }

  const registered = await registerWebPushToken();
  return registered ? { ok: true } : { ok: false, reason: "registration_failed" };
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
