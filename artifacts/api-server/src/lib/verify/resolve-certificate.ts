import { store } from "@workspace/db";
import { findCertificateByCode } from "../credentials/certificate-store";
import {
  verifyCertificateSignature,
  buildCertificateVerifyPath,
} from "../credentials/verification";
import { getOrgCredentialSettings } from "../credentials/org-settings";
import { employeeCodeFromUser } from "../credentials/employee-code";
import { getIssuerDisplay } from "./resolve-verify";

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

export async function resolveCertificateVerification(
  code: string,
  sig?: string,
  expectedUserId?: number,
): Promise<CertificateVerifyPayload> {
  if (!verifyCertificateSignature(code, sig)) {
    return { valid: false, status: "invalid_sig" };
  }

  const cert = await findCertificateByCode(code);
  if (!cert) {
    return { valid: false, status: "not_found" };
  }

  if (expectedUserId != null && cert.userId !== expectedUserId) {
    return { valid: false, status: "mismatch", certificateCode: cert.certificateCode };
  }

  const issuer = await getIssuerDisplay(cert.issuerUserId);
  const org = await getOrgCredentialSettings();
  const user = await store.findUserById(cert.userId);
  const employeeCode = user ? employeeCodeFromUser(user) : null;
  const profileVerifyPath =
    employeeCode != null
      ? buildCertificateVerifyPath(employeeCode, cert.certificateCode)
      : null;

  return {
    valid: cert.status === "active",
    status: cert.status,
    certificateCode: cert.certificateCode,
    recipientName: cert.recipientName,
    program: cert.program,
    university: cert.university,
    startDate: cert.startDate,
    endDate: cert.endDate,
    issuedAt: cert.issuedAt,
    issuerName: issuer?.fullName ?? null,
    issuerDesignation: issuer?.designation ?? null,
    companyLegalName: org.companyLegalName,
    revokedAt: cert.revokedAt,
    revokeReason: cert.revokeReason,
    profileSlug: user?.verifySlug ?? null,
    profileVerifyPath,
  };
}
