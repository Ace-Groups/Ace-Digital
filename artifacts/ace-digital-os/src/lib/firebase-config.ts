const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "ace-digital-os";

/**
 * Firebase default web push VAPID public key — works when no custom key is set in Cloud Messaging.
 * Override with VITE_FIREBASE_VAPID_KEY or FIREBASE_WEB_PUSH_VAPID_KEY on the API.
 */
export const PROD_WEB_PUSH_VAPID_KEY =
  "BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4";

/** Production web app (Firebase console) — used when VITE_* env vars are not set at build time. */
const PROD_WEB_APP = {
  apiKey: "AIzaSyAN2QCws2eizQX9PTyTftLClB3WMauxG3c",
  authDomain: "ace-digital-os.firebaseapp.com",
  projectId: PROJECT_ID,
  storageBucket: "ace-digital-os.firebasestorage.app",
  messagingSenderId: "468590312757",
  appId: "1:468590312757:web:90d5fa23bd3cb78e68e07c",
};

/** Build-time placeholders must never reach Firebase Auth at runtime. */
export function isPlaceholderFirebaseValue(value: string | undefined): boolean {
  const v = value?.trim() ?? "";
  if (!v) return true;
  return /dummy|replace|placeholder|your[_-]?api|changeme|example/i.test(v);
}

function envOrProd(envValue: string | undefined, fallback: string): string {
  const v = envValue?.trim();
  if (v && !isPlaceholderFirebaseValue(v)) return v;
  return fallback;
}

/** asia-southeast1 RTDB URL (matches Firebase Console instance). */
const DEFAULT_DATABASE_URL = `https://${PROJECT_ID}-default-rtdb.asia-southeast1.firebasedatabase.app`;

export const firebaseConfig = {
  apiKey: envOrProd(import.meta.env.VITE_FIREBASE_API_KEY, PROD_WEB_APP.apiKey),
  authDomain: envOrProd(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, PROD_WEB_APP.authDomain),
  projectId: PROJECT_ID,
  storageBucket: envOrProd(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, PROD_WEB_APP.storageBucket),
  messagingSenderId: envOrProd(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    PROD_WEB_APP.messagingSenderId,
  ),
  appId: envOrProd(import.meta.env.VITE_FIREBASE_APP_ID, PROD_WEB_APP.appId),
  databaseURL: envOrProd(
    import.meta.env.VITE_FIREBASE_DATABASE_URL,
    DEFAULT_DATABASE_URL,
  ),
};

export function isFirebaseConfigured(): boolean {
  const key = firebaseConfig.apiKey?.trim() ?? "";
  return Boolean(key.length > 20 && !isPlaceholderFirebaseValue(key));
}

/** True when Firestore realtime + Storage uploads are enabled (production Firebase). */
export function isFirebaseChatEnabled(): boolean {
  return import.meta.env.VITE_FIREBASE_CHAT !== "false" && isFirebaseConfigured();
}
