import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";
import { teamsTable } from "./teams";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  projectId: integer("project_id").references(() => projectsTable.id),
  assigneeId: integer("assignee_id").references(() => usersTable.id),
  teamId: integer("team_id").references(() => teamsTable.id),
  priority: text("priority").notNull().default("MEDIUM"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: text("status").notNull().default("PENDING"),
  progress: integer("progress").notNull().default(0),
  /** Denormalized for Firestore listing; source of truth is task_assignees when using Postgres. */
  assigneeIds: jsonb("assignee_ids").$type<number[]>().default([]),
  assigneeCompletions: jsonb("assignee_completions").$type<Record<string, boolean>>().default({}),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
