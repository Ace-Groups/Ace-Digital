import { createServer } from "node:http";
import { warmupFirestoreChatMirror } from "@workspace/db";
import app from "./app";
import { logger } from "./lib/logger";
import { closeMessageQueue } from "./lib/message-queue";
import { startMessageWorker, stopMessageWorker } from "./lib/message-worker";
import { closeRedis, getRedisConnection } from "./lib/redis";
import { closeSocketServer, initSocketServer } from "./lib/socket-server";
import { startCleanupScheduler } from "./lib/cleanup";

warmupFirestoreChatMirror();

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

const httpServer = createServer(app);
initSocketServer(httpServer);
startMessageWorker();
startCleanupScheduler();

void getRedisConnection()
  .connect()
  .catch((err) => {
    logger.warn(
      { err },
      "Redis not reachable — message queue disabled until reconnect",
    );
  });

httpServer.listen(port, () => {
  logger.info({ port }, "HTTP + WebSocket server listening");
});

httpServer.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down");
  await closeSocketServer();
  await stopMessageWorker();
  await closeMessageQueue();
  await closeRedis();
  httpServer.close(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
