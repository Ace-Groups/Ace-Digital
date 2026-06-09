import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const deletedUserArchivesTable = pgTable("deleted_user_archives", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(),
  teamId: integer("team_id"),
  employeeCode: text("employee_code"),
  status: text("status"),
  createdAt: timestamp("created_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull().defaultNow(),
  retentionUntil: timestamp("retention_until", { withTimezone: true }).notNull(),
  snapshot: jsonb("snapshot").notNull(),
});

export type DeletedUserArchive = typeof deletedUserArchivesTable.$inferSelect;
