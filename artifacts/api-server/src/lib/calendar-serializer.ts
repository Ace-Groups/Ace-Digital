import type { CalendarEvent, Task, CalendarSourceRef } from "@workspace/db";
import { taskAssigneeIds } from "@workspace/rbac";

export type CalendarFeedItemJson = {
  id: string;
  kind: "event" | "task" | "chat_event" | "chat_poll";
  title: string;
  description?: string | null;
  eventType?: string;
  startAt: string;
  endAt?: string | null;
  allDay?: boolean;
  location?: string | null;
  readOnly: boolean;
  ownerId?: number;
  eventId?: number;
  taskId?: number;
  channelId?: number;
  messageId?: number;
  sourceRef?: CalendarSourceRef;
};

export function calendarEventToJson(
  e: CalendarEvent,
  ownerName?: string | null,
  createdByName?: string | null,
) {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    eventType: e.eventType,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt?.toISOString() ?? null,
    allDay: e.allDay,
    location: e.location,
    color: e.color,
    ownerId: e.ownerId,
    ownerName: ownerName ?? null,
    createdById: e.createdById,
    createdByName: createdByName ?? null,
    teamId: e.teamId,
    visibility: e.visibility,
    attendeeIds: e.attendeeIds ?? [],
    attendeeStatuses: e.attendeeStatuses ?? {},
    sourceRef: e.sourceRef ?? undefined,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export function nativeEventToFeedItem(e: CalendarEvent): CalendarFeedItemJson {
  const ref = e.sourceRef as CalendarSourceRef | null | undefined;
  let kind: CalendarFeedItemJson["kind"] = "event";
  if (ref?.kind === "chat_event") kind = "chat_event";
  if (ref?.kind === "chat_poll") kind = "chat_poll";

  return {
    id: `event-${e.id}`,
    kind,
    title: e.title,
    description: e.description,
    eventType: e.eventType,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt?.toISOString() ?? null,
    allDay: e.allDay,
    location: e.location,
    readOnly: false,
    ownerId: e.ownerId,
    eventId: e.id,
    channelId: ref?.kind === "chat_event" || ref?.kind === "chat_poll" ? ref.channelId : undefined,
    messageId: ref?.kind === "chat_event" || ref?.kind === "chat_poll" ? ref.messageId : undefined,
    sourceRef: ref ?? undefined,
  };
}

export function taskToFeedItem(task: Task): CalendarFeedItemJson | null {
  if (!task.dueDate) return null;
  return {
    id: `task-${task.id}`,
    kind: "task",
    title: task.title,
    description: null,
    eventType: "deadline",
    startAt: task.dueDate.toISOString(),
    endAt: null,
    allDay: true,
    readOnly: true,
    taskId: task.id,
    sourceRef: { kind: "task", taskId: task.id },
  };
}

export function taskVisibleToUser(task: Task, userId: number): boolean {
  if (task.createdById === userId) return true;
  return taskAssigneeIds(task).includes(userId);
}

export function taskInRange(task: Task, from: Date, to: Date): boolean {
  if (!task.dueDate) return false;
  const t = task.dueDate.getTime();
  return t >= from.getTime() && t <= to.getTime();
}
