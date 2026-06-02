import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("employee"),
  teamId: integer("team_id").references(() => teamsTable.id),
  jobTitle: text("job_title"),
  phone: text("phone"),
  employeeCode: text("employee_code").unique(),
  startDate: timestamp("start_date", { withTimezone: true }),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
