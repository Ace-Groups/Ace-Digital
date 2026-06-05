import { Router } from "express";
import { store } from "@workspace/db";
import {
  canAccessChannel,
  canDeleteMessage,
  canEditMessage,
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
import { triggerAceBot } from "../lib/acebot";

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

async function dmPeerForChannel(channelId: number, userId: number) {
  const channel = await store.findChannelById(channelId);
  if (!channel || channel.type !== "DM") return null;
  const members = await store.listChannelMembers(channelId);
  const peer = members.find((m) => m.userId !== userId);
  if (!peer) return null;
  return {
    dmPeerUserId: peer.userId,
    dmPeerName: peer.fullName,
    dmPeerAvatar: peer.avatarUrl ?? null,
  };
}

function channelListItem(
  c: Awaited<ReturnType<typeof store.findChannelById>> & object,
  meta: Awaited<ReturnType<typeof store.listChannelListMeta>>,
  teamMap: Record<number, string>,
  adminAll: boolean,
  dmPeer?: { dmPeerUserId: number; dmPeerName: string; dmPeerAvatar: string | null } | null,
) {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    avatarUrl: c.avatarUrl ?? null,
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
    starred: meta.starred?.get(c.id) ?? false,
    dmPeerUserId: dmPeer?.dmPeerUserId ?? null,
    dmPeerName: dmPeer?.dmPeerName ?? null,
    dmPeerAvatar: dmPeer?.dmPeerAvatar ?? null,
    createdById: c.createdById ?? null,
    createdAt: c.createdAt.toISOString(),
  };
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

    const result = await Promise.all(
      channels.map(async (c) => {
        const peer = c.type === "DM" ? await dmPeerForChannel(c.id, ctx.userId) : null;
        return channelListItem(c, meta, teamMap, adminAll, peer);
      }),
    );

    res.json(
      result
        .filter((c): c is NonNullable<typeof c> => c != null)
        .sort((a, b) => (sortOrder.get(a.id) ?? 0) - (sortOrder.get(b.id) ?? 0)),
    );
  },
);

