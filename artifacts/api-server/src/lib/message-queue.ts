import { Queue } from "bullmq";
import { getRedisConnectionOptions } from "./redis";

export const MESSAGE_QUEUE_NAME = "messageQueue";

export const messageQueue = new Queue(MESSAGE_QUEUE_NAME, {
  connection: getRedisConnectionOptions(),
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 5000,
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  },
});

export async function closeMessageQueue(): Promise<void> {
  await messageQueue.close();
}
