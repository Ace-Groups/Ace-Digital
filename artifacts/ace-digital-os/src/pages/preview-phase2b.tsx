import { useSearch } from "wouter";
import { FaceReviewQueue } from "@/components/accountability/FaceReviewQueue";
import { ScorecardList } from "@/components/accountability/ScorecardList";
import { WorkLogCard } from "@/components/accountability/WorkLogCard";
import { VisitsView, type VisitDraft } from "@/components/visits/VisitsView";
import type { FaceReview, FieldVisit, Scorecard, WorkLog } from "@/lib/accountability-api";

const visits: FieldVisit[] = [
  {
    id: "harbour",
    clientName: "Harbour",
    lat: 12.97,
    lng: 77.59,
    date: "2026-10-28",
    windowStart: "10:00",
    windowEnd: "12:00",
    radiusMeters: 200,
    employeeId: 2,
    employeeName: "Dev Patel",
    status: "flagged",
    distanceMeters: 840,
    flagReason: "outside_radius",
    faceMatchResult: "match",
    checkedInAt: "2026-10-28T05:10:00.000Z",
  },
  {
    id: "northwind",
    clientName: "Northwind",
    lat: 12.9716,
    lng: 77.5946,
    date: "2026-10-28",
    windowStart: "14:00",
    windowEnd: "16:00",
    radiusMeters: 200,
    employeeId: 1,
    employeeName: "Asha Rao",
    status: "present",
    distanceMeters: 42,
    flagReason: null,
    faceMatchResult: "match",
    checkedInAt: "2026-10-28T09:05:00.000Z",
  },
];

const cards: Scorecard[] = [
  {
    userId: 1,
    fullName: "Asha Rao",
    weekStart: "2026-10-26",
    weekEnd: "2026-11-01",
    attendanceRate: 0.8,
    punctualityRate: 0.75,
    tasksOnTime: 1,
    tasksDue: 2,
    reviewsAccepted: 1,
    reviewsDecided: 1,
    pingsConfirmed: 1,
    pingsMissed: 0,
  },
];

const reviews: FaceReview[] = [
  {
    id: "fr1",
    userId: 2,
    source: "attendance",
    sourceId: "2_2026-10-28",
    status: "pending",
    score: 0.62,
    reason: "low_score",
    note: null,
    createdAt: "2026-10-28T04:00:00.000Z",
  },
];

const log: WorkLog = {
  id: "1_2026-10-28",
  userId: 1,
  date: "2026-10-28",
  summary: "Closed the Harbour notes and sent the deck.",
  links: ["https://example.com/deck"],
  updatedAt: "2026-10-28T12:00:00.000Z",
};

const draft: VisitDraft = {
  clientName: "Harbour",
  employeeId: "2",
  date: "2026-10-28",
  windowStart: "10:00",
  windowEnd: "12:00",
  radiusMeters: "200",
  lat: 12.9716,
  lng: 77.5946,
  paste: "",
};

export default function PreviewPhase2b() {
  const search = useSearch();
  const screen = new URLSearchParams(search).get("screen") ?? "visits";
  if (!import.meta.env.DEV) return null;
  return (
    <main className="min-h-screen bg-background p-4 text-foreground">
      {screen === "scorecard" && (
        <section className="mx-auto max-w-2xl">
          <h1 className="mb-3 text-2xl font-semibold">This week</h1>
          <ScorecardList cards={cards} />
        </section>
      )}
      {screen === "reviews" && (
        <div className="mx-auto max-w-2xl">
          <FaceReviewQueue reviews={reviews} names={{ 2: "Dev Patel" }} onDecide={() => undefined} />
        </div>
      )}
      {screen === "log" && (
        <div className="mx-auto max-w-2xl">
          <WorkLogCard log={log} onSave={() => undefined} />
        </div>
      )}
      {screen === "visits" && (
        <VisitsView
          canAssign
          draft={draft}
          employees={[
            { id: 1, fullName: "Asha Rao" },
            { id: 2, fullName: "Dev Patel" },
          ]}
          visits={visits}
          onDraft={() => undefined}
          onPaste={() => undefined}
          onSubmit={() => undefined}
        />
      )}
    </main>
  );
}
