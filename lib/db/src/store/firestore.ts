import type { App } from "firebase-admin/app";
import { ensureFirebaseAdminApp } from "../firebase-admin-init";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type {
  User,
  Team,
  Project,
  Task,
  Client,
  Approval,
  ActivityLog,
  Notification,
  Channel,
  Message,
  Report,
  Expense,
  PayrollRun,
  EmployeeProfile,
  CalendarEvent,
  ServiceTicket,
  ServiceRecord,
  Note,
} from "../schema";
import { sourceRefKey, type CalendarSourceRef } from "../schema/calendar";
import { normalizeMessageAttachments, sanitizeMessageAttachments } from "../message-attachments";
import type {
  ActivityLogWithActor,
  AccessContext,
  CreateProfileInput,
  CreateUserInput,
  CreateNotificationInput,
  DashboardSnapshot,
  MessageWithSender,
  SalaryRow,
  SalaryPostingRow,
  CreateSalaryPostingInput,
  UpdateProfileInput,
  UpdateUserInput,
  CreateChannelInput,
  UpdateChannelInput,
  ChannelMemberWithUser,
  ChannelMemberRole,
  CreateNoteInput,
  UpdateNoteInput,
} from "./types";
import { buildDashboardSnapshot } from "./build-dashboard";
import {
  buildInitialCompletions,
  computeTaskProgress,
  deriveTaskStatus,
  normalizeAssigneeIds,
} from "../tasks-logic";
import {
  filterApprovalsScoped,
  scopeProjectList,
  scopeTaskList,
} from "./scoping";
import { isTicketFollowUpOverdue, scopeServiceTicketList } from "./service-scoping";
import { calendarEventInRange } from "./calendar-scoping";
import { messageListPreview } from "../chat/preview";

const COL = {
  meta: "_meta",
  teams: "teams",
  users: "users",
  employeeProfiles: "employee_profiles",
  clients: "clients",
  projects: "projects",
  tasks: "tasks",
  taskAssignees: "task_assignees",
  approvals: "approvals",
  expenses: "expenses",
  payrollRuns: "payroll_runs",
  reports: "reports",
  channels: "channels",
  channelMembers: "channel_members",
  channelMemberIndex: "channel_member_index",
  channelPins: "channel_pins",
  messages: "messages",
  calendarEvents: "calendar_events",
  calendarAttendeeIndex: "calendar_attendee_index",
  calendarSourceIndex: "calendar_source_index",
  activityLogs: "activity_logs",
  notifications: "notifications",
  jobTitles: "job_titles",
  salaryPostings: "salary_postings",
  serviceTickets: "service_tickets",
  serviceRecords: "service_records",
  notes: "notes",
} as const;

const EMPLOYEE_CODE_SEQ_KEY = "employeeCodeSeq";
const SERVICE_TICKET_SEQ_KEY = "serviceTicketSeq";

function app(): App {
  return ensureFirebaseAdminApp();
}

let firestoreDb: Firestore | null = null;

function fs(): Firestore {
  if (!firestoreDb) {
    firestoreDb = getFirestore(app());
    firestoreDb.settings({ ignoreUndefinedProperties: true });
  }
  return firestoreDb;
}

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === "string") return new Date(v);
  return new Date();
}

function docId(id: number): string {
  return String(id);
}

async function nextId(collection: string): Promise<number> {
  const ref = fs().collection(COL.meta).doc("counters");
  return fs().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() ?? {};
    const next = ((data[collection] as number) ?? 0) + 1;
    tx.set(ref, { [collection]: next }, { merge: true });
    return next;
  });
}

async function readEmployeeCodeSeq(): Promise<number> {
  const ref = fs().collection(COL.meta).doc("counters");
  const snap = await ref.get();
  const data = snap.data() ?? {};
  return (data[EMPLOYEE_CODE_SEQ_KEY] as number) ?? 0;
}

async function bumpEmployeeCodeSeq(): Promise<number> {
  const ref = fs().collection(COL.meta).doc("counters");
  return fs().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() ?? {};
    const next = ((data[EMPLOYEE_CODE_SEQ_KEY] as number) ?? 0) + 1;
    tx.set(ref, { [EMPLOYEE_CODE_SEQ_KEY]: next }, { merge: true });
    return next;
  });
}

async function nextServiceTicketNumber(): Promise<string> {
  const ref = fs().collection(COL.meta).doc("counters");
  const year = new Date().getFullYear();
  const seq = await fs().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() ?? {};
    const next = ((data[SERVICE_TICKET_SEQ_KEY] as number) ?? 0) + 1;
    tx.set(ref, { [SERVICE_TICKET_SEQ_KEY]: next }, { merge: true });
    return next;
  });
  return `ST-${year}-${String(seq).padStart(4, "0")}`;
}

async function allDocs<T>(collection: string, map: (d: FirebaseFirestore.DocumentData, id: string) => T): Promise<T[]> {
  const snap = await fs().collection(collection).get();
  return snap.docs.map((doc) => map(doc.data(), doc.id));
}

