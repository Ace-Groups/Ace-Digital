import { ensureFirebaseAdminApp, useFirestore } from "@workspace/db";
import { getFirestore, type DocumentData, type Firestore } from "firebase-admin/firestore";
import {
  DEFAULT_ATTENDANCE_SETTINGS,
  normalizeSettings,
  type AttendanceSettings,
  type AttendanceStatus,
} from "./status";

export class AttendanceError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export type GeoPoint = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export type AttendanceDay = {
  userId: number;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  planNote: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkInAccuracy: number | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  checkOutAccuracy: number | null;
  overrideStatus: AttendanceStatus | null;
  overrideReason: string | null;
  overrideById: number | null;
  overrideAt: string | null;
};

export type AttendanceAudit = {
  id: string;
  userId: number;
  date: string;
  actorId: number;
  action: "check_in" | "check_out" | "override";
  reason: string | null;
  at: string;
  beforeStatus: string | null;
  afterStatus: string | null;
};

const DAYS = "attendance_days";
const SETTINGS = "attendance_settings";

const memoryDays = new Map<string, AttendanceDay>();
const memoryAudit = new Map<string, AttendanceAudit[]>();
let memorySettings: AttendanceSettings = {
  ...DEFAULT_ATTENDANCE_SETTINGS,
  weeklyOff: [...DEFAULT_ATTENDANCE_SETTINGS.weeklyOff],
  holidays: [],
};

function dayKey(userId: number, date: string): string {
  return `${userId}_${date}`;
}

function fs(): Firestore {
  ensureFirebaseAdminApp();
  return getFirestore();
}

function blank(userId: number, date: string): AttendanceDay {
  return {
    userId,
    date,
    checkInAt: null,
    checkOutAt: null,
    planNote: null,
    checkInLat: null,
    checkInLng: null,
    checkInAccuracy: null,
    checkOutLat: null,
    checkOutLng: null,
    checkOutAccuracy: null,
    overrideStatus: null,
    overrideReason: null,
    overrideById: null,
    overrideAt: null,
  };
}

function mapDay(data: DocumentData): AttendanceDay {
  return {
    userId: Number(data.userId),
    date: String(data.date),
    checkInAt: (data.checkInAt as string | null) ?? null,
    checkOutAt: (data.checkOutAt as string | null) ?? null,
    planNote: (data.planNote as string | null) ?? null,
    checkInLat: numOrNull(data.checkInLat),
    checkInLng: numOrNull(data.checkInLng),
    checkInAccuracy: numOrNull(data.checkInAccuracy),
    checkOutLat: numOrNull(data.checkOutLat),
    checkOutLng: numOrNull(data.checkOutLng),
    checkOutAccuracy: numOrNull(data.checkOutAccuracy),
    overrideStatus: (data.overrideStatus as AttendanceStatus | null) ?? null,
    overrideReason: (data.overrideReason as string | null) ?? null,
    overrideById: data.overrideById == null ? null : Number(data.overrideById),
    overrideAt: (data.overrideAt as string | null) ?? null,
  };
}

function numOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapAudit(id: string, data: DocumentData): AttendanceAudit {
  return {
    id,
    userId: Number(data.userId),
    date: String(data.date),
    actorId: Number(data.actorId),
    action: data.action as AttendanceAudit["action"],
    reason: (data.reason as string | null) ?? null,
    at: String(data.at),
    beforeStatus: (data.beforeStatus as string | null) ?? null,
    afterStatus: (data.afterStatus as string | null) ?? null,
  };
}

export async function getAttendanceSettings(): Promise<AttendanceSettings> {
  if (!useFirestore()) {
    return {
      ...memorySettings,
      weeklyOff: [...memorySettings.weeklyOff],
      holidays: [...memorySettings.holidays],
    };
  }
  const snap = await fs().collection(SETTINGS).doc("default").get();
  if (!snap.exists) return normalizeSettings(DEFAULT_ATTENDANCE_SETTINGS);
  return normalizeSettings(snap.data() as Partial<AttendanceSettings>);
}

export async function saveAttendanceSettings(
  next: AttendanceSettings,
  actorId: number,
): Promise<AttendanceSettings> {
  const clean = normalizeSettings(next);
  const payload = { ...clean, updatedAt: new Date().toISOString(), updatedById: actorId };
  if (!useFirestore()) {
    memorySettings = clean;
    return clean;
  }
  await fs().collection(SETTINGS).doc("default").set(payload, { merge: true });
  return clean;
}

export async function listDaysOnDate(date: string): Promise<AttendanceDay[]> {
  if (!useFirestore()) {
    return [...memoryDays.values()].filter((day) => day.date === date);
  }
  const snap = await fs().collection(DAYS).where("date", "==", date).get();
  return snap.docs.map((doc) => mapDay(doc.data()));
}

export async function listDaysBetween(start: string, end: string): Promise<AttendanceDay[]> {
  if (!useFirestore()) {
    return [...memoryDays.values()].filter((day) => day.date >= start && day.date <= end);
  }
  const snap = await fs()
    .collection(DAYS)
    .where("date", ">=", start)
    .where("date", "<=", end)
    .get();
  return snap.docs.map((doc) => mapDay(doc.data()));
}

export async function getDay(userId: number, date: string): Promise<AttendanceDay | null> {
  const key = dayKey(userId, date);
  if (!useFirestore()) return memoryDays.get(key) ?? null;
  const snap = await fs().collection(DAYS).doc(key).get();
  if (!snap.exists) return null;
  return mapDay(snap.data()!);
}

