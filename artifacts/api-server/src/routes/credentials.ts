import { Router } from "express";
import { store } from "@workspace/db";
import { hasPermission } from "@workspace/rbac";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";
import {
  SIGNATORY_ELIGIBLE_ROLES,
  getSignatoryProfile,
  listSignatoryProfiles,
  upsertSignatoryProfile,
  getOrgCredentialSettings,
  updateOrgCredentialSettings,
  listAllCertificates,
  listCertificatesByUserId,
  listCertificatesByInternshipId,
  findCertificateById,
  revokeCertificate,
  createCertificate,
  renderCertificateSvg,
  certificateSvgToPdf,
  buildVerifyUrl,
  buildCertificateVerifyUrl,
  ensureUserVerifySlug,
  isValidVerifySlug,
  isVerifySlugTaken,
} from "../lib/credentials";
import { employeeCodeFromUser } from "../lib/credentials/employee-code";
import { findInternshipById } from "../lib/internship-store";
import { getIssuerDisplay } from "../lib/verify/resolve-verify";
import { sendInternshipCertificateEmail } from "../lib/email";
import {
  listKioskDevices,
  createKioskDevice,
  updateKioskDevice,
} from "../lib/verify/kiosk-store";
import { listRecentScansForUser } from "../lib/verify/scan-log";

const router = Router();

function isSignatoryEligible(role: string): boolean {
  return (SIGNATORY_ELIGIBLE_ROLES as readonly string[]).includes(role);
}

