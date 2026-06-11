import { store } from "@workspace/db";
import type { User } from "@workspace/db";
import { isInternJobTitle } from "../id-card/is-intern";
import { findUserByVerifySlug } from "../credentials/slug";
import { getOrgCredentialSettings } from "../credentials/org-settings";
import { logVerifyScan, type ScanContext } from "./scan-log";
import { resolveKioskFromQuery } from "./kiosk-store";
import { resolveCertificateVerification, type CertificateVerifyPayload } from "./resolve-certificate";

function parsePhotoUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("identity:")) {
    try {
      const parsed = JSON.parse(decodeURIComponent(avatarUrl.slice("identity:".length))) as {
        profilePhotoUrl?: unknown;
      };
      const url = typeof parsed.profilePhotoUrl === "string" ? parsed.profilePhotoUrl : null;
      if (url && url.startsWith("data:image") && url.length < 400_000) return url;
      return null;
    } catch {
      return null;
    }
  }
  if (avatarUrl.startsWith("data:image") && avatarUrl.length < 400_000) return avatarUrl;
  if (avatarUrl.startsWith("http")) return avatarUrl;
  return null;
}

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
  publicProfile?: {
    enabled: boolean;
    bio: string | null;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
    publicPhone: string | null;
    publicEmail: string | null;
    officeAddress: string | null;
  };
  certificate?: CertificateVerifyPayload | null;
  verifySlug?: string;
};

async function fireKioskWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // best-effort
  }
}

export async function resolveEmployeeVerification(input: {
  slug: string;
  kioskToken?: string;
  certCode?: string;
  certSig?: string;
  ip?: string;
}): Promise<VerifyEmployeeResponse> {
  const scannedAt = new Date().toISOString();
  const org = await getOrgCredentialSettings();
  const user = await findUserByVerifySlug(input.slug);

  if (!user) {
    return { status: "not_found", scannedAt };
  }

  if (user.verifySlugEnabled === false) {
    return { status: "disabled", scannedAt, companyLegalName: org.companyLegalName };
  }

  const kiosk = await resolveKioskFromQuery(input.kioskToken);
  const context: ScanContext = kiosk ? "kiosk" : "public";

  await logVerifyScan({
    slug: input.slug,
    userId: user.id,
    context,
    deviceId: kiosk?.id ?? null,
    ip: input.ip,
  });

  const base = buildBase(user, org.companyLegalName, scannedAt);
  const certificate =
    input.certCode != null
      ? await resolveCertificateVerification(input.certCode, input.certSig, user.id)
      : null;

  if (user.status === "inactive") {
    return {
      ...base,
      status: "inactive",
      inactiveMessage: org.verifyInactiveMessage,
      mode: "security",
      verifySlug: input.slug,
      certificate,
    };
  }

  if (kiosk) {
    if (kiosk.webhookUrl) {
      void fireKioskWebhook(kiosk.webhookUrl, {
        event: "verify.success",
        userId: user.id,
        slug: input.slug,
        deviceId: kiosk.id,
        timestamp: scannedAt,
        actions: kiosk.actions,
      });
    }
    return {
      ...base,
      status: "active",
      mode: "kiosk",
      publicProfile: undefined,
      verifySlug: input.slug,
      certificate,
    };
  }

  return {
    ...base,
    status: "active",
    mode: user.publicProfileEnabled ? "public" : "security",
    verifySlug: input.slug,
    certificate,
    publicProfile: user.publicProfileEnabled
      ? {
          enabled: true,
          bio: user.publicBio ?? null,
          linkedinUrl: user.linkedinUrl ?? null,
          portfolioUrl: user.portfolioUrl ?? null,
          publicPhone: user.publicPhone ?? user.phone ?? null,
          publicEmail: user.publicEmail ?? user.email,
          officeAddress: user.officeAddress ?? null,
        }
      : { enabled: false, bio: null, linkedinUrl: null, portfolioUrl: null, publicPhone: null, publicEmail: null, officeAddress: null },
  };
}

function buildBase(user: User, companyLegalName: string, scannedAt: string) {
  return {
    fullName: user.fullName,
    jobTitle: user.jobTitle,
    photoUrl: parsePhotoUrl(user.avatarUrl),
    employeeCode: user.employeeCode ?? `ACE${user.id}`,
    variant: isInternJobTitle(user.jobTitle) ? ("intern" as const) : ("employee" as const),
    scannedAt,
    companyLegalName,
  };
}

export async function getIssuerDisplay(userId: number): Promise<{
  fullName: string;
  designation: string;
  signatureDataUrl: string | null;
} | null> {
  const user = await store.findUserById(userId);
  if (!user) return null;
  const { getSignatoryProfile } = await import("../credentials/signatory-store");
  const profile = await getSignatoryProfile(userId);
  return {
    fullName: user.fullName,
    designation: profile?.documentDesignation ?? user.jobTitle ?? "",
    signatureDataUrl: profile?.signatureDataUrl ?? null,
  };
}
