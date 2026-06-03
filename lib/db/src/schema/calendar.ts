import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { teamsTable } from "./teams";

export const CALENDAR_EVENT_TYPES = [
  "meeting",
  "deadline",
  "shift",
  "training",
  "company",
  "leave_block",
  "other",
] as const;

export const CALENDAR_VISIBILITY = ["private", "team", "org"] as const;

export type CalendarSourceRef =
  | { kind: "native" }
  | { kind: "task"; taskId: number }
  | { kind: "chat_event"; channelId: number; messageId: number }
  | { kind: "chat_poll"; channelId: number; messageId: number }
  | { kind: "approval_leave"; approvalId: number };

export const calendarEventsTable = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull().default("meeting"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }),
  allDay: boolean("all_day").notNull().default(false),
  location: text("location"),
  color: text("color"),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => usersTable.id),
  teamId: integer("team_id").references(() => teamsTable.id),
  visibility: text("visibility").notNull().default("private"),
  attendeeIds: jsonb("attendee_ids").$type<number[]>().notNull().default([]),
  attendeeStatuses: jsonb("attendee_statuses").$type<Record<string, string>>().default({}),
  sourceRef: jsonb("source_ref").$type<CalendarSourceRef>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCalendarEventSchema = createInsertSchema(calendarEventsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEventsTable.$inferSelect;

export function sourceRefKey(ref: CalendarSourceRef): string {
  if (ref.kind === "native") return "native";
  if (ref.kind === "task") return `task_${ref.taskId}`;
  if (ref.kind === "chat_event") return `chat_event_${ref.channelId}_${ref.messageId}`;
  if (ref.kind === "chat_poll") return `chat_poll_${ref.channelId}_${ref.messageId}`;
  return `approval_leave_${ref.approvalId}`;
}
