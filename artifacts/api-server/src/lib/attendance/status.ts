export const ATTENDANCE_TZ = "Asia/Kolkata";

export const ATTENDANCE_STATUSES = [
  "present",
  "late",
  "half_day",
  "absent",
  "on_leave",
  "off",
  "not_in",
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export type AttendanceSettings = {
  /** Office start, 24-hour HH:mm in Asia/Kolkata. */
  officeStart: string;
  graceMinutes: number;
  /** Checked-out days shorter than this are half-days. */
  halfDayMinHours: number;
  /** No check-in by this HH:mm (Asia/Kolkata) becomes absent. Earlier today stays not_in. */
  absentCutoff: string;
  /** 0 = Sunday … 6 = Saturday. */
  weeklyOff: number[];
  /** YYYY-MM-DD dates in Asia/Kolkata. */
  holidays: string[];
};

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  officeStart: "10:00",
  graceMinutes: 15,
  halfDayMinHours: 4,
  absentCutoff: "13:00",
  weeklyOff: [0],
  holidays: [],
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function kolkataDate(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ATTENDANCE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function kolkataMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ATTENDANCE_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return (hour === 24 ? 0 : hour) * 60 + minute;
}

/** Noon in Asia/Kolkata for a civil date, so weekday math stays off the date line. */
export function kolkataNoon(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 6, 30, 0));
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return kolkataDate(kolkataNoon(value)) === value;
}

export function weekdayIndex(date: string): number {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: ATTENDANCE_TZ,
    weekday: "short",
  }).format(kolkataNoon(date));
  const idx = WEEKDAYS.indexOf(label as (typeof WEEKDAYS)[number]);
  return idx === -1 ? 0 : idx;
}

export function addDays(date: string, days: number): string {
  const noon = kolkataNoon(date);
  noon.setUTCDate(noon.getUTCDate() + days);
  return kolkataDate(noon);
}

export function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  let cursor = start;
  while (cursor <= end && out.length < 400) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

export function monthBounds(month: string): { start: string; end: string } | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const start = `${month}-01`;
  if (!isIsoDate(start)) return null;
  const [y, m] = month.split("-").map(Number);
  const nextMonth = m === 12 ? `${(y ?? 0) + 1}-01-01` : `${y}-${String((m ?? 0) + 1).padStart(2, "0")}-01`;
  return { start, end: addDays(nextMonth, -1) };
}

export function parseHm(value: string): number | null {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function formatHm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** First `YYYY-MM-DD to YYYY-MM-DD` pair in a leave request. */
export function parseLeaveRange(text: string | null | undefined): { start: string; end: string } | null {
  if (!text) return null;
  const match = text.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|–|—|-|→)\s*(\d{4}-\d{2}-\d{2})/i);
  if (!match) return null;
  const start = match[1] ?? "";
  const end = match[2] ?? "";
  if (!isIsoDate(start) || !isIsoDate(end) || start > end) return null;
  return { start, end };
}

export function dateInRanges(date: string, ranges: { start: string; end: string }[]): boolean {
  return ranges.some((range) => date >= range.start && date <= range.end);
}

export type DayPunch = {
  checkInAt: string | null;
  checkOutAt: string | null;
  overrideStatus: AttendanceStatus | null;
};

export type StatusResult = {
  status: AttendanceStatus;
  lateArrival: boolean;
  workedMinutes: number | null;
};

export function workedMinutes(checkInAt: string, checkOutAt: string): number | null {
  const start = Date.parse(checkInAt);
  const end = Date.parse(checkOutAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / 60_000);
}

