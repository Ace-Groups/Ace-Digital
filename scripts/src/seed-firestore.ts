/**
 * Seeds Firestore with demo data (mirrors scripts/src/seed.ts).
 * Run: USE_FIRESTORE=true npx tsx scripts/src/seed-firestore.ts
 */
import bcrypt from "bcryptjs";
import { createFirestoreStore } from "../../lib/db/src/store/firestore";

const store = createFirestoreStore();
const db = store.db;

async function setDoc(collection: string, id: number, data: Record<string, unknown>) {
  await db.collection(collection).doc(String(id)).set(data);
}

async function seed() {
  console.log("🌱 Seeding Firestore (ace-digital-os)...");

  const now = new Date().toISOString();
  const teams = [
    { id: 1, name: "Engineering", color: "#5483B3", createdAt: now },
    { id: 2, name: "Design", color: "#7B61FF", createdAt: now },
    { id: 3, name: "Sales", color: "#F59E0B", createdAt: now },
    { id: 4, name: "Finance", color: "#10B981", createdAt: now },
    { id: 5, name: "Operations", color: "#EF4444", createdAt: now },
    { id: 6, name: "HR", color: "#EC4899", createdAt: now },
  ];
  for (const t of teams) await setDoc("teams", t.id, t);

  const hash = await bcrypt.hash("Admin@123", 10);
  const emp123 = await bcrypt.hash("Emp@123", 10);

  const users = [
    { id: 1, email: "admin@acedigital.com", passwordHash: hash, fullName: "Arjun Sharma", role: "super_admin", teamId: 1, jobTitle: "CEO & Founder", status: "active", avatarUrl: null, createdAt: now },
    { id: 2, email: "priya.management@acedigital.com", passwordHash: emp123, fullName: "Priya Menon", role: "management", teamId: 5, jobTitle: "COO", status: "active", avatarUrl: null, createdAt: now },
    { id: 3, email: "rahul.eng@acedigital.com", passwordHash: emp123, fullName: "Rahul Verma", role: "team_lead", teamId: 1, jobTitle: "Lead Engineer", status: "active", avatarUrl: null, createdAt: now },
    { id: 4, email: "anita.design@acedigital.com", passwordHash: emp123, fullName: "Anita Nair", role: "team_lead", teamId: 2, jobTitle: "Lead Designer", status: "active", avatarUrl: null, createdAt: now },
    { id: 5, email: "vikram.sales@acedigital.com", passwordHash: emp123, fullName: "Vikram Patel", role: "team_lead", teamId: 3, jobTitle: "Sales Manager", status: "active", avatarUrl: null, createdAt: now },
    { id: 6, email: "sunita.finance@acedigital.com", passwordHash: emp123, fullName: "Sunita Rao", role: "finance", teamId: 4, jobTitle: "Finance Head", status: "active", avatarUrl: null, createdAt: now },
    { id: 7, email: "amit.eng@acedigital.com", passwordHash: emp123, fullName: "Amit Kumar", role: "employee", teamId: 1, jobTitle: "Backend Engineer", status: "active", avatarUrl: null, createdAt: now },
    { id: 8, email: "deepa.design@acedigital.com", passwordHash: emp123, fullName: "Deepa Singh", role: "employee", teamId: 2, jobTitle: "UI/UX Designer", status: "active", avatarUrl: null, createdAt: now },
    { id: 9, email: "rohan.sales@acedigital.com", passwordHash: emp123, fullName: "Rohan Gupta", role: "employee", teamId: 3, jobTitle: "Business Developer", status: "active", avatarUrl: null, createdAt: now },
    { id: 10, email: "kavya.hr@acedigital.com", passwordHash: emp123, fullName: "Kavya Reddy", role: "hr", teamId: 6, jobTitle: "HR Manager", status: "active", avatarUrl: null, createdAt: now },
    { id: 11, email: "sanjay.ops@acedigital.com", passwordHash: emp123, fullName: "Sanjay Iyer", role: "employee", teamId: 5, jobTitle: "IT Operations", status: "active", avatarUrl: null, createdAt: now },
    { id: 12, email: "meera.finance@acedigital.com", passwordHash: emp123, fullName: "Meera Joshi", role: "employee", teamId: 4, jobTitle: "Accountant", status: "active", avatarUrl: null, createdAt: now },
  ];
  for (const u of users) await setDoc("users", u.id, u);

  const profiles = [
    { userId: 1, baseSalary: "250000", bonus: "50000", payrollStatus: "PAID", createdAt: now, updatedAt: now },
    { userId: 2, baseSalary: "200000", bonus: "30000", payrollStatus: "PAID", createdAt: now, updatedAt: now },
    { userId: 3, baseSalary: "150000", bonus: "20000", payrollStatus: "PENDING", createdAt: now, updatedAt: now },
    { userId: 6, baseSalary: "145000", bonus: "18000", payrollStatus: "PAID", createdAt: now, updatedAt: now },
  ];
  for (const p of profiles) {
    await db.collection("employee_profiles").doc(String(p.userId)).set(p);
  }

  await setDoc("clients", 1, {
    contactName: "Raj Malhotra",
    companyName: "TechVision India",
    email: "raj@techvision.in",
    phone: "+91 98765 43210",
    assignedTeamId: 1,
    status: "ACTIVE",
    contractValue: "2500000",
    nextMeetingAt: new Date("2026-06-15").toISOString(),
    createdAt: now,
    updatedAt: now,
  });

  await setDoc("projects", 1, {
    name: "TechVision ERP Upgrade",
    description: "Full ERP system migration",
    teamId: 1,
    priority: "HIGH",
    status: "IN_PROGRESS",
    progress: 65,
    deadline: new Date("2026-08-31").toISOString(),
    budget: "1200000",
    clientId: 1,
    createdById: 3,
    createdAt: now,
    updatedAt: now,
  });

  await setDoc("channels", 1, { name: "general", type: "ANNOUNCEMENT", teamId: null, createdAt: now });
  await setDoc("channels", 2, { name: "engineering", type: "TEAM", teamId: 1, createdAt: now });

  await setDoc("messages", 1, {
    channelId: 1,
    senderId: 1,
    body: "Welcome to Ace Digital OS! Our internal platform is live.",
    createdAt: now,
  });

  await setDoc("approvals", 1, {
    type: "EXPENSE",
    title: "AWS Cloud Infrastructure Bill",
    description: "Monthly AWS bill",
    amount: "45000",
    requestedById: 3,
    teamId: 1,
    status: "PENDING",
    reviewedById: null,
    reviewedAt: null,
    note: null,
    createdAt: now,
    updatedAt: now,
  });

  await setDoc("activity_logs", 1, {
    actorId: 1,
    action: "created project",
    entityType: "project",
    entityId: 1,
    metadata: { name: "TechVision ERP Upgrade" },
    createdAt: now,
  });

  await db.collection("_meta").doc("counters").set({
    teams: 6,
    users: 12,
    employee_profiles: 12,
    clients: 6,
    projects: 8,
    tasks: 15,
    approvals: 8,
    expenses: 8,
    payroll_runs: 3,
    reports: 5,
    channels: 7,
    messages: 10,
    activity_logs: 8,
    notifications: 0,
  });

  console.log("✅ Firestore seeded. Login: admin@acedigital.com / Admin@123");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
