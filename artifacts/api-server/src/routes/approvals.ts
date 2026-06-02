import { Router } from "express";
import { store } from "@workspace/db";
import type { Approval } from "@workspace/db";
import { canApproveApproval } from "@workspace/rbac";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";

const router = Router();

async function approvalWithRelations(a: Approval) {
  const requester = await store.findUserById(a.requestedById);
  const reviewer = a.reviewedById ? await store.findUserById(a.reviewedById) : null;
  const team = a.teamId ? await store.findTeamById(a.teamId) : null;
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

router.get(
  "/v1/approvals",
  requireAuth,
  requirePermission("approvals:submit"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const { status } = req.query;
    const approvals = await store.listApprovalsForAccess(ctx, {
      status: status as string | undefined,
    });
    res.json(await Promise.all(approvals.map(approvalWithRelations)));
  },
);

router.post(
  "/v1/approvals",
  requireAuth,
  requirePermission("approvals:submit"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const { type, title, description, amount, teamId } = req.body;
    if (!type || !title) {
      res.status(400).json({ error: "Type and title are required" });
      return;
    }
    const approval = await store.createApproval({
      type,
      title,
      description: description ?? null,
      amount: amount ? String(amount) : null,
      requestedById: ctx.userId,
      teamId: teamId ?? ctx.teamId,
      status: "PENDING",
      reviewedById: null,
      reviewedAt: null,
      note: null,
    });
    res.status(201).json(await approvalWithRelations(approval));
  },
);

router.post(
  "/v1/approvals/:id/approve",
  requireAuth,
  requirePermission("approvals:review"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const approvalRow = await store.findApprovalById(id);
    if (!approvalRow) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    if (
      !canApproveApproval(ctx, {
        type: approvalRow.type,
        requestedById: approvalRow.requestedById,
        teamId: approvalRow.teamId,
        status: approvalRow.status,
      })
    ) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    const { note } = req.body ?? {};
    const approval = await store.updateApproval(id, {
      status: "APPROVED",
      reviewedById: ctx.userId,
      reviewedAt: new Date(),
      note: note ?? null,
    });
    if (!approval) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    await store.insertActivityLog({
      actorId: ctx.userId,
      action: "approved",
      entityType: "approval",
      entityId: id,
      metadata: { title: approval.title, type: approval.type },
    });
    res.json(await approvalWithRelations(approval));
  },
);

router.post(
  "/v1/approvals/:id/reject",
  requireAuth,
  requirePermission("approvals:review"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const approvalRow = await store.findApprovalById(id);
    if (!approvalRow) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    if (
      !canApproveApproval(ctx, {
        type: approvalRow.type,
        requestedById: approvalRow.requestedById,
        teamId: approvalRow.teamId,
        status: approvalRow.status,
      })
    ) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    const { note } = req.body ?? {};
    const approval = await store.updateApproval(id, {
      status: "REJECTED",
      reviewedById: ctx.userId,
      reviewedAt: new Date(),
      note: note ?? null,
    });
    if (!approval) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    await store.insertActivityLog({
      actorId: ctx.userId,
      action: "rejected",
      entityType: "approval",
      entityId: id,
      metadata: { title: approval.title },
    });
    res.json(await approvalWithRelations(approval));
  },
);

export default router;
