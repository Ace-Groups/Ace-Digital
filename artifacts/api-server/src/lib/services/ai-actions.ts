import { store, type AccessContext } from "@workspace/db";
import { canAssignRole, canWriteProject, canViewSalaries } from "@workspace/rbac";
import { hashPassword } from "../auth";
import { generateTemporaryPassword } from "../password";
import { sendOnboardingSequence } from "../email";
import { allocateEmployeeCode } from "../employee-code";
import { defaultMascotForRole } from "../mascots";
import { normalizeChannelName } from "../channel-serializer";
import { assertServiceTicketAssignee } from "../service-ticket-assignees";
import { resolveServiceTicketCreateLinks } from "../service-ticket-links";

/**
 * Shared create-action services used by both AI tools (after confirmation) and,
 * where practical, HTTP routes. Each enforces the same entity-level guards as
 * the corresponding REST endpoint so the AI path can never exceed a user's role.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export type CreateEmployeeInput = {
  fullName: string;
  email: string;
  role?: string;
  teamId?: number | null;
  jobTitle?: string | null;
  phone?: string | null;
};

export async function createEmployeeAction(
  ctx: AccessContext,
  input: CreateEmployeeInput,
): Promise<ActionResult<{ id: number; fullName: string; email: string; role: string; employeeCode: string }>> {
  const fullName = input.fullName?.trim();
  const email = input.email?.trim().toLowerCase();
  const role = (input.role?.trim() || "employee").toLowerCase();

  if (!fullName || !email) return fail("fullName and email are required");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("A valid email is required");
  if (!canAssignRole(ctx.role, role)) return fail(`You cannot assign the role "${role}"`);

  const existing = await store.findUserByEmail(email);
  if (existing) return fail("A user with that email already exists");

  const plainPassword = generateTemporaryPassword(fullName, input.phone ?? undefined);
  const passwordHash = await hashPassword(plainPassword);
  const employeeCode = await allocateEmployeeCode(null);

  const user = await store.createUser({
    email,
    passwordHash,
    fullName,
    role,
    teamId: input.teamId ?? null,
    jobTitle: input.jobTitle ?? null,
    phone: input.phone ?? null,
    employeeCode,
    startDate: null,
    mustChangePassword: true,
    avatarUrl: defaultMascotForRole(role),
  });
  await store.updateUser(user.id, { status: "active" });
  await store.createProfile(
    canViewSalaries(ctx)
      ? { userId: user.id, baseSalary: "0", bonus: "0", salaryMode: "monthly" }
      : { userId: user.id, salaryMode: "monthly" },
  );

  void sendOnboardingSequence({
    to: email,
    fullName,
    email,
    password: plainPassword,
  }).catch(() => {});

  return {
    ok: true,
    data: { id: user.id, fullName, email, role, employeeCode },
  };
}

export type CreateChannelInput = {
  name: string;
  description?: string | null;
  type?: string;
  teamId?: number | null;
  memberIds?: number[];
};

export async function createChannelAction(
  ctx: AccessContext,
  input: CreateChannelInput,
): Promise<ActionResult<{ id: number; name: string; type: string }>> {
  const normalized = normalizeChannelName(input.name ?? "");
  if (!normalized) {
    return fail("Invalid channel name (2-80 chars, lowercase letters, numbers, hyphens)");
  }

  // Announcement channels are admin-only; default everything else to TEAM.
  const channelType = input.type === "ANNOUNCEMENT" ? "ANNOUNCEMENT" : "TEAM";
  // hasPermission is part of canWriteProject's module; check via store-independent guard.
  if (channelType === "ANNOUNCEMENT" && ctx.role !== "super_admin" && ctx.role !== "management") {
    return fail("Only admins can create announcement channels");
  }

  const channel = await store.createChannel({
    name: normalized,
    description: input.description ?? null,
    teamId: input.teamId ?? null,
    type: channelType,
    visibility: "PRIVATE",
    createdById: ctx.userId,
    avatarUrl: channelType === "ANNOUNCEMENT" ? "icon:megaphone" : null,
  });
  await store.addChannelMember(channel.id, ctx.userId, "owner");

  const ids = Array.isArray(input.memberIds)
    ? [...new Set(input.memberIds.map((id) => Number(id)).filter((id) => id > 0))]
    : [];
  for (const userId of ids) {
    if (userId === ctx.userId) continue;
    await store.addChannelMember(
      channel.id,
      userId,
      channelType === "ANNOUNCEMENT" ? "viewer" : "member",
    );
  }

  return { ok: true, data: { id: channel.id, name: channel.name, type: channelType } };
}

export type CreateProjectInput = {
  name: string;
  description?: string | null;
  teamId?: number | null;
  priority?: string;
  clientId?: number | null;
  deadline?: string | null;
};

export async function createProjectAction(
  ctx: AccessContext,
  input: CreateProjectInput,
): Promise<ActionResult<{ id: number; name: string }>> {
  const name = input.name?.trim();
  if (!name) return fail("Project name is required");
  const effectiveTeamId = input.teamId ?? ctx.teamId ?? null;
  if (!canWriteProject(ctx, effectiveTeamId)) {
    return fail("You cannot create a project for this team");
  }

  const project = await store.createProject({
    name,
    description: input.description ?? null,
    teamId: input.teamId ?? null,
    priority: (input.priority as "LOW" | "MEDIUM" | "HIGH") ?? "MEDIUM",
    status: "TODO",
    progress: 0,
    deadline: input.deadline ? new Date(input.deadline) : null,
    budget: null,
    clientId: input.clientId ?? null,
    createdById: ctx.userId,
  });

  return { ok: true, data: { id: project.id, name: project.name } };
}

export type CreateClientInput = {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  assignedTeamId?: number | null;
};

export async function createClientAction(
  _ctx: AccessContext,
  input: CreateClientInput,
): Promise<ActionResult<{ id: number; companyName: string }>> {
  const companyName = input.companyName?.trim();
  const contactName = input.contactName?.trim();
  const email = input.email?.trim();
  if (!companyName) return fail("Client company name is required");
  if (!contactName) return fail("Client contact name is required");
  if (!email) return fail("Client email is required");

  const client = await store.createClient({
    salutation: null,
    contactName,
    companyName,
    email,
    phone: input.phone ?? null,
    assignedTeamId: input.assignedTeamId ?? null,
    status: "ACTIVE",
    contractValue: null,
    nextMeetingAt: null,
    notes: null,
    customFields: null,
  });

  return { ok: true, data: { id: client.id, companyName: client.companyName } };
}

export type CreateServiceTicketInput = {
  title: string;
  description?: string | null;
  clientId?: number | null;
  projectId?: number | null;
  priority?: string;
};

export async function createServiceTicketAction(
  ctx: AccessContext,
  input: CreateServiceTicketInput,
): Promise<ActionResult<{ id: number; title: string; ticketNumber: string | null }>> {
  const title = input.title?.trim();
  if (!title) return fail("Ticket title is required");

  const linkType = input.clientId != null ? "CLIENT" : "TODO";
  const resolved = await resolveServiceTicketCreateLinks({
    linkType,
    clientId: input.clientId != null ? Number(input.clientId) : null,
    projectId: input.projectId != null ? Number(input.projectId) : null,
    taskId: null,
    defaultTeamId: ctx.teamId,
    defaultAssigneeId: ctx.userId,
  });
  if (!resolved.ok) return fail(resolved.error);

  const { links } = resolved;
  const assigneeId = links.assigneeId ?? ctx.userId;
  const assignCheck = await assertServiceTicketAssignee(ctx, assigneeId);
  if (!assignCheck.ok) return fail(assignCheck.error);

  const ticket = await store.createServiceTicket({
    title,
    description: input.description ?? null,
    linkType: links.linkType,
    clientId: links.clientId,
    projectId: links.projectId,
    taskId: links.taskId,
    assigneeId,
    teamId: links.teamId,
    priority: (input.priority as "LOW" | "MEDIUM" | "HIGH") ?? "MEDIUM",
    status: "OPEN",
    category: linkType === "TODO" ? "OTHER" : "SUPPORT",
    nextFollowUpAt: null,
    resolvedAt: null,
    createdById: ctx.userId,
  });

  return {
    ok: true,
    data: { id: ticket.id, title: ticket.title, ticketNumber: ticket.ticketNumber ?? null },
  };
}

export type CreateNoteInput = {
  title: string;
  content?: string | null;
  teamId?: number | null;
};

export async function createNoteAction(
  ctx: AccessContext,
  input: CreateNoteInput,
): Promise<ActionResult<{ id: number; title: string }>> {
  const title = input.title?.trim();
  if (!title) return fail("Note title is required");

  const note = await store.createNote({
    title,
    content: input.content ?? "",
    teamId: input.teamId ?? null,
    createdById: ctx.userId,
  });

  return { ok: true, data: { id: note.id, title: note.title } };
}
