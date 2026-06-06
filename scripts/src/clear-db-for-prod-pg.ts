/**
 * Prepares the PostgreSQL database for production.
 * Deletes all projects, tasks, clients, approvals, expenses, messages, and other users.
 * Keeps ONLY the user kavin@acedigital.com as the active super_admin.
 *
 * Run: DATABASE_URL=<production_url> npx tsx scripts/src/clear-db-for-prod-pg.ts
 */
import bcrypt from "bcryptjs";
import * as schema from "../../lib/db/src/index";
import { getPgDb, closePgPool } from "../../lib/db/src/pg";

const EMAIL = "kavin@acedigital.com";
const PASSWORD = "Kavin@2026";
const FULL_NAME = "Kavin Balaji";
const JOB_TITLE = "Managing Director";
const ROLE = "super_admin";

async function main() {
  console.log("🧹 Clearing PostgreSQL for production...");
  const { db } = getPgDb();

  // 1. Delete everything from tables (dependent order)
  await db.delete(schema.messagesTable);
  await db.delete(schema.channelMembersTable);
  await db.delete(schema.channelPinsTable);
  await db.delete(schema.channelsTable);
  await db.delete(schema.activityLogsTable);
  await db.delete(schema.notificationsTable);
  await db.delete(schema.taskAssigneesTable);
  await db.delete(schema.tasksTable);
  await db.delete(schema.projectsTable);
  await db.delete(schema.approvalsTable);
  await db.delete(schema.expensesTable);
  await db.delete(schema.payrollRunsTable);
  await db.delete(schema.reportsTable);
  await db.delete(schema.clientsTable);
  await db.delete(schema.salaryPostingsTable);
  await db.delete(schema.serviceRecordsTable);
  await db.delete(schema.serviceTicketsTable);
  await db.delete(schema.employeeProfilesTable);
  await db.delete(schema.usersTable);
  await db.delete(schema.teamsTable);
  await db.delete(schema.jobTitlesTable);
  await db.delete(schema.appMetaTable);

  console.log("   ✓ Purged all tables.");

  // 2. Insert Teams
  await db
    .insert(schema.teamsTable)
    .values([
      { id: 1, name: "Engineering", color: "#5483B3" },
      { id: 2, name: "Design", color: "#7B61FF" },
      { id: 3, name: "Sales", color: "#F59E0B" },
      { id: 4, name: "Finance", color: "#10B981" },
      { id: 5, name: "Operations", color: "#EF4444" },
      { id: 6, name: "HR", color: "#EC4899" },
    ]);
  console.log("   ✓ Re-seeded default teams.");

  // 3. Create super_admin Kavin
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [kavin] = await db
    .insert(schema.usersTable)
    .values({
      id: 1,
      email: EMAIL.toLowerCase(),
      passwordHash,
      fullName: FULL_NAME,
      role: ROLE,
      teamId: 1,
      jobTitle: JOB_TITLE,
      status: "active",
      mustChangePassword: false,
    })
    .returning();
  console.log(`   ✓ Created super_admin user: ${kavin.fullName} (${kavin.email})`);

  // 4. Create Employee Profile
  await db.insert(schema.employeeProfilesTable).values({
    userId: kavin.id,
    baseSalary: "300000",
    bonus: "50000",
    payrollStatus: "PAID",
  });
  console.log("   ✓ Created employee profile.");

  // 5. Create default channels
  await db.insert(schema.channelsTable).values([
    { id: 1, name: "general", type: "ANNOUNCEMENT", visibility: "PRIVATE", createdById: kavin.id, archived: false },
    { id: 2, name: "engineering", teamId: 1, type: "TEAM", visibility: "PRIVATE", createdById: kavin.id, archived: false },
  ]);
  await db.insert(schema.channelMembersTable).values([
    { channelId: 1, userId: kavin.id, role: "owner" },
    { channelId: 2, userId: kavin.id, role: "owner" },
  ]);
  console.log("   ✓ Created general and engineering channels.");

  await closePgPool();
  console.log("✅ PostgreSQL prepared successfully for production!");
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
