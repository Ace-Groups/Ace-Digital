import { Worker } from "bullmq";
import { getRedisConnectionOptions } from "./redis";
import { MESSAGE_QUEUE_NAME } from "./message-queue";
import { persistMessageJob, type PersistMessageJob } from "./persist-message-job";
import { logger } from "./logger";

export type { PersistMessageJob };

let worker: Worker<PersistMessageJob> | null = null;

export function startMessageWorker(): Worker<PersistMessageJob> | null {
  if (!process.env.REDIS_URL?.trim()) {
    logger.info("REDIS_URL unset — chat messages persist inline");
    return null;
  }
  if (worker) return worker;

  worker = new Worker<PersistMessageJob>(
    MESSAGE_QUEUE_NAME,
    async (job) => {
      await persistMessageJob(job.data);
    },
    { connection: getRedisConnectionOptions(), concurrency: 5 },
  );

  worker.on("failed", (job, err) => {
    logger.error({ err, jobId: job?.id, clientId: job?.data.clientId }, "Message worker failed");
  });

  return worker;
}

export async function stopMessageWorker(): Promise<void> {
  if (!worker) return;
  const current = worker;
  worker = null;
  await current.close();
}
