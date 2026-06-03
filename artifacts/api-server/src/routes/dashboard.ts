import { Router } from "express";
import { store } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { requirePermission } from "../lib/rbac-middleware";
import { getAccessContext } from "../lib/access";
import { dashboardShowsWidget } from "@workspace/rbac";
import {
  nativeEventToFeedItem,
  taskInRange,
  taskToFeedItem,
  taskVisibleToUser,
} from "../lib/calendar-serializer";
import { canViewCalendarEvent } from "@workspace/rbac";

const router = Router();
const DASHBOARD_CACHE_TTL_MS = 15_000;
const dashboardCache = new Map<string, { expiresAt: number; payload: unknown }>();

router.get(
  "/v1/dashboard",
  requireAuth,
  requirePermission("dashboard:view"),
  async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const cacheKey = `${ctx.userId}:${ctx.role}:${ctx.teamId ?? "none"}`;
  const now = Date.now();
  const cached = dashboardCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    res.json(cached.payload);
    return;
  }

  const dash = await store.getDashboardSnapshot(ctx);

  let upcomingCalendar: ReturnType<typeof nativeEventToFeedItem>[] = [];
  if (dashboardShowsWidget(ctx.role, "upcomingCalendar")) {
    const from = new Date();
    const to = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
    const events = await store.listCalendarEventsForUser(ctx.userId, from, to);
    const items = events
      .filter((e) => canViewCalendarEvent(ctx, e, ctx.userId))
      .map(nativeEventToFeedItem);
    const tasks = await store.listTasksForAccess(ctx, { assigneeId: ctx.userId });
    for (const task of tasks) {
      if (!taskVisibleToUser(task, ctx.userId)) continue;
      if (!taskInRange(task, from, to)) continue;
      const feedItem = taskToFeedItem(task);
      if (feedItem) items.push(feedItem);
    }
    upcomingCalendar = items.sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, 5);
  }

  const payload = {
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
    upcomingCalendar,
  };
  dashboardCache.set(cacheKey, { expiresAt: now + DASHBOARD_CACHE_TTL_MS, payload });
  res.json(payload);
  },
);

export default router;
