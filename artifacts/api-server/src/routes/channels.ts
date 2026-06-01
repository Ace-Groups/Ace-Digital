import { Router } from "express";
import { db } from "@workspace/db";
import { channelsTable, messagesTable, usersTable, teamsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/v1/channels", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  let channels: typeof channelsTable.$inferSelect[];

  if (["super_admin", "management"].includes(user.role)) {
    channels = await db.select().from(channelsTable).orderBy(channelsTable.name);
  } else {
    const allChannels = await db.select().from(channelsTable).orderBy(channelsTable.name);
    channels = allChannels.filter(
      (c) => c.type === "ANNOUNCEMENT" || (c.type === "TEAM" && c.teamId === user.teamId)
    );
  }

  const teams = await db.select().from(teamsTable);
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t.name]));

  res.json(
    channels.map((c) => ({
      id: c.id,
      name: c.name,
      teamId: c.teamId,
      teamName: c.teamId ? teamMap[c.teamId] ?? null : null,
      type: c.type,
      unreadCount: 0,
    }))
  );
});

router.get("/v1/channels/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const messages = await db
    .select({
      id: messagesTable.id,
      channelId: messagesTable.channelId,
      senderId: messagesTable.senderId,
      senderName: usersTable.fullName,
      senderAvatar: usersTable.avatarUrl,
      body: messagesTable.body,
      createdAt: messagesTable.createdAt,
    })
    .from(messagesTable)
    .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(eq(messagesTable.channelId, id))
    .orderBy(sql`${messagesTable.createdAt} ASC`)
    .limit(100);

  res.json(
    messages.map((m) => ({
      id: m.id,
      channelId: m.channelId,
      senderId: m.senderId,
      senderName: m.senderName ?? "Unknown",
      senderAvatar: m.senderAvatar,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    }))
  );
});

router.post("/v1/channels/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const { body } = req.body;
  if (!body) {
    res.status(400).json({ error: "Message body is required" });
    return;
  }
  const [message] = await db.insert(messagesTable).values({
    channelId: id,
    senderId: req.user!.userId,
    body,
  }).returning();

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  const result = {
    id: message.id,
    channelId: message.channelId,
    senderId: message.senderId,
    senderName: sender?.fullName ?? "Unknown",
    senderAvatar: sender?.avatarUrl ?? null,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
  res.status(201).json(result);
});

export default router;
