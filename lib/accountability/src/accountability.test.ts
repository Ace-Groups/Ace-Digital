import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_ACCOUNTABILITY_SETTINGS,
  MAX_PINGS_CAP,
  buildScorecard,
  decideFaceMatch,
  decideVisit,
  distanceMeters,
  embeddingFromLandmarks,
  isIdle,
  isPastRetention,
  normalizeAccountabilitySettings,
  parseCoordinatePair,
  pingAction,
  plannedSlots,
  retainUntil,
  startLiveness,
  stepLiveness,
  taskOnTime,
  weekBounds,
  type FaceLandmarks,
} from "./index";

function face(over: Partial<FaceLandmarks> = {}): FaceLandmarks {
  return {
    leftEye: { x: 0, y: 0 },
    rightEye: { x: 80, y: 0 },
    nose: { x: 40, y: 36 },
    mouthLeft: { x: 22, y: 64 },
    mouthRight: { x: 58, y: 64 },
    leftEar: { x: -12, y: 8 },
    rightEar: { x: 92, y: 8 },
    ...over,
  };
}

function rotate(faceIn: FaceLandmarks, deg: number): FaceLandmarks {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const turn = (p: { x: number; y: number }) => ({ x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos });
  return {
    leftEye: turn(faceIn.leftEye),
    rightEye: turn(faceIn.rightEye),
    nose: turn(faceIn.nose),
    mouthLeft: turn(faceIn.mouthLeft),
    mouthRight: turn(faceIn.mouthRight),
    leftEar: faceIn.leftEar ? turn(faceIn.leftEar) : null,
    rightEar: faceIn.rightEar ? turn(faceIn.rightEar) : null,
  };
}

function jitter(faceIn: FaceLandmarks, px: number): FaceLandmarks {
  const j = (p: { x: number; y: number }, i: number) => ({ x: p.x + (i % 2 === 0 ? px : -px), y: p.y + (i % 3 === 0 ? px : -px) });
  return {
    leftEye: j(faceIn.leftEye, 1),
    rightEye: j(faceIn.rightEye, 2),
    nose: j(faceIn.nose, 3),
    mouthLeft: j(faceIn.mouthLeft, 4),
    mouthRight: j(faceIn.mouthRight, 5),
    leftEar: faceIn.leftEar ? j(faceIn.leftEar, 6) : null,
    rightEar: faceIn.rightEar ? j(faceIn.rightEar, 7) : null,
  };
}

describe("face match", () => {
  const enrolled = embeddingFromLandmarks(face())!;
  const live = embeddingFromLandmarks(jitter(rotate(face(), 25), 2))!;

  it("matches the same face after a small turn and noise", () => {
    const decision = decideFaceMatch(enrolled, live, "passed");
    assert.equal(decision.result, "match");
    assert.ok((decision.score ?? 0) >= 0.9);
  });

  it("sends a different face to review", () => {
    const other = embeddingFromLandmarks(
      face({
        nose: { x: 18, y: 70 },
        mouthLeft: { x: 4, y: 90 },
        mouthRight: { x: 70, y: 40 },
        leftEar: { x: -30, y: 40 },
        rightEar: { x: 110, y: -10 },
      }),
    )!;
    const decision = decideFaceMatch(enrolled, other, "passed");
    assert.equal(decision.result, "review");
    assert.equal(decision.reason, "low_score");
  });

  it("never auto-rejects a failed or missing liveness check", () => {
    assert.equal(decideFaceMatch(enrolled, live, "failed").reason, "liveness_failed");
    assert.equal(decideFaceMatch(enrolled, live, "unavailable").reason, "liveness_unavailable");
    assert.equal(decideFaceMatch(null, live, "passed").reason, "no_embedding");
    assert.equal(decideFaceMatch(enrolled, live, "failed").result, "review");
  });

  it("keeps a selfie for 30 days", () => {
    const from = new Date("2026-10-01T00:00:00.000Z");
    const until = retainUntil(from);
    assert.equal(isPastRetention(until, new Date("2026-10-30T00:00:00.000Z")), false);
    assert.equal(isPastRetention(until, new Date("2026-10-31T00:00:01.000Z")), true);
  });
});

describe("liveness", () => {
  it("accepts a blink and rejects the wrong turn", () => {
    let session = startLiveness("blink", 0, 8000);
    session = stepLiveness(session, { eyeOpen: 0.9 }, 100);
    session = stepLiveness(session, { eyeOpen: 0.1 }, 200);
    session = stepLiveness(session, { eyeOpen: 0.8 }, 300);
    assert.equal(session.passed, true);

    let turn = startLiveness("turn_left", 0, 8000);
    turn = stepLiveness(turn, { yaw: 20 }, 100);
    assert.equal(turn.passed, false);
    turn = stepLiveness(turn, { yaw: -18 }, 200);
    assert.equal(turn.passed, true);
  });

  it("fails when the window closes", () => {
    const session = stepLiveness(startLiveness("turn_right", 0, 8000), { yaw: 0 }, 8001);
    assert.equal(session.failed, true);
  });
});

