import { pgTable, serial, integer, decimal, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const payrollRunsTable = pgTable("payroll_runs", {
  id: serial("id").primaryKey(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("PENDING"),
  approvedById: integer("approved_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payslipsTable = pgTable("payslips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  payrollRunId: integer("payroll_run_id").notNull().references(() => payrollRunsTable.id),
  baseSalary: decimal("base_salary", { precision: 12, scale: 2 }).notNull(),
  bonus: decimal("bonus", { precision: 12, scale: 2 }).notNull().default("0"),
  deductions: decimal("deductions", { precision: 12, scale: 2 }).notNull().default("0"),
  netPay: decimal("net_pay", { precision: 12, scale: 2 }).notNull(),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPayrollRunSchema = createInsertSchema(payrollRunsTable).omit({ id: true, createdAt: true });
export const insertPayslipSchema = createInsertSchema(payslipsTable).omit({ id: true, createdAt: true });
export type InsertPayrollRun = z.infer<typeof insertPayrollRunSchema>;
export type InsertPayslip = z.infer<typeof insertPayslipSchema>;
export type PayrollRun = typeof payrollRunsTable.$inferSelect;
export type Payslip = typeof payslipsTable.$inferSelect;
