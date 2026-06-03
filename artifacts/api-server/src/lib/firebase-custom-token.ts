import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function ensureAdminApp() {
  if (!getApps().length) initializeApp();
}

export async function createFirebaseCustomToken(
  userId: number,
  claims: { role: string; teamId: number | null },
): Promise<string> {
  ensureAdminApp();
  return getAuth().createCustomToken(String(userId), {
    userId: String(userId),
    role: claims.role,
    teamId: claims.teamId != null ? String(claims.teamId) : null,
  });
}
