import * as functions from "firebase-functions/v1";
import { initializeApp } from "firebase-admin/app";
import type { Express } from "express";

initializeApp();

process.env.USE_FIRESTORE = "true";
process.env.JWT_SECRET =
  functions.config().app?.jwt_secret ?? process.env.JWT_SECRET ?? "ace-digital-os-jwt-secret";

let cachedApp: Express | null = null;

async function getApp(): Promise<Express> {
  if (!cachedApp) {
    // @ts-expect-error — api-app.mjs is the predeploy-bundled Express app
    const mod = (await import("../api-app.mjs")) as { default: Express };
    cachedApp = mod.default;
  }
  return cachedApp;
}

/** Gen 1 HTTPS function — compatible with Firebase Spark (free) tier */
export const api = functions
  .region("asia-south1")
  .runWith({
    memory: "512MB",
    timeoutSeconds: 60,
    maxInstances: 10,
    // Project default compute SA was deleted; use App Engine default (always present on Firebase).
    serviceAccount: "ace-digital-os@appspot.gserviceaccount.com",
  })
  .https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
    const app = await getApp();
    return app(req, res);
  });
