import { createFirestoreStore } from "./firestore";
import { createPostgresStore } from "./postgres";

function useFirestore(): boolean {
  if (process.env.USE_FIRESTORE === "true") return true;
  if (process.env.FIRESTORE_EMULATOR_HOST) return true;
  if (process.env.FUNCTIONS_EMULATOR === "true") return true;
  // Cloud Functions / Firebase runtime without Postgres URL
  if (process.env.GCLOUD_PROJECT && !process.env.DATABASE_URL) return true;
  return false;
}

export type DataStore = ReturnType<typeof createFirestoreStore>;

export const store: DataStore = useFirestore()
  ? createFirestoreStore()
  : (createPostgresStore() as unknown as DataStore);

export { useFirestore };
