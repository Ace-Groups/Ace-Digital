import { Router } from "express";
import { store } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";

const router = Router();

router.get(
  "/v1/dashboard",
  requireAuth,
  requirePermission("dashboard:view"),
  async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const dash = await store.getDashboardSnapshot(ctx);

  res.json({
    activeProjectsCount: dash.activeProjectsCount,
    employeeCount: dash.employeeCount,
    monthlyRevenue: dash.monthlyRevenue,
    pendingApprovalsCount: dash.pendingApprovalsCount,
    activeClientsCount: dash.activeClientsCount ?? 0,
    contractValueTotal: dash.contractValueTotal ?? 0,
    myOpenTasksCount: dash.myOpenTasksCount ?? 0,
    widgets: dash.widgets,
    recentActivity: dash.recentActivity.map((a) => ({
      id: a.id,
      actorId: a.actorId,
      actorName: a.actorName,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      metadata: a.metadata,
      createdAt: a.createdAt.toISOString(),
    })),
    upcomingDeadlines: dash.upcomingDeadlines.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      teamId: p.teamId,
      teamName: null,
      priority: p.priority,
      status: p.status,
      progress: p.progress,
      deadline: p.deadline?.toISOString() ?? null,
      budget: p.budget ? Number(p.budget) : null,
      clientId: p.clientId,
      clientName: null,
      createdById: p.createdById,
      createdAt: p.createdAt.toISOString(),
    })),
    teamLoad: dash.teamLoad,
  });
  },
);

export default router;
