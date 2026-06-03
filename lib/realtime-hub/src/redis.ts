import { REDIS_REALTIME_CHANNEL } from "@workspace/realtime-protocol";
import type { RealtimeHub } from "./hub.js";

/** Long-lived subscriber for the realtime server process. */
export async function startRedisSubscriber(hub: RealtimeHub): Promise<() => Promise<void>> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    return async () => {};
  }

  const { createClient } = await import("redis");
  const subscriber = createClient({ url });
  await subscriber.connect();
  await subscriber.subscribe(REDIS_REALTIME_CHANNEL, (message) => {
    hub.dispatchRaw(message);
  });

  return async () => {
    await subscriber.quit();
  };
}
