import { ensureFirebaseAdminApp } from "@workspace/db";
import { getFirestore } from "firebase-admin/firestore";
import { isPushInfrastructureAvailable } from "./push-tokens";

export type PushDispatchPayload = {
  userId: number;
  title: string;
  body: string;
  link?: string | null;
};

/**
 * Enqueues omnichannel push for Postgres-mode APIs.
 * The `onPushOutboxCreated` Cloud Function dispatches to FCM / Expo.
 */
export async function enqueuePushDispatch(payload: PushDispatchPayload): Promise<void> {
  if (!isPushInfrastructureAvailable()) return;

  try {
    ensureFirebaseAdminApp();
    await getFirestore().collection("push_outbox").add({
      ...payload,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[push-dispatch] failed to enqueue", err);
  }
}