router.get("/v1/credentials/signatory/me", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  if (!isSignatoryEligible(ctx.role) && !hasPermission(ctx, "credentials:sign_self")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const user = await store.findUserById(ctx.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const profile = await getSignatoryProfile(ctx.userId);
  res.json({
    userId: ctx.userId,
    fullName: user.fullName,
    jobTitle: user.jobTitle,
    profile: profile ?? {
      userId: ctx.userId,
      documentDesignation: user.jobTitle ?? "",
      signatureDataUrl: null,
      enabled: false,
      updatedAt: new Date().toISOString(),
    },
  });
});

router.put("/v1/credentials/signatory/me", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  if (!hasPermission(ctx, "credentials:sign_self")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { documentDesignation, signatureDataUrl } = req.body as {
    documentDesignation?: string;
    signatureDataUrl?: string | null;
  };
  const profile = await upsertSignatoryProfile(ctx.userId, {
    documentDesignation: documentDesignation?.trim() ?? "",
    signatureDataUrl: signatureDataUrl ?? null,
    enabled: true,
  });
  res.json(profile);
});

router.get(
  "/v1/credentials/signatories",
  requireAuth,
  requirePermission("credentials:read", "credentials:manage"),
  async (_req, res): Promise<void> => {
    const profiles = await listSignatoryProfiles();
    const users = await store.listUsers({ status: "active" });
    const eligible = users.filter((u) => isSignatoryEligible(u.role));
    const byId = new Map(profiles.map((p) => [p.userId, p]));
    res.json(
      eligible.map((u) => ({
        userId: u.id,
        fullName: u.fullName,
        jobTitle: u.jobTitle,
        role: u.role,
        profile: byId.get(u.id) ?? null,
      })),
    );
  },
);

router.put(
  "/v1/credentials/signatories/:userId",
  requireAuth,
  requirePermission("credentials:manage"),
  async (req, res): Promise<void> => {
    const userId = Number(req.params.userId);
    const user = await store.findUserById(userId);
    if (!user || !isSignatoryEligible(user.role)) {
      res.status(400).json({ error: "User is not eligible as signatory" });
      return;
    }
    const { documentDesignation, signatureDataUrl, enabled } = req.body as {
      documentDesignation?: string;
      signatureDataUrl?: string | null;
      enabled?: boolean;
    };
    const profile = await upsertSignatoryProfile(userId, {
      documentDesignation,
      signatureDataUrl,
      enabled,
    });
    res.json(profile);
  },
);

router.get(
  "/v1/credentials/org",
  requireAuth,
  requirePermission("credentials:read", "credentials:manage"),
  async (_req, res): Promise<void> => {
    res.json(await getOrgCredentialSettings());
  },
);

router.put(
  "/v1/credentials/org",
  requireAuth,
  requirePermission("credentials:manage"),
  async (req, res): Promise<void> => {
    const body = req.body as Record<string, unknown>;
    const updated = await updateOrgCredentialSettings({
      companyLegalName: typeof body.companyLegalName === "string" ? body.companyLegalName : undefined,
      companySealDataUrl:
        body.companySealDataUrl === null || typeof body.companySealDataUrl === "string"
          ? (body.companySealDataUrl as string | null)
          : undefined,
      defaultIdCardSignatoryUserId:
        body.defaultIdCardSignatoryUserId === null
          ? null
          : typeof body.defaultIdCardSignatoryUserId === "number"
            ? body.defaultIdCardSignatoryUserId
            : undefined,
      defaultCertificateSignatoryUserId:
        body.defaultCertificateSignatoryUserId === null
          ? null
          : typeof body.defaultCertificateSignatoryUserId === "number"
            ? body.defaultCertificateSignatoryUserId
            : undefined,
      certificatePrefix:
        typeof body.certificatePrefix === "string" ? body.certificatePrefix : undefined,
      verifyBaseUrl: typeof body.verifyBaseUrl === "string" ? body.verifyBaseUrl : undefined,
      verifyInactiveMessage:
        typeof body.verifyInactiveMessage === "string" ? body.verifyInactiveMessage : undefined,
    });
    res.json(updated);
  },
);

router.put("/v1/employees/:id/verify-slug", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const id = Number(req.params.id);
  const isSelf = ctx.userId === id;
  if (!isSelf && !hasPermission(ctx, "employees:write")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { verifySlug, verifySlugEnabled, publicProfileEnabled, linkedinUrl, portfolioUrl, publicPhone, publicEmail, officeAddress, publicBio } =
    req.body as Record<string, unknown>;

  if (verifySlug !== undefined) {
    const slug = String(verifySlug).toLowerCase();
    if (!isValidVerifySlug(slug)) {
      res.status(400).json({ error: "Invalid slug format" });
      return;
    }
    if (await isVerifySlugTaken(slug, id)) {
      res.status(409).json({ error: "Slug already taken" });
      return;
    }
  }

  const patch: Record<string, unknown> = {};
  if (verifySlug !== undefined) patch.verifySlug = String(verifySlug).toLowerCase();
  if (verifySlugEnabled !== undefined) patch.verifySlugEnabled = Boolean(verifySlugEnabled);
  if (publicProfileEnabled !== undefined) patch.publicProfileEnabled = Boolean(publicProfileEnabled);
  if (linkedinUrl !== undefined) patch.linkedinUrl = linkedinUrl;
  if (portfolioUrl !== undefined) patch.portfolioUrl = portfolioUrl;
  if (publicPhone !== undefined) patch.publicPhone = publicPhone;
  if (publicEmail !== undefined) patch.publicEmail = publicEmail;
  if (officeAddress !== undefined) patch.officeAddress = officeAddress;
  if (publicBio !== undefined) patch.publicBio = publicBio;

  const user = await store.updateUser(id, patch);
  if (!user) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.json(user);
});

router.get("/v1/employees/:id/verify-scans", requireAuth, requirePermission("employees:read"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  res.json(await listRecentScansForUser(id));
});

router.post(
  "/v1/internships/:id/certificate/issue",
  requireAuth,
  requirePermission("certificates:issue"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const internshipId = Number(req.params.id);
    const { issuerUserId } = req.body as { issuerUserId?: number };
    const internship = await findInternshipById(internshipId);
    if (!internship) {
      res.status(404).json({ error: "Internship not found" });
      return;
    }
    const intern = await store.findUserById(internship.userId);
    if (!intern) {
      res.status(404).json({ error: "Intern not found" });
      return;
    }
    const org = await getOrgCredentialSettings();
    const issuerId = issuerUserId ?? org.defaultCertificateSignatoryUserId;
    if (!issuerId) {
      res.status(400).json({ error: "issuerUserId required" });
      return;
    }
    const issuerProfile = await getSignatoryProfile(issuerId);
    if (!issuerProfile?.enabled) {
      res.status(400).json({ error: "Issuer signatory profile not enabled" });
      return;
    }
    const issuer = await getIssuerDisplay(issuerId);
    if (!issuer) {
      res.status(400).json({ error: "Issuer not found" });
      return;
    }

    const cert = await createCertificate({
      internshipId,
      userId: intern.id,
      issuerUserId: issuerId,
      issuedByUserId: ctx.userId,
      startDate: internship.startDate,
      endDate: internship.endDate,
      program: internship.program,
      university: internship.university,
      recipientName: intern.fullName,
      certificatePrefix: org.certificatePrefix,
    });

    await ensureUserVerifySlug(intern);
    const verifyUrl = buildCertificateVerifyUrl(
      org.verifyBaseUrl,
      employeeCodeFromUser(intern),
      cert.certificateCode,
    );
    const svg = await renderCertificateSvg({
      recipientName: cert.recipientName,
      program: cert.program,
      university: cert.university,
      startDate: cert.startDate,
      endDate: cert.endDate,
      certificateCode: cert.certificateCode,
      issuedAt: cert.issuedAt,
      companyLegalName: org.companyLegalName,
      companySealDataUrl: org.companySealDataUrl,
      issuerName: issuer.fullName,
      issuerDesignation: issuer.designation,
      issuerSignatureDataUrl: issuer.signatureDataUrl,
      verifyUrl,
    });
    const pdf = await certificateSvgToPdf(svg);

    const emailed = await sendInternshipCertificateEmail({
      to: intern.email,
      fullName: intern.fullName,
      certificateCode: cert.certificateCode,
      verifyUrl,
      pdfBuffer: Buffer.from(pdf),
    });

    res.json({ certificate: cert, emailed, verifyUrl });
  },
);

router.get("/v1/internships/:id/certificates", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const internshipId = Number(req.params.id);
  const internship = await findInternshipById(internshipId);
  if (!internship) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const isSelf = ctx.userId === internship.userId;
  if (!isSelf && !hasPermission(ctx, "certificates:issue")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(await listCertificatesByInternshipId(internshipId));
});

router.get("/v1/users/:id/certificates", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const userId = Number(req.params.id);
  if (ctx.userId !== userId && !hasPermission(ctx, "certificates:issue")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(await listCertificatesByUserId(userId));
});

router.get("/v1/certificates/:id.pdf", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const id = Number(req.params.id);
  const cert = await findCertificateById(id);
  if (!cert) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (ctx.userId !== cert.userId && !hasPermission(ctx, "certificates:issue")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const org = await getOrgCredentialSettings();
  const issuer = await getIssuerDisplay(cert.issuerUserId);
  const certUser = await store.findUserById(cert.userId);
  const verifyUrl = buildCertificateVerifyUrl(
    org.verifyBaseUrl,
    certUser ? employeeCodeFromUser(certUser) : "UNKNOWN",
    cert.certificateCode,
  );
  const svg = await renderCertificateSvg({
    recipientName: cert.recipientName,
    program: cert.program,
    university: cert.university,
    startDate: cert.startDate,
    endDate: cert.endDate,
    certificateCode: cert.certificateCode,
    issuedAt: cert.issuedAt,
    companyLegalName: org.companyLegalName,
    companySealDataUrl: org.companySealDataUrl,
    issuerName: issuer?.fullName ?? "",
    issuerDesignation: issuer?.designation ?? "",
    issuerSignatureDataUrl: issuer?.signatureDataUrl ?? null,
    verifyUrl,
  });
  const pdf = await certificateSvgToPdf(svg);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${cert.certificateCode}.pdf"`);
  res.send(Buffer.from(pdf));
});

router.get(
  "/v1/credentials/certificates",
  requireAuth,
  requirePermission("certificates:issue"),
  async (_req, res): Promise<void> => {
    res.json(await listAllCertificates());
  },
);

router.post(
  "/v1/credentials/certificates/:id/revoke",
  requireAuth,
  requirePermission("certificates:issue"),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const { reason } = req.body as { reason?: string };
    const cert = await revokeCertificate(id, reason?.trim() || "Revoked by HR");
    if (!cert) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(cert);
  },
);

