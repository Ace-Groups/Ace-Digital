import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeAttendanceStatus,
  DEFAULT_ATTENDANCE_SETTINGS,
  kolkataDate,
  kolkataMinutes,
  parseLeaveRange,
  summarizeMonth,
  weekdayIndex,
  type AttendanceSettings,
} from "./status";

const settings: AttendanceSettings = { ...DEFAULT_ATTENDANCE_SETTINGS, holidays: ["2026-10-02"] };

/** 23 Oct 2026 is a Friday. IST is UTC+5:30. */
const FRI = "2026-10-23";
const SUN = "2026-10-25";

function atUtc(iso: string): Date {
  return new Date(iso);
}

describe("Kolkata clock", () => {
  it("maps 04:45 UTC to 10:15 IST on the same civil date", () => {
    const instant = atUtc("2026-10-23T04:45:00.000Z");
    assert.equal(kolkataDate(instant), FRI);
    assert.equal(kolkataMinutes(instant), 10 * 60 + 15);
  });

  it("treats Sunday as weekly off index 0", () => {
    assert.equal(weekdayIndex(SUN), 0);
    assert.equal(weekdayIndex(FRI), 5);
  });
});

describe("computeAttendanceStatus", () => {
  it("is present at 10:15, the last minute of the 15 minute grace", () => {
    const now = atUtc("2026-10-23T04:45:00.000Z");
    const result = computeAttendanceStatus({
      date: FRI,
      now,
      settings,
      onLeave: false,
      punch: { checkInAt: now.toISOString(), checkOutAt: null, overrideStatus: null },
    });
    assert.equal(result.status, "present");
    assert.equal(result.lateArrival, false);
  });

  it("is late one minute after grace", () => {
    const now = atUtc("2026-10-23T04:46:00.000Z");
    const result = computeAttendanceStatus({
      date: FRI,
      now,
      settings,
      onLeave: false,
      punch: { checkInAt: now.toISOString(), checkOutAt: null, overrideStatus: null },
    });
    assert.equal(result.status, "late");
    assert.equal(result.lateArrival, true);
  });

  it("is a half-day when checked out before the minimum hours", () => {
    const result = computeAttendanceStatus({
      date: FRI,
      now: atUtc("2026-10-23T12:00:00.000Z"),
      settings,
      onLeave: false,
      punch: {
        checkInAt: "2026-10-23T04:30:00.000Z",
        checkOutAt: "2026-10-23T07:00:00.000Z",
        overrideStatus: null,
      },
    });
    assert.equal(result.status, "half_day");
    assert.equal(result.workedMinutes, 150);
  });

  it("stays not_in before the absent cutoff and absent once the cutoff is reached", () => {
    const before = computeAttendanceStatus({
      date: FRI,
      now: atUtc("2026-10-23T07:29:00.000Z"),
      settings,
      onLeave: false,
      punch: null,
    });
    const after = computeAttendanceStatus({
      date: FRI,
      now: atUtc("2026-10-23T07:30:00.000Z"),
      settings,
      onLeave: false,
      punch: null,
    });
    assert.equal(before.status, "not_in");
    assert.equal(after.status, "absent");
  });

  it("does not mark a future weekday absent", () => {
    const result = computeAttendanceStatus({
      date: "2026-10-26",
      now: atUtc("2026-10-23T08:00:00.000Z"),
      settings,
      onLeave: false,
      punch: null,
    });
    assert.equal(result.status, "not_in");
  });

  it("marks Sunday off and does not count it absent", () => {
    const result = computeAttendanceStatus({
      date: SUN,
      now: atUtc("2026-10-25T12:00:00.000Z"),
      settings,
      onLeave: false,
      punch: null,
    });
    assert.equal(result.status, "off");
  });

  it("marks a configured holiday off", () => {
    const result = computeAttendanceStatus({
      date: "2026-10-02",
      now: atUtc("2026-10-02T12:00:00.000Z"),
      settings,
      onLeave: false,
      punch: null,
    });
    assert.equal(result.status, "off");
  });

  it("marks approved leave even on a Sunday", () => {
    const result = computeAttendanceStatus({
      date: SUN,
      now: atUtc("2026-10-25T12:00:00.000Z"),
      settings,
      onLeave: true,
      punch: null,
    });
    assert.equal(result.status, "on_leave");
  });

  it("lets an admin override replace the computed status", () => {
    const result = computeAttendanceStatus({
      date: FRI,
      now: atUtc("2026-10-23T12:00:00.000Z"),
      settings,
      onLeave: false,
      punch: { checkInAt: null, checkOutAt: null, overrideStatus: "present" },
    });
    assert.equal(result.status, "present");
  });

  it("counts a short late checkout as a half-day", () => {
    const result = computeAttendanceStatus({
      date: FRI,
      now: atUtc("2026-10-23T12:00:00.000Z"),
      settings,
      onLeave: false,
      punch: {
        checkInAt: "2026-10-23T05:00:00.000Z",
        checkOutAt: "2026-10-23T07:00:00.000Z",
        overrideStatus: null,
      },
    });
    assert.equal(result.status, "half_day");
    assert.equal(result.lateArrival, true);
    assert.equal(result.workedMinutes, 120);
  });

  it("marks a past weekday with no check-in absent", () => {
    const result = computeAttendanceStatus({
      date: "2026-10-22",
      now: atUtc("2026-10-23T04:00:00.000Z"),
      settings,
      onLeave: false,
      punch: null,
    });
    assert.equal(result.status, "absent");
  });

  it("counts a worked weekly-off as present", () => {
    const result = computeAttendanceStatus({
      date: SUN,
      now: atUtc("2026-10-25T12:00:00.000Z"),
      settings,
      onLeave: false,
      punch: {
        checkInAt: "2026-10-25T04:30:00.000Z",
        checkOutAt: "2026-10-25T10:30:00.000Z",
        overrideStatus: null,
      },
    });
    assert.equal(result.status, "present");
  });
});

describe("leave ranges and month totals", () => {
  it("parses the date pair written onto a leave request", () => {
    const range = parseLeaveRange("2026-10-20 to 2026-10-22\nFamily function");
    assert.deepEqual(range, { start: "2026-10-20", end: "2026-10-22" });
    assert.equal(parseLeaveRange("no dates here"), null);
  });

  it("summarizes payroll counts without treating off days or not-yet-in as absences", () => {
    const totals = summarizeMonth([
      { status: "present" },
      { status: "present" },
      { status: "late" },
      { status: "half_day" },
      { status: "absent" },
      { status: "on_leave" },
      { status: "off" },
      { status: "not_in" },
    ]);
    assert.deepEqual(totals, {
      presentDays: 2,
      lateCount: 1,
      halfDays: 1,
      absences: 1,
      onLeaveDays: 1,
      offDays: 1,
    });
  });
});
