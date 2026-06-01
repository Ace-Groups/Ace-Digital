import { Router } from "express";
import { store } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/v1/channels", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const allChannels = await store.listChannels();
  const channels =
    ["super_admin", "management"].includes(user.role)
      ? allChannels
      : allChannels.filter(
          (c) => c.type === "ANNOUNCEMENT" || (c.type === "TEAM" && c.teamId === user.teamId),
        );

  const teams = await store.listTeams();
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t.name]));

  res.json(
    channels.map((c) => ({
      id: c.id,
      name: c.name,
      teamId: c.teamId,
      teamName: c.teamId ? teamMap[c.teamId] ?? null : null,
      type: c.type,
      unreadCount: 0,
    })),
  );
});

router.get("/v1/channels/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const messages = await store.listMessagesByChannel(id, 100);
  const users = await store.listUsers();
  const avatarMap = Object.fromEntries(users.map((u) => [u.id, u.avatarUrl]));

  res.json(
    messages.map((m) => ({
      id: m.id,
      channelId: m.channelId,
      senderId: m.senderId,
      senderName: m.senderName ?? "Unknown",
      senderAvatar: avatarMap[m.senderId] ?? null,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
  );
});

router.post("/v1/channels/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const { body } = req.body;
  if (!body) {
    res.status(400).json({ error: "Message body is required" });
    return;
  }
  const message = await store.createMessage({
    channelId: id,
    senderId: req.user!.userId,
    body,
  });
  const sender = await store.findUserById(req.user!.userId);
  res.status(201).json({
    id: message.id,
    channelId: message.channelId,
    senderId: message.senderId,
    senderName: sender?.fullName ?? "Unknown",
    senderAvatar: sender?.avatarUrl ?? null,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  });
});

export default router;
