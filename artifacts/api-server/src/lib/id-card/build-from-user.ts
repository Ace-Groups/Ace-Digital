import { store } from "@workspace/db";
import type { User } from "@workspace/db";
import type { IdCardData } from "./types";
import { isInternJobTitle } from "./is-intern";

function parseIdentityPhoto(avatarUrl: string | null | undefined): string | null {
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
  return null;
}

export async function buildIdCardDataFromUser(
  user: User,
  extras?: {
    teamName?: string | null;
    university?: string | null;
    program?: string | null;
    mentorName?: string | null;
    endDate?: string | null;
    verifyUrl?: string | null;
    qrSvg?: string | null;
    signatoryName?: string | null;
    signatoryDesignation?: string | null;
    signatorySignatureDataUrl?: string | null;
  },
): Promise<IdCardData> {
  const team =
    extras?.teamName ??
    (user.teamId != null ? (await store.findTeamById(user.teamId))?.name ?? null : null);

  const variant = isInternJobTitle(user.jobTitle) ? "intern" : "employee";

  return {
    variant,
    fullName: user.fullName,
    employeeCode: user.employeeCode ?? `ACE${user.id}`,
    jobTitle: user.jobTitle,
    teamName: team,
    email: user.email,
    phone: user.phone,
    bloodGroup: user.bloodGroup,
    startDate: user.startDate?.toISOString() ?? null,
    endDate: extras?.endDate ?? null,
    photoDataUrl: parseIdentityPhoto(user.avatarUrl),
    emergencyContactName: user.emergencyContactName,
    emergencyContactPhone: user.emergencyContactPhone,
    university: extras?.university ?? null,
    program: extras?.program ?? null,
    mentorName: extras?.mentorName ?? null,
    role: user.role,
    verifyUrl: extras?.verifyUrl ?? null,
    qrSvg: extras?.qrSvg ?? null,
    signatoryName: extras?.signatoryName ?? null,
    signatoryDesignation: extras?.signatoryDesignation ?? null,
    signatorySignatureDataUrl: extras?.signatorySignatureDataUrl ?? null,
  };
}
