import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";
import { type RealtimeHub } from "./hub.js";

const WS_PATH = "/ws";

export function attachWebSocketServer(server: HttpServer, hub: RealtimeHub): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = request.url ?? "";
    const path = url.split("?")[0];
    if (path !== WS_PATH) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
      hub.addClient(ws);
    });
  });

  return wss;
}

export const realtimeWsPath = WS_PATH;
