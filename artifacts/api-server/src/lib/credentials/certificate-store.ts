import type { CertificateStatus, InternshipCertificate } from "./types";
import { generateVerificationToken } from "./verification";
import { fs, useFirestore } from "./firestore-util";

const COL = "internship_certificates";
const memory = new Map<number, InternshipCertificate>();
let nextId = 1;

function rowFromDoc(id: number, data: Record<string, unknown>): InternshipCertificate {
  return {
    id,
    certificateCode: data.certificateCode as string,
    internshipId: data.internshipId as number,
    userId: data.userId as number,
    issuerUserId: data.issuerUserId as number,
    issuedAt: data.issuedAt as string,
    issuedByUserId: data.issuedByUserId as number,
    startDate: (data.startDate as string | null) ?? null,
    endDate: (data.endDate as string | null) ?? null,
    program: (data.program as string | null) ?? null,
    university: (data.university as string | null) ?? null,
    recipientName: data.recipientName as string,
    verificationToken: data.verificationToken as string,
    status: (data.status as CertificateStatus) ?? "active",
    revokedAt: (data.revokedAt as string | null) ?? null,
    revokeReason: (data.revokeReason as string | null) ?? null,
    supersededById: (data.supersededById as number | null) ?? null,
  };
}

async function nextCertificateId(): Promise<number> {
  if (useFirestore()) {
    const meta = await fs().collection("_meta").doc("certificate_seq").get();
    const current = meta.exists ? Number(meta.data()?.value ?? 0) : 0;
    const id = current + 1;
    await fs().collection("_meta").doc("certificate_seq").set({ value: id });
    return id;
  }
  return nextId++;
}

async function nextCertificateNumber(prefix: string, year: number): Promise<string> {
  const key = `cert_num_${prefix}_${year}`;
  if (useFirestore()) {
    const meta = await fs().collection("_meta").doc(key).get();
    const current = meta.exists ? Number(meta.data()?.value ?? 0) : 0;
    const n = current + 1;
    await fs().collection("_meta").doc(key).set({ value: n });
    return `${prefix}-${year}-${String(n).padStart(5, "0")}`;
  }
  const n = nextId++;
  return `${prefix}-${year}-${String(n).padStart(5, "0")}`;
}

export async function findCertificateById(id: number): Promise<InternshipCertificate | null> {
  if (useFirestore()) {
    const doc = await fs().collection(COL).doc(String(id)).get();
    if (!doc.exists) return null;
    return rowFromDoc(id, doc.data()!);
  }
  return memory.get(id) ?? null;
}

export async function findCertificateByCode(code: string): Promise<InternshipCertificate | null> {
  if (useFirestore()) {
    const snap = await fs().collection(COL).where("certificateCode", "==", code).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    return rowFromDoc(Number(doc.id), doc.data()!);
  }
  return [...memory.values()].find((c) => c.certificateCode === code) ?? null;
}

export async function listCertificatesByUserId(userId: number): Promise<InternshipCertificate[]> {
  const all = await listAllCertificates();
  return all.filter((c) => c.userId === userId);
}

export async function listCertificatesByInternshipId(
  internshipId: number,
): Promise<InternshipCertificate[]> {
  const all = await listAllCertificates();
  return all.filter((c) => c.internshipId === internshipId);
}

export async function listAllCertificates(): Promise<InternshipCertificate[]> {
  if (useFirestore()) {
    const snap = await fs().collection(COL).get();
    return snap.docs
      .map((d) => rowFromDoc(Number(d.id), d.data()))
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }
  return [...memory.values()].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

export async function createCertificate(input: {
  internshipId: number;
  userId: number;
  issuerUserId: number;
  issuedByUserId: number;
  startDate: string | null;
  endDate: string | null;
  program: string | null;
  university: string | null;
  recipientName: string;
  certificatePrefix: string;
}): Promise<InternshipCertificate> {
  const id = await nextCertificateId();
  const year = new Date().getFullYear();
  const certificateCode = await nextCertificateNumber(input.certificatePrefix, year);
  const row: InternshipCertificate = {
    id,
    certificateCode,
    internshipId: input.internshipId,
    userId: input.userId,
    issuerUserId: input.issuerUserId,
    issuedAt: new Date().toISOString(),
    issuedByUserId: input.issuedByUserId,
    startDate: input.startDate,
    endDate: input.endDate,
    program: input.program,
    university: input.university,
    recipientName: input.recipientName,
    verificationToken: generateVerificationToken(),
    status: "active",
    revokedAt: null,
    revokeReason: null,
    supersededById: null,
  };
  if (useFirestore()) {
    await fs().collection(COL).doc(String(id)).set(row);
  } else {
    memory.set(id, row);
  }
  return row;
}

export async function revokeCertificate(
  id: number,
  reason: string,
): Promise<InternshipCertificate | null> {
  const existing = await findCertificateById(id);
  if (!existing) return null;
  const updated: InternshipCertificate = {
    ...existing,
    status: "revoked",
    revokedAt: new Date().toISOString(),
    revokeReason: reason,
  };
  if (useFirestore()) {
    await fs().collection(COL).doc(String(id)).set(updated);
  } else {
    memory.set(id, updated);
  }
  return updated;
}
