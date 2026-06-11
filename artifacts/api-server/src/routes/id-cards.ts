import { Router } from "express";
import { hasPermission } from "@workspace/rbac";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";
import { isInternJobTitle } from "../lib/id-card";
import { publishIdCardForUser } from "../lib/id-card/publish-id-card";
import { ensureUserVerifySlug } from "../lib/credentials/slug";
import { sendIdCardEmail } from "../lib/email";
import { resolveIdCardExtras } from "../lib/id-card/resolve-extras";

const router = Router();

router.get(
  "/v1/employees/:id/id-card",
  requireAuth,
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(req.params.id);
    const isSelf = ctx.userId === id;

    if (!isSelf && !hasPermission(ctx, "employees:read")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (isSelf && !hasPermission(ctx, "employees:read_self") && !hasPermission(ctx, "employees:read")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const resolved = await resolveIdCardExtras(id);
    if (!resolved) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const { pair, assets } = await publishIdCardForUser(resolved.user, resolved.extras);
    const slug = await ensureUserVerifySlug(resolved.user);

    res.json({
      variant: pair.variant,
      employeeCode: assets.employeeCode,
      isIntern: isInternJobTitle(resolved.user.jobTitle),
      frontSvg: pair.frontSvg,
      backSvg: pair.backSvg,
      frontPngUrl: assets.frontPngUrl,
      backPngUrl: assets.backPngUrl,
      pdfUrl: assets.pdfUrl,
      verifySlug: slug,
      verifyUrl: assets.verifyUrl,
      issuedAt: assets.issuedAt,
    });
  },
);

router.get(
  "/v1/employees/:id/id-card.pdf",
  requireAuth,
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(req.params.id);
    const isSelf = ctx.userId === id;

    if (!isSelf && !hasPermission(ctx, "employees:read")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (isSelf && !hasPermission(ctx, "employees:read_self") && !hasPermission(ctx, "employees:read")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const resolved = await resolveIdCardExtras(id);
    if (!resolved) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const { pdfBytes, assets } = await publishIdCardForUser(resolved.user, resolved.extras);
    const code = assets.employeeCode;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${code}-id-card.pdf"`);
    res.send(Buffer.from(pdfBytes));
  },
);

router.post(
  "/v1/employees/:id/id-card/email",
  requireAuth,
  requirePermission("employees:write", "employees:password_reset"),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const resolved = await resolveIdCardExtras(id);
    if (!resolved) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const sent = await sendIdCardEmail({
      to: resolved.user.email,
      fullName: resolved.user.fullName,
      user: resolved.user,
      extras: resolved.extras,
    });

    res.json({ sent });
  },
);

export default router;
