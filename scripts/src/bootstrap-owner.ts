/**
 * Creates the owner on an empty Firestore project without deleting data.
 *
 * Writes teams/1 (Operations) if it is missing, upserts the owner by email,
 * ensures that user's employee_profiles doc, and fills any missing
 * _meta/counters keys. Existing documents and counter values are kept.
 *
 * Do not use seed:firestore for a new project. That script loads demo users
 * and demo passwords.
 *
 * Run (Application Default Credentials for ace-digital-int-12345):
 *   USE_FIRESTORE=true GOOGLE_CLOUD_PROJECT=ace-digital-int-12345 \
 *     ADMIN_EMAIL='admin@acedigital.cc' \
 *     ADMIN_PASSWORD='at-least-12-characters' \
 *     pnpm --filter @workspace/scripts run bootstrap:owner
 */
import bcrypt from "bcryptjs";
import { createFirestoreStore } from "../../lib/db/src/store/firestore";
import { requireAdminPassword } from "./require-admin-password";

const PROJECT_ID =
  process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
  process.env.GCLOUD_PROJECT?.trim() ||
  process.env.FIREBASE_PROJECT_ID?.trim() ||
  "ace-digital-int-12345";

process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID;
process.env.GCLOUD_PROJECT = PROJECT_ID;
process.env.FIREBASE_PROJECT_ID = PROJECT_ID;

const EMAIL = (process.env.ADMIN_EMAIL?.trim() || "admin@acedigital.cc").toLowerCase();
const PASSWORD = requireAdminPassword();
const FULL_NAME = process.env.ADMIN_FULL_NAME?.trim() || "Admin";
const JOB_TITLE = process.env.ADMIN_JOB_TITLE?.trim() || "Owner";
const ROLE = "super_admin";

const ZERO_COUNTERS = [
  "clients",
  "projects",
  "tasks",
  "approvals",
  "expenses",
  "payroll_runs",
  "reports",
  "channels",
  "channel_members",
  "messages",
  "activity_logs",
  "notifications",
] as const;

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

async function main() {
  if (process.env.USE_FIRESTORE !== "true") {
    console.error("Refusing to run: set USE_FIRESTORE=true.");
    process.exit(1);
  }
  if (!EMAIL.includes("@")) {
    console.error("Refusing to run: ADMIN_EMAIL must be an email address.");
    process.exit(1);
  }

  const store = createFirestoreStore();
  const db = store.db;
  const now = new Date().toISOString();

  console.log(`Bootstrapping Firestore project ${PROJECT_ID} (no deletes).`);

  const teamRef = db.collection("teams").doc("1");
  const teamSnap = await teamRef.get();
  if (!teamSnap.exists) {
    await teamRef.set({
      name: "Operations",
      color: "#052659",
      createdAt: now,
    });
    console.log("Created teams/1 (Operations).");
  } else {
    console.log("teams/1 already exists.");
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const existing = await store.findUserByEmail(EMAIL);

  let userId: number;
  if (existing) {
    userId = existing.id;
    const patch: Record<string, unknown> = {
      email: EMAIL,
      passwordHash,
      role: ROLE,
      status: "active",
      teamId: existing.teamId ?? 1,
      mustChangePassword: false,
    };
    if (process.env.ADMIN_FULL_NAME?.trim() || !existing.fullName) {
      patch.fullName = FULL_NAME;
    }
    if (process.env.ADMIN_JOB_TITLE?.trim() || !existing.jobTitle) {
      patch.jobTitle = JOB_TITLE;
    }
    await db.collection("users").doc(String(userId)).set(patch, { merge: true });
    console.log(`Updated user #${userId} (${EMAIL}).`);
  } else {
    userId = await db.runTransaction(async (tx) => {
      const countersRef = db.collection("_meta").doc("counters");
      const countersSnap = await tx.get(countersRef);
      const id = num(countersSnap.data()?.users) + 1;
      const userRef = db.collection("users").doc(String(id));
      const userSnap = await tx.get(userRef);
      if (userSnap.exists) {
        throw new Error(
          `users/${id} already exists, but ${EMAIL} was not found. Set _meta/counters.users above the highest user id and retry.`,
        );
      }
      tx.set(userRef, {
        email: EMAIL,
        passwordHash,
        fullName: FULL_NAME,
        role: ROLE,
        teamId: 1,
        jobTitle: JOB_TITLE,
        status: "active",
        avatarUrl: null,
        mustChangePassword: false,
        createdAt: now,
      });
      tx.set(countersRef, { users: id }, { merge: true });
      return id;
    });
    console.log(`Created user #${userId} (${EMAIL}).`);
  }

  const profileRef = db.collection("employee_profiles").doc(String(userId));
  const profileSnap = await profileRef.get();
  if (!profileSnap.exists) {
    await profileRef.set({
      userId,
      baseSalary: "0",
      bonus: "0",
      payrollStatus: "PAID",
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created employee_profiles/${userId}.`);
  } else {
    await profileRef.set({ userId, updatedAt: now }, { merge: true });
    console.log(`employee_profiles/${userId} already exists.`);
  }

  const countersRef = db.collection("_meta").doc("counters");
  const countersSnap = await countersRef.get();
  const current = countersSnap.data() ?? {};
  const next: Record<string, number> = {
    teams: Math.max(num(current.teams), 1),
    users: Math.max(num(current.users), userId),
    employee_profiles: Math.max(num(current.employee_profiles), userId),
  };
  if (current.employeeCodeSeq == null) next.employeeCodeSeq = 0;
  for (const key of ZERO_COUNTERS) {
    if (current[key] == null) next[key] = 0;
  }
  await countersRef.set(next, { merge: true });

  console.log("Owner bootstrap finished. Password was not printed.");
  console.log(`   Project:  ${PROJECT_ID}`);
  console.log(`   Email:    ${EMAIL}`);
  console.log(`   User id:  ${userId}`);
  console.log(`   Role:     ${ROLE} (${JOB_TITLE})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
