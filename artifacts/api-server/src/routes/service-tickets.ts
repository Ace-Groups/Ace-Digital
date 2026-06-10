import { Router } from "express";
import { store } from "@workspace/db";
import type { ServiceRecord, ServiceTicket } from "@workspace/db";
import { canWriteServiceTicket, isTicketFollowUpOverdue } from "@workspace/db";
import { hasPermission } from "@workspace/rbac";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";
import {
  assertServiceTicketAssignee,
  listServiceTicketAssignees,
} from "../lib/service-ticket-assignees";
import {
  resolveServiceTicketCreateLinks,
  resolveServiceTicketUpdateLinks,
  type ServiceTicketLinkType,
} from "../lib/service-ticket-links";
import { notifyServiceTicketAssignee } from "../lib/notify";

const router = Router();

function parseId(param: string | string[] | undefined): number {
  return Number(Array.isArray(param) ? param[0] : param);
}

async function enrichTicket(
  ticket: ServiceTicket,
  opts?: { records?: ServiceRecord[] },
) {
  const [client, project, task, assignee, creator] = await Promise.all([
    ticket.clientId != null ? store.findClientById(ticket.clientId) : null,
    ticket.projectId ? store.findProjectById(ticket.projectId) : null,
    ticket.taskId ? store.findTaskById(ticket.taskId) : null,
    ticket.assigneeId ? store.findUserById(ticket.assigneeId) : null,
    store.findUserById(ticket.createdById),
  ]);
  const records = opts?.records ?? (await store.listServiceRecords(ticket.id));
  const lastRecord = records[0];
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    description: ticket.description,
    linkType: ticket.linkType ?? "CLIENT",
    clientId: ticket.clientId,
    clientName:
      client?.companyName ??
      (ticket.linkType === "TODO" ? "Internal to-do" : null),
    projectId: ticket.projectId,
    projectName: project?.name ?? null,
    taskId: ticket.taskId,
    taskTitle: task?.title ?? null,
    assigneeId: ticket.assigneeId,
    assigneeName: assignee?.fullName ?? null,
    teamId: ticket.teamId,
    priority: ticket.priority,
    status: ticket.status,
    category: ticket.category,
    nextFollowUpAt: ticket.nextFollowUpAt?.toISOString() ?? null,
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    createdById: ticket.createdById,
    createdByName: creator?.fullName ?? null,
    recordCount: records.length,
    lastRecordAt: lastRecord?.createdAt.toISOString() ?? null,
    followUpOverdue: isTicketFollowUpOverdue(ticket),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

async function enrichRecord(record: ServiceRecord) {
  const author = await store.findUserById(record.createdById);
  return {
    id: record.id,
    ticketId: record.ticketId,
    recordType: record.recordType,
    body: record.body,
    statusAfter: record.statusAfter,
    nextFollowUpAt: record.nextFollowUpAt?.toISOString() ?? null,
    createdById: record.createdById,
    authorName: author?.fullName ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

router.get(
  "/v1/service-tickets/assignees",
  requireAuth,
  requirePermission("service_tickets:read", "service_tickets:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    res.json(await listServiceTicketAssignees(ctx));
  },
);

router.get(
  "/v1/service-tickets",
  requireAuth,
  requirePermission("service_tickets:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const overdueFollowUp = req.query.overdueFollowUp === "true";
    const tickets = await store.listServiceTicketsForAccess(ctx, {
      status: req.query.status as string | undefined,
      clientId: req.query.clientId ? Number(req.query.clientId) : undefined,
      assigneeId: req.query.assigneeId ? Number(req.query.assigneeId) : undefined,
      overdueFollowUp,
    });
    res.json(await Promise.all(tickets.map((t) => enrichTicket(t))));
  },
);

router.post(
  "/v1/service-tickets",
  requireAuth,
  requirePermission("service_tickets:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const {
      title,
      description,
      linkType: linkTypeRaw,
      clientId,
      projectId,
      taskId,
      assigneeId,
      teamId,
      priority,
      status,
      category,
      nextFollowUpAt,
    } = req.body;
    if (!title?.trim()) {
      res.status(400).json({ error: "Title is required" });
      return;
    }
    const linkType = (linkTypeRaw === "TODO" ? "TODO" : "CLIENT") as ServiceTicketLinkType;
    const resolved = await resolveServiceTicketCreateLinks({
      linkType,
      clientId: clientId != null ? Number(clientId) : null,
      projectId: projectId != null ? Number(projectId) : null,
      taskId: taskId != null ? Number(taskId) : null,
      defaultTeamId: teamId != null ? Number(teamId) : ctx.teamId,
      defaultAssigneeId: assigneeId != null ? Number(assigneeId) : ctx.userId,
    });
    if (!resolved.ok) {
      res.status(400).json({ error: resolved.error });
      return;
    }
    const { links } = resolved;
    const chosenAssigneeId =
      assigneeId != null ? Number(assigneeId) : links.assigneeId ?? ctx.userId;
    const assignCheck = await assertServiceTicketAssignee(ctx, chosenAssigneeId);
    if (!assignCheck.ok) {
      res.status(403).json({ error: assignCheck.error });
      return;
    }
    const ticket = await store.createServiceTicket({
      title: title.trim(),
      description: description ?? null,
      linkType: links.linkType,
      clientId: links.clientId,
      projectId: links.projectId,
      taskId: links.taskId,
      assigneeId: chosenAssigneeId,
      teamId: links.teamId,
      priority: priority ?? "MEDIUM",
      status: status ?? "OPEN",
      category: category ?? (linkType === "TODO" ? "OTHER" : "SUPPORT"),
      nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
      resolvedAt: null,
      createdById: ctx.userId,
    });
    await store.insertActivityLog({
      actorId: ctx.userId,
      action: "created",
      entityType: "service_ticket",
      entityId: ticket.id,
      metadata: { ticketNumber: ticket.ticketNumber, title: ticket.title },
    });
    if (ticket.assigneeId != null) {
      void notifyServiceTicketAssignee(
        ticket.assigneeId,
        ticket.title,
        ticket.id,
        ctx.userId,
      );
    }
    res.status(201).json(await enrichTicket(ticket));
  },
);

router.get(
  "/v1/service-tickets/:id",
  requireAuth,
  requirePermission("service_tickets:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = parseId(req.params.id);
    const ticket = await store.findServiceTicketById(id);
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    const visible = (await store.listServiceTicketsForAccess(ctx)).some((t) => t.id === id);
    if (!visible) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const records = await store.listServiceRecords(id);
    const enriched = await enrichTicket(ticket, { records });
    res.json({
      ...enriched,
      records: await Promise.all(records.map(enrichRecord)),
    });
  },
);

router.patch(
  "/v1/service-tickets/:id",
  requireAuth,
  requirePermission("service_tickets:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = parseId(req.params.id);
    const existing = await store.findServiceTicketById(id);
    if (!existing) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    if (!canWriteServiceTicket(ctx, existing)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const {
      title,
      description,
      linkType: linkTypeRaw,
      clientId,
      projectId,
      taskId,
      assigneeId,
      teamId,
      priority,
      status,
      category,
      nextFollowUpAt,
    } = req.body;

    const linkFieldsTouched =
      linkTypeRaw !== undefined ||
      clientId !== undefined ||
      projectId !== undefined ||
      taskId !== undefined;

    let linkPatch: {
      linkType?: ServiceTicketLinkType;
      clientId?: number | null;
      projectId?: number | null;
      taskId?: number | null;
    } = {};

    if (linkFieldsTouched) {
      const linkType = (linkTypeRaw === "TODO" ? "TODO" : "CLIENT") as ServiceTicketLinkType;
      const resolved = await resolveServiceTicketUpdateLinks(existing, {
        linkType,
        clientId: clientId !== undefined ? (clientId != null ? Number(clientId) : null) : undefined,
        projectId:
          projectId !== undefined ? (projectId != null ? Number(projectId) : null) : undefined,
        taskId: taskId !== undefined ? (taskId != null ? Number(taskId) : null) : undefined,
      });
      if (!resolved.ok) {
        res.status(400).json({ error: resolved.error });
        return;
      }
      linkPatch = resolved.links;
    }

    if (assigneeId !== undefined) {
      const nextAssignee = assigneeId != null ? Number(assigneeId) : null;
      const assignCheck = await assertServiceTicketAssignee(ctx, nextAssignee);
      if (!assignCheck.ok) {
        res.status(403).json({ error: assignCheck.error });
        return;
      }
    }
    const ticket = await store.updateServiceTicket(id, {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...linkPatch,
      ...(projectId !== undefined &&
        !linkFieldsTouched && {
          projectId: projectId != null ? Number(projectId) : null,
        }),
      ...(assigneeId !== undefined && { assigneeId: assigneeId != null ? Number(assigneeId) : null }),
      ...(teamId !== undefined && { teamId: teamId != null ? Number(teamId) : null }),
      ...(priority !== undefined && { priority }),
      ...(status !== undefined && { status }),
      ...(category !== undefined && { category }),
      ...(nextFollowUpAt !== undefined && {
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
      }),
    });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    if (status !== undefined && status !== existing.status) {
      await store.insertActivityLog({
        actorId: ctx.userId,
        action: "status_changed",
        entityType: "service_ticket",
        entityId: ticket.id,
        metadata: { from: existing.status, to: status },
      });
    }
    if (
      assigneeId !== undefined &&
      (assigneeId != null ? Number(assigneeId) : null) !== existing.assigneeId
    ) {
      const nextName =
        ticket.assigneeId != null
          ? (await store.findUserById(ticket.assigneeId))?.fullName ?? null
          : null;
      await store.insertActivityLog({
        actorId: ctx.userId,
        action: "assigned",
        entityType: "service_ticket",
        entityId: ticket.id,
        metadata: {
          fromAssigneeId: existing.assigneeId,
          toAssigneeId: ticket.assigneeId,
          toAssigneeName: nextName,
        },
      });
      if (ticket.assigneeId != null) {
        void notifyServiceTicketAssignee(
          ticket.assigneeId,
          ticket.title,
          ticket.id,
          ctx.userId,
        );
      }
    }
    res.json(await enrichTicket(ticket));
  },
);

router.get(
  "/v1/service-tickets/:id/records",
  requireAuth,
  requirePermission("service_tickets:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = parseId(req.params.id);
    const ticket = await store.findServiceTicketById(id);
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    const visible = (await store.listServiceTicketsForAccess(ctx)).some((t) => t.id === id);
    if (!visible) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const records = await store.listServiceRecords(id);
    res.json(await Promise.all(records.map(enrichRecord)));
  },
);

router.post(
  "/v1/service-tickets/:id/records",
  requireAuth,
  requirePermission("service_tickets:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = parseId(req.params.id);
    const existing = await store.findServiceTicketById(id);
    if (!existing) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    if (!canWriteServiceTicket(ctx, existing)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { recordType, body, statusAfter, nextFollowUpAt } = req.body;
    if (!body?.trim()) {
      res.status(400).json({ error: "body is required" });
      return;
    }
    const { record, ticket } = await store.createServiceRecord({
      ticketId: id,
      recordType: recordType ?? "NOTE",
      body: body.trim(),
      statusAfter: statusAfter ?? null,
      nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
      createdById: ctx.userId,
    });
    await store.insertActivityLog({
      actorId: ctx.userId,
      action: "follow_up",
      entityType: "service_record",
      entityId: record.id,
      metadata: { ticketId: id, recordType: record.recordType },
    });
    res.status(201).json({
      record: await enrichRecord(record),
      ticket: await enrichTicket(ticket),
    });
  },
);

export default router;
