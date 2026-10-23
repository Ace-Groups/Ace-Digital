import app from "./app";
import { logger } from "./lib/logger";
import { startCleanupScheduler } from "./lib/cleanup";

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

startCleanupScheduler();

const redisUrl = process.env.REDIS_URL?.trim();

const httpServer = app.listen(port, "0.0.0.0", () => {
  logger.info({ port, redis: Boolean(redisUrl) }, "HTTP server listening");
  setImmediate(() => {
    void import("@workspace/db")
      .then(({ warmupFirestoreChatMirror }) => {
        warmupFirestoreChatMirror();
      })
      .catch((err) => {
        logger.warn({ err }, "Firestore chat mirror warmup skipped");
      });
  });
});

if (redisUrl) {
  void import("./lib/message-worker")
    .then(({ startMessageWorker }) => {
      startMessageWorker();
    })
    .catch((err) => {
      logger.warn({ err }, "Message worker failed to start");
    });
  void import("./lib/redis")
    .then(({ getRedisConnection }) =>
      getRedisConnection().connect().catch((err) => {
        logger.warn({ err }, "Redis not reachable — message queue disabled until reconnect");
      }),
    )
    .catch((err) => {
      logger.warn({ err }, "Redis client failed to load");
    });
}

httpServer.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down");
  const { stopMessageWorker } = await import("./lib/message-worker");
  const { closeMessageQueue } = await import("./lib/message-queue");
  const { closeRedis } = await import("./lib/redis");
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
