import { Router } from "express";
import { db } from "@workspace/db";
import { teamsTable, usersTable, employeeProfilesTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/v1/teams", requireAuth, async (_req, res): Promise<void> => {
  const teams = await db.select().from(teamsTable);
  const result = await Promise.all(
    teams.map(async (t) => {
      const [members] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.teamId, t.id));
      return {
        id: t.id,
        name: t.name,
        color: t.color,
        memberCount: members.count,
      };
    })
  );
  res.json(result);
});

router.get("/v1/teams/:id/members", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const members = await db
    .select({
      id: usersTable.id,
      fullName: usersTable.fullName,
      email: usersTable.email,
      role: usersTable.role,
      teamId: usersTable.teamId,
      jobTitle: usersTable.jobTitle,
      avatarUrl: usersTable.avatarUrl,
      status: usersTable.status,
      createdAt: usersTable.createdAt,
      baseSalary: employeeProfilesTable.baseSalary,
      bonus: employeeProfilesTable.bonus,
      payrollStatus: employeeProfilesTable.payrollStatus,
    })
    .from(usersTable)
    .leftJoin(employeeProfilesTable, eq(usersTable.id, employeeProfilesTable.userId))
    .where(eq(usersTable.teamId, id));

  const team = (await db.select().from(teamsTable).where(eq(teamsTable.id, id)))[0];

  res.json(
    members.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      email: m.email,
      role: m.role,
      teamId: m.teamId,
      teamName: team?.name ?? null,
      jobTitle: m.jobTitle,
      avatarUrl: m.avatarUrl,
      status: m.status,
      baseSalary: m.baseSalary ? Number(m.baseSalary) : null,
      bonus: m.bonus ? Number(m.bonus) : null,
      payrollStatus: m.payrollStatus,
      createdAt: m.createdAt.toISOString(),
    }))
  );
});

export default router;
