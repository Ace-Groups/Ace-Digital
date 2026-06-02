import * as functions from "firebase-functions/v1";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import type { Express } from "express";

initializeApp();

const jwtSecret = defineSecret("JWT_SECRET");

process.env.USE_FIRESTORE = "true";

let cachedApp: Express | null = null;

function applyJwtSecret(): void {
  const secret = jwtSecret.value()?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      "[ace-digital-os] JWT_SECRET is missing or too short (need 32+ chars). " +
        "Run: firebase functions:secrets:set JWT_SECRET --project ace-digital-os",
    );
  }
  process.env.JWT_SECRET = secret;
  process.env.NODE_ENV = "production";
}

async function getApp(): Promise<Express> {
  if (!cachedApp) {
    applyJwtSecret();
    // @ts-expect-error — api-app.mjs is the predeploy-bundled Express app
    const mod = (await import("../api-app.mjs")) as { default: Express };
    cachedApp = mod.default;
  }
  return cachedApp;
}

/** Gen 1 HTTPS function — compatible with Firebase Blaze tier */
export const api = functions
  .region("asia-south1")
  .runWith({
    memory: "512MB",
    timeoutSeconds: 60,
    maxInstances: 10,
    secrets: [jwtSecret],
    serviceAccount: "ace-digital-os@appspot.gserviceaccount.com",
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
