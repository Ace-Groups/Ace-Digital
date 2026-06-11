import { ensureFirebaseAdminApp } from "@workspace/db";
import { getFirestore } from "firebase-admin/firestore";

export const INTERNSHIP_STEPS = [
  "application_received",
  "hr_review",
  "account_created",
  "onboarding_email_sent",
  "id_card_generated",
  "id_card_emailed",
  "mentor_assigned",
  "workspace_ready",
  "completed",
] as const;

export type InternshipStep = (typeof INTERNSHIP_STEPS)[number];

export type InternshipRecord = {
  id: number;
  userId: number;
  mentorId: number | null;
  university: string | null;
  program: string | null;
  startDate: string | null;
  endDate: string | null;
  status: "pipeline" | "active" | "completed" | "withdrawn";
  currentStep: InternshipStep;
  completedSteps: InternshipStep[];
  notes: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
};

let nextId = 1;
const memory = new Map<number, InternshipRecord>();

function useFirestore(): boolean {
  return process.env.USE_FIRESTORE === "true";
}

function fs() {
  ensureFirebaseAdminApp();
  return getFirestore(ensureFirebaseAdminApp());
}

const COL = "internships";

function rowFromDoc(id: number, data: Record<string, unknown>): InternshipRecord {
  return {
    id,
    userId: data.userId as number,
    mentorId: (data.mentorId as number | null) ?? null,
    university: (data.university as string | null) ?? null,
    program: (data.program as string | null) ?? null,
    startDate: (data.startDate as string | null) ?? null,
    endDate: (data.endDate as string | null) ?? null,
    status: (data.status as InternshipRecord["status"]) ?? "pipeline",
    currentStep: (data.currentStep as InternshipStep) ?? "application_received",
    completedSteps: (data.completedSteps as InternshipStep[]) ?? [],
    notes: (data.notes as string | null) ?? null,
    createdById: data.createdById as number,
    createdAt: data.createdAt as string,
    updatedAt: data.updatedAt as string,
  };
}

async function nextInternshipId(): Promise<number> {
  if (useFirestore()) {
    const meta = await fs().collection("_meta").doc("internship_seq").get();
    const current = meta.exists ? Number(meta.data()?.value ?? 0) : 0;
    const id = current + 1;
    await fs().collection("_meta").doc("internship_seq").set({ value: id });
    return id;
  }
  return nextId++;
}

export async function listInternships(): Promise<InternshipRecord[]> {
  if (useFirestore()) {
    const snap = await fs().collection(COL).get();
    return snap.docs
      .map((d) => rowFromDoc(Number(d.id), d.data()))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return [...memory.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function findInternshipById(id: number): Promise<InternshipRecord | null> {
  if (useFirestore()) {
    const doc = await fs().collection(COL).doc(String(id)).get();
    if (!doc.exists) return null;
    return rowFromDoc(id, doc.data()!);
  }
  return memory.get(id) ?? null;
}

export async function findInternshipByUserId(userId: number): Promise<InternshipRecord | null> {
  const all = await listInternships();
  return all.find((i) => i.userId === userId) ?? null;
}

export async function createInternship(
  input: Omit<InternshipRecord, "id" | "createdAt" | "updatedAt" | "currentStep" | "completedSteps" | "status"> & {
    status?: InternshipRecord["status"];
    currentStep?: InternshipStep;
    completedSteps?: InternshipStep[];
  },
): Promise<InternshipRecord> {
  const now = new Date().toISOString();
  const id = await nextInternshipId();
  const row: InternshipRecord = {
    id,
    userId: input.userId,
    mentorId: input.mentorId ?? null,
    university: input.university ?? null,
    program: input.program ?? null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    status: input.status ?? "pipeline",
    currentStep: input.currentStep ?? "application_received",
    completedSteps: input.completedSteps ?? [],
    notes: input.notes ?? null,
    createdById: input.createdById,
    createdAt: now,
    updatedAt: now,
  };

  if (useFirestore()) {
    await fs().collection(COL).doc(String(id)).set(row);
  } else {
    memory.set(id, row);
  }
  return row;
}

export async function updateInternship(
  id: number,
  patch: Partial<
    Pick<
      InternshipRecord,
      | "mentorId"
      | "university"
      | "program"
      | "startDate"
      | "endDate"
      | "status"
      | "currentStep"
      | "completedSteps"
      | "notes"
    >
  >,
): Promise<InternshipRecord | null> {
  const existing = await findInternshipById(id);
  if (!existing) return null;
  const updated: InternshipRecord = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  if (useFirestore()) {
    await fs().collection(COL).doc(String(id)).set(updated);
  } else {
    memory.set(id, updated);
  }
  return updated;
}

export async function advanceInternshipStep(
  id: number,
  step: InternshipStep,
): Promise<InternshipRecord | null> {
  const existing = await findInternshipById(id);
  if (!existing) return null;
  const completed = new Set(existing.completedSteps);
  completed.add(step);
  const idx = INTERNSHIP_STEPS.indexOf(step);
  const next = INTERNSHIP_STEPS[idx + 1] ?? "completed";
  const status =
    step === "completed" || next === "completed"
      ? "completed"
      : step === "workspace_ready"
        ? "active"
        : existing.status;

  return updateInternship(id, {
    currentStep: next,
    completedSteps: [...completed],
    status,
  });
}
