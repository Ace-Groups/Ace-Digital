import { getIo } from "./socket-server";

/** Push an optimistic or persisted message to everyone subscribed to a channel room. */
export function broadcastMessageNew(
  channelId: number,
  message: Record<string, unknown>,
  options?: { exceptSocketId?: string },
): void {
  const io = getIo();
  if (!io) return;
  const room = `channel_${channelId}`;
  if (options?.exceptSocketId) {
    io.to(room).except(options.exceptSocketId).emit("message:new", message);
  } else {
    io.to(room).emit("message:new", message);
  }
}

export function broadcastMessagePersisted(
  channelId: number,
  payload: { clientId: string; message: Record<string, unknown> },
): void {
  getIo()?.to(`channel_${channelId}`).emit("message:persisted", payload);
}
