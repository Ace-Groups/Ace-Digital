import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobTitlesTable = pgTable("job_titles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJobTitleSchema = createInsertSchema(jobTitlesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertJobTitle = z.infer<typeof insertJobTitleSchema>;
export type JobTitleRow = typeof jobTitlesTable.$inferSelect;
