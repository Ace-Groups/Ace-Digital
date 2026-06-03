import { Router } from "express";
import { store } from "@workspace/db";
import {
  canAccessChannel,
  canManageChannel,
  canPostInChannel,
  hasPermission,
} from "@workspace/rbac";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { requirePermission } from "../lib/rbac-middleware";
import { channelToJson, normalizeChannelName } from "../lib/channel-serializer";
import { messageToJson, messagePreview, validateMessagePayload } from "../lib/message-attachments";
import { notifyChannelMembers } from "../lib/chat-notify";
import { extractMentionedUserIds } from "../lib/chat-mentions";
import { sortChannelsForSidebar } from "@workspace/db";

const router = Router();

async function getMembership(channelId: number, userId: number) {
  return store.findChannelMembership(channelId, userId);
}

async function requireChannelAccess(
  ctx: ReturnType<typeof getAccessContext>,
  channelId: number,
) {
  const channel = await store.findChannelById(channelId);
  if (!channel) return { error: "not_found" as const };
  const membership = await getMembership(channelId, ctx.userId);
  if (!canAccessChannel(ctx, channel, membership)) {
    return { error: "forbidden" as const };
  }
  return { channel, membership };
}

router.get(
  "/v1/channels",
  requireAuth,
  requirePermission("channels:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const channels = hasPermission(ctx, "channels:all")
      ? await store.listChannels()
      : await store.listChannelsForUser(ctx.userId);

    const teams = await store.listTeams();
    const teamMap = Object.fromEntries(teams.map((t) => [t.id, t.name]));
    const channelIds = channels.map((c) => c.id);
    const meta = await store.listChannelListMeta(channelIds, ctx.userId);
    const adminAll = hasPermission(ctx, "channels:all");

    const sortOrder = new Map(
      sortChannelsForSidebar(
        channels.map((c) => ({
          id: c.id,
          name: c.name,
          unreadCount: meta.unreadCounts.get(c.id) ?? 0,
          lastPostAt: c.lastPostAt,
        })),
      ).map((c, index) => [c.id, index]),
    );

    const result = channels
      .map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        teamId: c.teamId,
        teamName: c.teamId ? (teamMap[c.teamId] ?? null) : null,
        type: c.type,
        visibility: c.visibility,
        archived: c.archived,
        memberCount: meta.counts.get(c.id) ?? 0,
        myRole: meta.roles.get(c.id) ?? (adminAll ? "owner" : null),
        unreadCount: meta.unreadCounts.get(c.id) ?? 0,
        lastPostAt: c.lastPostAt?.toISOString() ?? null,
        lastMessagePreview: meta.lastMessagePreviews.get(c.id) ?? null,
        lastReadMessageId: meta.lastReadMessageIds.get(c.id) ?? null,
        createdAt: c.createdAt.toISOString(),
      }))
      .sort((a, b) => (sortOrder.get(a.id) ?? 0) - (sortOrder.get(b.id) ?? 0));

    res.json(result);
  },
);

router.post(
  "/v1/channels",
  requireAuth,
  requirePermission("channels:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const { name, description, type, teamId, memberIds } = req.body ?? {};
    const normalized = normalizeChannelName(name ?? "");
    if (!normalized) {
      res.status(400).json({
        error: "Invalid channel name (2–80 chars, lowercase letters, numbers, hyphens)",
      });
      return;
    }

    const channelType = type === "ANNOUNCEMENT" ? "ANNOUNCEMENT" : "TEAM";
    const channel = await store.createChannel({
      name: normalized,
      description: description ?? null,
      teamId: teamId ?? null,
      type: channelType,
      visibility: "PRIVATE",
      createdById: ctx.userId,
    });

    await store.addChannelMember(channel.id, ctx.userId, "owner");

    const ids = Array.isArray(memberIds)
      ? [...new Set(memberIds.map((id: unknown) => Number(id)).filter((id) => id > 0))]
      : [];
    for (const userId of ids) {
      if (userId === ctx.userId) continue;
      const role = channelType === "ANNOUNCEMENT" ? "viewer" : "member";
      await store.addChannelMember(channel.id, userId, role);
    }

    if (teamId) {
      const users = await store.listUsers();
      for (const u of users) {
        if (u.teamId === teamId && u.status === "active" && u.id !== ctx.userId) {
          if (!ids.includes(u.id)) {
            await store.addChannelMember(channel.id, u.id, "member");
          }
        }
      }
    }

    if (channelType === "ANNOUNCEMENT") {
      const users = await store.listUsers();
      for (const u of users) {
        if (u.status !== "active") continue;
        const existing = await getMembership(channel.id, u.id);
        if (!existing) {
          const role = u.id === ctx.userId ? "owner" : "viewer";
          await store.addChannelMember(channel.id, u.id, role);
        }
      }
    }

    res.status(201).json(await channelToJson(channel, { myRole: "owner" }));
  },
);

