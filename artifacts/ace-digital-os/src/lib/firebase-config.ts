const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "ace-digital-os";

/** Production web app (Firebase console) — used when VITE_* env vars are not set at build time. */
const PROD_WEB_APP = {
  apiKey: "AIzaSyAN2QCws2eizQX9PTyTftLClB3WMauxG3c",
  authDomain: "ace-digital-os.firebaseapp.com",
  projectId: PROJECT_ID,
  storageBucket: "ace-digital-os.firebasestorage.app",
  messagingSenderId: "468590312757",
  appId: "1:468590312757:web:90d5fa23bd3cb78e68e07c",
};

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? PROD_WEB_APP.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? PROD_WEB_APP.authDomain,
  projectId: PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? PROD_WEB_APP.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? PROD_WEB_APP.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? PROD_WEB_APP.appId,
};

export function isFirebaseConfigured(): boolean {
  const key = firebaseConfig.apiKey?.trim() ?? "";
  return Boolean(key && !key.includes("DummyReplace"));
}

/** True when Firestore realtime + Storage uploads are enabled (production Firebase). */
export function isFirebaseChatEnabled(): boolean {
  return import.meta.env.VITE_FIREBASE_CHAT !== "false" && isFirebaseConfigured();
}
