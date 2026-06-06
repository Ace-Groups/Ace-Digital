import type { RedisOptions } from "ioredis";
import Redis from "ioredis";
import { logger } from "./logger";

const DEFAULT_REDIS_URL = "redis://127.0.0.1:6379";

let connection: Redis | null = null;

export function getRedisUrl(): string {
  return process.env.REDIS_URL?.trim() || DEFAULT_REDIS_URL;
}

export function getRedisConnectionOptions(): RedisOptions {
  const url = new URL(getRedisUrl());
  const db =
    url.pathname.length > 1 && url.pathname !== "/"
      ? Number(url.pathname.slice(1))
      : 0;

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : url.protocol === "rediss:" ? 6380 : 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    db: Number.isFinite(db) ? db : 0,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
    lazyConnect: true,
  };
}

export function getRedisConnection(): Redis {
  if (!connection) {
    connection = new Redis(getRedisConnectionOptions());
    connection.on("error", (err) => {
      logger.warn({ err }, "Redis connection error");
    });
  }
  return connection;
}

export async function closeRedis(): Promise<void> {
  if (!connection) return;
  const current = connection;
  connection = null;
  await current.quit();
}
