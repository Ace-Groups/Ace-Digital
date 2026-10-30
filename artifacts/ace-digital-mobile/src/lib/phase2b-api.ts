import { FACE_CONSENT_VERSION } from "@workspace/accountability";
import { getApiBase, getToken } from "@/lib/api-config";

export { FACE_CONSENT_VERSION };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    const error = new Error(body.error || `Request failed (${res.status})`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return res.json() as Promise<T>;
}

export type FaceBody = {
  imageBase64: string;
  embedding?: number[] | null;
  liveness?: "passed" | "failed" | "unavailable" | null;
  landmarks?: unknown;
  consent?: boolean;
  consentVersion?: string;
};

export const enrollFace = (body: FaceBody) => request("/api/v1/face/enrollment", { method: "POST", body: JSON.stringify(body) });
export const withdrawFace = () => request("/api/v1/face/enrollment/withdraw", { method: "POST", body: "{}" });
export const getEnrollment = () => request("/api/v1/face/enrollment");
export const checkIn = (body: { planNote: string; face: FaceBody; latitude?: number; longitude?: number; accuracy?: number | null }) =>
  request("/api/v1/attendance/check-in", { method: "POST", body: JSON.stringify(body) });
export const listVisits = (date: string) => request<VisitRow[]>(`/api/v1/field-visits?date=${date}`);
export const checkInVisit = (id: string, body: Record<string, unknown>) =>
  request(`/api/v1/field-visits/${id}/check-in`, { method: "POST", body: JSON.stringify(body) });
export const getLog = () => request<{ summary?: string; links?: string[] } | null>("/api/v1/work-logs/today");
export const saveLog = (summary: string, links: string[]) =>
  request("/api/v1/work-logs/today", { method: "PUT", body: JSON.stringify({ summary, links }) });
export const presenceToday = () =>
  request<{ pings: PingRow[]; enabled: boolean; note: string }>("/api/v1/presence/today");
export const confirmPing = (id: string, face: FaceBody) =>
  request(`/api/v1/presence/pings/${id}/confirm`, { method: "POST", body: JSON.stringify({ face }) });
export const myScorecard = () => request<ScoreRow>("/api/v1/accountability/scorecard");

export type VisitRow = {
  id: string;
  clientName: string;
  date: string;
  windowStart: string;
  windowEnd: string;
  radiusMeters: number;
  status: string;
  distanceMeters: number | null;
  flagReason: string | null;
  checkedInAt: string | null;
};

export type PingRow = { id: string; status: string; slotMinute: number; dueAt: string };
export type ScoreRow = {
  attendanceRate: number | null;
  punctualityRate: number | null;
  tasksOnTime: number;
  tasksDue: number;
  reviewsAccepted: number;
  reviewsDecided: number;
};
