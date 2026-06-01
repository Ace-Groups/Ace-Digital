import { Router } from "express";
import { db } from "@workspace/db";
import {
  projectsTable, usersTable, approvalsTable, activityLogsTable, teamsTable,
} from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/v1/dashboard", requireAuth, async (req, res): Promise<void> => {
  const [projectCount] = await db
    .select({ count: count() })
    .from(projectsTable)
    .where(sql`${projectsTable.status} != 'DONE'`);

  const [employeeCount] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(eq(usersTable.status, "active"));

  const [pendingCount] = await db
    .select({ count: count() })
    .from(approvalsTable)
    .where(eq(approvalsTable.status, "PENDING"));

  const revenueResult = await db.execute(
    sql`SELECT COALESCE(SUM(contract_value), 0) as total FROM clients WHERE status = 'ACTIVE'`
  );
  const monthlyRevenue = Number((revenueResult.rows[0] as Record<string, unknown>)?.total ?? 0);

  const recentActivity = await db
    .select({
      id: activityLogsTable.id,
      actorId: activityLogsTable.actorId,
      actorName: usersTable.fullName,
      action: activityLogsTable.action,
      entityType: activityLogsTable.entityType,
      entityId: activityLogsTable.entityId,
      metadata: activityLogsTable.metadata,
      createdAt: activityLogsTable.createdAt,
    })
    .from(activityLogsTable)
    .leftJoin(usersTable, eq(activityLogsTable.actorId, usersTable.id))
    .orderBy(sql`${activityLogsTable.createdAt} DESC`)
    .limit(10);

  const upcomingDeadlines = await db
    .select()
    .from(projectsTable)
    .where(
      and(
        sql`${projectsTable.deadline} IS NOT NULL`,
        sql`${projectsTable.deadline} > NOW()`,
        sql`${projectsTable.status} != 'DONE'`
      )
    )
    .orderBy(projectsTable.deadline)
    .limit(5);

  const teams = await db.select().from(teamsTable);
  const teamLoad = await Promise.all(
    teams.map(async (team) => {
      const [proj] = await db
        .select({ count: count() })
        .from(projectsTable)
        .where(and(eq(projectsTable.teamId, team.id), sql`${projectsTable.status} != 'DONE'`));
      const [members] = await db
        .select({ count: count() })
        .from(usersTable)
        .where(eq(usersTable.teamId, team.id));
      return {
        teamId: team.id,
        teamName: team.name,
        activeProjects: proj.count,
        members: members.count,
      };
    })
  );

  res.json({
    activeProjectsCount: projectCount.count,
    employeeCount: employeeCount.count,
    monthlyRevenue,
    pendingApprovalsCount: pendingCount.count,
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      actorId: a.actorId,
      actorName: a.actorName,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      metadata: a.metadata,
      createdAt: a.createdAt.toISOString(),
    })),
    upcomingDeadlines: upcomingDeadlines.map((p) => ({
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
    teamLoad,
  });
});

export default router;
