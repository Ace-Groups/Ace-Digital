import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, teamsTable, employeeProfilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { hashPassword } from "../lib/auth";

const router = Router();

async function employeeWithProfile(user: typeof usersTable.$inferSelect) {
  const team = user.teamId
    ? (await db.select().from(teamsTable).where(eq(teamsTable.id, user.teamId)))[0]
    : null;
  const [profile] = await db
    .select()
    .from(employeeProfilesTable)
    .where(eq(employeeProfilesTable.userId, user.id));
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    teamId: user.teamId,
    teamName: team?.name ?? null,
    jobTitle: user.jobTitle,
    avatarUrl: user.avatarUrl,
    status: user.status,
    baseSalary: profile?.baseSalary ? Number(profile.baseSalary) : null,
    bonus: profile?.bonus ? Number(profile.bonus) : null,
    payrollStatus: profile?.payrollStatus ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/v1/employees", requireAuth, async (req, res): Promise<void> => {
  const { teamId, status } = req.query;
  const conditions = [];
  if (teamId) conditions.push(eq(usersTable.teamId, Number(teamId)));
  if (status) conditions.push(eq(usersTable.status, status as string));
  const users = conditions.length
    ? await db.select().from(usersTable).where(and(...conditions))
    : await db.select().from(usersTable);
  const result = await Promise.all(users.map(employeeWithProfile));
  res.json(result);
});

router.post("/v1/employees", requireAuth, async (req, res): Promise<void> => {
  const canManage = ["super_admin", "management", "finance"].includes(req.user!.role);
  if (!canManage) {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }
  const { fullName, email, password, role, teamId, jobTitle, baseSalary, bonus, status } = req.body;
  if (!fullName || !email || !password || !role) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash,
    fullName,
    role,
    teamId: teamId ?? null,
    jobTitle: jobTitle ?? null,
    status: status ?? "active",
  }).returning();
  await db.insert(employeeProfilesTable).values({
    userId: user.id,
    baseSalary: baseSalary ? String(baseSalary) : "0",
    bonus: bonus ? String(bonus) : "0",
  });
  res.status(201).json(await employeeWithProfile(user));
});

router.get("/v1/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.json(await employeeWithProfile(user));
});

router.patch("/v1/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const { fullName, email, role, teamId, jobTitle, baseSalary, bonus, status, payrollStatus } = req.body;
  const [user] = await db.update(usersTable).set({
    ...(fullName !== undefined && { fullName }),
    ...(email !== undefined && { email: email.toLowerCase() }),
    ...(role !== undefined && { role }),
    ...(teamId !== undefined && { teamId }),
    ...(jobTitle !== undefined && { jobTitle }),
    ...(status !== undefined && { status }),
  }).where(eq(usersTable.id, id)).returning();
  if (!user) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  if (baseSalary !== undefined || bonus !== undefined || payrollStatus !== undefined) {
    await db.update(employeeProfilesTable).set({
      ...(baseSalary !== undefined && { baseSalary: String(baseSalary) }),
      ...(bonus !== undefined && { bonus: String(bonus) }),
      ...(payrollStatus !== undefined && { payrollStatus }),
    }).where(eq(employeeProfilesTable.userId, id));
  }
  res.json(await employeeWithProfile(user));
});

router.delete("/v1/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const canManage = ["super_admin", "management"].includes(req.user!.role);
  if (!canManage) {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.sendStatus(204);
});

export default router;
