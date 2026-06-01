/**
 * Creates or updates Kavin's admin user in Firestore (no Cloud Functions required).
 * Run: USE_FIRESTORE=true GOOGLE_CLOUD_PROJECT=ace-digital-os pnpm --filter @workspace/scripts run upsert:kavin
 */
import bcrypt from "bcryptjs";
import { createFirestoreStore } from "../../lib/db/src/store/firestore";

const EMAIL = "kavin@acedigital.com";
const PASSWORD = "Kavin@2026";
const FULL_NAME = "Kavin Balaji";
const JOB_TITLE = "Managing Director";
/** Full app access; job title shown as Managing Director */
const ROLE = "super_admin";

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
        teamId: existing.teamId ?? 5,
      },
      { merge: true },
    );
    console.log(`Updated user #${userId} (${EMAIL})`);
  } else {
    const counters = await db.collection("_meta").doc("counters").get();
    const data = counters.data() ?? {};
    userId = ((data.users as number) ?? 12) + 1;
    await db.collection("users").doc(String(userId)).set({
      email: EMAIL.toLowerCase(),
      passwordHash,
      fullName: FULL_NAME,
      role: ROLE,
      teamId: 5,
      jobTitle: JOB_TITLE,
      status: "active",
      avatarUrl: null,
      createdAt: now,
    });
    await db.collection("_meta").doc("counters").set({ users: userId }, { merge: true });
    console.log(`Created user #${userId} (${EMAIL})`);
  }

  await db.collection("employee_profiles").doc(String(userId)).set(
    {
      userId,
      baseSalary: "300000",
      bonus: "50000",
      payrollStatus: "PAID",
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  console.log("✅ Admin ready:");
  console.log(`   Email:    ${EMAIL}`);
  console.log(`   Password: ${PASSWORD}`);
  console.log(`   Role:     ${ROLE} (${JOB_TITLE})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