router.post(
  "/v1/channels",
  requireAuth,
  requirePermission("channels:write"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const { name, description, type, teamId, memberIds, avatarUrl } = req.body ?? {};
    const normalized = normalizeChannelName(name ?? "");
    if (!normalized) {
      res.status(400).json({
        error: "Invalid channel name (2–80 chars, lowercase letters, numbers, hyphens)",
      });
      return;
    }

    const channelType = type === "ANNOUNCEMENT" ? "ANNOUNCEMENT" : "TEAM";
    if (channelType === "ANNOUNCEMENT" && !hasPermission(ctx, "channels:all")) {
      res.status(403).json({ error: "Only admins can create announcement channels" });
      return;
    }
    let resolvedAvatar: string | null = null;
    if (typeof avatarUrl === "string" && avatarUrl.length > 0 && avatarUrl.length <= 2048) {
      if (avatarUrl.startsWith("icon:")) {
        resolvedAvatar = avatarUrl;
      } else {
        try {
          const u = new URL(avatarUrl);
          if (u.protocol === "http:" || u.protocol === "https:" || avatarUrl.startsWith("data:")) {
            resolvedAvatar = avatarUrl;
          }
        } catch {
          /* ignore invalid URL */
        }
      }
    } else if (channelType === "ANNOUNCEMENT") {
      resolvedAvatar = "icon:megaphone";
    }

    const channel = await store.createChannel({
      name: normalized,
      description: description ?? null,
      teamId: teamId ?? null,
      type: channelType,
      visibility: "PRIVATE",
      createdById: ctx.userId,
      avatarUrl: resolvedAvatar,
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
    if (
      !canManageChannel(ctx, access.membership, {
        createdById: access.channel.createdById ?? null,
      })
    ) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { name, description, archived, avatarUrl } = req.body ?? {};
    const patch: {
      name?: string;
      description?: string | null;
      archived?: boolean;
      avatarUrl?: string | null;
    } = {};
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
    if (avatarUrl !== undefined) {
      if (avatarUrl === null || avatarUrl === "") {
        patch.avatarUrl = null;
      } else if (typeof avatarUrl === "string" && avatarUrl.length <= 2048) {
        if (avatarUrl.startsWith("icon:")) {
          patch.avatarUrl = avatarUrl;
        } else if (avatarUrl.startsWith("data:")) {
          patch.avatarUrl = avatarUrl;
        } else {
          try {
            const u = new URL(avatarUrl);
            if (u.protocol === "http:" || u.protocol === "https:") {
              patch.avatarUrl = avatarUrl;
            } else {
              res.status(400).json({ error: "Avatar URL must be http or https" });
              return;
            }
          } catch {
            res.status(400).json({ error: "Invalid avatar URL" });
            return;
          }
        }
      } else {
        res.status(400).json({ error: "Invalid avatar URL" });
        return;
      }
    }

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
    if (
      !canManageChannel(ctx, access.membership, {
        createdById: access.channel.createdById ?? null,
      })
    ) {
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
    if (access.channel.type !== "DM") {
      const sysSender = await store.findUserById(ctx.userId);
      void store
        .createMessage({
          channelId: id,
          senderId: ctx.userId,
          body: `${user.fullName} joined #${access.channel.name}`,
          attachments: null,
          messageKind: "system",
          metadata: { systemEvent: "member_joined", userId: user.id, userName: user.fullName },
          parentMessageId: null,
          editedAt: null,
          deletedAt: null,
          deletedById: null,
          senderName: sysSender?.fullName ?? null,
          senderAvatar: sysSender?.avatarUrl ?? null,
        })
        .catch((e) => console.error("[member-join-system]", e));
    }
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
    if (
      !canManageChannel(ctx, access.membership, {
        createdById: access.channel.createdById ?? null,
      })
    ) {
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
    const threadRootRaw = req.query.threadRootId;
    const threadRootId =
      threadRootRaw !== undefined && threadRootRaw !== ""
        ? Number(Array.isArray(threadRootRaw) ? threadRootRaw[0] : threadRootRaw)
        : undefined;

    const messages = await store.listMessagesByChannel(id, {
      limit,
      before: Number.isFinite(before) ? before : undefined,
      threadRootId: Number.isFinite(threadRootId) ? threadRootId : undefined,
    });

    res.json(
      messages.map((m) =>
        messageToJson(
          m,
          m.senderName ?? "Unknown",
          m.senderAvatar ?? null,
        ),
      ),
    );
  },
);

router.delete(
  "/v1/channels/:id/messages/:messageId",
  requireAuth,
  requirePermission("channels:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const channelId = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const messageId = Number(
      Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId,
    );
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

    if (
      !canDeleteMessage(
        ctx,
        {
          senderId: message.senderId,
          createdAt: message.createdAt,
        },
        { createdById: access.channel.createdById ?? null },
        access.membership,
      )
    ) {
      res.status(403).json({
        error: "Messages can only be deleted within 24 hours of sending",
      });
      return;
    }

    const deleted = await store.softDeleteMessage(channelId, messageId, ctx.userId);
    if (!deleted) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const users = await store.listUsers();
    const avatarMap = Object.fromEntries(users.map((u) => [u.id, u.avatarUrl]));
    const sender = users.find((u) => u.id === deleted.senderId);
    const deletedJson = messageToJson(
      deleted,
      sender?.fullName ?? "Unknown",
      avatarMap[deleted.senderId] ?? null,
    );
    res.json(deletedJson);
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
      const parentRaw = req.body?.parentMessageId;
      const parentMessageId =
        parentRaw != null && Number.isFinite(Number(parentRaw)) ? Number(parentRaw) : null;
      if (parentMessageId) {
        const root = await store.findMessageById(parentMessageId);
        if (!root || root.channelId !== id) {
          res.status(400).json({ error: "Invalid thread parent" });
          return;
        }
      }

      const message = await store.createMessage({
        channelId: id,
        senderId: ctx.userId,
        body: payload.body,
        attachments: payload.attachments ?? null,
        messageKind: payload.messageKind,
        metadata: payload.metadata ?? null,
        parentMessageId,
        editedAt: null,
        deletedAt: null,
        deletedById: null,
        senderName: sender?.fullName ?? null,
        senderAvatar: sender?.avatarUrl ?? null,
      });

      const createdJson = messageToJson(
        message,
        sender?.fullName ?? "Unknown",
        sender?.avatarUrl ?? null,
      );
      res.status(201).json(createdJson);

      setImmediate(() => {
        void (async () => {
          try {
            if (payload.body && payload.body.includes("@AceBot")) {
              await triggerAceBot(id, message.id, payload.body, ctx.userId);
            }

            const members = await store.listChannelMembers(id);
            const mentioned = extractMentionedUserIds(payload.body, members);
            const preview = messagePreview(message.body, message.attachments, message.messageKind);

            if (mentioned.length > 0) {
              await notifyChannelMembers(
                id,
                ctx.userId,
                access.channel.name,
                `${sender?.fullName ?? "Someone"} mentioned you: ${preview}`,
                mentioned,
              );
            } else {
              await notifyChannelMembers(id, ctx.userId, access.channel.name, preview);
            }

            await store.markChannelRead(id, ctx.userId);
          } catch (err) {
            console.error("[channels/messages/background]", err);
          }
        })();
      });
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
    const reactionJson = messageToJson(
      updated,
      sender?.fullName ?? "Unknown",
      sender?.avatarUrl ?? null,
    );
    res.json(reactionJson);
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
    const pollJson = messageToJson(
      updated,
      sender?.fullName ?? "Unknown",
      sender?.avatarUrl ?? null,
    );
    res.json(pollJson);
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
    const rsvpJson = messageToJson(
      updated,
      sender?.fullName ?? "Unknown",
      sender?.avatarUrl ?? null,
    );
    res.json(rsvpJson);
  },
);

router.patch(
  "/v1/channels/:id/messages/:messageId",
  requireAuth,
  requirePermission("channels:post"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const channelId = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const messageId = Number(
      Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId,
    );
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
    if (!message || message.channelId !== channelId || message.deletedAt) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    if (!canEditMessage(ctx, { senderId: message.senderId, createdAt: message.createdAt })) {
      res.status(403).json({ error: "Messages can only be edited within 24 hours of sending" });
      return;
    }

    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (!body) {
      res.status(400).json({ error: "Message body is required" });
      return;
    }

    const updated = await store.updateMessage(messageId, {
      body,
      editedAt: new Date(),
    });
    if (!updated) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const sender = await store.findUserById(updated.senderId);
    const json = messageToJson(
      updated,
      sender?.fullName ?? "Unknown",
      sender?.avatarUrl ?? null,
    );
    res.json(json);
  },
);

router.post(
  "/v1/channels/:id/star",
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
    await store.setChannelStarred(id, ctx.userId, true);
    res.status(204).send();
  },
);

router.delete(
  "/v1/channels/:id/star",
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
    await store.setChannelStarred(id, ctx.userId, false);
    res.status(204).send();
  },
);

router.get(
  "/v1/channels/:id/pins",
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

    const pins = await store.listChannelPins(id);
    const users = await store.listUsers();
    const avatarMap = Object.fromEntries(users.map((u) => [u.id, u.avatarUrl]));
    const out = await Promise.all(
      pins.map(async (pin) => {
        const msg = await store.findMessageByIdWithSender(pin.messageId);
        if (!msg) return null;
        const sender = users.find((u) => u.id === msg.senderId);
        return {
          channelId: pin.channelId,
          messageId: pin.messageId,
          pinnedById: pin.pinnedById,
          pinnedAt: pin.pinnedAt.toISOString(),
          message: messageToJson(
            msg,
            msg.senderName ?? sender?.fullName ?? "Unknown",
            avatarMap[msg.senderId] ?? sender?.avatarUrl ?? null,
          ),
        };
      }),
    );
    res.json(out.filter((p): p is NonNullable<typeof p> => p != null));
  },
);

router.post(
  "/v1/channels/:id/messages/:messageId/pin",
  requireAuth,
  requirePermission("channels:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const channelId = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const messageId = Number(
      Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId,
    );
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
    if (!message || message.channelId !== channelId || message.deletedAt) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const canPin =
      message.senderId === ctx.userId ||
      canManageChannel(ctx, access.membership, {
        createdById: access.channel.createdById ?? null,
      });
    if (!canPin) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const pin = await store.pinMessage(channelId, messageId, ctx.userId);
    const msg = await store.findMessageByIdWithSender(messageId);
    const sender = await store.findUserById(msg?.senderId ?? message.senderId);
    res.status(201).json({
      channelId: pin.channelId,
      messageId: pin.messageId,
      pinnedById: pin.pinnedById,
      pinnedAt: pin.pinnedAt.toISOString(),
      message: messageToJson(
        msg ?? message,
        msg?.senderName ?? sender?.fullName ?? "Unknown",
        sender?.avatarUrl ?? null,
      ),
    });
  },
);

router.delete(
  "/v1/channels/:id/messages/:messageId/pin",
  requireAuth,
  requirePermission("channels:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const channelId = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const messageId = Number(
      Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId,
    );
    const access = await requireChannelAccess(ctx, channelId);
    if (access.error === "not_found") {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    if (access.error === "forbidden") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await store.unpinMessage(channelId, messageId);
    res.status(204).send();
  },
);

