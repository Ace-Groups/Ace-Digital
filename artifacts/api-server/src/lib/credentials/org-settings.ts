import type { OrgCredentialSettings } from "./types";
import { DEFAULT_ORG_CREDENTIAL_SETTINGS } from "./types";
import { fs, useFirestore } from "./firestore-util";
import { normalizeEmployeeCode } from "./employee-code";

const DOC = "org_credential_settings/default";
let memory: OrgCredentialSettings = { ...DEFAULT_ORG_CREDENTIAL_SETTINGS };

export async function getOrgCredentialSettings(): Promise<OrgCredentialSettings> {
  if (useFirestore()) {
    const doc = await fs().doc(DOC).get();
    if (!doc.exists) return { ...DEFAULT_ORG_CREDENTIAL_SETTINGS };
    return { ...DEFAULT_ORG_CREDENTIAL_SETTINGS, ...doc.data() } as OrgCredentialSettings;
  }
  return { ...memory };
}

export async function updateOrgCredentialSettings(
  patch: Partial<Omit<OrgCredentialSettings, "updatedAt">>,
): Promise<OrgCredentialSettings> {
  const current = await getOrgCredentialSettings();
  const updated: OrgCredentialSettings = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  if (useFirestore()) {
    await fs().doc(DOC).set(updated);
  } else {
    memory = updated;
  }
  return updated;
}

/** Public Ace Verify URL — uses employee ID, not display name slug. */
export function buildVerifyUrl(baseUrl: string, employeeCode: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const code = encodeURIComponent(normalizeEmployeeCode(employeeCode));
  return `${base}/v/verification/${code}`;
}

export function buildVerifyPath(employeeCode: string): string {
  const code = encodeURIComponent(normalizeEmployeeCode(employeeCode));
  return `/v/verification/${code}`;
}

/** @deprecated Legacy slug URLs — kept for old printed cards. */
export function buildLegacySlugVerifyUrl(baseUrl: string, slug: string): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/v/${slug}`;
}
