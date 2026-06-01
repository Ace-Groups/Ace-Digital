import { Router } from "express";
import { db } from "@workspace/db";
import { reportsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/v1/reports", requireAuth, async (_req, res): Promise<void> => {
  const reports = await db.select().from(reportsTable).orderBy(sql`${reportsTable.generatedAt} DESC`);
  res.json(
    reports.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      period: r.period,
      generatedAt: r.generatedAt.toISOString(),
      fileUrl: r.fileUrl,
    }))
  );
});

router.post("/v1/reports", requireAuth, async (req, res): Promise<void> => {
  const { type, period, title } = req.body;
  if (!type || !period) {
    res.status(400).json({ error: "Type and period are required" });
    return;
  }
  const reportTitle = title ?? `${type.replace(/_/g, " ")} Report - ${period}`;
  const [report] = await db.insert(reportsTable).values({
    type,
    title: reportTitle,
    period,
    fileUrl: null,
  }).returning();
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
