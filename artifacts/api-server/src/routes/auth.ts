import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, teamsTable, employeeProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword, signToken, requireAuth } from "../lib/auth";

const router = Router();

router.post("/v1/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
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

  const team = user.teamId
    ? (await db.select().from(teamsTable).where(eq(teamsTable.id, user.teamId)))[0]
    : null;

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
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const team = user.teamId
    ? (await db.select().from(teamsTable).where(eq(teamsTable.id, user.teamId)))[0]
    : null;

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

router.post("/v1/auth/register", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "super_admin") {
    res.status(403).json({ error: "Only super_admin can register users" });
    return;
  }

  const { email, password, fullName, role, teamId, jobTitle } = req.body;
  if (!email || !password || !fullName || !role) {
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
  }).returning();

  await db.insert(employeeProfilesTable).values({ userId: user.id });

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
});

export default router;
