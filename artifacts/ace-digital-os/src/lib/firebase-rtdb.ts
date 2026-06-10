import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectDatabaseEmulator,
  getDatabase,
  type Database,
} from "firebase/database";
import {
  firebaseConfig,
  isFirebaseChatEnabled,
  isFirebaseConfigured,
} from "@/lib/firebase-config";
import { ensureFirebaseAuth, isFirebaseAuthReady } from "@/lib/firebase-client";

let app: FirebaseApp | null = null;
let rtdb: Database | null = null;
let emulatorConnected = false;

function ensureApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured");
  }
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

/** True when Firebase note collaboration (RTDB) can be used. */
export function isFirebaseCollabEnabled(): boolean {
  return isFirebaseChatEnabled();
}

export function getFirebaseRtdb(): Database {
  if (!isFirebaseCollabEnabled()) {
    throw new Error("Firebase collaboration disabled");
  }
  if (!rtdb) {
    rtdb = getDatabase(ensureApp());
    if (
      import.meta.env.DEV &&
      import.meta.env.VITE_FIREBASE_EMULATOR === "true" &&
      !emulatorConnected
    ) {
      connectDatabaseEmulator(rtdb, "127.0.0.1", 9000);
      emulatorConnected = true;
    }
  }
  return rtdb;
}

/** Returns RTDB when signed in; otherwise null without throwing. */
export async function getFirebaseRtdbWhenReady(): Promise<Database | null> {
  if (!isFirebaseCollabEnabled()) return null;
  const authed = await ensureFirebaseAuth();
  if (!authed || !isFirebaseAuthReady()) return null;
  try {
    return getFirebaseRtdb();
  } catch {
    return null;
  }
}
