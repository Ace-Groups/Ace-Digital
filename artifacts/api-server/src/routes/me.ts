import { Router } from "express";
import { store } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { employeeWithProfile } from "../lib/employee-serializer";
import { emailIdCardForUser } from "../lib/id-card/resolve-extras";
import { idCardUserSnapshot } from "../lib/id-card/id-card-snapshot";

const router = Router();

const PRESET_IDS = new Set([
  "user", "code", "design", "sales", "finance", "hr", "ops", "mgmt",
]);
const MAX_AVATAR_BYTES = 500_000;
const MAX_IDENTITY_AVATAR_BYTES = 1_600_000;

function validateAvatarUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  if (value.startsWith("identity:")) {
    return value.length <= MAX_IDENTITY_AVATAR_BYTES ? value : undefined;
  }

  if (value.startsWith("preset:")) {
    const id = value.slice("preset:".length);
    return PRESET_IDS.has(id) ? value : undefined;
  }

  if (value.startsWith("mascot:")) {
    const id = value.slice("mascot:".length);
    const idNum = parseInt(id, 10);
    return idNum >= 1 && idNum <= 15 ? value : undefined;
  }

  if (value.startsWith("data:image/")) {
    return value.length <= MAX_AVATAR_BYTES ? value : undefined;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value.length <= 2048 ? value : undefined;
  }

  return undefined;
}

router.get("/v1/me", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const user = await store.findUserById(ctx.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(await employeeWithProfile(user, ctx));
});

router.patch("/v1/me", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const { avatarUrl, fullName, phone } = req.body ?? {};

  const patch: Parameters<typeof store.updateUser>[1] = {};

  if (avatarUrl !== undefined) {
    const validated = validateAvatarUrl(avatarUrl);
    if (validated === undefined) {
      res.status(400).json({ error: "Invalid avatarUrl" });
      return;
    }
    patch.avatarUrl = validated;
  }

  if (fullName !== undefined) {
    if (typeof fullName !== "string" || !fullName.trim()) {
      res.status(400).json({ error: "Invalid fullName" });
      return;
    }
    patch.fullName = fullName.trim();
  }

  if (phone !== undefined) {
    patch.phone = phone === null || phone === "" ? null : String(phone);
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const existing = await store.findUserById(ctx.userId);
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const updated = await store.updateUser(ctx.userId, patch);
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let idCardSent = false;
  if (idCardUserSnapshot(existing) !== idCardUserSnapshot(updated)) {
    idCardSent = await emailIdCardForUser(ctx.userId);
  }

  res.json({ ...(await employeeWithProfile(updated, ctx)), idCardSent });
});

export default router;
