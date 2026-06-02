/**
 * Dev-only: upsert one user per RBAC role for manual matrix testing.
 * Run: USE_FIRESTORE=true GOOGLE_CLOUD_PROJECT=ace-digital-os pnpm --filter @workspace/scripts run seed:rbac-dev
 */
import bcrypt from "bcryptjs";
import { createFirestoreStore } from "../../lib/db/src/store/firestore";

const PASSWORD = "Test@1234";
const TEAM_ID = 1;

const DEV_USERS = [
  { email: "mgmt.dev@acedigital.test", fullName: "Dev Management", role: "management" },
  { email: "finance.dev@acedigital.test", fullName: "Dev Finance", role: "finance" },
  { email: "hr.dev@acedigital.test", fullName: "Dev HR", role: "hr" },
  { email: "cm.dev@acedigital.test", fullName: "Dev Client Manager", role: "client_manager" },
  { email: "lead.dev@acedigital.test", fullName: "Dev Team Lead", role: "team_lead" },
  { email: "emp.dev@acedigital.test", fullName: "Dev Employee", role: "employee" },
] as const;

async function main() {
  const store = createFirestoreStore();
  const db = store.db;
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date().toISOString();

  for (const u of DEV_USERS) {
    const existing = await store.findUserByEmail(u.email);
    if (existing) {
      await db.collection("users").doc(String(existing.id)).set(
        { role: u.role, teamId: TEAM_ID, status: "active", passwordHash },
        { merge: true },
      );
      console.log(`Updated ${u.role}: ${u.email} (#${existing.id})`);
      continue;
    }

    const counters = await db.collection("_meta").doc("counters").get();
    const data = counters.data() ?? {};
    const userId = ((data.users as number) ?? 0) + 1;
    await db.collection("users").doc(String(userId)).set({
      email: u.email.toLowerCase(),
      passwordHash,
      fullName: u.fullName,
      role: u.role,
      teamId: TEAM_ID,
      jobTitle: u.role.replace("_", " "),
      status: "active",
      avatarUrl: null,
      createdAt: now,
    });
    await db.collection("_meta").doc("counters").set({ users: userId }, { merge: true });
    await db.collection("employee_profiles").doc(String(userId)).set({
      userId,
      baseSalary: u.role === "employee" ? "50000" : "0",
      bonus: "0",
      payrollStatus: "PENDING",
    });
    console.log(`Created ${u.role}: ${u.email} / ${PASSWORD} (#${userId})`);
  }

  console.log("\nAll dev users use password:", PASSWORD);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
