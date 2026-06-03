import { Router } from "express";
import { store } from "@workspace/db";
import type { CalendarEvent, CalendarSourceRef } from "@workspace/db";
import {
  canCreateCalendarEvent,
  canDeleteCalendarEvent,
  canEditCalendarEvent,
  canViewCalendarEvent,
  canViewUserCalendar,
} from "@workspace/rbac";
import { canAccessChannel } from "@workspace/rbac";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";
import {
  calendarEventToJson,
  nativeEventToFeedItem,
  taskInRange,
  taskToFeedItem,
  taskVisibleToUser,
  type CalendarFeedItemJson,
} from "../lib/calendar-serializer";
import { notifyCalendarAttendees, notifyCalendarOwner } from "../lib/calendar-notify";

const router = Router();

async function eventWithNames(e: CalendarEvent) {
  const owner = await store.findUserById(e.ownerId);
  const creator = await store.findUserById(e.createdById);
  return calendarEventToJson(e, owner?.fullName ?? null, creator?.fullName ?? null);
}

function parseAttendeeStatuses(
  attendeeIds: number[],
  existing?: Record<string, string> | null,
): Record<string, string> {
  const out = { ...(existing ?? {}) };
  for (const id of attendeeIds) {
    const key = String(id);
    if (!out[key]) out[key] = "invited";
  }
  return out;
}

