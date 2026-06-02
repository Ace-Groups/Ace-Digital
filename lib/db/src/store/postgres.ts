import { eq, and, sql, count } from "drizzle-orm";
import { getPgDb } from "../pg";
import {
  usersTable,
  teamsTable,
  employeeProfilesTable,
  projectsTable,
  tasksTable,
  clientsTable,
  approvalsTable,
  activityLogsTable,
  notificationsTable,
  channelsTable,
  messagesTable,
  reportsTable,
  expensesTable,
  payrollRunsTable,
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
  Message,
  Report,
  Expense,
  PayrollRun,
  EmployeeProfile,
} from "../schema";
import type {
  ActivityLogWithActor,
  AccessContext,
  CreateProfileInput,
  CreateUserInput,
  DashboardSnapshot,
  MessageWithSender,
  SalaryRow,
  UpdateProfileInput,
  UpdateUserInput,
} from "./types";
import { buildDashboardSnapshot } from "./build-dashboard";
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
      const [p] = await db.insert(employeeProfilesTable).values({ userId: data.userId }).returning();
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
    listTasks: async (filters?: {
      projectId?: number;
      teamId?: number;
      assigneeId?: number;
      status?: string;
    }) => {
      const conditions = [];
      if (filters?.projectId != null) conditions.push(eq(tasksTable.projectId, filters.projectId));
      if (filters?.teamId != null) conditions.push(eq(tasksTable.teamId, filters.teamId));
      if (filters?.assigneeId != null) conditions.push(eq(tasksTable.assigneeId, filters.assigneeId));
      if (filters?.status) conditions.push(eq(tasksTable.status, filters.status));
      const q = db.select().from(tasksTable);
      return conditions.length
        ? q.where(and(...conditions)).orderBy(sql`${tasksTable.createdAt} DESC`)
        : q.orderBy(sql`${tasksTable.createdAt} DESC`);
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
      await db.delete(tasksTable).where(eq(tasksTable.id, id));
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
      if (filters?.assigneeId != null) conditions.push(eq(tasksTable.assigneeId, filters.assigneeId));
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
    listChannels: () => db.select().from(channelsTable).orderBy(channelsTable.name),
    listMessagesByChannel: async (channelId: number, limit = 100): Promise<MessageWithSender[]> => {
      const rows = await db
        .select({
          id: messagesTable.id,
          channelId: messagesTable.channelId,
          senderId: messagesTable.senderId,
          body: messagesTable.body,
          createdAt: messagesTable.createdAt,
          senderName: usersTable.fullName,
        })
        .from(messagesTable)
        .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
        .where(eq(messagesTable.channelId, channelId))
        .orderBy(messagesTable.createdAt)
        .limit(limit);
      return rows.map((r) => ({
        id: r.id,
        channelId: r.channelId,
        senderId: r.senderId,
        body: r.body,
        createdAt: r.createdAt,
        senderName: r.senderName,
      }));
    },
    createMessage: async (data: Omit<Message, "id" | "createdAt">) => {
      const [m] = await db.insert(messagesTable).values(data).returning();
      return m;
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
