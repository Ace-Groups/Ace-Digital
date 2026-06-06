import { io, type Socket } from "socket.io-client";
import { getAuthToken } from "@/lib/api";

const SOCKET_PATH = "/socket.io";

function resolveSocketUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL?.trim();
  if (base) return base.replace(/\/+$/, "");
  return window.location.origin;
}

export function createChatSocket(token: string): Socket {
  return io(resolveSocketUrl(), {
    path: SOCKET_PATH,
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 15000,
  });
}

export function getSocketUrlForDebug(): string {
  return resolveSocketUrl();
}
