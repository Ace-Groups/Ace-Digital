import { Router } from "express";
import { store } from "@workspace/db";
import { hasPermission } from "@workspace/rbac";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";

const router = Router();

function canAccessChannel(
  ctx: ReturnType<typeof getAccessContext>,
  channel: { type: string; teamId: number | null },
): boolean {
  if (hasPermission(ctx, "channels:all")) return true;
  if (channel.type === "ANNOUNCEMENT") return true;
  if (channel.type === "TEAM" && channel.teamId != null && channel.teamId === ctx.teamId) {
    return true;
  }
  return false;
}

router.get(
  "/v1/channels",
  requireAuth,
  requirePermission("channels:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const allChannels = await store.listChannels();
    const channels = allChannels.filter((c) => canAccessChannel(ctx, c));

    const teams = await store.listTeams();
    const teamMap = Object.fromEntries(teams.map((t) => [t.id, t.name]));

    res.json(
      channels.map((c) => ({
        id: c.id,
        name: c.name,
        teamId: c.teamId,
        teamName: c.teamId ? (teamMap[c.teamId] ?? null) : null,
        type: c.type,
        unreadCount: 0,
      })),
    );
  },
);

router.get(
  "/v1/channels/:id/messages",
  requireAuth,
  requirePermission("channels:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const channels = await store.listChannels();
    const channel = channels.find((c) => c.id === id);
    if (!channel || !canAccessChannel(ctx, channel)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

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
  },
);

router.post(
  "/v1/channels/:id/messages",
  requireAuth,
  requirePermission("channels:post"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const channels = await store.listChannels();
    const channel = channels.find((c) => c.id === id);
    if (!channel || !canAccessChannel(ctx, channel)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { body } = req.body;
    if (!body) {
      res.status(400).json({ error: "Message body is required" });
      return;
    }
    const message = await store.createMessage({
      channelId: id,
      senderId: ctx.userId,
      body,
    });
    const sender = await store.findUserById(ctx.userId);
    res.status(201).json({
      id: message.id,
      channelId: message.channelId,
      senderId: message.senderId,
      senderName: sender?.fullName ?? "Unknown",
      senderAvatar: sender?.avatarUrl ?? null,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    });
  },
);

export default router;
