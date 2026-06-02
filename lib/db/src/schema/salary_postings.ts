import { pgTable, serial, integer, decimal, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const salaryPostingsTable = pgTable("salary_postings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  allocationType: text("allocation_type").notNull(),
  projectId: integer("project_id").references(() => projectsTable.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  baseSalary: decimal("base_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  bonus: decimal("bonus", { precision: 12, scale: 2 }).notNull().default("0"),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSalaryPostingSchema = createInsertSchema(salaryPostingsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSalaryPosting = z.infer<typeof insertSalaryPostingSchema>;
export type SalaryPosting = typeof salaryPostingsTable.$inferSelect;
