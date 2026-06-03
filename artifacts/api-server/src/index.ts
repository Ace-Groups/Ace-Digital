import http from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import { registerInlineRealtimeDispatch } from "./lib/realtime-publish";
import {
  attachWebSocketServer,
  createChannelSubscribeChecker,
  createDefaultHubOptions,
  createHub,
  setGlobalHub,
} from "@workspace/realtime-hub";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const hub = createHub(createDefaultHubOptions(createChannelSubscribeChecker()));
setGlobalHub(hub);
registerInlineRealtimeDispatch((event) => hub.dispatch(event));

const server = http.createServer(app);
attachWebSocketServer(server, hub);

server.listen(port, () => {
  logger.info({ port }, "Server listening (HTTP + WebSocket /ws)");
});

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
