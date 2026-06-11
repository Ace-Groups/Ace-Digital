import type { SignatoryProfile } from "./types";
import { fs, useFirestore } from "./firestore-util";

const COL = "signatory_profiles";
const memory = new Map<number, SignatoryProfile>();

function rowFromDoc(userId: number, data: Record<string, unknown>): SignatoryProfile {
  return {
    userId,
    documentDesignation: (data.documentDesignation as string) ?? "",
    signatureDataUrl: (data.signatureDataUrl as string | null) ?? null,
    enabled: data.enabled !== false,
    updatedAt: (data.updatedAt as string) ?? new Date().toISOString(),
  };
}

export async function getSignatoryProfile(userId: number): Promise<SignatoryProfile | null> {
  if (useFirestore()) {
    const doc = await fs().collection(COL).doc(String(userId)).get();
    if (!doc.exists) return null;
    return rowFromDoc(userId, doc.data()!);
  }
  return memory.get(userId) ?? null;
}

export async function listSignatoryProfiles(): Promise<SignatoryProfile[]> {
  if (useFirestore()) {
    const snap = await fs().collection(COL).get();
    return snap.docs.map((d) => rowFromDoc(Number(d.id), d.data()));
  }
  return [...memory.values()];
}

export async function upsertSignatoryProfile(
  userId: number,
  patch: Partial<Pick<SignatoryProfile, "documentDesignation" | "signatureDataUrl" | "enabled">>,
): Promise<SignatoryProfile> {
  const existing = (await getSignatoryProfile(userId)) ?? {
    userId,
    documentDesignation: "",
    signatureDataUrl: null,
    enabled: false,
    updatedAt: new Date().toISOString(),
  };
  const updated: SignatoryProfile = {
    ...existing,
    ...patch,
    userId,
    updatedAt: new Date().toISOString(),
  };
  if (useFirestore()) {
    await fs().collection(COL).doc(String(userId)).set(updated);
  } else {
    memory.set(userId, updated);
  }
  return updated;
}
