import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { AttendanceError, type GeoPoint } from "../lib/attendance/store";
import {
  correctDay,
  dayAudit,
  monthCsv,
  monthForUser,
  myToday,
  punchIn,
  punchOut,
  readSettings,
  roster,
  summary,
  writeSettings,
} from "../lib/attendance/service";
import {
  ATTENDANCE_STATUSES,
  isIsoDate,
  monthBounds,
  normalizeSettings,
  type AttendanceStatus,
} from "../lib/attendance/status";
import { AccountabilityError } from "../lib/accountability/store";
import { faceStampForCheckIn } from "../lib/accountability/service";
import { getAccountabilitySettings } from "../lib/accountability/store";

const router = Router();

const ROSTER_ROLES = new Set(["super_admin", "management", "hr", "finance"]);
const OVERRIDE_ROLES = new Set(["super_admin", "management", "hr"]);
const SETTINGS_ROLES = new Set(["super_admin", "management"]);

function geoFrom(body: Record<string, unknown>): GeoPoint | null {
  if (body.latitude == null && body.longitude == null) return null;
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  const accuracy = body.accuracy == null ? null : Number(body.accuracy);
  return {
    latitude,
    longitude,
    accuracy: accuracy != null && Number.isFinite(accuracy) ? accuracy : null,
  };
}

function noteFrom(body: Record<string, unknown>): string | null {
  if (typeof body.planNote !== "string") return null;
  const note = body.planNote.trim().slice(0, 280);
  return note || null;
}

function teamFilter(raw: unknown): number | null {
  if (raw == null || raw === "" || raw === "all") return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

async function sendSummary(req: Parameters<typeof requireAuth>[0], res: Parameters<typeof requireAuth>[1]): Promise<void> {
  const ctx = getAccessContext(req);
  if (ctx.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const date = typeof req.query.date === "string" ? req.query.date : "";
  const month = typeof req.query.month === "string" ? req.query.month : "";
  if (Boolean(date) === Boolean(month)) {
    res.status(400).json({ error: "Pass date=YYYY-MM-DD or month=YYYY-MM" });
    return;
  }
  if (date && !isIsoDate(date)) {
    res.status(400).json({ error: "date must be YYYY-MM-DD" });
    return;
  }
  if (month && !monthBounds(month)) {
    res.status(400).json({ error: "month must be YYYY-MM" });
    return;
  }
  const body = await summary({
    date: date || undefined,
    month: month || undefined,
    teamId: teamFilter(req.query.teamId),
  });
  res.json(body);
}

router.get("/v1/attendance/today", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  res.json(await myToday(ctx.userId));
});

router.post("/v1/attendance/check-in", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const note = noteFrom(body);
    const settings = await getAccountabilitySettings();
    if (settings.requireDailyPlan && !note) {
      res.status(400).json({ error: "Add a short plan for today" });
      return;
    }
    const face = body.face ? await faceStampForCheckIn(ctx.userId, body.face as never) : null;
    const day = await punchIn(ctx.userId, note, geoFrom(body), new Date(), face);
    res.status(201).json(day);
  } catch (err) {
    if (err instanceof AttendanceError || err instanceof AccountabilityError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    throw err;
  }
});

router.post("/v1/attendance/check-out", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  try {
    const day = await punchOut(ctx.userId, geoFrom(req.body ?? {}));
    res.json(day);
  } catch (err) {
    if (err instanceof AttendanceError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    throw err;
  }
});

router.get("/v1/attendance/roster", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  if (!ROSTER_ROLES.has(ctx.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const date = typeof req.query.date === "string" && req.query.date ? req.query.date : "";
  const resolved = date || (await myToday(ctx.userId)).date;
  if (!isIsoDate(resolved)) {
    res.status(400).json({ error: "date must be YYYY-MM-DD" });
    return;
  }
  res.json(await roster(resolved, teamFilter(req.query.teamId)));
});

router.get("/v1/attendance/month", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const month = typeof req.query.month === "string" ? req.query.month : "";
  if (!monthBounds(month)) {
    res.status(400).json({ error: "month must be YYYY-MM" });
    return;
  }
  const requested = req.query.userId != null && req.query.userId !== "" ? Number(req.query.userId) : ctx.userId;
  if (!Number.isFinite(requested)) {
    res.status(400).json({ error: "userId must be a number" });
    return;
  }
  if (requested !== ctx.userId && !ROSTER_ROLES.has(ctx.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const report = await monthForUser(requested, month);
  if (!report) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.json(report);
});

router.get("/v1/attendance/month.csv", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const month = typeof req.query.month === "string" ? req.query.month : "";
  if (!monthBounds(month)) {
    res.status(400).json({ error: "month must be YYYY-MM" });
    return;
  }
  const requested = req.query.userId != null && req.query.userId !== "" ? Number(req.query.userId) : ctx.userId;
  if (!Number.isFinite(requested)) {
    res.status(400).json({ error: "userId must be a number" });
    return;
  }
  if (requested !== ctx.userId && !ROSTER_ROLES.has(ctx.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const csv = await monthCsv(requested, month);
  if (!csv) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="attendance-${requested}-${month}.csv"`);
  res.send(csv);
});

router.get("/v1/attendance/:userId/:date/audit", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const userId = Number(req.params.userId);
  const date = String(req.params.date);
  if (!Number.isFinite(userId) || !isIsoDate(date)) {
    res.status(400).json({ error: "userId and date=YYYY-MM-DD are required" });
    return;
  }
  if (userId !== ctx.userId && !ROSTER_ROLES.has(ctx.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(await dayAudit(userId, date));
});

router.patch("/v1/attendance/:userId/:date", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  if (!OVERRIDE_ROLES.has(ctx.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const userId = Number(req.params.userId);
  const date = String(req.params.date);
  const status = req.body?.status as AttendanceStatus;
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  if (!Number.isFinite(userId) || !isIsoDate(date)) {
    res.status(400).json({ error: "userId and date=YYYY-MM-DD are required" });
    return;
  }
  if (!ATTENDANCE_STATUSES.includes(status) || status === "not_in") {
    res.status(400).json({ error: "status must be present, late, half_day, absent, on_leave, or off" });
    return;
  }
  if (reason.length < 3) {
    res.status(400).json({ error: "A reason of at least 3 characters is required" });
    return;
  }
  const report = await correctDay({ userId, date, actorId: ctx.userId, status, reason });
  if (!report) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.json(report);
});

router.get("/v1/attendance/settings", requireAuth, async (_req, res): Promise<void> => {
  res.json(await readSettings());
});

router.put("/v1/attendance/settings", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  if (!SETTINGS_ROLES.has(ctx.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const next = normalizeSettings(req.body ?? {});
  res.json(await writeSettings(next, ctx.userId));
});

router.get("/v1/attendance/summary", requireAuth, (req, res, next) => {
  sendSummary(req, res).catch(next);
});

router.get("/attendance/summary", requireAuth, (req, res, next) => {
  sendSummary(req, res).catch(next);
});

export default router;
