import { authHeader } from "@/lib/api";
import { resolveApiUrl } from "@/lib/api-config";

export type AttendanceStatus =
  | "present"
  | "late"
  | "half_day"
  | "absent"
  | "on_leave"
  | "off"
  | "not_in";

export type AttendanceSettings = {
  officeStart: string;
  graceMinutes: number;
  halfDayMinHours: number;
  absentCutoff: string;
  weeklyOff: number[];
  holidays: string[];
};

export type DayView = {
  userId: number;
  fullName: string;
  teamId: number | null;
  teamName: string | null;
  date: string;
  status: AttendanceStatus;
  lateArrival: boolean;
  workedMinutes: number | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  planNote: string | null;
  overrideStatus: AttendanceStatus | null;
  overrideReason: string | null;
  canCheckIn?: boolean;
  canCheckOut?: boolean;
  serverTime?: string;
  settings?: Pick<AttendanceSettings, "officeStart" | "graceMinutes" | "halfDayMinHours" | "absentCutoff">;
  faceMatchScore?: number | null;
  faceMatchResult?: "match" | "review" | "skipped" | null;
  faceReviewStatus?: "pending" | "accepted" | "declined" | null;
};

export type RosterResponse = {
  date: string;
  counts: Record<AttendanceStatus, number>;
  people: DayView[];
};

export type MonthResponse = {
  month: string;
  user: { userId: number; fullName: string; teamId: number | null; teamName: string | null };
  totals: {
    presentDays: number;
    lateCount: number;
    halfDays: number;
    absences: number;
    onLeaveDays: number;
    offDays: number;
  };
  days: DayView[];
};

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
  return res.json() as Promise<T>;
}

export function readOptionalGeo(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), 2500);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {
        window.clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: 2000, maximumAge: 60_000 },
    );
  });
}

export const getMyAttendance = () => request<DayView>("/api/v1/attendance/today");

export const checkIn = (body: { planNote?: string; latitude?: number; longitude?: number; accuracy?: number }) =>
  request<DayView>("/api/v1/attendance/check-in", { method: "POST", body: JSON.stringify(body) });

export const checkOut = (body: { latitude?: number; longitude?: number; accuracy?: number }) =>
  request<DayView>("/api/v1/attendance/check-out", { method: "POST", body: JSON.stringify(body) });

export const getRoster = (date: string, teamId?: number | null) => {
  const params = new URLSearchParams({ date });
  if (teamId) params.set("teamId", String(teamId));
  return request<RosterResponse>(`/api/v1/attendance/roster?${params}`);
};

export const getMonth = (month: string, userId?: number) => {
  const params = new URLSearchParams({ month });
  if (userId) params.set("userId", String(userId));
  return request<MonthResponse>(`/api/v1/attendance/month?${params}`);
};

export const overrideDay = (userId: number, date: string, status: AttendanceStatus, reason: string) =>
  request<MonthResponse>(`/api/v1/attendance/${userId}/${date}`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });

export type AuditEntry = {
  id: string;
  action: string;
  at: string;
  reason: string | null;
  beforeStatus: string | null;
  afterStatus: string | null;
};

export const getDayAudit = (userId: number, date: string) =>
  request<AuditEntry[]>(`/api/v1/attendance/${userId}/${date}/audit`);

export const getAttendanceSettings = () => request<AttendanceSettings>("/api/v1/attendance/settings");

export const saveAttendanceSettings = (body: AttendanceSettings) =>
  request<AttendanceSettings>("/api/v1/attendance/settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });

export async function downloadMonthCsv(month: string, userId?: number): Promise<void> {
  const params = new URLSearchParams({ month });
  if (userId) params.set("userId", String(userId));
  const res = await fetch(resolveApiUrl(`/api/v1/attendance/month.csv?${params}`), {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error("Could not export attendance");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `attendance-${userId ?? "me"}-${month}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function formatIst(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  half_day: "Half day",
  absent: "Absent",
  on_leave: "On leave",
  off: "Off",
  not_in: "Not in yet",
};
