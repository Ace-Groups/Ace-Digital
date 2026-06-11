import { resolveApiUrl } from "@/lib/api-config";
import { authHeader } from "@/lib/api";
import type { Employee } from "@workspace/api-client-react";

export type InternshipStep =
  | "application_received"
  | "hr_review"
  | "account_created"
  | "onboarding_email_sent"
  | "id_card_generated"
  | "id_card_emailed"
  | "mentor_assigned"
  | "workspace_ready"
  | "completed";

export type InternshipRecord = {
  id: number;
  userId: number;
  mentorId: number | null;
  university: string | null;
  program: string | null;
  startDate: string | null;
  endDate: string | null;
  status: "pipeline" | "active" | "completed" | "withdrawn";
  currentStep: InternshipStep;
  completedSteps: InternshipStep[];
  notes: string | null;
  mentorName?: string | null;
  intern?: Employee | null;
  steps?: InternshipStep[];
};

export type IdCardResponse = {
  variant: "employee" | "intern";
  employeeCode: string;
  isIntern: boolean;
  frontSvg: string;
  backSvg: string;
  frontPngUrl?: string;
  backPngUrl?: string;
  pdfUrl?: string;
  verifySlug?: string;
  verifyUrl?: string;
  issuedAt?: string;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(resolveApiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export function listInternships() {
  return apiFetch<InternshipRecord[]>("/api/v1/internships");
}

export function getMyInternship() {
  return apiFetch<InternshipRecord>("/api/v1/internships/me");
}

export function createInternship(body: Record<string, unknown>) {
  return apiFetch<{ internship: InternshipRecord; intern: Employee }>("/api/v1/internships", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function runInternshipPipeline(id: number, password?: string) {
  return apiFetch(`/api/v1/internships/${id}/run-pipeline`, {
    method: "POST",
    body: JSON.stringify(password ? { password } : {}),
  });
}

export function getEmployeeIdCard(employeeId: number) {
  return apiFetch<IdCardResponse>(`/api/v1/employees/${employeeId}/id-card`);
}

export function emailEmployeeIdCard(employeeId: number) {
  return apiFetch<{ sent: boolean }>(`/api/v1/employees/${employeeId}/id-card/email`, {
    method: "POST",
  });
}
