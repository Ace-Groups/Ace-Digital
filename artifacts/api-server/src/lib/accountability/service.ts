import { store } from "@workspace/db";
import {
  FACE_CONSENT_VERSION,
  buildScorecard,
  decideFaceMatch,
  decideVisit,
  distanceMeters,
  embeddingFromLandmarks,
  isIdle,
  isValidLatLng,
  normalizeAccountabilitySettings,
  parseHm,
  pingAction,
  plannedSlots,
  retainUntil,
  weekBounds,
  withinTimeWindow,
  type AccountabilitySettings,
  type FaceLandmarks,
  type Scorecard,
} from "@workspace/accountability";
import { setDayFaceReview, type FaceStamp } from "../attendance/store";
import { teamDays } from "../attendance/service";
import { kolkataDate, kolkataMinutes } from "../attendance/status";
import {
  AccountabilityError,
  activeEnrollment,
  clearExpiredSelfies,
  deleteSelfie,
  getAccountabilitySettings,
  getEnrollment,
  getPing,
  getReview,
  getVisit,
  getWorkLog,
  listPings,
  listReviews,
  listVisits,
  listWorkLogsBetween,
  logId,
  newId,
  readSelfie,
  saveAccountabilitySettings,
  saveEnrollment,
  savePing,
  saveReview,
  saveVisit,
  saveWorkLog,
  selfiePathFor,
  writeSelfie,
  type FaceEnrollment,
  type FaceReview,
  type FieldVisit,
  type PresencePing,
  type WorkLog,
} from "./store";

const MANAGER_ROLES = new Set(["super_admin", "management", "hr"]);
const READER_ROLES = new Set(["super_admin", "management", "hr", "finance"]);
const OWNER_ROLES = new Set(["super_admin", "management"]);

export function isPeopleManager(role: string): boolean {
  return MANAGER_ROLES.has(role);
}

export function canReadTeam(role: string): boolean {
  return READER_ROLES.has(role);
}

export function canEditAccountabilitySettings(role: string): boolean {
  return OWNER_ROLES.has(role);
}

export type FacePayload = {
  imageBase64?: string;
  embedding?: number[] | null;
  liveness?: "passed" | "failed" | "unavailable" | null;
  landmarks?: FaceLandmarks | null;
};

export function decodeJpeg(input: string): Buffer {
  const raw = input.replace(/^data:image\/\w+;base64,/, "").trim();
  const bytes = Buffer.from(raw, "base64");
  if (bytes.length < 32 || bytes.length > 1.5 * 1024 * 1024) {
    throw new AccountabilityError(400, "Selfie must be a photo under 1.5 MB");
  }
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new AccountabilityError(400, "Selfie must be a JPEG");
  }
  return bytes;
}

function liveEmbedding(payload: FacePayload): number[] | null {
  if (payload.landmarks) {
    const fromMarks = embeddingFromLandmarks(payload.landmarks);
    if (fromMarks) return fromMarks;
  }
  if (Array.isArray(payload.embedding) && payload.embedding.length === 12) return payload.embedding;
  return null;
}

export async function enrollFace(userId: number, payload: FacePayload & { consent?: boolean; consentVersion?: string }) {
  if (payload.consent !== true || payload.consentVersion !== FACE_CONSENT_VERSION) {
    throw new AccountabilityError(409, "Face check-in needs the current consent");
  }
  if (!payload.imageBase64) throw new AccountabilityError(400, "A selfie is required");
  const embedding = liveEmbedding(payload);
  if (!embedding) throw new AccountabilityError(400, "No face measurement was captured");
  const bytes = decodeJpeg(payload.imageBase64);
  const path = selfiePathFor(userId);
  const until = retainUntil(new Date());
  await writeSelfie(path, bytes, until);
  const row: FaceEnrollment = {
    userId,
    consent: true,
    consentVersion: FACE_CONSENT_VERSION,
    consentedAt: new Date().toISOString(),
    withdrawnAt: null,
    embedding,
    selfiePath: path,
    retainUntil: until,
    updatedAt: new Date().toISOString(),
  };
  return saveEnrollment(row);
}