router.get(
  "/v1/channels/:id",
  requireAuth,
  requirePermission("channels:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const access = await requireChannelAccess(ctx, id);
    if (access.error === "not_found") {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    if (access.error === "forbidden") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const myRole =
      access.membership?.role ??
      (hasPermission(ctx, "channels:all") ? "owner" : null);
    res.json(await channelToJson(access.channel, { myRole }));
  },
);

router.patch(
  "/v1/channels/:id",
  requireAuth,
  requirePermission("channels:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const access = await requireChannelAccess(ctx, id);
    if (access.error === "not_found") {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    if (access.error === "forbidden") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!canManageChannel(ctx, access.membership)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { name, description, archived } = req.body ?? {};
    const patch: { name?: string; description?: string | null; archived?: boolean } = {};
    if (name !== undefined) {
      const normalized = normalizeChannelName(name);
      if (!normalized) {
        res.status(400).json({ error: "Invalid channel name" });
        return;
      }
      patch.name = normalized;
    }
    if (description !== undefined) patch.description = description;
    if (archived !== undefined) patch.archived = Boolean(archived);

    const updated = await store.updateChannel(id, patch);
    if (!updated) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    res.json(
      await channelToJson(updated, {
        myRole: access.membership?.role ?? "owner",
      }),
    );
  },
);

router.delete(
  "/v1/channels/:id",
  requireAuth,
  requirePermission("channels:all"),
  async (req, res): Promise<void> => {
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const channel = await store.findChannelById(id);
    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    await store.deleteChannel(id);
    res.status(204).send();
  },
);

router.get(
  "/v1/channels/:id/members",
  requireAuth,
  requirePermission("channels:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const access = await requireChannelAccess(ctx, id);
    if (access.error === "not_found") {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    if (access.error === "forbidden") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const members = await store.listChannelMembers(id);
    res.json(
      members.map((m) => ({
        userId: m.userId,
        fullName: m.fullName,
        email: m.email,
        avatarUrl: m.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    );
  },
);

router.post(
  "/v1/channels/:id/members",
  requireAuth,
  requirePermission("channels:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const access = await requireChannelAccess(ctx, id);
    if (access.error === "not_found") {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    if (access.error === "forbidden") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!canManageChannel(ctx, access.membership)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { userId, role } = req.body ?? {};
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }
    const memberRole =
      role === "owner" || role === "viewer" || role === "member" ? role : "member";
    const user = await store.findUserById(Number(userId));
    if (!user) {
      res.status(400).json({ error: "User not found" });
      return;
    }
    await store.addChannelMember(id, Number(userId), memberRole);
    const members = await store.listChannelMembers(id);
    const added = members.find((m) => m.userId === Number(userId));
    res.status(201).json({
      userId: added!.userId,
      fullName: added!.fullName,
      email: added!.email,
      avatarUrl: added!.avatarUrl,
      role: added!.role,
      joinedAt: added!.joinedAt.toISOString(),
    });
  },
);

router.delete(
  "/v1/channels/:id/members/:userId",
  requireAuth,
  requirePermission("channels:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const targetUserId = Number(
      Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId,
    );
    const access = await requireChannelAccess(ctx, id);
    if (access.error === "not_found") {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    if (access.error === "forbidden") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!canManageChannel(ctx, access.membership)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const targetMembership = await getMembership(id, targetUserId);
    if (!targetMembership) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    if (targetMembership.role === "owner") {
      const ownerCount = await store.countChannelOwners(id);
      if (ownerCount <= 1) {
        res.status(400).json({ error: "Cannot remove the last owner" });
        return;
      }
    }

    await store.removeChannelMember(id, targetUserId);
    res.status(204).send();
  },
);

router.get(
  "/v1/channels/:id/mention-candidates",
  requireAuth,
  requirePermission("channels:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const access = await requireChannelAccess(ctx, id);
    if (access.error === "not_found") {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    if (access.error === "forbidden") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const qRaw = req.query.q;
    const q = String(Array.isArray(qRaw) ? qRaw[0] : qRaw ?? "")
      .trim()
      .toLowerCase();

    const members = await store.listChannelMembers(id);
    const candidates = members
      .filter((m) => m.userId !== ctx.userId)
      .filter((m) => !q || m.fullName.toLowerCase().includes(q))
      .slice(0, 20)
      .map((m) => ({
        userId: m.userId,
        fullName: m.fullName,
        avatarUrl: m.avatarUrl,
      }));

    res.json(candidates);
  },
);

router.post(
  "/v1/channels/:id/read",
  requireAuth,
  requirePermission("channels:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const access = await requireChannelAccess(ctx, id);
    if (access.error === "not_found") {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    if (access.error === "forbidden") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await store.markChannelRead(id, ctx.userId);
    res.status(204).send();
  },
);

router.get(
  "/v1/channels/:id/messages",
  requireAuth,
  requirePermission("channels:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const access = await requireChannelAccess(ctx, id);
    if (access.error === "not_found") {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    if (access.error === "forbidden") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(100, Math.max(1, limitRaw))
      : 50;
    const beforeRaw = req.query.before;
    const before =
      beforeRaw !== undefined && beforeRaw !== ""
        ? Number(Array.isArray(beforeRaw) ? beforeRaw[0] : beforeRaw)
        : undefined;

    const messages = await store.listMessagesByChannel(id, {
      limit,
      before: Number.isFinite(before) ? before : undefined,
    });
    const users = await store.listUsers();
    const avatarMap = Object.fromEntries(users.map((u) => [u.id, u.avatarUrl]));

    res.json(
      messages.map((m) =>
        messageToJson(
          m,
          m.senderName ?? "Unknown",
          avatarMap[m.senderId] ?? null,
        ),
      ),
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
    const access = await requireChannelAccess(ctx, id);
    if (access.error === "not_found") {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    if (access.error === "forbidden") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!canPostInChannel(ctx, access.channel, access.membership)) {
      res.status(403).json({ error: "You cannot post in this channel" });
      return;
    }

    let payload: ReturnType<typeof validateMessagePayload>;
    try {
      payload = validateMessagePayload(
        req.body?.body,
        req.body?.attachments,
        req.body?.messageKind,
        req.body?.metadata,
      );
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Invalid message" });
      return;
    }

    try {
      const sender = await store.findUserById(ctx.userId);
      const message = await store.createMessage({
        channelId: id,
        senderId: ctx.userId,
        body: payload.body,
        attachments: payload.attachments ?? null,
        messageKind: payload.messageKind,
        metadata: payload.metadata ?? null,
        senderName: sender?.fullName ?? null,
        senderAvatar: sender?.avatarUrl ?? null,
      });

      const members = await store.listChannelMembers(id);
      const mentioned = extractMentionedUserIds(payload.body, members);
      const preview = messagePreview(message.body, message.attachments, message.messageKind);

      if (mentioned.length > 0) {
        void notifyChannelMembers(
          id,
          ctx.userId,
          access.channel.name,
          `${sender?.fullName ?? "Someone"} mentioned you: ${preview}`,
          mentioned,
        ).catch((err) => console.error("[chat-notify-mention]", err));
      } else {
        void notifyChannelMembers(
          id,
          ctx.userId,
          access.channel.name,
          preview,
        ).catch((err) => console.error("[chat-notify]", err));
      }

      void store.markChannelRead(id, ctx.userId).catch((e) =>
        console.error("[channels/mark-read]", e),
      );

      res.status(201).json(
        messageToJson(
          message,
          sender?.fullName ?? "Unknown",
          sender?.avatarUrl ?? null,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send message";
      console.error("[channels/messages]", message);
      const tooLarge =
        /too large|payload|entity too large|exceed.*size|1\s*MiB|1048576/i.test(message);
      res.status(tooLarge ? 413 : 500).json({ error: message });
    }
  },
);

router.post(
  "/v1/channels/:id/messages/:messageId/reactions",
  requireAuth,
  requirePermission("channels:post"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const channelId = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const messageId = Number(
      Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId,
    );
    const emoji = typeof req.body?.emoji === "string" ? req.body.emoji.trim() : "";
    if (!Number.isFinite(channelId) || !Number.isFinite(messageId) || !emoji || emoji.length > 32) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const access = await requireChannelAccess(ctx, channelId);
    if (access.error === "not_found") {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    if (access.error === "forbidden") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const message = await store.findMessageById(messageId);
    if (!message || message.channelId !== channelId) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const meta = (message.metadata ?? {}) as Record<string, unknown>;
    const reactions = { ...((meta.reactions as Record<string, number[]>) ?? {}) };
    const current = [...(reactions[emoji] ?? [])];
    const idx = current.indexOf(ctx.userId);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(ctx.userId);
    }
    if (current.length) {
      reactions[emoji] = current;
    } else {
      delete reactions[emoji];
    }

    const updated = await store.updateMessage(messageId, {
      metadata: { ...meta, reactions },
    });
    if (!updated) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const sender = await store.findUserById(updated.senderId);
    res.json(
      messageToJson(updated, sender?.fullName ?? "Unknown", sender?.avatarUrl ?? null),
    );
  },
);

router.patch(
  "/v1/channels/:id/messages/:messageId/poll/vote",
  requireAuth,
  requirePermission("channels:post"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const channelId = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const messageId = Number(
      Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId,
    );
    const { optionId } = req.body as { optionId?: string };

    if (!Number.isFinite(channelId) || !Number.isFinite(messageId) || !optionId) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const access = await requireChannelAccess(ctx, channelId);
    if (access.error === "not_found") {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    if (access.error === "forbidden") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const message = await store.findMessageByIdWithSender(messageId);
    if (
      !message ||
      message.channelId !== channelId ||
      message.messageKind !== "poll" ||
      !message.metadata
    ) {
      res.status(404).json({ error: "Poll not found" });
      return;
    }

    const meta = message.metadata as {
      question: string;
      options: { id: string; label: string }[];
      votes: Record<string, number[]>;
      allowMultiple?: boolean;
    };
    if (!meta.options.some((o) => o.id === optionId)) {
      res.status(400).json({ error: "Invalid option" });
      return;
    }

    const votes = { ...meta.votes };
    for (const key of Object.keys(votes)) {
      votes[key] = (votes[key] ?? []).filter((uid) => uid !== ctx.userId);
    }
    if (!meta.allowMultiple) {
      votes[optionId] = [ctx.userId];
    } else {
      votes[optionId] = [...(votes[optionId] ?? []), ctx.userId];
    }

    const updated = await store.updateMessage(messageId, {
      metadata: { ...meta, votes },
    });
    if (!updated) {
      res.status(404).json({ error: "Poll not found" });
      return;
    }

    const sender = await store.findUserById(updated.senderId);
    res.json(
      messageToJson(updated, sender?.fullName ?? "Unknown", sender?.avatarUrl ?? null),
    );
  },
);

router.patch(
  "/v1/channels/:id/messages/:messageId/event/rsvp",
  requireAuth,
  requirePermission("channels:post"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const channelId = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const messageId = Number(
      Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId,
    );
    const { status } = req.body as { status?: "going" | "maybe" | "no" };

    if (!Number.isFinite(channelId) || !Number.isFinite(messageId) || !status) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    if (!["going", "maybe", "no"].includes(status)) {
      res.status(400).json({ error: "Invalid RSVP status" });
      return;
    }

    const access = await requireChannelAccess(ctx, channelId);
    if (access.error === "not_found") {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    if (access.error === "forbidden") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const message = await store.findMessageByIdWithSender(messageId);
    if (
      !message ||
      message.channelId !== channelId ||
      message.messageKind !== "event" ||
      !message.metadata
    ) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const meta = message.metadata as {
      title: string;
      startAt: string;
      endAt?: string | null;
      location?: string | null;
      rsvps: { going: number[]; maybe: number[]; no: number[] };
    };
    const rsvps = {
      going: meta.rsvps.going.filter((uid) => uid !== ctx.userId),
      maybe: meta.rsvps.maybe.filter((uid) => uid !== ctx.userId),
      no: meta.rsvps.no.filter((uid) => uid !== ctx.userId),
    };
    rsvps[status].push(ctx.userId);

    const updated = await store.updateMessage(messageId, {
      metadata: { ...meta, rsvps },
    });
    if (!updated) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const sender = await store.findUserById(updated.senderId);
    res.json(
      messageToJson(updated, sender?.fullName ?? "Unknown", sender?.avatarUrl ?? null),
    );
  },
);

export default router;
