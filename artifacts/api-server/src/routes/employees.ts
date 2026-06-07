import { Router } from "express";
import { store } from "@workspace/db";
import { canAssignRole, canViewSalaries, hasPermission, isRole } from "@workspace/rbac";
import { requireAuth, hashPassword } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";
import { employeeWithProfile } from "../lib/employee-serializer";
import { generateTemporaryPassword } from "../lib/password";
import { sendCredentialsEmail, sendOnboardingSequence } from "../lib/email";
import {
  allocateEmployeeCode,
  peekNextEmployeeCode,
  validateEmployeeCode,
} from "../lib/employee-code";
import { defaultMascotForRole, isRoleDefaultMascot } from "../lib/mascots";

const router = Router();

function parseStartDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

router.get(
  "/v1/employees",
  requireAuth,
  requirePermission("employees:read", "channels:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const { teamId, status } = req.query;
    const directoryOnly =
      hasPermission(ctx, "channels:write") && !hasPermission(ctx, "employees:read");
    const users = await store.listUsers({
      teamId: teamId ? Number(teamId) : undefined,
      status: (status as string | undefined) ?? (directoryOnly ? "active" : undefined),
    });
    res.json(await Promise.all(users.map((u) => employeeWithProfile(u, ctx))));
  },
);

router.get(
  "/v1/employees/next-employee-code",
  requireAuth,
  requirePermission("employees:write"),
  async (req, res): Promise<void> => {
    const startDateRaw = req.query.startDate;
    const parsedStart =
      startDateRaw !== undefined && startDateRaw !== ""
        ? parseStartDate(startDateRaw)
        : undefined;
    if (
      startDateRaw !== undefined &&
      startDateRaw !== "" &&
      parsedStart === undefined
    ) {
      res.status(400).json({ error: "Invalid start date" });
      return;
    }
    const preview = await peekNextEmployeeCode(parsedStart ?? null);
    res.json(preview);
  },
);

