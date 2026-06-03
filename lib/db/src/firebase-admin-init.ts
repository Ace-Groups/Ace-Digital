import { cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";

/**
 * Firebase Admin on Cloud Functions uses default credentials.
 * On Render/other hosts, set FIREBASE_SERVICE_ACCOUNT_JSON to the service account JSON string.
 */
export function ensureFirebaseAdminApp(): App {
  if (getApps().length) return getApps()[0]!;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const projectId =
    process.env.GCLOUD_PROJECT ??
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT;

  if (json) {
    const serviceAccount = JSON.parse(json) as ServiceAccount;
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: projectId ?? serviceAccount.projectId,
    });
  }

  if (projectId) {
    return initializeApp({ projectId });
  }

  return initializeApp();
}
