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
import { validateMessagePayload } from "./message-attachments";
import { store } from "@workspace/db";

declare module "socket.io" {
  interface SocketData {
    user: AuthPayload;
    senderName?: string | null;
    senderAvatar?: string | null;
    postChannelIds?: Set<number>;
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
    logger.info({ userId, socketId: socket.id }, "Socket connected");

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

    socket.on("message:send", (raw: MessageSendPayload, ack?: (res: unknown) => void) => {
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
          senderName: socket.data.senderName ?? "Unknown",
          senderAvatar: socket.data.senderAvatar ?? null,
          body: payload.body,
          attachments: payload.attachments,
          messageKind: payload.messageKind,
          metadata: payload.metadata,
          parentMessageId: parentMessageId ?? undefined,
          createdAt: now,
        };

        socket.to(`channel_${channelId}`).emit("message:new", optimistic);
        ack?.({ status: "success", clientId, message: optimistic });

        void messageQueue.add("persist", {
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
        });
      } catch (err) {
        logger.error({ err, userId }, "message:send failed");
        ack?.({ status: "error", error: "Failed to send message" });
      }
    });

    socket.on("disconnect", (reason) => {
      logger.info({ userId, socketId: socket.id, reason }, "Socket disconnected");
    });
  });

  return io;
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
