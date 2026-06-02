/**
 * Prepares the Firestore database for production.
 * Deletes all projects, tasks, clients, approvals, expenses, messages, and other users.
 * Keeps ONLY the user kavin@acedigital.com as the active super_admin.
 *
 * Run: USE_FIRESTORE=true GOOGLE_CLOUD_PROJECT=ace-digital-os npx tsx scripts/src/clear-db-for-prod.ts
 */
import bcrypt from "bcryptjs";
import { createFirestoreStore } from "../../lib/db/src/store/firestore";

const EMAIL = "kavin@acedigital.com";
const PASSWORD = "Kavin@2026";
const FULL_NAME = "Kavin Balaji";
const JOB_TITLE = "Managing Director";
const ROLE = "super_admin";

async function main() {
  console.log("🧹 Preparing database for production...");
  const store = createFirestoreStore();
  const db = store.db;
  const now = new Date().toISOString();

  // 1. Ensure Kavin exists and get their ID
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const existing = await store.findUserByEmail(EMAIL);
  let kavinId: number;

  if (existing) {
    kavinId = existing.id;
    await db.collection("users").doc(String(kavinId)).set(
      {
        email: EMAIL.toLowerCase(),
        passwordHash,
        fullName: FULL_NAME,
        role: ROLE,
        jobTitle: JOB_TITLE,
        status: "active",
        teamId: existing.teamId ?? 1,
      },
      { merge: true },
    );
    console.log(`✅ Admin user verified/updated: #${kavinId} (${EMAIL})`);
  } else {
    kavinId = 1; // Start with ID 1 in production clean state
    await db.collection("users").doc(String(kavinId)).set({
      id: kavinId,
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
    console.log(`✅ Created admin user: #${kavinId} (${EMAIL})`);
  }

  // Ensure their profile exists
  await db.collection("employee_profiles").doc(String(kavinId)).set(
    {
      userId: kavinId,
      baseSalary: "300000",
      bonus: "50000",
      payrollStatus: "PAID",
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  // Helper to purge a collection
  async function purgeCollection(collectionName: string, keepIds: string[] = []) {
    const snapshot = await db.collection(collectionName).get();
    let deletedCount = 0;
    for (const doc of snapshot.docs) {
      if (keepIds.includes(doc.id)) {
        continue;
      }
      await doc.ref.delete();
      deletedCount++;
    }
    if (deletedCount > 0) {
      console.log(`   - Deleted ${deletedCount} documents from '${collectionName}'`);
    }
  }

  // 2. Clear out other users and profiles
  await purgeCollection("users", [String(kavinId)]);
  await purgeCollection("employee_profiles", [String(kavinId)]);

  // 3. Clear all dynamic collections
  const collectionsToClear = [
    "projects",
    "tasks",
    "clients",
    "approvals",
    "expenses",
    "payroll_runs",
    "reports",
    "channels",
    "channel_members",
    "messages",
    "activity_logs",
    "notifications",
  ];

  for (const coll of collectionsToClear) {
    await purgeCollection(coll);
  }

  // 4. Initialize default channels for production
  await db.collection("channels").doc("1").set({
    id: 1,
    name: "general",
    type: "ANNOUNCEMENT",
    teamId: null,
    description: "Company-wide announcements",
    visibility: "PRIVATE",
    archived: false,
    createdById: kavinId,
    createdAt: now,
  });
  await db.collection("channels").doc("2").set({
    id: 2,
    name: "engineering",
    type: "TEAM",
    teamId: 1,
    description: "Engineering team discussions",
    visibility: "PRIVATE",
    archived: false,
    createdById: kavinId,
    createdAt: now,
  });
  await db.collection("channel_members").doc("1").set({
    channelId: 1,
    userId: kavinId,
    role: "owner",
    joinedAt: now,
  });
  await db.collection("channel_members").doc("2").set({
    channelId: 2,
    userId: kavinId,
    role: "owner",
    joinedAt: now,
  });
  console.log("✅ Seeded default channels and memberships for admin");

  // 5. Ensure teams exist (recreate default teams if missing)
  const defaultTeams = [
    { id: 1, name: "Engineering", color: "#5483B3", createdAt: now },
    { id: 2, name: "Design", color: "#7B61FF", createdAt: now },
    { id: 3, name: "Sales", color: "#F59E0B", createdAt: now },
    { id: 4, name: "Finance", color: "#10B981", createdAt: now },
    { id: 5, name: "Operations", color: "#EF4444", createdAt: now },
    { id: 6, name: "HR", color: "#EC4899", createdAt: now },
  ];

  for (const team of defaultTeams) {
    await db.collection("teams").doc(String(team.id)).set(team, { merge: true });
  }
  console.log("✅ Teams verified/created (Engineering, Design, Sales, Finance, Operations, HR)");

  // 6. Reset metadata counters
  await db.collection("_meta").doc("counters").set({
    teams: 6,
    users: 1,
    employee_profiles: 1,
    clients: 0,
    projects: 0,
    tasks: 0,
    approvals: 0,
    expenses: 0,
    payroll_runs: 0,
    reports: 0,
    channels: 2,
    channel_members: 2,
    messages: 0,
    activity_logs: 0,
    notifications: 0,
  });
  console.log("✅ Counters reset to zero");

  console.log("\n🎉 Database prepared successfully for production! ONLY kavin@acedigital.com exists.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
