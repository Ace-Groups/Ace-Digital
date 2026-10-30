import { randomUUID } from "node:crypto";
import { ensureFirebaseAdminApp, useFirestore } from "@workspace/db";
import { getFirestore, type Firestore, type Query } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import {
  DEFAULT_ACCOUNTABILITY_SETTINGS,
  normalizeAccountabilitySettings,
  type AccountabilitySettings,
} from "@workspace/accountability";

export class AccountabilityError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export type FaceEnrollment = {
  userId: number;
  consent: boolean;
  consentVersion: string | null;
  consentedAt: string | null;
  withdrawnAt: string | null;
  embedding: number[];
  selfiePath: string | null;
  retainUntil: string | null;
  updatedAt: string;
};

export type FieldVisit = {
  id: string;
  clientName: string;
  lat: number;
  lng: number;
  date: string;
  windowStart: string;
  windowEnd: string;
  radiusMeters: number;
  employeeId: number;
  employeeName: string;
  assignedById: number;
  status: "assigned" | "present" | "flagged" | "pending_review";
  distanceMeters: number | null;
  accuracy: number | null;
  mocked: boolean | null;
  fixLat: number | null;
  fixLng: number | null;
  withinRadius: boolean | null;
  faceMatchScore: number | null;
  faceMatchResult: "match" | "review" | null;
  liveness: "passed" | "failed" | "unavailable" | null;
  selfiePath: string | null;
  retainUntil: string | null;
  flagReason: string | null;
  checkedInAt: string | null;
  createdAt: string;
};

export type WorkLog = {
  id: string;
  userId: number;
  date: string;
  summary: string;
  links: string[];
  updatedAt: string;
};

export type PresencePing = {
  id: string;
  userId: number;
  date: string;
  slotMinute: number;
  status: "pending" | "confirmed" | "expired";
  createdAt: string;
  confirmedAt: string | null;
  selfiePath: string | null;
  faceMatchScore: number | null;
  faceMatchResult: "match" | "review" | null;
  dueAt: string;
};

export type FaceReview = {
  id: string;
  userId: number;
  source: "attendance" | "visit" | "ping";
  sourceId: string;
  status: "pending" | "accepted" | "declined";
  score: number | null;
  reason: string;
  selfiePath: string | null;
  note: string | null;
  decidedById: number | null;
  decidedAt: string | null;
  createdAt: string;
};

const ENROLL = "face_enrollments";
const VISITS = "field_visits";
const LOGS = "work_logs";
const PINGS = "presence_pings";
const REVIEWS = "face_reviews";
const SETTINGS = "accountability_settings";

const memoryEnroll = new Map<number, FaceEnrollment>();
const memoryVisits = new Map<string, FieldVisit>();
const memoryLogs = new Map<string, WorkLog>();
const memoryPings = new Map<string, PresencePing>();
const memoryReviews = new Map<string, FaceReview>();
const memorySelfies = new Map<string, { bytes: Buffer; retainUntil: string | null }>();
let memorySettings: AccountabilitySettings = { ...DEFAULT_ACCOUNTABILITY_SETTINGS };

function fs(): Firestore {
  ensureFirebaseAdminApp();
  return getFirestore();
}

function bucket() {
  ensureFirebaseAdminApp();
  if (process.env.FIREBASE_STORAGE_BUCKET?.trim()) {
    return getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET.trim());
  }
  const projectId =
    process.env.GCLOUD_PROJECT ??
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    "ace-digital-int-12345";
  return getStorage().bucket(`${projectId}.firebasestorage.app`);
}

export function resetAccountabilityMemoryForTests(): void {
  memoryEnroll.clear();
  memoryVisits.clear();
  memoryLogs.clear();
  memoryPings.clear();
  memoryReviews.clear();
  memorySelfies.clear();
  memorySettings = { ...DEFAULT_ACCOUNTABILITY_SETTINGS };
}

export async function getAccountabilitySettings(): Promise<AccountabilitySettings> {
  if (!useFirestore()) return { ...memorySettings };
  const snap = await fs().collection(SETTINGS).doc("default").get();
  if (!snap.exists) return { ...DEFAULT_ACCOUNTABILITY_SETTINGS };
  return normalizeAccountabilitySettings(snap.data() as Partial<AccountabilitySettings>);
}

