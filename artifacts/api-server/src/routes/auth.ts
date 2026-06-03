import { Router } from "express";
import { store } from "@workspace/db";
import { canAssignRole, getPermissionsForRole } from "@workspace/rbac";
import { hashPassword, comparePassword, signToken, requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";
import { userToJson } from "../lib/user-json";

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

  if (user.status && user.status !== "active") {
    res.status(403).json({ error: "Account is not active" });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role, teamId: user.teamId });
  const team = user.teamId ? await store.findTeamById(user.teamId) : null;

  res.json({
    token,
    user: userToJson(user, team),
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
  res.json(userToJson(user, team));
});

router.post("/v1/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }

  const user = await store.findUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const mustChange = user.mustChangePassword ?? false;
  if (!mustChange) {
    if (!currentPassword || typeof currentPassword !== "string") {
      res.status(400).json({ error: "Current password is required" });
      return;
    }
    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = await store.updateUser(user.id, {
    passwordHash,
    mustChangePassword: false,
  });
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const team = updated.teamId ? await store.findTeamById(updated.teamId) : null;
  res.json(userToJson(updated, team));
});

router.get("/v1/auth/permissions", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  res.json({
    role: ctx.role,
    permissions: getPermissionsForRole(ctx.role),
  });
});

router.get("/v1/auth/firebase-custom-token", requireAuth, async (req, res): Promise<void> => {
  const ctx = getAccessContext(req);
  try {
    const { createFirebaseCustomToken } = await import("../lib/firebase-custom-token");
    const token = await createFirebaseCustomToken(ctx.userId, {
      role: ctx.role,
      teamId: ctx.teamId,
    });
    res.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Firebase auth unavailable";
    console.error("[firebase-custom-token]", message);
    res.status(503).json({ error: message });
  }
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
      mustChangePassword: true,
    });

    await store.createProfile({ userId: user.id });

    const team = user.teamId ? await store.findTeamById(user.teamId) : null;
    res.status(201).json(userToJson(user, team));
  },
);

export default router;
