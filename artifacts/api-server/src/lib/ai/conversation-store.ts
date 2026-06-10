import { ensureFirebaseAdminApp } from "@workspace/db";
import { getFirestore } from "firebase-admin/firestore";
import type { AiConversation, AiConversationMessage, AiMessageMetadata, PageContext } from "./types";

let nextId = 1;
const conversations = new Map<number, AiConversation>();
const messages = new Map<number, AiConversationMessage[]>();
let messageIdSeq = 1;

function useFirestore(): boolean {
  return process.env.USE_FIRESTORE === "true";
}

function fs() {
  ensureFirebaseAdminApp();
  return getFirestore(ensureFirebaseAdminApp());
}

const COL_CONV = "ai_conversations";
const COL_MSG = "ai_messages";

export async function listAiConversations(userId: number): Promise<AiConversation[]> {
  if (useFirestore()) {
    const snap = await fs()
      .collection(COL_CONV)
      .where("userId", "==", userId)
      .orderBy("updatedAt", "desc")
      .limit(50)
      .get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: Number(d.id),
        userId: data.userId as number,
        title: data.title as string,
        pageContext: (data.pageContext as PageContext | null) ?? null,
        createdAt: new Date(data.createdAt as string),
        updatedAt: new Date(data.updatedAt as string),
      };
    });
  }

  return [...conversations.values()]
    .filter((c) => c.userId === userId)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function getAiConversation(
  userId: number,
  conversationId: number,
): Promise<AiConversation | null> {
  if (useFirestore()) {
    const doc = await fs().collection(COL_CONV).doc(String(conversationId)).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    if (data.userId !== userId) return null;
    return {
      id: conversationId,
      userId: data.userId as number,
      title: data.title as string,
      pageContext: (data.pageContext as PageContext | null) ?? null,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
    };
  }

  const c = conversations.get(conversationId);
  if (!c || c.userId !== userId) return null;
  return c;
}

export async function createAiConversation(
  userId: number,
  title: string,
  pageContext?: PageContext | null,
): Promise<AiConversation> {
  const now = new Date();
  if (useFirestore()) {
    const meta = await fs().collection("_meta").doc("ai_conversation_seq").get();
    const current = meta.exists ? Number(meta.data()?.value ?? 0) : 0;
    const id = current + 1;
    await fs().collection("_meta").doc("ai_conversation_seq").set({ value: id });
    const row = {
      userId,
      title,
      pageContext: pageContext ?? null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await fs().collection(COL_CONV).doc(String(id)).set(row);
    return { id, userId, title, pageContext: pageContext ?? null, createdAt: now, updatedAt: now };
  }

  const id = nextId++;
  const conv: AiConversation = {
    id,
    userId,
    title,
    pageContext: pageContext ?? null,
    createdAt: now,
    updatedAt: now,
  };
  conversations.set(id, conv);
  messages.set(id, []);
  return conv;
}

export async function listAiConversationMessages(
  userId: number,
  conversationId: number,
): Promise<AiConversationMessage[]> {
  const conv = await getAiConversation(userId, conversationId);
  if (!conv) return [];

  if (useFirestore()) {
    const snap = await fs()
      .collection(COL_MSG)
      .where("conversationId", "==", conversationId)
      .orderBy("createdAt", "asc")
      .get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: Number(d.id),
        conversationId,
        role: data.role as "user" | "assistant",
        content: data.content as string,
        metadata: (data.metadata as AiMessageMetadata | null) ?? null,
        createdAt: new Date(data.createdAt as string),
      };
    });
  }

  return messages.get(conversationId) ?? [];
}

export async function appendAiMessage(
  userId: number,
  conversationId: number,
  role: "user" | "assistant",
  content: string,
  metadata?: AiMessageMetadata | null,
): Promise<AiConversationMessage | null> {
  const conv = await getAiConversation(userId, conversationId);
  if (!conv) return null;

  const now = new Date();
  if (useFirestore()) {
    const meta = await fs().collection("_meta").doc("ai_message_seq").get();
    const current = meta.exists ? Number(meta.data()?.value ?? 0) : 0;
    const id = current + 1;
    await fs().collection("_meta").doc("ai_message_seq").set({ value: id });
    const row = {
      conversationId,
      role,
      content,
      metadata: metadata ?? null,
      createdAt: now.toISOString(),
    };
    await fs().collection(COL_MSG).doc(String(id)).set(row);
    await fs()
      .collection(COL_CONV)
      .doc(String(conversationId))
      .set({ updatedAt: now.toISOString() }, { merge: true });
    return { id, conversationId, role, content, metadata: metadata ?? null, createdAt: now };
  }

  const id = messageIdSeq++;
  const msg: AiConversationMessage = {
    id,
    conversationId,
    role,
    content,
    metadata: metadata ?? null,
    createdAt: now,
  };
  const list = messages.get(conversationId) ?? [];
  list.push(msg);
  messages.set(conversationId, list);
  conv.updatedAt = now;
  conversations.set(conversationId, conv);
  return msg;
}
