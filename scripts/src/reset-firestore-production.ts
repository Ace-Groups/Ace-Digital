/**
 * Wipes all Firestore app data and seeds a clean production baseline:
 * one Operations team, one super_admin (Kavin), no demo projects/tasks/clients/payroll.
 *
 * Run (requires Application Default Credentials for ace-digital-os):
 *   CONFIRM_RESET=ace-digital-os USE_FIRESTORE=true GOOGLE_CLOUD_PROJECT=ace-digital-os \
 *     pnpm --filter @workspace/scripts run reset:production
 */
import bcrypt from "bcryptjs";
import type { Firestore } from "firebase-admin/firestore";
import { createFirestoreStore } from "../../lib/db/src/store/firestore";

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT ?? "ace-digital-os";
const CONFIRM = process.env.CONFIRM_RESET;

const EMAIL = "kavin@acedigital.com";
const PASSWORD = "Kavin@2026";
const FULL_NAME = "Kavin Balaji";
const JOB_TITLE = "Managing Director";
const ROLE = "super_admin";

const COLLECTIONS = [
  "messages",
  "channels",
  "activity_logs",
  "notifications",
  "tasks",
  "projects",
  "approvals",
  "expenses",
  "payroll_runs",
  "reports",
  "clients",
  "employee_profiles",
  "users",
  "teams",
] as const;

async function deleteCollection(db: Firestore, name: string): Promise<number> {
  const col = db.collection(name);
  let deleted = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await col.limit(500).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snap.size;
  }
  return deleted;
}

async function main() {
  if (CONFIRM !== PROJECT_ID) {
    console.error(
      `Refusing to run: set CONFIRM_RESET=${PROJECT_ID} to wipe project "${PROJECT_ID}".`,
    );
    process.exit(1);
  }

  const store = createFirestoreStore();
  const db = store.db;
  const now = new Date().toISOString();

  console.log(`⚠️  Resetting Firestore for project: ${PROJECT_ID}\n`);

  for (const name of COLLECTIONS) {
    const n = await deleteCollection(db, name);
    console.log(`  deleted ${name}: ${n} document(s)`);
  }

  await db.collection("_meta").doc("counters").delete().catch(() => undefined);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await db.collection("teams").doc("1").set({
    name: "Operations",
    color: "#052659",
    createdAt: now,
  });

  await db.collection("users").doc("1").set({
    email: EMAIL.toLowerCase(),
    passwordHash,
    fullName: FULL_NAME,
    role: ROLE,
    teamId: 1,
    jobTitle: JOB_TITLE,
    status: "active",
    avatarUrl: null,
    createdAt: now,
  });

  await db.collection("employee_profiles").doc("1").set({
    userId: 1,
    baseSalary: "0",
    bonus: "0",
    payrollStatus: "PAID",
    createdAt: now,
    updatedAt: now,
  });

  await db.collection("_meta").doc("counters").set({
    teams: 1,
    users: 1,
    employee_profiles: 1,
    clients: 0,
    projects: 0,
    tasks: 0,
    approvals: 0,
    expenses: 0,
    payroll_runs: 0,
    reports: 0,
    channels: 0,
    messages: 0,
    activity_logs: 0,
    notifications: 0,
  });

  console.log("\n✅ Production baseline ready (admin only, no demo data)");
  console.log(`   Login: ${EMAIL}`);
  console.log(`   Password: ${PASSWORD}`);
  console.log(`   Role: ${ROLE} (${JOB_TITLE})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