router.get(
  "/v1/credentials/kiosk-devices",
  requireAuth,
  requirePermission("verify:manage_kiosk", "credentials:manage"),
  async (_req, res): Promise<void> => {
    res.json(await listKioskDevices());
  },
);

router.post(
  "/v1/credentials/kiosk-devices",
  requireAuth,
  requirePermission("verify:manage_kiosk", "credentials:manage"),
  async (req, res): Promise<void> => {
    const { name, webhookUrl, actions } = req.body as {
      name?: string;
      webhookUrl?: string | null;
      actions?: ("log_attendance" | "door_unlock")[];
    };
    if (!name?.trim()) {
      res.status(400).json({ error: "name required" });
      return;
    }
    const device = await createKioskDevice({ name: name.trim(), webhookUrl, actions });
    res.status(201).json(device);
  },
);

router.put(
  "/v1/credentials/kiosk-devices/:id",
  requireAuth,
  requirePermission("verify:manage_kiosk", "credentials:manage"),
  async (req, res): Promise<void> => {
    const device = await updateKioskDevice(String(req.params.id), req.body);
    if (!device) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(device);
  },
);

router.post("/v1/employees/:id/ensure-verify-slug", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const id = Number(req.params.id);
  if (ctx.userId !== id && !hasPermission(ctx, "employees:write")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const user = await store.findUserById(id);
  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const slug = await ensureUserVerifySlug(user);
  const org = await getOrgCredentialSettings();
  res.json({
    verifySlug: slug,
    employeeCode: employeeCodeFromUser(user),
    verifyUrl: buildVerifyUrl(org.verifyBaseUrl, employeeCodeFromUser(user)),
  });
});

export default router;
