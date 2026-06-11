import { store } from "@workspace/db";
import type { User } from "@workspace/db";
import { eq } from "drizzle-orm";
import { usersTable, getPgDb } from "@workspace/db";
import { fs, useFirestore } from "./firestore-util";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyName(fullName: string): string {
  return fullName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function isValidVerifySlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length >= 2 && slug.length <= 64;
}

export async function findUserByVerifySlug(slug: string): Promise<User | null> {
  if (useFirestore()) {
    const snap = await fs().collection("users").where("verifySlug", "==", slug).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    return store.findUserById(Number(doc.id));
  }
  try {
    const { db } = getPgDb();
    const [u] = await db.select().from(usersTable).where(eq(usersTable.verifySlug, slug));
    return u ?? null;
  } catch {
    const all = await store.listUsers();
    return all.find((u) => u.verifySlug === slug) ?? null;
  }
}

export async function isVerifySlugTaken(slug: string, excludeUserId?: number): Promise<boolean> {
  const user = await findUserByVerifySlug(slug);
  if (!user) return false;
  if (excludeUserId != null && user.id === excludeUserId) return false;
  return true;
}

export async function generateUniqueVerifySlug(fullName: string, excludeUserId?: number): Promise<string> {
  const base = slugifyName(fullName) || "employee";
  let candidate = base;
  let n = 2;
  while (await isVerifySlugTaken(candidate, excludeUserId)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

export async function ensureUserVerifySlug(user: User): Promise<string> {
  if (user.verifySlug && isValidVerifySlug(user.verifySlug)) {
    return user.verifySlug;
  }
  const slug = await generateUniqueVerifySlug(user.fullName, user.id);
  await store.updateUser(user.id, { verifySlug: slug, verifySlugEnabled: true });
  return slug;
}
