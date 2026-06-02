import { Router } from "express";
import { store } from "@workspace/db";
import { canAssignRole, canViewSalaries, hasPermission } from "@workspace/rbac";
import { requireAuth, hashPassword } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";
import { employeeWithProfile } from "../lib/employee-serializer";

const router = Router();

router.get(
  "/v1/employees",
  requireAuth,
  requirePermission("employees:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const { teamId, status } = req.query;
    const users = await store.listUsers({
      teamId: teamId ? Number(teamId) : undefined,
      status: status as string | undefined,
    });
    res.json(await Promise.all(users.map((u) => employeeWithProfile(u, ctx))));
  },
);

router.post(
  "/v1/employees",
  requireAuth,
  requirePermission("employees:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const { fullName, email, password, role, teamId, jobTitle, baseSalary, bonus, status } =
      req.body;
    if (!fullName || !email || !password || !role) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    if (!canAssignRole(ctx.role, role)) {
      res.status(403).json({ error: "Cannot assign this role" });
      return;
    }
    const existing = await store.findUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: "Email already in use" });
      return;
    }
    const passwordHash = await hashPassword(password);
    const user = await store.createUser({
      email,
      passwordHash,
      fullName,
      role,
      teamId: teamId ?? null,
      jobTitle: jobTitle ?? null,
    });
    await store.updateUser(user.id, { status: status ?? "active" });
    if (canViewSalaries(ctx)) {
      await store.createProfile({
        userId: user.id,
        baseSalary: baseSalary ? String(baseSalary) : "0",
        bonus: bonus ? String(bonus) : "0",
      });
    } else {
      await store.createProfile({ userId: user.id });
    }
    const refreshed = (await store.findUserById(user.id))!;
    res.status(201).json(await employeeWithProfile(refreshed, ctx));
  },
);

router.get(
  "/v1/employees/:id",
  requireAuth,
  requirePermission("employees:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const user = await store.findUserById(id);
    if (!user) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }
    res.json(await employeeWithProfile(user, ctx));
  },
);

router.patch(
  "/v1/employees/:id",
  requireAuth,
  requirePermission("employees:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { fullName, email, role, teamId, jobTitle, baseSalary, bonus, status, payrollStatus } =
      req.body;

    if (role !== undefined && !canAssignRole(ctx.role, role)) {
      res.status(403).json({ error: "Cannot assign this role" });
      return;
    }

    const user = await store.updateUser(id, {
      ...(fullName !== undefined && { fullName }),
      ...(email !== undefined && { email: email.toLowerCase() }),
      ...(role !== undefined && { role }),
      ...(teamId !== undefined && { teamId }),
      ...(jobTitle !== undefined && { jobTitle }),
      ...(status !== undefined && { status }),
    });
    if (!user) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }
    if (
      canViewSalaries(ctx) &&
      (baseSalary !== undefined || bonus !== undefined || payrollStatus !== undefined)
    ) {
      await store.updateProfileByUserId(id, {
        ...(baseSalary !== undefined && { baseSalary: String(baseSalary) }),
        ...(bonus !== undefined && { bonus: String(bonus) }),
        ...(payrollStatus !== undefined && { payrollStatus }),
      });
    }
    res.json(await employeeWithProfile(user, ctx));
  },
);

router.delete(
  "/v1/employees/:id",
  requireAuth,
  requirePermission("employees:delete"),
  async (req, res): Promise<void> => {
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    await store.deleteUser(id);
    res.sendStatus(204);
  },
);

export default router;