export function computeAttendanceStatus(input: {
  date: string;
  now: Date;
  settings: AttendanceSettings;
  punch: DayPunch | null;
  onLeave: boolean;
}): StatusResult {
  const today = kolkataDate(input.now);
  const checkInAt = input.punch?.checkInAt ?? null;
  const checkOutAt = input.punch?.checkOutAt ?? null;
  const worked = checkInAt && checkOutAt ? workedMinutes(checkInAt, checkOutAt) : null;
  const office = parseHm(input.settings.officeStart) ?? parseHm(DEFAULT_ATTENDANCE_SETTINGS.officeStart)!;
  const grace = Number.isFinite(input.settings.graceMinutes) ? input.settings.graceMinutes : 15;
  const lateArrival = checkInAt ? kolkataMinutes(new Date(checkInAt)) > office + grace : false;

  const override = input.punch?.overrideStatus;
  if (override && override !== "not_in") {
    return { status: override, lateArrival, workedMinutes: worked };
  }

  if (input.onLeave && !checkInAt) {
    return { status: "on_leave", lateArrival: false, workedMinutes: null };
  }

  const off =
    input.settings.weeklyOff.includes(weekdayIndex(input.date)) ||
    input.settings.holidays.includes(input.date);
  if (off && !checkInAt) {
    return { status: "off", lateArrival: false, workedMinutes: null };
  }

  if (!checkInAt) {
    if (input.date > today) {
      return { status: "not_in", lateArrival: false, workedMinutes: null };
    }
    const cutoff = parseHm(input.settings.absentCutoff) ?? parseHm(DEFAULT_ATTENDANCE_SETTINGS.absentCutoff)!;
    if (input.date === today && kolkataMinutes(input.now) < cutoff) {
      return { status: "not_in", lateArrival: false, workedMinutes: null };
    }
    return { status: "absent", lateArrival: false, workedMinutes: null };
  }

  const minMinutes = input.settings.halfDayMinHours * 60;
  if (worked != null && worked < minMinutes) {
    return { status: "half_day", lateArrival, workedMinutes: worked };
  }
  if (lateArrival) {
    return { status: "late", lateArrival: true, workedMinutes: worked };
  }
  return { status: "present", lateArrival: false, workedMinutes: worked };
}

export type MonthTotals = {
  presentDays: number;
  lateCount: number;
  halfDays: number;
  absences: number;
  onLeaveDays: number;
  offDays: number;
};

export function emptyTotals(): MonthTotals {
  return {
    presentDays: 0,
    lateCount: 0,
    halfDays: 0,
    absences: 0,
    onLeaveDays: 0,
    offDays: 0,
  };
}

export function summarizeMonth(rows: { status: AttendanceStatus }[]): MonthTotals {
  const totals = emptyTotals();
  for (const row of rows) {
    if (row.status === "present") totals.presentDays += 1;
    else if (row.status === "late") totals.lateCount += 1;
    else if (row.status === "half_day") totals.halfDays += 1;
    else if (row.status === "absent") totals.absences += 1;
    else if (row.status === "on_leave") totals.onLeaveDays += 1;
    else if (row.status === "off") totals.offDays += 1;
  }
  return totals;
}

export function countStatuses(rows: { status: AttendanceStatus }[]): Record<AttendanceStatus, number> {
  const counts = {
    present: 0,
    late: 0,
    half_day: 0,
    absent: 0,
    on_leave: 0,
    off: 0,
    not_in: 0,
  };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}

export function eventCoversDate(startAt: string, endAt: string | null, date: string): boolean {
  const start = Date.parse(startAt);
  if (!Number.isFinite(start)) return false;
  const startDate = kolkataDate(new Date(start));
  const endDate = endAt && Number.isFinite(Date.parse(endAt)) ? kolkataDate(new Date(endAt)) : startDate;
  return date >= startDate && date <= endDate;
}

export function normalizeSettings(raw: Partial<AttendanceSettings> | null | undefined): AttendanceSettings {
  const base = DEFAULT_ATTENDANCE_SETTINGS;
  const officeMinutes = raw?.officeStart ? parseHm(raw.officeStart) : null;
  const cutoffMinutes = raw?.absentCutoff ? parseHm(raw.absentCutoff) : null;
  const officeStart = officeMinutes == null ? base.officeStart : formatHm(officeMinutes);
  const absentCutoff = cutoffMinutes == null ? base.absentCutoff : formatHm(cutoffMinutes);
  const grace = Number(raw?.graceMinutes);
  const half = Number(raw?.halfDayMinHours);
  const weeklyOff = Array.isArray(raw?.weeklyOff)
    ? [...new Set(raw.weeklyOff.map((n) => Number(n)).filter((n) => n >= 0 && n <= 6))].sort((a, b) => a - b)
    : [...base.weeklyOff];
  const holidays = Array.isArray(raw?.holidays)
    ? [...new Set(raw.holidays.filter((d) => typeof d === "string" && isIsoDate(d)))].sort()
    : [];
  return {
    officeStart,
    absentCutoff,
    graceMinutes: Number.isFinite(grace) ? Math.min(180, Math.max(0, Math.round(grace))) : base.graceMinutes,
    halfDayMinHours: Number.isFinite(half) ? Math.min(12, Math.max(1, half)) : base.halfDayMinHours,
    weeklyOff: weeklyOff.length ? weeklyOff : [...base.weeklyOff],
    holidays: holidays.slice(0, 100),
  };
}
