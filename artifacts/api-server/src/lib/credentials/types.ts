export const SIGNATORY_ELIGIBLE_ROLES = [
  "super_admin",
  "management",
  "hr",
  "finance",
] as const;

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

export type CertificateStatus = "active" | "revoked" | "superseded";

export type InternshipCertificate = {
  id: number;
  certificateCode: string;
  internshipId: number;
  userId: number;
  issuerUserId: number;
  issuedAt: string;
  issuedByUserId: number;
  startDate: string | null;
  endDate: string | null;
  program: string | null;
  university: string | null;
  recipientName: string;
  verificationToken: string;
  status: CertificateStatus;
  revokedAt: string | null;
  revokeReason: string | null;
  supersededById: number | null;
};

export type KioskDevice = {
  id: string;
  name: string;
  deviceToken: string;
  webhookUrl: string | null;
  actions: ("log_attendance" | "door_unlock")[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_ORG_CREDENTIAL_SETTINGS: OrgCredentialSettings = {
  companyLegalName: "Ace Digital Private Limited",
  companySealDataUrl: null,
  defaultIdCardSignatoryUserId: null,
  defaultCertificateSignatoryUserId: null,
  certificatePrefix: "ACE-INT",
  verifyBaseUrl: process.env.APP_URL ?? "https://acedigital.cc",
  verifyInactiveMessage:
    "This employee is no longer active. Please return this ID card to Ace Digital HR immediately.",
  updatedAt: new Date().toISOString(),
};
