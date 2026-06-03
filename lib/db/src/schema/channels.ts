import { pgTable, serial, text, integer, timestamp, boolean, unique, jsonb } from "drizzle-orm/pg-core";
import type { MessageAttachment } from "../message-attachments";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";
import { usersTable } from "./users";

export const channelsTable = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  teamId: integer("team_id").references(() => teamsTable.id),
  type: text("type").notNull().default("TEAM"),
  visibility: text("visibility").notNull().default("PRIVATE"),
  archived: boolean("archived").notNull().default(false),
  avatarUrl: text("avatar_url"),
  lastPostAt: timestamp("last_post_at", { withTimezone: true }),
  messageCount: integer("message_count").notNull().default(0),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const channelMembersTable = pgTable(
  "channel_members",
  {
    id: serial("id").primaryKey(),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channelsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    lastReadMessageId: integer("last_read_message_id"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("channel_members_channel_user").on(t.channelId, t.userId)],
);

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull().references(() => channelsTable.id),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  body: text("body").notNull().default(""),
  attachments: jsonb("attachments").$type<MessageAttachment[]>(),
  messageKind: text("message_kind").notNull().default("text"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedById: integer("deleted_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChannelSchema = createInsertSchema(channelsTable).omit({ id: true, createdAt: true });
export const insertChannelMemberSchema = createInsertSchema(channelMembersTable).omit({
  id: true,
  joinedAt: true,
});
export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });

export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type InsertChannelMember = z.infer<typeof insertChannelMemberSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Channel = typeof channelsTable.$inferSelect;
export type ChannelMember = typeof channelMembersTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;

export const CHANNEL_MEMBER_ROLES = ["owner", "member", "viewer"] as const;
export type ChannelMemberRole = (typeof CHANNEL_MEMBER_ROLES)[number];
