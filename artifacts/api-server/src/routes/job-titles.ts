import { Router } from "express";
import { store } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { requirePermission } from "../lib/rbac-middleware";

const router = Router();

router.get("/v1/job-titles", requireAuth, async (_req, res): Promise<void> => {
  const titles = await store.listJobTitlePresets();
  res.json(titles);
});

router.post(
  "/v1/job-titles",
  requireAuth,
  requirePermission("employees:write"),
  async (req, res): Promise<void> => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      res.status(400).json({ error: "Job title name is required" });
      return;
    }
    const saved = await store.createJobTitle(name);
    res.status(201).json({ name: saved });
  },
);

export default router;
