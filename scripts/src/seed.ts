import bcrypt from "bcryptjs";
import * as schema from "@workspace/db";
import { getPgDb, closePgPool } from "@workspace/db/pg";

const { db } = getPgDb();

async function seed() {
  console.log("🌱 Seeding database...");

  // Teams
  const teamRows = await db
    .insert(schema.teamsTable)
    .values([
      { name: "Engineering", color: "#5483B3" },
      { name: "Design", color: "#7B61FF" },
      { name: "Sales", color: "#F59E0B" },
      { name: "Finance", color: "#10B981" },
      { name: "Operations", color: "#EF4444" },
      { name: "HR", color: "#EC4899" },
    ])
    .onConflictDoNothing()
    .returning();
  console.log(`  ✓ ${teamRows.length} teams`);

  const teams = await db.select().from(schema.teamsTable);
  const tm: Record<string, number> = Object.fromEntries(teams.map((t) => [t.name, t.id]));

  // Users (employees)
  const hash = await bcrypt.hash("Admin@123", 10);
  const emp123 = await bcrypt.hash("Emp@123", 10);

  const userRows = await db
    .insert(schema.usersTable)
    .values([
      { email: "admin@acedigital.com", passwordHash: hash, fullName: "Arjun Sharma", role: "super_admin", teamId: tm["Engineering"], jobTitle: "CEO & Founder", status: "active" },
      { email: "priya.management@acedigital.com", passwordHash: emp123, fullName: "Priya Menon", role: "management", teamId: tm["Operations"], jobTitle: "COO", status: "active" },
      { email: "rahul.eng@acedigital.com", passwordHash: emp123, fullName: "Rahul Verma", role: "team_lead", teamId: tm["Engineering"], jobTitle: "Lead Engineer", status: "active" },
      { email: "anita.design@acedigital.com", passwordHash: emp123, fullName: "Anita Nair", role: "team_lead", teamId: tm["Design"], jobTitle: "Lead Designer", status: "active" },
      { email: "vikram.sales@acedigital.com", passwordHash: emp123, fullName: "Vikram Patel", role: "team_lead", teamId: tm["Sales"], jobTitle: "Sales Manager", status: "active" },
      { email: "sunita.finance@acedigital.com", passwordHash: emp123, fullName: "Sunita Rao", role: "finance", teamId: tm["Finance"], jobTitle: "Finance Head", status: "active" },
      { email: "amit.eng@acedigital.com", passwordHash: emp123, fullName: "Amit Kumar", role: "employee", teamId: tm["Engineering"], jobTitle: "Backend Engineer", status: "active" },
      { email: "deepa.design@acedigital.com", passwordHash: emp123, fullName: "Deepa Singh", role: "employee", teamId: tm["Design"], jobTitle: "UI/UX Designer", status: "active" },
      { email: "rohan.sales@acedigital.com", passwordHash: emp123, fullName: "Rohan Gupta", role: "employee", teamId: tm["Sales"], jobTitle: "Business Developer", status: "active" },
      { email: "kavya.hr@acedigital.com", passwordHash: emp123, fullName: "Kavya Reddy", role: "hr", teamId: tm["HR"], jobTitle: "HR Manager", status: "active" },
      { email: "sanjay.ops@acedigital.com", passwordHash: emp123, fullName: "Sanjay Iyer", role: "employee", teamId: tm["Operations"], jobTitle: "IT Operations", status: "active" },
      { email: "meera.finance@acedigital.com", passwordHash: emp123, fullName: "Meera Joshi", role: "employee", teamId: tm["Finance"], jobTitle: "Accountant", status: "active" },
    ])
    .onConflictDoNothing()
    .returning();
  console.log(`  ✓ ${userRows.length} users`);

  const users = await db.select().from(schema.usersTable);
  const um: Record<string, number> = Object.fromEntries(users.map((u) => [u.email, u.id]));

  // Employee profiles
  const profileValues = [
    { userId: um["admin@acedigital.com"], baseSalary: "250000", bonus: "50000", payrollStatus: "PAID" },
    { userId: um["priya.management@acedigital.com"], baseSalary: "200000", bonus: "30000", payrollStatus: "PAID" },
    { userId: um["rahul.eng@acedigital.com"], baseSalary: "150000", bonus: "20000", payrollStatus: "PENDING" },
    { userId: um["anita.design@acedigital.com"], baseSalary: "140000", bonus: "15000", payrollStatus: "PENDING" },
    { userId: um["vikram.sales@acedigital.com"], baseSalary: "130000", bonus: "25000", payrollStatus: "PENDING" },
    { userId: um["sunita.finance@acedigital.com"], baseSalary: "145000", bonus: "18000", payrollStatus: "PAID" },
    { userId: um["amit.eng@acedigital.com"], baseSalary: "110000", bonus: "10000", payrollStatus: "PENDING" },
    { userId: um["deepa.design@acedigital.com"], baseSalary: "105000", bonus: "8000", payrollStatus: "PENDING" },
    { userId: um["rohan.sales@acedigital.com"], baseSalary: "95000", bonus: "12000", payrollStatus: "PENDING" },
    { userId: um["kavya.hr@acedigital.com"], baseSalary: "100000", bonus: "7000", payrollStatus: "PAID" },
    { userId: um["sanjay.ops@acedigital.com"], baseSalary: "90000", bonus: "5000", payrollStatus: "PENDING" },
    { userId: um["meera.finance@acedigital.com"], baseSalary: "95000", bonus: "6000", payrollStatus: "PENDING" },
  ].filter((p) => p.userId !== undefined);

  await db.insert(schema.employeeProfilesTable).values(profileValues).onConflictDoNothing();
  console.log(`  ✓ ${profileValues.length} employee profiles`);

  // Clients
  const clientRows = await db
    .insert(schema.clientsTable)
    .values([
      { contactName: "Raj Malhotra", companyName: "TechVision India", email: "raj@techvision.in", phone: "+91 98765 43210", assignedTeamId: tm["Engineering"], status: "ACTIVE", contractValue: "2500000", nextMeetingAt: new Date("2026-06-15") },
      { contactName: "Sneha Agarwal", companyName: "RetailMax Solutions", email: "sneha@retailmax.co", phone: "+91 87654 32109", assignedTeamId: tm["Sales"], status: "ACTIVE", contractValue: "1800000", nextMeetingAt: new Date("2026-06-20") },
      { contactName: "Karthik Reddy", companyName: "FinServ Partners", email: "karthik@finserv.in", phone: "+91 76543 21098", assignedTeamId: tm["Finance"], status: "ACTIVE", contractValue: "3200000", nextMeetingAt: new Date("2026-07-01") },
      { contactName: "Prabhash Singh", companyName: "HealthCare Digital", email: "prabhash@hcdigital.com", phone: "+91 65432 10987", assignedTeamId: tm["Design"], status: "PROSPECT", contractValue: "900000", nextMeetingAt: new Date("2026-06-25") },
      { contactName: "Lalitha Kumar", companyName: "EduTech Systems", email: "lalitha@edutech.in", phone: "+91 54321 09876", assignedTeamId: tm["Engineering"], status: "ACTIVE", contractValue: "1500000" },
      { contactName: "Farhan Khan", companyName: "LogiTrack Corp", email: "farhan@logitrack.co", phone: "+91 43210 98765", assignedTeamId: tm["Operations"], status: "INACTIVE", contractValue: "600000" },
    ])
    .onConflictDoNothing()
    .returning();
  console.log(`  ✓ ${clientRows.length} clients`);

  const clients = await db.select().from(schema.clientsTable);

  // Projects
  const projectRows = await db
    .insert(schema.projectsTable)
    .values([
      { name: "TechVision ERP Upgrade", description: "Full ERP system migration for TechVision India", teamId: tm["Engineering"], priority: "HIGH", status: "IN_PROGRESS", progress: 65, deadline: new Date("2026-08-31"), budget: "1200000", clientId: clients[0]?.id, createdById: um["rahul.eng@acedigital.com"] },
      { name: "RetailMax Mobile App", description: "Cross-platform mobile app for retail management", teamId: tm["Design"], priority: "HIGH", status: "IN_PROGRESS", progress: 40, deadline: new Date("2026-09-15"), budget: "850000", clientId: clients[1]?.id, createdById: um["anita.design@acedigital.com"] },
      { name: "Internal HR Portal", description: "Self-service HR portal for all employees", teamId: tm["Engineering"], priority: "MEDIUM", status: "TODO", progress: 0, deadline: new Date("2026-10-01"), budget: "450000", createdById: um["admin@acedigital.com"] },
      { name: "FinServ Data Analytics", description: "Real-time analytics dashboard for FinServ Partners", teamId: tm["Engineering"], priority: "URGENT", status: "IN_PROGRESS", progress: 30, deadline: new Date("2026-07-31"), budget: "2100000", clientId: clients[2]?.id, createdById: um["rahul.eng@acedigital.com"] },
      { name: "Brand Identity Redesign", description: "Complete brand refresh and design system", teamId: tm["Design"], priority: "MEDIUM", status: "REVIEW", progress: 90, deadline: new Date("2026-06-30"), budget: "350000", createdById: um["anita.design@acedigital.com"] },
      { name: "EduTech Learning Platform", description: "E-learning platform with video and quizzes", teamId: tm["Engineering"], priority: "HIGH", status: "TODO", progress: 0, deadline: new Date("2026-11-30"), budget: "1800000", clientId: clients[4]?.id, createdById: um["admin@acedigital.com"] },
      { name: "Q3 Sales Campaign", description: "Digital marketing and outreach campaign for Q3", teamId: tm["Sales"], priority: "HIGH", status: "IN_PROGRESS", progress: 55, deadline: new Date("2026-09-30"), budget: "200000", createdById: um["vikram.sales@acedigital.com"] },
      { name: "Infrastructure Upgrade", description: "Server and network infrastructure modernization", teamId: tm["Operations"], priority: "MEDIUM", status: "DONE", progress: 100, deadline: new Date("2026-05-31"), budget: "750000", createdById: um["priya.management@acedigital.com"] },
    ])
    .onConflictDoNothing()
    .returning();
  console.log(`  ✓ ${projectRows.length} projects`);

  const projects = await db.select().from(schema.projectsTable);

  // Tasks
  await db
    .insert(schema.tasksTable)
    .values([
      { title: "Set up project repo and CI/CD pipeline", projectId: projects[0]?.id, teamId: tm["Engineering"], assigneeId: um["amit.eng@acedigital.com"], priority: "HIGH", status: "DONE", dueDate: new Date("2026-05-15"), createdById: um["rahul.eng@acedigital.com"] },
      { title: "Database schema design and migration", projectId: projects[0]?.id, teamId: tm["Engineering"], assigneeId: um["rahul.eng@acedigital.com"], priority: "HIGH", status: "DONE", dueDate: new Date("2026-05-30"), createdById: um["rahul.eng@acedigital.com"] },
      { title: "API development - Inventory module", projectId: projects[0]?.id, teamId: tm["Engineering"], assigneeId: um["amit.eng@acedigital.com"], priority: "HIGH", status: "IN_PROGRESS", dueDate: new Date("2026-07-15"), createdById: um["rahul.eng@acedigital.com"] },
      { title: "API development - Finance module", projectId: projects[0]?.id, teamId: tm["Engineering"], assigneeId: um["rahul.eng@acedigital.com"], priority: "HIGH", status: "PENDING", dueDate: new Date("2026-08-01"), createdById: um["rahul.eng@acedigital.com"] },
      { title: "User testing and QA", projectId: projects[0]?.id, teamId: tm["Engineering"], priority: "MEDIUM", status: "PENDING", dueDate: new Date("2026-08-20"), createdById: um["rahul.eng@acedigital.com"] },
      { title: "Mobile app wireframes", projectId: projects[1]?.id, teamId: tm["Design"], assigneeId: um["deepa.design@acedigital.com"], priority: "HIGH", status: "DONE", dueDate: new Date("2026-05-20"), createdById: um["anita.design@acedigital.com"] },
      { title: "UI component library", projectId: projects[1]?.id, teamId: tm["Design"], assigneeId: um["anita.design@acedigital.com"], priority: "HIGH", status: "IN_PROGRESS", dueDate: new Date("2026-07-01"), createdById: um["anita.design@acedigital.com"] },
      { title: "Prototype for client review", projectId: projects[1]?.id, teamId: tm["Design"], assigneeId: um["deepa.design@acedigital.com"], priority: "MEDIUM", status: "PENDING", dueDate: new Date("2026-07-20"), createdById: um["anita.design@acedigital.com"] },
      { title: "Requirements gathering", projectId: projects[3]?.id, teamId: tm["Engineering"], assigneeId: um["rahul.eng@acedigital.com"], priority: "URGENT", status: "DONE", dueDate: new Date("2026-05-10"), createdById: um["admin@acedigital.com"] },
      { title: "Analytics pipeline setup", projectId: projects[3]?.id, teamId: tm["Engineering"], assigneeId: um["amit.eng@acedigital.com"], priority: "URGENT", status: "IN_PROGRESS", dueDate: new Date("2026-06-30"), createdById: um["rahul.eng@acedigital.com"] },
      { title: "Dashboard frontend development", projectId: projects[3]?.id, teamId: tm["Engineering"], priority: "HIGH", status: "PENDING", dueDate: new Date("2026-07-15"), createdById: um["rahul.eng@acedigital.com"] },
      { title: "Brand guidelines document", projectId: projects[4]?.id, teamId: tm["Design"], assigneeId: um["anita.design@acedigital.com"], priority: "HIGH", status: "DONE", dueDate: new Date("2026-05-25"), createdById: um["anita.design@acedigital.com"] },
      { title: "Logo redesign", projectId: projects[4]?.id, teamId: tm["Design"], assigneeId: um["deepa.design@acedigital.com"], priority: "HIGH", status: "DONE", dueDate: new Date("2026-06-10"), createdById: um["anita.design@acedigital.com"] },
      { title: "Sales pitch decks Q3", projectId: projects[6]?.id, teamId: tm["Sales"], assigneeId: um["vikram.sales@acedigital.com"], priority: "HIGH", status: "IN_PROGRESS", dueDate: new Date("2026-07-01"), createdById: um["vikram.sales@acedigital.com"] },
      { title: "Lead outreach - 50 contacts", projectId: projects[6]?.id, teamId: tm["Sales"], assigneeId: um["rohan.sales@acedigital.com"], priority: "HIGH", status: "IN_PROGRESS", dueDate: new Date("2026-08-01"), createdById: um["vikram.sales@acedigital.com"] },
      { title: "Renew SSL certificates", teamId: tm["Operations"], assigneeId: um["sanjay.ops@acedigital.com"], priority: "URGENT", status: "DONE", dueDate: new Date("2026-05-01"), createdById: um["priya.management@acedigital.com"] },
      { title: "Performance review Q2", teamId: tm["HR"], assigneeId: um["kavya.hr@acedigital.com"], priority: "MEDIUM", status: "IN_PROGRESS", dueDate: new Date("2026-06-30"), createdById: um["priya.management@acedigital.com"] },
      { title: "Office supply procurement", teamId: tm["Operations"], assigneeId: um["sanjay.ops@acedigital.com"], priority: "LOW", status: "PENDING", dueDate: new Date("2026-06-20"), createdById: um["priya.management@acedigital.com"] },
    ])
    .onConflictDoNothing();
  console.log(`  ✓ tasks seeded`);

  // Approvals
  await db
    .insert(schema.approvalsTable)
    .values([
      { type: "LEAVE", title: "Annual Leave Request - 5 days", description: "Vacation from June 15-19, 2026", requestedById: um["amit.eng@acedigital.com"], teamId: tm["Engineering"], status: "PENDING" },
      { type: "EXPENSE", title: "AWS Cloud Infrastructure Bill", description: "Monthly AWS bill for production servers", amount: "45000", requestedById: um["rahul.eng@acedigital.com"], teamId: tm["Engineering"], status: "APPROVED", reviewedById: um["admin@acedigital.com"], reviewedAt: new Date("2026-05-20"), note: "Approved - within budget" },
      { type: "PROJECT_BUDGET", title: "Additional Budget for FinServ Project", description: "Scope creep requires additional 3 weeks development", amount: "350000", requestedById: um["rahul.eng@acedigital.com"], teamId: tm["Engineering"], status: "PENDING" },
      { type: "HIRING", title: "New Frontend Engineer Position", description: "Hiring a mid-level React developer for Engineering team", requestedById: um["rahul.eng@acedigital.com"], teamId: tm["Engineering"], status: "APPROVED", reviewedById: um["priya.management@acedigital.com"], reviewedAt: new Date("2026-05-15") },
      { type: "EXPENSE", title: "Team Offsite - Engineering", description: "2-day team building workshop in Lonavala", amount: "85000", requestedById: um["rahul.eng@acedigital.com"], teamId: tm["Engineering"], status: "PENDING" },
      { type: "LEAVE", title: "Sick Leave Request - 2 days", description: "Medical leave June 5-6", requestedById: um["deepa.design@acedigital.com"], teamId: tm["Design"], status: "APPROVED", reviewedById: um["anita.design@acedigital.com"], reviewedAt: new Date("2026-06-01") },
      { type: "EXPENSE", title: "Adobe Creative Cloud Renewal", description: "Annual license for design team (5 seats)", amount: "72000", requestedById: um["anita.design@acedigital.com"], teamId: tm["Design"], status: "PENDING" },
      { type: "HIRING", title: "Sales Executive - Pune", description: "New sales hire for Maharashtra expansion", requestedById: um["vikram.sales@acedigital.com"], teamId: tm["Sales"], status: "REJECTED", reviewedById: um["priya.management@acedigital.com"], reviewedAt: new Date("2026-05-28"), note: "Budget freeze until Q4" },
    ])
    .onConflictDoNothing();
  console.log(`  ✓ approvals seeded`);

  // Expenses
  await db
    .insert(schema.expensesTable)
    .values([
      { description: "AWS Monthly Bill - May 2026", amount: "45000", teamId: tm["Engineering"], submittedById: um["rahul.eng@acedigital.com"], status: "APPROVED" },
      { description: "Office Supplies - Whiteboard Markers, Paper", amount: "3500", teamId: tm["Operations"], submittedById: um["sanjay.ops@acedigital.com"], status: "APPROVED" },
      { description: "LinkedIn Recruiter License", amount: "28000", teamId: tm["HR"], submittedById: um["kavya.hr@acedigital.com"], status: "APPROVED" },
      { description: "Client Dinner - TechVision", amount: "12000", teamId: tm["Sales"], submittedById: um["vikram.sales@acedigital.com"], status: "APPROVED" },
      { description: "Figma Team Plan - Annual", amount: "48000", teamId: tm["Design"], submittedById: um["anita.design@acedigital.com"], status: "PENDING" },
      { description: "Team Lunch - Engineering Sprint", amount: "8500", teamId: tm["Engineering"], submittedById: um["rahul.eng@acedigital.com"], status: "PENDING" },
      { description: "Travel - Mumbai Client Visit", amount: "15000", teamId: tm["Sales"], submittedById: um["rohan.sales@acedigital.com"], status: "PENDING" },
      { description: "Software Licenses - JetBrains", amount: "36000", teamId: tm["Engineering"], submittedById: um["amit.eng@acedigital.com"], status: "APPROVED" },
    ])
    .onConflictDoNothing();
  console.log(`  ✓ expenses seeded`);

  // Payroll run
  await db
    .insert(schema.payrollRunsTable)
    .values([
      { month: 5, year: 2026, totalAmount: "1690000", status: "PAID", approvedById: um["admin@acedigital.com"] },
      { month: 4, year: 2026, totalAmount: "1650000", status: "PAID", approvedById: um["admin@acedigital.com"] },
      { month: 6, year: 2026, totalAmount: "1720000", status: "PENDING" },
    ])
    .onConflictDoNothing();
  console.log(`  ✓ payroll runs seeded`);

  // Channels
  const channelRows = await db
    .insert(schema.channelsTable)
    .values([
      { name: "general", type: "ANNOUNCEMENT" },
      { name: "engineering", teamId: tm["Engineering"], type: "TEAM" },
      { name: "design", teamId: tm["Design"], type: "TEAM" },
      { name: "sales", teamId: tm["Sales"], type: "TEAM" },
      { name: "finance", teamId: tm["Finance"], type: "TEAM" },
      { name: "hr", teamId: tm["HR"], type: "TEAM" },
      { name: "operations", teamId: tm["Operations"], type: "TEAM" },
    ])
    .onConflictDoNothing()
    .returning();
  console.log(`  ✓ ${channelRows.length} channels`);

  const channels = await db.select().from(schema.channelsTable);
  const cm: Record<string, number> = Object.fromEntries(channels.map((c) => [c.name, c.id]));

  // Messages
  await db
    .insert(schema.messagesTable)
    .values([
      { channelId: cm["general"], senderId: um["admin@acedigital.com"], body: "Welcome to Ace Digital OS! Our new internal platform is live 🎉" },
      { channelId: cm["general"], senderId: um["priya.management@acedigital.com"], body: "Great work everyone on the Q2 deliverables! Team performance review next week." },
      { channelId: cm["general"], senderId: um["admin@acedigital.com"], body: "Reminder: All expense reports for May must be submitted by June 5th." },
      { channelId: cm["engineering"], senderId: um["rahul.eng@acedigital.com"], body: "TechVision API integration is at 65%. On track for August delivery." },
      { channelId: cm["engineering"], senderId: um["amit.eng@acedigital.com"], body: "I've pushed the inventory module endpoints. Please review PR #47." },
      { channelId: cm["engineering"], senderId: um["rahul.eng@acedigital.com"], body: "FinServ analytics pipeline is live in staging. Need load testing before prod." },
      { channelId: cm["design"], senderId: um["anita.design@acedigital.com"], body: "Brand Identity Redesign is 90% complete. Final review with client on June 10." },
      { channelId: cm["design"], senderId: um["deepa.design@acedigital.com"], body: "Sharing RetailMax mobile wireframes — feedback welcome!" },
      { channelId: cm["sales"], senderId: um["vikram.sales@acedigital.com"], body: "Q3 campaign kickoff: targeting 50 qualified leads by July 31. Let's go!" },
      { channelId: cm["sales"], senderId: um["rohan.sales@acedigital.com"], body: "Closed FinServ renewal — ₹32L contract signed! 🎉" },
    ])
    .onConflictDoNothing();
  console.log(`  ✓ messages seeded`);

  // Activity logs
  await db
    .insert(schema.activityLogsTable)
    .values([
      { actorId: um["admin@acedigital.com"], action: "created project", entityType: "project", entityId: projects[0]?.id, metadata: { name: "TechVision ERP Upgrade" } },
      { actorId: um["rahul.eng@acedigital.com"], action: "updated project status to IN_PROGRESS", entityType: "project", entityId: projects[0]?.id },
      { actorId: um["amit.eng@acedigital.com"], action: "completed task", entityType: "task", entityId: 1, metadata: { title: "Set up project repo" } },
      { actorId: um["admin@acedigital.com"], action: "approved", entityType: "approval", entityId: 2, metadata: { title: "AWS Cloud Infrastructure Bill" } },
      { actorId: um["rohan.sales@acedigital.com"], action: "added client", entityType: "client", metadata: { name: "FinServ Partners" } },
      { actorId: um["sunita.finance@acedigital.com"], action: "created payroll run", entityType: "payroll_run", metadata: { month: 5, year: 2026 } },
      { actorId: um["anita.design@acedigital.com"], action: "created project", entityType: "project", entityId: projects[1]?.id, metadata: { name: "RetailMax Mobile App" } },
      { actorId: um["priya.management@acedigital.com"], action: "rejected approval", entityType: "approval", entityId: 8, metadata: { title: "Sales Executive - Pune" } },
    ])
    .onConflictDoNothing();
  console.log(`  ✓ activity logs seeded`);

  // Reports
  await db
    .insert(schema.reportsTable)
    .values([
      { type: "REVENUE", title: "Revenue Report - May 2026", period: "May 2026", fileUrl: null },
      { type: "PAYROLL", title: "Payroll Summary - May 2026", period: "May 2026", fileUrl: null },
      { type: "PROJECT_STATUS", title: "Project Status Report - Q2 2026", period: "Q2 2026", fileUrl: null },
      { type: "EXPENSE", title: "Expense Report - May 2026", period: "May 2026", fileUrl: null },
      { type: "REVENUE", title: "Revenue Report - April 2026", period: "April 2026", fileUrl: null },
    ])
    .onConflictDoNothing();
  console.log(`  ✓ reports seeded`);

  await closePgPool();
  console.log("✅ Database seeded successfully!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
