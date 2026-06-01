import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, teamsTable, employeeProfilesTable, expensesTable, payrollRunsTable, clientsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/v1/finance/summary", requireAuth, async (_req, res): Promise<void> => {
  const profiles = await db.select().from(employeeProfilesTable);
  const totalPayroll = profiles.reduce((s, p) => s + Number(p.baseSalary) + Number(p.bonus), 0);

  const clientRevenue = await db.execute(
    sql`SELECT COALESCE(SUM(contract_value), 0) as total FROM clients WHERE status = 'ACTIVE'`
  );
  const totalRevenue = Number((clientRevenue.rows[0] as Record<string, unknown>)?.total ?? 0);

  const expenseResult = await db.execute(
    sql`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE status = 'APPROVED'`
  );
  const totalExpenses = Number((expenseResult.rows[0] as Record<string, unknown>)?.total ?? 0);

  const pendingPayroll = profiles
    .filter((p) => p.payrollStatus === "PENDING")
    .reduce((s, p) => s + Number(p.baseSalary) + Number(p.bonus), 0);

  res.json({
    totalPayroll,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    pendingPayroll,
  });
});

router.get("/v1/finance/salaries", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      userId: usersTable.id,
      fullName: usersTable.fullName,
      teamId: usersTable.teamId,
      jobTitle: usersTable.jobTitle,
      baseSalary: employeeProfilesTable.baseSalary,
      bonus: employeeProfilesTable.bonus,
      payrollStatus: employeeProfilesTable.payrollStatus,
    })
    .from(usersTable)
    .leftJoin(employeeProfilesTable, eq(usersTable.id, employeeProfilesTable.userId));

  const teams = await db.select().from(teamsTable);
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t.name]));

  res.json(
    rows.map((r) => ({
      userId: r.userId,
      fullName: r.fullName,
      teamName: r.teamId ? teamMap[r.teamId] ?? null : null,
      jobTitle: r.jobTitle,
      baseSalary: r.baseSalary ? Number(r.baseSalary) : 0,
      bonus: r.bonus ? Number(r.bonus) : 0,
      totalPay: (r.baseSalary ? Number(r.baseSalary) : 0) + (r.bonus ? Number(r.bonus) : 0),
      payrollStatus: r.payrollStatus ?? "PENDING",
    }))
  );
});

router.get("/v1/finance/expenses", requireAuth, async (_req, res): Promise<void> => {
  const expenses = await db.select().from(expensesTable).orderBy(sql`${expensesTable.createdAt} DESC`);
  const teams = await db.select().from(teamsTable);
  const users = await db.select().from(usersTable);
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t.name]));
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.fullName]));
  res.json(
    expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: Number(e.amount),
      teamId: e.teamId,
      teamName: e.teamId ? teamMap[e.teamId] ?? null : null,
      submittedById: e.submittedById,
      submitterName: e.submittedById ? userMap[e.submittedById] ?? null : null,
      status: e.status,
      createdAt: e.createdAt.toISOString(),
    }))
  );
});

router.post("/v1/finance/expenses", requireAuth, async (req, res): Promise<void> => {
  const { description, amount, teamId } = req.body;
  if (!description || amount == null) {
    res.status(400).json({ error: "Description and amount are required" });
    return;
  }
  const [expense] = await db.insert(expensesTable).values({
    description,
    amount: String(amount),
    teamId: teamId ?? null,
    submittedById: req.user!.userId,
    status: "PENDING",
  }).returning();
  res.status(201).json({
    id: expense.id,
    description: expense.description,
    amount: Number(expense.amount),
    teamId: expense.teamId,
    teamName: null,
    submittedById: expense.submittedById,
    submitterName: null,
    status: expense.status,
    createdAt: expense.createdAt.toISOString(),
  });
});

router.get("/v1/finance/payroll-runs", requireAuth, async (_req, res): Promise<void> => {
  const runs = await db.select().from(payrollRunsTable).orderBy(sql`${payrollRunsTable.createdAt} DESC`);
  res.json(
    runs.map((r) => ({
      id: r.id,
      month: r.month,
      year: r.year,
      totalAmount: Number(r.totalAmount),
      status: r.status,
      approvedById: r.approvedById,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

router.post("/v1/finance/payroll-runs", requireAuth, async (req, res): Promise<void> => {
  const canFinance = ["super_admin", "finance"].includes(req.user!.role);
  if (!canFinance) {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }
  const { month, year } = req.body;
  const profiles = await db.select().from(employeeProfilesTable);
  const totalAmount = profiles.reduce((s, p) => s + Number(p.baseSalary) + Number(p.bonus), 0);
  const [run] = await db.insert(payrollRunsTable).values({
    month,
    year,
    totalAmount: String(totalAmount),
    status: "PENDING",
  }).returning();
  res.status(201).json({
    id: run.id,
    month: run.month,
    year: run.year,
    totalAmount: Number(run.totalAmount),
    status: run.status,
    approvedById: run.approvedById,
    createdAt: run.createdAt.toISOString(),
  });
});

export default router;
