import { Router } from "express";
import { store } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { requirePermission } from "../lib/rbac-middleware";

const router = Router();

router.get("/v1/reports", requireAuth, requirePermission("reports:read"), async (_req, res): Promise<void> => {
  const reports = await store.listReports();
  res.json(
    reports.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      period: r.period,
      generatedAt: r.generatedAt.toISOString(),
      fileUrl: r.fileUrl,
    })),
  );
});

router.post("/v1/reports", requireAuth, requirePermission("reports:write"), async (req, res): Promise<void> => {
  const { type, period, title } = req.body;
  if (!type || !period) {
    res.status(400).json({ error: "Type and period are required" });
    return;
  }
  const reportTitle = title ?? `${type.replace(/_/g, " ")} Report - ${period}`;
  const report = await store.createReport({
    type,
    title: reportTitle,
    period,
    fileUrl: null,
  });
  res.status(201).json({
    id: report.id,
    type: report.type,
    title: report.title,
    period: report.period,
    generatedAt: report.generatedAt.toISOString(),
    fileUrl: report.fileUrl,
  });
});

export default router;
