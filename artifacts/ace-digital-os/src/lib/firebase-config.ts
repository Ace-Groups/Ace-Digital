const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "ace-digital-int-12345";

/**
 * Firebase's published default web-push VAPID key. A project-specific key from
 * Cloud Messaging overrides this via VITE_FIREBASE_VAPID_KEY or the API.
 */
export const PROD_WEB_PUSH_VAPID_KEY =
  "BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4";

/** Build-time placeholders must never reach Firebase Auth at runtime. */
export function isPlaceholderFirebaseValue(value: string | undefined): boolean {
  const v = value?.trim() ?? "";
  if (!v) return true;
  return /dummy|replace|placeholder|your[_-]?api|changeme|example/i.test(v);
}

function envOrEmpty(envValue: string | undefined): string {
  const v = envValue?.trim() ?? "";
  if (!v || isPlaceholderFirebaseValue(v)) return "";
  return v;
}

/**
 * Web API key, app id, and sender id are created with the Firebase web app
 * in ace-digital-int-12345. They are not committed. When those three are
 * unset, isFirebaseConfigured() is false and chat polls instead of listening.
 */
export const firebaseConfig = {
  apiKey: envOrEmpty(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain:
    envOrEmpty(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) ||
    `${PROJECT_ID}.firebaseapp.com`,
  projectId: PROJECT_ID,
  storageBucket:
    envOrEmpty(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) ||
    `${PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: envOrEmpty(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: envOrEmpty(import.meta.env.VITE_FIREBASE_APP_ID),
  databaseURL:
    envOrEmpty(import.meta.env.VITE_FIREBASE_DATABASE_URL) ||
    `https://${PROJECT_ID}-default-rtdb.asia-southeast1.firebasedatabase.app`,
};

export function isFirebaseConfigured(): boolean {
  const key = firebaseConfig.apiKey.trim();
  const appId = firebaseConfig.appId.trim();
  const sender = firebaseConfig.messagingSenderId.trim();
  return Boolean(
    key.length > 20 &&
      !isPlaceholderFirebaseValue(key) &&
      appId &&
      !isPlaceholderFirebaseValue(appId) &&
      sender &&
      !isPlaceholderFirebaseValue(sender),
  );
}

/** True when Firestore realtime + Storage uploads are enabled (production Firebase). */
export function isFirebaseChatEnabled(): boolean {
  return import.meta.env.VITE_FIREBASE_CHAT !== "false" && isFirebaseConfigured();
}
