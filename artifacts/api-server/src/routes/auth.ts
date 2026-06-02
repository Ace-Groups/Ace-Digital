import { Router } from "express";
import { store } from "@workspace/db";
import { canAssignRole, getPermissionsForRole } from "@workspace/rbac";
import { hashPassword, comparePassword, signToken, requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";

const router = Router();

router.post("/v1/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const user = await store.findUserByEmail(email);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role, teamId: user.teamId });
  const team = user.teamId ? await store.findTeamById(user.teamId) : null;

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      teamId: user.teamId,
      teamName: team?.name ?? null,
      jobTitle: user.jobTitle,
      avatarUrl: user.avatarUrl,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/v1/auth/logout", (_req, res): void => {
  res.json({ message: "Logged out" });
});

router.get("/v1/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = await store.findUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const team = user.teamId ? await store.findTeamById(user.teamId) : null;

  res.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    teamId: user.teamId,
    teamName: team?.name ?? null,
    jobTitle: user.jobTitle,
    avatarUrl: user.avatarUrl,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  });
});

router.get("/v1/auth/permissions", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  res.json({
    role: ctx.role,
    permissions: getPermissionsForRole(ctx.role),
  });
});

router.post(
  "/v1/auth/register",
  requireAuth,
  requirePermission("users:register"),
  async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  const { email, password, fullName, role, teamId, jobTitle } = req.body;
  if (!email || !password || !fullName || !role) {
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

  await store.createProfile({ userId: user.id });

  res.status(201).json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    teamId: user.teamId,
    teamName: null,
    jobTitle: user.jobTitle,
    avatarUrl: user.avatarUrl,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  });
  },
);

export default router;
