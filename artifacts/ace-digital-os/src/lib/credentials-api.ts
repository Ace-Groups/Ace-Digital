import { resolveApiUrl } from "@/lib/api-config";
import { authHeader } from "@/lib/api";

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

export type SignatoryProfile = {
  userId: number;
  documentDesignation: string;
  signatureDataUrl: string | null;
  enabled: boolean;
  updatedAt: string;
};

export type OrgCredentialSettings = {
  companyLegalName: string;
  companySealDataUrl: string | null;
  defaultIdCardSignatoryUserId: number | null;
  defaultCertificateSignatoryUserId: number | null;
  certificatePrefix: string;
  verifyBaseUrl: string;
  verifyInactiveMessage: string;
  updatedAt: string;
};

export type InternshipCertificate = {
  id: number;
  certificateCode: string;
  internshipId: number;
  userId: number;
  issuerUserId: number;
  issuedAt: string;
  status: "active" | "revoked" | "superseded";
  verifyUrl?: string;
};

export type CertificateVerifyPayload = {
  valid: boolean;
  status: "active" | "revoked" | "superseded" | "not_found" | "invalid_sig" | "mismatch";
  certificateCode?: string;
  recipientName?: string;
  program?: string | null;
  university?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  issuedAt?: string;
  issuerName?: string | null;
  issuerDesignation?: string | null;
  companyLegalName?: string;
  revokedAt?: string | null;
  revokeReason?: string | null;
  profileSlug?: string | null;
  profileVerifyPath?: string | null;
};

export type VerifyEmployeeResponse = {
  status: "active" | "inactive" | "disabled" | "not_found";
  fullName?: string;
  jobTitle?: string | null;
  photoUrl?: string | null;
  employeeCode?: string;
  variant?: "employee" | "intern";
  scannedAt: string;
  companyLegalName?: string;
  inactiveMessage?: string;
  mode?: "security" | "kiosk" | "public";
  verifySlug?: string;
  verifyPath?: string;
  certificate?: CertificateVerifyPayload | null;
  publicProfile?: {
    enabled: boolean;
    bio: string | null;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
    publicPhone: string | null;
    publicEmail: string | null;
    officeAddress: string | null;
  };
};

export type KioskDevice = {
  id: string;
  name: string;
  deviceToken: string;
  webhookUrl: string | null;
  actions: ("log_attendance" | "door_unlock")[];
  enabled: boolean;
};

export function getMySignatoryProfile() {
  return apiFetch<{
    userId: number;
    fullName: string;
    jobTitle: string | null;
    profile: SignatoryProfile;
  }>("/api/v1/credentials/signatory/me");
}

