import { getRedisConnection } from "../redis";
import { logger } from "../logger";

const DEFAULT_LIMIT = 60;
const WINDOW_SEC = 3600;

function getLimit(): number {
  const n = Number(process.env.AI_RATE_LIMIT_PER_USER_PER_HOUR);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_LIMIT;
}

const memoryCounts = new Map<string, { count: number; resetAt: number }>();

async function checkRedis(userId: number): Promise<{ allowed: boolean; remaining: number }> {
  const limit = getLimit();
  const key = `ai:rate:${userId}`;
  try {
    const redis = getRedisConnection();
    if (redis.status !== "ready") {
      await redis.connect();
    }
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, WINDOW_SEC);
    }
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (err) {
    logger.warn({ err }, "AI rate limit Redis unavailable, using memory");
    return checkMemory(userId);
  }
}

function checkMemory(userId: number): { allowed: boolean; remaining: number } {
  const limit = getLimit();
  const now = Date.now();
  const key = String(userId);
  let entry = memoryCounts.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_SEC * 1000 };
    memoryCounts.set(key, entry);
  }
  entry.count += 1;
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}

export async function checkAiRateLimit(
  userId: number,
): Promise<{ allowed: boolean; remaining: number }> {
  if (process.env.REDIS_URL?.trim()) {
    return checkRedis(userId);
  }
  return checkMemory(userId);
}