export function publicEnrollment(row: FaceEnrollment | null, viewerId: number) {
  if (!row) return null;
  return {
    userId: row.userId,
    consent: row.consent,
    consentVersion: row.consentVersion,
    consentedAt: row.consentedAt,
    withdrawnAt: row.withdrawnAt,
    enrolled: activeEnrollment(row) != null,
    embedding: viewerId === row.userId ? row.embedding : undefined,
    selfiePath: row.selfiePath,
    retainUntil: row.retainUntil,
  };
}

export async function withdrawFace(userId: number): Promise<FaceEnrollment> {
  const existing = await getEnrollment(userId);
  if (existing?.selfiePath) await deleteSelfie(existing.selfiePath);
  const row: FaceEnrollment = {
    userId,
    consent: false,
    consentVersion: existing?.consentVersion ?? null,
    consentedAt: existing?.consentedAt ?? null,
    withdrawnAt: new Date().toISOString(),
    embedding: [],
    selfiePath: null,
    retainUntil: null,
    updatedAt: new Date().toISOString(),
  };
  return saveEnrollment(row);
}

async function openReview(input: {
  userId: number;
  source: FaceReview["source"];
  sourceId: string;
  score: number | null;
  reason: string;
  selfiePath: string | null;
}): Promise<FaceReview> {
  const row: FaceReview = {
    id: newId("fr"),
    userId: input.userId,
    source: input.source,
    sourceId: input.sourceId,
    status: "pending",
    score: input.score,
    reason: input.reason,
    selfiePath: input.selfiePath,
    note: null,
    decidedById: null,
    decidedAt: null,
    createdAt: new Date().toISOString(),
  };
  return saveReview(row);
}

export async function faceStampForCheckIn(userId: number, payload: FacePayload, now = new Date()): Promise<FaceStamp> {
  const enrolled = activeEnrollment(await getEnrollment(userId));
  if (!enrolled) throw new AccountabilityError(409, "Enroll a face before a face check-in");
  if (!payload.imageBase64) throw new AccountabilityError(400, "A selfie is required");
  const bytes = decodeJpeg(payload.imageBase64);
  const path = selfiePathFor(userId);
  const until = retainUntil(now);
  await writeSelfie(path, bytes, until);
  const decision = decideFaceMatch(enrolled.embedding, liveEmbedding(payload), payload.liveness ?? null);
  let reviewId: string | null = null;
  let reviewStatus: FaceStamp["faceReviewStatus"] = null;
  if (decision.result === "review") {
    const review = await openReview({
      userId,
      source: "attendance",
      sourceId: `${userId}_${kolkataDate(now)}`,
      score: decision.score,
      reason: decision.reason,
      selfiePath: path,
    });
    reviewId = review.id;
    reviewStatus = "pending";
  }
  return {
    faceMatchScore: decision.score,
    faceMatchResult: decision.result,
    faceLiveness: payload.liveness ?? null,
    faceSelfiePath: path,
    faceRetainUntil: until,
    faceReviewStatus: reviewStatus,
    faceReviewId: reviewId,
  };
}

export function validateVisitDraft(body: Record<string, unknown>) {
  const clientName = typeof body.clientName === "string" ? body.clientName.trim() : "";
  if (clientName.length < 2 || clientName.length > 120) {
    throw new AccountabilityError(400, "Client name must be 2–120 characters");
  }
  const lat = Number(body.lat ?? body.latitude);
  const lng = Number(body.lng ?? body.longitude);
  if (!isValidLatLng(lat, lng)) throw new AccountabilityError(400, "Pick a valid map location");
  const date = typeof body.date === "string" ? body.date : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AccountabilityError(400, "Date must be YYYY-MM-DD");
  const windowStart = typeof body.windowStart === "string" ? body.windowStart : "";
  const windowEnd = typeof body.windowEnd === "string" ? body.windowEnd : "";
  const start = parseHm(windowStart);
  const end = parseHm(windowEnd);
  if (start == null || end == null || end <= start) {
    throw new AccountabilityError(400, "End time must be after the start time");
  }
  const radiusMeters = body.radiusMeters == null ? 200 : Number(body.radiusMeters);
  if (!Number.isFinite(radiusMeters) || radiusMeters < 50 || radiusMeters > 5000) {
    throw new AccountabilityError(400, "Radius must be between 50 and 5000 metres");
  }
  const employeeId = Number(body.employeeId);
  if (!Number.isFinite(employeeId)) throw new AccountabilityError(400, "Choose an employee");
  return { clientName, lat, lng, date, windowStart, windowEnd, radiusMeters, employeeId };
}

