import { Router } from "express";
import { store } from "@workspace/db";
import type { User } from "@workspace/db";
import { requireAuth, hashPassword } from "../lib/auth";

const router = Router();

async function employeeWithProfile(user: User) {
  const team = user.teamId ? await store.findTeamById(user.teamId) : null;
  const profile = await store.findProfileByUserId(user.id);
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
  const users = await store.listUsers({
    teamId: teamId ? Number(teamId) : undefined,
    status: status as string | undefined,
  });
  res.json(await Promise.all(users.map(employeeWithProfile)));
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
  await store.createProfile({
    userId: user.id,
    baseSalary: baseSalary ? String(baseSalary) : "0",
    bonus: bonus ? String(bonus) : "0",
  });
  const refreshed = (await store.findUserById(user.id))!;
  res.status(201).json(await employeeWithProfile(refreshed));
});

router.get("/v1/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const user = await store.findUserById(id);
  if (!user) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.json(await employeeWithProfile(user));
});

router.patch("/v1/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const { fullName, email, role, teamId, jobTitle, baseSalary, bonus, status, payrollStatus } = req.body;
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
  if (baseSalary !== undefined || bonus !== undefined || payrollStatus !== undefined) {
    await store.updateProfileByUserId(id, {
      ...(baseSalary !== undefined && { baseSalary: String(baseSalary) }),
      ...(bonus !== undefined && { bonus: String(bonus) }),
      ...(payrollStatus !== undefined && { payrollStatus }),
    });
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
  await store.deleteUser(id);
  res.sendStatus(204);
});

export default router;
