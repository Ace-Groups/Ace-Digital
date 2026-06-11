import { store } from "@workspace/db";
import type { User } from "@workspace/db";
import { eq } from "drizzle-orm";
import { usersTable, getPgDb } from "@workspace/db";
import { fs, useFirestore } from "./firestore-util";

export function normalizeEmployeeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function employeeCodeFromUser(user: User): string {
  return normalizeEmployeeCode(user.employeeCode ?? `ACE${user.id}`);
}

export async function findUserByEmployeeCode(rawCode: string): Promise<User | null> {
  const code = normalizeEmployeeCode(rawCode);
  if (!code) return null;

  if (useFirestore()) {
    const snap = await fs().collection("users").where("employeeCode", "==", code).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    return store.findUserById(Number(doc.id));
  }

  try {
    const { db } = getPgDb();
    const [u] = await db.select().from(usersTable).where(eq(usersTable.employeeCode, code));
    return u ?? null;
  } catch {
    const all = await store.listUsers();
    return all.find((u) => normalizeEmployeeCode(u.employeeCode ?? "") === code) ?? null;
  }
}
