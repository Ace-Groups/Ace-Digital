import { Router } from "express";
import { store } from "@workspace/db";
import { hasPermission } from "@workspace/rbac";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";
import {
  buildIdCardDataFromUser,
  svgToDataUrl,
  isInternJobTitle,
  prepareIdCardPair,
} from "../lib/id-card";
import { idCardPairToPdf } from "../lib/credentials/pdf-from-svg";
import { buildVerifyUrl, getOrgCredentialSettings } from "../lib/credentials/org-settings";
import { ensureUserVerifySlug } from "../lib/credentials/slug";
import { sendIdCardEmail } from "../lib/email";
import { findInternshipByUserId } from "../lib/internship-store";

const router = Router();

async function resolveCardExtras(userId: number) {
  const internship = await findInternshipByUserId(userId);
  const user = await store.findUserById(userId);
  if (!user) return null;
  const team = user.teamId != null ? await store.findTeamById(user.teamId) : null;
  const mentor =
    internship?.mentorId != null
      ? await store.findUserById(internship.mentorId)
      : null;
  return {
    user,
    extras: {
      teamName: team?.name ?? null,
      university: internship?.university ?? null,
      program: internship?.program ?? null,
      mentorName: mentor?.fullName ?? null,
      endDate: internship?.endDate ?? null,
    },
  };
}

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

    const resolved = await resolveCardExtras(id);
    if (!resolved) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const pair = await prepareIdCardPair(resolved.user, resolved.extras);
    const cardData = await buildIdCardDataFromUser(resolved.user, resolved.extras);
    const slug = await ensureUserVerifySlug(resolved.user);
    const org = await getOrgCredentialSettings();

    res.json({
      variant: pair.variant,
      employeeCode: cardData.employeeCode,
      isIntern: isInternJobTitle(resolved.user.jobTitle),
      frontSvg: pair.frontSvg,
      backSvg: pair.backSvg,
      frontDataUrl: svgToDataUrl(pair.frontSvg),
      backDataUrl: svgToDataUrl(pair.backSvg),
      verifySlug: slug,
      verifyUrl: buildVerifyUrl(org.verifyBaseUrl, slug),
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

    const resolved = await resolveCardExtras(id);
    if (!resolved) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const pair = await prepareIdCardPair(resolved.user, resolved.extras);
    const pdf = await idCardPairToPdf(pair.frontSvg, pair.backSvg);
    const code = resolved.user.employeeCode ?? `ACE${resolved.user.id}`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${code}-id-card.pdf"`);
    res.send(Buffer.from(pdf));
  },
);

router.post(
  "/v1/employees/:id/id-card/email",
  requireAuth,
  requirePermission("employees:write", "employees:password_reset"),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const resolved = await resolveCardExtras(id);
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
