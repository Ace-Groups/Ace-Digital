import { Router } from "express";
import { store } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/v1/finance/summary", requireAuth, async (_req, res): Promise<void> => {
  const profiles = await store.listProfiles();
  const totalPayroll = profiles.reduce((s, p) => s + Number(p.baseSalary) + Number(p.bonus), 0);
  const totalRevenue = await store.sumActiveClientRevenue();
  const totalExpenses = await store.sumApprovedExpenses();
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
  const rows = await store.listSalaries();
  const teams = await store.listTeams();
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t.name]));
  res.json(
    rows.map((r) => ({
      userId: r.userId,
      fullName: r.fullName,
      teamName: r.teamId ? teamMap[r.teamId] ?? null : null,
      jobTitle: r.jobTitle,
      baseSalary: r.baseSalary,
      bonus: r.bonus,
      totalPay: r.baseSalary + r.bonus,
      payrollStatus: r.payrollStatus,
    })),
  );
});

router.get("/v1/finance/expenses", requireAuth, async (_req, res): Promise<void> => {
  const expenses = await store.listExpenses();
  const teams = await store.listTeams();
  const users = await store.listUsers();
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
    })),
  );
});

router.post("/v1/finance/expenses", requireAuth, async (req, res): Promise<void> => {
  const { description, amount, teamId } = req.body;
  if (!description || amount == null) {
    res.status(400).json({ error: "Description and amount are required" });
    return;
  }
  const expense = await store.createExpense({
    description,
    amount: String(amount),
    teamId: teamId ?? null,
    submittedById: req.user!.userId,
    status: "PENDING",
    receiptUrl: null,
  });
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
  const runs = await store.listPayrollRuns();
  res.json(
    runs.map((r) => ({
      id: r.id,
      month: r.month,
      year: r.year,
      totalAmount: Number(r.totalAmount),
      status: r.status,
      approvedById: r.approvedById,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.post("/v1/finance/payroll-runs", requireAuth, async (req, res): Promise<void> => {
  const canFinance = ["super_admin", "finance"].includes(req.user!.role);
  if (!canFinance) {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }
  const { month, year } = req.body;
  const profiles = await store.listProfiles();
  const totalAmount = profiles.reduce((s, p) => s + Number(p.baseSalary) + Number(p.bonus), 0);
  const run = await store.createPayrollRun({
    month,
    year,
    totalAmount: String(totalAmount),
    status: "PENDING",
    approvedById: null,
  });
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