describe("visits", () => {
  it("measures about 111195 m per degree of longitude", () => {
    const meters = distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    assert.ok(Math.abs(meters - 111195) < 50);
  });

  it("flags mock locations, distance, window, and weak accuracy", () => {
    const base = {
      mocked: null as boolean | null,
      distanceMeters: 40,
      radiusMeters: 200,
      accuracy: 15,
      withinWindow: true,
      faceNeedsReview: false,
    };
    assert.equal(decideVisit(base).status, "present");
    assert.equal(decideVisit({ ...base, mocked: true }).flagReason, "mock_location");
    assert.equal(decideVisit({ ...base, mocked: null, distanceMeters: 840 }).flagReason, "outside_radius");
    assert.equal(decideVisit({ ...base, withinWindow: false }).flagReason, "outside_window");
    assert.equal(decideVisit({ ...base, accuracy: 400 }).flagReason, "low_accuracy");
    assert.equal(decideVisit({ ...base, faceNeedsReview: true }).flagReason, "face_review");
  });

  it("parses a pasted coordinate pair", () => {
    assert.deepEqual(parseCoordinatePair("12.9716, 77.5946"), { lat: 12.9716, lng: 77.5946 });
  });
});

describe("presence pings", () => {
  it("stays off and caps the day at 3", () => {
    assert.equal(DEFAULT_ACCOUNTABILITY_SETTINGS.presencePingsEnabled, false);
    const settings = normalizeAccountabilitySettings({ presencePingsEnabled: true, maxPingsPerDay: 9, minGapMinutes: 10 });
    assert.equal(settings.maxPingsPerDay, MAX_PINGS_CAP);
    assert.equal(settings.minGapMinutes, 90);
    const slots = plannedSlots(7, "2026-10-28", settings);
    assert.equal(slots.length, 3);
    assert.ok(slots[1] - slots[0] >= 90);
    assert.deepEqual(plannedSlots(7, "2026-10-28", settings), slots);
  });

  it("creates a ping only inside its window and expires only a shown ping", () => {
    const slots = [600, 720];
    const early = pingAction({ enabled: true, slots, nowMinutes: 590, windowMinutes: 15, existing: [] });
    assert.deepEqual(early.create, []);
    const open = pingAction({ enabled: true, slots, nowMinutes: 605, windowMinutes: 15, existing: [] });
    assert.deepEqual(open.create, [600]);
    const missed = pingAction({
      enabled: true,
      slots,
      nowMinutes: 620,
      windowMinutes: 15,
      existing: [{ slotMinute: 600, status: "pending" }],
    });
    assert.deepEqual(missed.expire, [600]);
    assert.deepEqual(missed.create, []);
    const neverShown = pingAction({ enabled: true, slots, nowMinutes: 620, windowMinutes: 15, existing: [] });
    assert.deepEqual(neverShown.create, []);
  });

  it("flags idle only after a quiet checked-in day with no work log", () => {
    const base = {
      checkedIn: true,
      hasWorkLog: false,
      nowMinutes: 14 * 60,
      officeStart: "10:00",
      officeEnd: "19:00",
      quietMinutes: 180,
      idleHours: 3,
    };
    assert.equal(isIdle(base), true);
    assert.equal(isIdle({ ...base, hasWorkLog: true }), false);
    assert.equal(isIdle({ ...base, quietMinutes: 30 }), false);
    assert.equal(isIdle({ ...base, checkedIn: false }), false);
  });
});

describe("scorecard", () => {
  it("uses the Monday week that contains the civil date", () => {
    assert.deepEqual(weekBounds("2026-10-28"), { start: "2026-10-26", end: "2026-11-01" });
  });

  it("rates attendance, punctuality, and on-time tasks", () => {
    assert.equal(taskOnTime({ dueOn: "2026-10-28", completedOn: "2026-10-28", done: true }), true);
    assert.equal(taskOnTime({ dueOn: "2026-10-28", completedOn: null, done: true }), true);
    assert.equal(taskOnTime({ dueOn: "2026-10-28", completedOn: "2026-10-29", done: true }), false);
    const card = buildScorecard({
      userId: 4,
      fullName: "Asha Rao",
      weekStart: "2026-10-26",
      weekEnd: "2026-11-01",
      days: [
        { status: "present" },
        { status: "present" },
        { status: "present" },
        { status: "late" },
        { status: "absent" },
        { status: "off" },
      ],
      tasks: [
        { dueOn: "2026-10-27", completedOn: "2026-10-27", done: true },
        { dueOn: "2026-10-28", completedOn: "2026-10-30", done: true },
      ],
      reviews: [{ decision: "accepted" }],
      pingsConfirmed: 1,
      pingsMissed: 0,
    });
    assert.equal(card.attendanceRate, 0.8);
    assert.equal(card.punctualityRate, 0.75);
    assert.equal(card.tasksOnTime, 1);
    assert.equal(card.tasksDue, 2);
  });
});