export async function saveAccountabilitySettings(
  next: AccountabilitySettings,
  actorId: number,
): Promise<AccountabilitySettings> {
  const clean = normalizeAccountabilitySettings(next);
  if (!useFirestore()) {
    memorySettings = clean;
    return clean;
  }
  await fs()
    .collection(SETTINGS)
    .doc("default")
    .set({ ...clean, updatedAt: new Date().toISOString(), updatedById: actorId }, { merge: true });
  return clean;
}

export async function getEnrollment(userId: number): Promise<FaceEnrollment | null> {
  if (!useFirestore()) return memoryEnroll.get(userId) ?? null;
  const snap = await fs().collection(ENROLL).doc(String(userId)).get();
  if (!snap.exists) return null;
  return snap.data() as FaceEnrollment;
}

export function activeEnrollment(row: FaceEnrollment | null): FaceEnrollment | null {
  if (!row || !row.consent || row.withdrawnAt || row.embedding.length === 0) return null;
  return row;
}

export async function saveEnrollment(row: FaceEnrollment): Promise<FaceEnrollment> {
  if (!useFirestore()) {
    memoryEnroll.set(row.userId, row);
    return row;
  }
  await fs().collection(ENROLL).doc(String(row.userId)).set(row);
  return row;
}

export async function getVisit(id: string): Promise<FieldVisit | null> {
  if (!useFirestore()) return memoryVisits.get(id) ?? null;
  const snap = await fs().collection(VISITS).doc(id).get();
  return snap.exists ? (snap.data() as FieldVisit) : null;
}

export async function saveVisit(row: FieldVisit): Promise<FieldVisit> {
  if (!useFirestore()) {
    memoryVisits.set(row.id, row);
    return row;
  }
  await fs().collection(VISITS).doc(row.id).set(row);
  return row;
}