async function writeAudit(entry: Omit<AttendanceAudit, "id">, parentKey: string): Promise<void> {
  if (!useFirestore()) {
    const list = memoryAudit.get(parentKey) ?? [];
    list.push({ ...entry, id: `${list.length + 1}` });
    memoryAudit.set(parentKey, list);
    return;
  }
  await fs().collection(DAYS).doc(parentKey).collection("audit").add(entry);
}

export async function listAudit(userId: number, date: string): Promise<AttendanceAudit[]> {
  const key = dayKey(userId, date);
  if (!useFirestore()) {
    return [...(memoryAudit.get(key) ?? [])].sort((a, b) => a.at.localeCompare(b.at));
  }
  const snap = await fs().collection(DAYS).doc(key).collection("audit").get();
  return snap.docs
    .map((doc) => mapAudit(doc.id, doc.data()))
    .sort((a, b) => a.at.localeCompare(b.at));
}

export async function checkInDay(input: {
  userId: number;
  date: string;
  planNote: string | null;
  geo: GeoPoint | null;
  beforeStatus: string | null;
}): Promise<AttendanceDay> {
  const key = dayKey(input.userId, input.date);
  const at = new Date().toISOString();

  const apply = (existing: AttendanceDay | null): AttendanceDay => {
    if (existing?.checkInAt) {
      throw new AttendanceError(409, "Already checked in today");
    }
    if (existing?.checkOutAt) {
      throw new AttendanceError(409, "Already checked out today");
    }
    return {
      ...(existing ?? blank(input.userId, input.date)),
      checkInAt: at,
      planNote: input.planNote,
      checkInLat: input.geo?.latitude ?? null,
      checkInLng: input.geo?.longitude ?? null,
      checkInAccuracy: input.geo?.accuracy ?? null,
    };
  };

  if (!useFirestore()) {
    const next = apply(memoryDays.get(key) ?? null);
    memoryDays.set(key, next);
    await writeAudit(
      {
        userId: input.userId,
        date: input.date,
        actorId: input.userId,
        action: "check_in",
        reason: input.planNote,
        at,
        beforeStatus: input.beforeStatus,
        afterStatus: null,
      },
      key,
    );
    return next;
  }

  const ref = fs().collection(DAYS).doc(key);
  const next = await fs().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? mapDay(snap.data()!) : null;
    const row = apply(existing);
    tx.set(ref, row);
    tx.set(ref.collection("audit").doc(), {
      userId: input.userId,
      date: input.date,
      actorId: input.userId,
      action: "check_in",
      reason: input.planNote,
      at,
      beforeStatus: input.beforeStatus,
      afterStatus: null,
    });
    return row;
  });
  return next;
}

export async function checkOutDay(input: {
  userId: number;
  date: string;
  geo: GeoPoint | null;
  beforeStatus: string | null;
}): Promise<AttendanceDay> {
  const key = dayKey(input.userId, input.date);
  const at = new Date().toISOString();

  const apply = (existing: AttendanceDay | null): AttendanceDay => {
    if (!existing?.checkInAt) throw new AttendanceError(409, "Check in before checking out");
    if (existing.checkOutAt) throw new AttendanceError(409, "Already checked out today");
    return {
      ...existing,
      checkOutAt: at,
      checkOutLat: input.geo?.latitude ?? null,
      checkOutLng: input.geo?.longitude ?? null,
      checkOutAccuracy: input.geo?.accuracy ?? null,
    };
  };

  if (!useFirestore()) {
    const next = apply(memoryDays.get(key) ?? null);
    memoryDays.set(key, next);
    await writeAudit(
      {
        userId: input.userId,
        date: input.date,
        actorId: input.userId,
        action: "check_out",
        reason: null,
        at,
        beforeStatus: input.beforeStatus,
        afterStatus: null,
      },
      key,
    );
    return next;
  }

  const ref = fs().collection(DAYS).doc(key);
  return fs().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? mapDay(snap.data()!) : null;
    const row = apply(existing);
    tx.set(ref, row, { merge: true });
    tx.set(ref.collection("audit").doc(), {
      userId: input.userId,
      date: input.date,
      actorId: input.userId,
      action: "check_out",
      reason: null,
      at,
      beforeStatus: input.beforeStatus,
      afterStatus: null,
    });
    return row;
  });
}

export async function overrideDay(input: {
  userId: number;
  date: string;
  actorId: number;
  status: AttendanceStatus;
  reason: string;
  beforeStatus: string | null;
}): Promise<AttendanceDay> {
  const key = dayKey(input.userId, input.date);
  const at = new Date().toISOString();

  const apply = (existing: AttendanceDay | null): AttendanceDay => ({
    ...(existing ?? blank(input.userId, input.date)),
    overrideStatus: input.status,
    overrideReason: input.reason,
    overrideById: input.actorId,
    overrideAt: at,
  });

  if (!useFirestore()) {
    const next = apply(memoryDays.get(key) ?? null);
    memoryDays.set(key, next);
    await writeAudit(
      {
        userId: input.userId,
        date: input.date,
        actorId: input.actorId,
        action: "override",
        reason: input.reason,
        at,
        beforeStatus: input.beforeStatus,
        afterStatus: input.status,
      },
      key,
    );
    return next;
  }

  const ref = fs().collection(DAYS).doc(key);
  return fs().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? mapDay(snap.data()!) : null;
    const row = apply(existing);
    tx.set(ref, row, { merge: true });
    tx.set(ref.collection("audit").doc(), {
      userId: input.userId,
      date: input.date,
      actorId: input.actorId,
      action: "override",
      reason: input.reason,
      at,
      beforeStatus: input.beforeStatus,
      afterStatus: input.status,
    });
    return row;
  });
}
