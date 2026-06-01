import { pgTable, serial, integer, decimal, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const employeeProfilesTable = pgTable("employee_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  baseSalary: decimal("base_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  bonus: decimal("bonus", { precision: 12, scale: 2 }).notNull().default("0"),
  payrollStatus: text("payroll_status").notNull().default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmployeeProfileSchema = createInsertSchema(employeeProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmployeeProfile = z.infer<typeof insertEmployeeProfileSchema>;
export type EmployeeProfile = typeof employeeProfilesTable.$inferSelect;
