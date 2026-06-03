import { eq, and, sql, count, inArray, desc, lt, gt } from "drizzle-orm";
import { getPgDb } from "../pg";
import {
  usersTable,
  teamsTable,
  jobTitlesTable,
  appMetaTable,
  employeeProfilesTable,
  projectsTable,
  tasksTable,
  taskAssigneesTable,
  clientsTable,
  approvalsTable,
  activityLogsTable,
  notificationsTable,
  channelsTable,
  channelMembersTable,
  messagesTable,
  calendarEventsTable,
  reportsTable,
  expensesTable,
  payrollRunsTable,
  salaryPostingsTable,
} from "../schema";
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
  ChannelMember,
  Message,
  Report,
  Expense,
  PayrollRun,
  EmployeeProfile,
  CalendarEvent,
} from "../schema";
import { sourceRefKey, type CalendarSourceRef } from "../schema/calendar";
import { calendarEventInRange } from "./calendar-scoping";
import { messageListPreview } from "../chat/preview";
import {
  mirrorChannelActivityToFirestore,
  mirrorMessagePatchToFirestore,
  mirrorMessageToFirestore,
} from "../chat/firestore-sync";
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

export function createPostgresStore() {
  const { db } = getPgDb();

  return {
    findUserByEmail: async (email: string) => {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
      return u ?? null;
    },
    findUserById: async (id: number) => {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id));
      return u ?? null;
    },
    listUsers: async (filters?: { teamId?: number; status?: string }) => {
      const conditions = [];
      if (filters?.teamId != null) conditions.push(eq(usersTable.teamId, filters.teamId));
      if (filters?.status) conditions.push(eq(usersTable.status, filters.status));
      return conditions.length
        ? db.select().from(usersTable).where(and(...conditions))
        : db.select().from(usersTable);
    },
    createUser: async (data: CreateUserInput) => {
      const [u] = await db
        .insert(usersTable)
        .values({
          email: data.email.toLowerCase(),
          passwordHash: data.passwordHash,
          fullName: data.fullName,
          role: data.role,
          teamId: data.teamId ?? null,
          jobTitle: data.jobTitle ?? null,
          phone: data.phone ?? null,
          employeeCode: data.employeeCode ?? null,
          startDate: data.startDate ?? null,
          mustChangePassword: data.mustChangePassword ?? true,
        })
        .returning();
      return u;
    },
    updateUser: async (id: number, patch: UpdateUserInput) => {
      const [u] = await db.update(usersTable).set(patch).where(eq(usersTable.id, id)).returning();
      return u ?? null;
    },
    deleteUser: async (id: number) => {
      await db.delete(employeeProfilesTable).where(eq(employeeProfilesTable.userId, id));
      await db.delete(usersTable).where(eq(usersTable.id, id));
    },
    countActiveUsers: async () => {
      const [r] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.status, "active"));
      return r.count;
    },
    countUsersByTeam: async (teamId: number) => {
      const [r] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.teamId, teamId));
      return r.count;
    },
    findProfileByUserId: async (userId: number) => {
      const [p] = await db.select().from(employeeProfilesTable).where(eq(employeeProfilesTable.userId, userId));
      return p ?? null;
    },
    listProfiles: () => db.select().from(employeeProfilesTable),
    createProfile: async (data: CreateProfileInput) => {
      const [p] = await db
        .insert(employeeProfilesTable)
        .values({
          userId: data.userId,
          baseSalary: data.baseSalary ?? "0",
          bonus: data.bonus ?? "0",
        })
        .returning();
      return p;
    },
    updateProfileByUserId: async (userId: number, patch: UpdateProfileInput) => {
      await db.update(employeeProfilesTable).set(patch).where(eq(employeeProfilesTable.userId, userId));
    },
    listSalaries: async (): Promise<SalaryRow[]> => {
      const rows = await db
        .select({
          userId: usersTable.id,
          fullName: usersTable.fullName,
          teamId: usersTable.teamId,
          jobTitle: usersTable.jobTitle,
          baseSalary: employeeProfilesTable.baseSalary,
          bonus: employeeProfilesTable.bonus,
          payrollStatus: employeeProfilesTable.payrollStatus,
        })
        .from(usersTable)
        .leftJoin(employeeProfilesTable, eq(usersTable.id, employeeProfilesTable.userId));
      return rows.map((r) => ({
        userId: r.userId,
        fullName: r.fullName,
        teamId: r.teamId,
        jobTitle: r.jobTitle,
        baseSalary: r.baseSalary ? Number(r.baseSalary) : 0,
        bonus: r.bonus ? Number(r.bonus) : 0,
        payrollStatus: r.payrollStatus ?? "PENDING",
      }));
    },
    listTeams: () => db.select().from(teamsTable),
    findTeamById: async (id: number) => {
      const [t] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
      return t ?? null;
    },
    createTeam: async (data: { name: string; color?: string | null }) => {
      const name = data.name.trim();
      const [existing] = await db.select().from(teamsTable).where(eq(teamsTable.name, name));
      if (existing) return existing;
      const [t] = await db
        .insert(teamsTable)
        .values({ name, color: data.color ?? null })
        .returning();
      return t;
    },
    peekEmployeeCodeSequence: async () => {
      const [row] = await db
        .select()
        .from(appMetaTable)
        .where(eq(appMetaTable.key, "employeeCodeSeq"));
      return (row?.value ?? 0) + 1;
    },
    allocateEmployeeCodeSequence: async () => {
      return db.transaction(async (tx) => {
        const [row] = await tx
          .select()
          .from(appMetaTable)
          .where(eq(appMetaTable.key, "employeeCodeSeq"));
        const next = (row?.value ?? 0) + 1;
        if (row) {
          await tx
            .update(appMetaTable)
            .set({ value: next })
            .where(eq(appMetaTable.key, "employeeCodeSeq"));
        } else {
          await tx.insert(appMetaTable).values({ key: "employeeCodeSeq", value: next });
        }
        return next;
      });
    },
    isEmployeeCodeTaken: async (code: string, excludeUserId?: number) => {
      const normalized = code.trim().toUpperCase();
      const rows = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.employeeCode, normalized));
      return rows.some((r) => r.id !== excludeUserId);
    },
    listJobTitlePresets: async () => {
      const catalog = await db.select({ name: jobTitlesTable.name }).from(jobTitlesTable);
      const users = await db.select({ jobTitle: usersTable.jobTitle }).from(usersTable);
      const set = new Set<string>();
      for (const r of catalog) if (r.name?.trim()) set.add(r.name.trim());
      for (const r of users) if (r.jobTitle?.trim()) set.add(r.jobTitle.trim());
      return [...set].sort((a, b) => a.localeCompare(b));
    },
    createJobTitle: async (name: string) => {
      const normalized = name.trim();
      if (!normalized) return normalized;
      const [existing] = await db
        .select()
        .from(jobTitlesTable)
        .where(eq(jobTitlesTable.name, normalized));
      if (existing) return normalized;
      try {
        await db.insert(jobTitlesTable).values({ name: normalized });
      } catch {
        /* unique conflict — already exists */
      }
      return normalized;
    },
    listTasks: async (filters?: {
      projectId?: number;
      teamId?: number;
      assigneeId?: number;
      status?: string;
    }) => {
      const conditions = [];
      if (filters?.projectId != null) conditions.push(eq(tasksTable.projectId, filters.projectId));
      if (filters?.teamId != null) conditions.push(eq(tasksTable.teamId, filters.teamId));
      if (filters?.status) conditions.push(eq(tasksTable.status, filters.status));
      const q = db.select().from(tasksTable);
      let rows = conditions.length
        ? await q.where(and(...conditions)).orderBy(sql`${tasksTable.createdAt} DESC`)
        : await q.orderBy(sql`${tasksTable.createdAt} DESC`);
      if (filters?.assigneeId != null) {
        rows = rows.filter((t) =>
          normalizeAssigneeIds(t.assigneeIds, t.assigneeId).includes(filters.assigneeId!),
        );
      }
      return rows;
    },
    findTaskById: async (id: number) => {
      const [t] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
      return t ?? null;
    },
    listTasksByProjectId: async (projectId: number) => {
      return db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));
    },
    createTask: async (data: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
      const [t] = await db.insert(tasksTable).values(data).returning();
      return t;
    },
    updateTask: async (id: number, patch: Partial<Task>) => {
      const [t] = await db.update(tasksTable).set(patch).where(eq(tasksTable.id, id)).returning();
      return t ?? null;
    },
    deleteTask: async (id: number) => {
      await db.delete(taskAssigneesTable).where(eq(taskAssigneesTable.taskId, id));
      await db.delete(tasksTable).where(eq(tasksTable.id, id));
    },
    toggleTaskAssigneeCompletion: async (taskId: number, userId: number) => {
      const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
      if (!task) return null;
      const assigneeIds = normalizeAssigneeIds(task.assigneeIds, task.assigneeId);
      const completions = { ...(task.assigneeCompletions ?? {}) };
      if (assigneeIds.length === 0) {
        const progress = (task.progress ?? 0) >= 100 ? 0 : 100;
        const status = deriveTaskStatus(progress, assigneeIds, task.status);
        const [t] = await db
          .update(tasksTable)
          .set({ progress, status })
          .where(eq(tasksTable.id, taskId))
          .returning();
        return t ?? null;
      }
      if (!assigneeIds.includes(userId)) return null;
      const key = String(userId);
      completions[key] = !completions[key];
      const progress = computeTaskProgress(assigneeIds, completions);
      const status = deriveTaskStatus(progress, assigneeIds, task.status);
      const [t] = await db
        .update(tasksTable)
        .set({ assigneeCompletions: completions, progress, status })
        .where(eq(tasksTable.id, taskId))
        .returning();
      if (t) {
        await db.delete(taskAssigneesTable).where(
          and(eq(taskAssigneesTable.taskId, taskId), eq(taskAssigneesTable.userId, userId)),
        );
        await db.insert(taskAssigneesTable).values({
          taskId,
          userId,
          completedAt: completions[key] ? new Date() : null,
        });
      }
      return t ?? null;
    },
    replaceTaskAssignees: async (taskId: number, assigneeIds: number[], keepCompletions = false) => {
      const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
      if (!task) return null;
      const ids = [...new Set(assigneeIds.filter((id) => Number.isFinite(id)))];
      const completions = buildInitialCompletions(
        ids,
        keepCompletions ? (task.assigneeCompletions ?? {}) : undefined,
      );
      const progress = computeTaskProgress(ids, completions);
      const status = deriveTaskStatus(progress, ids, task.status);
      await db.delete(taskAssigneesTable).where(eq(taskAssigneesTable.taskId, taskId));
      if (ids.length) {
        await db.insert(taskAssigneesTable).values(
          ids.map((userId) => ({
            taskId,
            userId,
            completedAt: completions[String(userId)] ? new Date() : null,
          })),
        );
      }
      const [t] = await db
        .update(tasksTable)
        .set({
          assigneeIds: ids,
          assigneeId: ids[0] ?? null,
          assigneeCompletions: completions,
          progress,
          status,
        })
        .where(eq(tasksTable.id, taskId))
        .returning();
      return t ?? null;
    },
    listProjects: async (filters?: { status?: string; teamId?: number }) => {
      const conditions = [];
      if (filters?.status) conditions.push(eq(projectsTable.status, filters.status));
      if (filters?.teamId != null) conditions.push(eq(projectsTable.teamId, filters.teamId));
      const q = db.select().from(projectsTable);
      return conditions.length
        ? q.where(and(...conditions)).orderBy(sql`${projectsTable.createdAt} DESC`)
        : q.orderBy(sql`${projectsTable.createdAt} DESC`);
    },
    listProjectsForAccess: async (
      ctx: AccessContext,
      filters?: { status?: string; teamId?: number },
    ) => {
      const merged = {
        ...filters,
        teamId:
          ctx.role === "team_lead" || ctx.role === "employee"
            ? (ctx.teamId ?? undefined)
            : filters?.teamId,
      };
      const conditions = [];
      if (merged.status) conditions.push(eq(projectsTable.status, merged.status));
      if (merged.teamId != null) conditions.push(eq(projectsTable.teamId, merged.teamId));
      const q = db.select().from(projectsTable);
      const base = conditions.length
        ? await q.where(and(...conditions)).orderBy(sql`${projectsTable.createdAt} DESC`)
        : await q.orderBy(sql`${projectsTable.createdAt} DESC`);
      return scopeProjectList(ctx, base);
    },
    listTasksForAccess: async (
      ctx: AccessContext,
      filters?: {
        projectId?: number;
        teamId?: number;
        assigneeId?: number;
        status?: string;
      },
    ) => {
      const conditions = [];
      if (filters?.projectId != null) conditions.push(eq(tasksTable.projectId, filters.projectId));
      if (filters?.teamId != null) conditions.push(eq(tasksTable.teamId, filters.teamId));
      if (filters?.status) conditions.push(eq(tasksTable.status, filters.status));
      const q = db.select().from(tasksTable);
      const base = conditions.length
        ? await q.where(and(...conditions)).orderBy(sql`${tasksTable.createdAt} DESC`)
        : await q.orderBy(sql`${tasksTable.createdAt} DESC`);
      return scopeTaskList(ctx, base);
    },
    findProjectById: async (id: number) => {
      const [p] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
      return p ?? null;
    },
    createProject: async (data: Omit<Project, "id" | "createdAt" | "updatedAt">) => {
      const [p] = await db.insert(projectsTable).values(data).returning();
      return p;
    },
    updateProject: async (id: number, patch: Partial<Project>) => {
      const [p] = await db.update(projectsTable).set(patch).where(eq(projectsTable.id, id)).returning();
      return p ?? null;
    },
    deleteProject: async (id: number) => {
      await db.delete(projectsTable).where(eq(projectsTable.id, id));
    },
    countActiveProjects: async () => {
      const [r] = await db
        .select({ count: count() })
        .from(projectsTable)
        .where(sql`${projectsTable.status} != 'DONE'`);
      return r.count;
    },
    countActiveProjectsByTeam: async (teamId: number) => {
      const [r] = await db
        .select({ count: count() })
        .from(projectsTable)
        .where(and(eq(projectsTable.teamId, teamId), sql`${projectsTable.status} != 'DONE'`));
      return r.count;
    },
    listUpcomingDeadlines: async (limit = 5) => {
      return db
        .select()
        .from(projectsTable)
        .where(
          and(
            sql`${projectsTable.deadline} IS NOT NULL`,
            sql`${projectsTable.deadline} > NOW()`,
            sql`${projectsTable.status} != 'DONE'`,
          ),
        )
        .orderBy(projectsTable.deadline)
        .limit(limit);
    },
    listClients: () => db.select().from(clientsTable).orderBy(sql`${clientsTable.createdAt} DESC`),
    findClientById: async (id: number) => {
      const [c] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
      return c ?? null;
    },
    createClient: async (data: Omit<Client, "id" | "createdAt" | "updatedAt">) => {
      const [c] = await db.insert(clientsTable).values(data).returning();
      return c;
    },
    updateClient: async (id: number, patch: Partial<Client>) => {
      const [c] = await db.update(clientsTable).set(patch).where(eq(clientsTable.id, id)).returning();
      return c ?? null;
    },
    deleteClient: async (id: number) => {
      await db.delete(clientsTable).where(eq(clientsTable.id, id));
    },
    sumActiveClientRevenue: async () => {
      const r = await db.execute(
        sql`SELECT COALESCE(SUM(contract_value), 0) as total FROM clients WHERE status = 'ACTIVE'`,
      );
      return Number((r.rows[0] as Record<string, unknown>)?.total ?? 0);
    },
    listApprovals: async (filters?: { status?: string }) => {
      const q = db.select().from(approvalsTable);
      return filters?.status
        ? q.where(eq(approvalsTable.status, filters.status)).orderBy(sql`${approvalsTable.createdAt} DESC`)
        : q.orderBy(sql`${approvalsTable.createdAt} DESC`);
    },
    listApprovalsForAccess: async (ctx: AccessContext, filters?: { status?: string }) => {
      const q = db.select().from(approvalsTable);
      const base = filters?.status
        ? await q.where(eq(approvalsTable.status, filters.status)).orderBy(sql`${approvalsTable.createdAt} DESC`)
        : await q.orderBy(sql`${approvalsTable.createdAt} DESC`);
      return filterApprovalsScoped(ctx, base);
    },
    createApproval: async (data: Omit<Approval, "id" | "createdAt" | "updatedAt">) => {
      const [a] = await db.insert(approvalsTable).values(data).returning();
      return a;
    },
    findApprovalById: async (id: number) => {
      const [a] = await db.select().from(approvalsTable).where(eq(approvalsTable.id, id));
      return a ?? null;
    },
    updateApproval: async (id: number, patch: Partial<Approval>) => {
      const [a] = await db.update(approvalsTable).set(patch).where(eq(approvalsTable.id, id)).returning();
      return a ?? null;
    },
    countPendingApprovals: async () => {
      const [r] = await db
        .select({ count: count() })
        .from(approvalsTable)
        .where(eq(approvalsTable.status, "PENDING"));
      return r.count;
    },
    insertActivityLog: async (data: Omit<ActivityLog, "id" | "createdAt">) => {
      await db.insert(activityLogsTable).values(data);
    },
    listActivityLogs: async (limit = 20): Promise<ActivityLogWithActor[]> => {
      const rows = await db
        .select({
          id: activityLogsTable.id,
          actorId: activityLogsTable.actorId,
          actorName: usersTable.fullName,
          action: activityLogsTable.action,
          entityType: activityLogsTable.entityType,
          entityId: activityLogsTable.entityId,
          metadata: activityLogsTable.metadata,
          createdAt: activityLogsTable.createdAt,
        })
        .from(activityLogsTable)
        .leftJoin(usersTable, eq(activityLogsTable.actorId, usersTable.id))
        .orderBy(sql`${activityLogsTable.createdAt} DESC`)
        .limit(limit);
      return rows.map((r) => ({
        id: r.id,
        actorId: r.actorId,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        metadata: r.metadata,
        createdAt: r.createdAt,
        actorName: r.actorName,
      }));
    },
    listNotificationsByUser: async (userId: number, limit = 50) => {
      return db
        .select()
        .from(notificationsTable)
        .where(eq(notificationsTable.userId, userId))
        .orderBy(sql`${notificationsTable.createdAt} DESC`)
        .limit(limit);
    },
    markNotificationRead: async (id: number) => {
      const [n] = await db
        .update(notificationsTable)
        .set({ read: "true" })
        .where(eq(notificationsTable.id, id))
        .returning();
      return n ?? null;
    },
    createNotification: async (data: CreateNotificationInput) => {
      const [n] = await db
        .insert(notificationsTable)
        .values({
          userId: data.userId,
          title: data.title,
          body: data.body,
          read: "false",
          link: data.link ?? null,
        })
        .returning();
      return n;
    },
    markAllNotificationsRead: async (userId: number) => {
      await db
        .update(notificationsTable)
        .set({ read: "true" })
        .where(eq(notificationsTable.userId, userId));
    },
    listChannels: () =>
      db
        .select()
        .from(channelsTable)
        .where(eq(channelsTable.archived, false))
        .orderBy(channelsTable.name),
    findChannelById: async (id: number) => {
      const [c] = await db.select().from(channelsTable).where(eq(channelsTable.id, id));
      return c ?? null;
    },
    createChannel: async (data: CreateChannelInput) => {
      const [c] = await db
        .insert(channelsTable)
        .values({
          name: data.name,
          description: data.description ?? null,
          teamId: data.teamId ?? null,
          type: data.type ?? "TEAM",
          visibility: data.visibility ?? "PRIVATE",
          archived: false,
          createdById: data.createdById,
        })
        .returning();
      return c;
    },
    updateChannel: async (id: number, patch: UpdateChannelInput) => {
      const [c] = await db
        .update(channelsTable)
        .set(patch)
        .where(eq(channelsTable.id, id))
        .returning();
      return c ?? null;
    },
    deleteChannel: async (id: number) => {
      await db.delete(channelMembersTable).where(eq(channelMembersTable.channelId, id));
      await db.delete(messagesTable).where(eq(messagesTable.channelId, id));
      await db.delete(channelsTable).where(eq(channelsTable.id, id));
    },
    listChannelIdsForUser: async (userId: number) => {
      const rows = await db
        .select({ channelId: channelMembersTable.channelId })
        .from(channelMembersTable)
        .where(eq(channelMembersTable.userId, userId));
      return rows.map((r) => r.channelId);
    },
    listChannelsForUser: async (userId: number, includeArchived = false) => {
      const ids = await db
        .select({ channelId: channelMembersTable.channelId })
        .from(channelMembersTable)
        .where(eq(channelMembersTable.userId, userId));
      const channelIds = ids.map((r) => r.channelId);
      if (channelIds.length === 0) return [];
      const conditions = [inArray(channelsTable.id, channelIds)];
      if (!includeArchived) {
        conditions.push(eq(channelsTable.archived, false));
      }
      return db
        .select()
        .from(channelsTable)
        .where(and(...conditions))
        .orderBy(channelsTable.name);
    },
    findChannelMembership: async (channelId: number, userId: number) => {
      const [m] = await db
        .select()
        .from(channelMembersTable)
        .where(
          and(
            eq(channelMembersTable.channelId, channelId),
            eq(channelMembersTable.userId, userId),
          ),
        );
      return m ?? null;
    },
    listChannelMembers: async (channelId: number): Promise<ChannelMemberWithUser[]> => {
      const rows = await db
        .select({
          id: channelMembersTable.id,
          channelId: channelMembersTable.channelId,
          userId: channelMembersTable.userId,
          role: channelMembersTable.role,
          lastReadAt: channelMembersTable.lastReadAt,
          lastReadMessageId: channelMembersTable.lastReadMessageId,
          joinedAt: channelMembersTable.joinedAt,
          fullName: usersTable.fullName,
          avatarUrl: usersTable.avatarUrl,
          email: usersTable.email,
        })
        .from(channelMembersTable)
        .innerJoin(usersTable, eq(channelMembersTable.userId, usersTable.id))
        .where(eq(channelMembersTable.channelId, channelId))
        .orderBy(channelMembersTable.role, usersTable.fullName);
      return rows;
    },
    listChannelListMeta: async (channelIds: number[], userId: number) => {
      const counts = new Map<number, number>();
      const roleByChannel = new Map<number, ChannelMemberRole>();
      const unreadCounts = new Map<number, number>();
      const lastMessagePreviews = new Map<number, string>();
      const lastReadMessageIds = new Map<number, number | null>();

      if (!channelIds.length) {
        return { counts, roles: roleByChannel, unreadCounts, lastMessagePreviews, lastReadMessageIds };
      }

      const rows = await db
        .select({
          channelId: channelMembersTable.channelId,
          userId: channelMembersTable.userId,
          role: channelMembersTable.role,
          lastReadAt: channelMembersTable.lastReadAt,
          lastReadMessageId: channelMembersTable.lastReadMessageId,
          joinedAt: channelMembersTable.joinedAt,
        })
        .from(channelMembersTable)
        .where(inArray(channelMembersTable.channelId, channelIds));

      for (const row of rows) {
        counts.set(row.channelId, (counts.get(row.channelId) ?? 0) + 1);
        if (row.userId === userId) {
          roleByChannel.set(row.channelId, row.role as ChannelMemberRole);
          lastReadMessageIds.set(row.channelId, row.lastReadMessageId ?? null);
        }
      }

      const unreadRows = await db
        .select({
          channelId: messagesTable.channelId,
          n: count(),
        })
        .from(messagesTable)
        .innerJoin(
          channelMembersTable,
          and(
            eq(channelMembersTable.channelId, messagesTable.channelId),
            eq(channelMembersTable.userId, userId),
          ),
        )
        .where(
          and(
            inArray(messagesTable.channelId, channelIds),
            gt(
              messagesTable.createdAt,
              sql`COALESCE(${channelMembersTable.lastReadAt}, ${channelMembersTable.joinedAt})`,
            ),
            sql`${messagesTable.senderId} <> ${userId}`,
          ),
        )
        .groupBy(messagesTable.channelId);

      for (const row of unreadRows) {
        unreadCounts.set(row.channelId, Number(row.n ?? 0));
      }

      const recentMessages = await db
        .select({
          channelId: messagesTable.channelId,
          body: messagesTable.body,
          messageKind: messagesTable.messageKind,
        })
        .from(messagesTable)
        .where(inArray(messagesTable.channelId, channelIds))
        .orderBy(desc(messagesTable.createdAt));

      for (const m of recentMessages) {
        if (!lastMessagePreviews.has(m.channelId)) {
          lastMessagePreviews.set(
            m.channelId,
            messageListPreview(m.body ?? "", m.messageKind ?? "text"),
          );
        }
      }

      return {
        counts,
        roles: roleByChannel,
        unreadCounts,
        lastMessagePreviews,
        lastReadMessageIds,
      };
    },
    markChannelRead: async (channelId: number, userId: number) => {
      const [latest] = await db
        .select({ id: messagesTable.id, createdAt: messagesTable.createdAt })
        .from(messagesTable)
        .where(eq(messagesTable.channelId, channelId))
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);

      const readAt = latest?.createdAt ?? new Date();
      await db
        .update(channelMembersTable)
        .set({
          lastReadAt: readAt,
          lastReadMessageId: latest?.id ?? null,
        })
        .where(
          and(
            eq(channelMembersTable.channelId, channelId),
            eq(channelMembersTable.userId, userId),
          ),
        );
    },
    addChannelMember: async (
      channelId: number,
      userId: number,
      role: ChannelMemberRole = "member",
    ) => {
      const existing = await db
        .select()
        .from(channelMembersTable)
        .where(
          and(
            eq(channelMembersTable.channelId, channelId),
            eq(channelMembersTable.userId, userId),
          ),
        );
      if (existing.length > 0) {
        const [updated] = await db
          .update(channelMembersTable)
          .set({ role })
          .where(eq(channelMembersTable.id, existing[0]!.id))
          .returning();
        return updated!;
      }
      const [m] = await db
        .insert(channelMembersTable)
        .values({ channelId, userId, role })
        .returning();
      return m!;
    },
    removeChannelMember: async (channelId: number, userId: number) => {
      await db
        .delete(channelMembersTable)
        .where(
          and(
            eq(channelMembersTable.channelId, channelId),
            eq(channelMembersTable.userId, userId),
          ),
        );
    },
    countChannelOwners: async (channelId: number) => {
      const [r] = await db
        .select({ n: count() })
        .from(channelMembersTable)
        .where(
          and(
            eq(channelMembersTable.channelId, channelId),
            eq(channelMembersTable.role, "owner"),
          ),
        );
      return Number(r?.n ?? 0);
    },
    listMessagesByChannel: async (
      channelId: number,
      options?: { limit?: number; before?: number },
    ): Promise<MessageWithSender[]> => {
      const limit = options?.limit ?? 100;
      const conditions = [eq(messagesTable.channelId, channelId)];

      if (options?.before) {
        const ref = await db
          .select({ createdAt: messagesTable.createdAt })
          .from(messagesTable)
          .where(eq(messagesTable.id, options.before))
          .limit(1);
        if (ref[0]) {
          conditions.push(lt(messagesTable.createdAt, ref[0].createdAt));
        }
      }

      const rows = await db
        .select({
          id: messagesTable.id,
          channelId: messagesTable.channelId,
          senderId: messagesTable.senderId,
          body: messagesTable.body,
          attachments: messagesTable.attachments,
          messageKind: messagesTable.messageKind,
          metadata: messagesTable.metadata,
          deletedAt: messagesTable.deletedAt,
          deletedById: messagesTable.deletedById,
          createdAt: messagesTable.createdAt,
          senderName: usersTable.fullName,
        })
        .from(messagesTable)
        .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
        .where(and(...conditions))
        .orderBy(desc(messagesTable.createdAt))
        .limit(limit);

      return rows.reverse().map((r) => ({
        id: r.id,
        channelId: r.channelId,
        senderId: r.senderId,
        body: r.body,
        attachments: r.attachments ?? null,
        messageKind: r.messageKind,
        metadata: r.metadata ?? null,
        deletedAt: r.deletedAt,
        deletedById: r.deletedById,
        createdAt: r.createdAt,
        senderName: r.senderName,
      }));
    },
    createMessage: async (
      data: Omit<Message, "id" | "createdAt"> & {
        senderName?: string | null;
        senderAvatar?: string | null;
      },
    ) => {
      const { senderName, senderAvatar, ...insertData } = data;
      const [m] = await db.insert(messagesTable).values(insertData).returning();
      const [channel] = await db
        .update(channelsTable)
        .set({
          lastPostAt: m!.createdAt,
          messageCount: sql`${channelsTable.messageCount} + 1`,
        })
        .where(eq(channelsTable.id, insertData.channelId))
        .returning({
          messageCount: channelsTable.messageCount,
        });

      void mirrorMessageToFirestore({
        id: m!.id,
        channelId: m!.channelId,
        senderId: m!.senderId,
        body: m!.body,
        attachments: m!.attachments,
        messageKind: m!.messageKind,
        metadata: m!.metadata as Record<string, unknown> | null,
        createdAt: m!.createdAt,
        senderName: senderName ?? null,
        senderAvatar: senderAvatar ?? null,
      }).catch((err) => console.error("[firestore-mirror]", err));

      void mirrorChannelActivityToFirestore(
        insertData.channelId,
        m!.createdAt,
        Number(channel?.messageCount ?? 0),
      ).catch((err) => console.error("[firestore-mirror-channel]", err));

      return m!;
    },
    updateMessage: async (
      id: number,
      patch: Partial<Pick<Message, "metadata" | "body" | "attachments">>,
    ) => {
      const [m] = await db
        .update(messagesTable)
        .set(patch)
        .where(eq(messagesTable.id, id))
        .returning();
      if (m) {
        void mirrorMessagePatchToFirestore(id, patch).catch((err) =>
          console.error("[firestore-mirror-patch]", err),
        );
      }
      return m ?? null;
    },
    findMessageById: async (id: number) => {
      const [m] = await db.select().from(messagesTable).where(eq(messagesTable.id, id)).limit(1);
      return m ?? null;
    },
    softDeleteMessage: async (channelId: number, messageId: number, deletedById: number) => {
      const existing = await db
        .select()
        .from(messagesTable)
        .where(
          and(eq(messagesTable.id, messageId), eq(messagesTable.channelId, channelId)),
        )
        .limit(1);
      const m = existing[0];
      if (!m) return null;
      if (m.deletedAt) return m;

      const deletedAt = new Date();
      const [updated] = await db
        .update(messagesTable)
        .set({
          deletedAt,
          deletedById,
          body: "",
          attachments: null,
          metadata: null,
        })
        .where(eq(messagesTable.id, messageId))
        .returning();

      const { mirrorMessageDeleteToFirestore } = await import("../chat/firestore-sync");
      void mirrorMessageDeleteToFirestore(messageId, deletedAt, deletedById).catch((err) =>
        console.error("[firestore-mirror-delete]", err),
      );

      const latestRows = await db
        .select({
          id: messagesTable.id,
          body: messagesTable.body,
          messageKind: messagesTable.messageKind,
          attachments: messagesTable.attachments,
          createdAt: messagesTable.createdAt,
        })
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.channelId, channelId),
            sql`${messagesTable.deletedAt} IS NULL`,
          ),
        )
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);

      const latest = latestRows[0];
      if (latest) {
        const [countRow] = await db
          .select({ n: count() })
          .from(messagesTable)
          .where(
            and(
              eq(messagesTable.channelId, channelId),
              sql`${messagesTable.deletedAt} IS NULL`,
            ),
          );
        const messageCount = Number(countRow?.n ?? 0);
        await db
          .update(channelsTable)
          .set({ lastPostAt: latest.createdAt, messageCount })
          .where(eq(channelsTable.id, channelId));
        const { mirrorChannelActivityToFirestore } = await import("../chat/firestore-sync");
        void mirrorChannelActivityToFirestore(channelId, latest.createdAt, messageCount).catch(
          (err) => console.error("[firestore-mirror-channel]", err),
        );
      }

      return updated ?? null;
    },
    findMessageByIdWithSender: async (id: number): Promise<MessageWithSender | null> => {
      const [r] = await db
        .select({
          id: messagesTable.id,
          channelId: messagesTable.channelId,
          senderId: messagesTable.senderId,
          body: messagesTable.body,
          attachments: messagesTable.attachments,
          messageKind: messagesTable.messageKind,
          metadata: messagesTable.metadata,
          deletedAt: messagesTable.deletedAt,
          deletedById: messagesTable.deletedById,
          createdAt: messagesTable.createdAt,
          senderName: usersTable.fullName,
        })
        .from(messagesTable)
        .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
        .where(eq(messagesTable.id, id))
        .limit(1);
      if (!r) return null;
      return {
        id: r.id,
        channelId: r.channelId,
        senderId: r.senderId,
        body: r.body,
        attachments: r.attachments ?? null,
        messageKind: r.messageKind,
        metadata: r.metadata ?? null,
        deletedAt: r.deletedAt,
        deletedById: r.deletedById,
        createdAt: r.createdAt,
        senderName: r.senderName,
      };
    },
    findCalendarEventById: async (id: number) => {
      const [e] = await db
        .select()
        .from(calendarEventsTable)
        .where(eq(calendarEventsTable.id, id))
        .limit(1);
      return e ?? null;
    },
    findCalendarEventBySourceRef: async (ownerId: number, sourceRef: CalendarSourceRef) => {
      if (sourceRef.kind === "native") return null;
      const rows = await db.select().from(calendarEventsTable).where(eq(calendarEventsTable.ownerId, ownerId));
      return (
        rows.find(
          (e) =>
            e.sourceRef &&
            sourceRefKey(e.sourceRef as CalendarSourceRef) === sourceRefKey(sourceRef),
        ) ?? null
      );
    },
    listCalendarEventsInRange: async (from: Date, to: Date) => {
      const rows = await db
        .select()
        .from(calendarEventsTable)
        .where(
          and(
            sql`${calendarEventsTable.startAt} <= ${to}`,
            sql`COALESCE(${calendarEventsTable.endAt}, ${calendarEventsTable.startAt}) >= ${from}`,
          ),
        );
      return rows.filter((e) => calendarEventInRange(e, from, to));
    },
    listCalendarEventsForUser: async (targetUserId: number, from: Date, to: Date) => {
      const rows = await db.select().from(calendarEventsTable);
      const inRange = rows.filter((e) => calendarEventInRange(e, from, to));
      return inRange.filter(
        (e) =>
          e.ownerId === targetUserId ||
          (e.attendeeIds ?? []).includes(targetUserId),
      );
    },
    createCalendarEvent: async (data: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">) => {
      const [e] = await db.insert(calendarEventsTable).values(data).returning();
      return e;
    },
    updateCalendarEvent: async (
      id: number,
      patch: Partial<Omit<CalendarEvent, "id" | "createdAt">>,
    ) => {
      const [e] = await db
        .update(calendarEventsTable)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(calendarEventsTable.id, id))
        .returning();
      return e ?? null;
    },
    deleteCalendarEvent: async (id: number) => {
      await db.delete(calendarEventsTable).where(eq(calendarEventsTable.id, id));
    },
    listReports: () => db.select().from(reportsTable).orderBy(sql`${reportsTable.generatedAt} DESC`),
    createReport: async (data: Omit<Report, "id" | "generatedAt">) => {
      const [r] = await db.insert(reportsTable).values(data).returning();
      return r;
    },
    sumApprovedExpenses: async () => {
      const r = await db.execute(
        sql`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE status = 'APPROVED'`,
      );
      return Number((r.rows[0] as Record<string, unknown>)?.total ?? 0);
    },
    listExpenses: () => db.select().from(expensesTable).orderBy(sql`${expensesTable.createdAt} DESC`),
    createExpense: async (data: Omit<Expense, "id" | "createdAt">) => {
      const [e] = await db.insert(expensesTable).values(data).returning();
      return e;
    },
    updateExpense: async (id: number, patch: Partial<Expense>) => {
      const [e] = await db.update(expensesTable).set(patch).where(eq(expensesTable.id, id)).returning();
      return e ?? null;
    },
    findExpenseById: async (id: number) => {
      const [e] = await db.select().from(expensesTable).where(eq(expensesTable.id, id));
      return e ?? null;
    },
    listPayrollRuns: () => db.select().from(payrollRunsTable).orderBy(sql`${payrollRunsTable.createdAt} DESC`),
    createPayrollRun: async (data: Omit<PayrollRun, "id" | "createdAt">) => {
      const [p] = await db.insert(payrollRunsTable).values(data).returning();
      return p;
    },
    createSalaryPosting: async (data: CreateSalaryPostingInput) => {
      const [row] = await db
        .insert(salaryPostingsTable)
        .values({
          userId: data.userId,
          allocationType: data.allocationType,
          projectId: data.projectId ?? null,
          month: data.month,
          year: data.year,
          baseSalary: data.baseSalary,
          bonus: data.bonus,
          createdById: data.createdById,
        })
        .returning();
      return row;
    },
    listSalaryPostings: async (): Promise<SalaryPostingRow[]> => {
      const rows = await db
        .select({
          id: salaryPostingsTable.id,
          userId: salaryPostingsTable.userId,
          fullName: usersTable.fullName,
          allocationType: salaryPostingsTable.allocationType,
          projectId: salaryPostingsTable.projectId,
          projectName: projectsTable.name,
          month: salaryPostingsTable.month,
          year: salaryPostingsTable.year,
          baseSalary: salaryPostingsTable.baseSalary,
          bonus: salaryPostingsTable.bonus,
          createdAt: salaryPostingsTable.createdAt,
        })
        .from(salaryPostingsTable)
        .innerJoin(usersTable, eq(salaryPostingsTable.userId, usersTable.id))
        .leftJoin(projectsTable, eq(salaryPostingsTable.projectId, projectsTable.id))
        .orderBy(sql`${salaryPostingsTable.createdAt} DESC`);
      return rows.map((r) => {
        const base = r.baseSalary ? Number(r.baseSalary) : 0;
        const bonus = r.bonus ? Number(r.bonus) : 0;
        return {
          id: r.id,
          userId: r.userId,
          fullName: r.fullName,
          allocationType: r.allocationType as "MONTHLY" | "PROJECT",
          projectId: r.projectId,
          projectName: r.projectName,
          month: r.month,
          year: r.year,
          baseSalary: base,
          bonus,
          totalPay: base + bonus,
          createdAt: r.createdAt,
        };
      });
    },
    getDashboardSnapshot: async (ctx: AccessContext): Promise<DashboardSnapshot> => {
      const snapshotStore = createPostgresStore();
      return buildDashboardSnapshot(ctx, {
        listProjects: (f) => snapshotStore.listProjects(f),
        listTasks: (f) => snapshotStore.listTasks(f),
        listApprovals: (f) => snapshotStore.listApprovals(f),
        listTeams: () => snapshotStore.listTeams(),
        countActiveUsers: () => snapshotStore.countActiveUsers(),
        sumActiveClientRevenue: () => snapshotStore.sumActiveClientRevenue(),
        listClients: () => snapshotStore.listClients(),
        listActivityLogs: (limit) => snapshotStore.listActivityLogs(limit),
        listUpcomingDeadlines: (limit) => snapshotStore.listUpcomingDeadlines(limit),
        countActiveProjectsByTeam: (teamId) => snapshotStore.countActiveProjectsByTeam(teamId),
        countUsersByTeam: (teamId) => snapshotStore.countUsersByTeam(teamId),
      });
    },
  };
}

export type PostgresStore = ReturnType<typeof createPostgresStore>;