export function updateMySignatoryProfile(body: {
  documentDesignation?: string;
  signatureDataUrl?: string | null;
}) {
  return apiFetch<SignatoryProfile>("/api/v1/credentials/signatory/me", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function listSignatories() {
  return apiFetch<
    Array<{
      userId: number;
      fullName: string;
      jobTitle: string | null;
      role: string;
      profile: SignatoryProfile | null;
    }>
  >("/api/v1/credentials/signatories");
}

export function updateSignatory(
  userId: number,
  body: Partial<Pick<SignatoryProfile, "documentDesignation" | "signatureDataUrl" | "enabled">>,
) {
  return apiFetch<SignatoryProfile>(`/api/v1/credentials/signatories/${userId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function getOrgCredentials() {
  return apiFetch<OrgCredentialSettings>("/api/v1/credentials/org");
}

export function updateOrgCredentials(body: Partial<OrgCredentialSettings>) {
  return apiFetch<OrgCredentialSettings>("/api/v1/credentials/org", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function issueInternshipCertificate(internshipId: number, issuerUserId: number) {
  return apiFetch<{ certificate: InternshipCertificate; emailed: boolean; verifyUrl: string }>(
    `/api/v1/internships/${internshipId}/certificate/issue`,
    { method: "POST", body: JSON.stringify({ issuerUserId }) },
  );
}

export function listInternshipCertificates(internshipId: number) {
  return apiFetch<InternshipCertificate[]>(`/api/v1/internships/${internshipId}/certificates`);
}

export function listUserCertificates(userId: number) {
  return apiFetch<InternshipCertificate[]>(`/api/v1/users/${userId}/certificates`);
}

export function listCertificateLedger() {
  return apiFetch<InternshipCertificate[]>("/api/v1/credentials/certificates");
}

export function revokeCertificate(id: number, reason: string) {
  return apiFetch<InternshipCertificate>(`/api/v1/credentials/certificates/${id}/revoke`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function updateEmployeeVerifyProfile(
  employeeId: number,
  body: Record<string, unknown>,
) {
  return apiFetch(`/api/v1/employees/${employeeId}/verify-slug`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function listKioskDevices() {
  return apiFetch<KioskDevice[]>("/api/v1/credentials/kiosk-devices");
}

export function createKioskDevice(body: {
  name: string;
  webhookUrl?: string | null;
  actions?: KioskDevice["actions"];
}) {
  return apiFetch<KioskDevice>("/api/v1/credentials/kiosk-devices", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchPublicVerify(
  slug: string,
  opts?: { kiosk?: string; cert?: string; certSig?: string },
): Promise<VerifyEmployeeResponse> {
  const q = new URLSearchParams();
  if (opts?.kiosk) q.set("kiosk", opts.kiosk);
  if (opts?.cert) q.set("cert", opts.cert);
  if (opts?.certSig) q.set("s", opts.certSig);
  const qs = q.toString();
  const res = await fetch(resolveApiUrl(`/api/v1/public/v/${slug}${qs ? `?${qs}` : ""}`));
  return res.json() as Promise<VerifyEmployeeResponse>;
}

export async function fetchPublicVerifyByCode(
  employeeCode: string,
  opts?: { kiosk?: string; cert?: string; certSig?: string },
): Promise<VerifyEmployeeResponse> {
  const q = new URLSearchParams();
  if (opts?.kiosk) q.set("kiosk", opts.kiosk);
  if (opts?.cert) q.set("cert", opts.cert);
  if (opts?.certSig) q.set("s", opts.certSig);
  const qs = q.toString();
  const res = await fetch(
    resolveApiUrl(
      `/api/v1/public/v/verification/${encodeURIComponent(employeeCode)}${qs ? `?${qs}` : ""}`,
    ),
  );
  return res.json() as Promise<VerifyEmployeeResponse>;
}

export async function fetchCertificateVerify(
  code: string,
  sig?: string,
): Promise<CertificateVerifyPayload> {
  const q = sig ? `?s=${encodeURIComponent(sig)}` : "";
  const res = await fetch(resolveApiUrl(`/api/v1/public/verify/cert/${encodeURIComponent(code)}${q}`));
  return res.json() as Promise<CertificateVerifyPayload>;
}

export function buildProfileCertificatePath(
  slug: string,
  certificateCode: string,
  sig?: string,
): string {
  const q = new URLSearchParams({ cert: certificateCode });
  if (sig) q.set("s", sig);
  return `/v/${slug}?${q.toString()}`;
}

export function buildProfileCertificatePathByCode(
  employeeCode: string,
  certificateCode: string,
  sig?: string,
): string {
  const q = new URLSearchParams({ cert: certificateCode });
  if (sig) q.set("s", sig);
  return `/v/verification/${encodeURIComponent(employeeCode)}?${q.toString()}`;
}

export function downloadIdCardPdf(employeeId: number) {
  const url = resolveApiUrl(`/api/v1/employees/${employeeId}/id-card.pdf`);
  return fetch(url, { headers: authHeader() }).then(async (res) => {
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `id-card-${employeeId}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

export function downloadCertificatePdf(certificateId: number, code: string) {
  const url = resolveApiUrl(`/api/v1/certificates/${certificateId}.pdf`);
  return fetch(url, { headers: authHeader() }).then(async (res) => {
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${code}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}
