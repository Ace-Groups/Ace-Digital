import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { store } from "@workspace/db";
import { kolkataDate, isIsoDate } from "../lib/attendance/status";
import { AccountabilityError, assertSelfiePath } from "../lib/accountability/store";
import {
  assignVisit,
  canEditAccountabilitySettings,
  canReadTeam,
  checkInVisit,
  confirmPing,
  decideReview,
  enrollFace,
  faceStampForCheckIn,
  alertsFor,
  getEnrollment,
  getWorkLog,
  isPeopleManager,
  listReviews,
  publicEnrollment,
  readSelfie,
  readSettings,
  saveDayLog,
  scorecardFor,
  sweep,
  syncPings,
  visitsFor,
  withdrawFace,
  writeSettings,
  type FacePayload,
} from "../lib/accountability/service";

const router = Router();

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function fail(res: { status: (code: number) => { json: (body: unknown) => void } }, err: unknown): boolean {
  if (err instanceof AccountabilityError) {
    res.status(err.statusCode).json({ error: err.message });
    return true;
  }
  return false;
}

function faceFrom(body: Record<string, unknown>): FacePayload {
  const face = (body.face ?? body) as FacePayload;
  return {
    imageBase64: typeof face.imageBase64 === "string" ? face.imageBase64 : undefined,
    embedding: Array.isArray(face.embedding) ? (face.embedding as number[]) : null,
    liveness: face.liveness ?? null,
    landmarks: face.landmarks ?? null,
  };
}

router.get("/v1/accountability/settings", requireAuth, async (_req, res): Promise<void> => {
  res.json(await readSettings());
});

router.put("/v1/accountability/settings", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  try {
    res.json(await writeSettings(ctx.role, ctx.userId, req.body ?? {}));
  } catch (err) {
    if (!fail(res, err)) throw err;
  }
});

router.get("/v1/face/enrollment", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const userId = req.query.userId != null && isPeopleManager(ctx.role) ? Number(req.query.userId) : ctx.userId;
  const row = await getEnrollment(userId);
  res.json(publicEnrollment(row, ctx.userId));
});

router.post("/v1/face/enrollment", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  try {
    const row = await enrollFace(ctx.userId, req.body ?? {});
    await sweep();
    res.status(201).json(publicEnrollment(row, ctx.userId));
  } catch (err) {
    if (!fail(res, err)) throw err;
  }
});

router.post("/v1/face/enrollment/withdraw", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const row = await withdrawFace(ctx.userId);
  res.json(publicEnrollment(row, ctx.userId));
});

router.get("/v1/face/reviews", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  if (isPeopleManager(ctx.role)) {
    res.json(await listReviews({ status }));
    return;
  }
  res.json(await listReviews({ userId: ctx.userId, status }));
});

router.post("/v1/face/reviews/:id", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  if (!isPeopleManager(ctx.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const decision = req.body?.decision === "declined" ? "declined" : req.body?.decision === "accepted" ? "accepted" : null;
  if (!decision) {
    res.status(400).json({ error: "decision must be accepted or declined" });
    return;
  }
  try {
    res.json(await decideReview(ctx.userId, paramId(req.params.id), decision, String(req.body?.note ?? "")));
  } catch (err) {
    if (!fail(res, err)) throw err;
  }
});

router.get("/v1/face/selfies", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const path = typeof req.query.path === "string" ? req.query.path : "";
  if (!assertSelfiePath(path)) {
    res.status(400).json({ error: "Invalid selfie path" });
    return;
  }
  const ownerId = Number(path.split("/")[1]);
  if (ownerId !== ctx.userId && !isPeopleManager(ctx.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const bytes = await readSelfie(path);
  if (!bytes) {
    res.status(404).json({ error: "Selfie not found" });
    return;
  }
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "private, no-store");
  res.send(bytes);
});

router.get("/v1/field-visits", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const date = typeof req.query.date === "string" ? req.query.date : undefined;
  res.json(await visitsFor(ctx.role, ctx.userId, date));
});

router.post("/v1/field-visits", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  if (!isPeopleManager(ctx.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    res.status(201).json(await assignVisit(ctx.userId, req.body ?? {}));
  } catch (err) {
    if (!fail(res, err)) throw err;
  }
});

router.post("/v1/field-visits/:id/check-in", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  try {
    const visit = await checkInVisit(ctx.userId, paramId(req.params.id), { ...faceFrom(req.body ?? {}), ...req.body });
    await sweep();
    res.status(201).json(visit);
  } catch (err) {
    if (!fail(res, err)) throw err;
  }
});

router.get("/v1/work-logs/today", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const date = kolkataDate(new Date());
  const userId = req.query.userId != null && canReadTeam(ctx.role) ? Number(req.query.userId) : ctx.userId;
  res.json(await getWorkLog(userId, date));
});

router.put("/v1/work-logs/today", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  try {
    const date = kolkataDate(new Date());
    res.json(await saveDayLog(ctx.userId, date, String(req.body?.summary ?? ""), req.body?.links));
  } catch (err) {
    if (!fail(res, err)) throw err;
  }
});

router.get("/v1/presence/today", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const settings = await readSettings();
  const pings = await syncPings(ctx.userId);
  res.json({
    pings,
    enabled: settings.presencePingsEnabled,
    note: "Presence checks are visible. Nothing is captured in the background.",
  });
});

router.post("/v1/presence/pings/:id/confirm", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  try {
    res.json(await confirmPing(ctx.userId, paramId(req.params.id), faceFrom(req.body ?? {})));
  } catch (err) {
    if (!fail(res, err)) throw err;
  }
});

router.get("/v1/accountability/scorecard", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const requested = req.query.userId != null ? Number(req.query.userId) : ctx.userId;
  if (requested !== ctx.userId && !canReadTeam(ctx.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const week = typeof req.query.week === "string" && isIsoDate(req.query.week) ? req.query.week : kolkataDate(new Date());
  const user = await store.findUserById(requested);
  if (!user) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.json(await scorecardFor(user.id, user.fullName, week));
});

router.get("/v1/accountability/scorecards", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const week = typeof req.query.week === "string" && isIsoDate(req.query.week) ? req.query.week : kolkataDate(new Date());
  if (!canReadTeam(ctx.role)) {
    const self = await store.findUserById(ctx.userId);
    res.json(self ? [await scorecardFor(self.id, self.fullName, week)] : []);
    return;
  }
  const people = await store.listUsers({ status: "active" });
  const cards = [];
  for (const person of people) cards.push(await scorecardFor(person.id, person.fullName, week));
  res.json(cards);
});

router.get("/v1/accountability/alerts", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  if (!isPeopleManager(ctx.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(await alertsFor());
});

export default router;
