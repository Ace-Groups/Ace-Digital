import { authHeader } from "@/lib/api";
import { resolveApiUrl } from "@/lib/api-config";

export type AccountabilitySettings = {
  presencePingsEnabled: boolean;
  maxPingsPerDay: number;
  minGapMinutes: number;
  responseWindowMinutes: number;
  officeStart: string;
  officeEnd: string;
  idleHours: number;
  requireDailyPlan: boolean;
};

export type FieldVisit = {
  id: string;
  clientName: string;
  lat: number;
  lng: number;
  date: string;
  windowStart: string;
  windowEnd: string;
  radiusMeters: number;
  employeeId: number;
  employeeName: string;
  status: "assigned" | "present" | "flagged" | "pending_review";
  distanceMeters: number | null;
  flagReason: string | null;
  faceMatchResult: "match" | "review" | null;
  checkedInAt: string | null;
};

export type FaceReview = {
  id: string;
  userId: number;
  source: "attendance" | "visit" | "ping";
  sourceId: string;
  status: "pending" | "accepted" | "declined";
  score: number | null;
  reason: string;
  note: string | null;
  createdAt: string;
};

export type Scorecard = {
  userId: number;
  fullName: string;
  weekStart: string;
  weekEnd: string;
  attendanceRate: number | null;
  punctualityRate: number | null;
  tasksOnTime: number;
  tasksDue: number;
  reviewsAccepted: number;
  reviewsDecided: number;
  pingsConfirmed: number;
  pingsMissed: number;
};

export type WorkLog = {
  id: string;
  userId: number;
  date: string;
  summary: string;
  links: string[];
  updatedAt: string;
} | null;

export type IdleAlert = { userId: number; fullName: string; quietMinutes: number };

export const REASON_LABEL: Record<string, string> = {
  mock_location: "Mock location",
  outside_radius: "Outside the site",
  outside_window: "Outside the time window",
  low_accuracy: "GPS was too coarse",
  face_review: "Face needs a look",
  low_score: "Face did not match",
  liveness_failed: "Liveness did not pass",
  liveness_unavailable: "Liveness was unavailable",
  no_embedding: "No face measurement",
  score: "Matched",
};

export function percent(rate: number | null): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

export function formatMeters(meters: number | null): string {
  if (meters == null) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(resolveApiUrl(path), {
    ...init,
    headers: {
      ...authHeader(),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export const getVisits = (date?: string) =>
  request<FieldVisit[]>(`/api/v1/field-visits${date ? `?date=${date}` : ""}`);

export const assignVisit = (body: Record<string, unknown>) =>
  request<FieldVisit>("/api/v1/field-visits", { method: "POST", body: JSON.stringify(body) });

export const getReviews = (status = "pending") =>
  request<FaceReview[]>(`/api/v1/face/reviews?status=${status}`);

export const decideFaceReview = (id: string, decision: "accepted" | "declined", note: string) =>
  request<FaceReview>(`/api/v1/face/reviews/${id}`, {
    method: "POST",
    body: JSON.stringify({ decision, note }),
  });

export const getScorecards = () => request<Scorecard[]>("/api/v1/accountability/scorecards");
export const getMyScorecard = () => request<Scorecard>("/api/v1/accountability/scorecard");
export const getAlerts = () => request<IdleAlert[]>("/api/v1/accountability/alerts");
export const getTodayLog = () => request<WorkLog>("/api/v1/work-logs/today");
export const saveTodayLog = (summary: string, links: string[]) =>
  request<WorkLog>("/api/v1/work-logs/today", { method: "PUT", body: JSON.stringify({ summary, links }) });
export const getAccountabilitySettings = () => request<AccountabilitySettings>("/api/v1/accountability/settings");
export const saveAccountabilitySettings = (body: Partial<AccountabilitySettings>) =>
  request<AccountabilitySettings>("/api/v1/accountability/settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });
