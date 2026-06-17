import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { canPostInChannel } from "@workspace/rbac";
import { verifyToken, type AuthPayload } from "./auth";
import { getAllowedOrigins } from "./cors";
import { logger } from "./logger";
import {
  resolveChannelAccess,
  socketAccessContext,
  tempMessageIdFromClientId,
} from "./channel-access";
import { messageQueue } from "./message-queue";
import { validateMessagePayload, messagePreview, messageToJson } from "./message-attachments";
import { store } from "@workspace/db";
import { getRedisConnection } from "./redis";
import { triggerAceBot } from "./acebot";
import { extractMentionedUserIds } from "./chat-mentions";
import { notifyChannelMembers } from "./chat-notify";

declare module "socket.io" {
  interface SocketData {
    user: AuthPayload;
    senderName?: string | null;
    senderAvatar?: string | null;
    postChannelIds?: Set<number>;
    activeNoteRooms?: Set<number>;
  }
}

let io: Server | null = null;

function extractToken(
  auth: Record<string, unknown> | undefined,
  authorization: string | undefined,
): string | null {
  const fromAuth = auth?.token;
  if (typeof fromAuth === "string" && fromAuth.length > 0) {
    return fromAuth;
  }
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7);
  }
  return null;
}

type MessageSendPayload = {
  channelId: number;
  clientId: string;
  body?: string;
  attachments?: unknown;
  messageKind?: string;
  metadata?: Record<string, unknown>;
  parentMessageId?: number | null;
};

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
    },
    path: "/socket.io",
  });

  io.use((socket, next) => {
    const token = extractToken(
      socket.handshake.auth as Record<string, unknown> | undefined,
      socket.handshake.headers.authorization,
    );
    if (!token) {
      next(new Error("Unauthorized"));
      return;
    }
    try {
      socket.data.user = verifyToken(token);
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const { userId } = socket.data.user;
    const sender = await store.findUserById(userId);
    socket.data.senderName = sender?.fullName ?? null;
    socket.data.senderAvatar = sender?.avatarUrl ?? null;
    socket.data.postChannelIds = new Set();
    socket.data.activeNoteRooms = new Set();
    logger.info({ userId, socketId: socket.id }, "Socket connected");
    await socket.join(`user_${userId}`);

    void (async () => {
      try {
        const ctx = socketAccessContext(socket.data.user);
        const channelIds = await store.listChannelIdsForUser(userId);
        await Promise.all(channelIds.map((id) => socket.join(`channel_${id}`)));
        for (const channelId of channelIds) {
          const access = await resolveChannelAccess(ctx, channelId);
          if (
            !access.error &&
            canPostInChannel(ctx, access.channel, access.membership)
          ) {
            socket.data.postChannelIds?.add(channelId);
          }
        }
      } catch (err) {
        logger.warn({ err, userId }, "socket auto-join channels failed");
      }
    })();

    socket.on("join_channel", async (rawChannelId: unknown, ack?: (res: unknown) => void) => {
      const channelId = Number(rawChannelId);
      if (!Number.isFinite(channelId) || channelId <= 0) {
        ack?.({ error: "invalid_channel" });
        return;
      }
      const ctx = socketAccessContext(socket.data.user);
      const access = await resolveChannelAccess(ctx, channelId);
      if (access.error) {
        ack?.({ error: access.error });
        return;
      }
      if (canPostInChannel(ctx, access.channel, access.membership)) {
        socket.data.postChannelIds?.add(channelId);
      }
      await socket.join(`channel_${channelId}`);
      ack?.({ ok: true });
    });

    socket.on("leave_channel", async (rawChannelId: unknown) => {
      const channelId = Number(rawChannelId);
      if (Number.isFinite(channelId) && channelId > 0) {
        await socket.leave(`channel_${channelId}`);
      }
    });

    socket.on("message:send", async (raw: MessageSendPayload, ack?: (res: unknown) => void) => {
      try {
        const channelId = Number(raw?.channelId);
        const clientId = typeof raw?.clientId === "string" ? raw.clientId.trim() : "";
        if (!Number.isFinite(channelId) || channelId <= 0 || !clientId) {
          ack?.({ status: "error", error: "Invalid payload" });
          return;
        }

        if (!socket.rooms.has(`channel_${channelId}`)) {
          ack?.({ status: "error", error: "Join channel before sending" });
          return;
        }
        if (!socket.data.postChannelIds?.has(channelId)) {
          ack?.({ status: "error", error: "You cannot post in this channel" });
          return;
        }

        const channel = await store.findChannelById(channelId);
        if (channel?.type === "DM") {
          const members = await store.listChannelMembers(channelId);
          const peer = members.find((m) => m.userId !== userId);
          if (peer?.isUnavailable) {
            ack?.({ status: "error", error: "This person is no longer available" });
            return;
          }
        }

        let payload: ReturnType<typeof validateMessagePayload>;
        try {
          payload = validateMessagePayload(
            raw.body,
            raw.attachments,
            raw.messageKind,
            raw.metadata,
          );
        } catch (err) {
          ack?.({
            status: "error",
            error: err instanceof Error ? err.message : "Invalid message",
          });
          return;
        }

        const parentMessageId =
          raw.parentMessageId != null && Number.isFinite(Number(raw.parentMessageId))
            ? Number(raw.parentMessageId)
            : null;

        const ctx = socketAccessContext(socket.data.user);
        const tempId = tempMessageIdFromClientId(clientId);
        const now = new Date().toISOString();
        const optimistic = {
          id: tempId,
          clientId,
          channelId,
          senderId: ctx.userId,
          senderName: socket.data.senderName ?? "Former teammate",
          senderAvatar: socket.data.senderAvatar ?? null,
          body: payload.body,
          attachments: payload.attachments,
          messageKind: payload.messageKind,
          metadata: payload.metadata,
          parentMessageId: parentMessageId ?? undefined,
          createdAt: now,
        };

        const { broadcastMessageNew } = await import("./chat-socket-broadcast");
        broadcastMessageNew(channelId, optimistic, { exceptSocketId: socket.id });
        ack?.({ status: "success", clientId, message: optimistic });

        const persistDirectly = async () => {
          try {
            const message = await store.createMessage({
              channelId,
              senderId: ctx.userId,
              body: payload.body,
              attachments: payload.attachments ?? null,
              messageKind: payload.messageKind,
              metadata: payload.metadata ?? null,
              parentMessageId,
              editedAt: null,
              deletedAt: null,
              deletedById: null,
              senderName: socket.data.senderName ?? null,
              senderAvatar: socket.data.senderAvatar ?? null,
            });
            const persisted = messageToJson(
              message,
              socket.data.senderName ?? "Former teammate",
              socket.data.senderAvatar ?? null,
            );
            const { broadcastMessagePersisted } = await import("./chat-socket-broadcast");
            broadcastMessagePersisted(channelId, {
              clientId,
              message: persisted,
            });

            // Perform notifications and bot triggers in background
            setImmediate(async () => {
              try {
                if (payload.body.includes("@AceBot")) {
                  await triggerAceBot(channelId, message.id, payload.body, ctx.userId);
                }
                const members = await store.listChannelMembers(channelId);
                const mentioned = extractMentionedUserIds(payload.body, members);
                const preview = messagePreview(message.body, message.attachments, message.messageKind);
                if (mentioned.length > 0) {
                  await notifyChannelMembers(
                    channelId,
                    ctx.userId,
                    channel?.name ?? "channel",
                    `@${socket.data.senderName ?? "Someone"} mentioned you: ${preview}`,
                    mentioned,
                  );
                } else {
                  await notifyChannelMembers(channelId, ctx.userId, channel?.name ?? "channel", preview);
                }
                await store.markChannelRead(channelId, ctx.userId);
              } catch (bgErr) {
                logger.error({ err: bgErr }, "Failed direct persist background notifications");
              }
            });
          } catch (err) {
            logger.error({ err, userId: ctx.userId }, "Failed to directly persist message");
          }
        };

        const redis = getRedisConnection();
        if (redis.status === "ready") {
          messageQueue.add("persist", {
            channelId,
            senderId: ctx.userId,
            clientId,
            body: payload.body,
            attachments: payload.attachments ?? null,
            messageKind: payload.messageKind,
            metadata: payload.metadata,
            parentMessageId,
            senderName: socket.data.senderName ?? null,
            senderAvatar: socket.data.senderAvatar ?? null,
          }).catch((err) => {
            logger.warn({ err }, "Redis persist job fail, falling back to direct persistence");
            void persistDirectly();
          });
        } else {
          logger.info("Redis connection is not ready, persisting message directly");
          void persistDirectly();
        }
      } catch (err) {
        logger.error({ err, userId }, "message:send failed");
        ack?.({ status: "error", error: "Failed to send message" });
      }
    });

    socket.on("join_note", async (rawNoteId: unknown, ack?: (res: unknown) => void) => {
      try {
        const noteId = Number(rawNoteId);
        if (!Number.isFinite(noteId) || noteId <= 0) {
          ack?.({ error: "invalid_note" });
          return;
        }
        const note = await store.findNoteById(noteId);
        if (!note) {
          ack?.({ error: "not_found" });
          return;
        }
        const { userId } = socket.data.user;
        const user = await store.findUserById(userId);
        const hasAccess =
          note.createdById === userId ||
          note.sharedUserIds?.includes(userId) ||
          (note.teamId != null && user?.teamId === note.teamId);

        if (!hasAccess) {
          ack?.({ error: "forbidden" });
          return;
        }

        await socket.join(`note_${noteId}`);
        socket.data.activeNoteRooms?.add(noteId);
        ack?.({ ok: true });
        await broadcastNoteUsers(noteId);
      } catch (err) {
        logger.error({ err, noteId: rawNoteId }, "join_note failed");
        ack?.({ error: "server_error" });
      }
    });

    socket.on("leave_note", async (rawNoteId: unknown) => {
      const noteId = Number(rawNoteId);
      if (Number.isFinite(noteId) && noteId > 0) {
        await socket.leave(`note_${noteId}`);
        socket.data.activeNoteRooms?.delete(noteId);
        await broadcastNoteUsers(noteId);
      }
    });

    socket.on("note:title_edit", (payload: { noteId: number; title: string }) => {
      const noteId = Number(payload?.noteId);
      if (!Number.isFinite(noteId) || noteId <= 0) return;
      if (!socket.rooms.has(`note_${noteId}`)) return;

      socket.to(`note_${noteId}`).emit("note:title_edited", {
        noteId,
        title: payload.title,
        senderId: socket.data.user.userId,
      });
    });

    socket.on("disconnect", async (reason) => {
      logger.info({ userId, socketId: socket.id, reason }, "Socket disconnected");
      const rooms = socket.data.activeNoteRooms;
      if (rooms) {
        for (const noteId of Array.from(rooms)) {
          await broadcastNoteUsers(noteId as number);
        }
      }
    });
  });

  return io;
}

async function broadcastNoteUsers(noteId: number) {
  if (!io) return;
  const roomName = `note_${noteId}`;
  try {
    const clients = await io.in(roomName).fetchSockets();
    const users = clients.map((c) => ({
      userId: c.data.user.userId,
      fullName: c.data.senderName ?? "Former teammate",
      avatarUrl: c.data.senderAvatar ?? null,
    }));
    const uniqueUsers = Array.from(
      new Map(users.map((u) => [u.userId, u])).values()
    );
    io.to(roomName).emit("note:users", { noteId, users: uniqueUsers });
  } catch (err) {
    logger.error({ err, noteId }, "broadcastNoteUsers failed");
  }
}

export function getIo(): Server | null {
  return io;
}

export async function closeSocketServer(): Promise<void> {
  if (!io) return;
  const current = io;
  io = null;
  await current.close();
}
