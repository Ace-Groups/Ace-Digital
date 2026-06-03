import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  signOut,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Firestore,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseConfig, isFirebaseChatEnabled } from "@/lib/firebase-config";
import { authHeader, getAuthToken } from "@/lib/api";
import type { Message } from "@workspace/api-client-react";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let firebaseInitPromise: Promise<boolean> | null = null;
let firebaseAuthUnavailable = false;

function ensureApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) auth = getAuth(ensureApp());
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) db = getFirestore(ensureApp());
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) storage = getStorage(ensureApp());
  return storage;
}

export function isFirebaseAuthReady(): boolean {
  return Boolean(getFirebaseAuth().currentUser);
}

export function isFirebaseRealtimeEnabled(): boolean {
  return isFirebaseChatEnabled() && isFirebaseAuthReady() && !firebaseAuthUnavailable;
}

/** True only when signed in to Firebase — required for Storage rules. */
export async function canUseFirebaseStorage(): Promise<boolean> {
  if (!isFirebaseChatEnabled()) return false;
  return ensureFirebaseAuth();
}

/** Returns true when signed in to Firebase; false when chat realtime/storage auth is unavailable. */
export async function ensureFirebaseAuth(): Promise<boolean> {
  if (!isFirebaseChatEnabled()) return false;
  if (firebaseAuthUnavailable) return false;

  const a = getFirebaseAuth();
  if (a.currentUser) return true;

  if (firebaseInitPromise) return firebaseInitPromise;

  firebaseInitPromise = (async () => {
    const jwt = getAuthToken();
    if (!jwt) return false;

    try {
      const res = await fetch("/api/v1/auth/firebase-custom-token", {
        credentials: "include",
        headers: authHeader(),
      });
      if (!res.ok) {
        if (res.status === 404 || res.status === 503) {
          firebaseAuthUnavailable = true;
        }
        return false;
      }
      const { token } = (await res.json()) as { token: string };
      await signInWithCustomToken(a, token);
      return true;
    } catch {
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
      data.messageKind === "poll" || data.messageKind === "event"
        ? data.messageKind
        : "text",
    metadata:
      data.metadata && typeof data.metadata === "object"
        ? (data.metadata as Message["metadata"])
        : undefined,
    createdAt:
      typeof data.createdAt === "string"
        ? data.createdAt
        : data.createdAt instanceof Date
          ? data.createdAt.toISOString()
          : new Date().toISOString(),
  };
}

export function subscribeChannelMessages(
  channelId: number,
  onMessages: (messages: Message[]) => void,
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
      orderBy("createdAt", "asc"),
      limit(150),
    );

    unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) =>
          mapFirestoreMessage(d.id, d.data() as Record<string, unknown>),
        );
        onMessages(items);
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
