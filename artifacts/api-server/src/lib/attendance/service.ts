import { store } from "@workspace/db";
import {
  checkInDay,
  checkOutDay,
  getAttendanceSettings,
  getDay,
  listAudit,
  listDaysBetween,
  listDaysOnDate,
  overrideDay,
  saveAttendanceSettings,
  type AttendanceAudit,
  type AttendanceDay,
  type GeoPoint,
} from "./store";
import {
  addDays,
  computeAttendanceStatus,
  countStatuses,
  dateInRanges,
  eachDate,
  kolkataDate,
  kolkataNoon,
  monthBounds,
  parseLeaveRange,
  summarizeMonth,
  type AttendanceSettings,
  type AttendanceStatus,
  type MonthTotals,
} from "./status";

type Person = {
  userId: number;
  fullName: string;
  teamId: number | null;
  teamName: string | null;
};

export type DayView = Person & {
  date: string;
  status: AttendanceStatus;
  lateArrival: boolean;
  workedMinutes: number | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  planNote: string | null;
  overrideStatus: AttendanceStatus | null;
  overrideReason: string | null;
  overrideById: number | null;
  overrideAt: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
};

async function activePeople(teamId: number | null): Promise<Person[]> {
  const [users, teams] = await Promise.all([
    store.listUsers({ status: "active" }),
    store.listTeams(),
  ]);
  const names = new Map(teams.map((team) => [team.id, team.name]));
  return users
    .filter((user) => teamId == null || user.teamId === teamId)
    .map((user) => ({
      userId: user.id,
      fullName: user.fullName,
      teamId: user.teamId,
      teamName: user.teamId ? names.get(user.teamId) ?? null : null,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

async function leaveByUser(start: string, end: string, userIds: number[]): Promise<Map<number, { start: string; end: string }[]>> {
  const wanted = new Set(userIds);
  const map = new Map<number, { start: string; end: string }[]>();
  const add = (userId: number, range: { start: string; end: string }) => {
    if (!wanted.has(userId)) return;
    const list = map.get(userId) ?? [];
    list.push(range);
    map.set(userId, list);
  };

  const approvals = await store.listApprovals({ status: "APPROVED" });
  for (const approval of approvals) {
    if (approval.type !== "LEAVE") continue;
    const range = parseLeaveRange(approval.description);
    if (!range || range.end < start || range.start > end) continue;
    add(approval.requestedById, range);
  }

  const events = await store.listCalendarEventsInRange(
    kolkataNoon(addDays(start, -45)),
    kolkataNoon(addDays(end, 2)),
  );
  for (const event of events) {
    const markedLeave =
      event.eventType === "leave_block" || event.sourceRef?.kind === "approval_leave";
    if (!markedLeave) continue;
    const range = {
      start: kolkataDate(event.startAt),
      end: event.endAt ? kolkataDate(event.endAt) : kolkataDate(event.startAt),
    };
    if (range.end < start || range.start > end) continue;
    add(event.ownerId, range);
    for (const attendeeId of event.attendeeIds ?? []) add(attendeeId, range);
  }
  return map;
}

function viewFor(
  person: Person,
  date: string,
  now: Date,
  settings: AttendanceSettings,
  punch: AttendanceDay | null,
  onLeave: boolean,
): DayView {
  const result = computeAttendanceStatus({
    date,
    now,
    settings,
    onLeave,
    punch: punch
      ? {
          checkInAt: punch.checkInAt,
          checkOutAt: punch.checkOutAt,
          overrideStatus: punch.overrideStatus,
        }
      : null,
  });
  return {
    ...person,
    date,
    status: result.status,
    lateArrival: result.lateArrival,
    workedMinutes: result.workedMinutes,
    checkInAt: punch?.checkInAt ?? null,
    checkOutAt: punch?.checkOutAt ?? null,
    planNote: punch?.planNote ?? null,
    overrideStatus: punch?.overrideStatus ?? null,
    overrideReason: punch?.overrideReason ?? null,
    overrideById: punch?.overrideById ?? null,
    overrideAt: punch?.overrideAt ?? null,
    checkInLat: punch?.checkInLat ?? null,
    checkInLng: punch?.checkInLng ?? null,
    checkOutLat: punch?.checkOutLat ?? null,
    checkOutLng: punch?.checkOutLng ?? null,
  };
}

export async function myToday(userId: number, now = new Date()) {
  const date = kolkataDate(now);
  const settings = await getAttendanceSettings();
  const people = await activePeople(null);
  const person = people.find((row) => row.userId === userId) ?? {
    userId,
    fullName: "You",
    teamId: null,
    teamName: null,
  };
  const [punch, leave] = await Promise.all([
    getDay(userId, date),
    leaveByUser(date, date, [userId]),
  ]);
  const day = viewFor(person, date, now, settings, punch, dateInRanges(date, leave.get(userId) ?? []));
  return {
    ...day,
    serverTime: now.toISOString(),
    canCheckIn: !day.checkInAt && !day.checkOutAt,
    canCheckOut: Boolean(day.checkInAt) && !day.checkOutAt,
    settings: {
      officeStart: settings.officeStart,
      graceMinutes: settings.graceMinutes,
      halfDayMinHours: settings.halfDayMinHours,
      absentCutoff: settings.absentCutoff,
    },
  };
}

export async function punchIn(userId: number, planNote: string | null, geo: GeoPoint | null, now = new Date()) {
  const date = kolkataDate(now);
  const before = await myToday(userId, now);
  const day = await checkInDay({
    userId,
    date,
    planNote,
    geo,
    beforeStatus: before.status,
  });
  return myTodayFromPunch(userId, date, now, day);
}

export async function punchOut(userId: number, geo: GeoPoint | null, now = new Date()) {
  const date = kolkataDate(now);
  const before = await myToday(userId, now);
  const day = await checkOutDay({
    userId,
    date,
    geo,
    beforeStatus: before.status,
  });
  return myTodayFromPunch(userId, date, now, day);
}

async function myTodayFromPunch(userId: number, date: string, now: Date, punch: AttendanceDay) {
  const settings = await getAttendanceSettings();
  const people = await activePeople(null);
  const person = people.find((row) => row.userId === userId) ?? {
    userId,
    fullName: "You",
    teamId: null,
    teamName: null,
  };
  const leave = await leaveByUser(date, date, [userId]);
  const day = viewFor(person, date, now, settings, punch, dateInRanges(date, leave.get(userId) ?? []));
  return {
    ...day,
    serverTime: now.toISOString(),
    canCheckIn: !day.checkInAt && !day.checkOutAt,
    canCheckOut: Boolean(day.checkInAt) && !day.checkOutAt,
    settings: {
      officeStart: settings.officeStart,
      graceMinutes: settings.graceMinutes,
      halfDayMinHours: settings.halfDayMinHours,
      absentCutoff: settings.absentCutoff,
    },
  };
}

export async function roster(date: string, teamId: number | null, now = new Date()) {
  const settings = await getAttendanceSettings();
  const people = await activePeople(teamId);
  const [punches, leave] = await Promise.all([
    listDaysOnDate(date),
    leaveByUser(date, date, people.map((person) => person.userId)),
  ]);
  const byUser = new Map(punches.map((punch) => [punch.userId, punch]));
  const peopleViews = people.map((person) =>
    viewFor(
      person,
      date,
      now,
      settings,
      byUser.get(person.userId) ?? null,
      dateInRanges(date, leave.get(person.userId) ?? []),
    ),
  );
  return {
    date,
    serverTime: now.toISOString(),
    counts: countStatuses(peopleViews),
    people: peopleViews,
  };
}

export async function monthForUser(userId: number, month: string, now = new Date()) {
  const bounds = monthBoundsOrThrow(month);
  const settings = await getAttendanceSettings();
  const people = await activePeople(null);
  const person = people.find((row) => row.userId === userId);
  if (!person) {
    const user = await store.findUserById(userId);
    if (!user) return null;
    people.push({
      userId: user.id,
      fullName: user.fullName,
      teamId: user.teamId,
      teamName: null,
    });
  }
  const subject = people.find((row) => row.userId === userId)!;
  const dates = eachDate(bounds.start, bounds.end);
  const [punches, leave] = await Promise.all([
    listDaysBetween(bounds.start, bounds.end),
    leaveByUser(bounds.start, bounds.end, [userId]),
  ]);
  const byDate = new Map(
    punches.filter((punch) => punch.userId === userId).map((punch) => [punch.date, punch]),
  );
  const ranges = leave.get(userId) ?? [];
  const days = dates.map((date) =>
    viewFor(subject, date, now, settings, byDate.get(date) ?? null, dateInRanges(date, ranges)),
  );
  return {
    month,
    user: subject,
    totals: summarizeMonth(days),
    days,
  };
}

export async function monthCsv(userId: number, month: string, now = new Date()): Promise<string | null> {
  const report = await monthForUser(userId, month, now);
  if (!report) return null;
  const totals = report.totals;
  const header = [
    "employee",
    "month",
    "date",
    "status",
    "checkInAt",
    "checkOutAt",
    "workedHours",
    "planNote",
    "overrideReason",
    "presentDays",
    "lateCount",
    "halfDays",
    "absences",
    "onLeaveDays",
    "offDays",
  ];
  const lines = [header.join(",")];
  for (const day of report.days) {
    lines.push(
      [
        csv(report.user.fullName),
        month,
        day.date,
        day.status,
        day.checkInAt ?? "",
        day.checkOutAt ?? "",
        day.workedMinutes == null ? "" : (day.workedMinutes / 60).toFixed(2),
        csv(day.planNote ?? ""),
        csv(day.overrideReason ?? ""),
        String(totals.presentDays),
        String(totals.lateCount),
        String(totals.halfDays),
        String(totals.absences),
        String(totals.onLeaveDays),
        String(totals.offDays),
      ].join(","),
    );
  }
  return lines.join("\n");
}

export async function summary(query: { date?: string; month?: string; teamId: number | null }, now = new Date()) {
  if (query.date) {
    const day = await roster(query.date, query.teamId, now);
    return {
      date: day.date,
      counts: day.counts,
      people: day.people.map((person) => ({
        userId: person.userId,
        fullName: person.fullName,
        teamId: person.teamId,
        teamName: person.teamName,
        status: person.status,
        checkInAt: person.checkInAt,
        checkOutAt: person.checkOutAt,
        planNote: person.planNote,
      })),
    };
  }
  const month = query.month!;
  const bounds = monthBoundsOrThrow(month);
  const settings = await getAttendanceSettings();
  const people = await activePeople(query.teamId);
  const dates = eachDate(bounds.start, bounds.end);
  const [punches, leave] = await Promise.all([
    listDaysBetween(bounds.start, bounds.end),
    leaveByUser(bounds.start, bounds.end, people.map((person) => person.userId)),
  ]);
  const employees = people.map((person) => {
    const mine = punches.filter((punch) => punch.userId === person.userId);
    const byDate = new Map(mine.map((punch) => [punch.date, punch]));
    const ranges = leave.get(person.userId) ?? [];
    const days = dates.map((date) =>
      viewFor(person, date, now, settings, byDate.get(date) ?? null, dateInRanges(date, ranges)),
    );
    return { ...person, ...summarizeMonth(days) };
  });
  const totals = employees.reduce<MonthTotals>(
    (sum, row) => ({
      presentDays: sum.presentDays + row.presentDays,
      lateCount: sum.lateCount + row.lateCount,
      halfDays: sum.halfDays + row.halfDays,
      absences: sum.absences + row.absences,
      onLeaveDays: sum.onLeaveDays + row.onLeaveDays,
      offDays: sum.offDays + row.offDays,
    }),
    { presentDays: 0, lateCount: 0, halfDays: 0, absences: 0, onLeaveDays: 0, offDays: 0 },
  );
  return { month, totals, employees };
}

export async function correctDay(input: {
  userId: number;
  date: string;
  actorId: number;
  status: AttendanceStatus;
  reason: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const people = await activePeople(null);
  const known = people.some((person) => person.userId === input.userId) || (await store.findUserById(input.userId));
  if (!known) return null;
  const before = await (async () => {
    const settings = await getAttendanceSettings();
    const punch = await getDay(input.userId, input.date);
    const leave = await leaveByUser(input.date, input.date, [input.userId]);
    return computeAttendanceStatus({
      date: input.date,
      now,
      settings,
      onLeave: dateInRanges(input.date, leave.get(input.userId) ?? []),
      punch: punch
        ? { checkInAt: punch.checkInAt, checkOutAt: punch.checkOutAt, overrideStatus: punch.overrideStatus }
        : null,
    }).status;
  })();
  await overrideDay({
    userId: input.userId,
    date: input.date,
    actorId: input.actorId,
    status: input.status,
    reason: input.reason,
    beforeStatus: before,
  });
  return monthForUser(input.userId, input.date.slice(0, 7), now);
}

export async function dayAudit(userId: number, date: string): Promise<AttendanceAudit[]> {
  return listAudit(userId, date);
}

export async function readSettings(): Promise<AttendanceSettings> {
  return getAttendanceSettings();
}

export async function writeSettings(next: AttendanceSettings, actorId: number): Promise<AttendanceSettings> {
  return saveAttendanceSettings(next, actorId);
}

function monthBoundsOrThrow(month: string): { start: string; end: string } {
  const bounds = monthBounds(month);
  if (!bounds) throw new Error("BAD_MONTH");
  return bounds;
}

function csv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