export async function assignVisit(actorId: number, body: Record<string, unknown>): Promise<FieldVisit> {
  const draft = validateVisitDraft(body);
  const user = await store.findUserById(draft.employeeId);
  if (!user || user.status !== "active") throw new AccountabilityError(404, "Employee not found");
  const row: FieldVisit = {
    id: newId("fv"),
    clientName: draft.clientName,
    lat: draft.lat,
    lng: draft.lng,
    date: draft.date,
    windowStart: draft.windowStart,
    windowEnd: draft.windowEnd,
    radiusMeters: draft.radiusMeters,
    employeeId: user.id,
    employeeName: user.fullName,
    assignedById: actorId,
    status: "assigned",
    distanceMeters: null,
    accuracy: null,
    mocked: null,
    fixLat: null,
    fixLng: null,
    withinRadius: null,
    faceMatchScore: null,
    faceMatchResult: null,
    liveness: null,
    selfiePath: null,
    retainUntil: null,
    flagReason: null,
    checkedInAt: null,
    createdAt: new Date().toISOString(),
  };
  return saveVisit(row);
}

export async function checkInVisit(
  userId: number,
  visitId: string,
  body: FacePayload & {
    latitude?: number;
    longitude?: number;
    accuracy?: number | null;
    mocked?: boolean | null;
  },
  now = new Date(),
): Promise<FieldVisit> {
  const visit = await getVisit(visitId);
  if (!visit) throw new AccountabilityError(404, "Visit not found");
  if (visit.employeeId !== userId) throw new AccountabilityError(403, "This visit is assigned to someone else");
  if (visit.checkedInAt) throw new AccountabilityError(409, "Already checked in for this visit");
  if (visit.date !== kolkataDate(now)) throw new AccountabilityError(409, "This visit is for another day");
  const lat = Number(body.latitude);
  const lng = Number(body.longitude);
  if (!isValidLatLng(lat, lng)) throw new AccountabilityError(400, "A location fix is required");
  const enrolled = activeEnrollment(await getEnrollment(userId));
  if (!enrolled) throw new AccountabilityError(409, "Enroll a face before a visit check-in");
  if (!body.imageBase64) throw new AccountabilityError(400, "A selfie is required");
  const bytes = decodeJpeg(body.imageBase64);
  const path = selfiePathFor(userId);
  const until = retainUntil(now);
  await writeSelfie(path, bytes, until);
  const decision = decideFaceMatch(enrolled.embedding, liveEmbedding(body), body.liveness ?? null);
  const accuracy = body.accuracy == null || !Number.isFinite(Number(body.accuracy)) ? null : Number(body.accuracy);
  const mocked = body.mocked === true ? true : body.mocked === false ? false : null;
  const meters = distanceMeters({ lat: visit.lat, lng: visit.lng }, { lat, lng });
  const outcome = decideVisit({
    mocked,
    distanceMeters: meters,
    radiusMeters: visit.radiusMeters,
    accuracy,
    withinWindow: withinTimeWindow(kolkataMinutes(now), visit.windowStart, visit.windowEnd),
    faceNeedsReview: decision.result === "review",
  });
  if (decision.result === "review" || outcome.status === "pending_review") {
    await openReview({
      userId,
      source: "visit",
      sourceId: visit.id,
      score: decision.score,
      reason: decision.result === "review" ? decision.reason : outcome.flagReason ?? "review",
      selfiePath: path,
    });
  }
  return saveVisit({
    ...visit,
    status: outcome.status,
    distanceMeters: Math.round(meters),
    accuracy,
    mocked,
    fixLat: lat,
    fixLng: lng,
    withinRadius: outcome.withinRadius,
    faceMatchScore: decision.score,
    faceMatchResult: decision.result,
    liveness: body.liveness ?? null,
    selfiePath: path,
    retainUntil: until,
    flagReason: outcome.flagReason,
    checkedInAt: now.toISOString(),
  });
}

