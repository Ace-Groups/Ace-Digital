import { Router } from "express";
import { store } from "@workspace/db";
import type { ServiceRecord, ServiceTicket } from "@workspace/db";
import { canWriteServiceTicket, isTicketFollowUpOverdue } from "@workspace/db";
import { hasPermission } from "@workspace/rbac";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";

const router = Router();

function parseId(param: string | string[] | undefined): number {
  return Number(Array.isArray(param) ? param[0] : param);
}

async function enrichTicket(
  ticket: ServiceTicket,
  opts?: { records?: ServiceRecord[] },
) {
  const [client, project, assignee, creator] = await Promise.all([
    store.findClientById(ticket.clientId),
    ticket.projectId ? store.findProjectById(ticket.projectId) : null,
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
    clientId: ticket.clientId,
    clientName: client?.companyName ?? null,
    projectId: ticket.projectId,
    projectName: project?.name ?? null,
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
      clientId,
      projectId,
      assigneeId,
      teamId,
      priority,
      status,
      category,
      nextFollowUpAt,
    } = req.body;
    if (!title || !clientId) {
      res.status(400).json({ error: "Title and clientId are required" });
      return;
    }
    const client = await store.findClientById(Number(clientId));
    if (!client) {
      res.status(400).json({ error: "Client not found" });
      return;
    }
    const ticket = await store.createServiceTicket({
      title,
      description: description ?? null,
      clientId: Number(clientId),
      projectId: projectId != null ? Number(projectId) : null,
      assigneeId: assigneeId != null ? Number(assigneeId) : ctx.userId,
      teamId: teamId != null ? Number(teamId) : ctx.teamId,
      priority: priority ?? "MEDIUM",
      status: status ?? "OPEN",
      category: category ?? "SUPPORT",
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
      projectId,
      assigneeId,
      teamId,
      priority,
      status,
      category,
      nextFollowUpAt,
    } = req.body;
    if (assigneeId !== undefined && !hasPermission(ctx, "service_tickets:assign")) {
      const isSelfAssign =
        Number(assigneeId) === ctx.userId && existing.createdById === ctx.userId;
      if (!isSelfAssign) {
        res.status(403).json({ error: "Cannot reassign this ticket" });
        return;
      }
    }
    const ticket = await store.updateServiceTicket(id, {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(projectId !== undefined && { projectId: projectId != null ? Number(projectId) : null }),
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
