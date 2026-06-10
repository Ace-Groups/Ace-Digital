import { ensureFirebaseAdminApp } from "@workspace/db";
import { getFirestore } from "firebase-admin/firestore";

export type PushTokenPlatform = "web" | "expo" | "ios" | "android";

function tokensRef(userId: number) {
  ensureFirebaseAdminApp();
  return getFirestore().collection("users").doc(String(userId)).collection("user_tokens");
}

function tokenDocId(token: string): string {
  return Buffer.from(token).toString("base64url").slice(0, 128);
}

export function isPushInfrastructureAvailable(): boolean {
  const project =
    process.env.GCLOUD_PROJECT ??
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT;
  return Boolean(project?.trim() || process.env.FIRESTORE_EMULATOR_HOST);
}

export async function upsertUserPushToken(input: {
  userId: number;
  platform: PushTokenPlatform;
  token: string;
  deviceLabel?: string | null;
}): Promise<void> {
  if (!isPushInfrastructureAvailable()) return;

  await tokensRef(input.userId).doc(tokenDocId(input.token)).set({
    userId: input.userId,
    platform: input.platform,
    token: input.token,
    deviceLabel: input.deviceLabel ?? null,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteUserPushToken(userId: number, token: string): Promise<void> {
  if (!isPushInfrastructureAvailable()) return;
  await tokensRef(userId).doc(tokenDocId(token)).delete();
}
