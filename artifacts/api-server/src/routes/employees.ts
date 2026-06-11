import { Router } from "express";
import { store } from "@workspace/db";
import { canAssignRole, canViewSalaries, hasPermission, isRole } from "@workspace/rbac";
import { requireAuth, hashPassword } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";
import { employeeWithProfile } from "../lib/employee-serializer";
import { generateTemporaryPassword } from "../lib/password";
import { sendCredentialsEmail, sendOnboardingSequence, sendIdCardEmail } from "../lib/email";
import { isInternJobTitle } from "../lib/id-card/is-intern";
import { createInternship } from "../lib/internship-store";
import { runInternshipPipeline } from "../lib/internship-pipeline";
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
  const raw = String(value).trim();
  const local = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (local) {
    const d = new Date(Number(local[1]), Number(local[2]) - 1, Number(local[3]));
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const indian = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(raw);
  if (indian) {
    const d = new Date(Number(indian[3]), Number(indian[2]) - 1, Number(indian[1]));
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalDocument(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  // Keep database payloads bounded. 1.6 MB covers a compressed Aadhaar photo/PDF data URL.
  if (value.length > 1_600_000) return null;
  return value;
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
      salaryMode,
      status,
      sendWelcomeEmail: shouldSendEmail = true,
      avatarUrl: bodyAvatarUrl,
      dob,
      address,
      addressLine2,
      city,
      state,
      zipCode,
      country,
      gender,
      maritalStatus,
      nationality,
      aadhaarNumber,
      emergencyContactName,
      emergencyContactPhone,
      highestQualification,
      bloodGroup,
      aadhaarDocument,
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
      address: optionalText(address),
      addressLine2: optionalText(addressLine2),
      city: optionalText(city),
      state: optionalText(state),
      zipCode: optionalText(zipCode),
      country: optionalText(country),
      gender: optionalText(gender),
      maritalStatus: optionalText(maritalStatus),
      nationality: optionalText(nationality),
      aadhaarNumber: optionalText(aadhaarNumber),
      emergencyContactName: optionalText(emergencyContactName),
      emergencyContactPhone: optionalText(emergencyContactPhone),
      highestQualification: optionalText(highestQualification),
      bloodGroup: optionalText(bloodGroup),
      aadhaarDocument: optionalDocument(aadhaarDocument),
      notes: optionalText(notes),
    });
    await store.updateUser(user.id, { status: status ?? "active" });

    if (canViewSalaries(ctx)) {
      await store.createProfile({
        userId: user.id,
        baseSalary: baseSalary ? String(baseSalary) : "0",
        bonus: bonus ? String(bonus) : "0",
        salaryMode: salaryMode ? String(salaryMode) : "monthly",
      });
    } else {
      await store.createProfile({ userId: user.id, salaryMode: "monthly" });
    }

    let emailSent = false;
    let idCardSent = false;
    const intern = isInternJobTitle(jobTitle);

    if (intern) {
      const internship = await createInternship({
        userId: user.id,
        mentorId: null,
        university: null,
        program: "Ace Digital Internship",
        startDate: parsedStart?.toISOString() ?? null,
        endDate: null,
        notes: optionalText(notes),
        createdById: ctx.userId,
        completedSteps: ["application_received", "hr_review"],
        currentStep: "account_created",
      });

      if (shouldSendEmail !== false) {
        const pipeline = await runInternshipPipeline(internship.id, {
          password: plainPassword,
          isIntern: true,
        });
        emailSent = pipeline.onboardingEmailed;
        idCardSent = pipeline.idCardEmailed;
      }
    } else if (shouldSendEmail !== false) {
      const result = await sendOnboardingSequence({
        to: email.toLowerCase(),
        fullName,
        email: email.toLowerCase(),
        password: plainPassword,
      });
      emailSent = result.welcomeSent && result.guideSent && result.credentialsSent;

      const refreshedUser = (await store.findUserById(user.id))!;
      idCardSent = await sendIdCardEmail({
        to: email.toLowerCase(),
        fullName,
        user: refreshedUser,
        extras: {
          teamName:
            user.teamId != null
              ? (await store.findTeamById(user.teamId))?.name ?? null
              : null,
        },
      });
    }

    const refreshed = (await store.findUserById(user.id))!;
    const profile = await employeeWithProfile(refreshed, ctx);
    res.status(201).json({ ...profile, emailSent, idCardSent });
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
      salaryMode,
      status,
      payrollStatus,
      avatarUrl: patchAvatarUrl,
      dob,
      address,
      addressLine2,
      city,
      state,
      zipCode,
      country,
      gender,
      maritalStatus,
      nationality,
      aadhaarNumber,
      emergencyContactName,
      emergencyContactPhone,
      highestQualification,
      bloodGroup,
      aadhaarDocument,
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
      ...(address !== undefined && { address: optionalText(address) }),
      ...(addressLine2 !== undefined && { addressLine2: optionalText(addressLine2) }),
      ...(city !== undefined && { city: optionalText(city) }),
      ...(state !== undefined && { state: optionalText(state) }),
      ...(zipCode !== undefined && { zipCode: optionalText(zipCode) }),
      ...(country !== undefined && { country: optionalText(country) }),
      ...(gender !== undefined && { gender: optionalText(gender) }),
      ...(maritalStatus !== undefined && { maritalStatus: optionalText(maritalStatus) }),
      ...(nationality !== undefined && { nationality: optionalText(nationality) }),
      ...(aadhaarNumber !== undefined && { aadhaarNumber: optionalText(aadhaarNumber) }),
      ...(emergencyContactName !== undefined && {
        emergencyContactName: optionalText(emergencyContactName),
      }),
      ...(emergencyContactPhone !== undefined && {
        emergencyContactPhone: optionalText(emergencyContactPhone),
      }),
      ...(highestQualification !== undefined && {
        highestQualification: optionalText(highestQualification),
      }),
      ...(bloodGroup !== undefined && { bloodGroup: optionalText(bloodGroup) }),
      ...(aadhaarDocument !== undefined && { aadhaarDocument: optionalDocument(aadhaarDocument) }),
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
      (baseSalary !== undefined || bonus !== undefined || payrollStatus !== undefined || salaryMode !== undefined)
    ) {
      await store.updateProfileByUserId(id, {
        ...(baseSalary !== undefined && { baseSalary: String(baseSalary) }),
        ...(bonus !== undefined && { bonus: String(bonus) }),
        ...(payrollStatus !== undefined && { payrollStatus }),
        ...(salaryMode !== undefined && { salaryMode: String(salaryMode) }),
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
