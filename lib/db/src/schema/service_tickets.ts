import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { projectsTable } from "./projects";
import { tasksTable } from "./tasks";
import { usersTable } from "./users";
import { teamsTable } from "./teams";

export const serviceTicketsTable = pgTable("service_tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  /** CLIENT = linked via client/project; TODO = linked to an existing task (to-do). */
  linkType: text("link_type").notNull().default("CLIENT"),
  clientId: integer("client_id").references(() => clientsTable.id),
  projectId: integer("project_id").references(() => projectsTable.id),
  taskId: integer("task_id").references(() => tasksTable.id),
  assigneeId: integer("assignee_id").references(() => usersTable.id),
  teamId: integer("team_id").references(() => teamsTable.id),
  priority: text("priority").notNull().default("MEDIUM"),
  status: text("status").notNull().default("OPEN"),
  category: text("category").notNull().default("SUPPORT"),
  nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertServiceTicketSchema = createInsertSchema(serviceTicketsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertServiceTicket = z.infer<typeof insertServiceTicketSchema>;
export type ServiceTicket = typeof serviceTicketsTable.$inferSelect;