router.post(
  "/v1/employees",
  requireAuth,
  requirePermission("employees:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const {
      fullName,
      email,
      password,
      passwordMode,
      role,
      teamId,
      jobTitle,
      phone,
      employeeCode,
      startDate,
      baseSalary,
      bonus,
      status,
      sendWelcomeEmail: shouldSendEmail = true,
      avatarUrl: bodyAvatarUrl,
      dob,
      address,
      notes,
    } = req.body;

    if (!fullName || !email || !role) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    if (!canAssignRole(ctx.role, role)) {
      res.status(403).json({ error: "Cannot assign this role" });
      return;
    }

    const mode = passwordMode === "manual" ? "manual" : "auto";
    let plainPassword = typeof password === "string" ? password : "";
    if (mode === "auto") {
      plainPassword = generateTemporaryPassword(fullName, phone);
    } else if (!plainPassword || plainPassword.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const existing = await store.findUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: "Email already in use" });
      return;
    }

    const parsedStart = parseStartDate(startDate);
    if (startDate !== undefined && startDate !== null && startDate !== "" && parsedStart === undefined) {
      res.status(400).json({ error: "Invalid start date" });
      return;
    }

    const parsedDob = parseStartDate(dob);
    if (dob !== undefined && dob !== null && dob !== "" && parsedDob === undefined) {
      res.status(400).json({ error: "Invalid date of birth" });
      return;
    }

    let resolvedCode: string;
    if (typeof employeeCode === "string" && employeeCode.trim()) {
      const check = await validateEmployeeCode(employeeCode);
      if (!check.ok) {
        res.status(check.status).json({ error: check.error });
        return;
      }
      resolvedCode = employeeCode.trim().toUpperCase();
    } else {
      resolvedCode = await allocateEmployeeCode(parsedStart ?? null);
    }

    const passwordHash = await hashPassword(plainPassword);
    const resolvedAvatar =
      typeof bodyAvatarUrl === "string" && bodyAvatarUrl.length > 0
        ? bodyAvatarUrl
        : defaultMascotForRole(role);

    const user = await store.createUser({
      email,
      passwordHash,
      fullName,
      role,
      teamId: teamId ?? null,
      jobTitle: jobTitle ?? null,
      phone: phone ?? null,
      employeeCode: resolvedCode,
      startDate: parsedStart ?? null,
      mustChangePassword: true,
      avatarUrl: resolvedAvatar,
      dob: parsedDob ?? null,
      address: address ?? null,
      notes: notes ?? null,
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

    let emailSent = false;
    if (shouldSendEmail !== false) {
      const result = await sendOnboardingSequence({
        to: email.toLowerCase(),
        fullName,
        email: email.toLowerCase(),
        password: plainPassword,
      });
      emailSent = result.welcomeSent && result.guideSent && result.credentialsSent;
    }

    const refreshed = (await store.findUserById(user.id))!;
    const profile = await employeeWithProfile(refreshed, ctx);
    res.status(201).json({ ...profile, emailSent });
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
    const {
      fullName,
      email,
      role,
      teamId,
      jobTitle,
      phone,
      employeeCode,
      startDate,
      baseSalary,
      bonus,
      status,
      payrollStatus,
      avatarUrl: patchAvatarUrl,
      dob,
      address,
      notes,
    } = req.body;

    const parsedStart = parseStartDate(startDate);
    if (startDate !== undefined && startDate !== null && startDate !== "" && parsedStart === undefined) {
      res.status(400).json({ error: "Invalid start date" });
      return;
    }

    const parsedDob = parseStartDate(dob);
    if (dob !== undefined && dob !== null && dob !== "" && parsedDob === undefined) {
      res.status(400).json({ error: "Invalid date of birth" });
      return;
    }

    const existingUser = await store.findUserById(id);
    if (!existingUser) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    if (role !== undefined && role !== "") {
      if (!isRole(role)) {
        res.status(400).json({ error: "Invalid role" });
        return;
      }
      if (role !== existingUser.role && !canAssignRole(ctx.role, role)) {
        res.status(403).json({ error: "Cannot assign this role" });
        return;
      }
    }

    if (email !== undefined) {
      const normalizedEmail = email.toLowerCase();
      if (normalizedEmail !== existingUser.email) {
        const dup = await store.findUserByEmail(normalizedEmail);
        if (dup && dup.id !== id) {
          res.status(409).json({ error: "Email already in use" });
          return;
        }
      }
    }

    if (employeeCode !== undefined && employeeCode !== null && employeeCode !== "") {
      const check = await validateEmployeeCode(employeeCode, id);
      if (!check.ok) {
        res.status(check.status).json({ error: check.error });
        return;
      }
    }

    const roleChanging = role !== undefined && role !== "" && role !== existingUser.role;
    const newRole = roleChanging ? role : existingUser.role;
    const avatarPatch: { avatarUrl?: string | null } = {};
    if (patchAvatarUrl !== undefined) {
      avatarPatch.avatarUrl = patchAvatarUrl || null;
    } else if (roleChanging && isRoleDefaultMascot(existingUser.avatarUrl, existingUser.role)) {
      avatarPatch.avatarUrl = defaultMascotForRole(newRole);
    }

    const user = await store.updateUser(id, {
      ...(fullName !== undefined && { fullName }),
      ...(email !== undefined && { email: email.toLowerCase() }),
      ...(roleChanging && { role: newRole }),
      ...(teamId !== undefined && { teamId }),
      ...(jobTitle !== undefined && { jobTitle }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(employeeCode !== undefined && {
        employeeCode: employeeCode ? String(employeeCode).trim().toUpperCase() : null,
      }),
      ...(parsedStart !== undefined && { startDate: parsedStart }),
      ...(parsedDob !== undefined && { dob: parsedDob }),
      ...(address !== undefined && { address: address || null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(status !== undefined && { status }),
      ...avatarPatch,
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

router.post(
  "/v1/employees/:id/reset-password",
  requireAuth,
  requirePermission("employees:password_reset"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const body = req.body ?? {};
    const mode = body.mode === "manual" ? "manual" : "email";
    const shouldSendEmail = body.sendWelcomeEmail !== false;
    const manualPassword = typeof body.password === "string" ? body.password : "";

    const user = await store.findUserById(id);
    if (!user) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    if (id === ctx.userId) {
      res.status(400).json({ error: "Use Settings to change your own password" });
      return;
    }

    let plainPassword: string;
    if (mode === "manual") {
      if (!manualPassword || manualPassword.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters" });
        return;
      }
      plainPassword = manualPassword;
    } else {
      plainPassword = generateTemporaryPassword(user.fullName, user.phone);
    }

    const passwordHash = await hashPassword(plainPassword);
    const updated = await store.updateUser(id, {
      passwordHash,
      mustChangePassword: true,
    });
    if (!updated) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    let emailSent = false;
    const notifyByEmail =
      mode === "email" ? shouldSendEmail !== false : body.sendWelcomeEmail === true;
    if (notifyByEmail) {
      emailSent = await sendCredentialsEmail({
        to: user.email,
        fullName: user.fullName,
        email: user.email,
        password: plainPassword,
        kind: "password_reset",
      });
    }

    res.json({
      ...(await employeeWithProfile(updated, ctx)),
      emailSent,
      message:
        mode === "manual"
          ? "Password updated. User must change password on next login."
          : "Password reset. User must change password on next login.",
    });
  },
);

router.delete(
  "/v1/employees/:id",
  requireAuth,
  requirePermission("employees:delete"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    if (id === ctx.userId) {
      res.status(400).json({ error: "You cannot delete your own account" });
      return;
    }
    await store.deleteUser(id);
    res.sendStatus(204);
  },
);

export default router;
