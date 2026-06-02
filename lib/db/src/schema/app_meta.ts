import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const appMetaTable = pgTable("app_meta", {
  key: text("key").primaryKey(),
  value: integer("value").notNull().default(0),
});
