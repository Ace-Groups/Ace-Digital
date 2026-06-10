import { store, useFirestore } from "@workspace/db";
import type { Notification } from "@workspace/db";

type CreateNotificationInput = {
  userId: number;
  title: string;
  body: string;
  link?: string | null;
};
import { enqueuePushDispatch } from "./push-dispatch";

/**
 * Creates an in-app notification and triggers omnichannel push dispatch.
 * Firestore mode: push is handled by the `onNotificationCreated` Cloud Function.
 * Postgres mode: writes a `push_outbox` doc for `onPushOutboxCreated`.
 */
export async function createNotificationWithPush(
  data: CreateNotificationInput,
): Promise<Notification> {
  const notification = await store.createNotification(data);

  if (!useFirestore()) {
    await enqueuePushDispatch({
      userId: data.userId,
      title: data.title,
      body: data.body,
      link: data.link ?? null,
    });
  }

  return notification;
}
