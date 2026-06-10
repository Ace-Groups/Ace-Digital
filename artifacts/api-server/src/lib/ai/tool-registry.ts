import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { store, type AccessContext } from "@workspace/db";
import { hasPermission, type Permission } from "@workspace/rbac";
import type { ToolExecutionResult } from "./types";
import { checkToolPermission, getToolRequiredPermissions } from "./tool-permissions";
import { gateAction } from "./action-tools";

export { checkToolPermission, getToolRequiredPermissions };

const MAX_ROWS = 50;

function truncate<T>(items: T[], max = MAX_ROWS): T[] {
  return items.slice(0, max);
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

type ToolDef = {
  declaration: FunctionDeclaration;
  requiredPermissions: Permission[];
  anyOf?: boolean;
  execute: (ctx: AccessContext, args: Record<string, unknown>) => Promise<unknown>;
};

const TOOLS: Record<string, ToolDef> = {
  query_pending_tasks: {
    declaration: {
      name: "query_pending_tasks",
      description: "Retrieve pending (non-completed) tasks for a specific project.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          projectId: { type: SchemaType.STRING, description: "Numeric project ID." },
        },
        required: ["projectId"],
      },
    },
    requiredPermissions: ["tasks:read"],
    execute: async (ctx, args) => {
      const projectId = Number(args.projectId);
      if (Number.isNaN(projectId)) return { error: "Invalid projectId." };
      const tasks = await store.listTasksForAccess(ctx, { projectId });
      const pending = tasks.filter((t) => t.status !== "DONE");
      return {
        status: "success",
        count: pending.length,
        tasks: truncate(
          pending.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            progress: t.progress,
            dueDate: iso(t.dueDate),
          })),
        ),
      };
    },
  },

  summarize_client_tickets: {
    declaration: {
      name: "summarize_client_tickets",
      description: "Retrieve service tickets for a specific client.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          clientId: { type: SchemaType.STRING, description: "Numeric client ID." },
        },
        required: ["clientId"],
      },
    },
    requiredPermissions: ["service_tickets:read"],
    execute: async (ctx, args) => {
      const clientId = Number(args.clientId);
      if (Number.isNaN(clientId)) return { error: "Invalid clientId." };
      const tickets = await store.listServiceTicketsForAccess(ctx, { clientId });
      return {
        status: "success",
        count: tickets.length,
        tickets: truncate(
          tickets.map((t) => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            title: t.title,
            status: t.status,
            priority: t.priority,
            category: t.category,
            description: (t.description || "").slice(0, 200),
          })),
        ),
      };
    },
  },

  check_project_budgets_and_expenses: {
    declaration: {
      name: "check_project_budgets_and_expenses",
      description: "Retrieve projects with budgets and expense claims.",
      parameters: { type: SchemaType.OBJECT, properties: {} },
    },
    requiredPermissions: ["finance:summary", "finance:expenses_read"],
    anyOf: true,
    execute: async (ctx) => {
      const projects = await store.listProjectsForAccess(ctx);
      const canExpenses = hasPermission(ctx, "finance:expenses_read");
      const expenses = canExpenses ? await store.listExpenses() : [];
      return {
        status: "success",
        projects: truncate(
          projects.map((p) => ({
            id: p.id,
            name: p.name,
            budget: p.budget,
            status: p.status,
          })),
        ),
        expenses: canExpenses
          ? truncate(
              expenses.map((e) => ({
                id: e.id,
                description: e.description,
                amount: e.amount,
                status: e.status,
              })),
            )
          : [],
      };
    },
  },

  list_projects: {
    declaration: {
      name: "list_projects",
      description: "List accessible projects, optionally filtered by status.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          status: { type: SchemaType.STRING, description: "Optional status filter." },
        },
      },
    },
    requiredPermissions: ["projects:read"],
    execute: async (ctx, args) => {
      const status = typeof args.status === "string" ? args.status : undefined;
      const projects = await store.listProjectsForAccess(ctx, status ? { status } : undefined);
      return {
        status: "success",
        count: projects.length,
        projects: truncate(
          projects.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            budget: p.budget,
            deadline: iso(p.deadline),
          })),
        ),
      };
    },
  },

  list_tasks: {
    declaration: {
      name: "list_tasks",
      description: "List tasks with optional project or status filter.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          projectId: { type: SchemaType.STRING, description: "Optional project ID." },
          status: { type: SchemaType.STRING, description: "Optional status filter." },
        },
      },
    },
    requiredPermissions: ["tasks:read"],
    execute: async (ctx, args) => {
      const projectId =
        args.projectId != null && args.projectId !== ""
          ? Number(args.projectId)
          : undefined;
      const status = typeof args.status === "string" ? args.status : undefined;
      const tasks = await store.listTasksForAccess(ctx, {
        projectId: Number.isNaN(projectId as number) ? undefined : projectId,
        status,
      });
      return {
        status: "success",
        count: tasks.length,
        tasks: truncate(
          tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            projectId: t.projectId,
            dueDate: iso(t.dueDate),
          })),
        ),
      };
    },
  },

  get_dashboard_snapshot: {
    declaration: {
      name: "get_dashboard_snapshot",
      description: "Get dashboard KPIs and widgets for the current user.",
      parameters: { type: SchemaType.OBJECT, properties: {} },
    },
    requiredPermissions: ["dashboard:view"],
    execute: async (ctx) => {
      const dash = await store.getDashboardSnapshot(ctx);
      return {
        status: "success",
        activeProjectsCount: dash.activeProjectsCount,
        myOpenTasksCount: dash.myOpenTasksCount,
        pendingApprovalsCount: dash.pendingApprovalsCount,
        employeeCount: dash.employeeCount,
        monthlyRevenue: dash.monthlyRevenue,
        activeClientsCount: dash.activeClientsCount,
        overdueServiceFollowUpsCount: dash.overdueServiceFollowUpsCount,
        widgets: dash.widgets,
        upcomingDeadlines: truncate(
          dash.upcomingDeadlines.map((p) => ({
            id: p.id,
            name: p.name,
            deadline: iso(p.deadline),
            status: p.status,
          })),
          10,
        ),
        recentActivity: truncate(
          dash.recentActivity.map((a) => ({
            id: a.id,
            action: a.action,
            entityType: a.entityType,
            actorName: a.actorName,
            createdAt: iso(a.createdAt),
          })),
          10,
        ),
      };
    },
  },

  list_clients: {
    declaration: {
      name: "list_clients",
      description: "List all clients.",
      parameters: { type: SchemaType.OBJECT, properties: {} },
    },
    requiredPermissions: ["clients:read"],
    execute: async () => {
      const clients = await store.listClients();
      return {
        status: "success",
        count: clients.length,
        clients: truncate(
          clients.map((c) => ({
            id: c.id,
            name: c.companyName,
            status: c.status,
            contractValue: c.contractValue,
          })),
        ),
      };
    },
  },

  list_service_tickets: {
    declaration: {
      name: "list_service_tickets",
      description: "List service tickets, optionally filtered by client or status.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          clientId: { type: SchemaType.STRING, description: "Optional client ID." },
          status: { type: SchemaType.STRING, description: "Optional status." },
        },
      },
    },
    requiredPermissions: ["service_tickets:read"],
    execute: async (ctx, args) => {
      const clientId =
        args.clientId != null && args.clientId !== ""
          ? Number(args.clientId)
          : undefined;
      const status = typeof args.status === "string" ? args.status : undefined;
      const tickets = await store.listServiceTicketsForAccess(ctx, {
        clientId: Number.isNaN(clientId as number) ? undefined : clientId,
        status,
      });
      return {
        status: "success",
        count: tickets.length,
        tickets: truncate(
          tickets.map((t) => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            title: t.title,
            status: t.status,
            priority: t.priority,
            clientId: t.clientId,
          })),
        ),
      };
    },
  },

  list_calendar_events: {
    declaration: {
      name: "list_calendar_events",
      description: "List calendar events in a date range (ISO dates). Defaults to next 30 days.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          from: { type: SchemaType.STRING, description: "Start date ISO string." },
          to: { type: SchemaType.STRING, description: "End date ISO string." },
        },
      },
    },
    requiredPermissions: ["calendar:read"],
    execute: async (ctx, args) => {
      const now = new Date();
      const from = args.from ? new Date(String(args.from)) : now;
      const to = args.to
        ? new Date(String(args.to))
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const events = await store.listCalendarEventsForUser(ctx.userId, from, to);
      return {
        status: "success",
        count: events.length,
        events: truncate(
          events.map((e) => ({
            id: e.id,
            title: e.title,
            startAt: iso(e.startAt),
            endAt: iso(e.endAt),
            location: e.location,
          })),
        ),
      };
    },
  },

  search_notes: {
    declaration: {
      name: "search_notes",
      description: "Search the user's accessible notes by query string in title or content.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          query: { type: SchemaType.STRING, description: "Search text." },
        },
        required: ["query"],
      },
    },
    requiredPermissions: ["notes:read"],
    execute: async (ctx, args) => {
      const q = String(args.query || "")
        .trim()
        .toLowerCase();
      if (!q) return { error: "Query is required." };
      const notes = await store.listNotes(ctx.userId);
      const matched = notes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q),
      );
      return {
        status: "success",
        count: matched.length,
        notes: truncate(
          matched.map((n) => ({
            id: n.id,
            title: n.title,
            preview: n.content.replace(/<[^>]+>/g, "").slice(0, 120),
            updatedAt: iso(n.updatedAt),
          })),
        ),
      };
    },
  },

  list_approvals: {
    declaration: {
      name: "list_approvals",
      description: "List approval requests, optionally filtered by status.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          status: { type: SchemaType.STRING, description: "e.g. PENDING, APPROVED, REJECTED" },
        },
      },
    },
    requiredPermissions: ["approvals:review", "approvals:submit"],
    anyOf: true,
    execute: async (ctx, args) => {
      const status = typeof args.status === "string" ? args.status : undefined;
      const approvals = await store.listApprovalsForAccess(ctx, status ? { status } : undefined);
      return {
        status: "success",
        count: approvals.length,
        approvals: truncate(
          approvals.map((a) => ({
            id: a.id,
            type: a.type,
            status: a.status,
            title: a.title,
            requestedById: a.requestedById,
            createdAt: iso(a.createdAt),
          })),
        ),
      };
    },
  },

  list_activity: {
    declaration: {
      name: "list_activity",
      description: "List recent activity logs.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          limit: { type: SchemaType.STRING, description: "Max items (default 20)." },
        },
      },
    },
    requiredPermissions: ["activity:read"],
    execute: async (ctx, args) => {
      const limit = Math.min(Number(args.limit) || 20, 50);
      const logs = await store.listActivityLogs(limit * 3);
      let filtered = logs;
      if (!hasPermission(ctx, "activity:read_org")) {
        const users = await store.listUsers();
        const teamByActor = Object.fromEntries(users.map((u) => [u.id, u.teamId]));
        if (ctx.teamId != null) {
          filtered = logs.filter(
            (l) => l.actorId != null && teamByActor[l.actorId] === ctx.teamId,
          );
        } else {
          filtered = logs.filter((l) => l.actorId === ctx.userId);
        }
      }
      return {
        status: "success",
        count: filtered.length,
        activity: truncate(
          filtered.slice(0, limit).map((l) => ({
            id: l.id,
            action: l.action,
            entityType: l.entityType,
            actorName: l.actorName,
            createdAt: iso(l.createdAt),
          })),
        ),
      };
    },
  },

  create_task: {
    declaration: {
      name: "create_task",
      description:
        "Create a new task. Returns confirmation request unless confirmed=true. Requires title; optional projectId, priority, dueDate.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING, description: "Task title." },
          projectId: { type: SchemaType.STRING, description: "Optional project ID." },
          priority: { type: SchemaType.STRING, description: "LOW, MEDIUM, or HIGH." },
          dueDate: { type: SchemaType.STRING, description: "ISO date string." },
          confirmed: { type: SchemaType.BOOLEAN, description: "Must be true to execute." },
        },
        required: ["title"],
      },
    },
    requiredPermissions: ["tasks:write"],
    execute: async (ctx, args) => {
      const title = String(args.title || "").trim();
      if (!title) return { error: "title is required" };
      const payload = {
        title,
        projectId: args.projectId ? Number(args.projectId) : null,
        priority: String(args.priority || "MEDIUM"),
        dueDate: args.dueDate ? String(args.dueDate) : null,
      };
      const gate = gateAction("create_task", `Create task "${title}"`, args, payload);
      if (gate) return gate;

      const task = await store.createTask({
        title,
        projectId: payload.projectId,
        assigneeId: ctx.userId,
        assigneeIds: [ctx.userId],
        assigneeCompletions: {},
        progress: 0,
        teamId: ctx.teamId ?? null,
        priority: payload.priority as "LOW" | "MEDIUM" | "HIGH",
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        status: "PENDING",
        createdById: ctx.userId,
      });
      return { status: "success", task: { id: task.id, title: task.title, status: task.status } };
    },
  },

  update_task_status: {
    declaration: {
      name: "update_task_status",
      description: "Update a task status. Requires confirmation unless confirmed=true.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          taskId: { type: SchemaType.STRING, description: "Task ID." },
          status: { type: SchemaType.STRING, description: "PENDING, IN_PROGRESS, or DONE." },
          confirmed: { type: SchemaType.BOOLEAN, description: "Must be true to execute." },
        },
        required: ["taskId", "status"],
      },
    },
    requiredPermissions: ["tasks:write"],
    execute: async (ctx, args) => {
      const taskId = Number(args.taskId);
      const status = String(args.status || "");
      if (Number.isNaN(taskId)) return { error: "Invalid taskId" };
      const gate = gateAction("update_task_status", `Set task #${taskId} to ${status}`, args, {
        taskId,
        status,
      });
      if (gate) return gate;

      const updated = await store.updateTask(taskId, {
        status: status as "PENDING" | "IN_PROGRESS" | "DONE",
        progress: status === "DONE" ? 100 : undefined,
      });
      if (!updated) return { error: "Task not found" };
      return { status: "success", task: { id: updated.id, status: updated.status } };
    },
  },

  create_calendar_event: {
    declaration: {
      name: "create_calendar_event",
      description: "Create a calendar event. Requires confirmation unless confirmed=true.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING, description: "Event title." },
          startAt: { type: SchemaType.STRING, description: "ISO start datetime." },
          endAt: { type: SchemaType.STRING, description: "ISO end datetime." },
          confirmed: { type: SchemaType.BOOLEAN, description: "Must be true to execute." },
        },
        required: ["title", "startAt"],
      },
    },
    requiredPermissions: ["calendar:write"],
    execute: async (ctx, args) => {
      const title = String(args.title || "").trim();
      const startAt = String(args.startAt || "");
      if (!title || !startAt) return { error: "title and startAt required" };
      const endAt = args.endAt ? String(args.endAt) : startAt;
      const gate = gateAction("create_calendar_event", `Create event "${title}"`, args, {
        title,
        startAt,
        endAt,
      });
      if (gate) return gate;

      const event = await store.createCalendarEvent({
        title,
        description: null,
        eventType: "meeting",
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        allDay: false,
        location: null,
        color: null,
        ownerId: ctx.userId,
        createdById: ctx.userId,
        teamId: ctx.teamId ?? null,
        visibility: "private",
        attendeeIds: [ctx.userId],
        attendeeStatuses: { [String(ctx.userId)]: "accepted" },
        sourceRef: { kind: "native" },
      });
      return { status: "success", event: { id: event.id, title: event.title } };
    },
  },

  post_channel_message: {
    declaration: {
      name: "post_channel_message",
      description: "Post a message to a channel. Requires confirmation unless confirmed=true.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          channelId: { type: SchemaType.STRING, description: "Channel ID." },
          body: { type: SchemaType.STRING, description: "Message text." },
          confirmed: { type: SchemaType.BOOLEAN, description: "Must be true to execute." },
        },
        required: ["channelId", "body"],
      },
    },
    requiredPermissions: ["channels:post"],
    execute: async (ctx, args) => {
      const channelId = Number(args.channelId);
      const body = String(args.body || "").trim();
      if (Number.isNaN(channelId) || !body) return { error: "channelId and body required" };
      const gate = gateAction(
        "post_channel_message",
        `Post message to channel #${channelId}`,
        args,
        { channelId, body: body.slice(0, 200) },
      );
      if (gate) return gate;

      const sender = await store.findUserById(ctx.userId);
      const msg = await store.createMessage({
        channelId,
        senderId: ctx.userId,
        body,
        messageKind: "text",
        attachments: null,
        metadata: null,
        parentMessageId: null,
        editedAt: null,
        deletedAt: null,
        deletedById: null,
        senderName: sender?.fullName ?? null,
        senderAvatar: sender?.avatarUrl ?? null,
      });
      return { status: "success", message: { id: msg.id, channelId } };
    },
  },

  submit_approval: {
    declaration: {
      name: "submit_approval",
      description: "Submit an approval request. Requires confirmation unless confirmed=true.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          type: { type: SchemaType.STRING, description: "LEAVE, EXPENSE, HIRING, or BUDGET." },
          title: { type: SchemaType.STRING, description: "Request title." },
          description: { type: SchemaType.STRING, description: "Details." },
          confirmed: { type: SchemaType.BOOLEAN, description: "Must be true to execute." },
        },
        required: ["type", "title"],
      },
    },
    requiredPermissions: ["approvals:submit"],
    execute: async (ctx, args) => {
      const type = String(args.type || "");
      const title = String(args.title || "").trim();
      if (!type || !title) return { error: "type and title required" };
      const gate = gateAction("submit_approval", `Submit ${type} approval: ${title}`, args, {
        type,
        title,
        description: String(args.description || ""),
      });
      if (gate) return gate;

      const approval = await store.createApproval({
        type: type as "LEAVE" | "EXPENSE" | "HIRING" | "BUDGET",
        title,
        description: String(args.description || "") || null,
        amount: null,
        status: "PENDING",
        requestedById: ctx.userId,
        teamId: ctx.teamId ?? null,
        reviewedById: null,
        reviewedAt: null,
        note: null,
      });
      return { status: "success", approval: { id: approval.id, title: approval.title } };
    },
  },

  generate_report_data: {
    declaration: {
      name: "generate_report_data",
      description: "Aggregate data for a report type and period label.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          type: {
            type: SchemaType.STRING,
            description: "REVENUE, PAYROLL, PROJECT_STATUS, EXPENSE, or HEADCOUNT",
          },
          period: { type: SchemaType.STRING, description: "Period label e.g. March 2026" },
        },
        required: ["type", "period"],
      },
    },
    requiredPermissions: ["reports:read"],
    execute: async (ctx, args) => {
      const type = String(args.type || "");
      const period = String(args.period || "");
      const [projects, tasks, clients, employees] = await Promise.all([
        store.listProjectsForAccess(ctx),
        store.listTasksForAccess(ctx, {}),
        hasPermission(ctx, "clients:read") ? store.listClients() : Promise.resolve([]),
        hasPermission(ctx, "employees:read") ? store.listUsers() : Promise.resolve([]),
      ]);
      return {
        status: "success",
        type,
        period,
        summary: {
          projectCount: projects.length,
          taskCount: tasks.length,
          openTasks: tasks.filter((t) => t.status !== "DONE").length,
          clientCount: clients.length,
          employeeCount: employees.length,
        },
        projects: truncate(
          projects.map((p) => ({ id: p.id, name: p.name, status: p.status, budget: p.budget })),
          20,
        ),
      };
    },
  },
};

export function getToolDeclarations(): FunctionDeclaration[] {
  return Object.values(TOOLS).map((t) => t.declaration);
}

export async function executeTool(
  ctx: AccessContext,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const tool = TOOLS[name];
  if (!tool) {
    return { ok: false, permissionDenied: false, output: { error: `Unknown tool: ${name}` } };
  }

  const denied = checkToolPermission(ctx, name);
  if (denied) return denied;

  try {
    const output = await tool.execute(ctx, args);
    return { ok: true, output };
  } catch (err) {
    console.error(`[AI] Tool ${name} failed:`, err);
    return {
      ok: false,
      permissionDenied: false,
      output: { error: `Tool execution failed: ${name}` },
    };
  }
}