export async function saveDayLog(userId: number, date: string, summary: string, links: unknown): Promise<WorkLog> {
  const text = summary.trim();
  if (text.length < 3 || text.length > 2000) {
    throw new AccountabilityError(400, "Work log must be 3–2000 characters");
  }
  const clean = Array.isArray(links)
    ? links.filter((link): link is string => typeof link === "string" && /^https?:\/\//i.test(link.trim())).slice(0, 5)
    : [];
  if (Array.isArray(links) && links.length > 5) throw new AccountabilityError(400, "Add at most 5 links");
  return saveWorkLog({
    id: logId(userId, date),
    userId,
    date,
    summary: text,
    links: clean.map((link) => link.trim()),
    updatedAt: new Date().toISOString(),
  });
}

function dueIso(slotDate: string, minute: number, windowMinutes: number): string {
  const [year, month, day] = slotDate.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 6, 30, 0));
  return new Date(start.getTime() + (minute + windowMinutes) * 60 * 1000).toISOString();
}

export async function syncPings(userId: number, now = new Date()): Promise<PresencePing[]> {
  const settings = await getAccountabilitySettings();
  const date = kolkataDate(now);
  const existing = await listPings({ userId, date });
  const action = pingAction({
    enabled: settings.presencePingsEnabled,
    slots: plannedSlots(userId, date, settings),
    nowMinutes: kolkataMinutes(now),
    windowMinutes: settings.responseWindowMinutes,
    existing: existing.map((ping) => ({ slotMinute: ping.slotMinute, status: ping.status })),
  });
  for (const minute of action.create) {
    await savePing({
      id: newId("pp"),
      userId,
      date,
      slotMinute: minute,
      status: "pending",
      createdAt: now.toISOString(),
      confirmedAt: null,
      selfiePath: null,
      faceMatchScore: null,
      faceMatchResult: null,
      dueAt: dueIso(date, minute, settings.responseWindowMinutes),
    });
  }
  for (const minute of action.expire) {
    const ping = existing.find((row) => row.slotMinute === minute && row.status === "pending");
    if (ping) await savePing({ ...ping, status: "expired" });
  }
  return listPings({ userId, date });
}

export async function confirmPing(userId: number, pingId: string, payload: FacePayload, now = new Date()): Promise<PresencePing> {
  const ping = await getPing(pingId);
  if (!ping || ping.userId !== userId) throw new AccountabilityError(404, "Ping not found");
  if (ping.status !== "pending") throw new AccountabilityError(409, "This presence check is already closed");
  const enrolled = activeEnrollment(await getEnrollment(userId));
  if (!enrolled) throw new AccountabilityError(409, "Enroll a face before confirming presence");
  if (!payload.imageBase64) throw new AccountabilityError(400, "A selfie is required");
  const bytes = decodeJpeg(payload.imageBase64);
  const path = selfiePathFor(userId);
  const until = retainUntil(now);
  await writeSelfie(path, bytes, until);
  const decision = decideFaceMatch(enrolled.embedding, liveEmbedding(payload), payload.liveness ?? null);
  if (decision.result === "review") {
    await openReview({
      userId,
      source: "ping",
      sourceId: ping.id,
      score: decision.score,
      reason: decision.reason,
      selfiePath: path,
    });
  }
  return savePing({
    ...ping,
    status: "confirmed",
    confirmedAt: now.toISOString(),
    selfiePath: path,
    faceMatchScore: decision.score,
    faceMatchResult: decision.result,
  });
}

