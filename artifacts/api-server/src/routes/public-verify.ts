import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  resolveEmployeeVerification,
  resolveEmployeeVerificationByCode,
} from "../lib/verify/resolve-verify";
import { buildVcard } from "../lib/verify/vcard";
import { findUserByVerifySlug } from "../lib/credentials/slug";
import { findUserByEmployeeCode, normalizeEmployeeCode } from "../lib/credentials/employee-code";
import { getOrgCredentialSettings } from "../lib/credentials/org-settings";
import { resolveCertificateVerification } from "../lib/verify/resolve-certificate";

const router = Router();

const publicLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get(
  "/v1/public/v/verification/:employeeCode",
  publicLimiter,
  async (req, res): Promise<void> => {
    const employeeCode = normalizeEmployeeCode(String(req.params.employeeCode));
    const kiosk = typeof req.query.kiosk === "string" ? req.query.kiosk : undefined;
    const certCode = typeof req.query.cert === "string" ? req.query.cert : undefined;
    const certSig = typeof req.query.s === "string" ? req.query.s : undefined;
    const result = await resolveEmployeeVerificationByCode({
      employeeCode,
      kioskToken: kiosk,
      certCode,
      certSig,
      ip: req.ip,
    });
    if (result.status === "not_found") {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  },
);

router.get(
  "/v1/public/v/verification/:employeeCode.vcf",
  publicLimiter,
  async (req, res): Promise<void> => {
    const employeeCode = normalizeEmployeeCode(String(req.params.employeeCode));
    const user = await findUserByEmployeeCode(employeeCode);
    if (!user || user.status !== "active") {
      res.status(404).send("Not found");
      return;
    }
    const org = await getOrgCredentialSettings();
    const vcard = buildVcard(user, org.companyLegalName);
    res.setHeader("Content-Type", "text/vcard; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${employeeCode}.vcf"`,
    );
    res.send(vcard);
  },
);

router.get("/v1/public/v/:slug", publicLimiter, async (req, res): Promise<void> => {
  const slug = String(req.params.slug).toLowerCase();
  const kiosk = typeof req.query.kiosk === "string" ? req.query.kiosk : undefined;
  const certCode = typeof req.query.cert === "string" ? req.query.cert : undefined;
  const certSig = typeof req.query.s === "string" ? req.query.s : undefined;
  const result = await resolveEmployeeVerification({
    slug,
    kioskToken: kiosk,
    certCode,
    certSig,
    ip: req.ip,
  });
  if (result.status === "not_found") {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

router.get("/v1/public/v/:slug.vcf", publicLimiter, async (req, res): Promise<void> => {
  const slug = String(req.params.slug).toLowerCase();
  const user = await findUserByVerifySlug(slug);
  if (!user || user.status !== "active" || !user.publicProfileEnabled) {
    res.status(404).send("Not found");
    return;
  }
  const org = await getOrgCredentialSettings();
  const vcard = buildVcard(user, org.companyLegalName);
  res.setHeader("Content-Type", "text/vcard; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${slug}.vcf"`);
  res.send(vcard);
});

router.get("/v1/public/verify/cert/:code", publicLimiter, async (req, res): Promise<void> => {
  const code = String(req.params.code);
  const sig = typeof req.query.s === "string" ? req.query.s : undefined;
  const result = await resolveCertificateVerification(code, sig);
  if (result.status === "not_found") {
    res.status(404).json(result);
    return;
  }
  if (result.status === "invalid_sig") {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

export default router;
