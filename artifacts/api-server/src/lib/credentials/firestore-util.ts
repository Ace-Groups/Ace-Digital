import { ensureFirebaseAdminApp } from "@workspace/db";
import { getFirestore } from "firebase-admin/firestore";

export function useFirestore(): boolean {
  return process.env.USE_FIRESTORE === "true";
}

export function fs() {
  return getFirestore(ensureFirebaseAdminApp());
}