export function createFirestoreStore() {
  const db = fs();

  return {
    async findUserByEmail(email: string): Promise<User | null> {
      const snap = await db.collection(COL.users).where("email", "==", email.toLowerCase()).limit(1).get();
      if (snap.empty) return null;
      const doc = snap.docs[0]!;
      return mapUser(doc.data(), doc.id);
    },

    async findUserById(id: number): Promise<User | null> {
      const snap = await db.collection(COL.users).doc(docId(id)).get();
      if (!snap.exists) return null;
      return mapUser(snap.data()!, snap.id);
    },

    async listUsers(filters?: { teamId?: number; status?: string }): Promise<User[]> {
      let q: FirebaseFirestore.Query = db.collection(COL.users);
      if (filters?.teamId != null) q = q.where("teamId", "==", filters.teamId);
      if (filters?.status) q = q.where("status", "==", filters.status);
      const snap = await q.get();
      return snap.docs.map((d) => mapUser(d.data(), d.id));
    },

    async createUser(data: CreateUserInput): Promise<User> {
      const id = await nextId(COL.users);
      const now = new Date();
      const row = {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        role: data.role,
        teamId: data.teamId ?? null,
        jobTitle: data.jobTitle ?? null,
        phone: data.phone ?? null,
        employeeCode: data.employeeCode
          ? String(data.employeeCode).trim().toUpperCase()
          : null,
        startDate: data.startDate ? data.startDate.toISOString() : null,
        mustChangePassword: data.mustChangePassword ?? true,
        avatarUrl: data.avatarUrl ?? null,
        dob: data.dob ? data.dob.toISOString() : null,
        address: data.address ?? null,
        gender: data.gender ?? null,
        maritalStatus: data.maritalStatus ?? null,
        nationality: data.nationality ?? null,
        aadhaarNumber: data.aadhaarNumber ?? null,
        emergencyContactName: data.emergencyContactName ?? null,
        emergencyContactPhone: data.emergencyContactPhone ?? null,
        highestQualification: data.highestQualification ?? null,
        bloodGroup: data.bloodGroup ?? null,
        aadhaarDocument: data.aadhaarDocument ?? null,
        notes: data.notes ?? null,
        status: "active",
        createdAt: now.toISOString(),
      };
      await db.collection(COL.users).doc(docId(id)).set(row);
      return mapUser(row, String(id));
    },

    async updateUser(id: number, patch: UpdateUserInput): Promise<User | null> {
      const ref = db.collection(COL.users).doc(docId(id));
      const snap = await ref.get();
      if (!snap.exists) return null;
      await ref.set(patch, { merge: true });
      const updated = await ref.get();
      return mapUser(updated.data()!, updated.id);
    },

    async deleteUser(id: number): Promise<void> {
      await db.collection(COL.users).doc(docId(id)).delete();
      await db.collection(COL.employeeProfiles).doc(docId(id)).delete();
    },

    async countActiveUsers(): Promise<number> {
      const snap = await db.collection(COL.users).where("status", "==", "active").get();
      return snap.size;
    },

    async countUsersByTeam(teamId: number): Promise<number> {
      const snap = await db.collection(COL.users).where("teamId", "==", teamId).get();
      return snap.size;
    },

    async findProfileByUserId(userId: number): Promise<EmployeeProfile | null> {
      const snap = await db.collection(COL.employeeProfiles).doc(docId(userId)).get();
      if (!snap.exists) return null;
      return mapProfile(snap.data()!, snap.id);
    },

    async listProfiles(): Promise<EmployeeProfile[]> {
      return allDocs(COL.employeeProfiles, mapProfile);
    },

    async createProfile(data: CreateProfileInput): Promise<EmployeeProfile> {
      const now = new Date().toISOString();
      const row = {
        userId: data.userId,
        baseSalary: data.baseSalary ?? "0",
        bonus: data.bonus ?? "0",
        payrollStatus: "PENDING",
        salaryMode: data.salaryMode ?? "monthly",
        createdAt: now,
        updatedAt: now,
      };
      await db.collection(COL.employeeProfiles).doc(docId(data.userId)).set(row);
      return mapProfile(row, String(data.userId));
    },

    async updateProfileByUserId(userId: number, patch: UpdateProfileInput): Promise<void> {
      await db.collection(COL.employeeProfiles).doc(docId(userId)).set(
        { ...patch, updatedAt: new Date().toISOString() },
        { merge: true },
      );
    },

    async listSalaries(): Promise<SalaryRow[]> {
      const users = await this.listUsers();
      const profiles = await this.listProfiles();
      const profileMap = new Map(profiles.map((p) => [p.userId, p]));
      return users.map((u) => {
        const p = profileMap.get(u.id);
        return {
          userId: u.id,
          fullName: u.fullName,
          teamId: u.teamId,
          jobTitle: u.jobTitle,
          baseSalary: p ? Number(p.baseSalary) : 0,
          bonus: p ? Number(p.bonus) : 0,
          payrollStatus: p?.payrollStatus ?? "PENDING",
          salaryMode: p?.salaryMode ?? "monthly",
        };
      });
    },

    async listTeams(): Promise<Team[]> {
      const snap = await db.collection(COL.teams).get();
      return snap.docs.map((d) => mapTeam(d.data(), d.id)).sort((a, b) => a.name.localeCompare(b.name));
    },

    async findTeamById(id: number): Promise<Team | null> {
      const snap = await db.collection(COL.teams).doc(docId(id)).get();
      if (!snap.exists) return null;
      return mapTeam(snap.data()!, snap.id);
    },

    async createTeam(data: { name: string; color?: string | null }): Promise<Team> {
      const normalized = data.name.trim();
      const existing = await db
        .collection(COL.teams)
        .where("name", "==", normalized)
        .limit(1)
        .get();
      if (!existing.empty) {
        const doc = existing.docs[0]!;
        return mapTeam(doc.data(), doc.id);
      }
      const id = await nextId(COL.teams);
      const now = new Date();
      const row = {
        name: normalized,
        color: data.color ?? null,
        createdAt: now.toISOString(),
      };
      await db.collection(COL.teams).doc(docId(id)).set(row);
      return mapTeam(row, String(id));
    },

    async updateTeam(id: number, patch: Partial<{ name: string; color: string | null }>): Promise<Team | null> {
      const ref = db.collection(COL.teams).doc(docId(id));
      const snap = await ref.get();
      if (!snap.exists) return null;
      await ref.set(patch, { merge: true });
      const updated = await ref.get();
      return mapTeam(updated.data()!, updated.id);
    },

    async deleteTeam(id: number): Promise<void> {
      const batch = db.batch();
      
      const unassign = async (col: string, field: string) => {
        const snap = await db.collection(col).where(field, "==", id).get();
        snap.docs.forEach((doc) => batch.update(doc.ref, { [field]: null }));
      };
      
      await unassign(COL.users, "teamId");
      await unassign(COL.projects, "teamId");
      await unassign(COL.tasks, "teamId");
      await unassign(COL.expenses, "teamId");
      await unassign(COL.approvals, "teamId");
      await unassign(COL.clients, "assignedTeamId");
      await unassign(COL.calendarEvents, "teamId");
      await unassign(COL.serviceTickets, "teamId");
      await unassign(COL.channels, "teamId");
      await unassign(COL.notes, "teamId");
      
      batch.delete(db.collection(COL.teams).doc(docId(id)));
      await batch.commit();
    },

    async bulkUpdateUserTeams(userIds: number[], teamId: number | null): Promise<void> {
      if (userIds.length === 0) return;
      const batch = db.batch();
      for (const uid of userIds) {
        batch.update(db.collection(COL.users).doc(docId(uid)), { teamId });
      }
      await batch.commit();
    },

    async peekEmployeeCodeSequence(): Promise<number> {
      return (await readEmployeeCodeSeq()) + 1;
    },

    async allocateEmployeeCodeSequence(): Promise<number> {
      return bumpEmployeeCodeSeq();
    },

    async isEmployeeCodeTaken(code: string, excludeUserId?: number): Promise<boolean> {
      const normalized = code.trim().toUpperCase();
      const snap = await db
        .collection(COL.users)
        .where("employeeCode", "==", normalized)
        .limit(2)
        .get();
      for (const doc of snap.docs) {
        const uid = Number(doc.id);
        if (excludeUserId != null && uid === excludeUserId) continue;
        return true;
      }
      return false;
    },

    async listJobTitlePresets(): Promise<string[]> {
      const snap = await db.collection(COL.jobTitles).get();
      const fromCatalog = snap.docs.map((d) => String(d.data().name ?? "")).filter(Boolean);
      const users = await db.collection(COL.users).get();
      const fromUsers = users.docs
        .map((d) => (d.data().jobTitle as string) ?? "")
        .filter(Boolean);
      const set = new Set<string>();
      for (const n of [...fromCatalog, ...fromUsers]) {
        set.add(n.trim());
      }
      return [...set].sort((a, b) => a.localeCompare(b));
    },

    async createJobTitle(name: string): Promise<string> {
      const normalized = name.trim();
      if (!normalized) return normalized;
      const existing = await db
        .collection(COL.jobTitles)
        .where("name", "==", normalized)
        .limit(1)
        .get();
      if (!existing.empty) return normalized;
      const id = await nextId(COL.jobTitles);
      const now = new Date();
      await db
        .collection(COL.jobTitles)
        .doc(docId(id))
        .set({ name: normalized, createdAt: now.toISOString() });
      return normalized;
    },

    async listTasks(filters?: {
      projectId?: number;
      teamId?: number;
      assigneeId?: number;
      status?: string;
    }): Promise<Task[]> {
      let q: FirebaseFirestore.Query = db.collection(COL.tasks);
      if (filters?.projectId != null) q = q.where("projectId", "==", filters.projectId);
      if (filters?.teamId != null) q = q.where("teamId", "==", filters.teamId);
      if (filters?.assigneeId != null) {
        q = q.where("assigneeIds", "array-contains", filters.assigneeId);
      }
      if (filters?.status) q = q.where("status", "==", filters.status);
      const snap = await q.get();
      const items = snap.docs.map((d) => mapTask(d.data(), d.id));
      return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async listTasksForAccess(
      ctx: AccessContext,
      filters?: {
        projectId?: number;
        teamId?: number;
        assigneeId?: number;
        status?: string;
      },
    ): Promise<Task[]> {
      const base = await this.listTasks(filters);
      return scopeTaskList(ctx, base);
    },

    async findTaskById(id: number): Promise<Task | null> {
      const snap = await db.collection(COL.tasks).doc(docId(id)).get();
      if (!snap.exists) return null;
      return mapTask(snap.data()!, snap.id);
    },

    async listTasksByProjectId(projectId: number): Promise<Task[]> {
      return this.listTasks({ projectId });
    },

    async createTask(data: Omit<Task, "id" | "createdAt" | "updatedAt">): Promise<Task> {
      const id = await nextId(COL.tasks);
      const now = new Date().toISOString();
      const row = { ...serializeTask(data), createdAt: now, updatedAt: now };
      await db.collection(COL.tasks).doc(docId(id)).set(row);
      return mapTask(row, String(id));
    },

    async updateTask(id: number, patch: Partial<Task>): Promise<Task | null> {
      const ref = db.collection(COL.tasks).doc(docId(id));
      if (!(await ref.get()).exists) return null;
      await ref.set({ ...serializeTask(patch), updatedAt: new Date().toISOString() }, { merge: true });
      const snap = await ref.get();
      return mapTask(snap.data()!, snap.id);
    },

    async deleteTask(id: number): Promise<void> {
      const batch = db.batch();
      const assigneeSnap = await db.collection(COL.taskAssignees).where("taskId", "==", id).get();
      assigneeSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(db.collection(COL.tasks).doc(docId(id)));
      await batch.commit();
    },

    async toggleTaskAssigneeCompletion(taskId: number, userId: number): Promise<Task | null> {
      const task = await this.findTaskById(taskId);
      if (!task) return null;
      const assigneeIds = normalizeAssigneeIds(task.assigneeIds, task.assigneeId);
      const completions = { ...(task.assigneeCompletions ?? {}) };
      if (assigneeIds.length === 0) {
        const progress = task.progress >= 100 ? 0 : 100;
        const status = deriveTaskStatus(progress, assigneeIds, task.status);
        return this.updateTask(taskId, { progress, status });
      }
      if (!assigneeIds.includes(userId)) return null;
      const key = String(userId);
      completions[key] = !completions[key];
      const progress = computeTaskProgress(assigneeIds, completions);
      const status = deriveTaskStatus(progress, assigneeIds, task.status);
      return this.updateTask(taskId, {
        assigneeCompletions: completions,
        progress,
        status,
      });
    },

    async replaceTaskAssignees(
      taskId: number,
      assigneeIds: number[],
      keepCompletions = false,
    ): Promise<Task | null> {
      const task = await this.findTaskById(taskId);
      if (!task) return null;
      const ids = [...new Set(assigneeIds.filter((id) => Number.isFinite(id)))];
      const completions = buildInitialCompletions(
        ids,
        keepCompletions ? (task.assigneeCompletions ?? {}) : undefined,
      );
      const progress = computeTaskProgress(ids, completions);
      const status = deriveTaskStatus(progress, ids, task.status);
      const db = fs();
      const batch = db.batch();
      const existing = await db.collection(COL.taskAssignees).where("taskId", "==", taskId).get();
      existing.docs.forEach((d) => batch.delete(d.ref));
      for (const userId of ids) {
        const ref = db.collection(COL.taskAssignees).doc(`${taskId}_${userId}`);
        batch.set(ref, {
          taskId,
          userId,
          completedAt: completions[String(userId)] ? new Date().toISOString() : null,
        });
      }
      await batch.commit();
      return this.updateTask(taskId, {
        assigneeIds: ids,
        assigneeId: ids[0] ?? null,
        assigneeCompletions: completions,
        progress,
        status,
      });
    },

    async listProjects(filters?: { status?: string; teamId?: number }): Promise<Project[]> {
      let q: FirebaseFirestore.Query = db.collection(COL.projects);
      if (filters?.status) q = q.where("status", "==", filters.status);
      if (filters?.teamId != null) q = q.where("teamId", "==", filters.teamId);
      const snap = await q.get();
      const items = snap.docs.map((d) => mapProject(d.data(), d.id));
      return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async listProjectsForAccess(
      ctx: AccessContext,
      filters?: { status?: string; teamId?: number },
    ): Promise<Project[]> {
      const base =
        ctx.role === "team_lead" || ctx.role === "employee"
          ? await this.listProjects({ ...filters, teamId: ctx.teamId ?? undefined })
          : await this.listProjects(filters);
      return scopeProjectList(ctx, base);
    },

    async findProjectById(id: number): Promise<Project | null> {
      const snap = await db.collection(COL.projects).doc(docId(id)).get();
      if (!snap.exists) return null;
      return mapProject(snap.data()!, snap.id);
    },

    async createProject(data: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<Project> {
      const id = await nextId(COL.projects);
      const now = new Date().toISOString();
      const row = { ...serializeProject(data), createdAt: now, updatedAt: now };
      await db.collection(COL.projects).doc(docId(id)).set(row);
      return mapProject(row, String(id));
    },

    async updateProject(id: number, patch: Partial<Project>): Promise<Project | null> {
      const ref = db.collection(COL.projects).doc(docId(id));
      if (!(await ref.get()).exists) return null;
      await ref.set({ ...serializeProject(patch), updatedAt: new Date().toISOString() }, { merge: true });
      const snap = await ref.get();
      return mapProject(snap.data()!, snap.id);
    },

    async deleteProject(id: number): Promise<void> {
      await db.collection(COL.projects).doc(docId(id)).delete();
    },

    async countActiveProjects(): Promise<number> {
      const snap = await db.collection(COL.projects).where("status", "!=", "DONE").get();
      return snap.size;
    },

    async countActiveProjectsByTeam(teamId: number): Promise<number> {
      const snap = await db
        .collection(COL.projects)
        .where("teamId", "==", teamId)
        .where("status", "in", ["TODO", "IN_PROGRESS", "REVIEW"])
        .get();
      return snap.size;
    },

    async listUpcomingDeadlines(limit = 5): Promise<Project[]> {
      const now = Date.now();
      const snap = await db
        .collection(COL.projects)
        .where("deadline", ">", new Date(now).toISOString())
        .orderBy("deadline", "asc")
        .limit(Math.max(limit * 3, 12))
        .get();
      const projects = snap.docs.map((d) => mapProject(d.data(), d.id));
      return projects
        .filter((p) => p.deadline && p.deadline.getTime() > now && p.status !== "DONE")
        .sort((a, b) => (a.deadline!.getTime() - b.deadline!.getTime()))
        .slice(0, limit);
    },

    async listClients(): Promise<Client[]> {
      const items = await allDocs(COL.clients, mapClient);
      return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async findClientById(id: number): Promise<Client | null> {
      const snap = await db.collection(COL.clients).doc(docId(id)).get();
      if (!snap.exists) return null;
      return mapClient(snap.data()!, snap.id);
    },

    async createClient(data: Omit<Client, "id" | "createdAt" | "updatedAt">): Promise<Client> {
      const id = await nextId(COL.clients);
      const now = new Date().toISOString();
      const row = { ...serializeClient(data), createdAt: now, updatedAt: now };
      await db.collection(COL.clients).doc(docId(id)).set(row);
      return mapClient(row, String(id));
    },

    async updateClient(id: number, patch: Partial<Client>): Promise<Client | null> {
      const ref = db.collection(COL.clients).doc(docId(id));
      if (!(await ref.get()).exists) return null;
      await ref.set({ ...serializeClient(patch), updatedAt: new Date().toISOString() }, { merge: true });
      const snap = await ref.get();
      return mapClient(snap.data()!, snap.id);
    },

    async deleteClient(id: number): Promise<void> {
      await db.collection(COL.clients).doc(docId(id)).delete();
    },

    async listServiceTickets(filters?: {
      status?: string;
      clientId?: number;
      assigneeId?: number;
      overdueFollowUp?: boolean;
    }): Promise<ServiceTicket[]> {
      let q: FirebaseFirestore.Query = db.collection(COL.serviceTickets);
      if (filters?.status) q = q.where("status", "==", filters.status);
      if (filters?.clientId != null) q = q.where("clientId", "==", filters.clientId);
      if (filters?.assigneeId != null) q = q.where("assigneeId", "==", filters.assigneeId);
      const snap = await q.get();
      let items = snap.docs.map((d) => mapServiceTicket(d.data(), d.id));
      if (filters?.overdueFollowUp) {
        items = items.filter((t) => isTicketFollowUpOverdue(t));
      }
      return items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    },

    async listServiceTicketsForAccess(
      ctx: AccessContext,
      filters?: {
        status?: string;
        clientId?: number;
        assigneeId?: number;
        overdueFollowUp?: boolean;
      },
    ): Promise<ServiceTicket[]> {
      const base = await this.listServiceTickets(filters);
      return scopeServiceTicketList(ctx, base);
    },

    async findServiceTicketById(id: number): Promise<ServiceTicket | null> {
      const snap = await db.collection(COL.serviceTickets).doc(docId(id)).get();
      if (!snap.exists) return null;
      return mapServiceTicket(snap.data()!, snap.id);
    },

    async createServiceTicket(
      data: Omit<ServiceTicket, "id" | "ticketNumber" | "createdAt" | "updatedAt"> & {
        ticketNumber?: string;
      },
    ): Promise<ServiceTicket> {
      const id = await nextId(COL.serviceTickets);
      const ticketNumber = data.ticketNumber ?? (await nextServiceTicketNumber());
      const now = new Date().toISOString();
      const { ticketNumber: _tn, ...rest } = data;
      const row = {
        ...serializeServiceTicket({ ...rest, ticketNumber }),
        createdAt: now,
        updatedAt: now,
      };
      await db.collection(COL.serviceTickets).doc(docId(id)).set(row);
      return mapServiceTicket(row, String(id));
    },

    async updateServiceTicket(id: number, patch: Partial<ServiceTicket>): Promise<ServiceTicket | null> {
      const ref = db.collection(COL.serviceTickets).doc(docId(id));
      const existing = await ref.get();
      if (!existing.exists) return null;
      const current = mapServiceTicket(existing.data()!, existing.id);
      const nextStatus = patch.status ?? current.status;
      const resolvedAt =
        patch.resolvedAt !== undefined
          ? patch.resolvedAt
          : nextStatus === "RESOLVED" || nextStatus === "CLOSED"
            ? current.resolvedAt ?? new Date()
            : nextStatus === "OPEN" || nextStatus === "IN_PROGRESS" || nextStatus === "WAITING_CLIENT"
              ? null
              : current.resolvedAt;
      await ref.set(
        {
          ...serializeServiceTicket({ ...patch, resolvedAt }),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      const snap = await ref.get();
      return mapServiceTicket(snap.data()!, snap.id);
    },

    async listServiceRecords(ticketId: number): Promise<ServiceRecord[]> {
      const snap = await db
        .collection(COL.serviceRecords)
        .where("ticketId", "==", ticketId)
        .get();
      const items = snap.docs.map((d) => mapServiceRecord(d.data(), d.id));
      return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async createServiceRecord(
      data: Omit<ServiceRecord, "id" | "createdAt">,
    ): Promise<{ record: ServiceRecord; ticket: ServiceTicket }> {
      const ticket = await this.findServiceTicketById(data.ticketId);
      if (!ticket) throw new Error("Ticket not found");
      const id = await nextId(COL.serviceRecords);
      const now = new Date().toISOString();
      const row = { ...serializeServiceRecord(data), createdAt: now };
      await db.collection(COL.serviceRecords).doc(docId(id)).set(row);
      const record = mapServiceRecord(row, String(id));

      const ticketPatch: Partial<ServiceTicket> = {};
      if (data.statusAfter) ticketPatch.status = data.statusAfter;
      if (data.nextFollowUpAt !== undefined) ticketPatch.nextFollowUpAt = data.nextFollowUpAt;
      const updated =
        Object.keys(ticketPatch).length > 0
          ? await this.updateServiceTicket(data.ticketId, ticketPatch)
          : ticket;

      return { record, ticket: updated ?? ticket };
    },

    async countOverdueServiceFollowUps(): Promise<number> {
      const tickets = await this.listServiceTickets();
      return tickets.filter((t) => isTicketFollowUpOverdue(t)).length;
    },

    async sumActiveClientRevenue(): Promise<number> {
      const clients = await allDocs(COL.clients, mapClient);
      return clients
        .filter((c) => c.status === "ACTIVE")
        .reduce((s, c) => s + (c.contractValue ? Number(c.contractValue) : 0), 0);
    },

    async listApprovals(filters?: { status?: string }): Promise<Approval[]> {
      let q: FirebaseFirestore.Query = db.collection(COL.approvals);
      if (filters?.status) q = q.where("status", "==", filters.status);
      const snap = await q.get();
      const items = snap.docs.map((d) => mapApproval(d.data(), d.id));
      return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async listApprovalsForAccess(
      ctx: AccessContext,
      filters?: { status?: string },
    ): Promise<Approval[]> {
      const base = await this.listApprovals(filters);
      return filterApprovalsScoped(ctx, base);
    },

    async createApproval(data: Omit<Approval, "id" | "createdAt" | "updatedAt">): Promise<Approval> {
      const id = await nextId(COL.approvals);
      const now = new Date().toISOString();
      const row = { ...serializeApproval(data), createdAt: now, updatedAt: now };
      await db.collection(COL.approvals).doc(docId(id)).set(row);
      return mapApproval(row, String(id));
    },

    async findApprovalById(id: number): Promise<Approval | null> {
      const snap = await db.collection(COL.approvals).doc(docId(id)).get();
      if (!snap.exists) return null;
      return mapApproval(snap.data()!, snap.id);
    },

    async updateApproval(id: number, patch: Partial<Approval>): Promise<Approval | null> {
      const ref = db.collection(COL.approvals).doc(docId(id));
      if (!(await ref.get()).exists) return null;
      await ref.set({ ...serializeApproval(patch), updatedAt: new Date().toISOString() }, { merge: true });
      const snap = await ref.get();
      return mapApproval(snap.data()!, snap.id);
    },

    async countPendingApprovals(): Promise<number> {
      const snap = await db.collection(COL.approvals).where("status", "==", "PENDING").get();
      return snap.size;
    },

    async insertActivityLog(data: Omit<ActivityLog, "id" | "createdAt">): Promise<void> {
      const id = await nextId(COL.activityLogs);
      await db.collection(COL.activityLogs).doc(docId(id)).set({
        ...data,
        metadata: data.metadata ?? null,
        createdAt: new Date().toISOString(),
      });
    },

    async listActivityLogs(limit = 20): Promise<ActivityLogWithActor[]> {
      const snap = await db
        .collection(COL.activityLogs)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
      const sorted = snap.docs.map((d) => mapActivity(d.data(), d.id));
      const actorIds = [...new Set(sorted.map((l) => l.actorId).filter((id): id is number => id != null))];
      const users = await Promise.all(actorIds.map((id) => this.findUserById(id)));
      const userMap = new Map(users.filter((u): u is User => u != null).map((u) => [u.id, u.fullName]));
      return sorted.map((l) => ({
        ...l,
        actorName: l.actorId ? userMap.get(l.actorId) ?? null : null,
      }));
    },

    async listNotificationsByUser(userId: number, limit = 50): Promise<Notification[]> {
      const snap = await db
        .collection(COL.notifications)
        .where("userId", "==", userId)
        .limit(limit)
        .get();
      const items = snap.docs.map((d) => mapNotification(d.data(), d.id));
      return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async markNotificationRead(id: number): Promise<Notification | null> {
      const ref = db.collection(COL.notifications).doc(docId(id));
      if (!(await ref.get()).exists) return null;
      await ref.update({ read: "true" });
      const snap = await ref.get();
      return mapNotification(snap.data()!, snap.id);
    },

    async createNotification(data: CreateNotificationInput): Promise<Notification> {
      const id = await nextId(COL.notifications);
      const row = {
        userId: data.userId,
        title: data.title,
        body: data.body,
        read: "false",
        link: data.link ?? null,
        createdAt: new Date().toISOString(),
      };
      await db.collection(COL.notifications).doc(docId(id)).set(row);
      return mapNotification(row, String(id));
    },

    async markAllNotificationsRead(userId: number): Promise<void> {
      const snap = await db.collection(COL.notifications).where("userId", "==", userId).get();
      const batch = db.batch();
      for (const doc of snap.docs) {
        if (doc.data().read !== "true") {
          batch.update(doc.ref, { read: "true" });
        }
      }
      await batch.commit();
    },

    async listChannels(): Promise<Channel[]> {
      const items = await allDocs(COL.channels, mapChannel);
      return items
        .filter((c) => !c.archived)
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    async findChannelById(id: number): Promise<Channel | null> {
      const snap = await db.collection(COL.channels).doc(docId(id)).get();
      if (!snap.exists) return null;
      return mapChannel(snap.data()!, snap.id);
    },

    async createChannel(data: CreateChannelInput): Promise<Channel> {
      const id = await nextId(COL.channels);
      const now = new Date().toISOString();
      const row = {
        name: data.name,
        description: data.description ?? null,
        teamId: data.teamId ?? null,
        type: data.type ?? "TEAM",
        visibility: data.visibility ?? "PRIVATE",
        archived: false,
        avatarUrl: data.avatarUrl ?? null,
        messageCount: 0,
        lastPostAt: null,
        createdById: data.createdById,
        createdAt: now,
      };
      await db.collection(COL.channels).doc(docId(id)).set(row);
      return mapChannel(row, String(id));
    },

    async updateChannel(id: number, patch: UpdateChannelInput): Promise<Channel | null> {
      const ref = db.collection(COL.channels).doc(docId(id));
      const snap = await ref.get();
      if (!snap.exists) return null;
      await ref.set(patch, { merge: true });
      const updated = await ref.get();
      return mapChannel(updated.data()!, updated.id);
    },

    async deleteChannel(id: number): Promise<void> {
      const members = await db.collection(COL.channelMembers).where("channelId", "==", id).get();
      const batch = db.batch();
      members.docs.forEach((d) => batch.delete(d.ref));
      const msgs = await db.collection(COL.messages).where("channelId", "==", id).get();
      msgs.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(db.collection(COL.channels).doc(docId(id)));
      await batch.commit();
    },

    async listChannelIdsForUser(userId: number): Promise<number[]> {
      const snap = await db.collection(COL.channelMembers).where("userId", "==", userId).get();
      return snap.docs.map((d) => Number(d.data().channelId));
    },

    async listChannelsForUser(userId: number, includeArchived = false): Promise<Channel[]> {
      const memberSnap = await db.collection(COL.channelMembers).where("userId", "==", userId).get();
      if (!memberSnap.empty) {
        const batch = db.batch();
        for (const doc of memberSnap.docs) {
          const channelId = Number(doc.data().channelId);
          batch.set(
            db.collection(COL.channelMemberIndex).doc(`${channelId}_${userId}`),
            { channelId, userId },
            { merge: true },
          );
        }
        await batch.commit();
      }
      const ids = memberSnap.docs.map((d) => Number(d.data().channelId));
      if (ids.length === 0) return [];
      const channels = await Promise.all(ids.map((id) => this.findChannelById(id)));
      return channels
        .filter((c): c is Channel => c != null && (includeArchived || !c.archived))
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    async findChannelMembership(channelId: number, userId: number) {
      const snap = await db
        .collection(COL.channelMembers)
        .where("channelId", "==", channelId)
        .where("userId", "==", userId)
        .limit(1)
        .get();
      if (snap.empty) return null;
      const doc = snap.docs[0]!;
      await db
        .collection(COL.channelMemberIndex)
        .doc(`${channelId}_${userId}`)
        .set({ channelId, userId }, { merge: true });
      return mapChannelMember(doc.data(), doc.id);
    },

    async listChannelMembers(channelId: number): Promise<ChannelMemberWithUser[]> {
      const snap = await db.collection(COL.channelMembers).where("channelId", "==", channelId).get();
      const users = await this.listUsers();
      const userMap = new Map(users.map((u) => [u.id, u]));
      return snap.docs
        .map((d) => {
          const m = mapChannelMember(d.data(), d.id);
          const u = userMap.get(m.userId);
          return {
            ...m,
            fullName: u?.fullName ?? "Unknown",
            avatarUrl: u?.avatarUrl ?? null,
            email: u?.email ?? "",
          };
        })
        .sort((a, b) => a.role.localeCompare(b.role) || a.fullName.localeCompare(b.fullName));
    },

    /** One batched read for channel list API (counts + current user's role). */
    async listChannelListMeta(channelIds: number[], userId: number) {
      const counts = new Map<number, number>();
      const roles = new Map<number, ChannelMemberRole>();
      const unreadCounts = new Map<number, number>();
      const lastMessagePreviews = new Map<number, string>();
      const lastReadMessageIds = new Map<number, number | null>();
      const starred = new Map<number, boolean>();

      if (!channelIds.length) {
        return { counts, roles, unreadCounts, lastMessagePreviews, lastReadMessageIds, starred };
      }

      const memberByChannel = new Map<
        number,
        { lastReadAt?: string; lastReadMessageId?: number; joinedAt: string }
      >();

      for (let i = 0; i < channelIds.length; i += 30) {
        const chunk = channelIds.slice(i, i + 30);
        const snap = await db
          .collection(COL.channelMembers)
          .where("channelId", "in", chunk)
          .get();
        for (const doc of snap.docs) {
          const data = doc.data();
          const cid = Number(data.channelId);
          counts.set(cid, (counts.get(cid) ?? 0) + 1);
          if (Number(data.userId) === userId) {
            const role = String(data.role ?? "member").toLowerCase();
            roles.set(
              cid,
              (role === "owner" || role === "member" || role === "viewer"
                ? role
                : "member") as ChannelMemberRole,
            );
            lastReadMessageIds.set(cid, (data.lastReadMessageId as number) ?? null);
            starred.set(cid, Boolean(data.starred));
            memberByChannel.set(cid, {
              lastReadAt: data.lastReadAt as string | undefined,
              lastReadMessageId: data.lastReadMessageId as number | undefined,
              joinedAt: (data.joinedAt as string) ?? new Date(0).toISOString(),
            });
          }
        }
      }

      for (const channelId of channelIds) {
        const snap = await db.collection(COL.messages).where("channelId", "==", channelId).get();
        const messages = snap.docs
          .map((d) => mapMessage(d.data(), d.id))
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        if (messages.length > 0) {
          const last = messages[messages.length - 1]!;
          lastMessagePreviews.set(
            channelId,
            messageListPreview(last.body, last.messageKind ?? "text"),
          );
        }
        const membership = memberByChannel.get(channelId);
        if (membership) {
          const baseline = membership.lastReadAt
            ? new Date(membership.lastReadAt).getTime()
            : new Date(membership.joinedAt).getTime();
          const unread = messages.filter(
            (m) => m.senderId !== userId && m.createdAt.getTime() > baseline,
          ).length;
          unreadCounts.set(channelId, unread);
        }
      }

      return { counts, roles, unreadCounts, lastMessagePreviews, lastReadMessageIds, starred };
    },
    setChannelStarred: async (channelId: number, userId: number, starred: boolean) => {
      const snap = await db
        .collection(COL.channelMembers)
        .where("channelId", "==", channelId)
        .where("userId", "==", userId)
        .limit(1)
        .get();
      if (snap.empty) return;
      await snap.docs[0]!.ref.set({ starred }, { merge: true });
    },
    findDmChannelBetween: async (userA: number, userB: number) => {
      const memberSnap = await db
        .collection(COL.channelMemberIndex)
        .where("userId", "==", userA)
        .get();
      for (const doc of memberSnap.docs) {
        const channelId = Number(doc.data().channelId);
        const chSnap = await db.collection(COL.channels).doc(docId(channelId)).get();
        if (!chSnap.exists || chSnap.data()?.type !== "DM" || chSnap.data()?.archived) continue;
        const memSnap = await db
          .collection(COL.channelMembers)
          .where("channelId", "==", channelId)
          .get();
        const ids = memSnap.docs
          .map((d) => Number(d.data().userId))
          .sort((x, y) => x - y);
        if (ids.length === 2 && ids[0] === Math.min(userA, userB) && ids[1] === Math.max(userA, userB)) {
          return mapChannel(chSnap.data()!, chSnap.id);
        }
      }
      return null;
    },
    listDmChannelsForUser: async (userId: number) => {
      const memberSnap = await db
        .collection(COL.channelMemberIndex)
        .where("userId", "==", userId)
        .get();
      const out: Channel[] = [];
      for (const doc of memberSnap.docs) {
        const channelId = Number(doc.data().channelId);
        const chSnap = await db.collection(COL.channels).doc(docId(channelId)).get();
        if (!chSnap.exists) continue;
        const ch = mapChannel(chSnap.data()!, chSnap.id);
        if (ch.type === "DM" && !ch.archived) out.push(ch);
      }
      return out.sort((a, b) => a.name.localeCompare(b.name));
    },
    listChannelPins: async (channelId: number) => {
      const snap = await db
        .collection(COL.channelPins)
        .where("channelId", "==", channelId)
        .get();
      return snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: Number(d.id),
            channelId: data.channelId as number,
            messageId: data.messageId as number,
            pinnedById: data.pinnedById as number,
            pinnedAt: toDate(data.pinnedAt),
          };
        })
        .sort((a, b) => b.pinnedAt.getTime() - a.pinnedAt.getTime());
    },
    pinMessage: async (channelId: number, messageId: number, pinnedById: number) => {
      const existing = await db
        .collection(COL.channelPins)
        .where("channelId", "==", channelId)
        .where("messageId", "==", messageId)
        .limit(1)
        .get();
      if (!existing.empty) {
        const d = existing.docs[0]!;
        const data = d.data();
        return {
          id: Number(d.id),
          channelId: data.channelId as number,
          messageId: data.messageId as number,
          pinnedById: data.pinnedById as number,
          pinnedAt: toDate(data.pinnedAt),
        };
      }
      const id = await nextId(COL.channelPins);
      const row = {
        channelId,
        messageId,
        pinnedById,
        pinnedAt: new Date().toISOString(),
      };
      await db.collection(COL.channelPins).doc(docId(id)).set(row);
      return {
        id,
        channelId,
        messageId,
        pinnedById,
        pinnedAt: new Date(row.pinnedAt),
      };
    },
    unpinMessage: async (channelId: number, messageId: number) => {
      const snap = await db
        .collection(COL.channelPins)
        .where("channelId", "==", channelId)
        .where("messageId", "==", messageId)
        .get();
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    },
    listChannelFiles: async (
      channelId: number,
      options?: { limit?: number; before?: number; type?: string },
    ) => {
      const limit = options?.limit ?? 50;
      const snap = await db.collection(COL.messages).where("channelId", "==", channelId).get();
      let messages = snap.docs
        .map((d) => {
          const data = d.data();
          const m = mapMessage(data, d.id);
          return {
            ...m,
            senderName: typeof data.senderName === "string" ? data.senderName : null,
          };
        })
        .filter((m) => !m.deletedAt && (m.attachments?.length ?? 0) > 0)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      if (options?.before) {
        const ref = messages.find((m) => m.id === options.before);
        if (ref) {
          const t = ref.createdAt.getTime();
          messages = messages.filter((m) => m.createdAt.getTime() < t);
        }
      }

      type FileRow = {
        messageId: number;
        type: string;
        url: string;
        name?: string;
        mimeType?: string;
        size?: number;
        thumbUrl?: string;
        uploaderId: number;
        uploaderName: string;
        createdAt: Date;
      };
      const out: FileRow[] = [];
      for (const row of messages) {
        for (const att of row.attachments ?? []) {
          if (options?.type && att.type !== options.type) continue;
          out.push({
            messageId: row.id,
            type: att.type,
            url: att.url,
            name: att.name,
            mimeType: att.mimeType,
            size: att.size,
            thumbUrl: att.thumbUrl,
            uploaderId: row.senderId,
            uploaderName: row.senderName ?? "Unknown",
            createdAt: row.createdAt,
          });
          if (out.length >= limit) return out;
        }
      }
      return out;
    },
    markChannelRead: async (channelId: number, userId: number) => {
      const snap = await db.collection(COL.messages).where("channelId", "==", channelId).get();
      const messages = snap.docs
        .map((d) => mapMessage(d.data(), d.id))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const latest = messages[0];
      const readAt = latest?.createdAt.toISOString() ?? new Date().toISOString();

      const memberSnap = await db
        .collection(COL.channelMembers)
        .where("channelId", "==", channelId)
        .where("userId", "==", userId)
        .limit(1)
        .get();
      if (memberSnap.empty) return;
      await memberSnap.docs[0]!.ref.set(
        {
          lastReadAt: readAt,
          lastReadMessageId: latest?.id ?? null,
        },
        { merge: true },
      );
    },

    async addChannelMember(
      channelId: number,
      userId: number,
      role: ChannelMemberRole = "member",
    ) {
      const existing = await this.findChannelMembership(channelId, userId);
      if (existing) {
        const ref = db.collection(COL.channelMembers).doc(docId(existing.id));
        await ref.set({ role }, { merge: true });
        const updated = await ref.get();
        return mapChannelMember(updated.data()!, updated.id);
      }
      const id = await nextId(COL.channelMembers);
      const row = {
        channelId,
        userId,
        role,
        joinedAt: new Date().toISOString(),
      };
      await db.collection(COL.channelMembers).doc(docId(id)).set(row);
      await db
        .collection(COL.channelMemberIndex)
        .doc(`${channelId}_${userId}`)
        .set({ channelId, userId });
      return mapChannelMember(row, String(id));
    },

    async removeChannelMember(channelId: number, userId: number): Promise<void> {
      const snap = await db
        .collection(COL.channelMembers)
        .where("channelId", "==", channelId)
        .where("userId", "==", userId)
        .get();
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      await db.collection(COL.channelMemberIndex).doc(`${channelId}_${userId}`).delete();
    },

    async countChannelOwners(channelId: number): Promise<number> {
      const snap = await db
        .collection(COL.channelMembers)
        .where("channelId", "==", channelId)
        .where("role", "==", "owner")
        .get();
      return snap.size;
    },

    async listMessagesByChannel(
      channelId: number,
      options?: { limit?: number; before?: number; threadRootId?: number },
    ): Promise<MessageWithSender[]> {
      const limit = options?.limit ?? 100;
      let beforeAt: string | null = null;
      if (options?.before) {
        const refSnap = await db.collection(COL.messages).doc(docId(options.before)).get();
        const raw = refSnap.data()?.createdAt;
        beforeAt =
          raw instanceof Date
            ? raw.toISOString()
            : typeof raw === "string"
              ? raw
              : raw && typeof raw === "object" && "toDate" in raw
                ? (raw as { toDate: () => Date }).toDate().toISOString()
                : null;
      }

      let q: FirebaseFirestore.Query = db.collection(COL.messages).where("channelId", "==", channelId);
      if (options?.threadRootId != null) {
        q = q.where("parentMessageId", "==", options.threadRootId);
      }
      q = q.orderBy("createdAt", "desc").limit(limit * 4);
      if (beforeAt) {
        q = q.where("createdAt", "<", beforeAt);
      }

      const snap = await q.get();
      let rows = snap.docs.map((d) => {
        const data = d.data();
        const m = mapMessage(data, d.id);
        return {
          ...m,
          senderName: typeof data.senderName === "string" ? data.senderName : null,
          senderAvatar:
            typeof data.senderAvatar === "string" || data.senderAvatar === null
              ? (data.senderAvatar as string | null)
              : null,
        };
      });
      if (options?.threadRootId == null) {
        rows = rows.filter((m) => m.parentMessageId == null);
      }
      return rows.slice(0, limit).reverse();
    },

    async createMessage(
      data: Omit<Message, "id" | "createdAt"> & {
        senderName?: string | null;
        senderAvatar?: string | null;
      },
    ): Promise<Message> {
      const id = await nextId(COL.messages);
      const row = {
        channelId: data.channelId,
        senderId: data.senderId,
        body: data.body,
        attachments: sanitizeMessageAttachments(data.attachments ?? null),
        messageKind: data.messageKind ?? "text",
        metadata: data.metadata ?? null,
        parentMessageId: data.parentMessageId ?? null,
        editedAt: data.editedAt?.toISOString() ?? null,
        deletedAt: data.deletedAt?.toISOString() ?? null,
        deletedById: data.deletedById ?? null,
        senderName: data.senderName ?? null,
        senderAvatar: data.senderAvatar ?? null,
        createdAt: new Date().toISOString(),
      };
      await db.collection(COL.messages).doc(docId(id)).set(row);

      if (data.parentMessageId) {
        const rootRef = db.collection(COL.messages).doc(docId(data.parentMessageId));
        const rootSnap = await rootRef.get();
        if (rootSnap.exists) {
          const meta = (rootSnap.data()?.metadata ?? {}) as Record<string, unknown>;
          const replyCount = Number(meta.replyCount ?? 0) + 1;
          await rootRef.set({ metadata: { ...meta, replyCount } }, { merge: true });
        }
      }

      const channelRef = db.collection(COL.channels).doc(docId(data.channelId));
      const channelSnap = await channelRef.get();
      const prevCount = Number(channelSnap.data()?.messageCount ?? 0);
      await channelRef.set(
        {
          lastPostAt: row.createdAt,
          messageCount: prevCount + 1,
        },
        { merge: true },
      );

      return mapMessage(row, String(id));
    },

    async updateMessage(
      id: number,
      patch: Partial<
        Pick<Message, "metadata" | "body" | "attachments" | "editedAt" | "parentMessageId">
      >,
    ): Promise<Message | null> {
      const ref = db.collection(COL.messages).doc(docId(id));
      if (!(await ref.get()).exists) return null;
      await ref.set(patch, { merge: true });
      const snap = await ref.get();
      return mapMessage(snap.data()!, snap.id);
    },

    async findMessageById(id: number): Promise<Message | null> {
      const snap = await db.collection(COL.messages).doc(docId(id)).get();
      if (!snap.exists) return null;
      return mapMessage(snap.data()!, snap.id);
    },

    async softDeleteMessage(
      channelId: number,
      messageId: number,
      deletedById: number,
    ): Promise<Message | null> {
      const m = await this.findMessageById(messageId);
      if (!m || m.channelId !== channelId) return null;
      if (m.deletedAt) return m;

      const deletedAt = new Date();
      const ref = db.collection(COL.messages).doc(docId(messageId));
      await ref.set(
        {
          body: "",
          attachments: null,
          metadata: null,
          deletedAt: deletedAt.toISOString(),
          deletedById,
        },
        { merge: true },
      );

      const snap = await db.collection(COL.messages).where("channelId", "==", channelId).get();
      const active = snap.docs
        .map((d) => mapMessage(d.data(), d.id))
        .filter((row) => !row.deletedAt)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const latest = active[0];
      const channelRef = db.collection(COL.channels).doc(docId(channelId));
      if (latest) {
        await channelRef.set(
          {
            lastPostAt: latest.createdAt.toISOString(),
            messageCount: active.length,
          },
          { merge: true },
        );
      } else {
        await channelRef.set({ messageCount: 0 }, { merge: true });
      }

      return mapMessage((await ref.get()).data()!, String(messageId));
    },

    async findMessageByIdWithSender(id: number): Promise<MessageWithSender | null> {
      const m = await this.findMessageById(id);
      if (!m) return null;
      const users = await this.listUsers();
      const user = users.find((u) => u.id === m.senderId);
      return { ...m, senderName: user?.fullName ?? null };
    },

    async findCalendarEventById(id: number): Promise<CalendarEvent | null> {
      const snap = await db.collection(COL.calendarEvents).doc(docId(id)).get();
      if (!snap.exists) return null;
      return mapCalendarEvent(snap.data()!, snap.id);
    },

    async findCalendarEventBySourceRef(
      ownerId: number,
      sourceRef: CalendarSourceRef,
    ): Promise<CalendarEvent | null> {
      if (sourceRef.kind === "native") return null;
      const indexId = `${ownerId}_${sourceRefKey(sourceRef)}`;
      const indexSnap = await db.collection(COL.calendarSourceIndex).doc(indexId).get();
      if (!indexSnap.exists) return null;
      const eventId = indexSnap.data()?.eventId as number;
      return this.findCalendarEventById(eventId);
    },

    async listCalendarEventsInRange(from: Date, to: Date): Promise<CalendarEvent[]> {
      const snap = await db
        .collection(COL.calendarEvents)
        .where("startAt", ">=", from.toISOString())
        .where("startAt", "<=", to.toISOString())
        .get();
      return snap.docs
        .map((d) => mapCalendarEvent(d.data(), d.id))
        .filter((e) => calendarEventInRange(e, from, to));
    },

    async listCalendarEventsForUser(targetUserId: number, from: Date, to: Date): Promise<CalendarEvent[]> {
      const indexSnap = await db
        .collection(COL.calendarAttendeeIndex)
        .where("userId", "==", targetUserId)
        .get();
      const eventIds = new Set(indexSnap.docs.map((d) => d.data().eventId as number));
      const allInRange = await this.listCalendarEventsInRange(from, to);
      return allInRange.filter(
        (e) =>
          eventIds.has(e.id) ||
          e.ownerId === targetUserId ||
          (e.attendeeIds ?? []).includes(targetUserId),
      );
    },

    async createCalendarEvent(
      data: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">,
    ): Promise<CalendarEvent> {
      const id = await nextId(COL.calendarEvents);
      const now = new Date().toISOString();
      const row = serializeCalendarEvent(data);
      await db.collection(COL.calendarEvents).doc(docId(id)).set({
        ...row,
        createdAt: now,
        updatedAt: now,
      });
      const event = mapCalendarEvent({ ...row, createdAt: now, updatedAt: now }, String(id));
      await this.syncCalendarEventIndexes(event);
      return event;
    },

    async updateCalendarEvent(
      id: number,
      patch: Partial<Omit<CalendarEvent, "id" | "createdAt">>,
    ): Promise<CalendarEvent | null> {
      const ref = db.collection(COL.calendarEvents).doc(docId(id));
      if (!(await ref.get()).exists) return null;
      await ref.set(
        { ...serializeCalendarEvent(patch), updatedAt: new Date().toISOString() },
        { merge: true },
      );
      const snap = await ref.get();
      const event = mapCalendarEvent(snap.data()!, snap.id);
      await this.clearCalendarEventIndexes(id);
      await this.syncCalendarEventIndexes(event);
      return event;
    },

    async deleteCalendarEvent(id: number): Promise<void> {
      await this.clearCalendarEventIndexes(id);
      await db.collection(COL.calendarEvents).doc(docId(id)).delete();
    },

    async syncCalendarEventIndexes(event: CalendarEvent): Promise<void> {
      const batch = db.batch();
      const attendees = [...new Set([event.ownerId, ...(event.attendeeIds ?? [])])];
      for (const userId of attendees) {
        batch.set(db.collection(COL.calendarAttendeeIndex).doc(`${event.id}_${userId}`), {
          eventId: event.id,
          userId,
          startAt: event.startAt.toISOString(),
        });
      }
      if (event.sourceRef && event.sourceRef.kind !== "native") {
        const indexId = `${event.ownerId}_${sourceRefKey(event.sourceRef)}`;
        batch.set(db.collection(COL.calendarSourceIndex).doc(indexId), {
          eventId: event.id,
          ownerId: event.ownerId,
          sourceRef: event.sourceRef,
        });
      }
      await batch.commit();
    },

    async clearCalendarEventIndexes(eventId: number): Promise<void> {
      const attendeeSnap = await db
        .collection(COL.calendarAttendeeIndex)
        .where("eventId", "==", eventId)
        .get();
      const sourceSnap = await db
        .collection(COL.calendarSourceIndex)
        .where("eventId", "==", eventId)
        .get();
      const batch = db.batch();
      attendeeSnap.docs.forEach((d) => batch.delete(d.ref));
      sourceSnap.docs.forEach((d) => batch.delete(d.ref));
      if (attendeeSnap.size || sourceSnap.size) await batch.commit();
    },

    async listReports(): Promise<Report[]> {
      const items = await allDocs(COL.reports, mapReport);
      return items.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
    },

    async createReport(data: Omit<Report, "id" | "generatedAt">): Promise<Report> {
      const id = await nextId(COL.reports);
      const row = { ...data, generatedAt: new Date().toISOString() };
      await db.collection(COL.reports).doc(docId(id)).set(row);
      return mapReport(row, String(id));
    },

    async sumApprovedExpenses(): Promise<number> {
      const expenses = await allDocs(COL.expenses, mapExpense);
      return expenses
        .filter((e) => e.status === "APPROVED")
        .reduce((s, e) => s + Number(e.amount), 0);
    },

    async listExpenses(): Promise<Expense[]> {
      const items = await allDocs(COL.expenses, mapExpense);
      return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async createExpense(data: Omit<Expense, "id" | "createdAt">): Promise<Expense> {
      const id = await nextId(COL.expenses);
      const row = { ...data, amount: String(data.amount), createdAt: new Date().toISOString() };
      await db.collection(COL.expenses).doc(docId(id)).set(row);
      return mapExpense(row, String(id));
    },

    async updateExpense(id: number, patch: Partial<Expense>): Promise<Expense | null> {
      const ref = db.collection(COL.expenses).doc(docId(id));
      if (!(await ref.get()).exists) return null;
      const row: Record<string, unknown> = { ...patch };
      if (patch.amount != null) row.amount = String(patch.amount);
      await ref.set(row, { merge: true });
      const snap = await ref.get();
      return mapExpense(snap.data()!, snap.id);
    },

    async findExpenseById(id: number): Promise<Expense | null> {
      const snap = await db.collection(COL.expenses).doc(docId(id)).get();
      if (!snap.exists) return null;
      return mapExpense(snap.data()!, snap.id);
    },

    async listPayrollRuns(): Promise<PayrollRun[]> {
      const items = await allDocs(COL.payrollRuns, mapPayroll);
      return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async createPayrollRun(data: Omit<PayrollRun, "id" | "createdAt">): Promise<PayrollRun> {
      const id = await nextId(COL.payrollRuns);
      const row = { ...data, totalAmount: String(data.totalAmount), createdAt: new Date().toISOString() };
      await db.collection(COL.payrollRuns).doc(docId(id)).set(row);
      return mapPayroll(row, String(id));
    },

    async createSalaryPosting(data: CreateSalaryPostingInput) {
      const id = await nextId(COL.salaryPostings);
      const row = {
        userId: data.userId,
        allocationType: data.allocationType,
        projectId: data.projectId ?? null,
        month: data.month,
        year: data.year,
        baseSalary: data.baseSalary,
        bonus: data.bonus,
        createdById: data.createdById,
        createdAt: new Date().toISOString(),
      };
      await db.collection(COL.salaryPostings).doc(docId(id)).set(row);
      return { id, ...row };
    },

    async listSalaryPostings(): Promise<SalaryPostingRow[]> {
      const items = await allDocs(COL.salaryPostings, (data, id) => ({
        id: Number(id),
        userId: Number(data.userId),
        allocationType: String(data.allocationType) as "MONTHLY" | "PROJECT",
        projectId: data.projectId != null ? Number(data.projectId) : null,
        month: Number(data.month),
        year: Number(data.year),
        baseSalary: Number(data.baseSalary ?? 0),
        bonus: Number(data.bonus ?? 0),
        createdAt: toDate(data.createdAt),
      }));
      const users = await this.listUsers();
      const projects = await this.listProjects();
      const userMap = Object.fromEntries(users.map((u) => [u.id, u.fullName]));
      const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));
      return items
        .map((item) => ({
          ...item,
          fullName: userMap[item.userId] ?? "Unknown",
          projectName: item.projectId != null ? projectMap[item.projectId] ?? null : null,
          totalPay: item.baseSalary + item.bonus,
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async listNotes(userId: number, filters?: { teamId?: number }): Promise<Note[]> {
      const user = await this.findUserById(userId);
      const userTeamId = user?.teamId;

      const snap = await db.collection(COL.notes).get();
      let notes = snap.docs.map(d => mapNote(d.data(), d.id));

      notes = notes.filter(n => {
        if (n.createdById === userId) return true;
        if (userTeamId && n.teamId === userTeamId) return true;
        if (n.sharedUserIds.includes(userId)) return true;
        return false;
      });

      if (filters?.teamId != null) {
        notes = notes.filter(n => n.teamId === filters.teamId);
      }

      return notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    },

    async findNoteById(id: number): Promise<Note | null> {
      const snap = await db.collection(COL.notes).doc(docId(id)).get();
      if (!snap.exists) return null;
      return mapNote(snap.data()!, snap.id);
    },

    async createNote(data: CreateNoteInput): Promise<Note> {
      const id = await nextId(COL.notes);
      const now = new Date().toISOString();
      const row = {
        title: data.title,
        content: data.content,
        createdById: data.createdById,
        teamId: data.teamId ?? null,
        sharedUserIds: data.sharedUserIds ?? [],
        createdAt: now,
        updatedAt: now,
      };
      await db.collection(COL.notes).doc(docId(id)).set(row);
      return mapNote(row, String(id));
    },

    async updateNote(id: number, patch: UpdateNoteInput): Promise<Note | null> {
      const ref = db.collection(COL.notes).doc(docId(id));
      if (!(await ref.get()).exists) return null;
      await ref.set({ ...serializeNote(patch as Partial<Note>), updatedAt: new Date().toISOString() }, { merge: true });
      const snap = await ref.get();
      return mapNote(snap.data()!, snap.id);
    },

    async deleteNote(id: number): Promise<void> {
      await db.collection(COL.notes).doc(docId(id)).delete();
    },

    async getDashboardSnapshot(ctx: AccessContext): Promise<DashboardSnapshot> {
      const self = this;
      return buildDashboardSnapshot(ctx, {
        listProjects: (f) => self.listProjects(f),
        listTasks: (f) => self.listTasks(f),
        listApprovals: (f) => self.listApprovals(f),
        listTeams: () => self.listTeams(),
        countActiveUsers: () => self.countActiveUsers(),
        sumActiveClientRevenue: () => self.sumActiveClientRevenue(),
        listClients: () => self.listClients(),
        listActivityLogs: (limit) => self.listActivityLogs(limit),
        listUpcomingDeadlines: (limit) => self.listUpcomingDeadlines(limit),
        countActiveProjectsByTeam: (teamId) => self.countActiveProjectsByTeam(teamId),
        countUsersByTeam: (teamId) => self.countUsersByTeam(teamId),
        countOverdueServiceFollowUps: () => self.countOverdueServiceFollowUps(),
      });
    },

    /** Seed helper — bulk write demo data */
    async seedCollection(name: string, docs: Record<string, unknown>[]): Promise<void> {
      const batch = db.batch();
      let i = 0;
      for (const doc of docs) {
        const id = (doc.id as number) ?? ++i;
        batch.set(db.collection(name).doc(docId(id)), doc);
      }
      await batch.commit();
    },

    async setCounter(collection: string, value: number): Promise<void> {
      await db.collection(COL.meta).doc("counters").set({ [collection]: value }, { merge: true });
    },

    db,
  };
}

// --- mappers ---
function mapUser(data: FirebaseFirestore.DocumentData, id: string): User {
  return {
    id: Number(id),
    email: data.email as string,
    passwordHash: data.passwordHash as string,
    fullName: data.fullName as string,
    avatarUrl: (data.avatarUrl as string) ?? null,
    role: data.role as string,
    teamId: (data.teamId as number) ?? null,
    jobTitle: (data.jobTitle as string) ?? null,
    phone: (data.phone as string) ?? null,
    employeeCode: (data.employeeCode as string) ?? null,
    startDate: data.startDate ? toDate(data.startDate) : null,
    mustChangePassword: data.mustChangePassword !== false,
    status: data.status as string,
    dob: data.dob ? toDate(data.dob) : null,
    address: (data.address as string) ?? null,
    gender: (data.gender as string) ?? null,
    maritalStatus: (data.maritalStatus as string) ?? null,
    nationality: (data.nationality as string) ?? null,
    aadhaarNumber: (data.aadhaarNumber as string) ?? null,
    emergencyContactName: (data.emergencyContactName as string) ?? null,
    emergencyContactPhone: (data.emergencyContactPhone as string) ?? null,
    highestQualification: (data.highestQualification as string) ?? null,
    bloodGroup: (data.bloodGroup as string) ?? null,
    aadhaarDocument: (data.aadhaarDocument as string) ?? null,
    notes: (data.notes as string) ?? null,
    createdAt: toDate(data.createdAt),
  };
}

function mapTeam(data: FirebaseFirestore.DocumentData, id: string): Team {
  return {
    id: Number(id),
    name: data.name as string,
    color: (data.color as string) ?? null,
    createdAt: toDate(data.createdAt),
  };
}

function mapProfile(data: FirebaseFirestore.DocumentData, id: string): EmployeeProfile {
  return {
    id: Number(id),
    userId: data.userId as number,
    baseSalary: String(data.baseSalary ?? "0"),
    bonus: String(data.bonus ?? "0"),
    payrollStatus: data.payrollStatus as string,
    salaryMode: (data.salaryMode as string) ?? "monthly",
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function mapProject(data: FirebaseFirestore.DocumentData, id: string): Project {
  return {
    id: Number(id),
    name: data.name as string,
    description: (data.description as string) ?? null,
    teamId: (data.teamId as number) ?? null,
    priority: data.priority as string,
    status: data.status as string,
    progress: data.progress as number,
    deadline: data.deadline ? toDate(data.deadline) : null,
    budget: data.budget != null ? String(data.budget) : null,
    clientId: (data.clientId as number) ?? null,
    createdById: (data.createdById as number) ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function serializeProject(p: Partial<Project>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...p };
  if (p.deadline !== undefined) out.deadline = p.deadline ? p.deadline.toISOString() : null;
  if (p.budget !== undefined) out.budget = p.budget != null ? String(p.budget) : null;
  delete out.id;
  delete out.createdAt;
  delete out.updatedAt;
  return out;
}

function mapTask(data: FirebaseFirestore.DocumentData, id: string): Task {
  const assigneeIds = Array.isArray(data.assigneeIds)
    ? (data.assigneeIds as number[])
    : data.assigneeId != null
      ? [data.assigneeId as number]
      : [];
  return {
    id: Number(id),
    title: data.title as string,
    projectId: (data.projectId as number) ?? null,
    assigneeId: (data.assigneeId as number) ?? assigneeIds[0] ?? null,
    assigneeIds,
    teamId: (data.teamId as number) ?? null,
    priority: data.priority as string,
    dueDate: data.dueDate ? toDate(data.dueDate) : null,
    status: data.status as string,
    progress: typeof data.progress === "number" ? data.progress : 0,
    assigneeCompletions: (data.assigneeCompletions as Record<string, boolean>) ?? {},
    createdById: (data.createdById as number) ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function serializeTask(p: Partial<Task>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...p };
  if (p.dueDate !== undefined) out.dueDate = p.dueDate ? p.dueDate.toISOString() : null;
  delete out.id;
  delete out.createdAt;
  delete out.updatedAt;
  return out;
}

function mapClient(data: FirebaseFirestore.DocumentData, id: string): Client {
  return {
    id: Number(id),
    salutation: (data.salutation as string) ?? null,
    contactName: data.contactName as string,
    companyName: data.companyName as string,
    email: data.email as string,
    phone: (data.phone as string) ?? null,
    assignedTeamId: (data.assignedTeamId as number) ?? null,
    status: data.status as string,
    contractValue: data.contractValue != null ? String(data.contractValue) : null,
    nextMeetingAt: data.nextMeetingAt ? toDate(data.nextMeetingAt) : null,
    notes: (data.notes as string) ?? null,
    customFields: (data.customFields as Client["customFields"]) ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function serializeClient(p: Partial<Client>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...p };
  if (p.contractValue !== undefined) out.contractValue = p.contractValue != null ? String(p.contractValue) : null;
  if (p.nextMeetingAt !== undefined) out.nextMeetingAt = p.nextMeetingAt ? p.nextMeetingAt.toISOString() : null;
  delete out.id;
  delete out.createdAt;
  delete out.updatedAt;
  return out;
}

function mapApproval(data: FirebaseFirestore.DocumentData, id: string): Approval {
  return {
    id: Number(id),
    type: data.type as string,
    title: data.title as string,
    description: (data.description as string) ?? null,
    amount: data.amount != null ? String(data.amount) : null,
    requestedById: data.requestedById as number,
    teamId: (data.teamId as number) ?? null,
    status: data.status as string,
    reviewedById: (data.reviewedById as number) ?? null,
    reviewedAt: data.reviewedAt ? toDate(data.reviewedAt) : null,
    note: (data.note as string) ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function serializeApproval(p: Partial<Approval>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...p };
  if (p.amount !== undefined) out.amount = p.amount != null ? String(p.amount) : null;
  if (p.reviewedAt !== undefined) out.reviewedAt = p.reviewedAt ? p.reviewedAt.toISOString() : null;
  delete out.id;
  delete out.createdAt;
  delete out.updatedAt;
  return out;
}

function mapActivity(data: FirebaseFirestore.DocumentData, id: string): ActivityLog {
  return {
    id: Number(id),
    actorId: (data.actorId as number) ?? null,
    action: data.action as string,
    entityType: data.entityType as string,
    entityId: (data.entityId as number) ?? null,
    metadata: data.metadata ?? null,
    createdAt: toDate(data.createdAt),
  };
}

function mapNotification(data: FirebaseFirestore.DocumentData, id: string): Notification {
  return {
    id: Number(id),
    userId: data.userId as number,
    title: data.title as string,
    body: data.body as string,
    read: data.read as string,
    link: (data.link as string) ?? null,
    createdAt: toDate(data.createdAt),
  };
}

function mapChannel(data: FirebaseFirestore.DocumentData, id: string): Channel {
  return {
    id: Number(id),
    name: data.name as string,
    description: (data.description as string) ?? null,
    avatarUrl: (data.avatarUrl as string) ?? null,
    teamId: (data.teamId as number) ?? null,
    type: data.type as string,
    visibility: (data.visibility as string) ?? "PRIVATE",
    archived: Boolean(data.archived),
    lastPostAt: data.lastPostAt ? toDate(data.lastPostAt) : null,
    messageCount: Number(data.messageCount ?? 0),
    createdById: (data.createdById as number) ?? null,
    createdAt: toDate(data.createdAt),
  };
}

function mapChannelMember(data: FirebaseFirestore.DocumentData, id: string) {
  return {
    id: Number(id),
    channelId: data.channelId as number,
    userId: data.userId as number,
    role: data.role as string,
    starred: Boolean(data.starred),
    lastReadAt: data.lastReadAt ? toDate(data.lastReadAt) : null,
    lastReadMessageId: (data.lastReadMessageId as number) ?? null,
    joinedAt: toDate(data.joinedAt),
  };
}

function mapMessage(data: FirebaseFirestore.DocumentData, id: string): Message {
  return {
    id: Number(id),
    channelId: data.channelId as number,
    senderId: data.senderId as number,
    body: (data.body as string) ?? "",
    attachments: normalizeMessageAttachments(data.attachments) ?? null,
    messageKind: (data.messageKind as string) ?? "text",
    metadata: (data.metadata as Record<string, unknown> | null) ?? null,
    parentMessageId: (data.parentMessageId as number | null | undefined) ?? null,
    editedAt: data.editedAt ? toDate(data.editedAt) : null,
    deletedAt: data.deletedAt ? toDate(data.deletedAt) : null,
    deletedById: (data.deletedById as number | null | undefined) ?? null,
    createdAt: toDate(data.createdAt),
  };
}

function mapReport(data: FirebaseFirestore.DocumentData, id: string): Report {
  return {
    id: Number(id),
    type: data.type as string,
    title: data.title as string,
    period: data.period as string,
    generatedAt: toDate(data.generatedAt),
    fileUrl: (data.fileUrl as string) ?? null,
  };
}

function mapExpense(data: FirebaseFirestore.DocumentData, id: string): Expense {
  return {
    id: Number(id),
    description: data.description as string,
    amount: String(data.amount),
    teamId: (data.teamId as number) ?? null,
    submittedById: (data.submittedById as number) ?? null,
    status: data.status as string,
    receiptUrl: (data.receiptUrl as string) ?? null,
    createdAt: toDate(data.createdAt),
  };
}

function mapPayroll(data: FirebaseFirestore.DocumentData, id: string): PayrollRun {
  return {
    id: Number(id),
    month: data.month as number,
    year: data.year as number,
    totalAmount: String(data.totalAmount),
    status: data.status as string,
    approvedById: (data.approvedById as number) ?? null,
    createdAt: toDate(data.createdAt),
  };
}

function mapCalendarEvent(data: FirebaseFirestore.DocumentData, id: string): CalendarEvent {
  return {
    id: Number(id),
    title: data.title as string,
    description: (data.description as string) ?? null,
    eventType: (data.eventType as string) ?? "meeting",
    startAt: toDate(data.startAt),
    endAt: data.endAt ? toDate(data.endAt) : null,
    allDay: Boolean(data.allDay),
    location: (data.location as string) ?? null,
    color: (data.color as string) ?? null,
    ownerId: data.ownerId as number,
    createdById: data.createdById as number,
    teamId: (data.teamId as number) ?? null,
    visibility: (data.visibility as string) ?? "private",
    attendeeIds: Array.isArray(data.attendeeIds) ? (data.attendeeIds as number[]) : [],
    attendeeStatuses: (data.attendeeStatuses as Record<string, string>) ?? {},
    sourceRef: (data.sourceRef as CalendarSourceRef) ?? null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function serializeCalendarEvent(
  p: Partial<Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...p };
  if (p.startAt !== undefined) out.startAt = p.startAt.toISOString();
  if (p.endAt !== undefined) out.endAt = p.endAt ? p.endAt.toISOString() : null;
  delete out.id;
  delete out.createdAt;
  delete out.updatedAt;
  return out;
}

function mapServiceTicket(data: FirebaseFirestore.DocumentData, id: string): ServiceTicket {
  return {
    id: Number(id),
    ticketNumber: data.ticketNumber as string,
    title: data.title as string,
    description: (data.description as string) ?? null,
    linkType: (data.linkType as string) ?? "CLIENT",
    clientId: data.clientId != null ? Number(data.clientId) : null,
    projectId: (data.projectId as number) ?? null,
    taskId: data.taskId != null ? Number(data.taskId) : null,
    assigneeId: (data.assigneeId as number) ?? null,
    teamId: (data.teamId as number) ?? null,
    priority: data.priority as string,
    status: data.status as string,
    category: data.category as string,
    nextFollowUpAt: data.nextFollowUpAt ? toDate(data.nextFollowUpAt) : null,
    resolvedAt: data.resolvedAt ? toDate(data.resolvedAt) : null,
    createdById: data.createdById as number,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function serializeServiceTicket(p: Partial<ServiceTicket>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...p };
  if (p.nextFollowUpAt !== undefined) {
    out.nextFollowUpAt = p.nextFollowUpAt ? p.nextFollowUpAt.toISOString() : null;
  }
  if (p.resolvedAt !== undefined) {
    out.resolvedAt = p.resolvedAt ? p.resolvedAt.toISOString() : null;
  }
  delete out.id;
  delete out.createdAt;
  delete out.updatedAt;
  return out;
}

function mapServiceRecord(data: FirebaseFirestore.DocumentData, id: string): ServiceRecord {
  return {
    id: Number(id),
    ticketId: data.ticketId as number,
    recordType: data.recordType as string,
    body: data.body as string,
    statusAfter: (data.statusAfter as string) ?? null,
    nextFollowUpAt: data.nextFollowUpAt ? toDate(data.nextFollowUpAt) : null,
    createdById: data.createdById as number,
    createdAt: toDate(data.createdAt),
  };
}

function serializeServiceRecord(p: Partial<ServiceRecord>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...p };
  if (p.nextFollowUpAt !== undefined) {
    out.nextFollowUpAt = p.nextFollowUpAt ? p.nextFollowUpAt.toISOString() : null;
  }
  delete out.id;
  delete out.createdAt;
  return out;
}

function mapNote(data: FirebaseFirestore.DocumentData, id: string): Note {
  return {
    id: Number(id),
    title: data.title as string,
    content: (data.content as string) ?? "",
    createdById: data.createdById as number,
    teamId: (data.teamId as number) ?? null,
    sharedUserIds: Array.isArray(data.sharedUserIds) ? (data.sharedUserIds as number[]) : [],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function serializeNote(p: Partial<Note>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...p };
  delete out.id;
  delete out.createdAt;
  delete out.updatedAt;
  return out;
}

export type FirestoreStore = ReturnType<typeof createFirestoreStore>;
