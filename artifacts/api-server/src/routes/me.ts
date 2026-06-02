import { Router } from "express";
import { store } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { employeeWithProfile } from "../lib/employee-serializer";

const router = Router();

router.get("/v1/me", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const user = await store.findUserById(ctx.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(await employeeWithProfile(user, ctx));
});

export default router;
