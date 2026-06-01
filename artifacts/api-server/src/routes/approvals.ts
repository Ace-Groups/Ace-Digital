import { Router } from "express";
import { db } from "@workspace/db";
import { approvalsTable, usersTable, teamsTable, activityLogsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

async function approvalWithRelations(a: typeof approvalsTable.$inferSelect) {
  const requester = (await db.select().from(usersTable).where(eq(usersTable.id, a.requestedById)))[0];
  const reviewer = a.reviewedById
    ? (await db.select().from(usersTable).where(eq(usersTable.id, a.reviewedById)))[0]
    : null;
  const team = a.teamId
    ? (await db.select().from(teamsTable).where(eq(teamsTable.id, a.teamId)))[0]
    : null;
  return {
    id: a.id,
    type: a.type,
    title: a.title,
    description: a.description,
    amount: a.amount ? Number(a.amount) : null,
    requestedById: a.requestedById,
    requesterName: requester?.fullName ?? null,
    teamId: a.teamId,
    teamName: team?.name ?? null,
    status: a.status,
    reviewedById: a.reviewedById,
    reviewerName: reviewer?.fullName ?? null,
    reviewedAt: a.reviewedAt?.toISOString() ?? null,
    note: a.note,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/v1/approvals", requireAuth, async (req, res): Promise<void> => {
  const { status } = req.query;
  const approvals = status
    ? await db.select().from(approvalsTable).where(eq(approvalsTable.status, status as string)).orderBy(sql`${approvalsTable.createdAt} DESC`)
    : await db.select().from(approvalsTable).orderBy(sql`${approvalsTable.createdAt} DESC`);
  const result = await Promise.all(approvals.map(approvalWithRelations));
  res.json(result);
});

router.post("/v1/approvals", requireAuth, async (req, res): Promise<void> => {
  const { type, title, description, amount, teamId } = req.body;
  if (!type || !title) {
    res.status(400).json({ error: "Type and title are required" });
    return;
  }
  const [approval] = await db.insert(approvalsTable).values({
    type,
    title,
    description: description ?? null,
    amount: amount ? String(amount) : null,
    requestedById: req.user!.userId,
    teamId: teamId ?? req.user!.teamId,
    status: "PENDING",
  }).returning();
  res.status(201).json(await approvalWithRelations(approval));
});

router.post("/v1/approvals/:id/approve", requireAuth, async (req, res): Promise<void> => {
  const canApprove = ["super_admin", "management", "finance"].includes(req.user!.role);
  if (!canApprove) {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const { note } = req.body ?? {};
  const [approval] = await db.update(approvalsTable).set({
    status: "APPROVED",
    reviewedById: req.user!.userId,
    reviewedAt: new Date(),
    note: note ?? null,
  }).where(eq(approvalsTable.id, id)).returning();
  if (!approval) {
    res.status(404).json({ error: "Approval not found" });
    return;
  }
  await db.insert(activityLogsTable).values({
    actorId: req.user!.userId,
    action: "approved",
    entityType: "approval",
    entityId: id,
    metadata: { title: approval.title, type: approval.type },
  });
  res.json(await approvalWithRelations(approval));
});

router.post("/v1/approvals/:id/reject", requireAuth, async (req, res): Promise<void> => {
  const canApprove = ["super_admin", "management", "finance"].includes(req.user!.role);
  if (!canApprove) {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const { note } = req.body ?? {};
  const [approval] = await db.update(approvalsTable).set({
    status: "REJECTED",
    reviewedById: req.user!.userId,
    reviewedAt: new Date(),
    note: note ?? null,
  }).where(eq(approvalsTable.id, id)).returning();
  if (!approval) {
    res.status(404).json({ error: "Approval not found" });
    return;
  }
  await db.insert(activityLogsTable).values({
    actorId: req.user!.userId,
    action: "rejected",
    entityType: "approval",
    entityId: id,
    metadata: { title: approval.title },
  });
  res.json(await approvalWithRelations(approval));
});

export default router;
