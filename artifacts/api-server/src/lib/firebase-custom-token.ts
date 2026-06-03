import { ensureFirebaseAdminApp } from "@workspace/db";
import { getAuth } from "firebase-admin/auth";

export async function createFirebaseCustomToken(
  userId: number,
  claims: { role: string; teamId: number | null },
): Promise<string> {
  ensureFirebaseAdminApp();
  const customClaims: Record<string, string> = {
    userId: String(userId),
    role: claims.role,
  };
  if (claims.teamId != null) {
    customClaims.teamId = String(claims.teamId);
  }
  return getAuth().createCustomToken(String(userId), customClaims);
}
