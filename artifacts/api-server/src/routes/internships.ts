import { Router } from "express";
import { store } from "@workspace/db";
import { canAssignRole } from "@workspace/rbac";
import { requireAuth, hashPassword } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";
import { employeeWithProfile } from "../lib/employee-serializer";
import { generateTemporaryPassword } from "../lib/password";
import { allocateEmployeeCode } from "../lib/employee-code";
import { defaultMascotForRole } from "../lib/mascots";
import { isInternJobTitle } from "../lib/id-card/is-intern";
import {
  createInternship,
  findInternshipById,
  findInternshipByUserId,
  listInternships,
  updateInternship,
  INTERNSHIP_STEPS,
} from "../lib/internship-store";
import { runInternshipPipeline } from "../lib/internship-pipeline";

const router = Router();

function parseDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

router.get(
  "/v1/internships",
  requireAuth,
  requirePermission("employees:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const internships = await listInternships();

    const enriched = await Promise.all(
      internships.map(async (internship) => {
        const user = await store.findUserById(internship.userId);
        const mentor =
          internship.mentorId != null
            ? await store.findUserById(internship.mentorId)
            : null;
        const profile = user ? await employeeWithProfile(user, ctx) : null;
        return {
          ...internship,
          intern: profile,
          mentorName: mentor?.fullName ?? null,
          steps: INTERNSHIP_STEPS,
        };
      }),
    );

    res.json(enriched);
  },
);

router.get(
  "/v1/internships/me",
  requireAuth,
  requirePermission("employees:read_self"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const internship = await findInternshipByUserId(ctx.userId);
    if (!internship) {
      res.status(404).json({ error: "No internship record for this account" });
      return;
    }
    const mentor =
      internship.mentorId != null
        ? await store.findUserById(internship.mentorId)
        : null;
    const user = await store.findUserById(internship.userId);
    res.json({
      ...internship,
      intern: user ? await employeeWithProfile(user, ctx) : null,
      mentorName: mentor?.fullName ?? null,
      steps: INTERNSHIP_STEPS,
    });
  },
);

router.get(
  "/v1/internships/:id",
  requireAuth,
  requirePermission("employees:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(req.params.id);
    const internship = await findInternshipById(id);
    if (!internship) {
      res.status(404).json({ error: "Internship not found" });
      return;
    }
    const user = await store.findUserById(internship.userId);
    const mentor =
      internship.mentorId != null
        ? await store.findUserById(internship.mentorId)
        : null;
    res.json({
      ...internship,
      intern: user ? await employeeWithProfile(user, ctx) : null,
      mentorName: mentor?.fullName ?? null,
      steps: INTERNSHIP_STEPS,
    });
  },
);

router.post(
  "/v1/internships",
  requireAuth,
  requirePermission("employees:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const {
      fullName,
      email,
      phone,
      teamId,
      university,
      program,
      mentorId,
      startDate,
      endDate,
      notes,
      passwordMode,
      password,
      avatarUrl,
      bloodGroup,
      emergencyContactName,
      emergencyContactPhone,
      sendWelcomeEmail = true,
    } = req.body;

    if (!fullName || !email) {
      res.status(400).json({ error: "fullName and email are required" });
      return;
    }

    const role = "employee";
    if (!canAssignRole(ctx.role, role)) {
      res.status(403).json({ error: "Cannot create intern account" });
      return;
    }

    const existing = await store.findUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: "Email already in use" });
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

    const parsedStart = parseDate(startDate);
    const employeeCode = await allocateEmployeeCode(
      parsedStart ? new Date(parsedStart) : null,
    );
    const passwordHash = await hashPassword(plainPassword);

    const user = await store.createUser({
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      role,
      teamId: teamId ?? null,
      jobTitle: "Intern",
      phone: phone ?? null,
      employeeCode,
      startDate: parsedStart ? new Date(parsedStart) : null,
      mustChangePassword: true,
      avatarUrl:
        typeof avatarUrl === "string" && avatarUrl.length > 0
          ? avatarUrl
          : defaultMascotForRole(role),
      bloodGroup: typeof bloodGroup === "string" ? bloodGroup : null,
      emergencyContactName:
        typeof emergencyContactName === "string" ? emergencyContactName : null,
      emergencyContactPhone:
        typeof emergencyContactPhone === "string" ? emergencyContactPhone : null,
    });

    await store.createProfile({ userId: user.id, salaryMode: "monthly" });

    const internship = await createInternship({
      userId: user.id,
      mentorId: mentorId != null ? Number(mentorId) : null,
      university: typeof university === "string" ? university : null,
      program: typeof program === "string" ? program : "Ace Digital Internship",
      startDate: parsedStart,
      endDate: parseDate(endDate),
      notes: typeof notes === "string" ? notes : null,
      createdById: ctx.userId,
      completedSteps: ["application_received", "hr_review"],
      currentStep: "account_created",
    });

    let pipeline = null;
    if (sendWelcomeEmail !== false) {
      pipeline = await runInternshipPipeline(internship.id, {
        password: plainPassword,
        isIntern: true,
      });
    }

    const refreshed = (await store.findUserById(user.id))!;
    const profile = await employeeWithProfile(refreshed, ctx);

    res.status(201).json({
      internship: pipeline?.internship ?? internship,
      intern: profile,
      pipeline,
      temporaryPassword: plainPassword,
    });
  },
);

router.post(
  "/v1/internships/:id/run-pipeline",
  requireAuth,
  requirePermission("employees:write"),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const internship = await findInternshipById(id);
    if (!internship) {
      res.status(404).json({ error: "Internship not found" });
      return;
    }
    const user = await store.findUserById(internship.userId);
    if (!user) {
      res.status(404).json({ error: "Intern user not found" });
      return;
    }

    const password =
      typeof req.body?.password === "string" && req.body.password.length >= 6
        ? req.body.password
        : generateTemporaryPassword(user.fullName, user.phone);

    const pipeline = await runInternshipPipeline(id, {
      password,
      isIntern: isInternJobTitle(user.jobTitle),
    });
    res.json(pipeline);
  },
);

router.patch(
  "/v1/internships/:id",
  requireAuth,
  requirePermission("employees:write"),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    const { mentorId, university, program, startDate, endDate, notes, status } =
      req.body;
    const updated = await updateInternship(id, {
      mentorId: mentorId !== undefined ? Number(mentorId) || null : undefined,
      university: typeof university === "string" ? university : undefined,
      program: typeof program === "string" ? program : undefined,
      startDate: startDate !== undefined ? parseDate(startDate) : undefined,
      endDate: endDate !== undefined ? parseDate(endDate) : undefined,
      notes: typeof notes === "string" ? notes : undefined,
      status: typeof status === "string" ? status : undefined,
    });
    if (!updated) {
      res.status(404).json({ error: "Internship not found" });
      return;
    }
    res.json(updated);
  },
);

export default router;
