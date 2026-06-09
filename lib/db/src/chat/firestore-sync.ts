import { ensureFirebaseAdminApp } from "../firebase-admin-init";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  sanitizeMessageAttachments,
  type MessageAttachment,
} from "../message-attachments";
import { useFirestore } from "../store/index";

export type MirrorMessagePayload = {
  id: number;
  channelId: number;
  senderId: number;
  body: string;
  attachments?: MessageAttachment[] | null;
  messageKind: string;
  metadata?: Record<string, unknown> | null;
  parentMessageId?: number | null;
  createdAt: Date;
  senderName?: string | null;
  senderAvatar?: string | null;
  senderUnavailable?: boolean;
};

function docId(id: number): string {
  return String(id);
}

function ensureFirestore(): Firestore | null {
  if (useFirestore()) return null;
  if (process.env.FIREBASE_CHAT_MIRROR === "false") return null;
  if (process.env.FIREBASE_CHAT_ENABLED === "false") return null;
  const project =
    process.env.GCLOUD_PROJECT ??
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT;
  if (!project && !process.env.FIRESTORE_EMULATOR_HOST) return null;

  try {
    ensureFirebaseAdminApp();
  } catch {
    return null;
  }
  return getFirestore();
}

export function isFirestoreChatMirrorEnabled(): boolean {
  return ensureFirestore() !== null;
}

/** Eagerly init Firebase Admin + Firestore for PG mirror mode. No-op when mirroring disabled. */
export function warmupFirestoreChatMirror(): void {
  ensureFirestore();
}

export async function mirrorMessageToFirestore(payload: MirrorMessagePayload): Promise<void> {
  const db = ensureFirestore();
  if (!db) return;

  const row = {
    channelId: payload.channelId,
    senderId: payload.senderId,
    body: payload.body,
    attachments: sanitizeMessageAttachments(payload.attachments ?? null),
    messageKind: payload.messageKind ?? "text",
    metadata: payload.metadata ?? null,
    parentMessageId: payload.parentMessageId ?? null,
    senderName: payload.senderName ?? null,
    senderAvatar: payload.senderAvatar ?? null,
    senderUnavailable: payload.senderUnavailable ?? false,
    createdAt: payload.createdAt.toISOString(),
  };

  await Promise.all([
    db.collection("messages").doc(docId(payload.id)).set(row),
    db
      .collection("channels")
      .doc(docId(payload.channelId))
      .collection("messages")
      .doc(docId(payload.id))
      .set(row),
  ]);
}

export async function mirrorMessagePatchToFirestore(
  id: number,
  patch: Partial<
    Pick<MirrorMessagePayload, "metadata" | "body" | "attachments"> & {
      editedAt?: Date | null;
      parentMessageId?: number | null;
    }
  >,
): Promise<void> {
  const db = ensureFirestore();
  if (!db) return;

  const data: Record<string, unknown> = {};
  if (patch.body !== undefined) data.body = patch.body;
  if (patch.metadata !== undefined) data.metadata = patch.metadata;
  if (patch.attachments !== undefined) {
    data.attachments = sanitizeMessageAttachments(patch.attachments ?? null);
  }
  if (patch.editedAt !== undefined) {
    data.editedAt = patch.editedAt ? patch.editedAt.toISOString() : null;
  }
  if (patch.parentMessageId !== undefined) data.parentMessageId = patch.parentMessageId;
  if (Object.keys(data).length === 0) return;

  const snap = await db.collection("messages").doc(docId(id)).get();
  const channelId = snap.exists ? Number(snap.data()?.channelId) : null;

  await db.collection("messages").doc(docId(id)).set(data, { merge: true });
  if (channelId) {
    await db
      .collection("channels")
      .doc(docId(channelId))
      .collection("messages")
      .doc(docId(id))
      .set(data, { merge: true });
  }
}

export async function mirrorMessageDeleteToFirestore(
  id: number,
  deletedAt: Date,
  deletedById: number,
): Promise<void> {
  const db = ensureFirestore();
  if (!db) return;

  const snap = await db.collection("messages").doc(docId(id)).get();
  const channelId = snap.exists ? Number(snap.data()?.channelId) : null;
  const data = {
    body: "",
    attachments: null,
    metadata: null,
    deletedAt: deletedAt.toISOString(),
    deletedById,
  };

  await db.collection("messages").doc(docId(id)).set(data, { merge: true });
  if (channelId) {
    await db
      .collection("channels")
      .doc(docId(channelId))
      .collection("messages")
      .doc(docId(id))
      .set(data, { merge: true });
  }
}

export async function mirrorChannelActivityToFirestore(
  channelId: number,
  lastPostAt: Date,
  messageCount: number,
): Promise<void> {
  const db = ensureFirestore();
  if (!db) return;

  await db
    .collection("channels")
    .doc(docId(channelId))
    .set(
      {
        lastPostAt: lastPostAt.toISOString(),
        messageCount,
      },
      { merge: true },
    );
}
