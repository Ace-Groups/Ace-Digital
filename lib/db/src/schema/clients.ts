import { pgTable, serial, text, integer, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  salutation: text("salutation"),
  contactName: text("contact_name"),
  companyName: text("company_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  assignedTeamId: integer("assigned_team_id").references(() => teamsTable.id),
  status: text("status").notNull().default("ACTIVE"),
  contractValue: decimal("contract_value", { precision: 14, scale: 2 }),
  nextMeetingAt: timestamp("next_meeting_at", { withTimezone: true }),
  notes: text("notes"),
  customFields: jsonb("custom_fields").$type<{ key: string; value: string }[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