router.get(
  "/v1/calendar/feed",
  requireAuth,
  requirePermission("calendar:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const from = new Date(String(req.query.from));
    const to = new Date(String(req.query.to));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      res.status(400).json({ error: "Invalid date range" });
      return;
    }

    const targetUserId = req.query.userId ? Number(req.query.userId) : ctx.userId;
    if (!canViewUserCalendar(ctx, targetUserId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const includeTasks = req.query.includeTasks !== "false";
    const includeLinkedChat = req.query.includeLinkedChat !== "false";

    const events = await store.listCalendarEventsForUser(targetUserId, from, to);
    const visibleEvents = events.filter((e) => canViewCalendarEvent(ctx, e, targetUserId));

    const items: CalendarFeedItemJson[] = visibleEvents
      .filter((e) => {
        if (!includeLinkedChat && e.sourceRef) {
          const k = (e.sourceRef as CalendarSourceRef).kind;
          if (k === "chat_event" || k === "chat_poll") return false;
        }
        return true;
      })
      .map(nativeEventToFeedItem);

    if (includeTasks) {
      const tasks = await store.listTasksForAccess(ctx, { assigneeId: targetUserId });
      for (const task of tasks) {
        if (!taskVisibleToUser(task, targetUserId)) continue;
        if (!taskInRange(task, from, to)) continue;
        const feedItem = taskToFeedItem(task);
        if (feedItem) items.push(feedItem);
      }
    }

    items.sort((a, b) => a.startAt.localeCompare(b.startAt));
    res.json(items);
  },
);

router.get(
  "/v1/calendar/events",
  requireAuth,
  requirePermission("calendar:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const from = req.query.from ? new Date(String(req.query.from)) : new Date();
    const to = req.query.to
      ? new Date(String(req.query.to))
      : new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
    const targetUserId = req.query.userId ? Number(req.query.userId) : ctx.userId;

    if (!canViewUserCalendar(ctx, targetUserId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const events = await store.listCalendarEventsForUser(targetUserId, from, to);
    const visible = events.filter((e) => canViewCalendarEvent(ctx, e, targetUserId));
    res.json(await Promise.all(visible.map(eventWithNames)));
  },
);

router.post(
  "/v1/calendar/events",
  requireAuth,
  requirePermission("calendar:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const body = req.body as {
      title?: string;
      description?: string;
      eventType?: string;
      startAt?: string;
      endAt?: string;
      allDay?: boolean;
      location?: string;
      color?: string;
      ownerId?: number;
      teamId?: number;
      visibility?: string;
      attendeeIds?: number[];
    };

    if (!body.title?.trim() || !body.startAt) {
      res.status(400).json({ error: "Title and startAt required" });
      return;
    }

    const ownerId = body.ownerId ?? ctx.userId;
    const attendeeIds = [...new Set([...(body.attendeeIds ?? []), ownerId])];
    const teamId = body.teamId ?? ctx.teamId ?? null;

    if (!canCreateCalendarEvent(ctx, { ownerId, attendeeIds, teamId })) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (ownerId !== ctx.userId && ctx.role === "team_lead") {
      const ownerUser = await store.findUserById(ownerId);
      if (ownerUser?.teamId !== ctx.teamId) {
        res.status(403).json({ error: "Cannot schedule outside your team" });
        return;
      }
    }

    const event = await store.createCalendarEvent({
      title: body.title.trim(),
      description: body.description?.trim() ?? null,
      eventType: body.eventType ?? "meeting",
      startAt: new Date(body.startAt),
      endAt: body.endAt ? new Date(body.endAt) : null,
      allDay: body.allDay ?? false,
      location: body.location?.trim() ?? null,
      color: body.color ?? null,
      ownerId,
      createdById: ctx.userId,
      teamId,
      visibility: body.visibility ?? "private",
      attendeeIds,
      attendeeStatuses: parseAttendeeStatuses(attendeeIds),
      sourceRef: { kind: "native" },
    });

    await store.insertActivityLog({
      actorId: ctx.userId,
      action: "created",
      entityType: "calendar_event",
      entityId: event.id,
      metadata: { title: event.title },
    });

    void notifyCalendarAttendees(attendeeIds, ctx.userId, event.title, event.id);
    void notifyCalendarOwner(ownerId, ctx.userId, event.title, event.id);

    res.status(201).json(await eventWithNames(event));
  },
);

router.patch(
  "/v1/calendar/events/:id",
  requireAuth,
  requirePermission("calendar:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(req.params.id);
    const event = await store.findCalendarEventById(id);
    if (!event) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (!canEditCalendarEvent(ctx, event)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const body = req.body as Partial<{
      title: string;
      description: string;
      eventType: string;
      startAt: string;
      endAt: string;
      allDay: boolean;
      location: string;
      color: string;
      teamId: number;
      visibility: string;
      attendeeIds: number[];
    }>;

    const patch: Partial<CalendarEvent> = {};
    if (body.title != null) patch.title = body.title.trim();
    if (body.description !== undefined) patch.description = body.description?.trim() ?? null;
    if (body.eventType != null) patch.eventType = body.eventType;
    if (body.startAt != null) patch.startAt = new Date(body.startAt);
    if (body.endAt !== undefined) patch.endAt = body.endAt ? new Date(body.endAt) : null;
    if (body.allDay != null) patch.allDay = body.allDay;
    if (body.location !== undefined) patch.location = body.location?.trim() ?? null;
    if (body.color !== undefined) patch.color = body.color ?? null;
    if (body.teamId !== undefined) patch.teamId = body.teamId ?? null;
    if (body.visibility != null) patch.visibility = body.visibility;
    if (body.attendeeIds != null) {
      patch.attendeeIds = body.attendeeIds;
      patch.attendeeStatuses = parseAttendeeStatuses(body.attendeeIds, event.attendeeStatuses);
    }

    const updated = await store.updateCalendarEvent(id, patch);
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await store.insertActivityLog({
      actorId: ctx.userId,
      action: "updated",
      entityType: "calendar_event",
      entityId: id,
      metadata: { title: updated.title },
    });

    res.json(await eventWithNames(updated));
  },
);

router.delete(
  "/v1/calendar/events/:id",
  requireAuth,
  requirePermission("calendar:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(req.params.id);
    const event = await store.findCalendarEventById(id);
    if (!event) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (!canDeleteCalendarEvent(ctx, event)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await store.deleteCalendarEvent(id);
    await store.insertActivityLog({
      actorId: ctx.userId,
      action: "deleted",
      entityType: "calendar_event",
      entityId: id,
      metadata: { title: event.title },
    });
    res.status(204).send();
  },
);

router.patch(
  "/v1/calendar/events/:id/rsvp",
  requireAuth,
  requirePermission("calendar:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(req.params.id);
    const { status } = req.body as { status?: string };
    const allowed = ["invited", "accepted", "declined", "tentative"];
    if (!status || !allowed.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const event = await store.findCalendarEventById(id);
    if (!event) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (!(event.attendeeIds ?? []).includes(ctx.userId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const attendeeStatuses = { ...(event.attendeeStatuses ?? {}), [String(ctx.userId)]: status };
    const updated = await store.updateCalendarEvent(id, { attendeeStatuses });
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(await eventWithNames(updated));
  },
);

router.get(
  "/v1/calendar/check-link",
  requireAuth,
  requirePermission("calendar:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const channelId = Number(req.query.channelId);
    const messageId = Number(req.query.messageId);
    const ownerId = req.query.ownerId ? Number(req.query.ownerId) : ctx.userId;

    if (!Number.isFinite(channelId) || !Number.isFinite(messageId)) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const message = await store.findMessageById(messageId);
    if (!message || message.channelId !== channelId) {
      res.json({ linked: false });
      return;
    }

    const kind = message.messageKind === "poll" ? ("chat_poll" as const) : ("chat_event" as const);
    const sourceRef: CalendarSourceRef = { kind, channelId, messageId };
    const existing = await store.findCalendarEventBySourceRef(ownerId, sourceRef);
    res.json({ linked: !!existing, eventId: existing?.id });
  },
);

router.post(
  "/v1/calendar/link-chat",
  requireAuth,
  requirePermission("calendar:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const body = req.body as {
      channelId?: number;
      messageId?: number;
      ownerId?: number;
      reminderAt?: string;
    };

    if (!body.channelId || !body.messageId) {
      res.status(400).json({ error: "channelId and messageId required" });
      return;
    }

    const ownerId = body.ownerId ?? ctx.userId;
    const channel = await store.findChannelById(body.channelId);
    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    const membership = await store.findChannelMembership(body.channelId, ctx.userId);
    if (!canAccessChannel(ctx, channel, membership)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const message = await store.findMessageById(body.messageId);
    if (!message || message.channelId !== body.channelId) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    if (message.messageKind !== "event" && message.messageKind !== "poll") {
      res.status(400).json({ error: "Message is not an event or poll" });
      return;
    }

    const meta = message.metadata as Record<string, unknown> | null;
    if (!meta) {
      res.status(400).json({ error: "Invalid message metadata" });
      return;
    }

    let sourceRef: CalendarSourceRef;
    let title: string;
    let startAt: Date;
    let endAt: Date | null = null;
    let location: string | null = null;
    let eventType = "meeting";

    if (message.messageKind === "event") {
      sourceRef = { kind: "chat_event", channelId: body.channelId, messageId: body.messageId };
      title = String(meta.title ?? "Event");
      startAt = new Date(String(meta.startAt));
      endAt = meta.endAt ? new Date(String(meta.endAt)) : null;
      location = meta.location ? String(meta.location) : null;
    } else {
      sourceRef = { kind: "chat_poll", channelId: body.channelId, messageId: body.messageId };
      title = `Poll: ${String(meta.question ?? "Poll")}`;
      const closesAt = meta.closesAt ?? body.reminderAt;
      if (!closesAt) {
        res.status(400).json({ error: "Poll has no deadline; provide reminderAt" });
        return;
      }
      startAt = new Date(String(closesAt));
      eventType = "deadline";
    }

    if (Number.isNaN(startAt.getTime())) {
      res.status(400).json({ error: "Invalid start date" });
      return;
    }

    const existing = await store.findCalendarEventBySourceRef(ownerId, sourceRef);
    if (existing) {
      res.status(201).json(await eventWithNames(existing));
      return;
    }

    if (!canCreateCalendarEvent(ctx, { ownerId, attendeeIds: [ownerId], teamId: ctx.teamId })) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (ownerId !== ctx.userId && ctx.role === "team_lead") {
      const ownerUser = await store.findUserById(ownerId);
      if (ownerUser?.teamId !== ctx.teamId) {
        res.status(403).json({ error: "Cannot schedule outside your team" });
        return;
      }
    }

    const event = await store.createCalendarEvent({
      title,
      description: null,
      eventType,
      startAt,
      endAt,
      allDay: false,
      location,
      color: null,
      ownerId,
      createdById: ctx.userId,
      teamId: ctx.teamId ?? null,
      visibility: "private",
      attendeeIds: [ownerId],
      attendeeStatuses: { [String(ownerId)]: "accepted" },
      sourceRef,
    });

    await store.insertActivityLog({
      actorId: ctx.userId,
      action: "linked_from_chat",
      entityType: "calendar_event",
      entityId: event.id,
      metadata: { channelId: body.channelId, messageId: body.messageId },
    });

    void notifyCalendarOwner(ownerId, ctx.userId, event.title, event.id);

    res.status(201).json(await eventWithNames(event));
  },
);

export default router;
