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
    let serviceAccount: ServiceAccount;
    try {
      serviceAccount = JSON.parse(json) as ServiceAccount;
    } catch (err) {
      try {
        // If dotenv or the environment expanded "\n" to raw newlines,
        // sanitize raw LFs/CRs inside double-quoted strings.
        let insideQuotes = false;
        let escaped = false;
        let sanitized = "";
        for (let i = 0; i < json.length; i++) {
          const char = json[i];
          if (char === '"' && !escaped) {
            insideQuotes = !insideQuotes;
            sanitized += char;
          } else if (char === '\\' && !escaped) {
            escaped = true;
            sanitized += char;
          } else {
            if (escaped) {
              escaped = false;
            }
            if (char === '\n' && insideQuotes) {
              sanitized += "\\n";
            } else if (char === '\r' && insideQuotes) {
              sanitized += "\\r";
            } else {
              sanitized += char;
            }
          }
        }
        serviceAccount = JSON.parse(sanitized) as ServiceAccount;
      } catch (innerErr) {
        throw new Error(
          `Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: ${(err as Error).message}`,
        );
      }
    }
    const resolvedProjectId = projectId ?? serviceAccount.projectId;
    const storageBucket =
      process.env.FIREBASE_STORAGE_BUCKET?.trim() ??
      (resolvedProjectId ? `${resolvedProjectId}.firebasestorage.app` : undefined);
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: resolvedProjectId,
      storageBucket,
      databaseURL:
        process.env.FIREBASE_DATABASE_URL?.trim() ??
        (resolvedProjectId
          ? `https://${resolvedProjectId}-default-rtdb.asia-southeast1.firebasedatabase.app`
          : undefined),
    });
  }

  if (projectId) {
    return initializeApp({
      projectId,
      databaseURL:
        process.env.FIREBASE_DATABASE_URL?.trim() ??
        `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`,
    });
  }

  return initializeApp();
}
