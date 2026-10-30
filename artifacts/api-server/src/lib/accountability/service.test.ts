import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { FACE_CONSENT_VERSION, embeddingFromLandmarks, plannedSlots } from "@workspace/accountability";
import { checkInDay, getDay, resetAttendanceMemoryForTests } from "../attendance/store";
import {
  checkInVisit,
  confirmPing,
  decideReview,
  enrollFace,
  faceStampForCheckIn,
  saveDayLog,
  syncPings,
  withdrawFace,
  type FacePayload,
} from "./service";
import {
  getEnrollment,
  listReviews,
  resetAccountabilityMemoryForTests,
  saveAccountabilitySettings,
  saveVisit,
  type FieldVisit,
} from "./store";

function jpeg(): string {
  const bytes = Buffer.alloc(64, 0x11);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  return bytes.toString("base64");
}

const same = {
  leftEye: { x: 0, y: 0 },
  rightEye: { x: 80, y: 0 },
  nose: { x: 40, y: 36 },
  mouthLeft: { x: 22, y: 64 },
  mouthRight: { x: 58, y: 64 },
  leftEar: { x: -12, y: 8 },
  rightEar: { x: 92, y: 8 },
};

const other = {
  ...same,
  nose: { x: -20, y: 10 },
  mouthLeft: { x: -40, y: 20 },
  mouthRight: { x: 10, y: 90 },
  leftEar: { x: 40, y: -30 },
  rightEar: { x: -10, y: 80 },
};

function payload(marks: typeof same, liveness: FacePayload["liveness"] = "passed"): FacePayload & { consent: true; consentVersion: string } {
  return {
    consent: true,
    consentVersion: FACE_CONSENT_VERSION,
    imageBase64: jpeg(),
    landmarks: marks,
    liveness,
    embedding: embeddingFromLandmarks(marks),
  };
}

function visit(over: Partial<FieldVisit> = {}): FieldVisit {
  return {
    id: "fv_test",
    clientName: "Harbour",
    lat: 12.9716,
    lng: 77.5946,
    date: "2026-10-28",
    windowStart: "10:00",
    windowEnd: "13:00",
    radiusMeters: 200,
    employeeId: 5,
    employeeName: "Asha Rao",
    assignedById: 1,
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
    createdAt: "2026-10-28T04:00:00.000Z",
    ...over,
  };
}

const atSite = new Date("2026-10-28T05:30:00.000Z");

describe("accountability memory store", () => {
  it("stores a matching face on the attendance day and reviews a different one", async () => {
    resetAccountabilityMemoryForTests();
    resetAttendanceMemoryForTests();
    await enrollFace(5, payload(same));
    const stamp = await faceStampForCheckIn(5, payload(same), atSite);
    assert.equal(stamp.faceMatchResult, "match");
    const day = await checkInDay({ userId: 5, date: "2026-10-28", planNote: "Ship the roster", geo: null, beforeStatus: "not_in", face: stamp });
    assert.equal(day.faceMatchResult, "match");

    await enrollFace(8, payload(same));
    const reviewStamp = await faceStampForCheckIn(8, payload(other), atSite);
    assert.equal(reviewStamp.faceMatchResult, "review");
    await checkInDay({ userId: 8, date: "2026-10-28", planNote: "Site notes", geo: null, beforeStatus: "not_in", face: reviewStamp });
    const pending = await listReviews({ userId: 8, status: "pending" });
    assert.equal(pending.length, 1);
    await decideReview(1, pending[0].id, "accepted", "Looks like Asha");
    const reviewed = await getDay(8, "2026-10-28");
    assert.equal(reviewed?.faceReviewStatus, "accepted");

    await withdrawFace(8);
    const gone = await getEnrollment(8);
    assert.equal(gone?.embedding.length, 0);
    assert.equal(gone?.consent, false);
  });

  it("flags a mocked or distant visit and accepts one on site", async () => {
    resetAccountabilityMemoryForTests();
    await enrollFace(5, payload(same));
    await saveVisit(visit());
    const mocked = await checkInVisit(5, "fv_test", { ...payload(same), latitude: 12.9716, longitude: 77.5946, accuracy: 8, mocked: true }, atSite);
    assert.equal(mocked.flagReason, "mock_location");

    await saveVisit(visit({ id: "fv_far" }));
    const far = await checkInVisit(5, "fv_far", { ...payload(same), latitude: 12.98, longitude: 77.61, accuracy: 8, mocked: null }, atSite);
    assert.equal(far.flagReason, "outside_radius");

    await saveVisit(visit({ id: "fv_ok" }));
    const present = await checkInVisit(5, "fv_ok", { ...payload(same), latitude: 12.9716, longitude: 77.5946, accuracy: 12, mocked: null }, atSite);
    assert.equal(present.status, "present");

    await saveVisit(visit({ id: "fv_other", employeeId: 9 }));
    await assert.rejects(() => checkInVisit(5, "fv_other", { ...payload(same), latitude: 12.9716, longitude: 77.5946, mocked: null }, atSite), /someone else/);
  });

  it("saves a work log and confirms a ping only while the slot is open", async () => {
    resetAccountabilityMemoryForTests();
    await enrollFace(4, payload(same));
    const log = await saveDayLog(4, "2026-10-28", "Closed the three open tickets.", ["https://example.com/proof"]);
    assert.equal(log.links.length, 1);
    const off = await syncPings(4, atSite);
    assert.equal(off.length, 0);

    const settings = await saveAccountabilitySettings(
      { presencePingsEnabled: true, maxPingsPerDay: 2, minGapMinutes: 90, responseWindowMinutes: 15, officeStart: "10:00", officeEnd: "19:00", idleHours: 3, requireDailyPlan: false },
      1,
    );
    const slots = plannedSlots(4, "2026-10-26", settings);
    const slotNow = new Date(Date.UTC(2026, 9, 25, 18, 30) + slots[0] * 60 * 1000);
    const pings = await syncPings(4, slotNow);
    assert.equal(pings.length, 1);
    const confirmed = await confirmPing(4, pings[0].id, payload(same), slotNow);
    assert.equal(confirmed.status, "confirmed");
  });

  it("documents the rules for the new collections", () => {
    const rules = readFileSync(new URL("../../../../../firebase/firestore.rules", import.meta.url), "utf8");
    const storage = readFileSync(new URL("../../../../../firebase/storage.rules", import.meta.url), "utf8");
    const indexes = readFileSync(new URL("../../../../../firebase/firestore.indexes.json", import.meta.url), "utf8");
    assert.match(rules, /match \/face_enrollments\/\{userId\}/);
    assert.match(rules, /match \/field_visits\/\{visitId\}/);
    assert.match(rules, /match \/presence_pings\/\{pingId\}/);
    assert.match(rules, /allow create: if false/);
    assert.match(storage, /attendance-selfies/);
    assert.match(indexes, /field_visits/);
    assert.match(indexes, /face_reviews/);
  });
});
