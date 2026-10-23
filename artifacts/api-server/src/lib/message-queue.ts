import type { PersistMessageJob } from "./persist-message-job";

export const MESSAGE_QUEUE_NAME = "messageQueue";

type BullQueue = {
  add(name: string, data: PersistMessageJob): Promise<unknown>;
  close(): Promise<void>;
};

let queue: BullQueue | null = null;

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

async function getMessageQueue(): Promise<BullQueue | null> {
  if (!isRedisConfigured()) return null;
  if (queue) return queue;

  const { Queue } = await import("bullmq");
  const { getRedisConnectionOptions } = await import("./redis");
  queue = new Queue(MESSAGE_QUEUE_NAME, {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    },
  });
  return queue;
}

/**
 * Persist a chat message. With REDIS_URL, enqueue BullMQ.
 * Without it (Cloud Run scale-to-zero), write inline so Memorystore is not required.
 */
export async function enqueuePersistMessage(data: PersistMessageJob): Promise<void> {
  const q = await getMessageQueue();
  if (q) {
    await q.add("persist", data);
    return;
  }
  const { persistMessageJob } = await import("./persist-message-job");
  await persistMessageJob(data);
}

export async function closeMessageQueue(): Promise<void> {
  if (!queue) return;
  const current = queue;
  queue = null;
  await current.close();
}
