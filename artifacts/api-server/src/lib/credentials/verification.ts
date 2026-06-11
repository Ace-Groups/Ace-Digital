import { createHmac, randomBytes } from "node:crypto";

function secret(): string {
  return (
    process.env.CREDENTIAL_HMAC_SECRET ??
    process.env.SESSION_SECRET ??
    process.env.JWT_SECRET ??
    "ace-credential-dev-secret"
  );
}

export function generateVerificationToken(): string {
  return randomBytes(24).toString("base64url");
}

export function signCertificateCode(certificateCode: string): string {
  return createHmac("sha256", secret()).update(certificateCode).digest("base64url").slice(0, 16);
}

import { normalizeEmployeeCode } from "./employee-code";

/** Profile-based verify URL used on certificate QR codes. */
export function buildCertificateVerifyPath(employeeCode: string, certificateCode: string): string {
  const sig = signCertificateCode(certificateCode);
  const code = encodeURIComponent(normalizeEmployeeCode(employeeCode));
  return `/v/verification/${code}?cert=${encodeURIComponent(certificateCode)}&s=${sig}`;
}

export function buildCertificateVerifyUrl(
  baseUrl: string,
  employeeCode: string,
  certificateCode: string,
): string {
  return `${baseUrl.replace(/\/$/, "")}${buildCertificateVerifyPath(employeeCode, certificateCode)}`;
}

/** Legacy path — redirects to profile-based verify. */
export function buildLegacyCertificateVerifyPath(certificateCode: string): string {
  const sig = signCertificateCode(certificateCode);
  return `/verify/cert/${encodeURIComponent(certificateCode)}?s=${sig}`;
}

export function verifyCertificateSignature(certificateCode: string, sig: string | undefined): boolean {
  if (!sig) return true;
  const expected = signCertificateCode(certificateCode);
  return expected === sig;
}

export function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  return createHmac("sha256", secret()).update(ip).digest("hex").slice(0, 16);
}

export function signKioskDeviceToken(deviceId: string): string {
  return createHmac("sha256", secret()).update(`kiosk:${deviceId}`).digest("base64url");
}

export function verifyKioskToken(deviceId: string, token: string): boolean {
  const expected = signKioskDeviceToken(deviceId);
  return expected === token;
}