export async function decideReview(actorId: number, reviewId: string, decision: "accepted" | "declined", note: string) {
  const text = note.trim();
  if (text.length < 3) throw new AccountabilityError(400, "Add a short note");
  const review = await getReview(reviewId);
  if (!review) throw new AccountabilityError(404, "Review not found");
  const next = await saveReview({
    ...review,
    status: decision,
    note: text,
    decidedById: actorId,
    decidedAt: new Date().toISOString(),
  });
  if (review.source === "attendance") {
    const [userRaw, date] = review.sourceId.split("_");
    const userId = Number(userRaw);
    if (Number.isFinite(userId) && date) await setDayFaceReview(userId, date, decision, review.id);
  }
  return next;
}

export async function scorecardFor(userId: number, fullName: string, weekDate: string, now = new Date()): Promise<Scorecard> {
  const bounds = weekBounds(weekDate);
  const [days, tasks, reviews, pings, logs] = await Promise.all([
    teamDays(bounds.start, bounds.end, now, userId),
    store.listTasks({ assigneeId: userId }),
    listReviews({ userId, start: bounds.start, end: bounds.end }),
    listPings({ userId, start: bounds.start, end: bounds.end }),
    listWorkLogsBetween(bounds.start, bounds.end, userId),
  ]);
  const dueTasks = tasks.filter((task) => {
    if (!task.dueDate) return false;
    const due = task.dueDate.toISOString().slice(0, 10);
    return due >= bounds.start && due <= bounds.end;
  });
  return buildScorecard({
    userId,
    fullName,
    weekStart: bounds.start,
    weekEnd: bounds.end,
    days: days.map((day) => ({ status: day.status })),
    tasks: dueTasks.map((task) => ({
      dueOn: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
      completedOn: task.status === "DONE" && task.updatedAt ? task.updatedAt.toISOString() : null,
      done: task.status === "DONE",
    })),
    reviews: reviews.map((review) => ({ decision: review.status })),
    pingsConfirmed: pings.filter((ping) => ping.status === "confirmed").length,
    pingsMissed: pings.filter((ping) => ping.status === "expired").length,
  });
}

export async function alertsFor(now = new Date()) {
  const settings = await getAccountabilitySettings();
  const date = kolkataDate(now);
  const minutes = kolkataMinutes(now);
  const people = await store.listUsers({ status: "active" });
  const alerts: { userId: number; fullName: string; quietMinutes: number }[] = [];
  for (const person of people) {
    const days = await teamDays(date, date, now, person.id);
    const day = days[0];
    if (!day?.checkInAt) continue;
    const log = await getWorkLog(person.id, date);
    const quietMinutes = Math.max(0, Math.round((now.getTime() - Date.parse(day.checkInAt)) / 60000));
    if (
      isIdle({
        checkedIn: true,
        hasWorkLog: Boolean(log),
        nowMinutes: minutes,
        officeStart: settings.officeStart,
        officeEnd: settings.officeEnd,
        quietMinutes,
        idleHours: settings.idleHours,
      })
    ) {
      alerts.push({ userId: person.id, fullName: person.fullName, quietMinutes });
    }
  }
  return alerts;
}

export async function visitsFor(role: string, userId: number, date?: string): Promise<FieldVisit[]> {
  if (canReadTeam(role)) return listVisits(date ? { date } : {});
  return listVisits({ employeeId: userId, date });
}

export async function readSettings(): Promise<AccountabilitySettings> {
  return getAccountabilitySettings();
}

export async function writeSettings(role: string, actorId: number, body: Partial<AccountabilitySettings>) {
  if (!canEditAccountabilitySettings(role)) throw new AccountabilityError(403, "Forbidden");
  const current = await getAccountabilitySettings();
  return saveAccountabilitySettings(normalizeAccountabilitySettings({ ...current, ...body }), actorId);
}

export async function sweep(now = new Date()): Promise<void> {
  try {
    await clearExpiredSelfies(now);
  } catch {
    /* retention is best-effort and must not block a request */
  }
}

export {
  getEnrollment,
  getWorkLog,
  listReviews,
  listVisits,
  getVisit,
  readSelfie,
};
