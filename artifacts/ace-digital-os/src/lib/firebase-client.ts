import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  signOut,
  type Auth,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Firestore,
  type DocumentChangeType,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import {
  firebaseConfig,
  isFirebaseChatEnabled,
  isFirebaseConfigured,
  isPlaceholderFirebaseValue,
} from "@/lib/firebase-config";
import { authHeader, getAuthToken } from "@/lib/api";
import type { Message } from "@workspace/api-client-react";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let firebaseInitPromise: Promise<boolean> | null = null;
let firebaseAuthUnavailable = false;

function ensureApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured");
  }
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!isFirebaseChatEnabled()) {
    throw new Error("Firebase chat disabled");
  }
  if (!auth) auth = getAuth(ensureApp());
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!isFirebaseChatEnabled()) {
    throw new Error("Firebase chat disabled");
  }
  if (!db) {
    db = initializeFirestore(ensureApp(), {
      localCache: persistentLocalCache(),
    });
  }
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!isFirebaseChatEnabled()) {
    throw new Error("Firebase chat disabled");
  }
  if (!storage) storage = getStorage(ensureApp());
  return storage;
}

export function isFirebaseAuthReady(): boolean {
  if (!isFirebaseChatEnabled()) return false;
  try {
    return Boolean(getFirebaseAuth().currentUser);
  } catch {
    return false;
  }
}

export function isFirebaseRealtimeEnabled(): boolean {
  return isFirebaseChatEnabled() && isFirebaseAuthReady() && !firebaseAuthUnavailable;
}

/** True only when signed in to Firebase — required for Storage rules. */
export async function canUseFirebaseStorage(): Promise<boolean> {
  if (!isFirebaseChatEnabled()) return false;
  return ensureFirebaseAuth();
}

/** Background-friendly; never blocks UI. Returns true when signed in to Firebase. */
export async function ensureFirebaseAuth(): Promise<boolean> {
  if (!isFirebaseChatEnabled()) return false;
  if (firebaseAuthUnavailable) return false;

  let a: Auth;
  try {
    a = getFirebaseAuth();
  } catch {
    return false;
  }

  if (a.currentUser) return true;

  if (firebaseInitPromise) return firebaseInitPromise;

  firebaseInitPromise = (async () => {
    const jwt = getAuthToken();
    if (!jwt) return false;

    if (isPlaceholderFirebaseValue(firebaseConfig.apiKey)) {
      firebaseAuthUnavailable = true;
      return false;
    }

    try {
      console.log("[firebase-client] Fetching custom token...");
      const res = await fetch("/api/v1/auth/firebase-custom-token", {
        credentials: "include",
        headers: authHeader(),
      });
      if (!res.ok) {
        console.error("[firebase-client] Failed to fetch custom token:", res.status, res.statusText);
        if (res.status === 404 || res.status === 503) {
          firebaseAuthUnavailable = true;
        }
        return false;
      }
      const data = await res.json() as { token?: string; customToken?: string };
      const token = data.token || data.customToken;
      if (!token) {
        console.error("[firebase-client] No token found in response:", data);
        return false;
      }
      console.log("[firebase-client] Signing in with custom token...");
      await signInWithCustomToken(a, token);
      console.log("[firebase-client] Successfully authenticated with Firebase!");
      return true;
    } catch (err) {
      console.error("[firebase-client] Error during token exchange:", err);
      firebaseAuthUnavailable = true;
      return false;
    } finally {
      firebaseInitPromise = null;
    }
  })();

  return firebaseInitPromise;
}

export function resetFirebaseAuthState(): void {
  firebaseInitPromise = null;
  firebaseAuthUnavailable = false;
}

export async function signOutFirebase(): Promise<void> {
  resetFirebaseAuthState();
  if (auth?.currentUser) {
    await signOut(auth);
  }
}

function mapFirestoreMessage(id: string, data: Record<string, unknown>): Message {
  return {
    id: Number(id),
    channelId: Number(data.channelId),
    senderId: Number(data.senderId),
    senderName: typeof data.senderName === "string" ? data.senderName : undefined,
    senderAvatar:
      typeof data.senderAvatar === "string" || data.senderAvatar === null
        ? (data.senderAvatar as string | null)
        : undefined,
    body: typeof data.body === "string" ? data.body : "",
    attachments: Array.isArray(data.attachments)
      ? (data.attachments as Message["attachments"])
      : undefined,
    messageKind:
      data.messageKind === "poll" ||
      data.messageKind === "event" ||
      data.messageKind === "system"
        ? data.messageKind
        : "text",
    metadata:
      data.metadata && typeof data.metadata === "object"
        ? (data.metadata as Message["metadata"])
        : undefined,
    deleted: Boolean(data.deletedAt),
    parentMessageId:
      typeof data.parentMessageId === "number" ? data.parentMessageId : null,
    editedAt: typeof data.editedAt === "string" ? data.editedAt : null,
    createdAt:
      typeof data.createdAt === "string"
        ? data.createdAt
        : data.createdAt instanceof Date
          ? data.createdAt.toISOString()
          : new Date().toISOString(),
  };
}

export type FirestoreMessageChange = {
  type: DocumentChangeType;
  message: Message;
};

export type FirestoreChannelActivity = {
  lastPostAt: string | null;
  messageCount?: number;
};

export function subscribeChannelMessages(
  channelId: number,
  onMessages: (messages: Message[], changes: FirestoreMessageChange[]) => void,
  onError?: (err: Error) => void,
): () => void {
  if (!isFirebaseChatEnabled()) {
    return () => {};
  }

  let unsub = () => {};
  let cancelled = false;

  void (async () => {
    const authed = await ensureFirebaseAuth();
    if (cancelled || !authed) return;

    const q = query(
      collection(getFirebaseDb(), "messages"),
      where("channelId", "==", channelId),
      orderBy("createdAt", "desc"),
      limit(50),
    );

    unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map((d) => mapFirestoreMessage(d.id, d.data() as Record<string, unknown>))
          .reverse();
        const changes = snap.docChanges().map((change) => ({
          type: change.type,
          message: mapFirestoreMessage(
            change.doc.id,
            change.doc.data() as Record<string, unknown>,
          ),
        }));
        onMessages(items, changes);
      },
      (err) => {
        if (!isFirebaseAuthReady()) return;
        onError?.(err);
      },
    );
  })();

  return () => {
    cancelled = true;
    unsub();
  };
}

export function subscribeChannelActivity(
  channelId: number,
  onActivity: (activity: FirestoreChannelActivity) => void,
  onError?: (err: Error) => void,
): () => void {
  if (!isFirebaseChatEnabled()) {
    return () => {};
  }

  let unsub = () => {};
  let cancelled = false;

  void (async () => {
    const authed = await ensureFirebaseAuth();
    if (cancelled || !authed) return;

    unsub = onSnapshot(
      doc(getFirebaseDb(), "channels", String(channelId)),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as Record<string, unknown>;
        onActivity({
          lastPostAt: typeof data.lastPostAt === "string" ? data.lastPostAt : null,
          ...(typeof data.messageCount === "number"
            ? { messageCount: data.messageCount }
            : {}),
        });
      },
      (err) => {
        if (!isFirebaseAuthReady()) return;
        onError?.(err);
      },
    );
  })();

  return () => {
    cancelled = true;
    unsub();
  };
}