export async function listVisits(filter: { employeeId?: number; date?: string } = {}): Promise<FieldVisit[]> {
  if (!useFirestore()) {
    return [...memoryVisits.values()]
      .filter((row) => filter.employeeId == null || row.employeeId === filter.employeeId)
      .filter((row) => !filter.date || row.date === filter.date)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  let q: Query = fs().collection(VISITS);
  if (filter.employeeId != null) q = q.where("employeeId", "==", filter.employeeId);
  if (filter.date) q = q.where("date", "==", filter.date);
  const snap = await q.get();
  return snap.docs.map((doc) => doc.data() as FieldVisit);
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function logId(userId: number, date: string): string {
  return `${userId}_${date}`;
}

export async function getWorkLog(userId: number, date: string): Promise<WorkLog | null> {
  const id = logId(userId, date);
  if (!useFirestore()) return memoryLogs.get(id) ?? null;
  const snap = await fs().collection(LOGS).doc(id).get();
  return snap.exists ? (snap.data() as WorkLog) : null;
}

export async function saveWorkLog(row: WorkLog): Promise<WorkLog> {
  if (!useFirestore()) {
    memoryLogs.set(row.id, row);
    return row;
  }
  await fs().collection(LOGS).doc(row.id).set(row);
  return row;
}

export async function listWorkLogsBetween(start: string, end: string, userId?: number): Promise<WorkLog[]> {
  if (!useFirestore()) {
    return [...memoryLogs.values()].filter(
      (row) => row.date >= start && row.date <= end && (userId == null || row.userId === userId),
    );
  }
  let q: Query = fs().collection(LOGS).where("date", ">=", start).where("date", "<=", end);
  if (userId != null) q = q.where("userId", "==", userId);
  const snap = await q.get();
  return snap.docs.map((doc) => doc.data() as WorkLog);
}

export async function listPings(filter: { userId?: number; date?: string; start?: string; end?: string }): Promise<PresencePing[]> {
  if (!useFirestore()) {
    return [...memoryPings.values()].filter((row) => {
      if (filter.userId != null && row.userId !== filter.userId) return false;
      if (filter.date && row.date !== filter.date) return false;
      if (filter.start && row.date < filter.start) return false;
      if (filter.end && row.date > filter.end) return false;
      return true;
    });
  }
  let q: Query = fs().collection(PINGS);
  if (filter.userId != null) q = q.where("userId", "==", filter.userId);
  if (filter.date) q = q.where("date", "==", filter.date);
  else {
    if (filter.start) q = q.where("date", ">=", filter.start);
    if (filter.end) q = q.where("date", "<=", filter.end);
  }
  const snap = await q.get();
  return snap.docs.map((doc) => doc.data() as PresencePing);
}

export async function savePing(row: PresencePing): Promise<PresencePing> {
  if (!useFirestore()) {
    memoryPings.set(row.id, row);
    return row;
  }
  await fs().collection(PINGS).doc(row.id).set(row);
  return row;
}

export async function getPing(id: string): Promise<PresencePing | null> {
  if (!useFirestore()) return memoryPings.get(id) ?? null;
  const snap = await fs().collection(PINGS).doc(id).get();
  return snap.exists ? (snap.data() as PresencePing) : null;
}

export async function listReviews(filter: { userId?: number; status?: string; start?: string; end?: string } = {}): Promise<FaceReview[]> {
  if (!useFirestore()) {
    return [...memoryReviews.values()].filter((row) => {
      if (filter.userId != null && row.userId !== filter.userId) return false;
      if (filter.status && row.status !== filter.status) return false;
      if (filter.start && row.createdAt.slice(0, 10) < filter.start) return false;
      if (filter.end && row.createdAt.slice(0, 10) > filter.end) return false;
      return true;
    });
  }
  let q: Query = fs().collection(REVIEWS);
  if (filter.userId != null) q = q.where("userId", "==", filter.userId);
  if (filter.status) q = q.where("status", "==", filter.status);
  const snap = await q.get();
  return snap.docs
    .map((doc) => doc.data() as FaceReview)
    .filter((row) => !filter.start || row.createdAt.slice(0, 10) >= filter.start)
    .filter((row) => !filter.end || row.createdAt.slice(0, 10) <= filter.end);
}

export async function saveReview(row: FaceReview): Promise<FaceReview> {
  if (!useFirestore()) {
    memoryReviews.set(row.id, row);
    return row;
  }
  await fs().collection(REVIEWS).doc(row.id).set(row);
  return row;
}

export async function getReview(id: string): Promise<FaceReview | null> {
  if (!useFirestore()) return memoryReviews.get(id) ?? null;
  const snap = await fs().collection(REVIEWS).doc(id).get();
  return snap.exists ? (snap.data() as FaceReview) : null;
}

export function selfiePathFor(userId: number): string {
  return `attendance-selfies/${userId}/${randomUUID()}.jpg`;
}

export function assertSelfiePath(path: string): boolean {
  return /^attendance-selfies\/\d+\/[A-Za-z0-9._-]+$/.test(path);
}

export async function writeSelfie(path: string, bytes: Buffer, retainUntil: string | null): Promise<void> {
  if (!assertSelfiePath(path)) throw new AccountabilityError(400, "Invalid selfie path");
  if (!useFirestore()) {
    memorySelfies.set(path, { bytes, retainUntil });
    return;
  }
  await bucket().file(path).save(bytes, { contentType: "image/jpeg", resumable: false, metadata: { metadata: { retainUntil: retainUntil ?? "" } } });
}

export async function readSelfie(path: string): Promise<Buffer | null> {
  if (!assertSelfiePath(path)) return null;
  if (!useFirestore()) return memorySelfies.get(path)?.bytes ?? null;
  const file = bucket().file(path);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [buf] = await file.download();
  return buf;
}

export async function deleteSelfie(path: string): Promise<void> {
  if (!assertSelfiePath(path)) return;
  if (!useFirestore()) {
    memorySelfies.delete(path);
    return;
  }
  await bucket().file(path).delete({ ignoreNotFound: true });
}

export async function clearExpiredSelfies(now: Date): Promise<number> {
  let removed = 0;
  const expire = async (path: string | null, until: string | null) => {
    if (!path || !until || Date.parse(until) > now.getTime()) return;
    await deleteSelfie(path);
    removed += 1;
  };
  if (!useFirestore()) {
    for (const [path, row] of memorySelfies) await expire(path, row.retainUntil);
    return removed;
  }
  const [enroll, visits, pings, days] = await Promise.all([
    fs().collection(ENROLL).get(),
    fs().collection(VISITS).get(),
    fs().collection(PINGS).get(),
    fs().collection("attendance_days").get(),
  ]);
  for (const doc of enroll.docs) await expire(doc.data().selfiePath, doc.data().retainUntil);
  for (const doc of visits.docs) await expire(doc.data().selfiePath, doc.data().retainUntil);
  for (const doc of pings.docs) await expire(doc.data().selfiePath, doc.data().retainUntil);
  for (const doc of days.docs) await expire(doc.data().faceSelfiePath, doc.data().faceRetainUntil);
  return removed;
}
