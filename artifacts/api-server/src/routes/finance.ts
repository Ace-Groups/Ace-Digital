import { Router } from "express";
import { store } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";

const router = Router();

router.get(
  "/v1/finance/summary",
  requireAuth,
  requirePermission("finance:summary"),
  async (_req, res): Promise<void> => {
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
  },
);

router.get(
  "/v1/finance/me",
  requireAuth,
  requirePermission("finance:salaries_self"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const profile = await store.findProfileByUserId(ctx.userId);
    const user = await store.findUserById(ctx.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const team = user.teamId ? await store.findTeamById(user.teamId) : null;
    const baseSalary = profile?.baseSalary ? Number(profile.baseSalary) : 0;
    const bonus = profile?.bonus ? Number(profile.bonus) : 0;
    res.json({
      userId: user.id,
      fullName: user.fullName,
      teamName: team?.name ?? null,
      jobTitle: user.jobTitle,
      baseSalary,
      bonus,
      totalPay: baseSalary + bonus,
      payrollStatus: profile?.payrollStatus ?? "PENDING",
    });
  },
);

router.get(
  "/v1/finance/salaries",
  requireAuth,
  requirePermission("finance:salaries_all"),
  async (_req, res): Promise<void> => {
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
  },
);

router.get(
  "/v1/finance/expenses",
  requireAuth,
  requirePermission("finance:expenses_read"),
  async (_req, res): Promise<void> => {
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
  },
);

router.post(
  "/v1/finance/expenses",
  requireAuth,
  requirePermission("finance:expenses_write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const { description, amount, teamId } = req.body;
    if (!description || amount == null) {
      res.status(400).json({ error: "Description and amount are required" });
      return;
    }
    const expense = await store.createExpense({
      description,
      amount: String(amount),
      teamId: teamId ?? ctx.teamId,
      submittedById: ctx.userId,
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
  },
);

router.patch(
  "/v1/finance/expenses/:id",
  requireAuth,
  requirePermission("finance:expenses_approve"),
  async (req, res): Promise<void> => {
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { status } = req.body;
    if (!status || !["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    const expense = await store.updateExpense(id, { status });
    if (!expense) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }
    res.json({
      id: expense.id,
      description: expense.description,
      amount: Number(expense.amount),
      status: expense.status,
      createdAt: expense.createdAt.toISOString(),
    });
  },
);

router.get(
  "/v1/finance/payroll-runs",
  requireAuth,
  requirePermission("finance:payroll"),
  async (_req, res): Promise<void> => {
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
  },
);

router.post(
  "/v1/finance/payroll-runs",
  requireAuth,
  requirePermission("finance:payroll"),
  async (req, res): Promise<void> => {
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
  },
);

export default router;
