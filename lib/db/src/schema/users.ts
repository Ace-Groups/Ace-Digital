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
  dob: timestamp("dob", { withTimezone: true }),
  address: text("address"),
  addressLine2: text("address_line_2"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country"),
  gender: text("gender"),
  maritalStatus: text("marital_status"),
  nationality: text("nationality"),
  aadhaarNumber: text("aadhaar_number"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  highestQualification: text("highest_qualification"),
  bloodGroup: text("blood_group"),
  aadhaarDocument: text("aadhaar_document"),
  notes: text("notes"),
  verifySlug: text("verify_slug").unique(),
  verifySlugEnabled: boolean("verify_slug_enabled").notNull().default(true),
  publicProfileEnabled: boolean("public_profile_enabled").notNull().default(false),
  linkedinUrl: text("linkedin_url"),
  portfolioUrl: text("portfolio_url"),
  publicPhone: text("public_phone"),
  publicEmail: text("public_email"),
  officeAddress: text("office_address"),
  publicBio: text("public_bio"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
