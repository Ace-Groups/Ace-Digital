import * as functions from "firebase-functions/v1";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import type { Express } from "express";
import { dispatchPushNotification } from "./push-dispatcher";

initializeApp();

const jwtSecret = defineSecret("JWT_SECRET");
const resendApiKey = defineSecret("RESEND_API_KEY");
const emailFrom = defineSecret("EMAIL_FROM");

process.env.USE_FIRESTORE = "true";

let cachedApp: Express | null = null;

function applyRuntimeSecrets(): void {
  const secret = jwtSecret.value()?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      "[ace-digital-os] JWT_SECRET is missing or too short (need 32+ chars). " +
        "Run: firebase functions:secrets:set JWT_SECRET --project ace-digital-os",
    );
  }
  process.env.JWT_SECRET = secret;
  process.env.NODE_ENV = "production";

  const resend = resendApiKey.value()?.trim();
  if (resend) process.env.RESEND_API_KEY = resend;

  const from = emailFrom.value()?.trim();
  if (from) process.env.EMAIL_FROM = from;
}

async function getApp(): Promise<Express> {
  if (!cachedApp) {
    applyRuntimeSecrets();
    // @ts-expect-error — api-app.mjs is the predeploy-bundled Express app
    const mod = (await import("../api-app.mjs")) as { default: Express };
    cachedApp = mod.default;
  }
  return cachedApp;
}

type NotificationDoc = {
  userId?: number;
  title?: string;
  body?: string;
  link?: string | null;
};

async function handlePushDispatch(data: NotificationDoc, source: string): Promise<void> {
  const userId = Number(data.userId);
  const title = data.title?.trim();
  const body = data.body?.trim();
  if (!Number.isFinite(userId) || userId <= 0 || !title || !body) {
    console.warn(`[push:${source}] skipping invalid payload`, data);
    return;
  }

  await dispatchPushNotification({
    userId,
    title,
    body,
    link: data.link ?? null,
  });
}

/** Gen 1 HTTPS function — compatible with Firebase Blaze tier */
export const api = functions
  .region("asia-south1")
  .runWith({
    memory: "512MB",
    timeoutSeconds: 60,
    maxInstances: 10,
    secrets: [jwtSecret, resendApiKey, emailFrom],
    serviceAccount: "firebase-adminsdk-fbsvc@ace-digital-os.iam.gserviceaccount.com",
  })
  .https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
    try {
      const app = await getApp();
      return app(req, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error:
          err instanceof Error ? err.message : "Server configuration error",
      });
    }
  });

/**
 * Firestore-mode: dispatch push when an in-app notification row is created.
 */
export const onNotificationCreated = functions
  .region("asia-south1")
  .firestore.document("notifications/{notificationId}")
  .onCreate(async (snap) => {
    try {
      await handlePushDispatch(snap.data() as NotificationDoc, "notifications");
    } catch (err) {
      console.error("[push:notifications] dispatch failed", err);
    }
  });

/**
 * Postgres-mode bridge: API writes push_outbox docs after createNotification.
 */
export const onPushOutboxCreated = functions
  .region("asia-south1")
  .firestore.document("push_outbox/{outboxId}")
  .onCreate(async (snap) => {
    try {
      await handlePushDispatch(snap.data() as NotificationDoc, "push_outbox");
      await snap.ref.delete();
    } catch (err) {
      console.error("[push:push_outbox] dispatch failed", err);
    }
  });
