/**
 * Creates or updates Nesa's manager user in Firestore.
 * Run: USE_FIRESTORE=true GOOGLE_CLOUD_PROJECT=ace-digital-os pnpm --filter @workspace/scripts run upsert:nesa
 */
import bcrypt from "bcryptjs";
import { createFirestoreStore } from "../../lib/db/src/store/firestore";

const EMAIL = "nesa@mybexo.com";
const PASSWORD = "Nesa@2026";
const FULL_NAME = "Nesa";
const JOB_TITLE = "Manager";
const ROLE = "manager";

async function main() {
  const store = createFirestoreStore();
  const db = store.db;
  const now = new Date().toISOString();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const existing = await store.findUserByEmail(EMAIL);

  let userId: number;
  if (existing) {
    userId = existing.id;
    await db.collection("users").doc(String(userId)).set(
      {
        email: EMAIL.toLowerCase(),
        passwordHash,
        fullName: FULL_NAME,
        role: ROLE,
        jobTitle: JOB_TITLE,
        status: "active",
        mustChangePassword: false,
        teamId: existing.teamId ?? 1,
      },
      { merge: true },
    );
    console.log(`Updated user #${userId} (${EMAIL})`);
  } else {
    const counters = await db.collection("_meta").doc("counters").get();
    const data = counters.data() ?? {};
    userId = ((data.users as number) ?? 0) + 1;
    await db.collection("users").doc(String(userId)).set({
      email: EMAIL.toLowerCase(),
      passwordHash,
      fullName: FULL_NAME,
      role: ROLE,
      teamId: 1,
      jobTitle: JOB_TITLE,
      status: "active",
      mustChangePassword: false,
      avatarUrl: null,
      createdAt: now,
    });
    await db.collection("_meta").doc("counters").set({ users: userId }, { merge: true });
    console.log(`Created user #${userId} (${EMAIL})`);
  }

  await db.collection("employee_profiles").doc(String(userId)).set(
    {
      userId,
      baseSalary: "0",
      bonus: "0",
      payrollStatus: "PAID",
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  const match = await bcrypt.compare(PASSWORD, passwordHash);
  if (!match) {
    throw new Error("Password hash verification failed");
  }

  console.log("✅ Manager ready:");
  console.log(`   Email:    ${EMAIL}`);
  console.log(`   Password: ${PASSWORD}`);
  console.log(`   Role:     ${ROLE} (${JOB_TITLE})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
