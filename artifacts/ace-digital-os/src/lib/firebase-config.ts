const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "ace-digital-os";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyDummyReplaceInProd",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? `${PROJECT_ID}.firebaseapp.com`,
  projectId: PROJECT_ID,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? `${PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};

/** True when Firestore realtime + Storage uploads are enabled (production Firebase). */
export function isFirebaseChatEnabled(): boolean {
  return import.meta.env.VITE_FIREBASE_CHAT !== "false";
}
