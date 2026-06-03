import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { serviceTicketsTable } from "./service_tickets";
import { usersTable } from "./users";

export const serviceRecordsTable = pgTable("service_records", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => serviceTicketsTable.id),
  recordType: text("record_type").notNull().default("NOTE"),
  body: text("body").notNull(),
  statusAfter: text("status_after"),
  nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertServiceRecordSchema = createInsertSchema(serviceRecordsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertServiceRecord = z.infer<typeof insertServiceRecordSchema>;
export type ServiceRecord = typeof serviceRecordsTable.$inferSelect;
