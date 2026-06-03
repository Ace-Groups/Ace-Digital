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
  const customClaims: Record<string, string> = {
    userId: String(userId),
    role: claims.role,
  };
  if (claims.teamId != null) {
    customClaims.teamId = String(claims.teamId);
  }
  return getAuth().createCustomToken(String(userId), customClaims);
}
