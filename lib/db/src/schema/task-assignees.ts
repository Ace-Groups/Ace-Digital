import { integer, pgTable, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { tasksTable } from "./tasks";
import { usersTable } from "./users";

export const taskAssigneesTable = pgTable(
  "task_assignees",
  {
    taskId: integer("task_id")
      .notNull()
      .references(() => tasksTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.taskId, t.userId] }),
  }),
);
