import { Router } from "express";
import { store } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { employeeWithProfile } from "../lib/employee-serializer";

const router = Router();

const PRESET_IDS = new Set([
  "user", "code", "design", "sales", "finance", "hr", "ops", "mgmt",
]);
const MAX_AVATAR_BYTES = 500_000;

function validateAvatarUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  if (value.startsWith("preset:")) {
    const id = value.slice("preset:".length);
    return PRESET_IDS.has(id) ? value : undefined;
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
  const { avatarUrl } = req.body ?? {};

  if (avatarUrl !== undefined) {
    const validated = validateAvatarUrl(avatarUrl);
    if (validated === undefined) {
      res.status(400).json({ error: "Invalid avatarUrl" });
      return;
    }
    const updated = await store.updateUser(ctx.userId, { avatarUrl: validated });
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(await employeeWithProfile(updated, ctx));
    return;
  }

  res.status(400).json({ error: "No valid fields to update" });
});

export default router;
