import { Router } from "express";
import { store } from "@workspace/db";
import { hasPermission } from "@workspace/rbac";
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
  "/v1/finance/salary-postings",
  requireAuth,
  requirePermission("finance:salaries_all"),
  async (_req, res): Promise<void> => {
    const rows = await store.listSalaryPostings();
    res.json(
      rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        fullName: r.fullName,
        allocationType: r.allocationType,
        projectId: r.projectId,
        projectName: r.projectName,
        month: r.month,
        year: r.year,
        baseSalary: r.baseSalary,
        bonus: r.bonus,
        totalPay: r.totalPay,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  },
);

router.post(
  "/v1/finance/salary-postings",
  requireAuth,
  requirePermission("finance:payroll"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const { userId, allocationType, projectId, month, year, baseSalary, bonus } = req.body;

    if (!userId || !allocationType || month == null || year == null || baseSalary == null || bonus == null) {
      res.status(400).json({ error: "userId, allocationType, month, year, baseSalary, and bonus are required" });
      return;
    }
    if (!["MONTHLY", "PROJECT"].includes(allocationType)) {
      res.status(400).json({ error: "allocationType must be MONTHLY or PROJECT" });
      return;
    }
    if (allocationType === "PROJECT" && !projectId) {
      res.status(400).json({ error: "projectId is required for PROJECT allocation" });
      return;
    }

    const user = await store.findUserById(Number(userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (allocationType === "PROJECT") {
      const project = await store.findProjectById(Number(projectId));
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
    }

    const baseStr = String(baseSalary);
    const bonusStr = String(bonus);

    if (allocationType === "MONTHLY") {
      let profile = await store.findProfileByUserId(Number(userId));
      if (!profile) {
        profile = await store.createProfile({
          userId: Number(userId),
          baseSalary: baseStr,
          bonus: bonusStr,
        });
      } else {
        await store.updateProfileByUserId(Number(userId), {
          baseSalary: baseStr,
          bonus: bonusStr,
          payrollStatus: "PENDING",
        });
      }
    }

    const row = await store.createSalaryPosting({
      userId: Number(userId),
      allocationType,
      projectId: allocationType === "PROJECT" ? Number(projectId) : null,
      month: Number(month),
      year: Number(year),
      baseSalary: baseStr,
      bonus: bonusStr,
      createdById: ctx.userId,
    });

    const projects =
      allocationType === "PROJECT" && projectId
        ? await store.findProjectById(Number(projectId))
        : null;

    res.status(201).json({
      id: row.id,
      userId: Number(userId),
      fullName: user.fullName,
      allocationType,
      projectId: allocationType === "PROJECT" ? Number(projectId) : null,
      projectName: projects?.name ?? null,
      month: Number(month),
      year: Number(year),
      baseSalary: Number(baseStr),
      bonus: Number(bonusStr),
      totalPay: Number(baseStr) + Number(bonusStr),
      createdAt: new Date(row.createdAt as string | Date).toISOString(),
    });
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
    const { description, amount, teamId, submittedById } = req.body;
    if (!description || amount == null) {
      res.status(400).json({ error: "Description and amount are required" });
      return;
    }

    let submitterId = ctx.userId;
    if (submittedById != null && Number(submittedById) !== ctx.userId) {
      if (!hasPermission(ctx, "employees:read")) {
        res.status(403).json({ error: "Cannot assign expense to another user" });
        return;
      }
      const target = await store.findUserById(Number(submittedById));
      if (!target) {
        res.status(404).json({ error: "Submitted-by user not found" });
        return;
      }
      submitterId = target.id;
    } else if (submittedById != null) {
      submitterId = Number(submittedById);
    }

    const expense = await store.createExpense({
      description,
      amount: String(amount),
      teamId: teamId ?? ctx.teamId,
      submittedById: submitterId,
      status: "PENDING",
      receiptUrl: null,
    });

    const submitter = await store.findUserById(submitterId);
    const team = expense.teamId ? await store.findTeamById(expense.teamId) : null;

    res.status(201).json({
      id: expense.id,
      description: expense.description,
      amount: Number(expense.amount),
      teamId: expense.teamId,
      teamName: team?.name ?? null,
      submittedById: expense.submittedById,
      submitterName: submitter?.fullName ?? null,
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
    if (month == null || year == null) {
      res.status(400).json({ error: "month and year are required" });
      return;
    }
    const profiles = await store.listProfiles();
    const totalAmount = profiles.reduce((s, p) => s + Number(p.baseSalary) + Number(p.bonus), 0);
    const run = await store.createPayrollRun({
      month: Number(month),
      year: Number(year),
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
