import { io, type Socket } from "socket.io-client";
import { getAuthToken } from "@/lib/api";
import { resolveSocketUrl } from "@/lib/api-config";

const SOCKET_PATH = "/socket.io";

export function createChatSocket(token: string): Socket {
  return io(resolveSocketUrl(), {
    path: SOCKET_PATH,
    auth: { token },
    // Polling first so the handshake still works while Cloud Run is cold-starting.
    transports: ["polling", "websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });
}

export function getSocketUrlForDebug(): string {
  return resolveSocketUrl();
}

