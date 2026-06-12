import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { store, type AccessContext } from "@workspace/db";
import {
  hasPermission,
  canEditTask,
  canPostInChannel,
  canViewProjectBudget,
  type Permission,
} from "@workspace/rbac";
import type { ToolExecutionResult } from "./types";
import { checkToolPermission, getToolRequiredPermissions } from "./tool-permissions";
import { gateAction } from "./action-tools";
import { assertNoteAccess } from "./note-access";
import {
  createEmployeeAction,
  createChannelAction,
  createProjectAction,
  createClientAction,
  createServiceTicketAction,
  createNoteAction,
} from "../services/ai-actions";

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
    requiredPermissions: ["projects:budget"],
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
            ...(canViewProjectBudget(ctx) ? { budget: p.budget } : {}),
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
            ...(canViewProjectBudget(ctx) ? { budget: p.budget } : {}),
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

  get_note: {
    declaration: {
      name: "get_note",
      description:
        "Read a single note by ID (title and content) when the user is viewing it. Use the noteId from the current page context. Access is denied if the user cannot view the note.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          noteId: { type: SchemaType.STRING, description: "Numeric note ID." },
        },
        required: ["noteId"],
      },
    },
    requiredPermissions: ["notes:read"],
    execute: async (ctx, args) => {
      const noteId = Number(args.noteId);
      if (Number.isNaN(noteId)) return { error: "Invalid noteId" };
      const allowed = await assertNoteAccess(ctx.userId, noteId);
      if (!allowed) return { error: "You do not have access to this note." };
      const note = await store.findNoteById(noteId);
      if (!note) return { error: "Note not found" };
      const plain = note.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return {
        status: "success",
        note: {
          id: note.id,
          title: note.title,
          content: plain.slice(0, 4000),
          updatedAt: iso(note.updatedAt),
        },
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
      const existingTask = await store.findTaskById(taskId);
      if (!existingTask) return { error: "Task not found" };
      if (!canEditTask(ctx, existingTask)) {
        return { error: "You can only update tasks you created or are assigned to manage." };
      }
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

      const channel = await store.findChannelById(channelId);
      if (!channel) return { error: "Channel not found" };
      const membership = await store.findChannelMembership(channelId, ctx.userId);
      if (!canPostInChannel(ctx, channel, membership)) {
        return { error: "You cannot post in this channel." };
      }
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

  list_teams: {
    declaration: {
      name: "list_teams",
      description:
        "List teams (id and name). Use to resolve a team name to a teamId before creating records.",
      parameters: { type: SchemaType.OBJECT, properties: {} },
    },
    requiredPermissions: ["teams:read"],
    execute: async () => {
      const teams = await store.listTeams();
      return {
        status: "success",
        count: teams.length,
        teams: truncate(teams.map((t) => ({ id: t.id, name: t.name }))),
      };
    },
  },

  lookup_employee: {
    declaration: {
      name: "lookup_employee",
      description:
        "Find employees by partial name or email. Use to resolve a person to a userId for channel members or assignees.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          query: { type: SchemaType.STRING, description: "Name or email fragment." },
        },
        required: ["query"],
      },
    },
    requiredPermissions: ["employees:read"],
    execute: async (_ctx, args) => {
      const q = String(args.query || "").trim().toLowerCase();
      if (!q) return { error: "query is required" };
      const users = await store.listUsers();
      const matched = users.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          (u.email?.toLowerCase().includes(q) ?? false),
      );
      return {
        status: "success",
        count: matched.length,
        employees: truncate(
          matched.map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, role: u.role })),
        ),
      };
    },
  },

  create_employee: {
    declaration: {
      name: "create_employee",
      description:
        "Create (hire) a new employee. Requires confirmation unless confirmed=true. Required: fullName, email. Optional: role, teamId, jobTitle, phone. A temporary password is auto-generated and emailed.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          fullName: { type: SchemaType.STRING, description: "Employee full name." },
          email: { type: SchemaType.STRING, description: "Work email." },
          role: {
            type: SchemaType.STRING,
            description: "Role (employee, team_lead, hr, finance, client_manager, management). Defaults to employee.",
          },
          teamId: { type: SchemaType.STRING, description: "Optional team ID." },
          jobTitle: { type: SchemaType.STRING, description: "Optional job title." },
          phone: { type: SchemaType.STRING, description: "Optional phone number." },
          confirmed: { type: SchemaType.BOOLEAN, description: "Must be true to execute." },
        },
        required: ["fullName", "email"],
      },
    },
    requiredPermissions: ["employees:write"],
    execute: async (ctx, args) => {
      const fullName = String(args.fullName || "").trim();
      const email = String(args.email || "").trim();
      if (!fullName || !email) return { error: "fullName and email are required" };
      const role = args.role ? String(args.role).toLowerCase() : "employee";
      const payload = {
        fullName,
        email,
        role,
        teamId: args.teamId ? Number(args.teamId) : null,
        jobTitle: args.jobTitle ? String(args.jobTitle) : null,
        phone: args.phone ? String(args.phone) : null,
      };
      const gate = gateAction(
        "create_employee",
        `Create employee "${fullName}" (${role})`,
        args,
        payload,
      );
      if (gate) return gate;

      const result = await createEmployeeAction(ctx, payload);
      if (!result.ok) return { error: result.error };
      return { status: "success", employee: result.data };
    },
  },

  create_channel: {
    declaration: {
      name: "create_channel",
      description:
        "Create a chat channel. Requires confirmation unless confirmed=true. Required: name. Optional: description, type (TEAM or ANNOUNCEMENT), teamId, memberIds.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING, description: "Channel name (lowercase, hyphens)." },
          description: { type: SchemaType.STRING, description: "Optional description." },
          type: { type: SchemaType.STRING, description: "TEAM (default) or ANNOUNCEMENT." },
          teamId: { type: SchemaType.STRING, description: "Optional team ID." },
          memberIds: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Optional list of user IDs to add.",
          },
          confirmed: { type: SchemaType.BOOLEAN, description: "Must be true to execute." },
        },
        required: ["name"],
      },
    },
    requiredPermissions: ["channels:write"],
    execute: async (ctx, args) => {
      const name = String(args.name || "").trim();
      if (!name) return { error: "name is required" };
      const memberIds = Array.isArray(args.memberIds)
        ? args.memberIds.map((id) => Number(id)).filter((id) => id > 0)
        : [];
      const payload = {
        name,
        description: args.description ? String(args.description) : null,
        type: args.type === "ANNOUNCEMENT" ? "ANNOUNCEMENT" : "TEAM",
        teamId: args.teamId ? Number(args.teamId) : null,
        memberIds,
      };
      const gate = gateAction("create_channel", `Create channel "#${name}"`, args, payload);
      if (gate) return gate;

      const result = await createChannelAction(ctx, payload);
      if (!result.ok) return { error: result.error };
      return { status: "success", channel: result.data };
    },
  },

  create_project: {
    declaration: {
      name: "create_project",
      description:
        "Create a project. Requires confirmation unless confirmed=true. Required: name. Optional: description, teamId, priority, clientId, deadline.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING, description: "Project name." },
          description: { type: SchemaType.STRING, description: "Optional description." },
          teamId: { type: SchemaType.STRING, description: "Optional team ID." },
          priority: { type: SchemaType.STRING, description: "LOW, MEDIUM, or HIGH." },
          clientId: { type: SchemaType.STRING, description: "Optional client ID." },
          deadline: { type: SchemaType.STRING, description: "Optional ISO date." },
          confirmed: { type: SchemaType.BOOLEAN, description: "Must be true to execute." },
        },
        required: ["name"],
      },
    },
    requiredPermissions: ["projects:write"],
    execute: async (ctx, args) => {
      const name = String(args.name || "").trim();
      if (!name) return { error: "name is required" };
      const payload = {
        name,
        description: args.description ? String(args.description) : null,
        teamId: args.teamId ? Number(args.teamId) : null,
        priority: args.priority ? String(args.priority) : "MEDIUM",
        clientId: args.clientId ? Number(args.clientId) : null,
        deadline: args.deadline ? String(args.deadline) : null,
      };
      const gate = gateAction("create_project", `Create project "${name}"`, args, payload);
      if (gate) return gate;

      const result = await createProjectAction(ctx, payload);
      if (!result.ok) return { error: result.error };
      return { status: "success", project: result.data };
    },
  },

  create_client: {
    declaration: {
      name: "create_client",
      description:
        "Create a client. Requires confirmation unless confirmed=true. Required: companyName, contactName, email. Optional: phone, assignedTeamId.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          companyName: { type: SchemaType.STRING, description: "Company name." },
          contactName: { type: SchemaType.STRING, description: "Primary contact name." },
          email: { type: SchemaType.STRING, description: "Contact email." },
          phone: { type: SchemaType.STRING, description: "Optional phone." },
          assignedTeamId: { type: SchemaType.STRING, description: "Optional team ID." },
          confirmed: { type: SchemaType.BOOLEAN, description: "Must be true to execute." },
        },
        required: ["companyName", "contactName", "email"],
      },
    },
    requiredPermissions: ["clients:write"],
    execute: async (ctx, args) => {
      const companyName = String(args.companyName || "").trim();
      const contactName = String(args.contactName || "").trim();
      const email = String(args.email || "").trim();
      if (!companyName || !contactName || !email) {
        return { error: "companyName, contactName and email are required" };
      }
      const payload = {
        companyName,
        contactName,
        email,
        phone: args.phone ? String(args.phone) : null,
        assignedTeamId: args.assignedTeamId ? Number(args.assignedTeamId) : null,
      };
      const gate = gateAction("create_client", `Create client "${companyName}"`, args, payload);
      if (gate) return gate;

      const result = await createClientAction(ctx, payload);
      if (!result.ok) return { error: result.error };
      return { status: "success", client: result.data };
    },
  },

  create_service_ticket: {
    declaration: {
      name: "create_service_ticket",
      description:
        "Create a service ticket / to-do. Requires confirmation unless confirmed=true. Required: title. Optional: description, clientId, projectId, priority.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING, description: "Ticket title." },
          description: { type: SchemaType.STRING, description: "Optional details." },
          clientId: { type: SchemaType.STRING, description: "Optional client ID (makes it a CLIENT ticket)." },
          projectId: { type: SchemaType.STRING, description: "Optional project ID." },
          priority: { type: SchemaType.STRING, description: "LOW, MEDIUM, or HIGH." },
          confirmed: { type: SchemaType.BOOLEAN, description: "Must be true to execute." },
        },
        required: ["title"],
      },
    },
    requiredPermissions: ["service_tickets:write"],
    execute: async (ctx, args) => {
      const title = String(args.title || "").trim();
      if (!title) return { error: "title is required" };
      const payload = {
        title,
        description: args.description ? String(args.description) : null,
        clientId: args.clientId ? Number(args.clientId) : null,
        projectId: args.projectId ? Number(args.projectId) : null,
        priority: args.priority ? String(args.priority) : "MEDIUM",
      };
      const gate = gateAction("create_service_ticket", `Create ticket "${title}"`, args, payload);
      if (gate) return gate;

      const result = await createServiceTicketAction(ctx, payload);
      if (!result.ok) return { error: result.error };
      return { status: "success", ticket: result.data };
    },
  },

  create_note: {
    declaration: {
      name: "create_note",
      description:
        "Create a note. Requires confirmation unless confirmed=true. Required: title. Optional: content, teamId.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING, description: "Note title." },
          content: { type: SchemaType.STRING, description: "Optional body text." },
          teamId: { type: SchemaType.STRING, description: "Optional team ID to share with." },
          confirmed: { type: SchemaType.BOOLEAN, description: "Must be true to execute." },
        },
        required: ["title"],
      },
    },
    requiredPermissions: ["notes:write"],
    execute: async (ctx, args) => {
      const title = String(args.title || "").trim();
      if (!title) return { error: "title is required" };
      const payload = {
        title,
        content: args.content ? String(args.content) : "",
        teamId: args.teamId ? Number(args.teamId) : null,
      };
      const gate = gateAction("create_note", `Create note "${title}"`, args, payload);
      if (gate) return gate;

      const result = await createNoteAction(ctx, payload);
      if (!result.ok) return { error: result.error };
      return { status: "success", note: result.data };
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
          projects.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            ...(canViewProjectBudget(ctx) ? { budget: p.budget } : {}),
          })),
          20,
        ),
      };
    },
  },
};

/**
 * Return tool declarations for the model.
 * - `allowedTools` restricts to an explicit allowlist (e.g. note enrich uses []).
 * - Otherwise, only tools the user's role can actually call are exposed,
 *   so privileged tool names never leak to lower-privilege roles.
 */
export function getToolDeclarations(filter?: {
  ctx?: AccessContext;
  allowedTools?: string[];
}): FunctionDeclaration[] {
  let entries = Object.entries(TOOLS);
  if (filter?.allowedTools) {
    const allow = new Set(filter.allowedTools);
    entries = entries.filter(([name]) => allow.has(name));
  } else if (filter?.ctx) {
    entries = entries.filter(([name]) => checkToolPermission(filter.ctx!, name) === null);
  }
  return entries.map(([, t]) => t.declaration);
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
