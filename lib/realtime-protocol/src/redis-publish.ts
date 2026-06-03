import { REDIS_REALTIME_CHANNEL } from "./schemas.js";
import type { PublishedEvent } from "./schemas.js";
import { serializeEvent } from "./schemas.js";

export async function publishToRedis(event: PublishedEvent): Promise<void> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return;

  const { createClient } = await import("redis");
  const client = createClient({ url });
  if (!client.isOpen) await client.connect();
  try {
    await client.publish(REDIS_REALTIME_CHANNEL, serializeEvent(event));
  } finally {
    await client.quit();
  }
}
