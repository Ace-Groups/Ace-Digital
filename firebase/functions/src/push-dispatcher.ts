import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { buildPushData, type PushPayload } from "./deep-links";

export type PushTokenPlatform = "web" | "expo" | "ios" | "android";

export type StoredPushToken = {
  platform: PushTokenPlatform;
  token: string;
  userId: number;
  updatedAt: string;
  deviceLabel?: string | null;
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

function isExpoToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

function userTokensCollection(userId: number) {
  return getFirestore().collection("users").doc(String(userId)).collection("user_tokens");
}

/** Load registered push tokens for a user from Firestore. */
export async function listPushTokensForUser(userId: number): Promise<StoredPushToken[]> {
  const snap = await userTokensCollection(userId).get();
  return snap.docs.map((doc) => doc.data() as StoredPushToken);
}

/** Upsert a device push token under users/{userId}/user_tokens/{tokenId}. */
export async function upsertPushToken(input: {
  userId: number;
  platform: PushTokenPlatform;
  token: string;
  deviceLabel?: string | null;
}): Promise<void> {
  const tokenId = Buffer.from(input.token).toString("base64url").slice(0, 128);
  await userTokensCollection(input.userId).doc(tokenId).set({
    userId: input.userId,
    platform: input.platform,
    token: input.token,
    deviceLabel: input.deviceLabel ?? null,
    updatedAt: new Date().toISOString(),
  });
}

/** Remove a push token document for the authenticated user. */
export async function deletePushToken(userId: number, token: string): Promise<void> {
  const tokenId = Buffer.from(token).toString("base64url").slice(0, 128);
  await userTokensCollection(userId).doc(tokenId).delete();
}

async function sendExpoMessages(
  tokens: string[],
  payload: PushPayload,
): Promise<void> {
  if (tokens.length === 0) return;

  const data = buildPushData(payload);
  const messages = tokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    sound: "default" as const,
    priority: "high" as const,
    data,
  }));

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Expo push failed (${res.status}): ${text}`);
  }
}

async function sendFcmMessages(
  tokens: string[],
  payload: PushPayload,
): Promise<void> {
  if (tokens.length === 0) return;

  const data = buildPushData(payload);
  const url = data.url;

  const messaging = getMessaging();
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data,
    webpush: {
      fcmOptions: { link: url },
      notification: {
        title: payload.title,
        body: payload.body,
      },
    },
    android: {
      priority: "high",
      notification: {
        clickAction: url,
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
        },
      },
    },
  });

  const stale: string[] = [];
  response.responses.forEach((item, index) => {
    if (item.success) return;
    const code = item.error?.code;
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
    ) {
      const bad = tokens[index];
      if (bad) stale.push(bad);
    }
  });

  if (stale.length > 0) {
    console.warn("[push] pruning stale FCM tokens", stale.length);
    await Promise.all(
      stale.map((token) => deletePushToken(payload.userId, token).catch(() => {})),
    );
  }
}

/**
 * Central omnichannel dispatcher — routes to FCM (web/native) and Expo Push API.
 */
export async function dispatchPushNotification(payload: PushPayload): Promise<void> {
  const tokens = await listPushTokensForUser(payload.userId);
  if (tokens.length === 0) {
    console.info("[push] no tokens for user", payload.userId);
    return;
  }

  const fcmTokens: string[] = [];
  const expoTokens: string[] = [];

  for (const entry of tokens) {
    if (entry.platform === "expo" || isExpoToken(entry.token)) {
      expoTokens.push(entry.token);
    } else {
      fcmTokens.push(entry.token);
    }
  }

  await Promise.all([
    sendFcmMessages(fcmTokens, payload),
    sendExpoMessages(expoTokens, payload),
  ]);
}

/** Postgres-mode bridge: write a short-lived outbox doc consumed by the Cloud Function. */
export async function enqueuePushOutbox(payload: PushPayload): Promise<void> {
  await getFirestore().collection("push_outbox").add({
    ...payload,
    createdAt: new Date().toISOString(),
  });
}