router.get(
  "/v1/channels/:id/files",
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
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 50;
    const beforeRaw = req.query.before;
    const before =
      beforeRaw !== undefined && beforeRaw !== ""
        ? Number(Array.isArray(beforeRaw) ? beforeRaw[0] : beforeRaw)
        : undefined;
    const typeRaw = req.query.type;
    const type = String(Array.isArray(typeRaw) ? typeRaw[0] : typeRaw ?? "").trim() || undefined;

    const files = await store.listChannelFiles(id, {
      limit,
      before: Number.isFinite(before) ? before : undefined,
      type,
    });
    res.json(
      files.map((f) => ({
        messageId: f.messageId,
        type: f.type,
        url: f.url,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
        thumbUrl: f.thumbUrl,
        uploaderId: f.uploaderId,
        uploaderName: f.uploaderName,
        createdAt: f.createdAt.toISOString(),
      })),
    );
  },
);

router.get(
  "/v1/dms",
  requireAuth,
  requirePermission("channels:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const dms = await store.listDmChannelsForUser(ctx.userId);
    const channelIds = dms.map((c) => c.id);
    const meta = await store.listChannelListMeta(channelIds, ctx.userId);
    const teams = await store.listTeams();
    const teamMap = Object.fromEntries(teams.map((t) => [t.id, t.name]));
    const adminAll = hasPermission(ctx, "channels:all");
    const result = await Promise.all(
      dms.map(async (c) => {
        const peer = await dmPeerForChannel(c.id, ctx.userId);
        return channelListItem(c, meta, teamMap, adminAll, peer);
      }),
    );
    res.json(result.filter((c): c is NonNullable<typeof c> => c != null));
  },
);

router.post(
  "/v1/dms/open",
  requireAuth,
  requirePermission("channels:read"),
  async (req, res): Promise<void> => {
    const ctx = getAccessContext(req);
    const targetUserId = Number(req.body?.userId);
    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      res.status(400).json({ error: "Invalid userId" });
      return;
    }
    if (targetUserId === ctx.userId) {
      res.status(400).json({ error: "Cannot open a DM with yourself" });
      return;
    }

    const target = await store.findUserById(targetUserId);
    if (!target || target.status !== "active") {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let channel = await store.findDmChannelBetween(ctx.userId, targetUserId);
    if (!channel) {
      const peerName = target.fullName;
      channel = await store.createChannel({
        name: `dm-${Math.min(ctx.userId, targetUserId)}-${Math.max(ctx.userId, targetUserId)}`,
        description: null,
        teamId: null,
        type: "DM",
        visibility: "PRIVATE",
        createdById: ctx.userId,
      });
      await store.addChannelMember(channel.id, ctx.userId, "owner");
      await store.addChannelMember(channel.id, targetUserId, "member");
      void store
        .createMessage({
          channelId: channel.id,
          senderId: ctx.userId,
          body: `This is the start of your direct message history with ${peerName}.`,
          attachments: null,
          messageKind: "system",
          metadata: { systemEvent: "dm_opened" },
          parentMessageId: null,
          editedAt: null,
          deletedAt: null,
          deletedById: null,
        })
        .catch((e) => console.error("[dm-system]", e));
    }

    const meta = await store.listChannelListMeta([channel.id], ctx.userId);
    const teams = await store.listTeams();
    const teamMap = Object.fromEntries(teams.map((t) => [t.id, t.name]));
    const peer = await dmPeerForChannel(channel.id, ctx.userId);
    const item = channelListItem(
      channel,
      meta,
      teamMap,
      hasPermission(ctx, "channels:all"),
      peer,
    );
    res.json(item);
  },
);

export default router;
